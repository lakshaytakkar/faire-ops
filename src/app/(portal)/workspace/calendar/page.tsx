"use client"

import { useEffect, useState, useCallback, useMemo, Suspense } from "react"
import { useActiveSpace } from "@/lib/use-active-space"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Clock,
  MapPin,
  Trash2,
  CalendarDays,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type EventType = "meeting" | "task" | "reminder" | "deadline" | "personal"
type Recurring = null | "daily" | "weekly" | "monthly"
type ViewMode = "month" | "week"

interface CalendarEvent {
  id: string
  title: string
  description: string | null
  start_time: string
  end_time: string
  all_day: boolean
  assignee: string | null
  event_type: EventType
  color: string
  recurring: Recurring
  location: string | null
  store_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TEAM_MEMBERS = [
  { name: "Lakshay", initials: "LK", color: "#3B82F6" },
  { name: "Shantanu", initials: "SH", color: "#F59E0B" },
  { name: "Yash Jain", initials: "YJ", color: "#10B981" },
  { name: "Krish Verma", initials: "KV", color: "#8B5CF6" },
] as const

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: "meeting", label: "Meeting" },
  { value: "task", label: "Task" },
  { value: "reminder", label: "Reminder" },
  { value: "deadline", label: "Deadline" },
  { value: "personal", label: "Personal" },
]

const COLOR_PRESETS = [
  { name: "Blue", hex: "#3B82F6" },
  { name: "Red", hex: "#EF4444" },
  { name: "Green", hex: "#10B981" },
  { name: "Amber", hex: "#F59E0B" },
  { name: "Purple", hex: "#8B5CF6" },
  { name: "Pink", hex: "#EC4899" },
]

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

const HOUR_START = 6
const HOUR_END = 23

/* ------------------------------------------------------------------ */
/*  Seed events                                                        */
/* ------------------------------------------------------------------ */

function buildSeedEvents(year: number, month: number): Omit<CalendarEvent, "id" | "created_at" | "updated_at">[] {
  const seeds: Omit<CalendarEvent, "id" | "created_at" | "updated_at">[] = []

  // Find first Monday of the month
  const firstDay = new Date(year, month, 1)
  const dayOfWeek = firstDay.getDay() // 0=Sun
  const firstMonday = new Date(year, month, 1 + ((8 - dayOfWeek) % 7))
  if (firstMonday.getMonth() !== month) firstMonday.setDate(firstMonday.getDate() - 7)

  // Team Standup — daily recurring, 10am, 15min
  for (let d = 1; d <= new Date(year, month + 1, 0).getDate(); d++) {
    const date = new Date(year, month, d)
    const dow = date.getDay()
    if (dow === 0 || dow === 6) continue
    seeds.push({
      title: "Team Standup",
      description: "Daily team sync-up",
      start_time: new Date(year, month, d, 10, 0).toISOString(),
      end_time: new Date(year, month, d, 10, 15).toISOString(),
      all_day: false,
      assignee: "Lakshay",
      event_type: "meeting",
      color: "#3B82F6",
      recurring: "daily",
      location: "Zoom",
      store_id: null,
      created_by: "system",
    })
  }

  // Order Review — weekly Monday 2pm, 30min
  for (let d = firstMonday.getDate(); d <= new Date(year, month + 1, 0).getDate(); d += 7) {
    seeds.push({
      title: "Order Review",
      description: "Weekly order review session",
      start_time: new Date(year, month, d, 14, 0).toISOString(),
      end_time: new Date(year, month, d, 14, 30).toISOString(),
      all_day: false,
      assignee: "Aditya",
      event_type: "meeting",
      color: "#10B981",
      recurring: "weekly",
      location: "Conference Room A",
      store_id: null,
      created_by: "system",
    })
  }

  // Product Listing Review — weekly Wednesday 11am, 1hr
  const firstWed = new Date(firstMonday)
  firstWed.setDate(firstMonday.getDate() + 2)
  if (firstWed.getMonth() !== month) firstWed.setDate(firstWed.getDate() + 7)
  for (let d = firstWed.getDate(); d <= new Date(year, month + 1, 0).getDate(); d += 7) {
    seeds.push({
      title: "Product Listing Review",
      description: "Review new product listings and optimizations",
      start_time: new Date(year, month, d, 11, 0).toISOString(),
      end_time: new Date(year, month, d, 12, 0).toISOString(),
      all_day: false,
      assignee: "Khushal",
      event_type: "task",
      color: "#F59E0B",
      recurring: "weekly",
      location: null,
      store_id: null,
      created_by: "system",
    })
  }

  // Retailer Outreach Planning — weekly Thursday 3pm, 45min
  const firstThu = new Date(firstMonday)
  firstThu.setDate(firstMonday.getDate() + 3)
  if (firstThu.getMonth() !== month) firstThu.setDate(firstThu.getDate() + 7)
  for (let d = firstThu.getDate(); d <= new Date(year, month + 1, 0).getDate(); d += 7) {
    seeds.push({
      title: "Retailer Outreach Planning",
      description: "Plan outreach to new and existing retailers",
      start_time: new Date(year, month, d, 15, 0).toISOString(),
      end_time: new Date(year, month, d, 15, 45).toISOString(),
      all_day: false,
      assignee: "Bharti",
      event_type: "meeting",
      color: "#8B5CF6",
      recurring: "weekly",
      location: "Conference Room B",
      store_id: null,
      created_by: "system",
    })
  }

  // Weekly Report — weekly Friday 4pm, 30min
  const firstFri = new Date(firstMonday)
  firstFri.setDate(firstMonday.getDate() + 4)
  if (firstFri.getMonth() !== month) firstFri.setDate(firstFri.getDate() + 7)
  for (let d = firstFri.getDate(); d <= new Date(year, month + 1, 0).getDate(); d += 7) {
    seeds.push({
      title: "Weekly Report",
      description: "Compile and submit the weekly performance report",
      start_time: new Date(year, month, d, 16, 0).toISOString(),
      end_time: new Date(year, month, d, 16, 30).toISOString(),
      all_day: false,
      assignee: "Harsh",
      event_type: "deadline",
      color: "#EF4444",
      recurring: "weekly",
      location: null,
      store_id: null,
      created_by: "system",
    })
  }

  return seeds
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // Monday-based week: 0=Mon … 6=Sun
  let startOffset = firstDay.getDay() - 1
  if (startOffset < 0) startOffset = 6

  const days: { date: Date; isCurrentMonth: boolean }[] = []

  // Previous month padding
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    days.push({ date: d, isCurrentMonth: false })
  }

  // Current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ date: new Date(year, month, d), isCurrentMonth: true })
  }

  // Next month padding — fill to complete rows of 7
  while (days.length % 7 !== 0) {
    const nextD = days.length - startOffset - lastDay.getDate() + 1
    days.push({ date: new Date(year, month + 1, nextD), isCurrentMonth: false })
  }

  return days
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
}

