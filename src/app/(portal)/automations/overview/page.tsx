"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
  Zap,
  Activity,
  Clock,
  AlertTriangle,
  Play,
  Loader2,
  CheckCircle2,
  RefreshCw,
  Bell,
  Plug,
  Mail,
  Plus,
  ScrollText,
  Settings2,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

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

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function timeAgo(date: string | null): string {
  if (!date) return "Never"
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function humanCron(expr: string | null): string {
  if (!expr) return "Manual"
  const parts = expr.trim().split(/\s+/)
  if (parts.length < 5) return expr

  const [min, hour, dom, , dow] = parts

  // Every N minutes
  if (min.startsWith("*/")) {
    const n = min.slice(2)
    return `Every ${n} minutes`
  }

  // Every hour at :MM
  if (hour === "*" && !min.startsWith("*")) {
    return min === "0" ? "Every hour" : `Every hour at :${min.padStart(2, "0")}`
  }

  // Every N hours
  if (hour.startsWith("*/")) {
    const n = hour.slice(2)
    return `Every ${n} hours`
  }

  // Specific hour
  if (hour !== "*" && !hour.includes("/")) {
    const h = parseInt(hour, 10)
    const period = h >= 12 ? "pm" : "am"
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h

    // Weekdays
    if (dow === "1-5") return `Weekdays at ${h12}${period}`
    // Specific day
    const dayNames: Record<string, string> = { "0": "Sun", "1": "Mon", "2": "Tue", "3": "Wed", "4": "Thu", "5": "Fri", "6": "Sat", "7": "Sun" }
    if (dow !== "*" && dayNames[dow]) return `${dayNames[dow]} at ${h12}${period}`
    // Specific day of month
    if (dom !== "*") return `Day ${dom} at ${h12}${period}`
    // Daily
    return `Every day at ${h12}${period}`
  }

  return expr
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([])
  const [loading, setLoading] = useState(true)
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<string | null>(null)

  const fetchAutomations = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("automations")
      .select("*")
      .order("name")
    if (error) console.error("fetchAutomations:", error)
    setAutomations(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAutomations() }, [fetchAutomations])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleToggle(id: string, active: boolean) {
    const { error } = await supabase.from("automations").update({ is_active: active }).eq("id", id)
    if (error) {
      console.error("toggle error:", error)
      showToast("Failed to update automation")
      return
    }
    setAutomations((prev) => prev.map((a) => (a.id === id ? { ...a, is_active: active } : a)))
    showToast(active ? "Automation enabled" : "Automation disabled")
  }

  async function handleRun(automation: Automation) {
    setRunningIds((prev) => new Set(prev).add(automation.id))
    try {
      const endpoint = (automation.config as Record<string, string>)?.endpoint
      if (endpoint) {
        await fetch(endpoint, { method: "POST" }).catch(() => {})
      }
      await supabase.from("automation_runs").insert({
        automation_id: automation.id,
        status: "success",
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        duration_ms: 0,
        triggered_by: "manual",
      })
      await supabase.from("automations").update({
        last_run_at: new Date().toISOString(),
        last_status: "success",
        run_count: (automation.run_count || 0) + 1,
      }).eq("id", automation.id)
      showToast(`Triggered: ${automation.name}`)
      fetchAutomations()
    } catch {
      showToast(`Failed to run: ${automation.name}`)
    } finally {
      setRunningIds((prev) => {
        const next = new Set(prev)
        next.delete(automation.id)
        return next
      })
    }
  }

  /* Stats */
  const total = automations.length
  const active = automations.filter((a) => a.is_active).length
  const lastRunEntry = automations
    .filter((a) => a.last_run_at)
    .sort((a, b) => new Date(b.last_run_at!).getTime() - new Date(a.last_run_at!).getTime())[0]
  const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000
  const failed24h = automations.filter(
    (a) => a.last_status === "failed" && a.last_run_at && new Date(a.last_run_at).getTime() > twentyFourHoursAgo
  ).length

  /* Type icon for Name column */
  const typeIcon = (type: string) => {
    switch (type) {
      case "sync":
        return { Icon: RefreshCw, bg: "bg-blue-50", color: "text-blue-600" }
      case "notification":
        return { Icon: Bell, bg: "bg-amber-50", color: "text-amber-600" }
      case "integration":
        return { Icon: Plug, bg: "bg-purple-50", color: "text-purple-600" }
      case "email":
        return { Icon: Mail, bg: "bg-red-50", color: "text-red-600" }
      default:
        return { Icon: Zap, bg: "bg-muted", color: "text-muted-foreground" }
    }
  }

  /* Type badge styles */
  const typeBadge = (type: string) => {
    switch (type) {
      case "sync":
        return "bg-blue-50 text-blue-700"
      case "notification":
        return "bg-amber-50 text-amber-700"
      case "integration":
        return "bg-purple-50 text-purple-700"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  /* Status badge styles */
  const statusBadge = (status: string | null) => {
    switch (status) {
      case "success":
        return "bg-emerald-50 text-emerald-700"
      case "failed":
        return "bg-red-50 text-red-700"
      case "running":
        return "bg-blue-50 text-blue-700"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Hero Banner */}
      <div className="rounded-md px-8 py-7 text-white" style={{ background: "linear-gradient(135deg, hsl(240,50%,12%) 0%, hsl(235,60%,30%) 100%)" }}>
        <p className="text-sm font-medium opacity-75">Automations</p>
        <h1 className="mt-1 text-3xl font-bold font-heading tracking-tight">Automation Hub</h1>
        <p className="mt-1 text-sm opacity-60">Scheduled tasks, webhooks & triggered workflows</p>
        <div className="mt-5 flex items-center gap-8">
          <div><p className="text-2xl font-bold tabular-nums">{loading ? "-" : total}</p><p className="text-xs opacity-50">Total</p></div>
          <div><p className="text-2xl font-bold tabular-nums">{loading ? "-" : active}</p><p className="text-xs opacity-50">Active</p></div>
          <div><p className="text-2xl font-bold tabular-nums">{loading ? "-" : failed24h}</p><p className="text-xs opacity-50">Failed (24h)</p></div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="size-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Automations</p>
              <p className="text-xl font-bold">{loading ? "-" : total}</p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-50">
              <Activity className="size-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active</p>
              <p className="text-xl font-bold">{loading ? "-" : active}</p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-50">
              <Clock className="size-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Run</p>
              <p className="text-sm font-semibold">{loading ? "-" : lastRunEntry ? timeAgo(lastRunEntry.last_run_at) : "Never"}</p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-red-50">
              <AlertTriangle className="size-4 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Failed (24h)</p>
              <p className="text-xl font-bold">{loading ? "-" : failed24h}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Grid */}
      {!loading && automations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Type Breakdown */}
          <div className="rounded-lg border bg-card p-5">
            <h3 className="text-[0.9375rem] font-semibold tracking-tight mb-4">By Type</h3>
            <div className="space-y-3">
              {Object.entries(
                automations.reduce<Record<string, number>>((acc, a) => {
                  acc[a.type] = (acc[a.type] || 0) + 1
                  return acc
                }, {})
              )
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => {
                  const pct = Math.round((count / total) * 100)
                  const barColor =
                    type === "sync" ? "bg-blue-500" :
                    type === "notification" ? "bg-amber-500" :
                    type === "integration" ? "bg-purple-500" :
                    type === "email" ? "bg-red-500" : "bg-muted-foreground"
                  return (
                    <div key={type}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="capitalize font-medium">{type}</span>
                        <span className="text-muted-foreground tabular-nums">{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="rounded-lg border bg-card p-5">
            <h3 className="text-[0.9375rem] font-semibold tracking-tight mb-4">By Status</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Active vs Paused</p>
                <div className="flex gap-4">
                  <div className="flex-1 rounded-lg bg-emerald-50 p-3 text-center">
                    <p className="text-xl font-bold tabular-nums text-emerald-700">{active}</p>
                    <p className="text-sm text-emerald-600">Active</p>
                  </div>
                  <div className="flex-1 rounded-lg bg-muted p-3 text-center">
                    <p className="text-xl font-bold tabular-nums">{total - active}</p>
                    <p className="text-sm text-muted-foreground">Paused</p>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Last Run Result</p>
                <div className="flex gap-4">
                  <div className="flex-1 rounded-lg bg-emerald-50 p-3 text-center">
                    <p className="text-xl font-bold tabular-nums text-emerald-700">{automations.filter((a) => a.last_status === "success").length}</p>
                    <p className="text-sm text-emerald-600">Success</p>
                  </div>
                  <div className="flex-1 rounded-lg bg-red-50 p-3 text-center">
                    <p className="text-xl font-bold tabular-nums text-red-700">{automations.filter((a) => a.last_status === "failed").length}</p>
                    <p className="text-sm text-red-600">Failed</p>
                  </div>
                  <div className="flex-1 rounded-lg bg-muted p-3 text-center">
                    <p className="text-xl font-bold tabular-nums">{automations.filter((a) => !a.last_status).length}</p>
                    <p className="text-sm text-muted-foreground">Never Run</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Name</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Type</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Schedule</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Last Run</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Last Status</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right">Run Count</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {automations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No automations found
                  </td>
                </tr>
              ) : automations.map((a) => (
                <tr key={a.id} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const { Icon, bg, color } = typeIcon(a.type)
                        return (
                          <div className={`flex size-8 shrink-0 items-center justify-center rounded-full ${bg}`}>
                            <Icon className={`size-4 ${color}`} />
                          </div>
                        )
                      })()}
                      <a href={`/automations/${a.id}`} className="hover:text-primary transition-colors">
                        <div className="text-sm font-medium">{a.name}</div>
                        {a.description && (
                          <div className="text-xs text-muted-foreground truncate max-w-[240px]">{a.description}</div>
                        )}
                      </a>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${typeBadge(a.type)}`}>
                      {a.type}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground">
                    {humanCron(a.cron_expression)}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="flex items-center gap-2 text-sm">
                      <span className={`size-2 shrink-0 rounded-full ${a.is_active ? "bg-emerald-500" : "bg-gray-300"}`} />
                      {a.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground">
                    {timeAgo(a.last_run_at)}
                  </td>
                  <td className="px-4 py-3.5">
                    {a.last_status ? (
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge(a.last_status)}`}>
                        {a.last_status}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-right tabular-nums">
                    {a.run_count}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleRun(a)}
                        disabled={runningIds.has(a.id)}
                        title="Run Now"
                      >
                        {runningIds.has(a.id) ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Play className="size-3" />
                        )}
                      </Button>
                      <button
                        onClick={() => handleToggle(a.id, !a.is_active)}
                        className="relative flex h-5 w-9 cursor-pointer items-center rounded-full transition-colors"
                        style={{ backgroundColor: a.is_active ? "var(--color-primary)" : "var(--color-muted)" }}
                        title={a.is_active ? "Disable" : "Enable"}
                      >
                        <span
                          className="absolute size-3.5 rounded-full bg-white shadow-sm transition-transform"
                          style={{ transform: a.is_active ? "translateX(17px)" : "translateX(3px)" }}
                        />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="#" className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow block">
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary"><Plus className="size-4" /></span>
            <span className="text-[0.9375rem] font-semibold tracking-tight">Create Automation</span>
          </div>
          <p className="text-sm text-muted-foreground">Set up a new automated workflow</p>
        </Link>
        <Link href="#" className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow block">
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-flex size-9 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600"><ScrollText className="size-4" /></span>
            <span className="text-[0.9375rem] font-semibold tracking-tight">View Run Logs</span>
          </div>
          <p className="text-sm text-muted-foreground">Inspect execution history & errors</p>
        </Link>
        <Link href="#" className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow block">
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-flex size-9 items-center justify-center rounded-md bg-amber-500/10 text-amber-600"><Settings2 className="size-4" /></span>
            <span className="text-[0.9375rem] font-semibold tracking-tight">Manage Triggers</span>
          </div>
          <p className="text-sm text-muted-foreground">Configure cron schedules & webhooks</p>
        </Link>
      </div>

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
