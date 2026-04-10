import { NextRequest, NextResponse } from "next/server"
import {
  loadAccount,
  getValidAccessToken,
  listLabels,
  findOrCreateLabel,
  GmailApiError,
} from "@/lib/gmail-api"

/**
 * GET — returns the Gmail labels for the active (or specified) account.
 *
 * Query: ?accountId=...
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const accountId = searchParams.get("accountId") ?? undefined

    const account = await loadAccount(accountId)
    if (!account) {
      return NextResponse.json({ error: "No active Gmail account" }, { status: 404 })
    }

    const token = await getValidAccessToken(account)
    if (!token) {
      // Demo fallback — no real Gmail labels available
      return NextResponse.json({ success: true, demo: true, labels: [] })
    }

    try {
      const { labels } = await listLabels(token)
      return NextResponse.json({ success: true, labels: labels ?? [] })
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
    console.error("[gmail/labels GET] error", err)
    return NextResponse.json({ error: "Failed to load labels" }, { status: 500 })
  }
}

/**
 * POST — find-or-create a label by name.
 *
 * Body: { accountId?, name }
 *
 * Used by AI categorization to ensure a category label exists before
 * applying it to a message.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { accountId, name } = body
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Missing required field: name" }, { status: 400 })
    }

    const account = await loadAccount(accountId)
    if (!account) {
      return NextResponse.json({ error: "No active Gmail account" }, { status: 404 })
    }

    const token = await getValidAccessToken(account)
    if (!token) {
      // Demo fallback — fabricate a local-looking label id so the UI has something to store
      return NextResponse.json({
        success: true,
        demo: true,
        label: { id: `demo_${name}`, name, type: "user" },
      })
    }

    try {
      const label = await findOrCreateLabel(token, name)
      return NextResponse.json({ success: true, label })
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
    console.error("[gmail/labels POST] error", err)
    return NextResponse.json({ error: "Failed to create label" }, { status: 500 })
  }
}
