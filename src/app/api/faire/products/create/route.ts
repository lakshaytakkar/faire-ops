import { NextResponse } from "next/server"
import { createProduct } from "@/lib/faire-api"
import { supabaseB2B } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const { store_id, product_data } = await request.json()

    if (!store_id || !product_data) {
      return NextResponse.json({ error: "store_id and product_data are required" }, { status: 400 })
    }

    // Get store credentials
    const { data: store } = await supabaseB2B
      .from("faire_stores")
      .select("oauth_token, app_credentials")
      .eq("id", store_id)
      .single()

    if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 })

    // Call Faire API
    const result = await createProduct(
      { oauth_token: store.oauth_token, app_credentials: store.app_credentials },
      product_data
    )

    return NextResponse.json({ success: true, result })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
