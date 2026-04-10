"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Phone,
  Clock,
  Timer,
  PhoneCall,
  Flag,
  ClipboardCheck,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
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

interface CallRow {
  id: string
  call_type: string | null
  call_date: string | null
  call_started_at: string | null
  duration_seconds: number | null
  recording_url: string | null
  user_id: string | null
  emp_name: string | null
  client_name: string | null
  client_number: string | null
}

interface FlaggedCallRow {
  id: string
  call_started_at: string | null
  emp_name: string | null
  client_name: string | null
  client_number: string | null
  call_flags?: { severity: string | null; status: string | null }[] | null
}

interface EmployeeAggregate {
  userId: string | null
  name: string
  avatarUrl: string | null
  totalCalls: number
  totalDurationSeconds: number
  connected: number
}

interface SyncLogRow {
  id: string
  sync_type: string | null
  status: string | null
  started_at: string | null
  completed_at: string | null
  records_processed: number | null
  records_created: number | null
  records_failed: number | null
  error_message: string | null
}

type CallTypeKey = "incoming" | "outgoing" | "missed" | "rejected"

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return "0s"
  const hours = Math.floor(totalSeconds / 3600)
  const mins = Math.floor((totalSeconds % 3600) / 60)
  const secs = Math.floor(totalSeconds % 60)
  if (hours > 0) return `${hours}h ${mins}m`
  if (mins > 0) return `${mins}m ${secs}s`
  return `${secs}s`
}

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

function startOfTodayISO(): string {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now.toISOString()
}

