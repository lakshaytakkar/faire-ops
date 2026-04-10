"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  LifeBuoy,
  Ticket,
  MessageSquare,
  Clock,
  Plus,
  Search,
  User,
  LayoutGrid,
  List as ListIcon,
  ChevronRight,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { SubNav } from "@/components/shared/sub-nav"
import { NewTicketModal } from "@/components/shared/new-ticket-modal"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TicketStatus =
  | "open"
  | "triaged"
  | "in_progress"
  | "waiting_on_customer"
  | "waiting_on_internal"
  | "resolved"
  | "closed"
  | "reopened"

type TicketPriority = "low" | "medium" | "high" | "urgent" | "critical"

interface TicketRow {
  id: string
  ticket_number: number
  title: string
  description: string | null
  source: string
  category_id: string | null
  priority: TicketPriority
  status: TicketStatus
  reporter_name: string | null
  reporter_email: string | null
  assignee_user_id: string | null
  due_at: string | null
  created_at: string
  updated_at: string | null
  tags: string[] | null
}

interface UserLite {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
}

interface CategoryLite {
  id: string
  name: string
  color: string | null
}

// ---------------------------------------------------------------------------
// Styling helpers
// ---------------------------------------------------------------------------

const STATUS_COLUMNS: {
  key: TicketStatus | "waiting"
  label: string
  statuses: TicketStatus[]
  bar: string
  headerBg: string
}[] = [
  { key: "open", label: "Open", statuses: ["open"], bar: "bg-blue-500", headerBg: "bg-blue-50 text-blue-700" },
  { key: "triaged", label: "Triaged", statuses: ["triaged"], bar: "bg-cyan-500", headerBg: "bg-cyan-50 text-cyan-700" },
  {
    key: "in_progress",
    label: "In Progress",
    statuses: ["in_progress"],
    bar: "bg-amber-500",
    headerBg: "bg-amber-50 text-amber-700",
  },
  {
    key: "waiting",
    label: "Waiting",
    statuses: ["waiting_on_customer", "waiting_on_internal"],
    bar: "bg-orange-500",
    headerBg: "bg-orange-50 text-orange-700",
  },
  {
    key: "resolved",
    label: "Resolved",
    statuses: ["resolved"],
    bar: "bg-emerald-500",
    headerBg: "bg-emerald-50 text-emerald-700",
  },
  { key: "closed", label: "Closed", statuses: ["closed"], bar: "bg-slate-400", headerBg: "bg-slate-50 text-slate-700" },
]

const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Open",
  triaged: "Triaged",
  in_progress: "In Progress",
  waiting_on_customer: "Waiting on Customer",
  waiting_on_internal: "Waiting on Internal",
  resolved: "Resolved",
  closed: "Closed",
  reopened: "Reopened",
}

const STATUS_CLASS: Record<TicketStatus, string> = {
  open: "bg-blue-50 text-blue-700 border-blue-200",
  triaged: "bg-cyan-50 text-cyan-700 border-cyan-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  waiting_on_customer: "bg-orange-50 text-orange-700 border-orange-200",
  waiting_on_internal: "bg-yellow-50 text-yellow-700 border-yellow-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-slate-50 text-slate-600 border-slate-200",
  reopened: "bg-red-50 text-red-700 border-red-200",
}

const PRIORITY_DOT: Record<TicketPriority, string> = {
  low: "bg-slate-400",
  medium: "bg-blue-500",
  high: "bg-amber-500",
  urgent: "bg-orange-500",
  critical: "bg-red-500",
}

