import { NextResponse } from "next/server"
import { shipOrder } from "@/lib/faire-api"
import { getSupabaseJSBlueridgeAdmin } from "@/lib/supabase"

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await params
    const { trackingCode, carrier } = await request.json()
    const db = getSupabaseJSBlueridgeAdmin()

    const { data: order } = await db
      .from("faire_orders")
      .select("store_id, faire_order_id")
      .eq("faire_order_id", orderId)
      .single()

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })

    const { data: store } = await db
      .from("faire_stores")
      .select("oauth_token, app_credentials")
      .eq("id", order.store_id)
      .single()

    if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 })

    const result = await shipOrder(
      { oauth_token: store.oauth_token, app_credentials: store.app_credentials },
      orderId,
      trackingCode ?? "",
      carrier ?? "",
    )

    await db.from("faire_orders").update({ state: "PRE_TRANSIT" }).eq("faire_order_id", orderId)

    return NextResponse.json({ success: true, result })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
