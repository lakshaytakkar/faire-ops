import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { deleteProduct } from "@/lib/faire-api"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
)

export async function POST(request: Request, { params }: { params: Promise<{ productId: string }> }) {
  try {
    const { productId } = await params

    // Get product to find store
    const { data: product } = await supabase
      .from("faire_products")
      .select("store_id, faire_product_id")
      .eq("faire_product_id", productId)
      .single()

    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 })

    // Get store credentials
    const { data: store } = await supabase
      .from("faire_stores")
      .select("oauth_token, app_credentials")
      .eq("id", product.store_id)
      .single()

    if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 })

    // Call Faire API
    const result = await deleteProduct(
      { oauth_token: store.oauth_token, app_credentials: store.app_credentials },
      productId
    )

    // Delete from local DB
    await supabase
      .from("faire_products")
      .delete()
      .eq("faire_product_id", productId)

    return NextResponse.json({ success: true, result })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
