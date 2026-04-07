"use client"

import { useState, useEffect, useCallback, Fragment } from "react"
import {
  History,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  AlertTriangle,
  Timer,
  ChevronDown,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  Zap,
  User,
  Monitor,
  RefreshCw,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Automation {
  id: string
  name: string
}

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

type SortColumn = "started_at" | "duration_ms" | "status" | "triggered_by"
type SortDir = "asc" | "desc"

const PAGE_SIZE = 20

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

const STATUS_CONFIG: Record<string, { bg: string; icon: React.ElementType; pulse?: boolean }> = {
  running: { bg: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400", icon: Loader2, pulse: true },
  success: { bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400", icon: CheckCircle2 },
  failed: { bg: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400", icon: XCircle },
}

const TRIGGER_CONFIG: Record<string, { bg: string; icon: React.ElementType }> = {
  system: { bg: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300", icon: Monitor },
  manual: { bg: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400", icon: User },
  event: { bg: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400", icon: Zap },
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AutomationHistoryPage() {
  const [automations, setAutomations] = useState<Automation[]>([])
  const [runs, setRuns] = useState<AutomationRun[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [stats, setStats] = useState({ total: 0, successRate: 0, avgDuration: 0, failedRecent: 0 })
  const [loading, setLoading] = useState(true)

  // Timeline dots (last 24 runs)
  const [timelineDots, setTimelineDots] = useState<{ id: string; status: string }[]>([])

  // Filters
  const [filterAutomation, setFilterAutomation] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [filterDateFrom, setFilterDateFrom] = useState("")
  const [filterDateTo, setFilterDateTo] = useState("")

  // Sort & pagination
  const [sortColumn, setSortColumn] = useState<SortColumn>("started_at")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
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

  /* ---- Fetch automations list ---- */
  useEffect(() => {
    async function fetchAutomations() {
      const { data } = await supabase.from("automations").select("id, name").order("name")
      setAutomations((data ?? []) as Automation[])
    }
    fetchAutomations()
  }, [])

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

  /* ---- Fetch timeline dots ---- */
  const fetchTimeline = useCallback(async () => {
    const { data } = await supabase
      .from("automation_runs")
      .select("id, status")
      .order("started_at", { ascending: false })
      .limit(24)
    setTimelineDots((data ?? []) as { id: string; status: string }[])
  }, [])

  /* ---- Fetch runs ---- */
  const fetchRuns = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from("automation_runs")
      .select("*, automations(name)", { count: "exact" })
      .order(sortColumn, { ascending: sortDir === "asc" })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (filterAutomation) query = query.eq("automation_id", filterAutomation)
    if (filterStatus) query = query.eq("status", filterStatus)
    if (filterDateFrom) query = query.gte("started_at", new Date(filterDateFrom).toISOString())
    if (filterDateTo) {
      const to = new Date(filterDateTo)
      to.setHours(23, 59, 59, 999)
      query = query.lte("started_at", to.toISOString())
    }

    const { data, count } = await query
    setRuns((data ?? []) as AutomationRun[])
    setTotalCount(count ?? 0)
    setLoading(false)
  }, [sortColumn, sortDir, page, filterAutomation, filterStatus, filterDateFrom, filterDateTo])

  useEffect(() => { fetchStats(); fetchTimeline() }, [fetchStats, fetchTimeline])
  useEffect(() => { fetchRuns() }, [fetchRuns])

  /* ---- Sort handler ---- */
  function handleSort(col: SortColumn) {
    if (sortColumn === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortColumn(col)
      setSortDir("desc")
    }
    setPage(0)
  }

  function SortIcon({ col }: { col: SortColumn }) {
    if (sortColumn !== col) return <ChevronDown className="size-3 opacity-30" />
    return sortDir === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />
  }

  /* ---- Reset filters ---- */
  function resetFilters() {
    setFilterAutomation("")
    setFilterStatus("")
    setFilterDateFrom("")
    setFilterDateTo("")
    setPage(0)
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

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
            <History className="size-6" />
            Automation History
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Execution logs and performance tracking
          </p>
        </div>
        <button
          onClick={() => { fetchStats(); fetchTimeline(); fetchRuns() }}
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
            <div key={stat.label} className="rounded-md border bg-card p-5 flex items-start justify-between">
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

      {/* Timeline Chart */}
      <div className="rounded-md border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            Recent Activity
          </h2>
          <span className="text-xs text-muted-foreground">Last 24 runs</span>
        </div>
        <div className="flex items-center gap-1.5">
          {timelineDots.length === 0 && (
            <span className="text-xs text-muted-foreground">No runs recorded yet</span>
          )}
          {[...timelineDots].reverse().map((dot) => (
            <div
              key={dot.id}
              title={dot.status}
              className={`size-4 rounded-full shrink-0 transition-colors ${
                dot.status === "success"
                  ? "bg-emerald-500"
                  : dot.status === "failed"
                    ? "bg-red-500"
                    : dot.status === "running"
                      ? "bg-blue-500 animate-pulse"
                      : "bg-gray-300 dark:bg-gray-600"
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-4 mt-2">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2.5 rounded-full bg-emerald-500" /> Success
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2.5 rounded-full bg-red-500" /> Failed
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2.5 rounded-full bg-blue-500" /> Running
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-md border bg-card p-4">
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Automation</label>
            <select
              value={filterAutomation}
              onChange={(e) => { setFilterAutomation(e.target.value); setPage(0) }}
              className="h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-[200px]"
            >
              <option value="">All Automations</option>
              {automations.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(0) }}
              className="h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-[140px]"
            >
              <option value="">All</option>
              <option value="running">Running</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">From</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => { setFilterDateFrom(e.target.value); setPage(0) }}
              className="h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">To</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => { setFilterDateTo(e.target.value); setPage(0) }}
              className="h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          {(filterAutomation || filterStatus || filterDateFrom || filterDateTo) && (
            <button
              onClick={resetFilters}
              className="h-9 px-3 rounded-md border text-xs font-medium hover:bg-muted/50 transition-colors text-muted-foreground"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Runs Table */}
      <div className="rounded-md border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="w-8 px-2 py-2.5" />
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Automation</th>
                <th
                  className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground"
                  onClick={() => handleSort("status")}
                >
                  <span className="inline-flex items-center gap-1">Status <SortIcon col="status" /></span>
                </th>
                <th
                  className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground"
                  onClick={() => handleSort("started_at")}
                >
                  <span className="inline-flex items-center gap-1">Started At <SortIcon col="started_at" /></span>
                </th>
                <th
                  className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground"
                  onClick={() => handleSort("duration_ms")}
                >
                  <span className="inline-flex items-center gap-1">Duration <SortIcon col="duration_ms" /></span>
                </th>
                <th
                  className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground"
                  onClick={() => handleSort("triggered_by")}
                >
                  <span className="inline-flex items-center gap-1">Triggered By <SortIcon col="triggered_by" /></span>
                </th>
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
                const triggerCfg = TRIGGER_CONFIG[run.triggered_by] ?? TRIGGER_CONFIG.system
                const TriggerIcon = triggerCfg.icon
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
                          <StatusIcon className={`size-3 ${statusCfg.pulse ? "animate-spin" : ""}`} />
                          {run.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {formatDate(run.started_at)}
                      </td>
                      <td className="px-4 py-2.5 text-xs font-mono">
                        {formatDuration(run.duration_ms)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${triggerCfg.bg}`}>
                          <TriggerIcon className="size-3" />
                          {run.triggered_by}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-red-600 dark:text-red-400 max-w-[200px] truncate">
                        {run.error_message ?? ""}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b bg-muted/20">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Result */}
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1.5">Result</p>
                              <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto max-h-48 overflow-y-auto font-mono">
                                {run.result ? JSON.stringify(run.result, null, 2) : "No result data"}
                              </pre>
                            </div>
                            {/* Error */}
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1.5">Error Message</p>
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
