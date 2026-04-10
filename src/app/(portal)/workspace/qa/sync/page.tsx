"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  RefreshCw,
  Clock,
  Activity,
  CheckCircle2,
  XCircle,
  Loader2,
  Info,
  CalendarClock,
  AlertTriangle,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { SubNav } from "@/components/shared/sub-nav"

const SUB_NAV_ITEMS = [
  { title: "Dashboard", href: "/workspace/qa/dashboard" },
  { title: "Calls", href: "/workspace/qa/calls" },
  { title: "Flags", href: "/workspace/qa/flags" },
  { title: "Reviews", href: "/workspace/qa/reviews" },
  { title: "Employees", href: "/workspace/qa/employees" },
  { title: "Sync", href: "/workspace/qa/sync" },
]

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SyncLogRow {
  id: string
  sync_type: string | null
  status: string | null
  records_processed: number | null
  records_created: number | null
  records_failed: number | null
  started_at: string | null
  completed_at: string | null
  error_message: string | null
}

type ToastKind = "success" | "error"
interface ToastState {
  kind: ToastKind
  message: string
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never"
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatAbsolute(dateStr: string | null): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDurationFromMs(ms: number | null): string {
  if (ms === null || Number.isNaN(ms) || ms < 0) return "—"
  if (ms < 1000) return `${ms}ms`
  const secs = Math.floor(ms / 1000)
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  const remSecs = secs % 60
  if (mins < 60) return `${mins}m ${remSecs}s`
  const hours = Math.floor(mins / 60)
  const remMins = mins % 60
  return `${hours}h ${remMins}m`
}

function computeDuration(started: string | null, completed: string | null): string {
  if (!started) return "—"
  if (!completed) return "Running…"
  return formatDurationFromMs(new Date(completed).getTime() - new Date(started).getTime())
}

function startOfTodayISO(): string {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now.toISOString()
}

/* ------------------------------------------------------------------ */
/*  UI bits                                                            */
/* ------------------------------------------------------------------ */

function StatusBadge({
  label,
  variant,
}: {
  label: string
  variant: "success" | "warning" | "error" | "info" | "neutral"
}) {
  const styles: Record<string, string> = {
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    error: "bg-red-50 text-red-700",
    info: "bg-blue-50 text-blue-700",
    neutral: "bg-slate-100 text-slate-600",
  }
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${styles[variant]}`}>
      {label}
    </span>
  )
}

function syncStatusVariant(status: string | null): "success" | "warning" | "error" | "info" | "neutral" {
  if (!status) return "neutral"
  const s = status.toLowerCase()
  if (s === "success" || s === "completed") return "success"
  if (s === "partial") return "warning"
  if (s === "failed" || s === "error") return "error"
  if (s === "running" || s === "in_progress") return "info"
  return "neutral"
}

function StatCard({
  label,
  value,
  icon: Icon,
  loading,
  tone = "default",
  children,
}: {
  label: string
  value?: string | number
  icon: React.ComponentType<{ className?: string }>
  loading: boolean
  tone?: "default" | "amber" | "emerald" | "red"
  children?: React.ReactNode
}) {
  const tones: Record<string, string> = {
    default: "text-primary bg-primary/10",
    amber: "text-amber-700 bg-amber-50",
    emerald: "text-emerald-700 bg-emerald-50",
    red: "text-red-700 bg-red-50",
  }
  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <span className={`inline-flex size-8 items-center justify-center rounded-md ${tones[tone]}`}>
          <Icon className="size-4" />
        </span>
      </div>
      {loading ? (
        <div className="mt-3 h-8 w-24 animate-pulse rounded bg-muted" />
      ) : children ? (
        <div className="mt-2">{children}</div>
      ) : (
        <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
      )}
    </div>
  )
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="border-b border-border/60">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
        </td>
      ))}
    </tr>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function QaSyncPage() {
  const [logs, setLogs] = useState<SyncLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyDays, setBusyDays] = useState<number | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadLogs = useCallback(async () => {
    const { data, error } = await supabase
      .from("callyzer_sync_log")
      .select(
        "id, sync_type, status, records_processed, records_created, records_failed, started_at, completed_at, error_message",
      )
      .order("started_at", { ascending: false })
      .limit(20)
    if (error) {
      console.error("loadLogs error:", error)
      return
    }
    setLogs((data ?? []) as SyncLogRow[])
  }, [])

  // Initial load
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      await loadLogs()
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [loadLogs])

  // Auto-refresh while a sync is running (either local or server-side running row)
  const hasRunning = useMemo(
    () =>
      busyDays !== null ||
      logs.some((l) => {
        const s = (l.status ?? "").toLowerCase()
        return s === "running" || s === "in_progress"
      }),
    [busyDays, logs],
  )

  useEffect(() => {
    if (!hasRunning) return
    const id = setInterval(() => {
      loadLogs()
    }, 5000)
    return () => clearInterval(id)
  }, [hasRunning, loadLogs])

  /* ---------- toast helper ---------- */
  const showToast = useCallback((kind: ToastKind, message: string) => {
    setToast({ kind, message })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 5000)
  }, [])

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  /* ---------- trigger sync ---------- */
  const triggerSync = useCallback(
    async (days: number) => {
      if (busyDays !== null) return
      setBusyDays(days)
      setToast(null)
      try {
        const res = await fetch(`/api/qa/sync?days=${days}`, { method: "POST" })
        const contentType = res.headers.get("content-type") ?? ""
        let payload: unknown = null
        if (contentType.includes("application/json")) {
          payload = await res.json().catch(() => null)
        }
        if (!res.ok) {
          const message =
            (payload && typeof payload === "object" && "error" in payload
              ? String((payload as { error?: unknown }).error ?? "")
              : "") || `Sync failed (HTTP ${res.status})`
          showToast("error", message)
        } else {
          showToast("success", `Sync started for the last ${days} day${days === 1 ? "" : "s"}.`)
        }
      } catch (err) {
        console.error("triggerSync error:", err)
        showToast("error", err instanceof Error ? err.message : "Sync request failed")
      } finally {
        setBusyDays(null)
        await loadLogs()
      }
    },
    [busyDays, loadLogs, showToast],
  )

  /* ---------- derived stats ---------- */

  const latestSync = logs[0] ?? null
  const todayIso = startOfTodayISO()
  const todayLogs = useMemo(
    () => logs.filter((l) => l.started_at && new Date(l.started_at).toISOString() >= todayIso),
    [logs, todayIso],
  )
  const recordsCreatedToday = todayLogs.reduce((s, l) => s + (l.records_created ?? 0), 0)
  const recordsFailedToday = todayLogs.reduce((s, l) => s + (l.records_failed ?? 0), 0)

  const SyncButton = ({ days, label }: { days: number; label: string }) => {
    const isBusy = busyDays === days
    const disabled = busyDays !== null
    return (
      <Button
        variant="outline"
        disabled={disabled}
        onClick={() => triggerSync(days)}
        className="w-full justify-start"
      >
        {isBusy ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Syncing…
          </>
        ) : (
          <>
            <RefreshCw className="size-4" /> {label}
          </>
        )}
      </Button>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <SubNav items={SUB_NAV_ITEMS} />

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">QA Sync</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage Callyzer ingestion and inspect recent sync runs.
          </p>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`rounded-lg border shadow-sm px-4 py-3 text-sm flex items-start gap-2 ${
            toast.kind === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {toast.kind === "success" ? (
            <CheckCircle2 className="size-4 mt-0.5" />
          ) : (
            <AlertTriangle className="size-4 mt-0.5" />
          )}
          <span className="flex-1">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-xs font-medium opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Last Sync" value={timeAgo(latestSync?.started_at ?? null)} icon={Clock} loading={loading} />
        <StatCard label="Status" icon={Activity} loading={loading} tone="amber">
          {latestSync ? (
            <StatusBadge
              label={(latestSync.status ?? "unknown").toUpperCase()}
              variant={syncStatusVariant(latestSync.status)}
            />
          ) : (
            <StatusBadge label="NO DATA" variant="neutral" />
          )}
        </StatCard>
        <StatCard
          label="Records Created Today"
          value={recordsCreatedToday}
          icon={CheckCircle2}
          loading={loading}
          tone="emerald"
        />
        <StatCard
          label="Records Failed Today"
          value={recordsFailedToday}
          icon={XCircle}
          loading={loading}
          tone="red"
        />
      </div>

      {/* Manual sync + cron info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden lg:col-span-2">
          <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">Manual Sync</div>
          <div className="p-5 space-y-3">
            <p className="text-sm text-muted-foreground">
              Trigger a Callyzer re-ingest for a selected time window. Existing calls are upserted; new flags and
              transcriptions are created.
            </p>
            <div className="space-y-2.5">
              <SyncButton days={1} label="Sync Last 24 Hours" />
              <SyncButton days={7} label="Sync Last 7 Days" />
              <SyncButton days={30} label="Sync Last 30 Days" />
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight flex items-center gap-2">
            <Info className="size-4 text-blue-600" /> Automatic Sync
          </div>
          <div className="p-5 text-sm text-muted-foreground space-y-3">
            <div className="flex items-start gap-2">
              <CalendarClock className="size-4 mt-0.5 text-blue-600" />
              <div>
                <div className="text-foreground font-medium">Daily at 1:00 AM</div>
                <div className="text-xs">Auto-syncs daily at 1:00 AM via Vercel cron.</div>
              </div>
            </div>
            <div className="text-xs">
              Manual syncs do not replace the cron run — they append additional log entries and are safe to trigger
              on-demand.
            </div>
          </div>
        </div>
      </div>

      {/* Sync history */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight flex items-center justify-between">
          <span>Sync History</span>
          {hasRunning && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700">
              <Loader2 className="size-3 animate-spin" /> Live refresh
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Started At
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Records
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Duration
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Error
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={6} />)
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No sync runs yet.
                  </td>
                </tr>
              ) : (
                logs.map((l) => {
                  const created = l.records_created ?? 0
                  const processed = l.records_processed ?? 0
                  const updated = Math.max(0, processed - created - (l.records_failed ?? 0))
                  const failed = l.records_failed ?? 0
                  return (
                    <tr key={l.id} className="border-b border-border/60 last:border-0 align-top">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium">{formatAbsolute(l.started_at)}</div>
                        <div className="text-xs text-muted-foreground">{timeAgo(l.started_at)}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{l.sync_type ?? "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge
                          label={(l.status ?? "unknown").toUpperCase()}
                          variant={syncStatusVariant(l.status)}
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-xs">
                          <span className="text-emerald-700 font-medium">{created}</span>
                          <span className="text-muted-foreground"> created</span>
                        </div>
                        <div className="text-xs">
                          <span className="text-blue-700 font-medium">{updated}</span>
                          <span className="text-muted-foreground"> updated</span>
                        </div>
                        <div className="text-xs">
                          <span className={failed > 0 ? "text-red-700 font-medium" : "text-muted-foreground"}>
                            {failed}
                          </span>
                          <span className="text-muted-foreground"> failed</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {computeDuration(l.started_at, l.completed_at)}
                      </td>
                      <td className="px-4 py-3 max-w-[280px]">
                        {l.error_message ? (
                          <span className="text-xs text-red-700 break-words">{l.error_message}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
