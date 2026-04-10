"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  LifeBuoy,
  Ticket,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Plus,
  ArrowUpRight,
  User,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { SubNav } from "@/components/shared/sub-nav"
import { NewTicketModal } from "@/components/shared/new-ticket-modal"

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type TicketStatus =
  | "open"
  | "triaged"
  | "in_progress"
  | "waiting_on_reporter"
  | "waiting_on_third_party"
  | "resolved"
  | "closed"
  | "reopened"

type TicketPriority = "low" | "medium" | "high" | "urgent" | "critical"
type TicketSource = "internal" | "client"

interface TicketRow {
  id: string
  ticket_number: number
  title: string
  source: TicketSource
  status: TicketStatus
  priority: TicketPriority
  category_id: string | null
  assignee_user_id: string | null
  reporter_name: string | null
  due_at: string | null
  resolved_at: string | null
  closed_at: string | null
  created_at: string
  updated_at: string
}

interface CategoryRow {
  id: string
  name: string
  color: string | null
}

interface UserRow {
  id: string
  full_name: string | null
  avatar_url: string | null
}

const STATUS_STYLES: Record<TicketStatus, string> = {
  open: "bg-blue-50 text-blue-700",
  triaged: "bg-cyan-50 text-cyan-700",
  in_progress: "bg-amber-50 text-amber-700",
  waiting_on_reporter: "bg-orange-50 text-orange-700",
  waiting_on_third_party: "bg-yellow-50 text-yellow-700",
  resolved: "bg-emerald-50 text-emerald-700",
  closed: "bg-slate-100 text-slate-600",
  reopened: "bg-red-50 text-red-700",
}

const STATUS_COLORS: Record<TicketStatus, string> = {
  open: "#3b82f6",
  triaged: "#06b6d4",
  in_progress: "#f59e0b",
  waiting_on_reporter: "#f97316",
  waiting_on_third_party: "#eab308",
  resolved: "#10b981",
  closed: "#94a3b8",
  reopened: "#ef4444",
}

const PRIORITY_DOT: Record<TicketPriority, string> = {
  low: "bg-slate-300",
  medium: "bg-blue-500",
  high: "bg-amber-500",
  urgent: "bg-orange-500",
  critical: "bg-red-500",
}

const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Open",
  triaged: "Triaged",
  in_progress: "In Progress",
  waiting_on_reporter: "Waiting Reporter",
  waiting_on_third_party: "Waiting 3rd Party",
  resolved: "Resolved",
  closed: "Closed",
  reopened: "Reopened",
}

