"use client"

import { useEffect, useState, useCallback } from "react"
import {
  RefreshCw,
  Landmark,
  Truck,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SyncAction {
  key: string
  name: string
  description: string
  endpoint: string
  icon: typeof RefreshCw
  automationName: string
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
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SYNC_ACTIONS: SyncAction[] = [
  {
    key: "faire",
    name: "Sync Faire",
    description: "Syncs orders, products, retailers from Faire API",
    endpoint: "/api/faire/sync",
    icon: RefreshCw,
    automationName: "Faire",
  },
  {
    key: "banking",
    name: "Sync Banking",
    description: "Syncs Wise bank transactions",
    endpoint: "/api/wise/sync",
    icon: Landmark,
    automationName: "Wise",
  },
  {
    key: "tracking",
    name: "Sync Tracking",
    description: "Syncs 17Track shipment status",
    endpoint: "/api/tracking/sync",
    icon: Truck,
    automationName: "Tracking",
  },
]

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

function fmtDuration(ms: number | null): string {
  if (ms == null) return "-"
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

function fmtTimestamp(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SyncPage() {
  const [lastSyncTimes, setLastSyncTimes] = useState<Record<string, string | null>>({})
  const [runs, setRuns] = useState<AutomationRun[]>([])
  const [loading, setLoading] = useState(true)
  const [runningKeys, setRunningKeys] = useState<Set<string>>(new Set())
  const [expandedRun, setExpandedRun] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)

    // Fetch last_run_at for each automation by name match
    const { data: automations } = await supabase
      .from("automations")
      .select("name, last_run_at")

    const times: Record<string, string | null> = {}
    for (const action of SYNC_ACTIONS) {
      const match = automations?.find((a) =>
        a.name.toLowerCase().includes(action.automationName.toLowerCase())
      )
      times[action.key] = match?.last_run_at ?? null
    }
    setLastSyncTimes(times)

    // Fetch last 30 runs
    const { data: runsData, error: runsError } = await supabase
      .from("automation_runs")
      .select("*, automations(name)")
      .order("started_at", { ascending: false })
      .limit(30)

    if (runsError) console.error("fetchRuns:", runsError)
    setRuns((runsData as AutomationRun[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleSync(action: SyncAction) {
    setRunningKeys((prev) => new Set(prev).add(action.key))
    try {
      const res = await fetch(action.endpoint, { method: "POST" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      showToast(`${action.name} completed successfully`, "success")
      fetchData()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      showToast(`${action.name} failed: ${msg}`, "error")
    } finally {
      setRunningKeys((prev) => {
        const next = new Set(prev)
        next.delete(action.key)
        return next
      })
    }
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sync Center</h1>
        <p className="text-sm text-muted-foreground">
          Run and monitor data synchronization
        </p>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {SYNC_ACTIONS.map((action) => {
          const Icon = action.icon
          const isRunning = runningKeys.has(action.key)
          const lastSync = lastSyncTimes[action.key]

          return (
            <Card key={action.key} className="relative overflow-hidden">
              <CardContent className="flex flex-col items-center gap-4 py-6">
                <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="size-6 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-base font-semibold">{action.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {action.description}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Last synced: {loading ? "..." : timeAgo(lastSync)}
                </p>
                <Button
                  onClick={() => handleSync(action)}
                  disabled={isRunning}
                  className="w-full"
                >
                  {isRunning ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 size-4" />
                  )}
                  {isRunning ? "Syncing..." : "Sync Now"}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Recent Sync Runs */}
      {!loading && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Sync Runs</CardTitle>
            <CardDescription>Last 30 runs across all automations</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Automation Name</TableHead>
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
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground py-8"
                    >
                      No sync runs recorded yet.
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
                        <StatusBadge tone={toneForStatus(run.status)}>{run.status}</StatusBadge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {fmtTimestamp(run.started_at)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
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
                            onClick={() =>
                              setExpandedRun(
                                expandedRun === run.id ? null : run.id
                              )
                            }
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
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm shadow-lg animate-in fade-in slide-in-from-bottom-4 ${
            toast.type === "success"
              ? "bg-card"
              : "bg-red-50 border-red-200"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="size-4 text-emerald-500" />
          ) : (
            <XCircle className="size-4 text-red-500" />
          )}
          {toast.message}
        </div>
      )}
    </div>
  )
}
