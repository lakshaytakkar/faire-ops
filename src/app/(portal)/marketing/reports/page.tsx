"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  BarChart3,
  Save,
  X,
  Loader2,
  FileBarChart,
  Calendar,
  Filter,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import {
  useCampaigns,
  formatCents,
  formatCompact,
  type MetaAdReport,
  type MetaCampaign,
} from "@/lib/use-marketing-data"

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const METRIC_DEFS = [
  { key: "spend_cents", label: "Spend", format: (v: number) => `$${formatCents(v)}`, color: "#6366f1" },
  { key: "impressions", label: "Impressions", format: formatCompact, color: "#06b6d4" },
  { key: "clicks", label: "Clicks", format: formatCompact, color: "#f59e0b" },
  { key: "conversions", label: "Conversions", format: formatCompact, color: "#10b981" },
  { key: "revenue_cents", label: "Revenue", format: (v: number) => `$${formatCents(v)}`, color: "#8b5cf6" },
  { key: "roas", label: "ROAS", format: (v: number) => v.toFixed(2) + "x", color: "#ec4899" },
  { key: "ctr", label: "CTR", format: (v: number) => v.toFixed(2) + "%", color: "#14b8a6" },
  { key: "cpc_cents", label: "CPC", format: (v: number) => `$${formatCents(v)}`, color: "#f97316" },
  { key: "cpm_cents", label: "CPM", format: (v: number) => `$${formatCents(v)}`, color: "#a855f7" },
] as const

type MetricKey = (typeof METRIC_DEFS)[number]["key"]

const PRESETS = [
  { label: "7d", days: 7 },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
] as const

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />
}

function dateDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().split("T")[0]
}

function today(): string {
  return new Date().toISOString().split("T")[0]
}

/* ------------------------------------------------------------------ */
/*  SVG Chart                                                           */
/* ------------------------------------------------------------------ */

