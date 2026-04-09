import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { updateProduct } from "@/lib/faire-api"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  )
}

export async function POST(request: Request, { params }: { params: Promise<{ productId: string }> }) {
  try {
    const { productId } = await params
    const { updates } = await request.json()

    if (!updates) {
      return NextResponse.json({ error: "updates are required" }, { status: 400 })
    }

    // Get product to find store
    const { data: product } = await getSupabase()
      .from("faire_products")
      .select("store_id, faire_product_id")
      .eq("faire_product_id", productId)
      .single()

    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 })

    // Get store credentials
    const { data: store } = await getSupabase()
      .from("faire_stores")
      .select("oauth_token, app_credentials")
      .eq("id", product.store_id)
      .single()

    if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 })

    // Call Faire API
    const result = await updateProduct(
      { oauth_token: store.oauth_token, app_credentials: store.app_credentials },
      productId,
      updates
    )

    // Update local DB
    await getSupabase()
      .from("faire_products")
      .update({ raw_data: result, faire_updated_at: new Date().toISOString() })
      .eq("faire_product_id", productId)

    return NextResponse.json({ success: true, result })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
