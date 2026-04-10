import { NextResponse } from "next/server"
import { shipOrder } from "@/lib/faire-api"
import { supabaseB2B } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const { quote_id, tracking_code, carrier } = await request.json()

    if (!quote_id || !tracking_code || !carrier) {
      return NextResponse.json(
        { error: "quote_id, tracking_code, and carrier are required" },
        { status: 400 }
      )
    }

    // Get the quote
    const { data: quote, error: quoteError } = await supabaseB2B
      .from("vendor_quotes")
      .select("id, order_id, vendor_id, total_cost_cents")
      .eq("id", quote_id)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 })
    }

    // Get the order
    const { data: order, error: orderError } = await supabaseB2B
      .from("faire_orders")
      .select("store_id, faire_order_id, display_id, total_cents")
      .eq("faire_order_id", quote.order_id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Get store credentials
    const { data: store, error: storeError } = await supabaseB2B
      .from("faire_stores")
      .select("oauth_token, app_credentials")
      .eq("id", order.store_id)
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 })
    }

    // Call Faire API to ship
    await shipOrder(
      { oauth_token: store.oauth_token, app_credentials: store.app_credentials },
      quote.order_id,
      tracking_code,
      carrier
    )

    // Calculate shipping cost: 12% of order total
    const shipping12Percent = Math.round(order.total_cents * 0.12)

    // Update vendor_quotes
    await supabaseB2B
      .from("vendor_quotes")
      .update({
        tracking_code,
        carrier,
        shipped_at: new Date().toISOString(),
        status: "shipped",
        updated_at: new Date().toISOString(),
      })
      .eq("id", quote_id)

    // Update faire_orders
    await supabaseB2B
      .from("faire_orders")
      .update({ state: "IN_TRANSIT", quote_status: "shipped" })
      .eq("faire_order_id", quote.order_id)

    const displayId = order.display_id ?? quote.order_id

    const today = new Date().toISOString().split("T")[0]

    // Create ledger entry for vendor fulfillment cost
    await supabaseB2B.from("faire_ledger_entries").insert({
      entry_date: today,
      entry_type: "expense",
      description: `Vendor fulfillment — Order ${displayId}`,
      amount_cents: -(quote.total_cost_cents ?? 0),
      vendor_id: quote.vendor_id,
      order_id: quote.order_id,
      store_id: order.store_id,
      status: "completed",
    })

    // Create ledger entry for shipping cost (12%)
    await supabaseB2B.from("faire_ledger_entries").insert({
      entry_date: today,
      entry_type: "expense",
      description: `Shipping cost (12%) — Order ${displayId}`,
      amount_cents: -shipping12Percent,
      store_id: order.store_id,
      order_id: quote.order_id,
      status: "completed",
    })

    return NextResponse.json({
      success: true,
      faire_updated: true,
      ledger_entries: 2,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
