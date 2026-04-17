import { NextResponse } from "next/server"
import { applyNormalizedNameForProduct } from "@/lib/bhagwati/automate"

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
      | { name_en?: string; description?: string }
      | null
    if (!body || typeof body.name_en !== "string" || typeof body.description !== "string") {
      return NextResponse.json(
        { error: "missing_fields", required: ["name_en", "description"] },
        { status: 400 },
      )
    }
    const product = await applyNormalizedNameForProduct(id, {
      name_en: body.name_en,
      description: body.description,
    })
    return NextResponse.json({ product })
  } catch (err) {
    const msg = (err as Error).message
    const status = msg === "product_not_found" ? 404 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
