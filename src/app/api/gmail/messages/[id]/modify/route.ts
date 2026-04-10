import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import {
  loadAccount,
  getValidAccessToken,
  modifyMessage,
  syncLocalLabels,
  GmailApiError,
} from "@/lib/gmail-api"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  )
}

/**
 * Modify a message's labels (mark read/unread, star/unstar, archive, move).
 *
 * Body: { addLabelIds?: string[], removeLabelIds?: string[] }
 *
 * The [id] segment is the *Supabase row id*, which we resolve to a gmail_id
 * + account_id before calling the Gmail API. This way the client never has
 * to know the gmail_id.
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params
    const body = await req.json().catch(() => ({}))
    const addLabelIds: string[] = body.addLabelIds ?? []
    const removeLabelIds: string[] = body.removeLabelIds ?? []

    const supabase = getAdmin()
    const { data: row } = await supabase
      .from("gmail_messages")
      .select("id, account_id, gmail_id, label_ids")
      .eq("id", id)
      .maybeSingle()

    if (!row) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
    }

    // Optimistic local update so the client gets a fast response even on demo accounts
    const currentLabels = (row.label_ids as string[] | null) ?? []
    const nextLabels = Array.from(
      new Set([
        ...currentLabels.filter((l) => !removeLabelIds.includes(l)),
        ...addLabelIds,
      ])
    )
    await syncLocalLabels(row.account_id as string, row.gmail_id as string, nextLabels)

    // Try the real Gmail API
    const account = await loadAccount(row.account_id as string)
    const token = account ? await getValidAccessToken(account) : null

    if (!token) {
      return NextResponse.json({
        success: true,
        demo: true,
        labels: nextLabels,
      })
    }

    try {
      const updated = await modifyMessage(
        token,
        row.gmail_id as string,
        addLabelIds,
        removeLabelIds
      )
      // Re-sync local with the truth from Gmail
      await syncLocalLabels(
        row.account_id as string,
        row.gmail_id as string,
        updated.labelIds ?? nextLabels
      )
      return NextResponse.json({ success: true, labels: updated.labelIds ?? nextLabels })
    } catch (err) {
      if (err instanceof GmailApiError && err.status === 404) {
        // Message gone from Gmail — drop the local row
        await supabase.from("gmail_messages").delete().eq("id", id)
        return NextResponse.json({ error: "Message no longer exists" }, { status: 404 })
      }
      throw err
    }
  } catch (err) {
    if (err instanceof GmailApiError) {
      return NextResponse.json(
        { error: err.message, status: err.status, details: err.details },
        { status: err.status }
      )
    }
    console.error("[gmail/messages/modify] error", err)
    return NextResponse.json({ error: "Modify failed" }, { status: 500 })
  }
}
