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
    const { quote_id } = await request.json()

    if (!quote_id) {
      return NextResponse.json({ error: "quote_id is required" }, { status: 400 })
    }

    // Get the quote to find order_id and vendor_id
    const { data: quote, error: quoteError } = await getSupabase()
      .from("vendor_quotes")
      .select("id, order_id, vendor_id")
      .eq("id", quote_id)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 })
    }

    // Approve this quote
    await getSupabase()
      .from("vendor_quotes")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", quote_id)

    // Reject all other quotes for the same order
    await getSupabase()
      .from("vendor_quotes")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("order_id", quote.order_id)
      .neq("id", quote_id)

    // Update the order with assigned vendor and quote status
    await getSupabase()
      .from("faire_orders")
      .update({
        assigned_vendor_id: quote.vendor_id,
        quote_status: "approved",
      })
      .eq("faire_order_id", quote.order_id)

    // Get vendor name for response
    const { data: vendor } = await getSupabase()
      .from("faire_vendors")
      .select("name")
      .eq("id", quote.vendor_id)
      .single()

    return NextResponse.json({
      success: true,
      vendor_name: vendor?.name ?? null,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
