"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  LifeBuoy,
  Ticket,
  Clock,
  CheckCircle2,
  Plus,
  Search,
  User,
  Building2,
  Package,
  ExternalLink,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { SubNav } from "@/components/shared/sub-nav"
import { NewTicketModal } from "@/components/shared/new-ticket-modal"
import { richTextToPlain } from "@/components/shared/rich-text-editor"

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
  retailer_id: string | null
  retailer_name: string | null
  related_order_id: string | null
  related_product_id: string | null
  due_at: string | null
  created_at: string
  updated_at: string | null
  resolved_at: string | null
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

interface RetailerLite {
  id: string
  name: string | null
  company_name: string | null
}

// ---------------------------------------------------------------------------
// Styling helpers
// ---------------------------------------------------------------------------

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

const PRIORITY_CLASS: Record<TicketPriority, string> = {
  low: "bg-slate-50 text-slate-600 border-slate-200",
  medium: "bg-blue-50 text-blue-700 border-blue-200",
  high: "bg-amber-50 text-amber-700 border-amber-200",
  urgent: "bg-orange-50 text-orange-700 border-orange-200",
  critical: "bg-red-50 text-red-700 border-red-200",
}

const PRIORITY_DOT: Record<TicketPriority, string> = {
  low: "bg-slate-400",
  medium: "bg-blue-500",
  high: "bg-amber-500",
  urgent: "bg-orange-500",
  critical: "bg-red-500",
}

const WAITING_STATUSES: TicketStatus[] = ["waiting_on_customer", "waiting_on_internal"]

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

