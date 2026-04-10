"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  Flag,
  AlertTriangle,
  CheckCircle2,
  Clock,
  X,
  ChevronDown,
  ChevronUp,
  PhoneCall,
  User as UserIcon,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FlagRow {
  id: string
  call_id: string
  flagged_by_user_id: string | null
  flag_type: string | null
  severity: "low" | "medium" | "high" | "critical" | null
  description: string | null
  status: "open" | "investigating" | "resolved" | "dismissed" | null
  resolved_by_user_id: string | null
  resolved_at: string | null
  resolution_notes: string | null
  created_at: string
}

interface CallRow {
  id: string
  emp_name: string | null
  client_name: string | null
  client_number: string | null
  call_started_at: string | null
  duration_seconds: number | null
}

interface UserRow {
  id: string
  full_name: string | null
  email: string | null
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const SEVERITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  low: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  medium: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  high: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  critical: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
}

const STATUS_STYLES: Record<string, string> = {
  open: "bg-rose-50 text-rose-700",
  investigating: "bg-amber-50 text-amber-700",
  resolved: "bg-emerald-50 text-emerald-700",
  dismissed: "bg-slate-100 text-slate-600",
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function hoursBetween(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60)
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function QAFlagsPage() {
  const [loading, setLoading] = useState(true)
  const [flags, setFlags] = useState<FlagRow[]>([])
  const [calls, setCalls] = useState<Record<string, CallRow>>({})
  const [users, setUsers] = useState<Record<string, UserRow>>({})

  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [severityFilter, setSeverityFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [daysBack, setDaysBack] = useState<number>(30)

  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Resolution form local state
  const [resolveStatus, setResolveStatus] = useState<string>("resolved")
  const [resolveNotes, setResolveNotes] = useState<string>("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const since = new Date()
      since.setDate(since.getDate() - daysBack)
      const sinceIso = since.toISOString()

      const flagRes = await supabase
        .from("call_flags")
        .select(
          "id, call_id, flagged_by_user_id, flag_type, severity, description, status, resolved_by_user_id, resolved_at, resolution_notes, created_at"
        )
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(500)

      const allFlags = (flagRes.data ?? []) as FlagRow[]
      const callIds = Array.from(new Set(allFlags.map((f) => f.call_id))).filter(Boolean)

      const [callsRes, usersRes] = await Promise.all([
        callIds.length > 0
          ? supabase
              .from("calls")
              .select("id, emp_name, client_name, client_number, call_started_at, duration_seconds")
              .in("id", callIds)
          : Promise.resolve({ data: [] }),
        supabase.from("users").select("id, full_name, email"),
      ])

      if (cancelled) return

      const callsMap: Record<string, CallRow> = {}
      for (const c of (callsRes.data ?? []) as CallRow[]) callsMap[c.id] = c

      const usersMap: Record<string, UserRow> = {}
      for (const u of (usersRes.data ?? []) as UserRow[]) usersMap[u.id] = u

      setFlags(allFlags)
      setCalls(callsMap)
      setUsers(usersMap)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [daysBack])

  /* -------------------------------------------------------------- */
  /*  Derived                                                       */
  /* -------------------------------------------------------------- */

  const openFlags = flags.filter((f) => f.status === "open" || f.status === "investigating").length
  const criticalFlags = flags.filter(
    (f) => f.severity === "critical" && (f.status === "open" || f.status === "investigating")
  ).length

  const todayStart = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }, [])

  const resolvedToday = flags.filter(
    (f) => f.resolved_at && new Date(f.resolved_at).getTime() >= todayStart
  ).length

  const avgResolutionHours = useMemo(() => {
    const resolved = flags.filter((f) => f.resolved_at && f.created_at)
    if (resolved.length === 0) return 0
    const total = resolved.reduce((s, f) => s + hoursBetween(f.created_at, f.resolved_at!), 0)
    return Math.round((total / resolved.length) * 10) / 10
  }, [flags])

  const typeOptions = useMemo(() => {
    const s = new Set<string>()
    for (const f of flags) if (f.flag_type) s.add(f.flag_type)
    return Array.from(s).sort()
  }, [flags])

  const filteredFlags = useMemo(() => {
    return flags.filter((f) => {
      if (statusFilter !== "all" && f.status !== statusFilter) return false
      if (severityFilter !== "all" && f.severity !== severityFilter) return false
      if (typeFilter !== "all" && f.flag_type !== typeFilter) return false
      return true
    })
  }, [flags, statusFilter, severityFilter, typeFilter])

  /* -------------------------------------------------------------- */
  /*  Actions                                                       */
  /* -------------------------------------------------------------- */

  function openExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    const f = flags.find((x) => x.id === id)
    setExpandedId(id)
    setResolveStatus(f?.status === "open" ? "investigating" : "resolved")
    setResolveNotes(f?.resolution_notes ?? "")
  }

  async function submitResolution(flagId: string) {
    setSaving(true)
    const patch: Record<string, unknown> = {
      status: resolveStatus,
      resolution_notes: resolveNotes || null,
    }
    if (resolveStatus === "resolved" || resolveStatus === "dismissed") {
      patch.resolved_at = new Date().toISOString()
    }
    const { error } = await supabase.from("call_flags").update(patch).eq("id", flagId)
    setSaving(false)
    if (!error) {
      setFlags((prev) =>
        prev.map((f) =>
          f.id === flagId
            ? {
                ...f,
                status: resolveStatus as FlagRow["status"],
                resolution_notes: resolveNotes || null,
                resolved_at:
                  resolveStatus === "resolved" || resolveStatus === "dismissed"
                    ? new Date().toISOString()
                    : f.resolved_at,
              }
            : f
        )
      )
      setExpandedId(null)
    }
  }

  /* -------------------------------------------------------------- */
  /*  Render                                                        */
  /* -------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-[400px] rounded-lg bg-muted animate-pulse" />
      </div>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Flag Management</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Track, investigate, and resolve QA flags raised on calls
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Open Flags"
          value={openFlags.toString()}
          icon={<Flag className="size-4" />}
          accent="text-rose-600"
        />
        <StatCard
          label="Critical Flags"
          value={criticalFlags.toString()}
          icon={<AlertTriangle className="size-4" />}
          accent="text-red-600"
        />
        <StatCard
          label="Resolved Today"
          value={resolvedToday.toString()}
          icon={<CheckCircle2 className="size-4" />}
          accent="text-emerald-600"
        />
        <StatCard
          label="Avg Resolution"
          value={`${avgResolutionHours}h`}
          icon={<Clock className="size-4" />}
          accent="text-blue-600"
        />
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
          Filters
        </div>
        <div className="px-5 py-4 flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="all">All</option>
              <option value="open">Open</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Severity</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="all">All</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Flag type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="all">All types</option>
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Date range</label>
            <select
              value={daysBack}
              onChange={(e) => setDaysBack(Number(e.target.value))}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Flag list */}
      <div className="space-y-3">
        {filteredFlags.length === 0 ? (
          <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden px-5 py-12 text-center text-sm text-muted-foreground">
            No flags match the current filters.
          </div>
        ) : (
          filteredFlags.map((f) => {
            const sev = f.severity ?? "low"
            const sevStyle = SEVERITY_STYLES[sev] ?? SEVERITY_STYLES.low
            const statusStyle = STATUS_STYLES[f.status ?? "open"] ?? STATUS_STYLES.open
            const flagger = f.flagged_by_user_id ? users[f.flagged_by_user_id] : null
            const call = calls[f.call_id]
            const isExpanded = expandedId === f.id
            return (
              <div
                key={f.id}
                className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => openExpand(f.id)}
                  className="w-full text-left px-5 py-4 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Badges row */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full border ${sevStyle.bg} ${sevStyle.text} ${sevStyle.border} uppercase`}
                        >
                          {sev}
                        </span>
                        {f.flag_type && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-50 text-violet-700">
                            {f.flag_type}
                          </span>
                        )}
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyle}`}>
                          {f.status ?? "open"}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-foreground line-clamp-2">
                        {f.description ?? <span className="italic text-muted-foreground">No description provided</span>}
                      </p>

                      {/* Meta row */}
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <UserIcon className="size-3" />
                          Flagged by {flagger?.full_name ?? "Unknown"}
                        </span>
                        <span>{formatDate(f.created_at)}</span>
                        {call && (
                          <Link
                            href={`/workspace/qa/calls/${f.call_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <PhoneCall className="size-3" />
                            {call.emp_name ?? "Employee"} {"->"} {call.client_name ?? "Client"}
                          </Link>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="size-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded panel */}
                {isExpanded && (
                  <div className="border-t bg-muted/20 px-5 py-4 space-y-4">
                    {/* Full info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                          Flag details
                        </div>
                        <div className="space-y-1">
                          <div><span className="text-muted-foreground">Type:</span> {f.flag_type ?? "—"}</div>
                          <div><span className="text-muted-foreground">Severity:</span> {sev}</div>
                          <div><span className="text-muted-foreground">Created:</span> {formatDate(f.created_at)}</div>
                          {f.resolved_at && (
                            <div><span className="text-muted-foreground">Resolved:</span> {formatDate(f.resolved_at)}</div>
                          )}
                        </div>
                      </div>
                      {call && (
                        <div>
                          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                            Related call
                          </div>
                          <div className="space-y-1">
                            <div><span className="text-muted-foreground">Employee:</span> {call.emp_name ?? "—"}</div>
                            <div><span className="text-muted-foreground">Client:</span> {call.client_name ?? "—"}</div>
                            <div><span className="text-muted-foreground">Number:</span> {call.client_number ?? "—"}</div>
                            <div><span className="text-muted-foreground">Started:</span> {formatDate(call.call_started_at)}</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Full description */}
                    {f.description && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                          Description
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{f.description}</p>
                      </div>
                    )}

                    {/* Resolution form */}
                    {f.status !== "resolved" && f.status !== "dismissed" ? (
                      <div className="border-t pt-4 space-y-3">
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Resolve flag
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium">Status</label>
                            <select
                              value={resolveStatus}
                              onChange={(e) => setResolveStatus(e.target.value)}
                              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
                            >
                              <option value="investigating">Investigating</option>
                              <option value="resolved">Resolved</option>
                              <option value="dismissed">Dismissed</option>
                            </select>
                          </div>
                          <div className="md:col-span-2 flex flex-col gap-1">
                            <label className="text-xs font-medium">Resolution notes</label>
                            <textarea
                              value={resolveNotes}
                              onChange={(e) => setResolveNotes(e.target.value)}
                              rows={3}
                              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                              placeholder="How was this resolved?"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => submitResolution(f.id)}
                            disabled={saving}
                          >
                            {saving ? "Saving..." : "Resolve"}
                          </Button>
                          <Button variant="ghost" onClick={() => setExpandedId(null)}>
                            <X className="size-4" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      f.resolution_notes && (
                        <div className="border-t pt-4">
                          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                            Resolution notes
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{f.resolution_notes}</p>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Stat card                                                          */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string
  value: string
  icon: React.ReactNode
  accent: string
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
      <div className="px-5 py-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </span>
          <span className={accent}>{icon}</span>
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
      </div>
    </div>
  )
}
