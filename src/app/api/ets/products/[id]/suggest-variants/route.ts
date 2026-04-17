import { NextResponse } from "next/server"
import { suggestVariantsForProduct } from "@/lib/bhagwati/automate"

export const runtime = "nodejs"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "missing_product_id" }, { status: 400 })
    }
    const result = await suggestVariantsForProduct(id)
    return NextResponse.json(result)
  } catch (err) {
    const msg = (err as Error).message
    const status = msg === "product_not_found" ? 404 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