const PRIORITY_CLASS: Record<TicketPriority, string> = {
  low: "bg-slate-50 text-slate-600 border-slate-200",
  medium: "bg-blue-50 text-blue-700 border-blue-200",
  high: "bg-amber-50 text-amber-700 border-amber-200",
  urgent: "bg-orange-50 text-orange-700 border-orange-200",
  critical: "bg-red-50 text-red-700 border-red-200",
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?"
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function formatRelative(iso: string | null, now: number): string {
  if (!iso) return ""
  const d = new Date(iso)
  const diff = now - d.getTime()
  const past = diff >= 0
  const abs = Math.abs(diff)
  const mins = Math.floor(abs / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ${past ? "ago" : "from now"}`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ${past ? "ago" : "from now"}`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ${past ? "ago" : "from now"}`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ${past ? "ago" : "from now"}`
  const years = Math.floor(months / 12)
  return `${years}y ${past ? "ago" : "from now"}`
}

function isOverdue(dueAt: string | null, now: number): boolean {
  if (!dueAt) return false
  return new Date(dueAt).getTime() < now
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function InternalTicketsPage() {
  const [tickets, setTickets] = useState<TicketRow[]>([])
  const [users, setUsers] = useState<Record<string, UserLite>>({})
  const [categories, setCategories] = useState<Record<string, CategoryLite>>({})
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  const [view, setView] = useState<"kanban" | "table">("kanban")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<Set<TicketStatus>>(new Set())
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "">("")
  const [assigneeFilter, setAssigneeFilter] = useState<string>("")
  const [modalOpen, setModalOpen] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(id)
  }, [])

  async function loadAll() {
    setLoading(true)
    const [ticketsRes, usersRes, catsRes] = await Promise.all([
      supabase
        .from("tickets")
        .select(
          "id, ticket_number, title, description, source, category_id, priority, status, reporter_name, reporter_email, assignee_user_id, due_at, created_at, updated_at, tags",
        )
        .eq("source", "internal")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("users").select("id, full_name, email, avatar_url").limit(500),
      supabase.from("ticket_categories").select("id, name, color"),
    ])

    const ticketRows = (ticketsRes.data as TicketRow[]) ?? []
    setTickets(ticketRows)

    const userMap: Record<string, UserLite> = {}
    for (const u of (usersRes.data as UserLite[]) ?? []) userMap[u.id] = u
    setUsers(userMap)

    const catMap: Record<string, CategoryLite> = {}
    for (const c of (catsRes.data as CategoryLite[]) ?? []) catMap[c.id] = c
    setCategories(catMap)

    if (ticketRows.length > 0) {
      const { data: comments } = await supabase
        .from("ticket_comments")
        .select("ticket_id")
        .in(
          "ticket_id",
          ticketRows.map((t) => t.id),
        )
      const counts: Record<string, number> = {}
      for (const c of (comments as { ticket_id: string }[]) ?? []) {
        counts[c.ticket_id] = (counts[c.ticket_id] ?? 0) + 1
      }
      setCommentCounts(counts)
    }

    setLoading(false)
  }

  useEffect(() => {
    Promise.resolve().then(loadAll)
  }, [])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return tickets.filter((t) => {
      if (term) {
        const hay = `${t.title} ${t.description ?? ""} TKT-${t.ticket_number}`.toLowerCase()
        if (!hay.includes(term)) return false
      }
      if (statusFilter.size > 0 && !statusFilter.has(t.status)) return false
      if (priorityFilter && t.priority !== priorityFilter) return false
      if (assigneeFilter && t.assignee_user_id !== assigneeFilter) return false
      return true
    })
  }, [tickets, search, statusFilter, priorityFilter, assigneeFilter])

  const assigneeOptions = useMemo(() => {
    const ids = new Set<string>()
    for (const t of tickets) if (t.assignee_user_id) ids.add(t.assignee_user_id)
    return Array.from(ids)
      .map((id) => users[id])
      .filter(Boolean)
      .sort((a, b) => (a?.full_name ?? "").localeCompare(b?.full_name ?? ""))
  }, [tickets, users])

  const grouped = useMemo(() => {
    const map: Record<string, TicketRow[]> = {}
    for (const col of STATUS_COLUMNS) map[col.key] = []
    for (const t of filtered) {
      const col = STATUS_COLUMNS.find((c) => c.statuses.includes(t.status))
      if (col) map[col.key].push(t)
    }
    return map
  }, [filtered])

  function toggleStatus(s: TicketStatus) {
    setStatusFilter((prev) => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s)
      else next.add(s)
      return next
    })
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <SubNav
        items={[
          { title: "Dashboard", href: "/workspace/tickets/dashboard" },
          { title: "All", href: "/workspace/tickets/all" },
          { title: "Internal", href: "/workspace/tickets/internal" },
          { title: "Client", href: "/workspace/tickets/client" },
          { title: "Categories", href: "/workspace/tickets/categories" },
        ]}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <LifeBuoy className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Internal Tickets
              <span className="text-sm font-medium text-muted-foreground">({tickets.length})</span>
            </h1>
            <p className="text-sm text-muted-foreground">Issues raised by team members</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-border overflow-hidden">
            <button
              onClick={() => setView("kanban")}
              className={`h-9 px-3 text-sm flex items-center gap-1.5 transition-colors ${
                view === "kanban" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Kanban
            </button>
            <button
              onClick={() => setView("table")}
              className={`h-9 px-3 text-sm flex items-center gap-1.5 transition-colors ${
                view === "table" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
              }`}
            >
              <ListIcon className="h-3.5 w-3.5" /> Table
            </button>
          </div>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" /> New Ticket
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, description, TKT-#..."
            className="w-full h-9 rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {(
            ["open", "triaged", "in_progress", "waiting_on_customer", "resolved", "closed"] as TicketStatus[]
          ).map((s) => (
            <button
              key={s}
              onClick={() => toggleStatus(s)}
              className={`h-7 px-2 rounded-md text-xs font-medium border transition-colors ${
                statusFilter.has(s) ? STATUS_CLASS[s] : "bg-background text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as TicketPriority | "")}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">All priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
          <option value="critical">Critical</option>
        </select>
        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">All assignees</option>
          {assigneeOptions.map((u) => (
            <option key={u!.id} value={u!.id}>
              {u!.full_name ?? u!.email ?? u!.id}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        view === "kanban" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border/80 bg-card shadow-sm h-[300px] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-border/80 bg-card shadow-sm h-[400px] animate-pulse" />
        )
      ) : view === "kanban" ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {STATUS_COLUMNS.map((col) => {
            const items = grouped[col.key] ?? []
            return (
              <div
                key={col.key}
                className="flex-shrink-0 w-[280px] rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden flex flex-col"
              >
                <div className={`px-3 py-2 border-b ${col.headerBg}`}>
                  <div className="flex items-center justify-between">
                    <div className="text-[0.8125rem] font-semibold tracking-tight flex items-center gap-2">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${col.bar}`} />
                      {col.label}
                    </div>
                    <span className="text-xs font-semibold bg-white/60 rounded-full px-2 py-0.5">
                      {items.length}
                    </span>
                  </div>
                  <div className={`h-0.5 ${col.bar} mt-1.5 rounded-full`} />
                </div>
                <div className="flex-1 p-2 space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
                  {items.length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-4">No tickets</div>
                  )}
                  {items.map((t) => {
                    const assignee = t.assignee_user_id ? users[t.assignee_user_id] : null
                    const overdue = isOverdue(t.due_at, now)
                    const comments = commentCounts[t.id] ?? 0
                    return (
                      <Link
                        key={t.id}
                        href={`/workspace/tickets/${t.id}`}
                        className="block rounded-md border border-border/70 bg-background hover:bg-muted/40 p-2.5 transition-colors"
                      >
                        <div className="flex items-center justify-between text-[0.6875rem] text-muted-foreground mb-1">
                          <span className="font-mono font-semibold">TKT-{t.ticket_number}</span>
                          <span className={`inline-block w-2 h-2 rounded-full ${PRIORITY_DOT[t.priority]}`} />
                        </div>
                        <div className="text-sm font-semibold leading-snug mb-2 line-clamp-2">{t.title}</div>
                        <div className="flex items-center justify-between gap-1.5 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {assignee ? (
                              <div
                                className="h-5 w-5 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[9px] font-semibold flex-shrink-0"
                                title={assignee.full_name ?? assignee.email ?? ""}
                              >
                                {getInitials(assignee.full_name ?? assignee.email)}
                              </div>
                            ) : (
                              <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                <User className="h-2.5 w-2.5 text-muted-foreground" />
                              </div>
                            )}
                            {t.due_at && (
                              <span
                                className={`flex items-center gap-0.5 truncate ${
                                  overdue ? "text-red-600 font-medium" : ""
                                }`}
                              >
                                <Clock className="h-3 w-3" />
                                {formatRelative(t.due_at, now)}
                              </span>
                            )}
                          </div>
                          {comments > 0 && (
                            <span className="flex items-center gap-0.5">
                              <MessageSquare className="h-3 w-3" />
                              {comments}
                            </span>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight flex items-center gap-2">
            <Ticket className="h-4 w-4" /> Internal Tickets
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold">TKT</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Title</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Status</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Priority</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Assignee</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Due</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Created</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const assignee = t.assignee_user_id ? users[t.assignee_user_id] : null
                  const overdue = isOverdue(t.due_at, now)
                  return (
                    <tr key={t.id} className="border-t border-border/60 hover:bg-muted/30">
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">TKT-{t.ticket_number}</td>
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/workspace/tickets/${t.id}`}
                          className="font-semibold hover:text-primary line-clamp-1"
                        >
                          {t.title}
                        </Link>
                        {t.category_id && categories[t.category_id] && (
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {categories[t.category_id].name}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border ${STATUS_CLASS[t.status]}`}>
                          {STATUS_LABEL[t.status]}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${PRIORITY_CLASS[t.priority]}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[t.priority]}`} />
                          {t.priority}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {assignee ? (
                          <div className="flex items-center gap-1.5">
                            <div className="h-5 w-5 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[9px] font-semibold">
                              {getInitials(assignee.full_name ?? assignee.email)}
                            </div>
                            <span className="text-xs truncate max-w-[120px]">
                              {assignee.full_name ?? assignee.email}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Unassigned</span>
                        )}
                      </td>
                      <td className={`px-4 py-2.5 text-xs ${overdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                        {t.due_at ? formatRelative(t.due_at, now) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatRelative(t.created_at, now)}</td>
                      <td className="px-2">
                        <Link href={`/workspace/tickets/${t.id}`} className="text-muted-foreground hover:text-foreground">
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No tickets match your filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <NewTicketModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultSource="internal"
        onCreated={() => {
          setModalOpen(false)
          loadAll()
        }}
      />

    </div>
  )
}
