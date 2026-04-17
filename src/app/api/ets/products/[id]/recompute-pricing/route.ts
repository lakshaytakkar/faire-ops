import { NextResponse } from "next/server"
import { recomputePricingForProduct } from "@/lib/bhagwati/automate"

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
    const body = (await request.json().catch(() => ({}))) as {
      fxRate?: number
      marginPct?: number
      applyToVariants?: boolean
    }
    const result = await recomputePricingForProduct(id, {
      fxRate: typeof body.fxRate === "number" ? body.fxRate : undefined,
      marginPct: typeof body.marginPct === "number" ? body.marginPct : undefined,
      applyToVariants: !!body.applyToVariants,
    })
    return NextResponse.json(result)
  } catch (err) {
    const msg = (err as Error).message
    const status = msg === "product_not_found" ? 404 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
