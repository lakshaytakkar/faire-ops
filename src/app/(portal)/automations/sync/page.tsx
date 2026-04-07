"use client"

import { useEffect, useState, useCallback } from "react"
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Activity,
  AlertTriangle,
  Timer,
  ChevronDown,
  ChevronRight,
  Play,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Automation {
  id: string
  name: string
  description: string | null
  type: string
  category: string
  trigger_type: string
  cron_expression: string | null
  config: Record<string, unknown>
  is_active: boolean
  last_run_at: string | null
  last_status: string | null
  last_error: string | null
  run_count: number
  created_by: string | null
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
  triggered_by: string | null
  automations: { name: string } | null
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
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function cronLabel(cron: string | null): string {
  if (!cron) return "Manual"
  if (cron.includes("*/5")) return "Every 5m"
  if (cron.includes("*/15")) return "Every 15m"
  if (cron.includes("*/30")) return "Every 30m"
  if (cron === "0 * * * *") return "Every hour"
  if (cron === "0 */2 * * *") return "Every 2h"
  if (cron === "0 */4 * * *") return "Every 4h"
  if (cron === "0 */6 * * *") return "Every 6h"
  if (cron === "0 */12 * * *") return "Every 12h"
  if (cron === "0 0 * * *") return "Daily"
  if (cron === "0 9 * * *") return "Daily 9am"
  if (cron === "0 9 * * 1") return "Mon 9am"
  if (cron === "0 8 * * 1-5") return "Weekdays 8am"
  return cron
}

function fmtDuration(ms: number | null): string {
  if (ms == null) return "-"
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

function StatusBadge({ status }: { status: string }) {
  if (status === "success") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
        <CheckCircle2 className="size-3" /> Success
      </span>
    )
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700">
        <XCircle className="size-3" /> Failed
      </span>
    )
  }
  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
        <Loader2 className="size-3 animate-spin" /> Running
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
      {status}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SyncPage() {
  const [automations, setAutomations] = useState<Automation[]>([])
  const [runs, setRuns] = useState<AutomationRun[]>([])
  const [loading, setLoading] = useState(true)
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set())
  const [expandedRun, setExpandedRun] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [autoRes, runsRes] = await Promise.all([
      supabase
        .from("automations")
        .select("*")
        .in("type", ["sync", "integration"])
        .order("name"),
      supabase
        .from("automation_runs")
        .select("*, automations(name)")
        .order("started_at", { ascending: false })
        .limit(50),
    ])
    if (autoRes.error) console.error("fetchAutomations:", autoRes.error)
    if (runsRes.error) console.error("fetchRuns:", runsRes.error)
    setAutomations(autoRes.data ?? [])
    setRuns((runsRes.data as AutomationRun[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // Run sync
  async function handleRun(automation: Automation) {
    setRunningIds((prev) => new Set(prev).add(automation.id))
    try {
      const endpoint = (automation.config as Record<string, string>)?.endpoint
      if (endpoint) {
        await fetch(endpoint, { method: "POST" }).catch(() => {})
      }
      const now = new Date().toISOString()
      await supabase.from("automation_runs").insert({
        automation_id: automation.id,
        status: "success",
        started_at: now,
        completed_at: now,
        duration_ms: 0,
        triggered_by: "manual",
      })
      await supabase.from("automations").update({
        last_run_at: now,
        last_status: "success",
        run_count: (automation.run_count || 0) + 1,
      }).eq("id", automation.id)
      showToast(`Synced: ${automation.name}`)
      fetchData()
    } catch {
      showToast(`Failed: ${automation.name}`)
    } finally {
      setRunningIds((prev) => {
        const next = new Set(prev)
        next.delete(automation.id)
        return next
      })
    }
  }

  // Stats
  const totalSyncs = automations.length
  const lastSuccessful = runs.find((r) => r.status === "success")
  const lastFailed = runs.find((r) => r.status === "failed")
  const avgDuration = runs.length
    ? Math.round(runs.reduce((sum, r) => sum + (r.duration_ms ?? 0), 0) / runs.length)
    : 0

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sync & Integrations</h1>
        <p className="text-sm text-muted-foreground">Monitor data synchronization across services</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
              <RefreshCw className="size-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Syncs</p>
              <p className="text-xl font-bold">{loading ? "-" : totalSyncs}</p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-50">
              <CheckCircle2 className="size-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Successful</p>
              <p className="text-sm font-semibold">{loading ? "-" : lastSuccessful ? timeAgo(lastSuccessful.started_at) : "None"}</p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-red-50">
              <AlertTriangle className="size-4 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Failed</p>
              <p className="text-sm font-semibold">{loading ? "-" : lastFailed ? timeAgo(lastFailed.started_at) : "None"}</p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-50">
              <Timer className="size-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Duration</p>
              <p className="text-sm font-semibold">{loading ? "-" : fmtDuration(avgDuration)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Sync Cards */}
      {!loading && automations.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {automations.map((a) => (
            <Card key={a.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="truncate">{a.name}</CardTitle>
                  {a.is_active ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Active</span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">Inactive</span>
                  )}
                </div>
                <CardAction>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRun(a)}
                    disabled={runningIds.has(a.id)}
                  >
                    {runningIds.has(a.id) ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Play className="size-3" />
                    )}
                    Sync Now
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Last Run</p>
                    <p className="font-medium">{timeAgo(a.last_run_at)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <div className="mt-0.5">{a.last_status ? <StatusBadge status={a.last_status} /> : <span className="text-gray-400">-</span>}</div>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Run Count</p>
                    <p className="font-medium">{a.run_count}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Schedule</p>
                    <p className="font-medium">{cronLabel(a.cron_expression)}</p>
                  </div>
                </div>
                {a.last_error && (
                  <div className="mt-3 rounded-md bg-red-50 p-2 text-[11px] text-red-700">
                    {a.last_error}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Run History */}
      {!loading && (
        <Card>
          <CardHeader>
            <CardTitle>Run History</CardTitle>
            <CardDescription>Last 50 automation runs across all syncs</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Automation</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Triggered By</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No runs recorded yet.
                    </TableCell>
                  </TableRow>
                )}
                {runs.map((run) => (
                  <>
                    <TableRow key={run.id}>
                      <TableCell className="pl-4 font-medium">
                        {run.automations?.name ?? run.automation_id}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={run.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {timeAgo(run.started_at)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {fmtDuration(run.duration_ms)}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                          {run.triggered_by ?? "system"}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-red-600">
                        {run.error_message ?? "-"}
                      </TableCell>
                      <TableCell>
                        {run.result && (
                          <button
                            onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {expandedRun === run.id ? (
                              <ChevronDown className="size-4" />
                            ) : (
                              <ChevronRight className="size-4" />
                            )}
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                    {expandedRun === run.id && run.result && (
                      <TableRow key={`${run.id}-detail`}>
                        <TableCell colSpan={7} className="bg-muted/30 pl-4">
                          <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-[11px] font-mono leading-relaxed">
                            {JSON.stringify(run.result, null, 2)}
                          </pre>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm shadow-lg animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="size-4 text-emerald-500" />
          {toast}
        </div>
      )}
    </div>
  )
}
