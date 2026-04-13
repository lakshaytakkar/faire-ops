"use client"

import { useEffect, useMemo, useState, Suspense } from "react"
import Link from "next/link"
import {
  LifeBuoy,
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  User,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { SubNav } from "@/components/shared/sub-nav"
import { NewTicketModal } from "@/components/shared/new-ticket-modal"
import { useActiveSpace } from "@/lib/use-active-space"

// ---------------------------------------------------------------------------
// Types
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
  description: string | null
  source: TicketSource
  status: TicketStatus
  priority: TicketPriority
  category_id: string | null
  assignee_user_id: string | null
  reporter_name: string | null
  due_at: string | null
  updated_at: string
  created_at: string
}

interface CategoryRow {
  id: string
  name: string
  source: string
}

interface UserRow {
  id: string
  full_name: string | null
  avatar_url: string | null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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

const PRIORITY_DOT: Record<TicketPriority, string> = {
  low: "bg-slate-300",
  medium: "bg-blue-500",
  high: "bg-amber-500",
  urgent: "bg-orange-500",
  critical: "bg-red-500",
}

const PRIORITY_STYLES: Record<TicketPriority, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-50 text-blue-700",
  high: "bg-amber-50 text-amber-700",
  urgent: "bg-orange-50 text-orange-700",
  critical: "bg-red-50 text-red-700",
}

const ALL_STATUSES: TicketStatus[] = [
  "open",
  "triaged",
  "in_progress",
  "waiting_on_reporter",
  "waiting_on_third_party",
  "resolved",
  "closed",
  "reopened",
]

const TICKETS_SUBNAV = [
  { title: "Dashboard", href: "/workspace/tickets/dashboard" },
  { title: "All", href: "/workspace/tickets/all" },
  { title: "Internal", href: "/workspace/tickets/internal" },
  { title: "Client", href: "/workspace/tickets/client" },
  { title: "Categories", href: "/workspace/tickets/categories" },
]

const PAGE_SIZE = 50

type SortKey = "ticket_number" | "title" | "status" | "priority" | "due_at" | "updated_at"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(iso: string | null): string {
  if (!iso) return "—"
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.floor(hr / 24)
  return `${d}d ago`
}

