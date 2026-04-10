"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  LifeBuoy,
  MessageSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  User,
  Tag,
  Plus,
  Send,
  ArrowLeft,
  Building2,
  Package,
  ExternalLink,
  Edit,
  Lock,
  Unlock,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import {
  RichTextEditor,
  RichTextRenderer,
  richTextToPlain,
} from "@/components/shared/rich-text-editor"

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
  reporter_user_id: string | null
  reporter_name: string | null
  reporter_email: string | null
  reporter_phone: string | null
  assignee_user_id: string | null
  assignee_team: string | null
  retailer_id: string | null
  retailer_name: string | null
  related_order_id: string | null
  related_product_id: string | null
  related_task_id: string | null
  related_brand_store_id: string | null
  due_at: string | null
  first_responded_at: string | null
  resolved_at: string | null
  closed_at: string | null
  reopened_at: string | null
  reopen_count: number | null
  resolution_summary: string | null
  resolution_type: string | null
  tags: string[] | null
  created_at: string
  updated_at: string | null
}

interface CommentRow {
  id: string
  ticket_id: string
  author_user_id: string | null
  author_name: string | null
  body: string
  is_internal: boolean
  created_at: string
}

interface ActivityRow {
  id: string
  ticket_id: string
  actor_user_id: string | null
  actor_name: string | null
  action: string
  from_value: string | null
  to_value: string | null
  metadata: Record<string, unknown> | null
  created_at: string
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
  icon: string | null
}

// ---------------------------------------------------------------------------
// Styling helpers
// ---------------------------------------------------------------------------

const ALL_STATUSES: TicketStatus[] = [
  "open",
  "triaged",
  "in_progress",
  "waiting_on_customer",
  "waiting_on_internal",
  "resolved",
  "closed",
  "reopened",
]

const ALL_PRIORITIES: TicketPriority[] = ["low", "medium", "high", "urgent", "critical"]

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

const RESOLUTION_LABELS: Record<string, string> = {
  fixed: "Fixed",
  duplicate: "Duplicate",
  not_a_bug: "Not a Bug",
  wont_fix: "Won't Fix",
  refunded: "Refunded",
  replaced: "Replaced",
  escalated: "Escalated",
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
  const secs = Math.floor(abs / 1000)
  if (secs < 30) return "just now"
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ${past ? "ago" : "from now"}`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ${past ? "ago" : "from now"}`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ${past ? "ago" : "from now"}`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ${past ? "ago" : "from now"}`
  const years = Math.floor(months / 12)
  return `${years} year${years === 1 ? "" : "s"} ${past ? "ago" : "from now"}`
}

