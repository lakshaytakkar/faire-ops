import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendEmail, isResendConfigured } from "@/lib/resend"
import { supabaseB2B } from "@/lib/supabase"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  )
}

export const maxDuration = 60

const DM_CHANNEL_ID = "8504dd9e-273f-4184-9ad8-a90b4859c582"
const SENDER = "Priya Sharma"
const PRIYA_AI_ID = "723844b5-6f5a-4200-890f-24b0b94b25dd"
const LAKSHAY_EMAIL = "lakshaytakkar01@gmail.com"

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
    const { data: todayOrders } = await supabaseB2B
      .from("faire_orders")
      .select("id, display_id, store_id, state, total_cents, item_count, faire_created_at")
      .gte("faire_created_at", startOfDay)
      .lte("faire_created_at", endOfDay)
      .order("faire_created_at", { ascending: false })

    // Fetch all stores for name lookup
    const { data: stores } = await supabaseB2B
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

    // Also post to Priya's AI conversation so it shows in ai-team page
    let convId: string | null = null
    const { data: existingConv } = await supabase
      .from("ai_conversations")
      .select("id")
      .eq("ai_employee_id", PRIYA_AI_ID)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single()

    if (existingConv) {
      convId = existingConv.id
      await supabase.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId)
    } else {
      const { data: newConv } = await supabase
        .from("ai_conversations")
        .insert({ ai_employee_id: PRIYA_AI_ID, title: "Daily Sales Reports" })
        .select("id")
        .single()
      convId = newConv?.id ?? null
    }

    if (convId) {
      await supabase.from("ai_messages").insert({
        conversation_id: convId,
        role: "assistant",
        content: report,
      })
    }

    // Send email via Resend
    let emailSent = false
    if (isResendConfigured()) {
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 24px; color: white; margin-bottom: 24px;">
            <h1 style="margin: 0 0 4px; font-size: 20px;">📊 Daily Sales Report</h1>
            <p style="margin: 0; opacity: 0.9; font-size: 14px;">${formatDate(today)}</p>
          </div>
          ${orderCount === 0 ? '<p style="color: #666; font-size: 14px;">No new orders today.</p>' : `
          <div style="display: flex; gap: 12px; margin-bottom: 24px;">
            <div style="flex: 1; background: #f8fafc; border-radius: 8px; padding: 16px; text-align: center;">
              <div style="font-size: 24px; font-weight: 700; color: #1e293b;">${orderCount}</div>
              <div style="font-size: 12px; color: #64748b; text-transform: uppercase;">Orders</div>
            </div>
            <div style="flex: 1; background: #f8fafc; border-radius: 8px; padding: 16px; text-align: center;">
              <div style="font-size: 24px; font-weight: 700; color: #059669;">${formatCents(totalRevenue)}</div>
              <div style="font-size: 12px; color: #64748b; text-transform: uppercase;">Revenue</div>
            </div>
            <div style="flex: 1; background: #f8fafc; border-radius: 8px; padding: 16px; text-align: center;">
              <div style="font-size: 24px; font-weight: 700; color: #1e293b;">${totalItems}</div>
              <div style="font-size: 12px; color: #64748b; text-transform: uppercase;">Items</div>
            </div>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="border-bottom: 2px solid #e2e8f0;">
                <th style="text-align: left; padding: 8px 0; color: #64748b; font-size: 12px; text-transform: uppercase;">Store</th>
                <th style="text-align: right; padding: 8px 0; color: #64748b; font-size: 12px; text-transform: uppercase;">Orders</th>
                <th style="text-align: right; padding: 8px 0; color: #64748b; font-size: 12px; text-transform: uppercase;">Revenue</th>
              </tr>
            </thead>
            <tbody>
              ${Object.values(byStore).sort((a, b) => b.revenue - a.revenue).map(s =>
                `<tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px 0; font-weight: 500;">${s.name}</td>
                  <td style="padding: 10px 0; text-align: right;">${s.count}</td>
                  <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #059669;">${formatCents(s.revenue)}</td>
                </tr>`
              ).join("")}
            </tbody>
          </table>
          `}
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
            Sent by Priya Sharma · Faire Ops Automation
          </div>
        </div>
      `
      const emailResult = await sendEmail({
        to: LAKSHAY_EMAIL,
        toName: "Lakshay",
        subject: `📊 Daily Sales: ${orderCount} orders · ${formatCents(totalRevenue)} — ${formatDate(today)}`,
        html: emailHtml,
      })
      emailSent = emailResult.success
    }

    // Log the automation run
    await supabaseB2B.from("sync_log").insert({
      store_id: null,
      type: "daily_sales_report",
      status: "success",
      details: { orders: orderCount, revenue_cents: totalRevenue, email_sent: emailSent },
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
    }).then(() => {})

    return NextResponse.json({
      success: true,
      orders: orderCount,
      revenue: formatCents(totalRevenue),
      emailSent,
      message: "Daily sales report sent to chat + email",
    })
  } catch (error) {
    console.error("Daily sales report error:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