function slaPercent(createdAt: string, dueAt: string | null, now: number): number | null {
  if (!dueAt) return null
  const start = new Date(createdAt).getTime()
  const end = new Date(dueAt).getTime()
  const total = end - start
  if (total <= 0) return 100
  const used = now - start
  return Math.max(0, Math.min(100, (used / total) * 100))
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s
  return s.slice(0, n - 1) + "…"
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ClientTicketsPage() {
  const [tickets, setTickets] = useState<TicketRow[]>([])
  const [users, setUsers] = useState<Record<string, UserLite>>({})
  const [categories, setCategories] = useState<Record<string, CategoryLite>>({})
  const [retailers, setRetailers] = useState<RetailerLite[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "">("")
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "">("")
  const [retailerFilter, setRetailerFilter] = useState<string>("")
  const [modalOpen, setModalOpen] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(id)
  }, [])

  async function loadAll() {
    setLoading(true)
    const [ticketsRes, usersRes, catsRes, retailersRes] = await Promise.all([
      supabase
        .from("tickets")
        .select(
          "id, ticket_number, title, description, source, category_id, priority, status, reporter_name, reporter_email, assignee_user_id, retailer_id, retailer_name, related_order_id, related_product_id, due_at, created_at, updated_at, resolved_at, tags",
        )
        .eq("source", "client")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("users").select("id, full_name, email, avatar_url").limit(500),
      supabase.from("ticket_categories").select("id, name, color"),
      supabase
        .from("faire_retailers")
        .select("id, name, company_name")
        .order("last_order_at", { ascending: false })
        .limit(200),
    ])

    setTickets((ticketsRes.data as TicketRow[]) ?? [])

    const userMap: Record<string, UserLite> = {}
    for (const u of (usersRes.data as UserLite[]) ?? []) userMap[u.id] = u
    setUsers(userMap)

    const catMap: Record<string, CategoryLite> = {}
    for (const c of (catsRes.data as CategoryLite[]) ?? []) catMap[c.id] = c
    setCategories(catMap)

    setRetailers((retailersRes.data as RetailerLite[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    Promise.resolve().then(loadAll)
  }, [])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return tickets.filter((t) => {
      if (term) {
        const hay = `${t.title} ${t.description ?? ""} ${t.retailer_name ?? ""} TKT-${t.ticket_number}`.toLowerCase()
        if (!hay.includes(term)) return false
      }
      if (statusFilter && t.status !== statusFilter) return false
      if (priorityFilter && t.priority !== priorityFilter) return false
      if (retailerFilter && t.retailer_id !== retailerFilter) return false
      return true
    })
  }, [tickets, search, statusFilter, priorityFilter, retailerFilter])

  // Stats
  const stats = useMemo(() => {
    const weekAgo = now - 7 * 24 * 3600 * 1000
    const openFromClients = tickets.filter((t) => !["resolved", "closed"].includes(t.status)).length
    const awaiting = tickets.filter((t) => WAITING_STATUSES.includes(t.status)).length
    const resolvedThisWeek = tickets.filter(
      (t) => t.resolved_at && new Date(t.resolved_at).getTime() >= weekAgo,
    ).length
    const resolvedWithTime = tickets.filter((t) => t.resolved_at)
    let avgResolutionHours = 0
    if (resolvedWithTime.length > 0) {
      const total = resolvedWithTime.reduce((acc, t) => {
        const delta = new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime()
        return acc + delta
      }, 0)
      avgResolutionHours = total / resolvedWithTime.length / 3600000
    }
    return { openFromClients, awaiting, resolvedThisWeek, avgResolutionHours }
  }, [tickets, now])

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
              Client Tickets
              <span className="text-sm font-medium text-muted-foreground">({tickets.length})</span>
            </h1>
            <p className="text-sm text-muted-foreground">Issues from retailers and customers</p>
          </div>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" /> New Ticket
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Open from Clients"
          value={stats.openFromClients}
          icon={<Ticket className="h-4 w-4" />}
          tone="blue"
        />
        <StatCard
          label="Awaiting Response"
          value={stats.awaiting}
          icon={<Clock className="h-4 w-4" />}
          tone="orange"
        />
        <StatCard
          label="Resolved This Week"
          value={stats.resolvedThisWeek}
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="emerald"
        />
        <StatCard
          label="Avg Resolution Hours"
          value={stats.avgResolutionHours.toFixed(1)}
          icon={<Clock className="h-4 w-4" />}
          tone="cyan"
        />
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, description, retailer, TKT-#..."
            className="w-full h-9 rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TicketStatus | "")}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">All statuses</option>
          {(Object.keys(STATUS_LABEL) as TicketStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
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
          value={retailerFilter}
          onChange={(e) => setRetailerFilter(e.target.value)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 min-w-[180px]"
        >
          <option value="">All retailers</option>
          {retailers.map((r) => (
            <option key={r.id} value={r.id}>
              {r.company_name ?? r.name ?? r.id}
            </option>
          ))}
        </select>
      </div>

      {/* Card grid */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border/80 bg-card shadow-sm h-[220px] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-border/80 bg-card shadow-sm py-20 text-center">
          <div className="h-12 w-12 mx-auto rounded-full bg-muted flex items-center justify-center mb-3">
            <Ticket className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">No client tickets match your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((t) => {
            const assignee = t.assignee_user_id ? users[t.assignee_user_id] : null
            const cat = t.category_id ? categories[t.category_id] : null
            const sla = slaPercent(t.created_at, t.due_at, now)
            const breach = sla !== null && sla >= 100
            const descPlain = richTextToPlain(t.description ?? "")
            return (
              <Link
                key={t.id}
                href={`/workspace/tickets/${t.id}`}
                className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden hover:shadow-md transition-shadow group"
              >
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-muted-foreground font-semibold">
                      TKT-{t.ticket_number}
                    </span>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border ${STATUS_CLASS[t.status]}`}
                    >
                      {STATUS_LABEL[t.status]}
                    </span>
                  </div>

                  <h3 className="text-[0.9375rem] font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                    {t.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {t.retailer_name && (
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" />
                        <span className="truncate max-w-[180px]">{t.retailer_name}</span>
                      </div>
                    )}
                    {t.related_order_id && (
                      <span
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          window.location.href = `/orders/${t.related_order_id}`
                        }}
                        className="flex items-center gap-1 hover:text-primary cursor-pointer"
                      >
                        <Package className="h-3.5 w-3.5" />
                        <span className="font-mono">{truncate(t.related_order_id, 12)}</span>
                        <ExternalLink className="h-3 w-3" />
                      </span>
                    )}
                  </div>

                  {descPlain && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{truncate(descPlain, 160)}</p>
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${PRIORITY_CLASS[t.priority]}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[t.priority]}`} />
                      {t.priority}
                    </span>
                    {cat && (
                      <span
                        className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border"
                        style={{
                          backgroundColor: (cat.color ?? "#64748b") + "18",
                          color: cat.color ?? "#475569",
                          borderColor: (cat.color ?? "#64748b") + "40",
                        }}
                      >
                        {cat.name}
                      </span>
                    )}
                  </div>

                  {/* SLA progress */}
                  {sla !== null && (
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                        <span className="font-medium">SLA</span>
                        <span className={breach ? "text-red-600 font-semibold" : ""}>
                          {breach ? "Overdue" : `${Math.round(sla)}% used`}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            breach ? "bg-red-500" : sla > 75 ? "bg-amber-500" : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.min(100, sla)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span className="truncate font-medium text-foreground">
                          {t.reporter_name ?? "Unknown"}
                        </span>
                      </div>
                      {t.reporter_email && (
                        <div className="text-[11px] text-muted-foreground truncate">{t.reporter_email}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {assignee ? (
                        <div
                          className="h-6 w-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-semibold"
                          title={assignee.full_name ?? assignee.email ?? ""}
                        >
                          {getInitials(assignee.full_name ?? assignee.email)}
                        </div>
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <NewTicketModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultSource="client"
        onCreated={() => {
          setModalOpen(false)
          loadAll()
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string
  value: number | string
  icon: React.ReactNode
  tone: "blue" | "orange" | "emerald" | "cyan"
}) {
  const toneMap = {
    blue: "bg-blue-50 text-blue-700",
    orange: "bg-orange-50 text-orange-700",
    emerald: "bg-emerald-50 text-emerald-700",
    cyan: "bg-cyan-50 text-cyan-700",
  }
  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
      <div className="p-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground font-medium">{label}</div>
          <div className="text-2xl font-bold mt-1">{value}</div>
        </div>
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${toneMap[tone]}`}>{icon}</div>
      </div>
    </div>
  )
}