function formatAbsolute(iso: string | null): string {
  if (!iso) return ""
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function isOverdue(dueAt: string | null, now: number): boolean {
  if (!dueAt) return false
  return new Date(dueAt).getTime() < now
}

function slaPercent(createdAt: string, dueAt: string | null, now: number): number | null {
  if (!dueAt) return null
  const start = new Date(createdAt).getTime()
  const end = new Date(dueAt).getTime()
  const total = end - start
  if (total <= 0) return 100
  const used = now - start
  return Math.max(0, (used / total) * 100)
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "0m"
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ${mins % 60}m`
  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}h`
}

// ---------------------------------------------------------------------------
// Activity icon helper
// ---------------------------------------------------------------------------

function ActivityIcon({ action }: { action: string }) {
  const base = "h-3.5 w-3.5"
  if (action === "created") return <Plus className={base} />
  if (action === "commented") return <MessageSquare className={base} />
  if (action === "status_changed") return <RefreshCw className={base} />
  if (action === "assigned" || action === "reassigned") return <User className={base} />
  if (action === "resolved") return <CheckCircle2 className={base} />
  if (action === "reopened") return <RefreshCw className={base} />
  if (action === "closed") return <XCircle className={base} />
  if (action === "priority_changed") return <AlertTriangle className={base} />
  if (action === "title_changed" || action === "description_changed") return <Edit className={base} />
  if (action === "tags_changed") return <Tag className={base} />
  return <Clock className={base} />
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>()
  const ticketId = params?.id as string
  const router = useRouter()

  const [ticket, setTicket] = useState<TicketRow | null>(null)
  const [comments, setComments] = useState<CommentRow[]>([])
  const [activity, setActivity] = useState<ActivityRow[]>([])
  const [users, setUsers] = useState<Record<string, UserLite>>({})
  const [category, setCategory] = useState<CategoryLite | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Editing
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState("")

  // Composer
  const [composerValue, setComposerValue] = useState("")
  const [composerInternal, setComposerInternal] = useState(false)
  const [sending, setSending] = useState(false)

  // Modals
  const [resolveOpen, setResolveOpen] = useState(false)
  const [reopenOpen, setReopenOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)

  // Neighbor ids for prev/next (within same source)
  const [prevId, setPrevId] = useState<string | null>(null)
  const [nextId, setNextId] = useState<string | null>(null)

  // Ticking clock for time calculations (updates every minute)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(id)
  }, [])

  const composerValueRef = useRef(composerValue)
  useEffect(() => {
    composerValueRef.current = composerValue
  }, [composerValue])

  const loadTicket = useCallback(async () => {
    if (!ticketId) return
    setLoading(true)
    setError(null)

    const { data: ticketData, error: tErr } = await supabase
      .from("tickets")
      .select("*")
      .eq("id", ticketId)
      .single()

    if (tErr || !ticketData) {
      setError(tErr?.message ?? "Ticket not found")
      setLoading(false)
      return
    }

    const t = ticketData as TicketRow
    setTicket(t)
    setTitleDraft(t.title)

    // Parallel fetches
    const [commentsRes, activityRes, usersRes, catRes, neighborsRes] = await Promise.all([
      supabase.from("ticket_comments").select("*").eq("ticket_id", ticketId).order("created_at", { ascending: true }),
      supabase.from("ticket_activity").select("*").eq("ticket_id", ticketId).order("created_at", { ascending: true }),
      supabase.from("users").select("id, full_name, email, avatar_url").limit(500),
      t.category_id
        ? supabase.from("ticket_categories").select("id, name, color, icon").eq("id", t.category_id).single()
        : Promise.resolve({ data: null }),
      supabase
        .from("tickets")
        .select("id, created_at")
        .eq("source", t.source)
        .order("created_at", { ascending: false })
        .limit(500),
    ])

    setComments((commentsRes.data as CommentRow[]) ?? [])
    setActivity((activityRes.data as ActivityRow[]) ?? [])

    const userMap: Record<string, UserLite> = {}
    for (const u of (usersRes.data as UserLite[]) ?? []) userMap[u.id] = u
    setUsers(userMap)

    setCategory((catRes as { data: CategoryLite | null }).data ?? null)

    const neighbors = (neighborsRes.data as { id: string; created_at: string }[]) ?? []
    const idx = neighbors.findIndex((n) => n.id === ticketId)
    setPrevId(idx > 0 ? neighbors[idx - 1].id : null)
    setNextId(idx >= 0 && idx < neighbors.length - 1 ? neighbors[idx + 1].id : null)

    setLoading(false)
  }, [ticketId])

  useEffect(() => {
    Promise.resolve().then(loadTicket)
  }, [loadTicket])

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  async function saveTitle() {
    if (!ticket || !titleDraft.trim() || titleDraft === ticket.title) {
      setEditingTitle(false)
      setTitleDraft(ticket?.title ?? "")
      return
    }
    await fetch(`/api/tickets/${ticket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: titleDraft.trim() }),
    })
    setEditingTitle(false)
    loadTicket()
  }

  async function changeStatus(status: TicketStatus) {
    if (!ticket || status === ticket.status) return
    await fetch(`/api/tickets/${ticket.id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    loadTicket()
  }

  async function changePriority(priority: TicketPriority) {
    if (!ticket || priority === ticket.priority) return
    await fetch(`/api/tickets/${ticket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priority }),
    })
    loadTicket()
  }

  async function assignUser(userId: string | null) {
    if (!ticket) return
    await fetch(`/api/tickets/${ticket.id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignee_user_id: userId }),
    })
    setAssignOpen(false)
    loadTicket()
  }

  async function sendComment() {
    if (!ticket) return
    const body = composerValueRef.current
    if (!body || !richTextToPlain(body).trim()) return
    setSending(true)
    await fetch(`/api/tickets/${ticket.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, is_internal: composerInternal }),
    })
    setComposerValue("")
    composerValueRef.current = ""
    setSending(false)
    loadTicket()
  }

  // -------------------------------------------------------------------------
  // Timeline merge
  // -------------------------------------------------------------------------

  type TimelineItem =
    | { type: "comment"; created_at: string; data: CommentRow }
    | { type: "activity"; created_at: string; data: ActivityRow }

  const timeline: TimelineItem[] = useMemo(() => {
    const items: TimelineItem[] = []
    for (const c of comments) items.push({ type: "comment", created_at: c.created_at, data: c })
    for (const a of activity) {
      // Skip duplicate "commented" entries — the comment itself will show
      if (a.action === "commented") continue
      items.push({ type: "activity", created_at: a.created_at, data: a })
    }
    items.sort((x, y) => new Date(x.created_at).getTime() - new Date(y.created_at).getTime())
    return items
  }, [comments, activity])

  // -------------------------------------------------------------------------
  // Render states
  // -------------------------------------------------------------------------

  if (loading && !ticket) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <div className="h-8 w-32 rounded-md bg-muted animate-pulse" />
        <div className="rounded-lg border border-border/80 bg-card shadow-sm h-32 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="rounded-lg border border-border/80 bg-card shadow-sm h-48 animate-pulse" />
            <div className="rounded-lg border border-border/80 bg-card shadow-sm h-96 animate-pulse" />
          </div>
          <div className="space-y-5">
            <div className="rounded-lg border border-border/80 bg-card shadow-sm h-64 animate-pulse" />
            <div className="rounded-lg border border-border/80 bg-card shadow-sm h-40 animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <Link
          href="/workspace/tickets/all"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to tickets
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
          <AlertTriangle className="h-5 w-5 mx-auto mb-2" />
          {error ?? "Ticket not found"}
        </div>
      </div>
    )
  }

  const assignee = ticket.assignee_user_id ? users[ticket.assignee_user_id] : null
  const reporter = ticket.reporter_user_id ? users[ticket.reporter_user_id] : null
  const reporterName = reporter?.full_name ?? ticket.reporter_name
  const reporterEmail = reporter?.email ?? ticket.reporter_email
  const sla = slaPercent(ticket.created_at, ticket.due_at, now)
  const slaBreach = sla !== null && sla >= 100
  const overdue = isOverdue(ticket.due_at, now)
  const isTerminal = ticket.status === "resolved" || ticket.status === "closed"

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Back link + prev/next */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/workspace/tickets/all"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to tickets
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={() => prevId && router.push(`/workspace/tickets/${prevId}`)}
            disabled={!prevId}
            className="h-8 px-2 rounded-md text-xs font-medium border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Prev
          </button>
          <button
            onClick={() => nextId && router.push(`/workspace/tickets/${nextId}`)}
            disabled={!nextId}
            className="h-8 px-2 rounded-md text-xs font-medium border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Header card */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3 flex-wrap">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-mono text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  TKT-{ticket.ticket_number}
                </span>
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border ${STATUS_CLASS[ticket.status]}`}
                >
                  {STATUS_LABEL[ticket.status]}
                </span>
                <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border bg-muted border-border capitalize">
                  {ticket.source}
                </span>
                {category && (
                  <span
                    className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border"
                    style={{
                      backgroundColor: (category.color ?? "#64748b") + "18",
                      color: category.color ?? "#475569",
                      borderColor: (category.color ?? "#64748b") + "40",
                    }}
                  >
                    {category.name}
                  </span>
                )}
              </div>

              {editingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    autoFocus
                    onBlur={saveTitle}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveTitle()
                      if (e.key === "Escape") {
                        setEditingTitle(false)
                        setTitleDraft(ticket.title)
                      }
                    }}
                    className="flex-1 text-2xl font-bold bg-transparent border-b-2 border-primary outline-none"
                  />
                </div>
              ) : (
                <h1
                  className="text-2xl font-bold cursor-text hover:bg-muted/40 rounded px-1 -mx-1 leading-tight"
                  onClick={() => setEditingTitle(true)}
                  title="Click to edit"
                >
                  {ticket.title}
                </h1>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border/60">
            <StatusDropdown current={ticket.status} onChange={changeStatus} />
            <PriorityDropdown current={ticket.priority} onChange={changePriority} />
            <Button variant="outline" size="sm" onClick={() => setAssignOpen((v) => !v)}>
              <User className="h-3.5 w-3.5" /> Assign
            </Button>
            {!isTerminal && (
              <Button variant="outline" size="sm" onClick={() => setResolveOpen(true)}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
              </Button>
            )}
            {ticket.status !== "closed" && (
              <Button variant="outline" size="sm" onClick={() => changeStatus("closed")}>
                <XCircle className="h-3.5 w-3.5" /> Close
              </Button>
            )}
            {isTerminal && (
              <Button variant="outline" size="sm" onClick={() => setReopenOpen(true)}>
                <RefreshCw className="h-3.5 w-3.5" /> Reopen
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setComposerInternal(true)
                document.getElementById("ticket-composer")?.scrollIntoView({ behavior: "smooth" })
              }}
            >
              <Lock className="h-3.5 w-3.5" /> Internal Note
            </Button>
          </div>

          {/* Assign popover */}
          {assignOpen && (
            <div className="rounded-md border border-border/80 bg-background p-3 space-y-2 max-h-64 overflow-y-auto">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Assign to
              </div>
              <button
                onClick={() => assignUser(null)}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-sm"
              >
                Unassigned
              </button>
              {Object.values(users).map((u) => (
                <button
                  key={u.id}
                  onClick={() => assignUser(u.id)}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-sm flex items-center gap-2"
                >
                  <div className="h-6 w-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-semibold">
                    {getInitials(u.full_name ?? u.email)}
                  </div>
                  <span className="truncate">{u.full_name ?? u.email}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT (2 cols) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Description */}
          <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
              Description
            </div>
            <div className="p-5">
              {ticket.description ? (
                <RichTextRenderer content={ticket.description} />
              ) : (
                <p className="text-sm text-muted-foreground italic">No description provided.</p>
              )}
            </div>
          </div>

          {/* Activity timeline */}
          <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight flex items-center justify-between">
              <span>Activity</span>
              <span className="text-xs font-normal text-muted-foreground">
                {comments.length} comment{comments.length === 1 ? "" : "s"} · {activity.length} event
                {activity.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="p-5">
              {timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground italic text-center py-6">
                  No activity yet. Be the first to comment.
                </p>
              ) : (
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-[14px] top-2 bottom-2 w-px bg-border" />
                  <div className="space-y-5">
                    {timeline.map((item) => {
                      if (item.type === "comment") {
                        const c = item.data
                        return (
                          <div key={`c-${c.id}`} className="relative pl-10">
                            <div className="absolute left-0 top-0 h-7 w-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-semibold border-2 border-card">
                              {getInitials(c.author_name)}
                            </div>
                            <div className="flex items-center gap-2 text-xs mb-1.5 flex-wrap">
                              <span className="font-semibold text-foreground">
                                {c.author_name ?? "Unknown"}
                              </span>
                              <span className="text-muted-foreground">commented</span>
                              <span className="text-muted-foreground">·</span>
                              <span className="text-muted-foreground" title={formatAbsolute(c.created_at)}>
                                {formatRelative(c.created_at, now)}
                              </span>
                              {c.is_internal && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                  <Lock className="h-2.5 w-2.5" /> Internal note
                                </span>
                              )}
                            </div>
                            <div
                              className={`rounded-md border p-3 ${
                                c.is_internal
                                  ? "border-amber-200 bg-amber-50/50"
                                  : "border-border/60 bg-muted/30"
                              }`}
                            >
                              <RichTextRenderer content={c.body} />
                            </div>
                          </div>
                        )
                      }
                      // Activity
                      const a = item.data
                      return (
                        <div key={`a-${a.id}`} className="relative pl-10">
                          <div className="absolute left-0 top-0 h-7 w-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center border-2 border-card">
                            <ActivityIcon action={a.action} />
                          </div>
                          <div className="text-xs text-muted-foreground pt-1">
                            <span className="font-semibold text-foreground">{a.actor_name ?? "System"}</span>{" "}
                            {describeActivity(a)}{" "}
                            <span
                              className="text-muted-foreground/80"
                              title={formatAbsolute(a.created_at)}
                            >
                              · {formatRelative(a.created_at, now)}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Composer */}
          <div
            id="ticket-composer"
            className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden"
          >
            <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight flex items-center justify-between">
              <span>Reply</span>
              <button
                onClick={() => setComposerInternal((v) => !v)}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                  composerInternal
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-background text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                {composerInternal ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                Internal note
              </button>
            </div>
            <div className="p-5 space-y-3">
              <RichTextEditor
                value={composerValue}
                onChange={setComposerValue}
                placeholder={composerInternal ? "Write an internal note..." : "Write a reply..."}
                minHeight="80px"
              />
              <div className="flex items-center justify-end gap-2">
                <Button onClick={sendComment} disabled={sending}>
                  <Send className="h-3.5 w-3.5" />
                  {sending ? "Sending..." : composerInternal ? "Post Note" : "Send Reply"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT column */}
        <div className="space-y-5">
          {/* Ticket Info */}
          <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
              Ticket Info
            </div>
            <div className="p-5 space-y-3 text-sm">
              <InfoRow label="Source">
                <span className="capitalize">{ticket.source}</span>
              </InfoRow>
              <InfoRow label="Category">
                {category ? (
                  <span
                    className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border"
                    style={{
                      backgroundColor: (category.color ?? "#64748b") + "18",
                      color: category.color ?? "#475569",
                      borderColor: (category.color ?? "#64748b") + "40",
                    }}
                  >
                    {category.name}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </InfoRow>
              <InfoRow label="Priority">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${PRIORITY_CLASS[ticket.priority]}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[ticket.priority]}`} />
                  {ticket.priority}
                </span>
              </InfoRow>
              <InfoRow label="Status">
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border ${STATUS_CLASS[ticket.status]}`}
                >
                  {STATUS_LABEL[ticket.status]}
                </span>
              </InfoRow>
              <InfoRow label="Reporter">
                <div className="text-right">
                  <div className="font-medium text-foreground">{reporterName ?? "—"}</div>
                  {reporterEmail && (
                    <div className="text-[11px] text-muted-foreground">{reporterEmail}</div>
                  )}
                </div>
              </InfoRow>
              <InfoRow label="Assignee">
                {assignee ? (
                  <div className="flex items-center gap-1.5">
                    <div className="h-5 w-5 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[9px] font-semibold">
                      {getInitials(assignee.full_name ?? assignee.email)}
                    </div>
                    <span className="text-xs">{assignee.full_name ?? assignee.email}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-xs">Unassigned</span>
                )}
              </InfoRow>
              <InfoRow label="Created">
                <div className="text-right">
                  <div className="text-xs">{formatRelative(ticket.created_at, now)}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {formatAbsolute(ticket.created_at)}
                  </div>
                </div>
              </InfoRow>
              {ticket.updated_at && (
                <InfoRow label="Updated">
                  <div className="text-xs">{formatRelative(ticket.updated_at, now)}</div>
                </InfoRow>
              )}
              {ticket.due_at && (
                <InfoRow label="Due">
                  <div className={`text-xs ${overdue ? "text-red-600 font-semibold" : ""}`}>
                    {formatRelative(ticket.due_at, now)}
                  </div>
                </InfoRow>
              )}
              {ticket.resolution_type && (
                <InfoRow label="Resolution">
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {RESOLUTION_LABELS[ticket.resolution_type] ?? ticket.resolution_type}
                  </span>
                </InfoRow>
              )}
              {ticket.tags && ticket.tags.length > 0 && (
                <InfoRow label="Tags">
                  <div className="flex flex-wrap gap-1 justify-end">
                    {ticket.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </InfoRow>
              )}
            </div>
          </div>

          {/* Linked Items */}
          <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
              Linked Items
            </div>
            <div className="p-5 space-y-2 text-sm">
              {ticket.source === "client" ? (
                <>
                  {ticket.retailer_id ? (
                    <LinkedItem
                      icon={<Building2 className="h-3.5 w-3.5" />}
                      label="Retailer"
                      href={`/retailers/directory/${ticket.retailer_id}`}
                      value={ticket.retailer_name ?? ticket.retailer_id}
                    />
                  ) : (
                    <EmptyLink label="Retailer" />
                  )}
                  {ticket.related_order_id ? (
                    <LinkedItem
                      icon={<Package className="h-3.5 w-3.5" />}
                      label="Order"
                      href={`/orders/${ticket.related_order_id}`}
                      value={ticket.related_order_id}
                    />
                  ) : (
                    <EmptyLink label="Order" />
                  )}
                  {ticket.related_product_id ? (
                    <LinkedItem
                      icon={<Tag className="h-3.5 w-3.5" />}
                      label="Product"
                      href={`/products/${ticket.related_product_id}`}
                      value={ticket.related_product_id}
                    />
                  ) : (
                    <EmptyLink label="Product" />
                  )}
                </>
              ) : (
                <>
                  {ticket.related_task_id ? (
                    <LinkedItem
                      icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                      label="Task"
                      href={`/workspace/tasks/${ticket.related_task_id}`}
                      value={ticket.related_task_id}
                    />
                  ) : (
                    <EmptyLink label="Task" />
                  )}
                  {ticket.related_brand_store_id ? (
                    <LinkedItem
                      icon={<Building2 className="h-3.5 w-3.5" />}
                      label="Store"
                      href={`/workspace/stores/${ticket.related_brand_store_id}`}
                      value={ticket.related_brand_store_id}
                    />
                  ) : (
                    <EmptyLink label="Store" />
                  )}
                </>
              )}
            </div>
          </div>

          {/* SLA */}
          {ticket.due_at && sla !== null && (
            <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">SLA</div>
              <div className="p-5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Time used</span>
                  <span className={slaBreach ? "text-red-600 font-semibold" : "font-semibold"}>
                    {slaBreach ? "Breached" : `${Math.round(sla)}%`}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      slaBreach ? "bg-red-500" : sla > 75 ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, sla)}%` }}
                  />
                </div>
                <div className="text-[11px] text-muted-foreground pt-1">
                  {slaBreach ? (
                    <span className="flex items-center gap-1 text-red-600 font-medium">
                      <AlertTriangle className="h-3 w-3" />
                      Breached by {formatDuration(now - new Date(ticket.due_at).getTime())}
                    </span>
                  ) : (
                    <span>
                      {formatDuration(new Date(ticket.due_at).getTime() - now)} remaining
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Resolution */}
          {isTerminal && (
            <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
                Resolution
              </div>
              <div className="p-5 space-y-3 text-sm">
                {ticket.resolution_type && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Type</div>
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {RESOLUTION_LABELS[ticket.resolution_type] ?? ticket.resolution_type}
                    </span>
                  </div>
                )}
                {ticket.resolution_summary && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Summary</div>
                    <p className="text-sm whitespace-pre-wrap">{ticket.resolution_summary}</p>
                  </div>
                )}
                {ticket.resolved_at && (
                  <div className="text-xs text-muted-foreground">
                    Resolved {formatRelative(ticket.resolved_at, now)}
                  </div>
                )}
                {ticket.closed_at && (
                  <div className="text-xs text-muted-foreground">
                    Closed {formatRelative(ticket.closed_at, now)}
                  </div>
                )}
                {(ticket.reopen_count ?? 0) > 0 && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" />
                    Reopened {ticket.reopen_count} time{ticket.reopen_count === 1 ? "" : "s"}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resolve Modal */}
      {resolveOpen && (
        <ResolveModal
          ticketId={ticket.id}
          onClose={() => setResolveOpen(false)}
          onDone={() => {
            setResolveOpen(false)
            loadTicket()
          }}
        />
      )}

      {/* Reopen Modal */}
      {reopenOpen && (
        <ReopenModal
          ticketId={ticket.id}
          onClose={() => setReopenOpen(false)}
          onDone={() => {
            setReopenOpen(false)
            loadTicket()
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub components
// ---------------------------------------------------------------------------

function describeActivity(a: ActivityRow): string {
  const from = a.from_value
  const to = a.to_value
  if (a.action === "created") return "created the ticket"
  if (a.action === "status_changed")
    return `changed status from ${STATUS_LABEL[(from as TicketStatus) ?? "open"] ?? from ?? "—"} to ${
      STATUS_LABEL[(to as TicketStatus) ?? "open"] ?? to ?? "—"
    }`
  if (a.action === "priority_changed") return `changed priority from ${from ?? "—"} to ${to ?? "—"}`
  if (a.action === "assigned") return "assigned the ticket"
  if (a.action === "reassigned") return "reassigned the ticket"
  if (a.action === "resolved") return "resolved the ticket"
  if (a.action === "reopened") return "reopened the ticket"
  if (a.action === "closed") return "closed the ticket"
  if (a.action === "title_changed") return "updated the title"
  if (a.action === "description_changed") return "updated the description"
  if (a.action === "tags_changed") return "updated tags"
  if (a.action === "due_at_changed") return "updated the due date"
  return a.action.replace(/_/g, " ")
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-muted-foreground font-medium flex-shrink-0">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  )
}

function LinkedItem({
  icon,
  label,
  href,
  value,
}: {
  icon: React.ReactNode
  label: string
  href: string
  value: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background hover:bg-muted/40 px-3 py-2 transition-colors group"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-muted-foreground">{icon}</span>
        <div className="min-w-0">
          <div className="text-[11px] text-muted-foreground">{label}</div>
          <div className="text-xs font-medium truncate group-hover:text-primary">{value}</div>
        </div>
      </div>
      <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
    </Link>
  )
}

function EmptyLink({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed border-border/60 bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
      No {label.toLowerCase()} linked
    </div>
  )
}

function StatusDropdown({
  current,
  onChange,
}: {
  current: TicketStatus
  onChange: (s: TicketStatus) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])
  return (
    <div ref={ref} className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${STATUS_CLASS[current]}`}
        >
          {STATUS_LABEL[current]}
        </span>
      </Button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-48 rounded-md border border-border/80 bg-card shadow-lg z-20 py-1">
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => {
                onChange(s)
                setOpen(false)
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-muted text-xs flex items-center gap-2"
            >
              <span
                className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border ${STATUS_CLASS[s]}`}
              >
                {STATUS_LABEL[s]}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PriorityDropdown({
  current,
  onChange,
}: {
  current: TicketPriority
  onChange: (p: TicketPriority) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])
  return (
    <div ref={ref} className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
        <span
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${PRIORITY_CLASS[current]}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[current]}`} />
          {current}
        </span>
      </Button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-40 rounded-md border border-border/80 bg-card shadow-lg z-20 py-1">
          {ALL_PRIORITIES.map((p) => (
            <button
              key={p}
              onClick={() => {
                onChange(p)
                setOpen(false)
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-muted text-xs flex items-center gap-2 capitalize"
            >
              <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[p]}`} />
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Resolve Modal
// ---------------------------------------------------------------------------

function ResolveModal({
  ticketId,
  onClose,
  onDone,
}: {
  ticketId: string
  onClose: () => void
  onDone: () => void
}) {
  const [type, setType] = useState("fixed")
  const [summary, setSummary] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    setSubmitting(true)
    setErr(null)
    try {
      const res = await fetch(`/api/tickets/${ticketId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution_type: type, resolution_summary: summary }),
      })
      if (!res.ok) throw new Error((await res.text()) || "Failed to resolve")
      onDone()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm py-10 px-4">
      <div className="w-full max-w-md rounded-lg border border-border/80 bg-card shadow-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          Resolve Ticket
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Resolution type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="fixed">Fixed</option>
              <option value="duplicate">Duplicate</option>
              <option value="not_a_bug">Not a Bug</option>
              <option value="wont_fix">Won&apos;t Fix</option>
              <option value="refunded">Refunded</option>
              <option value="replaced">Replaced</option>
              <option value="escalated">Escalated</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Summary</label>
            <textarea
              rows={4}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Briefly describe how this was resolved..."
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-y"
            />
          </div>
          {err && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 text-red-700 px-3 py-2 text-xs">
              <AlertTriangle className="h-3.5 w-3.5" /> {err}
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? "Resolving..." : "Resolve"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Reopen Modal
// ---------------------------------------------------------------------------

function ReopenModal({
  ticketId,
  onClose,
  onDone,
}: {
  ticketId: string
  onClose: () => void
  onDone: () => void
}) {
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    setSubmitting(true)
    setErr(null)
    try {
      const res = await fetch(`/api/tickets/${ticketId}/reopen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })
      if (!res.ok) throw new Error((await res.text()) || "Failed to reopen")
      onDone()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm py-10 px-4">
      <div className="w-full max-w-md rounded-lg border border-border/80 bg-card shadow-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-red-600" />
          Reopen Ticket
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Reason</label>
            <textarea
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you reopening this ticket?"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-y"
            />
          </div>
          {err && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 text-red-700 px-3 py-2 text-xs">
              <AlertTriangle className="h-3.5 w-3.5" /> {err}
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? "Reopening..." : "Reopen"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
