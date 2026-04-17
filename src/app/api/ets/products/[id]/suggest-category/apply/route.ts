import { NextResponse } from "next/server"
import { applyCategoryForProduct } from "@/lib/bhagwati/automate"

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
      | { categoryId?: string; confidence?: number }
      | null
    if (!body || typeof body.categoryId !== "string") {
      return NextResponse.json(
        { error: "missing_fields", required: ["categoryId", "confidence"] },
        { status: 400 },
      )
    }
    const product = await applyCategoryForProduct(id, {
      categoryId: body.categoryId,
      confidence: typeof body.confidence === "number" ? body.confidence : 0,
    })
    return NextResponse.json({ product })
  } catch (err) {
    const msg = (err as Error).message
    const status = msg === "product_not_found" ? 404 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
