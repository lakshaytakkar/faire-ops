import { NextRequest, NextResponse } from "next/server"
import { draftReply, DraftReplyOptions } from "@/lib/gmail-ai"

export const maxDuration = 120

const ALLOWED_TONES = new Set(["professional", "friendly", "concise", "detailed"])

/**
 * POST /api/gmail/ai/draft-reply
 * Body: { messageId: string, tone?: string, instructions?: string }
 *
 * Generates an AI reply draft for the given gmail_messages row, creates
 * a Gmail draft (when the account is connected), and stores a row in
 * gmail_drafts. Returns the local draft id, gmail draft id, subject, and body.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const messageId: string | undefined = body.messageId
    const toneRaw: string | undefined = body.tone
    const instructions: string | undefined = body.instructions

    if (!messageId || typeof messageId !== "string") {
      return NextResponse.json({ error: "messageId is required" }, { status: 400 })
    }

    const tone = toneRaw && ALLOWED_TONES.has(toneRaw)
      ? (toneRaw as DraftReplyOptions["tone"])
      : undefined

    const result = await draftReply(messageId, {
      tone,
      instructions,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    console.error("[api/gmail/ai/draft-reply] error", err)
    const msg = (err as Error).message ?? "Draft reply failed"
    const status = msg === "Message not found" ? 404 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