function toDateStr(d: Date) {
  const yr = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, "0")
  const dy = String(d.getDate()).padStart(2, "0")
  return `${yr}-${mo}-${dy}`
}

function getWeekDays(baseDate: Date) {
  const d = new Date(baseDate)
  const dayOfWeek = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7))
  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const dd = new Date(monday)
    dd.setDate(monday.getDate() + i)
    days.push(dd)
  }
  return days
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function CalendarPage() {
  return (
    <Suspense fallback={<div className="max-w-[1440px] mx-auto w-full"><div className="h-8 w-40 rounded bg-muted animate-pulse" /></div>}>
      <CalendarPageInner />
    </Suspense>
  )
}

function CalendarPageInner() {
  const activeSpace = useActiveSpace().slug
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>("month")
  const [weekBase, setWeekBase] = useState(today)

  // Filter
  const [filterAssignee, setFilterAssignee] = useState<string | null>(null)

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)

  // Form state
  const [formTitle, setFormTitle] = useState("")
  const [formDate, setFormDate] = useState(toDateStr(today))
  const [formStartTime, setFormStartTime] = useState("09:00")
  const [formEndTime, setFormEndTime] = useState("09:30")
  const [formAllDay, setFormAllDay] = useState(false)
  const [formAssignee, setFormAssignee] = useState("")
  const [formEventType, setFormEventType] = useState<EventType>("meeting")
  const [formColor, setFormColor] = useState("#3B82F6")
  const [formDescription, setFormDescription] = useState("")
  const [formLocation, setFormLocation] = useState("")

  /* ---- Data fetching ---- */

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    let rangeStart: Date
    let rangeEnd: Date

    if (viewMode === "month") {
      rangeStart = new Date(currentYear, currentMonth, 1)
      rangeEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59)
    } else {
      const weekDays = getWeekDays(weekBase)
      rangeStart = weekDays[0]
      rangeEnd = new Date(weekDays[6])
      rangeEnd.setHours(23, 59, 59)
    }

    const { data, error } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("space_slug", activeSpace)
      .gte("start_time", rangeStart.toISOString())
      .lte("start_time", rangeEnd.toISOString())
      .order("start_time", { ascending: true })

    if (error) {
      console.error("Fetch events error:", error)
      setEvents([])
    } else {
      setEvents(data ?? [])
    }
    setLoading(false)
    return data ?? []
  }, [currentYear, currentMonth, viewMode, weekBase, activeSpace])

  /* ---- Seed on first load ---- */

  const seedIfEmpty = useCallback(async (fetched: CalendarEvent[]) => {
    if (fetched.length > 0) return
    if (activeSpace !== "b2b-ecommerce") return
    const seeds = buildSeedEvents(currentYear, currentMonth).map((s) => ({ ...s, space_slug: activeSpace }))
    const { error } = await supabase.from("calendar_events").insert(seeds)
    if (error) {
      console.error("Seed error:", error)
      return
    }
    await fetchEvents()
  }, [currentYear, currentMonth, fetchEvents, activeSpace])

  useEffect(() => {
    let cancelled = false
    fetchEvents().then((fetched) => {
      if (!cancelled) seedIfEmpty(fetched)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentYear, currentMonth, viewMode, weekBase])

  /* ---- Navigation ---- */

  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear((y) => y - 1)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear((y) => y + 1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
  }

  function goToday() {
    const t = new Date()
    setCurrentYear(t.getFullYear())
    setCurrentMonth(t.getMonth())
    setWeekBase(t)
  }

  function prevWeek() {
    setWeekBase((d) => {
      const n = new Date(d)
      n.setDate(n.getDate() - 7)
      return n
    })
  }

  function nextWeek() {
    setWeekBase((d) => {
      const n = new Date(d)
      n.setDate(n.getDate() + 7)
      return n
    })
  }

  /* ---- Dialog helpers ---- */

  function resetForm() {
    setFormTitle("")
    setFormDate(toDateStr(today))
    setFormStartTime("09:00")
    setFormEndTime("09:30")
    setFormAllDay(false)
    setFormAssignee("")
    setFormEventType("meeting")
    setFormColor("#3B82F6")
    setFormDescription("")
    setFormLocation("")
  }

  function openCreateDialog(prefillDate?: Date) {
    setEditingEvent(null)
    resetForm()
    if (prefillDate) setFormDate(toDateStr(prefillDate))
    setDialogOpen(true)
  }

  function openEditDialog(event: CalendarEvent) {
    setEditingEvent(event)
    const start = new Date(event.start_time)
    const end = new Date(event.end_time)
    setFormTitle(event.title)
    setFormDate(toDateStr(start))
    setFormStartTime(`${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`)
    setFormEndTime(`${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`)
    setFormAllDay(event.all_day)
    setFormAssignee(event.assignee ?? "")
    setFormEventType(event.event_type)
    setFormColor(event.color)
    setFormDescription(event.description ?? "")
    setFormLocation(event.location ?? "")
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!formTitle.trim()) return

    const [yr, mo, dy] = formDate.split("-").map(Number)
    const [sh, sm] = formStartTime.split(":").map(Number)
    const [eh, em] = formEndTime.split(":").map(Number)

    const startTime = formAllDay
      ? new Date(yr, mo - 1, dy, 0, 0, 0)
      : new Date(yr, mo - 1, dy, sh, sm, 0)
    const endTime = formAllDay
      ? new Date(yr, mo - 1, dy, 23, 59, 59)
      : new Date(yr, mo - 1, dy, eh, em, 0)

    const payload = {
      title: formTitle.trim(),
      description: formDescription.trim() || null,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      all_day: formAllDay,
      assignee: formAssignee || null,
      event_type: formEventType,
      color: formColor,
      recurring: null as Recurring,
      location: formLocation.trim() || null,
      store_id: null,
      created_by: formAssignee || null,
      space_slug: activeSpace,
    }

    if (editingEvent) {
      const { error } = await supabase
        .from("calendar_events")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", editingEvent.id)
      if (error) console.error("Update error:", error)
    } else {
      const { error } = await supabase.from("calendar_events").insert(payload)
      if (error) console.error("Insert error:", error)
    }

    setDialogOpen(false)
    fetchEvents()
  }

  async function handleDelete() {
    if (!editingEvent) return
    const { error } = await supabase.from("calendar_events").delete().eq("id", editingEvent.id)
    if (error) console.error("Delete error:", error)
    setDialogOpen(false)
    fetchEvents()
  }

  /* ---- Filtered events ---- */

  const filteredEvents = useMemo(() => {
    if (!filterAssignee) return events
    return events.filter((e) => e.assignee === filterAssignee)
  }, [events, filterAssignee])

  function eventsForDay(date: Date) {
    return filteredEvents.filter((e) => isSameDay(new Date(e.start_time), date))
  }

  /* ---- Month grid ---- */

  const monthDays = useMemo(() => getMonthDays(currentYear, currentMonth), [currentYear, currentMonth])
  const monthName = new Date(currentYear, currentMonth).toLocaleString("en-US", { month: "long" })

  /* ---- Week grid ---- */

  const weekDays = useMemo(() => getWeekDays(weekBase), [weekBase])
  const weekLabel = useMemo(() => {
    const s = weekDays[0]
    const e = weekDays[6]
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
    return `${s.toLocaleDateString("en-US", opts)} - ${e.toLocaleDateString("en-US", opts)}, ${e.getFullYear()}`
  }, [weekDays])

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      {/* ---- Header ---- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CalendarDays className="size-5 text-primary" />
          <h1 className="text-lg font-semibold">Calendar</h1>
          <span className="text-sm text-muted-foreground">
            {viewMode === "month" ? `${monthName} ${currentYear}` : weekLabel}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-md border bg-muted/50">
            <button
              onClick={() => setViewMode("month")}
              className={`px-3 py-1 text-xs font-medium rounded-l-md transition-colors ${viewMode === "month" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Month
            </button>
            <button
              onClick={() => { setViewMode("week"); setWeekBase(new Date(currentYear, currentMonth, today.getDate())) }}
              className={`px-3 py-1 text-xs font-medium rounded-r-md transition-colors ${viewMode === "week" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Week
            </button>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" onClick={viewMode === "month" ? prevMonth : prevWeek}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToday}>
              Today
            </Button>
            <Button variant="outline" size="icon-sm" onClick={viewMode === "month" ? nextMonth : nextWeek}>
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <Button size="sm" onClick={() => openCreateDialog()}>
            <Plus className="size-3.5" />
            Add Event
          </Button>
        </div>
      </div>

      {/* ---- Assignee filter ---- */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilterAssignee(null)}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${!filterAssignee ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
        >
          All
        </button>
        {TEAM_MEMBERS.map((m) => (
          <button
            key={m.name}
            onClick={() => setFilterAssignee(filterAssignee === m.name ? null : m.name)}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${filterAssignee === m.name ? "border-transparent text-white" : "border-border text-muted-foreground hover:text-foreground"}`}
            style={filterAssignee === m.name ? { backgroundColor: m.color } : undefined}
          >
            <span
              className="inline-flex size-5 items-center justify-center rounded-full text-[10px] font-semibold text-white"
              style={{ backgroundColor: m.color }}
            >
              {m.initials}
            </span>
            {m.name}
          </button>
        ))}
      </div>

      {/* ---- Calendar body ---- */}
      <div className="flex-1 overflow-auto rounded-md border bg-card">
        {loading ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            Loading events...
          </div>
        ) : viewMode === "month" ? (
          /* ---------- MONTH VIEW ---------- */
          <div>
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b bg-muted/30">
              {DAY_HEADERS.map((d) => (
                <div key={d} className="border-r px-2 py-1.5 text-center text-xs font-medium text-muted-foreground last:border-r-0">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {monthDays.map(({ date, isCurrentMonth }, idx) => {
                const isToday = isSameDay(date, today)
                const dayEvents = eventsForDay(date)
                return (
                  <div
                    key={idx}
                    onClick={() => openCreateDialog(date)}
                    className={`min-h-[100px] border-r border-b p-1 cursor-pointer transition-colors hover:bg-muted/30 ${idx % 7 === 6 ? "border-r-0" : ""} ${isToday ? "bg-primary/5 ring-1 ring-inset ring-primary/30" : ""}`}
                  >
                    <span
                      className={`inline-block text-xs font-medium mb-0.5 ${isCurrentMonth ? "text-foreground" : "text-muted-foreground/40"} ${isToday ? "bg-primary text-primary-foreground rounded-full size-5 flex items-center justify-center text-[10px]" : ""}`}
                    >
                      {date.getDate()}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <button
                          key={ev.id}
                          onClick={(e) => { e.stopPropagation(); openEditDialog(ev) }}
                          className="text-xs px-1.5 py-0.5 rounded truncate cursor-pointer text-left font-medium text-white transition-opacity hover:opacity-80"
                          style={{ backgroundColor: ev.color }}
                          title={ev.title}
                        >
                          {ev.all_day ? ev.title : `${formatTime(ev.start_time)} ${ev.title}`}
                        </button>
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[10px] text-muted-foreground px-1">
                          +{dayEvents.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* ---------- WEEK VIEW ---------- */
          <div className="flex flex-col">
            {/* Day headers */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-muted/30 sticky top-0 z-10">
              <div className="border-r p-1" />
              {weekDays.map((d, i) => {
                const isToday = isSameDay(d, today)
                return (
                  <div
                    key={i}
                    className={`border-r last:border-r-0 px-2 py-1.5 text-center ${isToday ? "bg-primary/5" : ""}`}
                  >
                    <div className="text-xs font-medium text-muted-foreground">
                      {DAY_HEADERS[i]}
                    </div>
                    <div className={`text-sm font-semibold ${isToday ? "text-primary" : "text-foreground"}`}>
                      {d.getDate()}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Hour rows */}
            <div className="relative">
              {Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => i + HOUR_START).map((hour) => (
                <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b">
                  <div className="border-r px-1.5 py-1 text-[10px] text-muted-foreground text-right pr-2">
                    {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
                  </div>
                  {weekDays.map((d, di) => {
                    const cellEvents = filteredEvents.filter((ev) => {
                      const s = new Date(ev.start_time)
                      return isSameDay(s, d) && s.getHours() === hour
                    })
                    return (
                      <div
                        key={di}
                        className="relative border-r last:border-r-0 h-12 cursor-pointer hover:bg-muted/20"
                        onClick={() => {
                          const clickDate = new Date(d)
                          clickDate.setHours(hour, 0, 0, 0)
                          setFormStartTime(`${String(hour).padStart(2, "0")}:00`)
                          setFormEndTime(`${String(hour + 1).padStart(2, "0")}:00`)
                          openCreateDialog(clickDate)
                        }}
                      >
                        {cellEvents.map((ev) => {
                          const s = new Date(ev.start_time)
                          const e = new Date(ev.end_time)
                          const durationMin = (e.getTime() - s.getTime()) / 60000
                          const topOffset = (s.getMinutes() / 60) * 48
                          const height = Math.max((durationMin / 60) * 48, 18)
                          return (
                            <button
                              key={ev.id}
                              onClick={(evt) => { evt.stopPropagation(); openEditDialog(ev) }}
                              className="absolute left-0.5 right-0.5 rounded px-1 text-[10px] leading-tight text-white font-medium overflow-hidden z-10 hover:opacity-90 transition-opacity"
                              style={{
                                backgroundColor: ev.color,
                                top: `${topOffset}px`,
                                height: `${height}px`,
                              }}
                              title={`${ev.title} (${formatTime(ev.start_time)} - ${formatTime(ev.end_time)})`}
                            >
                              <div className="truncate">{ev.title}</div>
                              <div className="truncate opacity-80">{formatTime(ev.start_time)}</div>
                            </button>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ---- Event Dialog (Modal) ---- */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-xs"
            onClick={() => setDialogOpen(false)}
          />

          {/* Panel */}
          <div className="relative z-10 w-full max-w-md rounded-lg border bg-card p-5 shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">
                {editingEvent ? "Edit Event" : "New Event"}
              </h2>
              <button
                onClick={() => setDialogOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {/* Title */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Title *</label>
                <Input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Event title"
                />
              </div>

              {/* Date */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Date</label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>

              {/* All day */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formAllDay}
                  onChange={(e) => setFormAllDay(e.target.checked)}
                  className="size-4 rounded border-input accent-primary"
                />
                <span className="text-sm">All day</span>
              </label>

              {/* Time inputs */}
              {!formAllDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <Clock className="size-3" /> Start
                    </label>
                    <Input
                      type="time"
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <Clock className="size-3" /> End
                    </label>
                    <Input
                      type="time"
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Assignee + Event type row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Assignee</label>
                  <select
                    value={formAssignee}
                    onChange={(e) => setFormAssignee(e.target.value)}
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="">Unassigned</option>
                    {TEAM_MEMBERS.map((m) => (
                      <option key={m.name} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Type</label>
                  <select
                    value={formEventType}
                    onChange={(e) => setFormEventType(e.target.value as EventType)}
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {EVENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Color</label>
                <div className="flex gap-2">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c.hex}
                      onClick={() => setFormColor(c.hex)}
                      className={`size-7 rounded-full transition-all ${formColor === c.hex ? "ring-2 ring-offset-2 ring-offset-card" : "hover:scale-110"}`}
                      style={{ backgroundColor: c.hex, "--tw-ring-color": c.hex } as React.CSSProperties}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Add a description..."
                  rows={2}
                  className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none resize-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>

              {/* Location */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <MapPin className="size-3" /> Location
                </label>
                <Input
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="Optional"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                {editingEvent ? (
                  <Button variant="destructive" size="sm" onClick={handleDelete}>
                    <Trash2 className="size-3.5" />
                    Delete
                  </Button>
                ) : (
                  <div />
                )}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={!formTitle.trim()}>
                    {editingEvent ? "Update" : "Save"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
