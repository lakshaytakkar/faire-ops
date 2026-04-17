import { NextResponse } from "next/server"
import { normalizeNameForProduct } from "@/lib/bhagwati/automate"

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
    let body: { name?: string; description?: string; language_hint?: "cn" | "en" | "mixed" } = {}
    try {
      body = (await request.json()) as typeof body
    } catch {
      // Empty body is allowed.
    }
    const suggestion = await normalizeNameForProduct(id, body)
    return NextResponse.json(suggestion)
  } catch (err) {
    const msg = (err as Error).message
    const status = msg === "product_not_found" ? 404 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
