import { NextResponse } from "next/server"
import {
  bulkCreateVariantsForProduct,
  type BulkVariantInput,
} from "@/lib/bhagwati/automate"

export const runtime = "nodejs"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "missing_product_id" }, { status: 400 })
    }
    const body = (await request.json().catch(() => null)) as
      | { variants?: BulkVariantInput[] }
      | null
    if (!body || !Array.isArray(body.variants) || body.variants.length === 0) {
      return NextResponse.json(
        { error: "missing_fields", required: ["variants[]"] },
        { status: 400 },
      )
    }
    const result = await bulkCreateVariantsForProduct(id, body.variants)
    return NextResponse.json(result)
  } catch (err) {
    const msg = (err as Error).message
    const status = msg === "product_not_found" ? 404 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
