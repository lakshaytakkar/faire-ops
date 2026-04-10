import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { supabaseB2B } from "@/lib/supabase"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  )
}

export async function POST() {
  try {
    // Only process positive (incoming) transactions mentioning "FAIRE"
    const { data: txns } = await getSupabase()
      .from("bank_transactions_v2")
      .select("id, amount_cents, description, reference, transaction_date")
      .eq("is_reconciled", false)
      .gt("amount_cents", 0)
      .order("transaction_date", { ascending: true })

    if (!txns || txns.length === 0) {
      return NextResponse.json({ message: "No unreconciled transactions", auto_matched: 0, manual_review: 0 })
    }

    const fairePayouts = txns.filter(t =>
      (t.description ?? "").toUpperCase().includes("FAIRE")
    )

    // Get orders already matched (globally) to prevent duplicates
    const { data: alreadyMatched } = await getSupabase()
      .from("bank_transactions_v2")
      .select("matched_order_id")
      .eq("is_reconciled", true)
      .not("matched_order_id", "is", null)
    const matchedSet = new Set((alreadyMatched ?? []).map(r => r.matched_order_id))

    // Get delivered orders
    const { data: orders } = await supabaseB2B
      .from("faire_orders")
      .select("faire_order_id, display_id, total_cents, faire_created_at")
      .eq("state", "DELIVERED")
      .order("faire_created_at", { ascending: true })

    if (!orders) {
      return NextResponse.json({ message: "No orders", auto_matched: 0, manual_review: fairePayouts.length })
    }

    const availableOrders = orders.filter(o => !matchedSet.has(o.faire_order_id))

    let autoMatched = 0
    let manualReview = 0
    const usedThisRun = new Set<string>()

    for (const txn of fairePayouts) {
      const txnAmount = txn.amount_cents
      const txnDate = new Date(txn.transaction_date)

      // Step 1: Amount match (payout ≈ 85% of order, ±3% tolerance)
      const candidates = availableOrders.filter(o => {
        if (usedThisRun.has(o.faire_order_id)) return false
        const expected = Math.round(o.total_cents * 0.85)
        return Math.abs(txnAmount - expected) <= Math.round(expected * 0.03)
      })

      // Step 2: Date filter (payout 7-90 days after order)
      const dateFiltered = candidates.filter(o => {
        const days = (txnDate.getTime() - new Date(o.faire_created_at ?? "").getTime()) / 86400000
        return days >= 7 && days <= 90
      })

      if (dateFiltered.length === 0) { manualReview++; continue }

      // Step 3: Best match = closest amount
      const best = dateFiltered.sort((a, b) =>
        Math.abs(txnAmount - Math.round(a.total_cents * 0.85)) -
        Math.abs(txnAmount - Math.round(b.total_cents * 0.85))
      )[0]

      usedThisRun.add(best.faire_order_id)
      await getSupabase().from("bank_transactions_v2")
        .update({ is_reconciled: true, matched_order_id: best.faire_order_id })
        .eq("id", txn.id)
      autoMatched++
    }

    return NextResponse.json({
      message: "Auto-reconciliation complete",
      auto_matched: autoMatched,
      manual_review: manualReview,
      faire_payouts_processed: fairePayouts.length,
      non_faire_skipped: txns.length - fairePayouts.length,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
