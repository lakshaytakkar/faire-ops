"use client"

import { useState, useEffect, useCallback, Fragment } from "react"
import {
  ScrollText,
  Loader2,
  CheckCircle2,
  XCircle,
  Activity,
  AlertTriangle,
  Timer,
  ChevronDown,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  Search,
  RefreshCw,
  Clock,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AutomationRun {
  id: string
  automation_id: string
  status: string
  started_at: string
  completed_at: string | null
  duration_ms: number | null
  result: Record<string, unknown> | null
  error_message: string | null
  triggered_by: string
  automations?: { name: string } | null
}

const PAGE_SIZE = 25
const STATUS_FILTERS = ["all", "success", "failed", "running"] as const
type StatusFilter = (typeof STATUS_FILTERS)[number]

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return "-"
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.round((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}

function timeAgo(iso: string | null): string {
  if (!iso) return "-"
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatDate(iso: string | null): string {
  if (!iso) return "-"
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  })
}

const STATUS_CONFIG: Record<string, { bg: string; icon: React.ElementType; spin?: boolean }> = {
  running: { bg: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400", icon: Loader2, spin: true },
  success: { bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400", icon: CheckCircle2 },
  failed:  { bg: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400", icon: XCircle },
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AutomationLogsPage() {
  const [runs, setRuns] = useState<AutomationRun[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [stats, setStats] = useState({ total: 0, successRate: 0, avgDuration: 0, failedRecent: 0 })
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

  // Pagination
  const [page, setPage] = useState(0)

  // Expanded rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  /* ---- Fetch stats ---- */
  const fetchStats = useCallback(async () => {
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const [totalRes, successRes, durationRes, failedRes] = await Promise.all([
      supabase.from("automation_runs").select("*", { count: "exact", head: true }),
      supabase.from("automation_runs").select("*", { count: "exact", head: true }).eq("status", "success"),
      supabase.from("automation_runs").select("duration_ms").not("duration_ms", "is", null),
      supabase.from("automation_runs").select("*", { count: "exact", head: true }).eq("status", "failed").gte("started_at", oneDayAgo.toISOString()),
    ])

    const total = totalRes.count ?? 0
    const successCount = successRes.count ?? 0
    const durations = (durationRes.data ?? []) as { duration_ms: number }[]
    const avgDur = durations.length > 0
      ? Math.round(durations.reduce((sum, d) => sum + d.duration_ms, 0) / durations.length)
      : 0

    setStats({
      total,
      successRate: total > 0 ? Math.round((successCount / total) * 100) : 0,
      avgDuration: avgDur,
      failedRecent: failedRes.count ?? 0,
    })
  }, [])

  /* ---- Fetch runs ---- */
  const fetchRuns = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from("automation_runs")
      .select("*, automations(name)", { count: "exact" })
      .order("started_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (statusFilter !== "all") query = query.eq("status", statusFilter)

    const { data, count } = await query

    let filtered = (data ?? []) as AutomationRun[]
    let filteredCount = count ?? 0

    // Client-side search by automation name
    if (search.trim()) {
      const term = search.trim().toLowerCase()
      filtered = filtered.filter((r) =>
        (r.automations?.name ?? "").toLowerCase().includes(term)
      )
      filteredCount = filtered.length
    }

    setRuns(filtered)
    setTotalCount(search.trim() ? filteredCount : (count ?? 0))
    setLoading(false)
  }, [page, statusFilter, search])

  useEffect(() => { fetchStats() }, [fetchStats])
  useEffect(() => { fetchRuns() }, [fetchRuns])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  /* ---- Stat cards ---- */
  const statCards = [
    { label: "Total Runs", value: stats.total.toLocaleString(), icon: Activity, iconBg: "bg-primary/10 text-primary" },
    { label: "Success Rate", value: `${stats.successRate}%`, icon: CheckCircle2, iconBg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400" },
    { label: "Avg Duration", value: formatDuration(stats.avgDuration), icon: Timer, iconBg: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400" },
    { label: "Failed (24h)", value: stats.failedRecent, icon: AlertTriangle, iconBg: "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400" },
  ]

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
            <ScrollText className="size-6" />
            Automation Logs
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Execution history and performance
          </p>
        </div>
        <button
          onClick={() => { fetchStats(); fetchRuns() }}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-md border text-sm font-medium hover:bg-muted/50 transition-colors"
        >
          <RefreshCw className="size-4" />
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold font-heading mt-2">{stat.value}</p>
              </div>
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${stat.iconBg}`}>
                <Icon className="size-4" />
              </div>
            </div>
          )
        })}
      </div>

      {/* Filters toolbar */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm p-4 flex items-center gap-4 flex-wrap">
        {/* Search */}
        <div className="relative">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search by automation name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            className="h-9 pl-9 pr-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-[260px]"
          />
        </div>

        {/* Status pills */}
        <div className="flex items-center gap-1.5">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(0) }}
              className={`h-8 px-3 rounded-full text-xs font-medium capitalize transition-colors ${
                statusFilter === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="w-8 px-2 py-2.5" />
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Automation</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Time</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Duration</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Triggered By</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Error</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Loader2 className="size-5 animate-spin text-muted-foreground mx-auto" />
                  </td>
                </tr>
              )}
              {!loading && runs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    No runs found
                  </td>
                </tr>
              )}
              {!loading && runs.map((run) => {
                const statusCfg = STATUS_CONFIG[run.status] ?? STATUS_CONFIG.success
                const StatusIcon = statusCfg.icon
                const isExpanded = expandedRows.has(run.id)

                return (
                  <Fragment key={run.id}>
                    <tr
                      className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => toggleRow(run.id)}
                    >
                      <td className="px-2 py-2.5 text-center">
                        {isExpanded ? (
                          <ChevronUp className="size-3.5 text-muted-foreground mx-auto" />
                        ) : (
                          <ChevronDown className="size-3.5 text-muted-foreground mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-medium">
                        {run.automations?.name ?? run.automation_id}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg.bg}`}>
                          <StatusIcon className={`size-3 ${statusCfg.spin ? "animate-spin" : ""}`} />
                          {run.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground" title={formatDate(run.started_at)}>
                        {timeAgo(run.started_at)}
                      </td>
                      <td className="px-4 py-2.5 text-xs font-mono">
                        {formatDuration(run.duration_ms)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground capitalize">
                        {run.triggered_by}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-red-600 dark:text-red-400 max-w-[200px] truncate">
                        {run.error_message ?? ""}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b bg-muted/20">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1.5">Result</p>
                              <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto max-h-48 overflow-y-auto font-mono">
                                {run.result ? JSON.stringify(run.result, null, 2) : "No result data"}
                              </pre>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1.5">Error Details</p>
                              {run.error_message ? (
                                <pre className="text-xs bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-md p-3 overflow-x-auto max-h-48 overflow-y-auto font-mono whitespace-pre-wrap">
                                  {run.error_message}
                                </pre>
                              ) : (
                                <p className="text-xs text-muted-foreground">No errors</p>
                              )}
                            </div>
                          </div>
                          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              Started: {formatDate(run.started_at)}
                            </span>
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="size-3" />
                              Completed: {formatDate(run.completed_at)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Timer className="size-3" />
                              Duration: {formatDuration(run.duration_ms)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(0)}
                disabled={page === 0}
                className="h-8 w-8 rounded-md border flex items-center justify-center hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronsLeft className="size-3.5" />
              </button>
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="h-8 w-8 rounded-md border flex items-center justify-center hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <span className="px-3 text-xs font-medium">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="h-8 w-8 rounded-md border flex items-center justify-center hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="size-3.5" />
              </button>
              <button
                onClick={() => setPage(totalPages - 1)}
                disabled={page >= totalPages - 1}
                className="h-8 w-8 rounded-md border flex items-center justify-center hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronsRight className="size-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
