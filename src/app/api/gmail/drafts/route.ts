import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { createClient } from "@supabase/supabase-js"
import {
  loadAccount,
  getValidAccessToken,
  buildRawMessage,
  createDraft,
  GmailApiError,
} from "@/lib/gmail-api"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  )
}

/**
 * POST — create a new draft.
 *
 * Body:
 *   {
 *     accountId?, to, cc?, bcc?, subject, body, html?, threadId?,
 *     inReplyToMessageId?,              // uuid of a row in gmail_messages (the message we are replying to)
 *     aiGenerated?, aiTone?, aiInstructions?
 *   }
 *
 * When the account has no connected OAuth token the draft is persisted
 * locally only (gmail_draft_id = "demo_<uuid>") so that the AI-compose flow
 * continues to work without a real Google account.
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json().catch(() => ({}))
    const {
      accountId,
      to,
      cc,
      bcc,
      subject,
      body,
      html,
      threadId,
      inReplyToMessageId,
      aiGenerated,
      aiTone,
      aiInstructions,
    } = payload

    if (!to || subject == null || body == null) {
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
    const supabase = getAdmin()

    const raw = buildRawMessage({
      from: account.email,
      to,
      cc,
      bcc,
      subject: subject ?? "",
      body: body ?? "",
      html: !!html,
    })

    let gmailDraftId: string
    let gmailMessageId: string | null = null
    let resolvedThreadId: string | null = threadId ?? null

    if (!token) {
      // Demo fallback — persist locally only so the AI compose flow keeps working
      gmailDraftId = `demo_${randomUUID()}`
    } else {
      try {
        const draft = await createDraft(token, raw, threadId)
        gmailDraftId = draft.id
        gmailMessageId = draft.message?.id ?? null
        resolvedThreadId = draft.message?.threadId ?? resolvedThreadId
      } catch (err) {
        if (err instanceof GmailApiError) {
          return NextResponse.json(
            { error: err.message, status: err.status, details: err.details },
            { status: err.status }
          )
        }
        throw err
      }
    }

    const { data: row, error: upsertErr } = await supabase
      .from("gmail_drafts")
      .upsert(
        {
          account_id: account.id,
          gmail_draft_id: gmailDraftId,
          gmail_message_id: gmailMessageId,
          thread_id: resolvedThreadId,
          to_addr: to,
          cc_addr: cc ?? null,
          bcc_addr: bcc ?? null,
          subject: subject ?? "",
          body_text: html ? null : body ?? "",
          body_html: html ? body ?? "" : null,
          in_reply_to_message_id: inReplyToMessageId ?? null,
          is_ai_generated: !!aiGenerated,
          ai_tone: aiTone ?? null,
          ai_instructions: aiInstructions ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "account_id,gmail_draft_id" }
      )
      .select("id, gmail_draft_id, gmail_message_id, thread_id")
      .maybeSingle()

    if (upsertErr) {
      console.error("[gmail/drafts POST] supabase upsert failed", upsertErr)
      return NextResponse.json({ error: "Failed to persist draft" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      demo: !token,
      id: row?.id ?? null,
      gmailDraftId: row?.gmail_draft_id ?? gmailDraftId,
      gmailMessageId: row?.gmail_message_id ?? gmailMessageId,
      threadId: row?.thread_id ?? resolvedThreadId,
    })
  } catch (err) {
    if (err instanceof GmailApiError) {
      return NextResponse.json(
        { error: err.message, status: err.status, details: err.details },
        { status: err.status }
      )
    }
    console.error("[gmail/drafts POST] error", err)
    return NextResponse.json({ error: "Failed to create draft" }, { status: 500 })
  }
}

/**
 * GET — list local drafts for an account.
 *
 * Query: ?accountId=...&limit=50
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const accountId = searchParams.get("accountId") ?? undefined
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "50", 10), 1), 500)

    const account = await loadAccount(accountId)
    if (!account) {
      return NextResponse.json({ error: "No active Gmail account" }, { status: 404 })
    }

    const supabase = getAdmin()
    const { data, error } = await supabase
      .from("gmail_drafts")
      .select(
        "id, gmail_draft_id, gmail_message_id, thread_id, to_addr, cc_addr, bcc_addr, subject, body_text, body_html, in_reply_to_message_id, is_ai_generated, ai_tone, ai_instructions, created_at, updated_at"
      )
      .eq("account_id", account.id)
      .order("updated_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("[gmail/drafts GET] supabase error", error)
      return NextResponse.json({ error: "Failed to load drafts" }, { status: 500 })
    }

    return NextResponse.json({ success: true, drafts: data ?? [] })
  } catch (err) {
    console.error("[gmail/drafts GET] error", err)
    return NextResponse.json({ error: "Failed to load drafts" }, { status: 500 })
  }
}
