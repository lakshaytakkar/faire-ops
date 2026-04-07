"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  Calendar,
  Plus,
  X,
  List,
  LayoutGrid,
  Megaphone,
  Clock,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Trash2,
  Pencil,
} from "lucide-react"
import { Dialog } from "@base-ui/react/dialog"
import { supabase } from "@/lib/supabase"
import { useBrandFilter } from "@/lib/brand-filter-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type EventType = "holiday" | "sale" | "season" | "custom"
type EventStatus = "planned" | "active" | "completed"

interface MarketingEvent {
  id: string
  name: string
  start_date: string
  end_date: string
  event_type: EventType
  marketing_window_start: string | null
  marketing_window_end: string | null
  description: string | null
  status: EventStatus
  store_ids: string[] | null
  budget_cents: number | null
  notes: string | null
  created_at: string
}

interface EventForm {
  name: string
  start_date: string
  end_date: string
  event_type: EventType
  marketing_window_start: string
  marketing_window_end: string
  description: string
  status: EventStatus
  budget_dollars: string
  store_ids: string[]
  notes: string
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const EMPTY_FORM: EventForm = {
  name: "",
  start_date: "",
  end_date: "",
  event_type: "custom",
  marketing_window_start: "",
  marketing_window_end: "",
  description: "",
  status: "planned",
  budget_dollars: "",
  store_ids: [],
  notes: "",
}

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  holiday: "Holiday",
  sale: "Sale",
  season: "Season",
  custom: "Custom",
}

const EVENT_TYPE_COLORS: Record<EventType, { bg: string; text: string; bar: string; light: string }> = {
  holiday: { bg: "bg-red-50", text: "text-red-700", bar: "bg-red-500", light: "bg-red-200" },
  sale: { bg: "bg-amber-50", text: "text-amber-700", bar: "bg-amber-500", light: "bg-amber-200" },
  season: { bg: "bg-emerald-50", text: "text-emerald-700", bar: "bg-emerald-500", light: "bg-emerald-200" },
  custom: { bg: "bg-blue-50", text: "text-blue-700", bar: "bg-blue-500", light: "bg-blue-200" },
}

const STATUS_VARIANTS: Record<EventStatus, { label: string; className: string }> = {
  planned: { label: "Planned", className: "bg-slate-100 text-slate-600" },
  active: { label: "Active", className: "bg-emerald-50 text-emerald-700" },
  completed: { label: "Completed", className: "bg-blue-50 text-blue-700" },
}

const EVENT_TYPES: EventType[] = ["holiday", "sale", "season", "custom"]
const EVENT_STATUSES: EventStatus[] = ["planned", "active", "completed"]