function formatDue(iso: string | null) {
  if (!iso) return { label: "—", overdue: false }
  const d = new Date(iso)
  return {
    label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    overdue: d.getTime() < Date.now(),
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function AllTicketsPageInner() {
  const activeSpace = useActiveSpace().slug
  const [tickets, setTickets] = useState<TicketRow[]>([])
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  // Filters
  const [search, setSearch] = useState("")
  const [sourceFilter, setSourceFilter] = useState<"all" | TicketSource>("all")
  const [statusFilter, setStatusFilter] = useState<Set<TicketStatus>>(new Set())
  const [priorityFilter, setPriorityFilter] = useState<"all" | TicketPriority>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all")
  const [overdueOnly, setOverdueOnly] = useState(false)

  // Sort / pagination
  const [sortKey, setSortKey] = useState<SortKey>("updated_at")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)

  async function load() {
    setLoading(true)
    const [ticketRes, catRes, userRes] = await Promise.all([
      supabase
        .from("tickets")
        .select(
          "id, ticket_number, title, description, source, status, priority, category_id, assignee_user_id, reporter_name, due_at, updated_at, created_at",
        )
        .eq("space_slug", activeSpace)
        .order("updated_at", { ascending: false })
        .limit(1000),
      supabase.from("ticket_categories").select("id, name, source").order("name"),
      supabase.from("users").select("id, full_name, avatar_url").order("full_name").limit(200),
    ])
    setTickets((ticketRes.data as TicketRow[]) ?? [])
    setCategories((catRes.data as CategoryRow[]) ?? [])
    setUsers((userRes.data as UserRow[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [activeSpace])

  const categoryMap = useMemo(() => {
    const m = new Map<string, CategoryRow>()
    categories.forEach((c) => m.set(c.id, c))
    return m
  }, [categories])

  const userMap = useMemo(() => {
    const m = new Map<string, UserRow>()
    users.forEach((u) => m.set(u.id, u))
    return m
  }, [users])

  // Filtering
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tickets.filter((t) => {
      if (sourceFilter !== "all" && t.source !== sourceFilter) return false
      if (statusFilter.size > 0 && !statusFilter.has(t.status)) return false
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false
      if (categoryFilter !== "all" && t.category_id !== categoryFilter) return false
      if (assigneeFilter !== "all") {
        if (assigneeFilter === "unassigned") {
          if (t.assignee_user_id) return false
        } else if (t.assignee_user_id !== assigneeFilter) {
          return false
        }
      }
      if (overdueOnly) {
        if (!t.due_at) return false
        if (new Date(t.due_at).getTime() >= Date.now()) return false
        if (["resolved", "closed"].includes(t.status)) return false
      }
      if (q) {
        const hay = `${t.title ?? ""} ${t.description ?? ""}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [
    tickets,
    search,
    sourceFilter,
    statusFilter,
    priorityFilter,
    categoryFilter,
    assigneeFilter,
    overdueOnly,
  ])

  // Sorting
  const sorted = useMemo(() => {
    const arr = [...filtered]
    const priOrder: Record<TicketPriority, number> = {
      low: 0,
      medium: 1,
      high: 2,
      urgent: 3,
      critical: 4,
    }
    arr.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "ticket_number":
          cmp = a.ticket_number - b.ticket_number
          break
        case "title":
          cmp = a.title.localeCompare(b.title)
          break
        case "status":
          cmp = a.status.localeCompare(b.status)
          break
        case "priority":
          cmp = priOrder[a.priority] - priOrder[b.priority]
          break
        case "due_at":
          cmp =
            (a.due_at ? new Date(a.due_at).getTime() : Number.POSITIVE_INFINITY) -
            (b.due_at ? new Date(b.due_at).getTime() : Number.POSITIVE_INFINITY)
          break
        case "updated_at":
          cmp = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
          break
      }
      return sortDir === "asc" ? cmp : -cmp
    })
    return arr
  }, [filtered, sortKey, sortDir])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function toggleStatus(s: TicketStatus) {
    setStatusFilter((prev) => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s)
      else next.add(s)
      return next
    })
    setPage(1)
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <SubNav items={TICKETS_SUBNAV} />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">All Tickets</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {loading ? "Loading..." : `${sorted.length} tickets`}
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" /> New Ticket
        </Button>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" /> Filters
        </div>
        <div className="p-5 space-y-4">
          {/* Row 1: search + source + assignee + overdue */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative md:col-span-2">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="Search title or description..."
                className="w-full h-9 rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value as "all" | TicketSource)
                setPage(1)
              }}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="all">All Sources</option>
              <option value="internal">Internal</option>
              <option value="client">Client</option>
            </select>
            <select
              value={assigneeFilter}
              onChange={(e) => {
                setAssigneeFilter(e.target.value)
                setPage(1)
              }}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="all">All Assignees</option>
              <option value="unassigned">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name ?? u.id}
                </option>
              ))}
            </select>
          </div>

          {/* Row 2: priority + category + overdue toggle */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value as "all" | TicketPriority)
                setPage(1)
              }}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
              <option value="critical">Critical</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value)
                setPage(1)
              }}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 h-9 rounded-md border border-border bg-background px-3 text-sm cursor-pointer hover:bg-muted/40">
              <input
                type="checkbox"
                checked={overdueOnly}
                onChange={(e) => {
                  setOverdueOnly(e.target.checked)
                  setPage(1)
                }}
                className="h-3.5 w-3.5"
              />
              Overdue only
            </label>
          </div>

          {/* Status chips */}
          <div className="flex flex-wrap gap-1.5">
            {ALL_STATUSES.map((s) => {
              const active = statusFilter.has(s)
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleStatus(s)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
                    active
                      ? STATUS_STYLES[s] + " ring-1 ring-current"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {STATUS_LABEL[s]}
                </button>
              )
            })}
            {statusFilter.size > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter(new Set())}
                className="rounded-full px-2.5 py-1 text-[11px] font-medium text-primary hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight flex items-center justify-between">
          Tickets
          <span className="text-xs font-normal text-muted-foreground">
            {loading
              ? ""
              : `Showing ${pageRows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}-${(currentPage - 1) * PAGE_SIZE + pageRows.length} of ${sorted.length}`}
          </span>
        </div>

        {loading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-md" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <LifeBuoy className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No tickets found</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Try adjusting your filters or create a new ticket.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <Th onClick={() => toggleSort("ticket_number")} active={sortKey === "ticket_number"} dir={sortDir}>
                      #
                    </Th>
                    <Th onClick={() => toggleSort("title")} active={sortKey === "title"} dir={sortDir}>
                      Title
                    </Th>
                    <th className="text-left px-3 py-2.5 font-medium">Source</th>
                    <th className="text-left px-3 py-2.5 font-medium">Category</th>
                    <th className="text-left px-3 py-2.5 font-medium">Reporter</th>
                    <th className="text-left px-3 py-2.5 font-medium">Assignee</th>
                    <Th onClick={() => toggleSort("status")} active={sortKey === "status"} dir={sortDir}>
                      Status
                    </Th>
                    <Th onClick={() => toggleSort("priority")} active={sortKey === "priority"} dir={sortDir}>
                      Priority
                    </Th>
                    <Th onClick={() => toggleSort("due_at")} active={sortKey === "due_at"} dir={sortDir}>
                      Due
                    </Th>
                    <Th onClick={() => toggleSort("updated_at")} active={sortKey === "updated_at"} dir={sortDir}>
                      Updated
                    </Th>
                    <th className="text-right px-5 py-2.5 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {pageRows.map((t) => {
                    const due = formatDue(t.due_at)
                    const category = t.category_id ? categoryMap.get(t.category_id) : null
                    const assignee = t.assignee_user_id ? userMap.get(t.assignee_user_id) : null
                    return (
                      <tr
                        key={t.id}
                        className="hover:bg-muted/20 transition-colors cursor-pointer"
                        onClick={() => {
                          window.location.href = `/workspace/tickets/${t.id}`
                        }}
                      >
                        <td className="px-5 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                          TKT-{t.ticket_number}
                        </td>
                        <td className="px-3 py-3 max-w-sm">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full shrink-0 ${PRIORITY_DOT[t.priority]}`} />
                            <span className="font-medium text-foreground line-clamp-1">{t.title}</span>
                          </div>
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
                        <td className="px-3 py-3 text-xs text-muted-foreground line-clamp-1">
                          {category?.name ?? "—"}
                        </td>
                        <td className="px-3 py-3 text-xs text-muted-foreground line-clamp-1">
                          {t.reporter_name ?? "—"}
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
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[t.status]}`}
                          >
                            {STATUS_LABEL[t.status]}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase ${PRIORITY_STYLES[t.priority]}`}
                          >
                            {t.priority}
                          </span>
                        </td>
                        <td
                          className={`px-3 py-3 text-xs whitespace-nowrap ${
                            due.overdue ? "text-red-600 font-medium" : "text-muted-foreground"
                          }`}
                        >
                          {due.label}
                        </td>
                        <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {timeAgo(t.updated_at)}
                        </td>
                        <td
                          className="px-5 py-3 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link
                            href={`/workspace/tickets/${t.id}`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            View <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t text-xs text-muted-foreground">
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-7 w-7 rounded border border-border flex items-center justify-center disabled:opacity-40 hover:bg-muted/40"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="h-7 w-7 rounded border border-border flex items-center justify-center disabled:opacity-40 hover:bg-muted/40"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <NewTicketModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => load()}
      />
    </div>
  )
}

export default function AllTicketsPage() {
  return (
    <Suspense fallback={<div className="max-w-[1440px] mx-auto w-full"><div className="h-8 w-40 rounded bg-muted animate-pulse" /></div>}>
      <AllTicketsPageInner />
    </Suspense>
  )
}

// ---------------------------------------------------------------------------
// Th helper
// ---------------------------------------------------------------------------

function Th({
  children,
  onClick,
  active,
  dir,
}: {
  children: React.ReactNode
  onClick: () => void
  active: boolean
  dir: "asc" | "desc"
}) {
  return (
    <th
      onClick={onClick}
      className="text-left px-3 py-2.5 font-medium cursor-pointer select-none hover:text-foreground whitespace-nowrap"
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {active && <span className="text-[10px]">{dir === "asc" ? "↑" : "↓"}</span>}
      </span>
    </th>
  )
}