function daysAgoISO(days: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

function normalizeCallType(type: string | null): CallTypeKey | null {
  if (!type) return null
  const t = type.toLowerCase()
  if (t.includes("incom")) return "incoming"
  if (t.includes("outgo") || t.includes("outbound")) return "outgoing"
  if (t.includes("miss")) return "missed"
  if (t.includes("reject") || t.includes("decline")) return "rejected"
  return null
}

function isConnected(call: CallRow): boolean {
  const type = normalizeCallType(call.call_type)
  return (call.duration_seconds ?? 0) > 0 && type !== "missed" && type !== "rejected"
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

function severityVariant(sev: string | null | undefined): "error" | "warning" | "info" | "neutral" {
  if (!sev) return "neutral"
  const s = sev.toLowerCase()
  if (s === "critical" || s === "high") return "error"
  if (s === "medium") return "warning"
  if (s === "low") return "info"
  return "neutral"
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
}: {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  loading: boolean
  tone?: "default" | "amber" | "blue"
}) {
  const tones: Record<string, string> = {
    default: "text-primary bg-primary/10",
    amber: "text-amber-700 bg-amber-50",
    blue: "text-blue-700 bg-blue-50",
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
/*  Charts                                                             */
/* ------------------------------------------------------------------ */

function LineChart({ data }: { data: { date: string; count: number }[] }) {
  const width = 640
  const height = 220
  const padding = { top: 16, right: 16, bottom: 28, left: 32 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom

  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        No data available
      </div>
    )
  }

  const maxCount = Math.max(1, ...data.map((d) => d.count))
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0

  const points = data.map((d, i) => {
    const x = padding.left + i * stepX
    const y = padding.top + innerH - (d.count / maxCount) * innerH
    return { x, y, ...d }
  })

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${(padding.top + innerH).toFixed(
    1,
  )} L${points[0].x.toFixed(1)},${(padding.top + innerH).toFixed(1)} Z`

  const gridLines = 4
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      <defs>
        <linearGradient id="line-chart-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      {Array.from({ length: gridLines + 1 }).map((_, i) => {
        const y = padding.top + (innerH / gridLines) * i
        const val = Math.round(maxCount - (maxCount / gridLines) * i)
        return (
          <g key={i}>
            <line
              x1={padding.left}
              x2={padding.left + innerW}
              y1={y}
              y2={y}
              className="stroke-border"
              strokeWidth={1}
              strokeDasharray="2 3"
            />
            <text x={padding.left - 6} y={y + 3} textAnchor="end" className="fill-muted-foreground" fontSize={10}>
              {val}
            </text>
          </g>
        )
      })}
      <path d={areaPath} fill="url(#line-chart-area)" className="text-primary" />
      <path d={linePath} fill="none" className="stroke-primary" strokeWidth={2} strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.5} className="fill-primary" />
      ))}
      {points.map((p, i) => {
        const show = i === 0 || i === points.length - 1 || i === Math.floor(points.length / 2)
        if (!show) return null
        const label = new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        return (
          <text
            key={`x-${i}`}
            x={p.x}
            y={height - 8}
            textAnchor="middle"
            className="fill-muted-foreground"
            fontSize={10}
          >
            {label}
          </text>
        )
      })}
    </svg>
  )
}

function DonutChart({ data }: { data: { key: CallTypeKey; label: string; value: number; color: string }[] }) {
  const size = 220
  const cx = size / 2
  const cy = size / 2
  const radius = 80
  const innerRadius = 50
  const total = data.reduce((s, d) => s + d.value, 0)

  if (total === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        No data available
      </div>
    )
  }

  let acc = 0
  const arcs = data.map((d) => {
    const startAngle = (acc / total) * Math.PI * 2 - Math.PI / 2
    acc += d.value
    const endAngle = (acc / total) * Math.PI * 2 - Math.PI / 2
    const large = endAngle - startAngle > Math.PI ? 1 : 0

    const x1 = cx + radius * Math.cos(startAngle)
    const y1 = cy + radius * Math.sin(startAngle)
    const x2 = cx + radius * Math.cos(endAngle)
    const y2 = cy + radius * Math.sin(endAngle)

    const ix1 = cx + innerRadius * Math.cos(endAngle)
    const iy1 = cy + innerRadius * Math.sin(endAngle)
    const ix2 = cx + innerRadius * Math.cos(startAngle)
    const iy2 = cy + innerRadius * Math.sin(startAngle)

    const path = [
      `M ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`,
      `L ${ix1} ${iy1}`,
      `A ${innerRadius} ${innerRadius} 0 ${large} 0 ${ix2} ${iy2}`,
      "Z",
    ].join(" ")
    return { ...d, path }
  })

  return (
    <div className="flex items-center gap-6">
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="shrink-0">
        {arcs.map((a) => (
          <path key={a.key} d={a.path} fill={a.color} />
        ))}
        <text x={cx} y={cy - 4} textAnchor="middle" className="fill-foreground" fontSize={22} fontWeight={700}>
          {total}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" className="fill-muted-foreground" fontSize={10}>
          Total calls
        </text>
      </svg>
      <div className="flex-1 space-y-2">
        {arcs.map((a) => {
          const pct = total > 0 ? Math.round((a.value / total) * 100) : 0
          return (
            <div key={a.key} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="inline-block size-2.5 rounded-sm" style={{ background: a.color }} />
                <span className="text-foreground">{a.label}</span>
              </div>
              <div className="text-muted-foreground">
                <span className="font-medium text-foreground">{a.value}</span>{" "}
                <span className="text-xs">({pct}%)</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BarChart({ data }: { data: { hour: number; count: number }[] }) {
  const width = 960
  const height = 220
  const padding = { top: 16, right: 16, bottom: 28, left: 32 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom

  const maxCount = Math.max(1, ...data.map((d) => d.count))
  const barWidth = innerW / 24 - 6

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {Array.from({ length: 5 }).map((_, i) => {
        const y = padding.top + (innerH / 4) * i
        return (
          <line
            key={i}
            x1={padding.left}
            x2={padding.left + innerW}
            y1={y}
            y2={y}
            className="stroke-border"
            strokeWidth={1}
            strokeDasharray="2 3"
          />
        )
      })}
      {data.map((d) => {
        const barHeight = (d.count / maxCount) * innerH
        const x = padding.left + (innerW / 24) * d.hour + 3
        const y = padding.top + innerH - barHeight
        return (
          <g key={d.hour}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={3}
              className="fill-primary/80"
            />
            {d.hour % 3 === 0 && (
              <text
                x={x + barWidth / 2}
                y={height - 8}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize={10}
              >
                {d.hour.toString().padStart(2, "0")}:00
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function QaDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [todayCalls, setTodayCalls] = useState<CallRow[]>([])
  const [last30Calls, setLast30Calls] = useState<CallRow[]>([])
  const [last7Calls, setLast7Calls] = useState<CallRow[]>([])
  const [openFlagsCount, setOpenFlagsCount] = useState(0)
  const [pendingReviewsCount, setPendingReviewsCount] = useState(0)
  const [flaggedCalls, setFlaggedCalls] = useState<FlaggedCallRow[]>([])
  const [userMap, setUserMap] = useState<
    Record<string, { full_name: string | null; avatar_url: string | null; email: string | null }>
  >({})
  const [latestSync, setLatestSync] = useState<SyncLogRow | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadAll() {
      setLoading(true)

      const todayIso = startOfTodayISO()
      const last7Iso = daysAgoISO(7)
      const last30Iso = daysAgoISO(30)

      const [
        todayRes,
        last7Res,
        last30Res,
        openFlagsRes,
        pendingReviewsRes,
        flaggedCallsRes,
        latestSyncRes,
      ] = await Promise.all([
        supabase
          .from("calls")
          .select(
            "id, call_type, call_date, call_started_at, duration_seconds, recording_url, user_id, emp_name, client_name, client_number",
          )
          .gte("call_started_at", todayIso),
        supabase
          .from("calls")
          .select(
            "id, call_type, call_date, call_started_at, duration_seconds, recording_url, user_id, emp_name, client_name, client_number",
          )
          .gte("call_started_at", last7Iso),
        supabase
          .from("calls")
          .select(
            "id, call_type, call_date, call_started_at, duration_seconds, recording_url, user_id, emp_name, client_name, client_number",
          )
          .gte("call_started_at", last30Iso),
        supabase.from("call_flags").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase
          .from("call_qa_reviews")
          .select("id", { count: "exact", head: true })
          .is("overall_score", null),
        supabase
          .from("calls")
          .select(
            "id, call_started_at, emp_name, client_name, client_number, call_flags!inner(severity, status)",
          )
          .order("call_started_at", { ascending: false })
          .limit(10),
        supabase
          .from("callyzer_sync_log")
          .select(
            "id, sync_type, status, started_at, completed_at, records_processed, records_created, records_failed, error_message",
          )
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

      if (cancelled) return

      const today = (todayRes.data ?? []) as CallRow[]
      const last7 = (last7Res.data ?? []) as CallRow[]
      const last30 = (last30Res.data ?? []) as CallRow[]

      setTodayCalls(today)
      setLast7Calls(last7)
      setLast30Calls(last30)
      setOpenFlagsCount(openFlagsRes.count ?? 0)
      setPendingReviewsCount(pendingReviewsRes.count ?? 0)
      setFlaggedCalls((flaggedCallsRes.data ?? []) as FlaggedCallRow[])
      setLatestSync((latestSyncRes.data ?? null) as SyncLogRow | null)

      // Fetch user profiles for last7 calls
      const userIds = Array.from(
        new Set(last7.map((c) => c.user_id).filter((u): u is string => Boolean(u))),
      )
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("id, full_name, avatar_url, email")
          .in("id", userIds)
        if (!cancelled && users) {
          const map: Record<string, { full_name: string | null; avatar_url: string | null; email: string | null }> = {}
          for (const u of users as { id: string; full_name: string | null; avatar_url: string | null; email: string | null }[]) {
            map[u.id] = { full_name: u.full_name, avatar_url: u.avatar_url, email: u.email }
          }
          setUserMap(map)
        }
      }

      setLoading(false)
    }

    loadAll()
    return () => {
      cancelled = true
    }
  }, [])

  /* ---------- derived stats ---------- */

  const totalCallsToday = todayCalls.length
  const totalDurationTodaySeconds = todayCalls.reduce((sum, c) => sum + (c.duration_seconds ?? 0), 0)
  const avgDurationToday =
    totalCallsToday > 0 ? Math.round(totalDurationTodaySeconds / totalCallsToday) : 0
  const connectedToday = todayCalls.filter(isConnected).length
  const connectRate = totalCallsToday > 0 ? Math.round((connectedToday / totalCallsToday) * 100) : 0

  /* ---------- chart: 30-day volume ---------- */

  const dailyVolume = useMemo(() => {
    const buckets: Record<string, number> = {}
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - i)
      buckets[d.toISOString().slice(0, 10)] = 0
    }
    for (const c of last30Calls) {
      if (!c.call_started_at) continue
      const key = new Date(c.call_started_at).toISOString().slice(0, 10)
      if (key in buckets) buckets[key] += 1
    }
    return Object.entries(buckets).map(([date, count]) => ({ date, count }))
  }, [last30Calls])

  /* ---------- chart: type breakdown ---------- */

  const typeBreakdown = useMemo(() => {
    const counts: Record<CallTypeKey, number> = {
      incoming: 0,
      outgoing: 0,
      missed: 0,
      rejected: 0,
    }
    for (const c of last30Calls) {
      const t = normalizeCallType(c.call_type)
      if (t) counts[t] += 1
    }
    return [
      { key: "incoming" as const, label: "Incoming", value: counts.incoming, color: "#10b981" },
      { key: "outgoing" as const, label: "Outgoing", value: counts.outgoing, color: "#3b82f6" },
      { key: "missed" as const, label: "Missed", value: counts.missed, color: "#f59e0b" },
      { key: "rejected" as const, label: "Rejected", value: counts.rejected, color: "#ef4444" },
    ]
  }, [last30Calls])

  /* ---------- chart: hourly distribution ---------- */

  const hourlyDistribution = useMemo(() => {
    const buckets: number[] = Array.from({ length: 24 }, () => 0)
    for (const c of last7Calls) {
      if (!c.call_started_at) continue
      const h = new Date(c.call_started_at).getHours()
      buckets[h] += 1
    }
    return buckets.map((count, hour) => ({ hour, count }))
  }, [last7Calls])

  /* ---------- top 5 employees (last 7 days) ---------- */

  const topEmployees = useMemo(() => {
    const agg = new Map<string, EmployeeAggregate>()
    for (const c of last7Calls) {
      const key = c.user_id ?? `name:${c.emp_name ?? "unknown"}`
      const current = agg.get(key) ?? {
        userId: c.user_id ?? null,
        name: c.emp_name ?? "Unknown",
        avatarUrl: null,
        totalCalls: 0,
        totalDurationSeconds: 0,
        connected: 0,
      }
      current.totalCalls += 1
      current.totalDurationSeconds += c.duration_seconds ?? 0
      if (isConnected(c)) current.connected += 1
      if (c.user_id && userMap[c.user_id]) {
        current.name = userMap[c.user_id].full_name ?? current.name
        current.avatarUrl = userMap[c.user_id].avatar_url
      }
      agg.set(key, current)
    }
    return Array.from(agg.values())
      .sort((a, b) => b.totalCalls - a.totalCalls)
      .slice(0, 5)
  }, [last7Calls, userMap])

  /* ---------- render ---------- */

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <SubNav items={SUB_NAV_ITEMS} />

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">QA Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Marketing call quality and reviewer command center.
          </p>
        </div>
        <Link href="/workspace/qa/sync">
          <Button variant="outline" size="sm">
            <RefreshCw className="size-3.5" /> Sync settings
          </Button>
        </Link>
      </div>

      {/* Sync status banner */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <RefreshCw className="size-4" />
            </span>
            <div>
              <div className="text-sm font-medium">
                Latest sync{latestSync?.sync_type ? ` · ${latestSync.sync_type}` : ""}
              </div>
              <div className="text-xs text-muted-foreground">
                {latestSync
                  ? `${timeAgo(latestSync.started_at)} · ${latestSync.records_processed ?? 0} processed`
                  : "No sync runs yet"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {latestSync ? (
              <StatusBadge
                label={(latestSync.status ?? "unknown").toUpperCase()}
                variant={syncStatusVariant(latestSync.status)}
              />
            ) : (
              <StatusBadge label="NO DATA" variant="neutral" />
            )}
            <Link href="/workspace/qa/sync" className="text-xs font-medium text-primary hover:underline">
              View history
            </Link>
          </div>
        </div>
      </div>

      {/* Primary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Calls Today" value={totalCallsToday} icon={Phone} loading={loading} />
        <StatCard
          label="Total Duration"
          value={formatDuration(totalDurationTodaySeconds)}
          icon={Clock}
          loading={loading}
        />
        <StatCard
          label="Avg Call Duration"
          value={formatDuration(avgDurationToday)}
          icon={Timer}
          loading={loading}
        />
        <StatCard
          label="Connect Rate"
          value={`${connectRate}%`}
          icon={PhoneCall}
          loading={loading}
        />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Open Flags" value={openFlagsCount} icon={Flag} loading={loading} tone="amber" />
        <StatCard
          label="Pending QA Reviews"
          value={pendingReviewsCount}
          icon={ClipboardCheck}
          loading={loading}
          tone="blue"
        />
      </div>

      {/* Charts: volume + type breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
            Daily Call Volume · Last 30 days
          </div>
          <div className="p-5">
            {loading ? (
              <div className="h-[220px] w-full animate-pulse rounded bg-muted" />
            ) : (
              <LineChart data={dailyVolume} />
            )}
          </div>
        </div>
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
            Calls by Type · Last 30 days
          </div>
          <div className="p-5">
            {loading ? (
              <div className="h-[220px] w-full animate-pulse rounded bg-muted" />
            ) : (
              <DonutChart data={typeBreakdown} />
            )}
          </div>
        </div>
      </div>

      {/* Hourly distribution */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
          Hourly Distribution · Last 7 days
        </div>
        <div className="p-5">
          {loading ? (
            <div className="h-[220px] w-full animate-pulse rounded bg-muted" />
          ) : (
            <BarChart data={hourlyDistribution} />
          )}
        </div>
      </div>

      {/* Top employees */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
          Top 5 Employees · Last 7 days
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Employee
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Total Calls
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Avg Duration
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Connect Rate
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={4} />)
              ) : topEmployees.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No calls in the last 7 days.
                  </td>
                </tr>
              ) : (
                topEmployees.map((e) => {
                  const avg =
                    e.totalCalls > 0 ? Math.round(e.totalDurationSeconds / e.totalCalls) : 0
                  const rate =
                    e.totalCalls > 0 ? Math.round((e.connected / e.totalCalls) * 100) : 0
                  const initials =
                    e.name
                      ?.split(" ")
                      .map((p) => p[0])
                      .filter(Boolean)
                      .slice(0, 2)
                      .join("")
                      .toUpperCase() || "?"
                  return (
                    <tr key={`${e.userId}-${e.name}`} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {e.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={e.avatarUrl}
                              alt={e.name}
                              className="size-8 rounded-full object-cover"
                            />
                          ) : (
                            <span className="inline-flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                              {initials}
                            </span>
                          )}
                          <span className="font-medium">{e.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{e.totalCalls}</td>
                      <td className="px-4 py-3">{formatDuration(avg)}</td>
                      <td className="px-4 py-3">{rate}%</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent flagged calls */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight flex items-center gap-2">
          <AlertTriangle className="size-4 text-amber-600" /> Recent Flagged Calls
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Employee
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Client
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Severity
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
              ) : flaggedCalls.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No flagged calls.
                  </td>
                </tr>
              ) : (
                flaggedCalls.map((c) => {
                  const topSeverity = c.call_flags?.[0]?.severity ?? null
                  return (
                    <tr key={c.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3 text-muted-foreground">{timeAgo(c.call_started_at)}</td>
                      <td className="px-4 py-3">{c.emp_name ?? "—"}</td>
                      <td className="px-4 py-3">{c.client_name ?? c.client_number ?? "—"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          label={(topSeverity ?? "n/a").toUpperCase()}
                          variant={severityVariant(topSeverity)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/workspace/qa/calls/${c.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          View <ArrowRight className="size-3" />
                        </Link>
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

