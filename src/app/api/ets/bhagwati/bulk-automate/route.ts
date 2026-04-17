import { NextResponse } from "next/server"
import {
  BULK_AUTOMATE_LIMIT,
  runBulkAutomate,
  type BulkAction,
} from "@/lib/bhagwati/automate"

export const runtime = "nodejs"
export const maxDuration = 300

const VALID_ACTIONS: readonly BulkAction[] = [
  "polish-image",
  "suggest-category",
  "normalize-name",
  "recompute-pricing",
  "publish-ready",
]

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { action?: string; productIds?: string[] }
      | null
    if (!body) {
      return NextResponse.json({ error: "missing_body" }, { status: 400 })
    }
    if (!body.action || !VALID_ACTIONS.includes(body.action as BulkAction)) {
      return NextResponse.json(
        {
          error: "invalid_action",
          valid: VALID_ACTIONS,
        },
        { status: 400 },
      )
    }
    if (!Array.isArray(body.productIds) || body.productIds.length === 0) {
      return NextResponse.json(
        { error: "missing_fields", required: ["productIds[]"] },
        { status: 400 },
      )
    }
    if (body.productIds.length > BULK_AUTOMATE_LIMIT) {
      return NextResponse.json(
        {
          error: "too_many_products",
          limit: BULK_AUTOMATE_LIMIT,
          received: body.productIds.length,
        },
        { status: 400 },
      )
    }

    const result = await runBulkAutomate(
      body.action as BulkAction,
      body.productIds,
    )
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    )
  }
}
