import { NextResponse } from "next/server"
import { polishImageForProduct } from "@/lib/bhagwati/automate"

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
    const body = (await request.json().catch(() => ({}))) as { force?: boolean }
    const outcome = await polishImageForProduct(id, { force: !!body.force })
    return NextResponse.json({
      ...outcome.result,
      image_url: outcome.imageUrl,
    })
  } catch (err) {
    const msg = (err as Error).message
    const status = msg === "product_not_found" ? 404 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
