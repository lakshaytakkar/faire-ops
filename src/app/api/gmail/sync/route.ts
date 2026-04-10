import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import {
  loadAccount,
  getValidAccessToken,
  listMessages,
  getMessage,
  parseMessage,
  upsertParsedMessage,
  getProfile,
  GmailApiError,
} from "@/lib/gmail-api"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  )
}

/**
 * Pulls the most recent messages from Gmail and persists them in Supabase.
 *
 * Body: { accountId?: string, max?: number }  (max defaults to 500, capped at 2000)
 *
 * Strategy:
 *   1. Page through users.messages.list using nextPageToken until we have
 *      `max` refs or there are no more pages.
 *   2. Skip messages we already have *and* haven't changed (cheap label sync
 *      via metadata format) — full body fetch only for new ones.
 *   3. Update gmail_accounts.history_id + counts + last_synced_at.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const accountId: string | undefined = body.accountId
    const max: number = Math.min(Math.max(body.max ?? 500, 1), 2000)

    const account = await loadAccount(accountId)
    if (!account) {
      return NextResponse.json({ error: "No active Gmail account" }, { status: 404 })
    }

    const token = await getValidAccessToken(account)
    if (!token) {
      return NextResponse.json(
        { error: "Account not connected — reconnect via OAuth" },
        { status: 401 }
      )
    }

    const supabase = getAdmin()

    // Pull the existing gmail_id set so we can skip already-fetched messages.
    // At ~50 bytes/row this is ~5MB for 100k messages which is acceptable.
    const { data: existingRows } = await supabase
      .from("gmail_messages")
      .select("gmail_id, label_ids")
      .eq("account_id", account.id)

    const existingMap = new Map<string, string[]>()
    for (const r of existingRows ?? []) {
      existingMap.set(r.gmail_id as string, (r.label_ids as string[]) ?? [])
    }

    // 1. Page through messages.list until we've collected `max` refs or run out.
    const refs: { id: string; threadId: string }[] = []
    let pageToken: string | undefined = undefined
    while (refs.length < max) {
      const pageSize = Math.min(500, max - refs.length)
      const page: Awaited<ReturnType<typeof listMessages>> = await listMessages(token, {
        maxResults: pageSize,
        pageToken,
      })
      const pageRefs = page.messages ?? []
      refs.push(...pageRefs)
      if (!page.nextPageToken || pageRefs.length === 0) break
      pageToken = page.nextPageToken
    }

    let inserted = 0
    let updated = 0
    let skipped = 0

    // 2. For each message: full fetch if new, metadata fetch if existing (cheap label sync)
    //    Process in small batches to avoid hammering Gmail's per-second quota.
    const batchSize = 8
    for (let i = 0; i < refs.length; i += batchSize) {
      const slice = refs.slice(i, i + batchSize)
      await Promise.all(
        slice.map(async (ref) => {
          try {
            const isExisting = existingMap.has(ref.id)
            const format = isExisting ? "metadata" : "full"
            const msg = await getMessage(token, ref.id, format)
            const parsed = parseMessage(msg)

            if (!isExisting) {
              await upsertParsedMessage(account.id, parsed)
              inserted++
            } else {
              // Only re-write if labels actually changed
              const prev = existingMap.get(ref.id) ?? []
              const same =
                prev.length === parsed.labelIds.length &&
                prev.every((l) => parsed.labelIds.includes(l))
              if (!same) {
                await supabase
                  .from("gmail_messages")
                  .update({
                    label_ids: parsed.labelIds,
                    is_read: parsed.isRead,
                    is_starred: parsed.isStarred,
                  })
                  .eq("account_id", account.id)
                  .eq("gmail_id", ref.id)
                updated++
              } else {
                skipped++
              }
            }
          } catch (err) {
            console.error("[gmail/sync] message fetch failed", ref.id, err)
          }
        })
      )
    }

    // 3. Update account-level counts + history pointer
    const profile = await getProfile(token).catch(() => null)
    const { count: localTotal } = await supabase
      .from("gmail_messages")
      .select("*", { count: "exact", head: true })
      .eq("account_id", account.id)
    const { count: localUnread } = await supabase
      .from("gmail_messages")
      .select("*", { count: "exact", head: true })
      .eq("account_id", account.id)
      .eq("is_read", false)
      .contains("label_ids", ["INBOX"])

    await supabase
      .from("gmail_accounts")
      .update({
        history_id: profile?.historyId ?? null,
        total_messages: profile?.messagesTotal ?? localTotal ?? 0,
        unread_count: localUnread ?? 0,
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", account.id)

    return NextResponse.json({
      success: true,
      inserted,
      updated,
      skipped,
      total: refs.length,
      profile,
    })
  } catch (err) {
    if (err instanceof GmailApiError) {
      return NextResponse.json(
        { error: err.message, status: err.status, details: err.details },
        { status: err.status }
      )
    }
    console.error("[gmail/sync] error", err)
    return NextResponse.json({ error: "Sync failed", details: String(err) }, { status: 500 })
  }
}
