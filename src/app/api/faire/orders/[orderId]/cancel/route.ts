import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { cancelOrder } from "@/lib/faire-api"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
)

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await params

    // Get order to find store
    const { data: order } = await supabase
      .from("faire_orders")
      .select("store_id, faire_order_id")
      .eq("faire_order_id", orderId)
      .single()

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })

    // Get store credentials
    const { data: store } = await supabase
      .from("faire_stores")
      .select("oauth_token, app_credentials")
      .eq("id", order.store_id)
      .single()

    if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 })

    // Call Faire API
    const result = await cancelOrder(
      { oauth_token: store.oauth_token, app_credentials: store.app_credentials },
      orderId
    )

    // Update local DB
    await supabase
      .from("faire_orders")
      .update({ state: "CANCELED" })
      .eq("faire_order_id", orderId)

    return NextResponse.json({ success: true, result })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