function TimeSeriesChart({
  reports,
  selectedMetrics,
  startDate,
  endDate,
}: {
  reports: MetaAdReport[]
  selectedMetrics: Set<MetricKey>
  startDate: string
  endDate: string
}) {
  const activeMetrics = METRIC_DEFS.filter((m) => selectedMetrics.has(m.key))

  const dateMap = useMemo(() => {
    const map = new Map<string, MetaAdReport[]>()
    for (const r of reports) {
      const arr = map.get(r.report_date) ?? []
      arr.push(r)
      map.set(r.report_date, arr)
    }
    return map
  }, [reports])

  const dates = useMemo(() => {
    const all: string[] = []
    const start = new Date(startDate)
    const end = new Date(endDate)
    const cur = new Date(start)
    while (cur <= end) {
      all.push(cur.toISOString().split("T")[0])
      cur.setDate(cur.getDate() + 1)
    }
    return all
  }, [startDate, endDate])

  if (activeMetrics.length === 0 || dates.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
        Select metrics to visualize
      </div>
    )
  }

  // Aggregate per date per metric
  const series = activeMetrics.map((m) => {
    const values = dates.map((d) => {
      const rows = dateMap.get(d) ?? []
      if (m.key === "roas" || m.key === "ctr") {
        if (rows.length === 0) return 0
        return rows.reduce((s, r) => s + (r[m.key as keyof MetaAdReport] as number), 0) / rows.length
      }
      return rows.reduce((s, r) => s + (r[m.key as keyof MetaAdReport] as number), 0)
    })
    return { ...m, values }
  })

  const W = 800
  const H = 200
  const PAD = { top: 10, right: 10, bottom: 20, left: 10 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {series.map((s) => {
        const max = Math.max(...s.values, 1)
        const points = s.values
          .map((v, i) => {
            const x = PAD.left + (i / Math.max(dates.length - 1, 1)) * plotW
            const y = PAD.top + plotH - (v / max) * plotH
            return `${x},${y}`
          })
          .join(" ")
        return (
          <polyline
            key={s.key}
            points={points}
            fill="none"
            stroke={s.color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )
      })}
      {/* X-axis labels (first, mid, last) */}
      {dates.length > 0 && [0, Math.floor(dates.length / 2), dates.length - 1].map((idx) => (
        <text
          key={idx}
          x={PAD.left + (idx / Math.max(dates.length - 1, 1)) * plotW}
          y={H - 2}
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize="9"
        >
          {dates[idx]?.slice(5)}
        </text>
      ))}
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Save Modal                                                          */
/* ------------------------------------------------------------------ */

function SaveModal({
  open,
  onClose,
  config,
}: {
  open: boolean
  onClose: () => void
  config: Record<string, unknown>
}) {
  const [name, setName] = useState("")

  function handleSave() {
    if (!name.trim()) return
    const saved = JSON.parse(localStorage.getItem("faire_saved_reports") ?? "[]")
    const id = crypto.randomUUID()
    saved.push({ id, name: name.trim(), savedAt: new Date().toISOString(), config })
    localStorage.setItem("faire_saved_reports", JSON.stringify(saved))
    setName("")
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card rounded-lg border border-border/80 shadow-lg w-full max-w-sm">
        <div className="px-5 py-3.5 border-b flex items-center justify-between">
          <h2 className="text-[0.9375rem] font-semibold tracking-tight">Save Report</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Report Name
            </label>
            <input
              className="rounded-md border px-3 py-2 text-sm bg-background w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Monthly Performance Report"
              autoFocus
            />
          </div>
        </div>
        <div className="px-5 py-3.5 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            <Save className="size-4" />
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function ReportBuilderPage() {
  const { campaigns, loading: campaignsLoading } = useCampaigns()
  const [reports, setReports] = useState<MetaAdReport[]>([])
  const [loading, setLoading] = useState(true)

  const [preset, setPreset] = useState(30)
  const [startDate, setStartDate] = useState(dateDaysAgo(30))
  const [endDate, setEndDate] = useState(today())
  const [entityFilter, setEntityFilter] = useState("all")
  const [selectedMetrics, setSelectedMetrics] = useState<Set<MetricKey>>(
    new Set(["spend_cents", "impressions", "clicks", "conversions"])
  )
  const [showSave, setShowSave] = useState(false)

  const fetchReports = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from("meta_ad_reports")
      .select("*")
      .gte("report_date", startDate)
      .lte("report_date", endDate)
      .order("report_date", { ascending: true })

    if (entityFilter !== "all") {
      query = query.eq("entity_id", entityFilter)
    }

    const { data } = await query
    setReports((data ?? []) as MetaAdReport[])
    setLoading(false)
  }, [startDate, endDate, entityFilter])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  function handlePreset(days: number) {
    setPreset(days)
    setStartDate(dateDaysAgo(days))
    setEndDate(today())
  }

  function toggleMetric(key: MetricKey) {
    setSelectedMetrics((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Summaries
  const summary = useMemo(() => {
    const totalSpend = reports.reduce((s, r) => s + r.spend_cents, 0)
    const totalImpressions = reports.reduce((s, r) => s + r.impressions, 0)
    const totalClicks = reports.reduce((s, r) => s + r.clicks, 0)
    const totalRevenue = reports.reduce((s, r) => s + r.revenue_cents, 0)
    const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0
    return { totalSpend, totalImpressions, totalClicks, avgRoas }
  }, [reports])

  // Breakdown by entity
  const breakdown = useMemo(() => {
    const map = new Map<string, { entity_type: string; entity_id: string; spend_cents: number; impressions: number; clicks: number; conversions: number; revenue_cents: number; roas: number; ctr: number; cpc_cents: number; cpm_cents: number; count: number }>()
    for (const r of reports) {
      const key = `${r.entity_type}:${r.entity_id}`
      const existing = map.get(key) ?? { entity_type: r.entity_type, entity_id: r.entity_id, spend_cents: 0, impressions: 0, clicks: 0, conversions: 0, revenue_cents: 0, roas: 0, ctr: 0, cpc_cents: 0, cpm_cents: 0, count: 0 }
      existing.spend_cents += r.spend_cents
      existing.impressions += r.impressions
      existing.clicks += r.clicks
      existing.conversions += r.conversions
      existing.revenue_cents += r.revenue_cents
      existing.count++
      map.set(key, existing)
    }
    // Compute averages
    for (const v of map.values()) {
      v.roas = v.spend_cents > 0 ? v.revenue_cents / v.spend_cents : 0
      v.ctr = v.impressions > 0 ? (v.clicks / v.impressions) * 100 : 0
      v.cpc_cents = v.clicks > 0 ? v.spend_cents / v.clicks : 0
      v.cpm_cents = v.impressions > 0 ? (v.spend_cents / v.impressions) * 1000 : 0
    }
    return Array.from(map.values()).sort((a, b) => b.spend_cents - a.spend_cents)
  }, [reports])

  const campaignNameMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of campaigns) m.set(c.id, c.name)
    return m
  }, [campaigns])

  const reportConfig = {
    startDate,
    endDate,
    entityFilter,
    selectedMetrics: Array.from(selectedMetrics),
  }

  // Saved reports list
  const [savedReports, setSavedReports] = useState<{ id: string; name: string; savedAt: string }[]>([])
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("faire_saved_reports") ?? "[]")
    setSavedReports(saved)
  }, [showSave])

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ad Reports</h1>
        <div className="flex items-center gap-2">
          {savedReports.length > 0 && (
            <div className="flex items-center gap-1 mr-2">
              {savedReports.slice(0, 3).map((sr) => (
                <Link key={sr.id} href={`/marketing/reports/${sr.id}`}>
                  <Button variant="ghost" size="sm">
                    <FileBarChart className="size-3.5" />
                    {sr.name}
                  </Button>
                </Link>
              ))}
            </div>
          )}
          <Button onClick={() => setShowSave(true)}>
            <Save className="size-4" />
            Save Report
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight flex items-center gap-2">
          <Filter className="size-4" />
          Report Controls
        </div>
        <div className="p-5 space-y-4">
          {/* Date range */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="size-3" />
              Date Range
            </label>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.days}
                  onClick={() => handlePreset(p.days)}
                  className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                    preset === p.days
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <div className="w-px h-5 bg-border mx-1" />
              <input
                type="date"
                className="rounded-md border px-3 py-1.5 text-sm bg-background"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPreset(0) }}
              />
              <span className="text-xs text-muted-foreground">to</span>
              <input
                type="date"
                className="rounded-md border px-3 py-1.5 text-sm bg-background"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPreset(0) }}
              />
            </div>
          </div>

          {/* Entity filter */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Entity
            </label>
            <select
              className="rounded-md border px-3 py-2 text-sm bg-background w-full max-w-xs mt-1"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
            >
              <option value="all">All Campaigns</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Metrics */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Metrics
            </label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {METRIC_DEFS.map((m) => (
                <label
                  key={m.key}
                  className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full cursor-pointer transition-colors border ${
                    selectedMetrics.has(m.key)
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={selectedMetrics.has(m.key)}
                    onChange={() => toggleMetric(m.key)}
                  />
                  <span className="size-2 rounded-full" style={{ background: m.color }} />
                  {m.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border/80 bg-card shadow-sm p-5 space-y-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-7 w-28" />
              </div>
            ))}
          </div>
          <Skeleton className="h-48 w-full" />
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-12 flex flex-col items-center justify-center text-center">
          <div className="flex items-center justify-center size-14 rounded-full bg-muted mb-4">
            <FileBarChart className="size-7 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">No report data</h3>
          <p className="text-xs text-muted-foreground max-w-xs">
            No ad reports found for the selected date range and filters. Try expanding the date range or changing the entity filter.
          </p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {selectedMetrics.has("spend_cents") && (
              <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Spend</p>
                <p className="text-xl font-bold text-foreground mt-1">${formatCents(summary.totalSpend)}</p>
              </div>
            )}
            {selectedMetrics.has("impressions") && (
              <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Impressions</p>
                <p className="text-xl font-bold text-foreground mt-1">{formatCompact(summary.totalImpressions)}</p>
              </div>
            )}
            {selectedMetrics.has("clicks") && (
              <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Clicks</p>
                <p className="text-xl font-bold text-foreground mt-1">{formatCompact(summary.totalClicks)}</p>
              </div>
            )}
            {(selectedMetrics.has("roas") || selectedMetrics.has("revenue_cents")) && (
              <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avg ROAS</p>
                <p className="text-xl font-bold text-foreground mt-1">{summary.avgRoas.toFixed(2)}x</p>
              </div>
            )}
          </div>

          {/* Chart */}
          <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
              Performance Over Time
            </div>
            <div className="p-5">
              {/* Legend */}
              <div className="flex flex-wrap gap-3 mb-3">
                {METRIC_DEFS.filter((m) => selectedMetrics.has(m.key)).map((m) => (
                  <span key={m.key} className="flex items-center gap-1 text-[0.6875rem] text-muted-foreground">
                    <span className="size-2 rounded-full" style={{ background: m.color }} />
                    {m.label}
                  </span>
                ))}
              </div>
              <TimeSeriesChart
                reports={reports}
                selectedMetrics={selectedMetrics}
                startDate={startDate}
                endDate={endDate}
              />
            </div>
          </div>

          {/* Breakdown table */}
          {breakdown.length > 0 && (
            <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
                Entity Breakdown
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/30">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Entity</th>
                      {METRIC_DEFS.filter((m) => selectedMetrics.has(m.key)).map((m) => (
                        <th key={m.key} className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {m.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {breakdown.map((row) => (
                      <tr key={`${row.entity_type}:${row.entity_id}`} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="px-4 py-2.5 font-medium text-foreground">
                          <span className="text-[0.6875rem] text-muted-foreground mr-1.5">{row.entity_type}</span>
                          {campaignNameMap.get(row.entity_id) ?? row.entity_id.slice(0, 8)}
                        </td>
                        {METRIC_DEFS.filter((m) => selectedMetrics.has(m.key)).map((m) => (
                          <td key={m.key} className="text-right px-4 py-2.5 tabular-nums text-muted-foreground">
                            {m.format(row[m.key as keyof typeof row] as number)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <SaveModal
        open={showSave}
        onClose={() => setShowSave(false)}
        config={reportConfig}
      />
    </div>
  )
}
