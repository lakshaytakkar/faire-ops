import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import {
  loadAccount,
  getValidAccessToken,
  sendDraft,
  getMessage,
  parseMessage,
  upsertParsedMessage,
  GmailApiError,
} from "@/lib/gmail-api"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  )
}

/**
 * POST — send a local draft via Gmail, then delete the local draft row
 * (since it's now been promoted to a sent message) and persist the sent
 * message into gmail_messages so it shows up in Sent immediately.
 *
 * Demo drafts (gmail_draft_id starts with "demo_") can't actually be sent
 * because we never pushed them to Gmail — in that case we return a demo
 * response so the AI flow can continue uninterrupted.
 */
export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params
    const supabase = getAdmin()

    const { data: row } = await supabase
      .from("gmail_drafts")
      .select("id, account_id, gmail_draft_id, thread_id")
      .eq("id", id)
      .maybeSingle()

    if (!row) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 })
    }

    const account = await loadAccount(row.account_id as string)
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    const gmailDraftId = row.gmail_draft_id as string
    const isDemo = gmailDraftId.startsWith("demo_")

    if (isDemo) {
      // Can't send a draft that never made it to Gmail — drop the local row
      // and return a demo success so the UI can continue.
      await supabase.from("gmail_drafts").delete().eq("id", id)
      return NextResponse.json({
        success: true,
        demo: true,
        message: "Draft was demo-only and was not actually sent",
      })
    }

    const token = await getValidAccessToken(account)
    if (!token) {
      return NextResponse.json(
        { error: "Account not connected — reconnect via OAuth" },
        { status: 401 }
      )
    }

    let sent: { id: string; threadId: string; labelIds?: string[] }
    try {
      sent = await sendDraft(token, gmailDraftId)
    } catch (err) {
      if (err instanceof GmailApiError) {
        return NextResponse.json(
          { error: err.message, status: err.status, details: err.details },
          { status: err.status }
        )
      }
      throw err
    }

    // Fetch the sent message and persist it so Sent shows it immediately
    try {
      const full = await getMessage(token, sent.id, "full")
      const parsed = parseMessage(full)
      await upsertParsedMessage(account.id, parsed)
    } catch (e) {
      console.error("[gmail/drafts/[id]/send] post-send fetch failed (non-fatal)", e)
    }

    // Remove the local draft — it's now a sent message
    await supabase.from("gmail_drafts").delete().eq("id", id)

    return NextResponse.json({
      success: true,
      gmailMessageId: sent.id,
      threadId: sent.threadId,
    })
  } catch (err) {
    if (err instanceof GmailApiError) {
      return NextResponse.json(
        { error: err.message, status: err.status, details: err.details },
        { status: err.status }
      )
    }
    console.error("[gmail/drafts/[id]/send] error", err)
    return NextResponse.json({ error: "Failed to send draft" }, { status: 500 })
  }
}