const TICKETS_SUBNAV = [
  { title: "Dashboard", href: "/workspace/tickets/dashboard" },
  { title: "All", href: "/workspace/tickets/all" },
  { title: "Internal", href: "/workspace/tickets/internal" },
  { title: "Client", href: "/workspace/tickets/client" },
  { title: "Categories", href: "/workspace/tickets/categories" },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDue(iso: string | null): { label: string; overdue: boolean } {
  if (!iso) return { label: "—", overdue: false }
  const d = new Date(iso)
  const now = new Date()
  const overdue = d.getTime() < now.getTime()
  return {
    label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    overdue,
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TicketsDashboardPage() {
  const [tickets, setTickets] = useState<TicketRow[]>([])
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  async function load() {
    setLoading(true)
    const [ticketRes, catRes, userRes] = await Promise.all([
      supabase
        .from("tickets")
        .select(
          "id, ticket_number, title, source, status, priority, category_id, assignee_user_id, reporter_name, due_at, resolved_at, closed_at, created_at, updated_at",
        )
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("ticket_categories").select("id, name, color"),
      supabase.from("users").select("id, full_name, avatar_url").limit(200),
    ])
    setTickets((ticketRes.data as TicketRow[]) ?? [])
    setCategories((catRes.data as CategoryRow[]) ?? [])
    setUsers((userRes.data as UserRow[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  // ---- Derived metrics ----
  const now = Date.now()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const metrics = useMemo(() => {
    const openCount = tickets.filter((t) =>
      ["open", "triaged", "reopened"].includes(t.status),
    ).length
    const inProgressCount = tickets.filter((t) => t.status === "in_progress").length
    const resolvedToday = tickets.filter(
      (t) => t.resolved_at && new Date(t.resolved_at).getTime() >= todayStart.getTime(),
    ).length

    // Average resolution time in hours for resolved in last 30 days
    const thirtyAgo = now - 30 * 86400000
    const resolvedRecent = tickets.filter(
      (t) => t.resolved_at && new Date(t.resolved_at).getTime() >= thirtyAgo,
    )
    const avgMs =
      resolvedRecent.length === 0
        ? 0
        : resolvedRecent.reduce(
            (sum, t) =>
              sum +
              (new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime()),
            0,
          ) / resolvedRecent.length
    const avgHours = Math.round(avgMs / 3600000)

    const overdueCount = tickets.filter(
      (t) =>
        t.due_at &&
        new Date(t.due_at).getTime() < now &&
        !["resolved", "closed"].includes(t.status),
    ).length

    const slaRiskCount = tickets.filter((t) => {
      if (!t.due_at) return false
      const diff = new Date(t.due_at).getTime() - now
      return (
        diff >= 0 &&
        diff <= 2 * 3600000 &&
        !["resolved", "closed"].includes(t.status)
      )
    }).length

    return {
      openCount,
      inProgressCount,
      resolvedToday,
      avgHours,
      overdueCount,
      slaRiskCount,
    }
  }, [tickets, now, todayStart])

  // Status counts for donut
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    tickets.forEach((t) => {
      counts[t.status] = (counts[t.status] ?? 0) + 1
    })
    return counts
  }, [tickets])

  // Volume trend last 14 days
  const volumeSeries = useMemo(() => {
    const days: { day: string; created: number; resolved: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - i)
      const start = d.getTime()
      const end = start + 86400000
      const created = tickets.filter((t) => {
        const ts = new Date(t.created_at).getTime()
        return ts >= start && ts < end
      }).length
      const resolved = tickets.filter((t) => {
        if (!t.resolved_at) return false
        const ts = new Date(t.resolved_at).getTime()
        return ts >= start && ts < end
      }).length
      days.push({
        day: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        created,
        resolved,
      })
    }
    return days
  }, [tickets])

  // Source split
  const sourceSplit = useMemo(() => {
    const internal = tickets.filter((t) => t.source === "internal").length
    const client = tickets.filter((t) => t.source === "client").length
    return { internal, client, total: internal + client }
  }, [tickets])

  // Top categories
  const topCategories = useMemo(() => {
    const counts: Record<string, number> = {}
    tickets.forEach((t) => {
      if (t.category_id) counts[t.category_id] = (counts[t.category_id] ?? 0) + 1
    })
    const rows = Object.entries(counts)
      .map(([id, count]) => ({
        id,
        name: categories.find((c) => c.id === id)?.name ?? "Unknown",
        color: categories.find((c) => c.id === id)?.color ?? "#64748b",
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
    return rows
  }, [tickets, categories])

  const recentTickets = tickets.slice(0, 10)

  const userMap = useMemo(() => {
    const m = new Map<string, UserRow>()
    users.forEach((u) => m.set(u.id, u))
    return m
  }, [users])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <SubNav items={TICKETS_SUBNAV} />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Tickets Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Track and resolve issues from clients and team
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" /> New Ticket
        </Button>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Open Tickets"
              value={metrics.openCount}
              icon={Ticket}
              tint="bg-blue-50 text-blue-600"
            />
            <StatCard
              label="In Progress"
              value={metrics.inProgressCount}
              icon={RefreshCw}
              tint="bg-amber-50 text-amber-600"
            />
            <StatCard
              label="Resolved Today"
              value={metrics.resolvedToday}
              icon={CheckCircle2}
              tint="bg-emerald-50 text-emerald-600"
            />
            <StatCard
              label="Avg Resolution"
              value={`${metrics.avgHours}h`}
              icon={Clock}
              tint="bg-violet-50 text-violet-600"
            />
          </div>

          {/* Secondary cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Overdue</p>
                  <p className="text-xl font-bold font-heading">{metrics.overdueCount}</p>
                </div>
                <span className="text-xs text-muted-foreground">past due date</span>
              </div>
            </div>
            <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">SLA Breach Risk</p>
                  <p className="text-xl font-bold font-heading">{metrics.slaRiskCount}</p>
                </div>
                <span className="text-xs text-muted-foreground">within 2h of due</span>
              </div>
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Status donut */}
            <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
                Status Breakdown
              </div>
              <div className="p-5">
                <StatusDonut counts={statusCounts} total={tickets.length} />
              </div>
            </div>

            {/* Volume trend */}
            <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
                Volume Trend (14 days)
              </div>
              <div className="p-5">
                <VolumeChart data={volumeSeries} />
              </div>
            </div>
          </div>

          {/* Source + Top categories */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
                Source Split
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">Internal</span>
                  <span className="text-muted-foreground">
                    {sourceSplit.internal} tickets
                  </span>
                </div>
                <div className="relative h-3 rounded-full overflow-hidden bg-muted">
                  <div
                    className="h-full bg-blue-500"
                    style={{
                      width: `${
                        sourceSplit.total === 0
                          ? 0
                          : (sourceSplit.internal / sourceSplit.total) * 100
                      }%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">Client</span>
                  <span className="text-muted-foreground">
                    {sourceSplit.client} tickets
                  </span>
                </div>
                <div className="relative h-3 rounded-full overflow-hidden bg-muted">
                  <div
                    className="h-full bg-violet-500"
                    style={{
                      width: `${
                        sourceSplit.total === 0
                          ? 0
                          : (sourceSplit.client / sourceSplit.total) * 100
                      }%`,
                    }}
                  />
                </div>
                <div className="pt-2 border-t text-xs text-muted-foreground">
                  {sourceSplit.total} total
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
                Top Categories
              </div>
              <div className="p-5 space-y-3">
                {topCategories.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No categories yet</p>
                ) : (
                  topCategories.map((c) => {
                    const max = topCategories[0].count || 1
                    const pct = (c.count / max) * 100
                    return (
                      <div key={c.id}>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-medium text-foreground">{c.name}</span>
                          <span className="text-muted-foreground">{c.count}</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden bg-muted">
                          <div
                            className="h-full"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: c.color ?? "#64748b",
                            }}
                          />
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* Recent tickets table */}
          <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight flex items-center justify-between">
              Recent Tickets
              <Link
                href="/workspace/tickets/all"
                className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
              >
                View all <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="text-left px-5 py-2.5 font-medium">#</th>
                    <th className="text-left px-3 py-2.5 font-medium">Title</th>
                    <th className="text-left px-3 py-2.5 font-medium">Source</th>
                    <th className="text-left px-3 py-2.5 font-medium">Priority</th>
                    <th className="text-left px-3 py-2.5 font-medium">Status</th>
                    <th className="text-left px-3 py-2.5 font-medium">Assignee</th>
                    <th className="text-left px-5 py-2.5 font-medium">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentTickets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center">
                        <LifeBuoy className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No tickets yet</p>
                      </td>
                    </tr>
                  ) : (
                    recentTickets.map((t) => {
                      const due = formatDue(t.due_at)
                      const assignee = t.assignee_user_id
                        ? userMap.get(t.assignee_user_id)
                        : null
                      return (
                        <tr
                          key={t.id}
                          className="hover:bg-muted/20 transition-colors"
                        >
                          <td className="px-5 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                            <Link
                              href={`/workspace/tickets/${t.id}`}
                              className="hover:underline"
                            >
                              TKT-{t.ticket_number}
                            </Link>
                          </td>
                          <td className="px-3 py-3 max-w-xs">
                            <Link
                              href={`/workspace/tickets/${t.id}`}
                              className="font-medium text-foreground hover:underline line-clamp-1"
                            >
                              {t.title}
                            </Link>
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                                t.source === "internal"
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-violet-50 text-violet-700"
                              }`}
                            >
                              {t.source}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`h-2 w-2 rounded-full ${PRIORITY_DOT[t.priority]}`}
                              />
                              <span className="text-xs capitalize">{t.priority}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[t.status]}`}
                            >
                              {STATUS_LABEL[t.status]}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            {assignee ? (
                              <div className="flex items-center gap-1.5">
                                <div className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center">
                                  {(assignee.full_name ?? "?").charAt(0)}
                                </div>
                                <span className="text-xs text-foreground line-clamp-1">
                                  {assignee.full_name ?? "—"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                                <User className="h-3 w-3" /> Unassigned
                              </span>
                            )}
                          </td>
                          <td
                            className={`px-5 py-3 text-xs whitespace-nowrap ${
                              due.overdue ? "text-red-600 font-medium" : "text-muted-foreground"
                            }`}
                          >
                            {due.label}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <NewTicketModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => load()}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub components
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon: Icon,
  tint,
}: {
  label: string
  value: number | string
  icon: typeof Ticket
  tint: string
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold font-heading mt-2">{value}</p>
      </div>
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${tint}`}>
        <Icon className="h-4 w-4" />
      </div>
    </div>
  )
}

function StatusDonut({
  counts,
  total,
}: {
  counts: Record<string, number>
  total: number
}) {
  const size = 180
  const stroke = 24
  const r = (size - stroke) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r

  const entries = Object.entries(counts).filter(([, v]) => v > 0)
  let offset = 0

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle
            cx={cx}
            cy={cy}
            r={r}
            stroke="var(--border, #e5e7eb)"
            strokeWidth={stroke}
            fill="none"
          />
          {total > 0 &&
            entries.map(([status, count]) => {
              const frac = count / total
              const dash = frac * circumference
              const el = (
                <circle
                  key={status}
                  cx={cx}
                  cy={cy}
                  r={r}
                  stroke={STATUS_COLORS[status as TicketStatus] ?? "#94a3b8"}
                  strokeWidth={stroke}
                  fill="none"
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                  transform={`rotate(-90 ${cx} ${cy})`}
                />
              )
              offset += dash
              return el
            })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <span className="text-2xl font-bold font-heading">{total}</span>
          <span className="text-xs text-muted-foreground">total</span>
        </div>
      </div>
      <div className="flex-1 space-y-1.5 text-xs">
        {entries.length === 0 ? (
          <p className="text-muted-foreground">No data</p>
        ) : (
          entries.map(([status, count]) => (
            <div key={status} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{
                  backgroundColor: STATUS_COLORS[status as TicketStatus] ?? "#94a3b8",
                }}
              />
              <span className="flex-1 text-foreground">
                {STATUS_LABEL[status as TicketStatus] ?? status}
              </span>
              <span className="text-muted-foreground">{count}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function VolumeChart({
  data,
}: {
  data: { day: string; created: number; resolved: number }[]
}) {
  const width = 560
  const height = 200
  const padding = { top: 10, right: 10, bottom: 24, left: 24 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom
  const maxY = Math.max(1, ...data.flatMap((d) => [d.created, d.resolved]))
  const step = data.length > 1 ? innerW / (data.length - 1) : innerW

  const makePath = (key: "created" | "resolved") =>
    data
      .map((d, i) => {
        const x = padding.left + i * step
        const y = padding.top + innerH - (d[key] / maxY) * innerH
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(" ")

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const y = padding.top + innerH * (1 - f)
          return (
            <line
              key={f}
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              stroke="#e5e7eb"
              strokeDasharray="2 4"
            />
          )
        })}
        <path d={makePath("created")} fill="none" stroke="#3b82f6" strokeWidth={2} />
        <path d={makePath("resolved")} fill="none" stroke="#10b981" strokeWidth={2} />
        {data.map((d, i) => {
          const x = padding.left + i * step
          return (
            <g key={i}>
              <circle
                cx={x}
                cy={padding.top + innerH - (d.created / maxY) * innerH}
                r={2.5}
                fill="#3b82f6"
              />
              <circle
                cx={x}
                cy={padding.top + innerH - (d.resolved / maxY) * innerH}
                r={2.5}
                fill="#10b981"
              />
            </g>
          )
        })}
      </svg>
      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 px-1">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          New
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Resolved
        </div>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
      <Skeleton className="h-80 rounded-lg" />
    </>
  )
}
