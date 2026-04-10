import { NextRequest, NextResponse } from "next/server"
import { supabase, supabaseB2B } from "@/lib/supabase"
import { generateText } from "@/lib/gemini"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { report_type, store_id } = body as {
      report_type: "daily" | "weekly" | "monthly"
      store_id?: string
    }

    if (!["daily", "weekly", "monthly"].includes(report_type)) {
      return NextResponse.json({ error: "Invalid report_type" }, { status: 400 })
    }

    // Calculate period dates
    const now = new Date()
    const periodEnd = now.toISOString().split("T")[0]
    let periodStart: string
    let days: number

    switch (report_type) {
      case "daily":
        periodStart = periodEnd
        days = 1
        break
      case "weekly":
        const weekAgo = new Date(now)
        weekAgo.setDate(weekAgo.getDate() - 6)
        periodStart = weekAgo.toISOString().split("T")[0]
        days = 7
        break
      case "monthly":
        const monthAgo = new Date(now)
        monthAgo.setDate(monthAgo.getDate() - 29)
        periodStart = monthAgo.toISOString().split("T")[0]
        days = 30
        break
    }

    // Query orders in period
    let ordersQuery = supabaseB2B
      .from("faire_orders")
      .select("total_cents, state, store_id, source, faire_created_at")
      .gte("faire_created_at", periodStart)
      .lte("faire_created_at", periodEnd + "T23:59:59")
    if (store_id) ordersQuery = ordersQuery.eq("store_id", store_id)
    const { data: ordersData } = await ordersQuery

    const orders = ordersData ?? []

    // Products count
    let productsQuery = supabaseB2B.from("faire_products").select("*", { count: "exact", head: true })
    if (store_id) productsQuery = productsQuery.eq("store_id", store_id)
    const { count: productsCount } = await productsQuery

    // Published products
    let publishedQuery = supabaseB2B
      .from("faire_products")
      .select("*", { count: "exact", head: true })
      .eq("sale_state", "FOR_SALE")
    if (store_id) publishedQuery = publishedQuery.eq("store_id", store_id)
    const { count: publishedCount } = await publishedQuery

    // Active retailers
    const { count: retailersCount } = await supabaseB2B
      .from("faire_retailers")
      .select("*", { count: "exact", head: true })
      .gt("total_orders", 0)

    // Fetch store names for grouping
    const { data: storesData } = await supabaseB2B.from("faire_stores").select("id, name")
    const storeMap: Record<string, string> = {}
    for (const s of storesData ?? []) {
      storeMap[s.id] = s.name
    }

    // Build aggregates
    const totalOrders = orders.length
    const revenueCents = orders.reduce((sum, o) => sum + (o.total_cents ?? 0), 0)
    const stateCounts: Record<string, number> = {}
    const sourceCounts: Record<string, number> = {}
    const storeAgg: Record<string, { count: number; revenue: number }> = {}

    for (const o of orders) {
      const st = o.state ?? "UNKNOWN"
      stateCounts[st] = (stateCounts[st] ?? 0) + 1

      const src = o.source ?? "UNKNOWN"
      sourceCounts[src] = (sourceCounts[src] ?? 0) + 1

      const sid = o.store_id ?? "unknown"
      if (!storeAgg[sid]) storeAgg[sid] = { count: 0, revenue: 0 }
      storeAgg[sid].count++
      storeAgg[sid].revenue += o.total_cents ?? 0
    }

    const ordersByStore = Object.entries(storeAgg).map(([sid, agg]) => ({
      store_name: storeMap[sid] ?? sid,
      count: agg.count,
      revenue: agg.revenue,
    }))
    ordersByStore.sort((a, b) => b.revenue - a.revenue)

    const ordersByState = Object.entries(stateCounts).map(([state, count]) => ({ state, count }))
    ordersByState.sort((a, b) => b.count - a.count)

    const ordersBySource = Object.entries(sourceCounts).map(([source, count]) => ({ source, count }))
    ordersBySource.sort((a, b) => b.count - a.count)

    // Top retailers from faire_retailers
    let retailersQuery = supabaseB2B
      .from("faire_retailers")
      .select("name, company_name, total_orders, total_spent_cents")
      .gt("total_orders", 0)
      .order("total_spent_cents", { ascending: false })
      .limit(10)
    const { data: topRetailersData } = await retailersQuery
    const topRetailers = (topRetailersData ?? []).map((r) => ({
      name: r.company_name || r.name || "Unknown",
      orders: r.total_orders,
      revenue: r.total_spent_cents,
    }))

    const content = {
      orders: {
        total: totalOrders,
        new: stateCounts["NEW"] ?? 0,
        processing: stateCounts["PROCESSING"] ?? 0,
        delivered: stateCounts["DELIVERED"] ?? 0,
        canceled: stateCounts["CANCELED"] ?? 0,
        in_transit: stateCounts["IN_TRANSIT"] ?? 0,
        revenue_cents: revenueCents,
      },
      orders_by_store: ordersByStore,
      orders_by_state: ordersByState,
      orders_by_source: ordersBySource,
      top_retailers: topRetailers,
      products: {
        total: productsCount ?? 0,
        published: publishedCount ?? 0,
      },
      financial: {
        revenue: revenueCents,
        payout_estimate: Math.round(revenueCents * 0.85),
        commission_estimate: Math.round(revenueCents * 0.15),
      },
      period: {
        start: periodStart,
        end: periodEnd,
        days,
      },
      retailers: {
        total_active: retailersCount ?? 0,
      },
    }

    // Generate AI executive summary
    const summary = await generateText(
      `Write a brief executive summary (3-4 sentences) for this ${report_type} business report:
Orders: ${content.orders.total}, Revenue: $${(content.orders.revenue_cents / 100).toFixed(0)}, Delivered: ${content.orders.delivered}, New: ${content.orders.new}
Active retailers: ${content.retailers.total_active}, Products: ${content.products.total}
Period: ${periodStart} to ${periodEnd}
Keep it professional, highlight key metrics and any concerns. No markdown formatting.`
    )

    // Build title
    const typeLabel = report_type.charAt(0).toUpperCase() + report_type.slice(1)
    const dateLabel =
      report_type === "daily"
        ? new Date(periodEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
        : `${new Date(periodStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${new Date(periodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
    const title = `${typeLabel} Report — ${dateLabel}`

    // Insert into reports table
    const { data: report, error: insertError } = await supabase
      .from("reports")
      .insert({
        title,
        report_type,
        period_start: periodStart,
        period_end: periodEnd,
        content,
        summary,
        generated_by: "system",
        status: "published",
        store_id: store_id ?? null,
      })
      .select()
      .single()

    if (insertError) {
      console.error("Insert error:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ report })
  } catch (err) {
    console.error("Report generation error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
