"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Clock,
  Download,
  Shuffle,
  Database,
  Bell,
  GitBranch,
  Timer,
  Zap,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Globe,
  Mail,
  MessageCircle,
  Filter,
  ShoppingCart,
  FileText,
  User,
  Truck,
  Wallet,
  ShoppingBag,
  type LucideIcon,
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
  trigger_type: string
  cron_expression: string | null
  config: Record<string, unknown>
  is_active: boolean
  last_run_at: string | null
  last_status: string | null
  run_count: number
}

interface Step {
  id: string
  automation_id: string
  step_order: number
  type: string
  label: string
  description: string | null
  config: Record<string, unknown>
  icon: string | null
  position_x: number
  position_y: number
}

interface Connection {
  id: string
  from_step_id: string
  to_step_id: string
  label: string | null
}

interface Run {
  id: string
  status: string
  started_at: string
  completed_at: string | null
  duration_ms: number | null
  result: Record<string, unknown> | null
  error_message: string | null
  triggered_by: string
}

/* ------------------------------------------------------------------ */
/*  Node styling                                                       */
/* ------------------------------------------------------------------ */

const NODE_STYLES: Record<string, { bg: string; border: string; iconBg: string; text: string }> = {
  trigger: { bg: "bg-blue-50", border: "border-blue-200", iconBg: "bg-blue-100 text-blue-600", text: "text-blue-700" },
  fetch: { bg: "bg-indigo-50", border: "border-indigo-200", iconBg: "bg-indigo-100 text-indigo-600", text: "text-indigo-700" },
  transform: { bg: "bg-purple-50", border: "border-purple-200", iconBg: "bg-purple-100 text-purple-600", text: "text-purple-700" },
  save: { bg: "bg-emerald-50", border: "border-emerald-200", iconBg: "bg-emerald-100 text-emerald-600", text: "text-emerald-700" },
  notify: { bg: "bg-amber-50", border: "border-amber-200", iconBg: "bg-amber-100 text-amber-600", text: "text-amber-700" },
  condition: { bg: "bg-orange-50", border: "border-orange-200", iconBg: "bg-orange-100 text-orange-600", text: "text-orange-700" },
  delay: { bg: "bg-slate-50", border: "border-slate-200", iconBg: "bg-slate-100 text-slate-600", text: "text-slate-700" },
}

const ICON_MAP: Record<string, LucideIcon> = {
  Clock, Download, Shuffle, Database, Bell, GitBranch, Timer, Zap, Globe, Mail,
  MessageCircle, Filter, ShoppingCart, FileText, User, Truck, Wallet, ShoppingBag,
  CheckCircle: CheckCircle2,
}

function resolveIcon(name: string | null): LucideIcon {
  if (!name) return Zap
  return ICON_MAP[name] ?? Zap
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
  return `${days}d ago`
}

function humanCron(expr: string | null): string {
  if (!expr) return "Manual / Event"
  const parts = expr.trim().split(/\s+/)
  if (parts.length < 5) return expr
  const [min, hour] = parts
  if (min.startsWith("*/")) return `Every ${min.slice(2)} minutes`
  if (hour === "*" && !min.startsWith("*")) return min === "0" ? "Every hour" : `Every hour at :${min.padStart(2, "0")}`
  if (hour.startsWith("*/")) return `Every ${hour.slice(2)} hours`
  if (hour !== "*" && !hour.includes("/")) {
    const h = parseInt(hour, 10)
    const period = h >= 12 ? "pm" : "am"
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    if (parts[4] === "1-5") return `Weekdays at ${h12}:${min.padStart(2, "0")}${period}`
    return `Daily at ${h12}:${min.padStart(2, "0")}${period}`
  }
  return expr
}

