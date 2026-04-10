import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import {
  loadAccount,
  getValidAccessToken,
  trashMessage,
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
 * Move a message to Trash.
 * On Gmail this swaps INBOX → TRASH on the labels list.
 */
export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params

    const supabase = getAdmin()
    const { data: row } = await supabase
      .from("gmail_messages")
      .select("id, account_id, gmail_id, label_ids")
      .eq("id", id)
      .maybeSingle()

    if (!row) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
    }

    // Optimistic local update
    const currentLabels = (row.label_ids as string[] | null) ?? []
    const nextLabels = Array.from(
      new Set([...currentLabels.filter((l) => l !== "INBOX"), "TRASH"])
    )
    await syncLocalLabels(row.account_id as string, row.gmail_id as string, nextLabels)

    const account = await loadAccount(row.account_id as string)
    const token = account ? await getValidAccessToken(account) : null

    if (!token) {
      return NextResponse.json({ success: true, demo: true })
    }

    try {
      const updated = await trashMessage(token, row.gmail_id as string)
      await syncLocalLabels(
        row.account_id as string,
        row.gmail_id as string,
        updated.labelIds ?? nextLabels
      )
      return NextResponse.json({ success: true })
    } catch (err) {
      if (err instanceof GmailApiError && err.status === 404) {
        await supabase.from("gmail_messages").delete().eq("id", id)
        return NextResponse.json({ success: true, removed: true })
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
    console.error("[gmail/messages/trash] error", err)
    return NextResponse.json({ error: "Trash failed" }, { status: 500 })
  }
}
