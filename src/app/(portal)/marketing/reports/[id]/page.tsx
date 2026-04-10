"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  FileBarChart,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabaseB2B } from "@/lib/supabase"
import {
  useCampaigns,
  formatCents,
  formatCompact,
  type MetaAdReport,
} from "@/lib/use-marketing-data"

/* ------------------------------------------------------------------ */
/*  Constants (shared with reports builder)                             */
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

interface SavedReport {
  id: string
  name: string
  savedAt: string
  config: {
    startDate: string
    endDate: string
    entityFilter: string
    selectedMetrics: MetricKey[]
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />
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
        No metrics to display
      </div>
    )
  }

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
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function SavedReportPage() {
  const params = useParams<{ id: string }>()
  const reportId = params.id

  const [savedReport, setSavedReport] = useState<SavedReport | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [reports, setReports] = useState<MetaAdReport[]>([])
  const [loading, setLoading] = useState(true)
  const { campaigns } = useCampaigns()

  // Load saved report config from localStorage
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("faire_saved_reports") ?? "[]") as SavedReport[]
    const found = saved.find((s) => s.id === reportId)
    if (found) {
      setSavedReport(found)
    } else {
      setNotFound(true)
      setLoading(false)
    }
  }, [reportId])

  // Fetch data based on saved config
  const fetchReports = useCallback(async () => {
    if (!savedReport) return
    setLoading(true)
    const { config } = savedReport
    let query = supabaseB2B
      .from("meta_ad_reports")
      .select("*")
      .gte("report_date", config.startDate)
      .lte("report_date", config.endDate)
      .order("report_date", { ascending: true })

    if (config.entityFilter !== "all") {
      query = query.eq("entity_id", config.entityFilter)
    }

    const { data } = await query
    setReports((data ?? []) as MetaAdReport[])
    setLoading(false)
  }, [savedReport])

  useEffect(() => {
    if (savedReport) fetchReports()
  }, [savedReport, fetchReports])

  const selectedMetrics = useMemo(
    () => new Set<MetricKey>(savedReport?.config.selectedMetrics ?? []),
    [savedReport]
  )

  const summary = useMemo(() => {
    const totalSpend = reports.reduce((s, r) => s + r.spend_cents, 0)
    const totalImpressions = reports.reduce((s, r) => s + r.impressions, 0)
    const totalClicks = reports.reduce((s, r) => s + r.clicks, 0)
    const totalRevenue = reports.reduce((s, r) => s + r.revenue_cents, 0)
    const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0
    return { totalSpend, totalImpressions, totalClicks, avgRoas }
  }, [reports])

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

  // 404 state
  if (notFound) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <div className="flex items-center gap-3">
          <Link href="/marketing/reports" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="text-xl font-bold tracking-tight">Report Not Found</h1>
        </div>
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-12 flex flex-col items-center justify-center text-center">
          <div className="flex items-center justify-center size-14 rounded-full bg-muted mb-4">
            <AlertCircle className="size-7 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">Report not found</h3>
          <p className="text-xs text-muted-foreground max-w-xs mb-4">
            This saved report could not be found. It may have been deleted or the link is invalid.
          </p>
          <Link href="/marketing/reports">
            <Button variant="outline">
              <ArrowLeft className="size-4" />
              Back to Reports
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/marketing/reports" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="size-5 text-primary" />
              <h1 className="text-xl font-bold tracking-tight">{savedReport?.name ?? "Loading..."}</h1>
            </div>
            {savedReport && (
              <p className="text-xs text-muted-foreground mt-0.5 ml-7">
                Saved {new Date(savedReport.savedAt).toLocaleDateString()} | {savedReport.config.startDate} to {savedReport.config.endDate}
              </p>
            )}
          </div>
        </div>
        <Link href="/marketing/reports">
          <Button variant="outline">
            <ArrowLeft className="size-4" />
            Report Builder
          </Button>
        </Link>
      </div>

      {/* Config summary */}
      {savedReport && (
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="size-3" />
              {savedReport.config.startDate} to {savedReport.config.endDate}
            </span>
            <span className="w-px h-4 bg-border" />
            <span>
              Entity: {savedReport.config.entityFilter === "all"
                ? "All Campaigns"
                : campaignNameMap.get(savedReport.config.entityFilter) ?? savedReport.config.entityFilter.slice(0, 8)}
            </span>
            <span className="w-px h-4 bg-border" />
            <span>
              Metrics: {savedReport.config.selectedMetrics
                .map((k) => METRIC_DEFS.find((m) => m.key === k)?.label ?? k)
                .join(", ")}
            </span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            No ad reports found for this saved configuration. The underlying data may have changed since this report was saved.
          </p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                startDate={savedReport!.config.startDate}
                endDate={savedReport!.config.endDate}
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
    </div>
  )
}