function formatDuration(ms: number | null): string {
  if (!ms) return "-"
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

/* ------------------------------------------------------------------ */
/*  Flow Canvas (SVG-based)                                            */
/* ------------------------------------------------------------------ */

const NODE_W = 180
const NODE_H = 72

function FlowCanvas({ steps, connections }: { steps: Step[]; connections: Connection[] }) {
  if (steps.length === 0) return <div className="py-12 text-center text-sm text-muted-foreground">No flow steps defined</div>

  // Calculate canvas bounds
  const maxX = Math.max(...steps.map(s => s.position_x)) + NODE_W + 40
  const maxY = Math.max(...steps.map(s => s.position_y)) + NODE_H + 40
  const canvasW = Math.max(maxX, 800)
  const canvasH = Math.max(maxY, 300)

  const stepMap = new Map(steps.map(s => [s.id, s]))

  return (
    <div className="w-full overflow-x-auto rounded-lg border bg-[#fafbfc] dark:bg-card">
      <svg width={canvasW} height={canvasH} className="block">
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="hsl(var(--muted-foreground) / 0.4)" />
          </marker>
        </defs>

        {/* Edges */}
        {connections.map((conn) => {
          const from = stepMap.get(conn.from_step_id)
          const to = stepMap.get(conn.to_step_id)
          if (!from || !to) return null

          const x1 = from.position_x + NODE_W + 20
          const y1 = from.position_y + NODE_H / 2 + 20
          const x2 = to.position_x + 20
          const y2 = to.position_y + NODE_H / 2 + 20

          // Curved path
          const midX = (x1 + x2) / 2
          const path = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`

          return (
            <g key={conn.id}>
              <path
                d={path}
                fill="none"
                stroke="hsl(var(--muted-foreground) / 0.25)"
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />
              {conn.label && conn.label !== "next" && (
                <text
                  x={midX}
                  y={Math.min(y1, y2) - 6}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[9px]"
                >
                  {conn.label}
                </text>
              )}
            </g>
          )
        })}

        {/* Nodes */}
        {steps.map((step) => {
          const style = NODE_STYLES[step.type] ?? NODE_STYLES.trigger
          const Icon = resolveIcon(step.icon)
          const x = step.position_x + 20
          const y = step.position_y + 20

          return (
            <foreignObject key={step.id} x={x} y={y} width={NODE_W} height={NODE_H}>
              <div
                className={`h-full rounded-lg border-2 ${style.border} ${style.bg} p-3 flex items-start gap-2.5 shadow-sm transition-shadow hover:shadow-md cursor-default`}
              >
                <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${style.iconBg}`}>
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-semibold leading-tight truncate ${style.text}`}>{step.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 line-clamp-2">{step.description}</p>
                </div>
              </div>
            </foreignObject>
          )
        })}
      </svg>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AutomationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [automation, setAutomation] = useState<Automation | null>(null)
  const [steps, setSteps] = useState<Step[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [runs, setRuns] = useState<Run[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [expandedRun, setExpandedRun] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [autoRes, stepsRes, connsRes, runsRes] = await Promise.all([
        supabase.from("automations").select("*").eq("id", id).single(),
        supabase.from("automation_steps").select("*").eq("automation_id", id).order("step_order"),
        supabase.from("automation_step_connections").select("*").eq("automation_id", id),
        supabase.from("automation_runs").select("*").eq("automation_id", id).order("started_at", { ascending: false }).limit(20),
      ])
      if (autoRes.data) setAutomation(autoRes.data as Automation)
      setSteps((stepsRes.data ?? []) as Step[])
      setConnections((connsRes.data ?? []) as Connection[])
      setRuns((runsRes.data ?? []) as Run[])
      setLoading(false)
    }
    load()
  }, [id])

  async function handleRun() {
    if (!automation) return
    setRunning(true)
    try {
      const endpoint = (automation.config as Record<string, string>)?.endpoint
      if (endpoint) await fetch(endpoint, { method: "POST" }).catch(() => {})
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
      setAutomation(prev => prev ? { ...prev, last_run_at: new Date().toISOString(), last_status: "success", run_count: (prev.run_count || 0) + 1 } : null)
    } catch {} finally {
      setRunning(false)
    }
  }

  async function handleToggle() {
    if (!automation) return
    const newActive = !automation.is_active
    await supabase.from("automations").update({ is_active: newActive }).eq("id", automation.id)
    setAutomation(prev => prev ? { ...prev, is_active: newActive } : null)
  }

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto w-full py-20 text-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground mx-auto" />
      </div>
    )
  }

  if (!automation) {
    return (
      <div className="max-w-[1440px] mx-auto w-full py-20 text-center text-sm text-muted-foreground">
        Automation not found
      </div>
    )
  }

  const typeBadge: Record<string, string> = {
    sync: "bg-blue-50 text-blue-700",
    notification: "bg-amber-50 text-amber-700",
    integration: "bg-purple-50 text-purple-700",
    email: "bg-red-50 text-red-700",
    scheduled_task: "bg-teal-50 text-teal-700",
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-6">
      {/* Back + Header */}
      <div>
        <Link href="/automations/overview" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="size-3.5" />
          Back to Automations
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-heading">{automation.name}</h1>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeBadge[automation.type] ?? "bg-muted text-muted-foreground"}`}>
                {automation.type}
              </span>
              <span className="flex items-center gap-1.5 text-sm">
                <span className={`size-2 rounded-full ${automation.is_active ? "bg-emerald-500" : "bg-gray-300"}`} />
                {automation.is_active ? "Active" : "Inactive"}
              </span>
            </div>
            {automation.description && (
              <p className="text-sm text-muted-foreground mt-1">{automation.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRun} disabled={running}>
              {running ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Play className="size-3.5 mr-1.5" />}
              Run Now
            </Button>
            <button
              onClick={handleToggle}
              className="relative flex h-5 w-9 cursor-pointer items-center rounded-full transition-colors"
              style={{ backgroundColor: automation.is_active ? "var(--color-primary)" : "var(--color-muted)" }}
            >
              <span
                className="absolute size-3.5 rounded-full bg-white shadow-sm transition-transform"
                style={{ transform: automation.is_active ? "translateX(17px)" : "translateX(3px)" }}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Meta cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card size="sm"><CardContent className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-blue-50"><Clock className="size-4 text-blue-600" /></div>
          <div><p className="text-xs text-muted-foreground">Schedule</p><p className="text-sm font-semibold">{humanCron(automation.cron_expression)}</p></div>
        </CardContent></Card>
        <Card size="sm"><CardContent className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-50"><CheckCircle2 className="size-4 text-emerald-600" /></div>
          <div><p className="text-xs text-muted-foreground">Last Run</p><p className="text-sm font-semibold">{timeAgo(automation.last_run_at)}</p></div>
        </CardContent></Card>
        <Card size="sm"><CardContent className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-purple-50"><Zap className="size-4 text-purple-600" /></div>
          <div><p className="text-xs text-muted-foreground">Total Runs</p><p className="text-sm font-semibold">{automation.run_count}</p></div>
        </CardContent></Card>
        <Card size="sm"><CardContent className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-amber-50"><GitBranch className="size-4 text-amber-600" /></div>
          <div><p className="text-xs text-muted-foreground">Steps</p><p className="text-sm font-semibold">{steps.length} nodes</p></div>
        </CardContent></Card>
      </div>

      {/* Flow Canvas */}
      <div>
        <h2 className="text-base font-semibold font-heading mb-3">Automation Flow</h2>
        <FlowCanvas steps={steps} connections={connections} />
      </div>

      {/* Run History */}
      <div>
        <h2 className="text-base font-semibold font-heading mb-3">Run History</h2>
        {runs.length === 0 ? (
          <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
            No runs recorded yet
          </div>
        ) : (
          <div className="rounded-lg border bg-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Time</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Status</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Duration</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Triggered By</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Details</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(run.started_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        run.status === "success" ? "bg-emerald-50 text-emerald-700" : run.status === "failed" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"
                      }`}>
                        {run.status === "success" ? <CheckCircle2 className="size-3" /> : run.status === "failed" ? <XCircle className="size-3" /> : <Loader2 className="size-3 animate-spin" />}
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm tabular-nums">{formatDuration(run.duration_ms)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground capitalize">{run.triggered_by}</td>
                    <td className="px-4 py-3">
                      {(run.result || run.error_message) && (
                        <button
                          onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                          className="text-xs text-primary hover:underline"
                        >
                          {expandedRun === run.id ? "Hide" : "Show"}
                        </button>
                      )}
                      {expandedRun === run.id && (
                        <pre className="mt-2 p-2 rounded bg-muted text-[10px] leading-relaxed overflow-x-auto max-h-32 whitespace-pre-wrap">
                          {run.error_message ? `Error: ${run.error_message}` : JSON.stringify(run.result, null, 2)}
                        </pre>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
