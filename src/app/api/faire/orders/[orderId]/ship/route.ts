import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { shipOrder } from "@/lib/faire-api"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  )
}

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await params
    const { tracking_code, carrier } = await request.json()

    if (!tracking_code || !carrier) {
      return NextResponse.json({ error: "tracking_code and carrier are required" }, { status: 400 })
    }

    // Get order to find store
    const { data: order } = await getSupabase()
      .from("faire_orders")
      .select("store_id, faire_order_id")
      .eq("faire_order_id", orderId)
      .single()

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })

    // Get store credentials
    const { data: store } = await getSupabase()
      .from("faire_stores")
      .select("oauth_token, app_credentials")
      .eq("id", order.store_id)
      .single()

    if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 })

    // Call Faire API
    const result = await shipOrder(
      { oauth_token: store.oauth_token, app_credentials: store.app_credentials },
      orderId,
      tracking_code,
      carrier
    )

    // Update local DB
    await getSupabase()
      .from("faire_orders")
      .update({ state: "IN_TRANSIT" })
      .eq("faire_order_id", orderId)

    return NextResponse.json({ success: true, result })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
