import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { categorizeMessages, draftReply } from "@/lib/gmail-ai"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  )
}

export const maxDuration = 300

/**
 * GET /api/cron/gmail-ai
 *
 * Vercel cron entry point for Gmail AI automation. For every active
 * gmail_accounts row with a refresh_token it will:
 *   1. Categorize the last 30 uncategorized INBOX messages.
 *   2. Draft AI replies for up to 5 recent unread inbox messages that
 *      don't already have an AI-generated draft.
 *
 * Idempotent — repeated runs skip already-categorized messages and
 * already-drafted replies.
 */
export async function GET(request: Request) {
  // Optional auth — match the sync-faire pattern.
  const expected = process.env.CRON_SECRET
  if (expected) {
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const supabase = getAdmin()
  const summary = {
    accountsProcessed: 0,
    categorized: 0,
    drafted: 0,
    errors: 0,
  }

  try {
    const { data: accounts, error: accountsErr } = await supabase
      .from("gmail_accounts")
      .select("id, email, refresh_token, is_active")
      .eq("is_active", true)
      .not("refresh_token", "is", null)

    if (accountsErr) {
      console.error("[cron/gmail-ai] load accounts failed", accountsErr)
      return NextResponse.json({ error: accountsErr.message }, { status: 500 })
    }

    for (const account of accounts ?? []) {
      const accountId = account.id as string
      summary.accountsProcessed += 1

      // 1. Categorize recent uncategorized inbox messages.
      try {
        const cat = await categorizeMessages(accountId, {
          max: 30,
          onlyUncategorized: true,
        })
        summary.categorized += cat.categorized
        summary.errors += cat.errors
      } catch (err) {
        console.error("[cron/gmail-ai] categorize failed", accountId, err)
        summary.errors += 1
      }

      // 2. Draft replies for the 5 most recent unread messages that
      //    don't already have an AI-generated draft.
      try {
        const { data: candidates, error: candidatesErr } = await supabase
          .from("gmail_messages")
          .select("id")
          .eq("account_id", accountId)
          .eq("is_read", false)
          .contains("label_ids", ["INBOX"])
          .order("received_at", { ascending: false })
          .limit(20)

        if (candidatesErr) {
          console.error("[cron/gmail-ai] load candidates failed", candidatesErr)
          summary.errors += 1
          continue
        }

        const candidateIds = (candidates ?? []).map((c) => c.id as string)
        if (candidateIds.length === 0) continue

        // Filter out anything that already has an AI draft pointing at it.
        const { data: existingDrafts, error: draftsErr } = await supabase
          .from("gmail_drafts")
          .select("in_reply_to_message_id")
          .eq("account_id", accountId)
          .eq("is_ai_generated", true)
          .in("in_reply_to_message_id", candidateIds)

        if (draftsErr) {
          console.error("[cron/gmail-ai] load existing drafts failed", draftsErr)
          summary.errors += 1
          continue
        }

        const alreadyDrafted = new Set(
          (existingDrafts ?? []).map((d) => d.in_reply_to_message_id as string)
        )

        const todo = candidateIds.filter((id) => !alreadyDrafted.has(id)).slice(0, 5)

        for (const messageRowId of todo) {
          try {
            await draftReply(messageRowId, { tone: "professional" })
            summary.drafted += 1
          } catch (err) {
            console.error("[cron/gmail-ai] draftReply failed", messageRowId, err)
            summary.errors += 1
          }
        }
      } catch (err) {
        console.error("[cron/gmail-ai] draft pass failed", accountId, err)
        summary.errors += 1
      }
    }

    return NextResponse.json({ ok: true, ...summary })
  } catch (err) {
    console.error("[cron/gmail-ai] fatal", err)
    return NextResponse.json(
      { error: (err as Error).message ?? "cron failed", ...summary },
      { status: 500 }
    )
  }
}
