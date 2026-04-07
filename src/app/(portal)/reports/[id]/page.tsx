"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, FileBarChart, Loader2, RefreshCw, Download, Share2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

/* ---------- types ---------- */
interface ReportContent {
  orders: {
    total: number
    new: number
    processing: number
    delivered: number
    canceled: number
    in_transit?: number
    revenue_cents: number
  }
  orders_by_store: { store_name: string; count: number; revenue: number }[]
  orders_by_state: { state: string; count: number }[]
  orders_by_source: { source: string; count: number }[]
  top_retailers: { name: string; orders: number; revenue: number }[]
  products: { total: number; published: number }
  financial: { revenue: number; payout_estimate: number; commission_estimate: number }
  period: { start: string; end: string; days: number }
  retailers?: { total_active: number }
}

interface Report {
  id: string
  title: string
  report_type: string
  period_start: string
  period_end: string
  content: ReportContent
  summary: string | null
  generated_by: string
  status: string
  store_id: string | null
  created_at: string
}

/* ---------- helpers ---------- */
const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  daily: { label: "Daily", cls: "bg-blue-50 text-blue-700" },
  weekly: { label: "Weekly", cls: "bg-purple-50 text-purple-700" },
  monthly: { label: "Monthly", cls: "bg-emerald-50 text-emerald-700" },
  custom: { label: "Custom", cls: "bg-amber-50 text-amber-700" },
}

const STATE_COLORS: Record<string, string> = {
  NEW: "bg-amber-500",
  PROCESSING: "bg-blue-500",
  PRE_TRANSIT: "bg-sky-400",
  IN_TRANSIT: "bg-emerald-500",
  DELIVERED: "bg-slate-400",
  CANCELED: "bg-red-500",
}