const QUARTERS = [
  { label: "Q1", months: [0, 1, 2], monthLabels: ["Jan", "Feb", "Mar"] },
  { label: "Q2", months: [3, 4, 5], monthLabels: ["Apr", "May", "Jun"] },
  { label: "Q3", months: [6, 7, 8], monthLabels: ["Jul", "Aug", "Sep"] },
  { label: "Q4", months: [9, 10, 11], monthLabels: ["Oct", "Nov", "Dec"] },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function parseDate(d: string): Date {
  return new Date(d + "T00:00:00")
}

function formatDate(d: string): string {
  return parseDate(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatCurrency(cents: number): string {
  return "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function daysBetween(a: string, b: string): number {
  const d1 = parseDate(a)
  const d2 = parseDate(b)
  return Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0]
}

function suggestMarketingStart(startDate: string): string {
  if (!startDate) return ""
  const d = parseDate(startDate)
  d.setDate(d.getDate() - 28)
  return d.toISOString().split("T")[0]
}

function suggestMarketingEnd(startDate: string): string {
  if (!startDate) return ""
  const d = parseDate(startDate)
  d.setDate(d.getDate() - 1)
  return d.toISOString().split("T")[0]
}

/** Returns position as % within a quarter (0-100). Clamps to [0,100]. */
function positionInQuarter(date: string, quarterIndex: number): number {
  const d = parseDate(date)
  const year = 2026
  const qStartMonth = quarterIndex * 3
  const qStart = new Date(year, qStartMonth, 1)
  const qEnd = new Date(year, qStartMonth + 3, 0) // last day of quarter
  const totalDays = (qEnd.getTime() - qStart.getTime()) / (1000 * 60 * 60 * 24)
  const elapsed = (d.getTime() - qStart.getTime()) / (1000 * 60 * 60 * 24)
  return Math.max(0, Math.min(100, (elapsed / totalDays) * 100))
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: EventStatus }) {
  const v = STATUS_VARIANTS[status]
  return (
    <span className={`inline-flex items-center border-0 text-xs font-medium px-2 py-0.5 rounded-full ${v.className}`}>
      {v.label}
    </span>
  )
}

function TypeBadge({ type }: { type: EventType }) {
  const c = EVENT_TYPE_COLORS[type]
  return (
    <span className={`inline-flex items-center border-0 text-xs font-medium px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
      {EVENT_TYPE_LABELS[type]}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function MarketingCalendarPage() {
  const { stores, storesLoading } = useBrandFilter()
  const [events, setEvents] = useState<MarketingEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"timeline" | "list">("timeline")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<EventForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [sortField, setSortField] = useState<"start_date" | "end_date" | "name">("start_date")
  const [sortAsc, setSortAsc] = useState(true)

  /* ---- Fetch ---- */
  const fetchEvents = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("marketing_events")
      .select("*")
      .order("start_date", { ascending: true })

    if (error) {
      console.error("fetchEvents:", error)
      setEvents([])
    } else {
      setEvents(data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  /* ---- Stats ---- */
  const today = todayStr()

  const stats = useMemo(() => {
    const total = events.length
    const active = events.filter((e) => e.status === "active").length
    const upcoming = events.filter((e) => {
      const daysUntil = daysBetween(today, e.start_date)
      return daysUntil > 0 && daysUntil <= 30 && e.status !== "completed"
    }).length
    const completed = events.filter((e) => e.status === "completed").length
    return { total, active, upcoming, completed }
  }, [events, today])

  /* ---- "What's Coming Up" ---- */
  const upcomingEvents = useMemo(() => {
    return events
      .filter((e) => e.start_date >= today && e.status !== "completed")
      .sort((a, b) => a.start_date.localeCompare(b.start_date))
      .slice(0, 3)
  }, [events, today])

  function getMarketingWindowStatus(e: MarketingEvent): { label: string; variant: "open" | "not_started" | "closing" } {
    if (!e.marketing_window_start || !e.marketing_window_end) {
      return { label: "Not started", variant: "not_started" }
    }
    if (today < e.marketing_window_start) return { label: "Not started", variant: "not_started" }
    if (today > e.marketing_window_end) return { label: "Not started", variant: "not_started" }
    const daysLeft = daysBetween(today, e.marketing_window_end)
    if (daysLeft <= 7) return { label: "Closing soon", variant: "closing" }
    return { label: "Open", variant: "open" }
  }

  /* ---- Sorted list ---- */
  const sortedEvents = useMemo(() => {
    const sorted = [...events].sort((a, b) => {
      let cmp = 0
      if (sortField === "name") cmp = a.name.localeCompare(b.name)
      else if (sortField === "start_date") cmp = a.start_date.localeCompare(b.start_date)
      else cmp = a.end_date.localeCompare(b.end_date)
      return sortAsc ? cmp : -cmp
    })
    return sorted
  }, [events, sortField, sortAsc])

  /* ---- Timeline groups ---- */
  const eventsByQuarter = useMemo(() => {
    const grouped: Record<number, MarketingEvent[]> = { 0: [], 1: [], 2: [], 3: [] }
    events.forEach((e) => {
      const month = parseDate(e.start_date).getMonth()
      const qi = Math.floor(month / 3)
      grouped[qi].push(e)
    })
    return grouped
  }, [events])

  /* ---- Dialog ---- */
  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(e: MarketingEvent) {
    setEditingId(e.id)
    setForm({
      name: e.name,
      start_date: e.start_date,
      end_date: e.end_date,
      event_type: e.event_type,
      marketing_window_start: e.marketing_window_start ?? "",
      marketing_window_end: e.marketing_window_end ?? "",
      description: e.description ?? "",
      status: e.status,
      budget_dollars: e.budget_cents ? String(e.budget_cents / 100) : "",
      store_ids: e.store_ids ?? [],
      notes: e.notes ?? "",
    })
    setDialogOpen(true)
  }

  function handleStartDateChange(val: string) {
    const updated: Partial<EventForm> = { start_date: val }
    if (!form.marketing_window_start) updated.marketing_window_start = suggestMarketingStart(val)
    if (!form.marketing_window_end) updated.marketing_window_end = suggestMarketingEnd(val)
    if (!form.end_date && val) updated.end_date = val
    setForm((f) => ({ ...f, ...updated }))
  }

  async function handleSave() {
    if (!form.name.trim() || !form.start_date || !form.end_date) return
    setSaving(true)

    const payload = {
      name: form.name.trim(),
      start_date: form.start_date,
      end_date: form.end_date,
      event_type: form.event_type,
      marketing_window_start: form.marketing_window_start || null,
      marketing_window_end: form.marketing_window_end || null,
      description: form.description.trim() || null,
      status: form.status,
      budget_cents: form.budget_dollars ? Math.round(parseFloat(form.budget_dollars) * 100) : null,
      store_ids: form.store_ids.length > 0 ? form.store_ids : null,
      notes: form.notes.trim() || null,
    }

    if (editingId) {
      await supabase.from("marketing_events").update(payload).eq("id", editingId)
    } else {
      await supabase.from("marketing_events").insert(payload)
    }

    setSaving(false)
    setDialogOpen(false)
    setEditingId(null)
    fetchEvents()
  }

  async function handleDelete() {
    if (!deleteId) return
    await supabase.from("marketing_events").delete().eq("id", deleteId)
    setDeleteId(null)
    fetchEvents()
  }

  function handleSort(field: "start_date" | "end_date" | "name") {
    if (sortField === field) setSortAsc(!sortAsc)
    else { setSortField(field); setSortAsc(true) }
  }

  function toggleStoreId(storeId: string) {
    setForm((f) => ({
      ...f,
      store_ids: f.store_ids.includes(storeId)
        ? f.store_ids.filter((s) => s !== storeId)
        : [...f.store_ids, storeId],
    }))
  }

  /* ---- Loading ---- */
  if (loading || storesLoading) {
    return (
      <div className="space-y-6 max-w-[1440px] mx-auto w-full">
        <div className="h-[60px] rounded-md bg-muted animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[100px] rounded-md bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-[400px] rounded-md bg-muted animate-pulse" />
      </div>
    )
  }

  /* ---- Today marker position in quarter ---- */
  const todayMonth = new Date().getMonth()
  const todayQuarter = Math.floor(todayMonth / 3)

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Marketing Calendar</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Plan campaigns around major retail events
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" data-icon="inline-start" />
          Add Event
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-md border bg-card p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total Events</p>
            <p className="text-2xl font-bold font-heading mt-2">{stats.total}</p>
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-blue-50">
            <Calendar className="h-4 w-4 text-blue-600" />
          </div>
        </div>
        <div className="rounded-md border bg-card p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Active Campaigns</p>
            <p className="text-2xl font-bold font-heading mt-2">{stats.active}</p>
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-emerald-50">
            <Megaphone className="h-4 w-4 text-emerald-600" />
          </div>
        </div>
        <div className="rounded-md border bg-card p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Upcoming (30d)</p>
            <p className="text-2xl font-bold font-heading mt-2">{stats.upcoming}</p>
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-amber-50">
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
        </div>
        <div className="rounded-md border bg-card p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold font-heading mt-2">{stats.completed}</p>
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-slate-100">
            <CheckCircle2 className="h-4 w-4 text-slate-600" />
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1 w-fit">
        <button
          onClick={() => setView("timeline")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            view === "timeline"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          Timeline
        </button>
        <button
          onClick={() => setView("list")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            view === "list"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <List className="h-3.5 w-3.5" />
          List
        </button>
      </div>

      {/* ================================================================ */}
      {/*  Timeline View                                                    */}
      {/* ================================================================ */}
      {view === "timeline" && (
        <div className="space-y-4">
          {QUARTERS.map((q, qi) => {
            const qEvents = eventsByQuarter[qi]
            return (
              <div key={q.label} className="rounded-md border bg-card overflow-hidden">
                <div className="border-b px-5 py-3.5 flex items-center justify-between">
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {q.label} 2026
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {qEvents.length} event{qEvents.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Month header */}
                <div className="px-5 pt-3 pb-1">
                  <div className="flex ml-[200px]">
                    {q.monthLabels.map((m) => (
                      <div key={m} className="flex-1 text-xs text-muted-foreground font-medium">
                        {m}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Events */}
                <div className="px-5 pb-4 space-y-2 relative">
                  {/* Today marker */}
                  {qi === todayQuarter && (
                    <div
                      className="absolute top-0 bottom-0 w-px bg-red-400 z-10"
                      style={{ left: `calc(200px + ${positionInQuarter(today, qi)}% * (100% - 200px) / 100)` }}
                    >
                      <div className="absolute -top-0.5 -left-1.5 w-3 h-1.5 bg-red-400 rounded-full" />
                    </div>
                  )}

                  {qEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No events in {q.label}
                    </p>
                  ) : (
                    qEvents.map((e) => {
                      const colors = EVENT_TYPE_COLORS[e.event_type]
                      const startPct = positionInQuarter(e.start_date, qi)
                      const endPct = positionInQuarter(e.end_date, qi)
                      const barWidth = Math.max(endPct - startPct, 2)

                      // Marketing window bar
                      const hasWindow = e.marketing_window_start && e.marketing_window_end
                      let windowStartPct = 0
                      let windowWidth = 0
                      if (hasWindow) {
                        windowStartPct = positionInQuarter(e.marketing_window_start!, qi)
                        const windowEndPct = positionInQuarter(e.marketing_window_end!, qi)
                        windowWidth = Math.max(windowEndPct - windowStartPct, 1)
                      }

                      return (
                        <div
                          key={e.id}
                          className="flex items-center gap-0 group cursor-pointer hover:bg-muted/30 rounded-md py-1.5 px-1 -mx-1 transition-colors"
                          onClick={() => openEdit(e)}
                        >
                          {/* Event name */}
                          <div className="w-[192px] shrink-0 pr-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full shrink-0 ${colors.bar}`} />
                              <span className="text-sm font-medium truncate">{e.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 ml-4 mt-0.5">
                              <TypeBadge type={e.event_type} />
                              <StatusBadge status={e.status} />
                            </div>
                          </div>

                          {/* Bar area */}
                          <div className="flex-1 relative h-8">
                            {/* Marketing window bar (dashed/lighter) */}
                            {hasWindow && windowWidth > 0 && (
                              <div
                                className={`absolute top-1/2 -translate-y-1/2 h-4 rounded-sm ${colors.light} opacity-60`}
                                style={{
                                  left: `${windowStartPct}%`,
                                  width: `${windowWidth}%`,
                                  backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(255,255,255,0.5) 4px, rgba(255,255,255,0.5) 8px)",
                                }}
                                title={`Marketing window: ${formatDate(e.marketing_window_start!)} - ${formatDate(e.marketing_window_end!)}`}
                              />
                            )}
                            {/* Event bar */}
                            <div
                              className={`absolute top-1/2 -translate-y-1/2 h-5 rounded-sm ${colors.bar} shadow-sm`}
                              style={{ left: `${startPct}%`, width: `${barWidth}%` }}
                              title={`${e.name}: ${formatDate(e.start_date)} - ${formatDate(e.end_date)}`}
                            >
                              {barWidth > 8 && (
                                <span className="absolute inset-0 flex items-center px-1.5 text-[10px] font-medium text-white truncate">
                                  {e.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ================================================================ */}
      {/*  List View                                                        */}
      {/* ================================================================ */}
      {view === "list" && (
        <div className="rounded-md border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th
                    className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort("name")}
                  >
                    Event Name {sortField === "name" ? (sortAsc ? "\u2191" : "\u2193") : ""}
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                  <th
                    className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort("start_date")}
                  >
                    Start Date {sortField === "start_date" ? (sortAsc ? "\u2191" : "\u2193") : ""}
                  </th>
                  <th
                    className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort("end_date")}
                  >
                    End Date {sortField === "end_date" ? (sortAsc ? "\u2191" : "\u2193") : ""}
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Marketing Window</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Budget</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedEvents.map((e) => (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium">{e.name}</td>
                    <td className="px-4 py-3">
                      <TypeBadge type={e.event_type} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(e.start_date)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(e.end_date)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {e.marketing_window_start && e.marketing_window_end
                        ? `${formatDate(e.marketing_window_start)} - ${formatDate(e.marketing_window_end)}`
                        : "\u2014"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={e.status} />
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {e.budget_cents ? formatCurrency(e.budget_cents) : "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(e)}
                          className="rounded-md p-1.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteId(e.id)}
                          className="rounded-md p-1.5 hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {sortedEvents.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      No events found. Click &quot;Add Event&quot; to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/*  What's Coming Up                                                 */}
      {/* ================================================================ */}
      {upcomingEvents.length > 0 && (
        <div className="rounded-md border bg-card overflow-hidden">
          <div className="border-b px-5 py-3.5">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              What&apos;s Coming Up
            </h2>
          </div>
          <div className="divide-y">
            {upcomingEvents.map((e) => {
              const daysUntil = daysBetween(today, e.start_date)
              const windowStatus = getMarketingWindowStatus(e)
              const colors = EVENT_TYPE_COLORS[e.event_type]

              return (
                <div key={e.id} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${colors.bg}`}>
                      <Calendar className={`h-4 w-4 ${colors.text}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{e.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {daysUntil === 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : `${daysUntil} days away`}
                        </span>
                        <span className="text-xs flex items-center gap-1">
                          {windowStatus.variant === "open" ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              <span className="text-emerald-600 font-medium">{windowStatus.label}</span>
                            </>
                          ) : windowStatus.variant === "closing" ? (
                            <>
                              <Clock className="h-3 w-3 text-amber-600" />
                              <span className="text-amber-600 font-medium">{windowStatus.label}</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">{windowStatus.label}</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(e)}
                    >
                      Plan Campaign
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(e)}
                    >
                      View Details
                      <ArrowRight className="h-3.5 w-3.5" data-icon="inline-end" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/*  Create / Edit Dialog                                             */}
      {/* ================================================================ */}
      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card p-6 shadow-lg max-h-[90vh] overflow-y-auto data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-semibold text-foreground">
                {editingId ? "Edit Event" : "Add Event"}
              </Dialog.Title>
              <Dialog.Close className="rounded-md p-1 hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>

            <div className="space-y-3">
              {/* Name */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Name <span className="text-destructive">*</span>
                </label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Event name"
                  className="mt-1"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Start Date <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    End Date <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Type + Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Event Type</label>
                  <select
                    value={form.event_type}
                    onChange={(e) => setForm({ ...form, event_type: e.target.value as EventType })}
                    className="mt-1 h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {EVENT_TYPES.map((t) => (
                      <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as EventStatus })}
                    className="mt-1 h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {EVENT_STATUSES.map((s) => (
                      <option key={s} value={s}>{STATUS_VARIANTS[s].label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Marketing Window */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Marketing Window Start
                  </label>
                  <Input
                    type="date"
                    value={form.marketing_window_start}
                    onChange={(e) => setForm({ ...form, marketing_window_start: e.target.value })}
                    className="mt-1"
                  />
                  {form.start_date && !form.marketing_window_start && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, marketing_window_start: suggestMarketingStart(form.start_date) })}
                      className="text-xs text-primary hover:underline mt-0.5"
                    >
                      Suggest: 4 weeks before event
                    </button>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Marketing Window End
                  </label>
                  <Input
                    type="date"
                    value={form.marketing_window_end}
                    onChange={(e) => setForm({ ...form, marketing_window_end: e.target.value })}
                    className="mt-1"
                  />
                  {form.start_date && !form.marketing_window_end && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, marketing_window_end: suggestMarketingEnd(form.start_date) })}
                      className="text-xs text-primary hover:underline mt-0.5"
                    >
                      Suggest: day before event
                    </button>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description of the event..."
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>

              {/* Budget */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Budget ($)</label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={form.budget_dollars}
                  onChange={(e) => setForm({ ...form, budget_dollars: e.target.value })}
                  placeholder="0"
                  className="mt-1"
                />
              </div>

              {/* Store Assignment */}
              {stores.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Store Assignment</label>
                  <div className="mt-1.5 space-y-1.5">
                    {stores.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.store_ids.includes(s.id)}
                          onChange={() => toggleStoreId(s.id)}
                          className="h-4 w-4 rounded border-input accent-primary"
                        />
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: s.color }}
                        />
                        <span>{s.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Internal notes..."
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5 pt-4 border-t">
              <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingId(null) }}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.start_date || !form.end_date}
              >
                {saving ? "Saving..." : editingId ? "Update" : "Create"}
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ================================================================ */}
      {/*  Delete Confirmation Dialog                                       */}
      {/* ================================================================ */}
      <Dialog.Root open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card p-6 shadow-lg data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <Dialog.Title className="text-lg font-semibold text-foreground">
              Delete Event
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete this event? This action cannot be undone.
            </Dialog.Description>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="outline" onClick={() => setDeleteId(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
