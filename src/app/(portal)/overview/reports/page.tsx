"use client"

import { useState, useEffect, useCallback, useMemo, Suspense } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FileText, Plus, X, Sparkles } from "lucide-react"
import { supabaseB2B } from "@/lib/supabase"
import { useBrandFilter } from "@/lib/brand-filter-context"
import { useActiveSpace } from "@/lib/use-active-space"

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

type FilterKey = "all" | "daily" | "weekly" | "monthly" | "marketing" | "research" | "custom"

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "marketing", label: "Marketing" },
  { key: "research", label: "Research" },
  { key: "custom", label: "Custom" },
]

const TYPE_ICON_COLORS: Record<string, { bg: string; fg: string }> = {
  daily: { bg: "bg-blue-50", fg: "text-blue-600" },
  weekly: { bg: "bg-purple-50", fg: "text-purple-600" },
  monthly: { bg: "bg-emerald-50", fg: "text-emerald-600" },
  marketing: { bg: "bg-pink-50", fg: "text-pink-600" },
  research: { bg: "bg-indigo-50", fg: "text-indigo-600" },
  custom: { bg: "bg-amber-50", fg: "text-amber-600" },
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-amber-50 text-amber-700" },
  published: { label: "Published", cls: "bg-emerald-50 text-emerald-700" },
  archived: { label: "Archived", cls: "bg-muted text-muted-foreground" },
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ReportRow {
  id: string
  title: string | null
  report_type: string | null
  period_start: string | null
  period_end: string | null
  summary: string | null
  generated_by: string | null
  status: string | null
  store_id: string | null
  created_at: string | null
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(d: string | null): string {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatPeriod(start: string | null, end: string | null): string {
  if (!start && !end) return "—"
  if (start && end && start !== end) {
    const s = new Date(start).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    const e = new Date(end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    return `${s} - ${e}`
  }
  return formatDate(end ?? start)
}

function startOfMonthIso(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function DashboardReportsPage() {
  return (
    <Suspense fallback={<div className="max-w-[1440px] mx-auto w-full"><div className="h-8 w-40 rounded bg-muted animate-pulse" /></div>}>
      <DashboardReportsPageInner />
    </Suspense>
  )
}

function DashboardReportsPageInner() {
  const router = useRouter()
  const { activeBrand } = useBrandFilter()
  const { slug: activeSlug } = useActiveSpace()
  const researchHref =
    activeSlug === "b2b-ecommerce"
      ? "/workspace/research/reports"
      : `/workspace/research/reports?space=${activeSlug}`

  const [reports, setReports] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState<number>(0)
  const [monthCount, setMonthCount] = useState<number>(0)
  const [latestDate, setLatestDate] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all")
  const [detail, setDetail] = useState<ReportRow | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)

    const brandId = activeBrand !== "all" ? activeBrand : null
    const monthStart = startOfMonthIso()

    const listBase = supabaseB2B
      .from("reports")
      .select(
        "id, title, report_type, period_start, period_end, summary, generated_by, status, store_id, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(200)
    const listQuery = brandId ? listBase.eq("store_id", brandId) : listBase

    const totalBase = supabaseB2B.from("reports").select("*", { count: "exact", head: true })
    const totalQuery = brandId ? totalBase.eq("store_id", brandId) : totalBase

    const monthBase = supabaseB2B
      .from("reports")
      .select("*", { count: "exact", head: true })
      .gte("created_at", monthStart)
    const monthQuery = brandId ? monthBase.eq("store_id", brandId) : monthBase

    const latestBase = supabaseB2B
      .from("reports")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
    const latestQuery = brandId ? latestBase.eq("store_id", brandId) : latestBase

    const [listRes, totalRes, monthRes, latestRes] = await Promise.all([
      listQuery,
      totalQuery,
      monthQuery,
      latestQuery,
    ])

    const rows = (listRes.data ?? []) as ReportRow[]
    setReports(
      rows.map((r) => ({
        id: r.id,
        title: r.title ?? null,
        report_type: r.report_type ?? null,
        period_start: r.period_start ?? null,
        period_end: r.period_end ?? null,
        summary: r.summary ?? null,
        generated_by: r.generated_by ?? null,
        status: r.status ?? null,
        store_id: r.store_id ?? null,
        created_at: r.created_at ?? null,
      }))
    )
    setTotalCount(totalRes.count ?? 0)
    setMonthCount(monthRes.count ?? 0)
    const latestRow = (latestRes.data ?? [])[0] as { created_at: string | null } | undefined
    setLatestDate(latestRow?.created_at ?? null)
    setLoading(false)
  }, [activeBrand])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const filteredReports = useMemo(() => {
    if (activeFilter === "all") return reports
    return reports.filter((r) => (r.report_type ?? "").toLowerCase() === activeFilter)
  }, [reports, activeFilter])

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Reports</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Executive reports submitted by employees and AI
          </p>
        </div>
        <button
          onClick={() => router.push("/reports/all")}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-4" />
          Generate Report
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total Reports</p>
            <p className="text-2xl font-bold font-heading mt-2 text-foreground">
              {loading ? "—" : totalCount}
            </p>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </div>
          <div className="h-9 w-9 rounded-md flex items-center justify-center bg-primary/10">
            <FileText className="h-4 w-4 text-primary" />
          </div>
        </div>

        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">This Month</p>
            <p className="text-2xl font-bold font-heading mt-2 text-foreground">
              {loading ? "—" : monthCount}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="h-9 w-9 rounded-md flex items-center justify-center bg-emerald-500/10">
            <Sparkles className="h-4 w-4 text-emerald-600" />
          </div>
        </div>

        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Latest Report</p>
            <p className="text-2xl font-bold font-heading mt-2 text-foreground">
              {loading ? "—" : formatDate(latestDate)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Most recent submission</p>
          </div>
          <div className="h-9 w-9 rounded-md flex items-center justify-center bg-amber-500/10">
            <FileText className="h-4 w-4 text-amber-600" />
          </div>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const active = activeFilter === f.key
          return (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {/* Reports list */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden divide-y">
        {loading ? (
          <>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="h-9 w-9 rounded-md bg-muted animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-1/3 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
                </div>
                <div className="h-5 w-16 bg-muted animate-pulse rounded-full" />
                <div className="h-3 w-20 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </>
        ) : filteredReports.length === 0 ? (
          <div className="px-5 py-16 flex flex-col items-center justify-center text-center">
            <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center mb-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No reports yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Reports will appear here when generated
            </p>
          </div>
        ) : (
          filteredReports.map((r) => {
            const typeKey = (r.report_type ?? "custom").toLowerCase()
            const colors = TYPE_ICON_COLORS[typeKey] ?? TYPE_ICON_COLORS.custom
            const status = STATUS_BADGE[(r.status ?? "draft").toLowerCase()] ?? STATUS_BADGE.draft
            const typeLabel = r.report_type
              ? r.report_type.charAt(0).toUpperCase() + r.report_type.slice(1)
              : "Custom"
            return (
              <button
                key={r.id}
                onClick={() => setDetail(r)}
                className="flex items-center gap-4 px-5 py-4 w-full text-left hover:bg-muted/20 transition-colors"
              >
                <div
                  className={`h-9 w-9 rounded-md flex items-center justify-center shrink-0 ${colors.bg}`}
                >
                  <FileText className={`h-4 w-4 ${colors.fg}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {r.title ?? "Untitled report"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {typeLabel} &middot; {formatPeriod(r.period_start, r.period_end)} &middot; by{" "}
                    {r.generated_by ?? "Unknown"}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${status.cls}`}
                >
                  {status.label}
                </span>
                <span className="text-xs text-muted-foreground w-24 text-right shrink-0">
                  {formatDate(r.created_at)}
                </span>
              </button>
            )
          })
        )}
      </div>

      {/* Footer links */}
      <div className="flex items-center justify-center pt-2 text-xs text-muted-foreground">
        <span>Open in:&nbsp;</span>
        <Link href="/reports/day-close" className="text-primary hover:underline font-medium">
          Day Close
        </Link>
        <span className="px-1.5">&middot;</span>
        <Link href="/marketing/reports" className="text-primary hover:underline font-medium">
          Marketing
        </Link>
        <span className="px-1.5">&middot;</span>
        <Link
          href={researchHref}
          className="text-primary hover:underline font-medium"
        >
          Research
        </Link>
      </div>

      {/* Detail modal */}
      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="bg-card rounded-lg border border-border/80 shadow-lg w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b px-5 py-4">
              <div className="min-w-0 flex-1 pr-4">
                <h2 className="text-base font-bold font-heading text-foreground truncate">
                  {detail.title ?? "Untitled report"}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {(detail.report_type ?? "custom").charAt(0).toUpperCase() +
                    (detail.report_type ?? "custom").slice(1)}{" "}
                  &middot; {formatPeriod(detail.period_start, detail.period_end)} &middot; by{" "}
                  {detail.generated_by ?? "Unknown"}
                </p>
              </div>
              <button
                onClick={() => setDetail(null)}
                className="text-muted-foreground hover:text-foreground shrink-0"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="px-5 py-4 overflow-y-auto flex-1">
              {detail.summary ? (
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {detail.summary}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No summary available for this report.
                </p>
              )}
            </div>
            <div className="border-t px-5 py-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Created {formatDate(detail.created_at)}
              </span>
              <button
                onClick={() => router.push(`/reports/${detail.id}`)}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Open full report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