function cents(v: number) {
  return "$" + (v / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function pct(part: number, whole: number) {
  if (!whole) return "0%"
  return ((part / whole) * 100).toFixed(1) + "%"
}

function formatDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

function formatPeriod(start: string, end: string) {
  const s = new Date(start).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  const e = new Date(end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  return start === end ? e : `${s} - ${e}`
}

/* ---------- bar component ---------- */
function Bar({ value, max, color, label, count }: { value: number; max: number; color: string; label: string; count: number }) {
  const w = max > 0 ? Math.max((value / max) * 100, 2) : 2
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-xs font-medium w-28 shrink-0 text-right">{label}</span>
      <div className="flex-1 h-5 bg-muted/40 rounded overflow-hidden">
        <div className={`h-full rounded ${color} transition-all`} style={{ width: `${w}%` }} />
      </div>
      <span className="text-xs font-semibold w-10 text-right">{count}</span>
    </div>
  )
}

/* ---------- page ---------- */
export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)

  const fetchReport = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("id", id)
      .single()
    if (!error && data) setReport(data as Report)
    setLoading(false)
  }, [id])

  useEffect(() => { fetchReport() }, [fetchReport])

  async function regenerateSummary() {
    if (!report) return
    setRegenerating(true)
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_type: report.report_type, store_id: report.store_id }),
      })
      if (res.ok) {
        // Just regenerate the summary for existing report via Gemini
        const { generateText } = await import("@/lib/gemini")
        const c = report.content
        const newSummary = await generateText(
          `Write a brief executive summary (3-4 sentences) for this ${report.report_type} business report:
Orders: ${c.orders.total}, Revenue: $${(c.orders.revenue_cents / 100).toFixed(0)}, Delivered: ${c.orders.delivered}, New: ${c.orders.new}
Period: ${c.period.start} to ${c.period.end}
Keep it professional, highlight key metrics and any concerns. No markdown formatting.`
        )
        await supabase.from("reports").update({ summary: newSummary }).eq("id", report.id)
        setReport({ ...report, summary: newSummary })
      }
    } catch (e) {
      console.error("Regenerate error:", e)
    } finally {
      setRegenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-muted-foreground">
        <Loader2 className="size-5 animate-spin mr-2" /> Loading report...
      </div>
    )
  }

  if (!report) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>Report not found.</p>
        <Link href="/reports" className="text-primary text-sm mt-2 inline-block">Back to Reports</Link>
      </div>
    )
  }

  const c = report.content
  const avgOrderValue = c.orders.total > 0 ? c.orders.revenue_cents / c.orders.total : 0
  const deliveredPct = c.orders.total > 0 ? ((c.orders.delivered / c.orders.total) * 100).toFixed(1) : "0"
  const maxStateCount = Math.max(...c.orders_by_state.map((s) => s.count), 1)
  const maxSourceCount = Math.max(...c.orders_by_source.map((s) => s.count), 1)
  const totalStoreRevenue = c.orders_by_store.reduce((s, x) => s + x.revenue, 0)
  const typeBadge = TYPE_BADGE[report.report_type] ?? TYPE_BADGE.custom

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div>
        <Link href="/reports" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="size-3.5" /> Back to Reports
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
              {report.title}
              <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold ${typeBadge.cls}`}>
                {typeBadge.label}
              </span>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {formatPeriod(report.period_start, report.period_end)} &middot; Generated {formatDate(report.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button disabled className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground opacity-50 cursor-not-allowed">
              <Download className="size-3.5" /> Download
            </button>
            <button disabled className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground opacity-50 cursor-not-allowed">
              <Share2 className="size-3.5" /> Share
            </button>
          </div>
        </div>
      </div>

      {/* Section 1: Executive Summary */}
      {report.summary && (
        <div className="rounded-md border bg-primary/5 p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold">Executive Summary</h2>
            <button
              onClick={regenerateSummary}
              disabled={regenerating}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className={`size-3 ${regenerating ? "animate-spin" : ""}`} />
              {regenerating ? "Regenerating..." : "Regenerate"}
            </button>
          </div>
          <p className="text-sm leading-relaxed text-foreground/85">{report.summary}</p>
        </div>
      )}

      {/* Section 2: Key Metrics */}
      <div>
        <h2 className="text-sm font-semibold mb-3">Key Metrics</h2>
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-md border bg-card px-4 py-3 text-center">
            <div className="text-2xl font-bold">{c.orders.total}</div>
            <div className="text-xs text-muted-foreground font-medium mt-0.5">Total Orders</div>
          </div>
          <div className="rounded-md border bg-card px-4 py-3 text-center">
            <div className="text-2xl font-bold">{cents(c.orders.revenue_cents)}</div>
            <div className="text-xs text-muted-foreground font-medium mt-0.5">Revenue</div>
          </div>
          <div className="rounded-md border bg-card px-4 py-3 text-center">
            <div className="text-2xl font-bold">{cents(avgOrderValue)}</div>
            <div className="text-xs text-muted-foreground font-medium mt-0.5">Avg Order Value</div>
          </div>
          <div className="rounded-md border bg-card px-4 py-3 text-center">
            <div className="text-2xl font-bold">{deliveredPct}%</div>
            <div className="text-xs text-muted-foreground font-medium mt-0.5">Delivered</div>
          </div>
        </div>
      </div>

      {/* Section 3: Orders by Store */}
      {c.orders_by_store.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3">Orders by Store</h2>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-2 font-medium text-xs text-muted-foreground">Store</th>
                  <th className="text-right px-4 py-2 font-medium text-xs text-muted-foreground">Orders</th>
                  <th className="text-right px-4 py-2 font-medium text-xs text-muted-foreground">Revenue</th>
                  <th className="text-right px-4 py-2 font-medium text-xs text-muted-foreground">Share</th>
                </tr>
              </thead>
              <tbody>
                {c.orders_by_store.map((store) => (
                  <tr key={store.store_name} className="border-b last:border-0">
                    <td className="px-4 py-2.5 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary/60 shrink-0" />
                      <span className="font-medium">{store.store_name}</span>
                    </td>
                    <td className="text-right px-4 py-2.5 tabular-nums">{store.count}</td>
                    <td className="text-right px-4 py-2.5 tabular-nums">{cents(store.revenue)}</td>
                    <td className="text-right px-4 py-2.5 text-muted-foreground tabular-nums">{pct(store.revenue, totalStoreRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 4: Orders by Status */}
      {c.orders_by_state.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3">Orders by Status</h2>
          <div className="rounded-md border bg-card p-4">
            {c.orders_by_state.map((item) => (
              <Bar
                key={item.state}
                label={item.state.replace(/_/g, " ")}
                value={item.count}
                max={maxStateCount}
                color={STATE_COLORS[item.state] ?? "bg-slate-400"}
                count={item.count}
              />
            ))}
          </div>
        </div>
      )}

      {/* Section 5: Revenue by Source */}
      {c.orders_by_source.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3">Orders by Source</h2>
          <div className="rounded-md border bg-card p-4">
            {c.orders_by_source.map((item) => (
              <Bar
                key={item.source}
                label={item.source === "MARKETPLACE" ? "Marketplace" : item.source === "FAIRE_DIRECT" ? "Faire Direct" : item.source}
                value={item.count}
                max={maxSourceCount}
                color={item.source === "MARKETPLACE" ? "bg-blue-500" : "bg-purple-500"}
                count={item.count}
              />
            ))}
          </div>
        </div>
      )}

      {/* Section 6: Top Retailers */}
      {c.top_retailers.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3">Top Retailers</h2>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-2 font-medium text-xs text-muted-foreground">#</th>
                  <th className="text-left px-4 py-2 font-medium text-xs text-muted-foreground">Retailer</th>
                  <th className="text-right px-4 py-2 font-medium text-xs text-muted-foreground">Orders</th>
                  <th className="text-right px-4 py-2 font-medium text-xs text-muted-foreground">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {c.top_retailers.map((r, i) => (
                  <tr key={r.name + i} className="border-b last:border-0">
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium">{r.name}</td>
                    <td className="text-right px-4 py-2.5 tabular-nums">{r.orders}</td>
                    <td className="text-right px-4 py-2.5 tabular-nums">{cents(r.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 7: Financial Summary */}
      <div>
        <h2 className="text-sm font-semibold mb-3">Financial Summary</h2>
        <div className="rounded-md border bg-card divide-y">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm">Total Revenue</span>
            <span className="text-sm font-semibold">{cents(c.financial.revenue)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">Estimated Payout (85%)</span>
            <span className="text-sm font-medium text-emerald-600">{cents(c.financial.payout_estimate)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">Estimated Commission (15%)</span>
            <span className="text-sm font-medium text-amber-600">{cents(c.financial.commission_estimate)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">Products Listed</span>
            <span className="text-sm font-medium">{c.products.total} ({c.products.published} published)</span>
          </div>
          {c.retailers?.total_active !== undefined && (
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-muted-foreground">Active Retailers</span>
              <span className="text-sm font-medium">{c.retailers.total_active}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
