import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import {
  loadAccount,
  getValidAccessToken,
  buildRawMessage,
  getDraft,
  updateDraft,
  deleteDraft,
  GmailApiError,
} from "@/lib/gmail-api"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  )
}

interface DraftRow {
  id: string
  account_id: string
  gmail_draft_id: string
  gmail_message_id: string | null
  thread_id: string | null
  to_addr: string | null
  cc_addr: string | null
  bcc_addr: string | null
  subject: string | null
  body_text: string | null
  body_html: string | null
  in_reply_to_message_id: string | null
  is_ai_generated: boolean | null
  ai_tone: string | null
  ai_instructions: string | null
  created_at: string
  updated_at: string
}

const DRAFT_COLUMNS =
  "id, account_id, gmail_draft_id, gmail_message_id, thread_id, to_addr, cc_addr, bcc_addr, subject, body_text, body_html, in_reply_to_message_id, is_ai_generated, ai_tone, ai_instructions, created_at, updated_at"

async function loadDraftRow(id: string): Promise<DraftRow | null> {
  const supabase = getAdmin()
  const { data } = await supabase
    .from("gmail_drafts")
    .select(DRAFT_COLUMNS)
    .eq("id", id)
    .maybeSingle()
  return (data as DraftRow | null) ?? null
}

/**
 * GET — return the local draft row plus, when we have a real OAuth token and
 * the draft isn't a demo stub, the freshly fetched Gmail draft resource.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params
    const row = await loadDraftRow(id)
    if (!row) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 })
    }

    let remote: unknown = null
    const isDemo = row.gmail_draft_id.startsWith("demo_")
    if (!isDemo) {
      const account = await loadAccount(row.account_id)
      const token = account ? await getValidAccessToken(account) : null
      if (token) {
        try {
          remote = await getDraft(token, row.gmail_draft_id, "full")
        } catch (err) {
          if (err instanceof GmailApiError && err.status !== 404) {
            console.error("[gmail/drafts/[id] GET] remote fetch failed", err)
          }
        }
      }
    }

    return NextResponse.json({ success: true, draft: row, remote })
  } catch (err) {
    if (err instanceof GmailApiError) {
      return NextResponse.json(
        { error: err.message, status: err.status, details: err.details },
        { status: err.status }
      )
    }
    console.error("[gmail/drafts/[id] GET] error", err)
    return NextResponse.json({ error: "Failed to load draft" }, { status: 500 })
  }
}

/**
 * PATCH — merge the incoming fields with the local row, rebuild a raw MIME
 * message, update the draft on Gmail (when we have a token), then write the
 * new fields back to Supabase.
 *
 * Body: { to?, cc?, bcc?, subject?, body?, html?, threadId? }
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params
    const patch = await req.json().catch(() => ({}))

    const row = await loadDraftRow(id)
    if (!row) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 })
    }

    const account = await loadAccount(row.account_id)
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    // Determine merged values (patch wins, fall back to stored row)
    const to = patch.to ?? row.to_addr ?? ""
    const cc = patch.cc ?? row.cc_addr ?? undefined
    const bcc = patch.bcc ?? row.bcc_addr ?? undefined
    const subject = patch.subject ?? row.subject ?? ""
    const wantHtml = typeof patch.html === "boolean" ? patch.html : !!row.body_html
    const bodyValue =
      patch.body ?? (wantHtml ? row.body_html ?? "" : row.body_text ?? "")
    const threadId = patch.threadId ?? row.thread_id ?? undefined

    const raw = buildRawMessage({
      from: account.email,
      to,
      cc: cc || undefined,
      bcc: bcc || undefined,
      subject,
      body: bodyValue,
      html: wantHtml,
    })

    const isDemo = row.gmail_draft_id.startsWith("demo_")
    let updatedGmailMessageId: string | null = row.gmail_message_id
    let updatedThreadId: string | null = threadId ?? row.thread_id

    if (!isDemo) {
      const token = await getValidAccessToken(account)
      if (token) {
        try {
          const updated = await updateDraft(
            token,
            row.gmail_draft_id,
            raw,
            threadId
          )
          updatedGmailMessageId = updated.message?.id ?? updatedGmailMessageId
          updatedThreadId = updated.message?.threadId ?? updatedThreadId
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
    }

    const supabase = getAdmin()
    const { data: updatedRow, error: updateErr } = await supabase
      .from("gmail_drafts")
      .update({
        to_addr: to,
        cc_addr: cc ?? null,
        bcc_addr: bcc ?? null,
        subject,
        body_text: wantHtml ? null : bodyValue,
        body_html: wantHtml ? bodyValue : null,
        thread_id: updatedThreadId,
        gmail_message_id: updatedGmailMessageId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(DRAFT_COLUMNS)
      .maybeSingle()

    if (updateErr) {
      console.error("[gmail/drafts/[id] PATCH] supabase error", updateErr)
      return NextResponse.json({ error: "Failed to update draft" }, { status: 500 })
    }

    return NextResponse.json({ success: true, demo: isDemo, draft: updatedRow })
  } catch (err) {
    if (err instanceof GmailApiError) {
      return NextResponse.json(
        { error: err.message, status: err.status, details: err.details },
        { status: err.status }
      )
    }
    console.error("[gmail/drafts/[id] PATCH] error", err)
    return NextResponse.json({ error: "Failed to update draft" }, { status: 500 })
  }
}

/**
 * DELETE — remove the draft from Gmail (ignoring 404s) and delete the
 * local row.
 */
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params
    const row = await loadDraftRow(id)
    if (!row) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 })
    }

    const isDemo = row.gmail_draft_id.startsWith("demo_")
    if (!isDemo) {
      const account = await loadAccount(row.account_id)
      const token = account ? await getValidAccessToken(account) : null
      if (token) {
        try {
          await deleteDraft(token, row.gmail_draft_id)
        } catch (err) {
          if (err instanceof GmailApiError && err.status !== 404) {
            return NextResponse.json(
              { error: err.message, status: err.status, details: err.details },
              { status: err.status }
            )
          }
        }
      }
    }

    const supabase = getAdmin()
    const { error: delErr } = await supabase.from("gmail_drafts").delete().eq("id", id)
    if (delErr) {
      console.error("[gmail/drafts/[id] DELETE] supabase error", delErr)
      return NextResponse.json({ error: "Failed to delete draft" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof GmailApiError) {
      return NextResponse.json(
        { error: err.message, status: err.status, details: err.details },
        { status: err.status }
      )
    }
    console.error("[gmail/drafts/[id] DELETE] error", err)
    return NextResponse.json({ error: "Failed to delete draft" }, { status: 500 })
  }
}
