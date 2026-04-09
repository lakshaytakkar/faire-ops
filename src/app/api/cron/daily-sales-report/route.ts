import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  )
}

export const maxDuration = 60

const DM_CHANNEL_ID = "8504dd9e-273f-4184-9ad8-a90b4859c582"
const SENDER = "Priya Sharma"

function formatCents(cents: number): string {
  return "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })
}

export async function GET(request: Request) {
  // Allow both cron secret and manual trigger via query param
  const url = new URL(request.url)
  const manual = url.searchParams.get("manual") === "true"
  const authHeader = request.headers.get("authorization")

  if (!manual && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getSupabase()
  const today = new Date()
  const todayStr = today.toISOString().split("T")[0]
  const startOfDay = todayStr + "T00:00:00.000Z"
  const endOfDay = todayStr + "T23:59:59.999Z"

  try {
    // Fetch today's orders
    const { data: todayOrders } = await supabase
      .from("faire_orders")
      .select("id, display_id, store_id, state, total_cents, item_count, faire_created_at")
      .gte("faire_created_at", startOfDay)
      .lte("faire_created_at", endOfDay)
      .order("faire_created_at", { ascending: false })

    // Fetch all stores for name lookup
    const { data: stores } = await supabase
      .from("faire_stores")
      .select("id, name, short")

    const storeMap: Record<string, { name: string; short: string }> = {}
    for (const s of stores ?? []) {
      storeMap[s.id] = { name: s.name, short: s.short }
    }

    const orders = todayOrders ?? []
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total_cents ?? 0), 0)
    const totalItems = orders.reduce((sum, o) => sum + (o.item_count ?? 0), 0)
    const orderCount = orders.length

    // Group by store
    const byStore: Record<string, { name: string; count: number; revenue: number }> = {}
    for (const o of orders) {
      const store = storeMap[o.store_id]
      const key = o.store_id
      if (!byStore[key]) byStore[key] = { name: store?.name ?? "Unknown", count: 0, revenue: 0 }
      byStore[key].count++
      byStore[key].revenue += o.total_cents ?? 0
    }

    // Group by state
    const byState: Record<string, number> = {}
    for (const o of orders) {
      byState[o.state] = (byState[o.state] ?? 0) + 1
    }

    // Build the report message
    let report = `📊 **Daily Sales Report — ${formatDate(today)}**\n\n`

    if (orderCount === 0) {
      report += `No new orders today.\n`
    } else {
      report += `**Summary**\n`
      report += `• Orders: ${orderCount}\n`
      report += `• Revenue: ${formatCents(totalRevenue)}\n`
      report += `• Items sold: ${totalItems}\n`
      report += `• Avg order: ${formatCents(Math.round(totalRevenue / orderCount))}\n\n`

      // By store breakdown
      const storeEntries = Object.values(byStore).sort((a, b) => b.revenue - a.revenue)
      if (storeEntries.length > 0) {
        report += `**By Store**\n`
        for (const s of storeEntries) {
          report += `• ${s.name}: ${s.count} orders — ${formatCents(s.revenue)}\n`
        }
        report += `\n`
      }

      // By status
      if (Object.keys(byState).length > 0) {
        report += `**Order Status**\n`
        for (const [state, count] of Object.entries(byState)) {
          report += `• ${state}: ${count}\n`
        }
        report += `\n`
      }

      // Top 5 orders
      const top5 = orders.slice(0, 5)
      if (top5.length > 0) {
        report += `**Latest Orders**\n`
        for (const o of top5) {
          const store = storeMap[o.store_id]
          report += `• ${o.display_id ?? o.id.slice(0, 8)} — ${store?.short ?? "?"} — ${formatCents(o.total_cents ?? 0)} (${o.item_count} items)\n`
        }
      }
    }

    report += `\n_Report generated at ${today.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" })}_`

    // Send to DM channel as Priya Sharma
    const { error: msgError } = await supabase.from("chat_messages").insert({
      channel_id: DM_CHANNEL_ID,
      sender_name: SENDER,
      body: report,
      message_type: "text",
    })

    if (msgError) {
      console.error("Failed to send chat message:", msgError)
      return NextResponse.json({ error: msgError.message }, { status: 500 })
    }

    // Update DM channel last_message_at
    await supabase
      .from("chat_dm_channels")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", DM_CHANNEL_ID)

    // Log the automation run
    await supabase.from("sync_log").insert({
      store_id: null,
      type: "daily_sales_report",
      status: "success",
      details: { orders: orderCount, revenue_cents: totalRevenue },
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
    }).then(() => {}) // fire and forget

    return NextResponse.json({
      success: true,
      orders: orderCount,
      revenue: formatCents(totalRevenue),
      message: "Daily sales report sent to Priya Sharma → Lakshay DM",
    })
  } catch (error) {
    console.error("Daily sales report error:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
