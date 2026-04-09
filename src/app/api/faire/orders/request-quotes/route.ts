import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  )
}

export async function POST(request: Request) {
  try {
    const { order_id } = await request.json()

    if (!order_id) {
      return NextResponse.json({ error: "order_id is required" }, { status: 400 })
    }

    // Get all active vendors
    const { data: vendors, error: vendorsError } = await getSupabase()
      .from("faire_vendors")
      .select("id, name")

    if (vendorsError) {
      return NextResponse.json({ error: vendorsError.message }, { status: 500 })
    }

    if (!vendors || vendors.length === 0) {
      return NextResponse.json({ error: "No active vendors found" }, { status: 404 })
    }

    // Get order details
    const { data: order, error: orderError } = await getSupabase()
      .from("faire_orders")
      .select("faire_order_id, raw_data")
      .eq("faire_order_id", order_id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Extract items from raw_data
    const rawItems = (order.raw_data?.items as Record<string, unknown>[]) ?? []
    const items = rawItems.map((item) => ({
      product_name: (item.product_name as string) ?? "",
      quantity: (item.quantity as number) ?? 1,
      product_id: (item.product_id as string) ?? "",
    }))

    // Create a quote request for each vendor
    const quoteRows = vendors.map((vendor) => ({
      order_id: order_id,
      vendor_id: vendor.id,
      status: "requested",
      items: items.map((i) => ({
        product_name: i.product_name,
        quantity: i.quantity,
      })),
    }))

    const { error: insertError } = await getSupabase()
      .from("vendor_quotes")
      .insert(quoteRows)

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Update order quote_status
    await getSupabase()
      .from("faire_orders")
      .update({ quote_status: "requested" })
      .eq("faire_order_id", order_id)

    return NextResponse.json({ success: true, quotes_created: vendors.length })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
