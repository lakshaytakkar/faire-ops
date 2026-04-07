"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Zap,
  Server,
  Bell,
  Plug,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Activity,
  AlertTriangle,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"

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

function StatusDot({ status }: { status: string | null }) {
  if (status === "success") return <span className="size-2 shrink-0 rounded-full bg-emerald-500" />
  if (status === "failed") return <span className="size-2 shrink-0 rounded-full bg-red-500" />
  if (status === "running") return <span className="size-2 shrink-0 rounded-full bg-amber-500 animate-pulse" />
  return <span className="size-2 shrink-0 rounded-full bg-gray-300" />
}

function TriggerBadge({ triggerType, cron }: { triggerType: string; cron: string | null }) {
  if (triggerType === "cron") {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
        {cronLabel(cron)}
      </span>
    )
  }
  if (triggerType === "event") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
        On event
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
      Manual
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Category Card                                                      */
/* ------------------------------------------------------------------ */

function CategoryCard({
  title,
  description,
  icon: Icon,
  automations,
  onToggle,
  onRun,
  runningIds,
}: {
  title: string
  description: string
  icon: React.ElementType
  automations: Automation[]
  onToggle: (id: string, active: boolean) => void
  onRun: (automation: Automation) => void
  runningIds: Set<string>
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="size-4 text-primary" />
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {automations.length === 0 && (
          <p className="px-4 text-xs text-muted-foreground">No automations in this category.</p>
        )}
        {automations.map((a) => (
          <div key={a.id} className="flex items-center justify-between border-b px-4 py-3 last:border-b-0">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <StatusDot status={a.last_status} />
                <span className="text-sm font-medium truncate">{a.name}</span>
              </div>
              {a.description && (
                <p className="mt-0.5 text-xs text-muted-foreground truncate pl-4">{a.description}</p>
              )}
              <div className="mt-1 flex items-center gap-2 pl-4">
                <TriggerBadge triggerType={a.trigger_type} cron={a.cron_expression} />
                {a.last_run_at && (
                  <span className="text-[10px] text-muted-foreground">{timeAgo(a.last_run_at)}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              {/* Active toggle */}
              <button
                onClick={() => onToggle(a.id, !a.is_active)}
                className="relative flex h-5 w-9 cursor-pointer items-center rounded-full transition-colors"
                style={{ backgroundColor: a.is_active ? "var(--color-primary)" : "var(--color-muted)" }}
                title={a.is_active ? "Active" : "Inactive"}
              >
                <span
                  className="absolute size-3.5 rounded-full bg-white shadow-sm transition-transform"
                  style={{ transform: a.is_active ? "translateX(17px)" : "translateX(3px)" }}
                />
              </button>
              {/* Run button */}
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onRun(a)}
                disabled={runningIds.has(a.id)}
                title="Run Now"
              >
                {runningIds.has(a.id) ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Play className="size-3" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
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

  // Show toast then auto-dismiss
  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // Toggle active state
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

  // Run automation
  async function handleRun(automation: Automation) {
    setRunningIds((prev) => new Set(prev).add(automation.id))
    try {
      const endpoint = (automation.config as Record<string, string>)?.endpoint
      if (endpoint) {
        await fetch(endpoint, { method: "POST" }).catch(() => {})
      }
      // Log the run
      await supabase.from("automation_runs").insert({
        automation_id: automation.id,
        status: "success",
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        duration_ms: 0,
        triggered_by: "manual",
      })
      // Update last_run_at
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

  // Stats
  const total = automations.length
  const active = automations.filter((a) => a.is_active).length
  const failed = automations.filter((a) => a.last_status === "failed").length
  const lastRun = automations
    .filter((a) => a.last_run_at)
    .sort((a, b) => new Date(b.last_run_at!).getTime() - new Date(a.last_run_at!).getTime())[0]

  // Group by category
  const background = automations.filter((a) => a.category === "background")
  const notifications = automations.filter((a) => a.category === "notification")
  const integrations = automations.filter((a) => a.category === "integration")

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Automations</h1>
        <p className="text-sm text-muted-foreground">Manage background tasks, notifications, and integrations</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="size-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
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
              <p className="text-sm font-semibold">{loading ? "-" : lastRun ? timeAgo(lastRun.last_run_at) : "Never"}</p>
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-red-50">
              <AlertTriangle className="size-4 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Failed</p>
              <p className="text-xl font-bold">{loading ? "-" : failed}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Category Cards */}
      {!loading && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <CategoryCard
            title="Background Tasks"
            description="Scheduled jobs and processors"
            icon={Server}
            automations={background}
            onToggle={handleToggle}
            onRun={handleRun}
            runningIds={runningIds}
          />
          <CategoryCard
            title="Notifications"
            description="Email and alert automations"
            icon={Bell}
            automations={notifications}
            onToggle={handleToggle}
            onRun={handleRun}
            runningIds={runningIds}
          />
          <CategoryCard
            title="Integrations"
            description="Sync with external services"
            icon={Plug}
            automations={integrations}
            onToggle={handleToggle}
            onRun={handleRun}
            runningIds={runningIds}
          />
        </div>
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
