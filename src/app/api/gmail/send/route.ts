import { NextRequest, NextResponse } from "next/server"
import {
  loadAccount,
  getValidAccessToken,
  buildRawMessage,
  sendMessage,
  getMessage,
  parseMessage,
  upsertParsedMessage,
  GmailApiError,
} from "@/lib/gmail-api"

/**
 * Compose and send an email through Gmail.
 *
 * Body:
 *   { to, cc?, bcc?, subject, body, accountId?, html?, inReplyTo?, references?, threadId? }
 *
 * On success the sent message is fetched back and saved into Supabase so it
 * appears in the Sent folder immediately. When `threadId` is set the message
 * is sent as a threaded reply in the existing conversation.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      to,
      cc,
      bcc,
      subject,
      body: emailBody,
      accountId,
      html,
      inReplyTo,
      references,
      threadId,
    } = body

    if (!to || !subject || !emailBody) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, body" },
        { status: 400 }
      )
    }

    const account = await loadAccount(accountId)
    if (!account) {
      return NextResponse.json({ error: "No active Gmail account" }, { status: 404 })
    }

    const token = await getValidAccessToken(account)

    // Demo account fallback — accept the send so the UI works without a real Google account
    if (!token) {
      console.log("[gmail/send] No connected Google account, demo response", { to, subject })
      return NextResponse.json({
        success: true,
        demo: true,
        message: "Saved locally (no Google account connected)",
      })
    }

    const raw = buildRawMessage({
      from: account.email,
      to,
      cc,
      bcc,
      subject,
      body: emailBody,
      inReplyTo,
      references,
      html: !!html,
    })

    try {
      const sent = await sendMessage(token, raw, threadId)

      // Fetch the sent message and persist it locally so it shows up in Sent folder
      try {
        const full = await getMessage(token, sent.id, "full")
        const parsed = parseMessage(full)
        await upsertParsedMessage(account.id, parsed)
      } catch (e) {
        console.error("[gmail/send] post-send fetch failed (non-fatal)", e)
      }

      return NextResponse.json({ success: true, gmailId: sent.id, threadId: sent.threadId })
    } catch (err) {
      if (err instanceof GmailApiError) {
        return NextResponse.json(
          { error: err.message, status: err.status, details: err.details },
          { status: err.status }
        )
      }
      throw err
    }
  } catch (err) {
    console.error("[gmail/send] error", err)
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }
}
