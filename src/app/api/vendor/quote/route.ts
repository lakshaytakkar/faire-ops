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
    const { quote_id, items, shipping_cost_cents, notes } = await request.json()

    if (!quote_id || !items || shipping_cost_cents == null) {
      return NextResponse.json(
        { error: "quote_id, items, and shipping_cost_cents are required" },
        { status: 400 }
      )
    }

    // Calculate total: sum of all item costs + shipping
    const itemTotal = items.reduce(
      (sum: number, item: { vendor_price_cents: number; quantity?: number; qty?: number }) =>
        sum + (item.vendor_price_cents ?? 0) * ((item.qty ?? item.quantity ?? 1)),
      0
    )
    const total_cost_cents = itemTotal + shipping_cost_cents

    // Update the quote
    const { data: quote, error: updateError } = await getSupabase()
      .from("vendor_quotes")
      .update({
        items,
        shipping_cost_cents,
        total_cost_cents,
        status: "quoted",
        notes: notes ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", quote_id)
      .select("order_id")
      .single()

    if (updateError || !quote) {
      return NextResponse.json(
        { error: updateError?.message ?? "Quote not found" },
        { status: 404 }
      )
    }

    // Check if all quotes for this order are now "quoted"
    const { data: pendingQuotes } = await getSupabase()
      .from("vendor_quotes")
      .select("id")
      .eq("order_id", quote.order_id)
      .neq("status", "quoted")

    if (!pendingQuotes || pendingQuotes.length === 0) {
      await getSupabase()
        .from("faire_orders")
        .update({ quote_status: "quoted" })
        .eq("faire_order_id", quote.order_id)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
