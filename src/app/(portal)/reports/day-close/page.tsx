"use client"

import { useState, useEffect, useCallback } from "react"
import {
  CheckCircle2,
  Circle,
  ShoppingCart,
  Layers,
  MessageSquare,
  FileText,
  Lock,
  Clock,
  Send,
  BarChart3,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

interface DailyReportRow {
  id: string
  report_date: string
  orders_data: { received: number; accepted: number; shipped: number; late: number }
  catalog_data: { added: number; ready: number; published: number; images: number }
  outreach_data: { whatsapp: number; email: number; followups: number; faire_direct: number }
  submitted_by: string
  submitted_at: string
}

interface HistoryRow {
  date: string
  submittedBy: string
  orders: number
  listings: number
  messages: number
  time: string
}

const today = new Date()
const todayLabel = today.toLocaleDateString("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
})

/* ------------------------------------------------------------------ */
/*  Tabs                                                               */
/* ------------------------------------------------------------------ */
type Tab = "checklist" | "metrics"

/* ------------------------------------------------------------------ */
/*  Day Close Checklist                                                */
/* ------------------------------------------------------------------ */

interface ChecklistSection {
  title: string
  icon: React.ElementType
  items: string[]
}

const SECTIONS: ChecklistSection[] = [
  {
    title: "Orders",
    icon: ShoppingCart,
    items: [
      "All pending orders accepted",
      "All tracking numbers added",
      "Returns reviewed",
      "Late ship % checked",
    ],
  },
  {
    title: "Catalog",
    icon: Layers,
    items: [
      "Listings added today",
      "Publishing queue reviewed",
      "Image studio cleared",
    ],
  },
  {
    title: "Outreach",
    icon: MessageSquare,
    items: [
      "WhatsApp log submitted",
      "Follow-ups sent",
      "Email results logged",
    ],
  },
  {
    title: "Reporting",
    icon: FileText,
    items: [
      "Daily report submitted",
      "Issues flagged",
    ],
  },
]

const TOTAL_ITEMS = SECTIONS.reduce((s, sec) => s + sec.items.length, 0)

function getDayStatuses(): number[] {
  const currentDay = today.getDate()
  const statuses: number[] = []
  for (let d = 1; d <= 30; d++) {
    if (d > currentDay) {
      statuses.push(-1)
    } else if (d === currentDay) {
      statuses.push(-1)
    } else {
      const dayOfWeek = new Date(2026, 3, d).getDay()
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        statuses.push(-1)
      } else if (d === 7 || d === 15) {
        statuses.push(0)
      } else {
        statuses.push(1)
      }
    }
  }
  return statuses
}

/* ------------------------------------------------------------------ */
/*  Daily Report History                                               */
/* ------------------------------------------------------------------ */

/* HISTORY is now fetched dynamically from Supabase — see fetchHistory below */

/* ------------------------------------------------------------------ */
/*  Shared components                                                  */
/* ------------------------------------------------------------------ */

function StatusBadge({ label, variant }: { label: string; variant: "success" | "warning" }) {
  const styles: Record<string, string> = {
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
  }
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${styles[variant]}`}>
      {label}
    </span>
  )
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="text-sm text-muted-foreground">{label}</label>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
      />
    </div>
  )
}

function TextareaInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="col-span-full">
      <label className="text-sm text-muted-foreground">{label}</label>
      <textarea
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
        placeholder="Optional notes..."
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function DayClosePage() {
  const [activeTab, setActiveTab] = useState<Tab>("checklist")

  // Day close state
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [closed, setClosed] = useState(false)
  const [closedTime, setClosedTime] = useState("")

  // Daily report state
  const [submitted, setSubmitted] = useState(false)
  const [submittedTime, setSubmittedTime] = useState("")
  const [sortKey, setSortKey] = useState("date")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true)
    const { data, error } = await supabase
      .from("daily_reports")
      .select("*")
      .order("report_date", { ascending: false })
      .limit(14)
    if (error) {
      console.error("fetchHistory error:", error)
      setHistory([])
    } else {
      setHistory(
        (data as DailyReportRow[]).map((row) => ({
          date: new Date(row.report_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          submittedBy: row.submitted_by,
          orders: row.orders_data.received,
          listings: row.catalog_data.added,
          messages: (row.outreach_data.whatsapp ?? 0) + (row.outreach_data.email ?? 0),
          time: new Date(row.submitted_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase(),
        }))
      )
    }
    setHistoryLoading(false)
  }, [])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  // Metrics
  const [ordersReceived, setOrdersReceived] = useState(0)
  const [ordersAccepted, setOrdersAccepted] = useState(0)
  const [ordersShipped, setOrdersShipped] = useState(0)
  const [lateOrdersActioned, setLateOrdersActioned] = useState(0)
  const [ordersNotes, setOrdersNotes] = useState("")
  const [newListings, setNewListings] = useState(0)
  const [movedToReady, setMovedToReady] = useState(0)
  const [publishedToFaire, setPublishedToFaire] = useState(0)
  const [imagesProcessed, setImagesProcessed] = useState(0)
  const [catalogNotes, setCatalogNotes] = useState("")
  const [whatsappSent, setWhatsappSent] = useState(0)
  const [emailCampaigns, setEmailCampaigns] = useState(0)
  const [followUpsCreated, setFollowUpsCreated] = useState(0)
  const [faireDirectInvites, setFaireDirectInvites] = useState(0)
  const [outreachNotes, setOutreachNotes] = useState("")

  const checkedCount = checked.size
  const canClose = checkedCount >= Math.ceil(TOTAL_ITEMS * 0.8)

  function toggleItem(key: string) {
    if (closed) return
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function handleClose() {
    const now = new Date()
    const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase()
    setClosedTime(timeStr)
    setClosed(true)
  }

  async function handleSubmit() {
    const now = new Date()
    const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase()

    const { error } = await supabase.from("daily_reports").insert({
      report_date: now.toISOString().slice(0, 10),
      orders_data: { received: ordersReceived, accepted: ordersAccepted, shipped: ordersShipped, late: lateOrdersActioned },
      catalog_data: { added: newListings, ready: movedToReady, published: publishedToFaire, images: imagesProcessed },
      outreach_data: { whatsapp: whatsappSent, email: emailCampaigns, followups: followUpsCreated, faire_direct: faireDirectInvites },
      submitted_by: "Current User",
      submitted_at: now.toISOString(),
    })

    if (error) {
      console.error("Submit error:", error)
      return
    }

    setSubmittedTime(timeStr)
    setSubmitted(true)
    fetchHistory()
  }

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir(prev => prev === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("desc") }
  }

  function SortIcon({ col }: { col: string }) {
    if (sortKey !== col) return <ArrowUpDown className="size-3 opacity-30 ml-1" />
    return sortDir === "asc" ? <ArrowUp className="size-3 text-primary ml-1" /> : <ArrowDown className="size-3 text-primary ml-1" />
  }

  const dayStatuses = getDayStatuses()

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Day Close</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{todayLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === "checklist" ? (
            closed ? <StatusBadge label={`Closed at ${closedTime}`} variant="success" /> : <StatusBadge label="Open" variant="warning" />
          ) : (
            submitted ? <StatusBadge label={`Submitted at ${submittedTime}`} variant="success" /> : <StatusBadge label="Not submitted" variant="warning" />
          )}
          {activeTab === "metrics" && (
            <button
              onClick={handleSubmit}
              disabled={submitted}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-4 w-4" />
              Submit Report
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b">
        {[
          { key: "checklist" as Tab, label: "Checklist", icon: CheckCircle2 },
          { key: "metrics" as Tab, label: "Daily Metrics", icon: BarChart3 },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="size-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ============ CHECKLIST TAB ============ */}
      {activeTab === "checklist" && (
        <>
          {/* Progress bar */}
          <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                Checklist progress: {checkedCount} of {TOTAL_ITEMS} items
              </span>
              <span className="text-sm font-medium">{Math.round((checkedCount / TOTAL_ITEMS) * 100)}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${checkedCount / TOTAL_ITEMS >= 0.8 ? "bg-emerald-500" : "bg-amber-500"}`}
                style={{ width: `${(checkedCount / TOTAL_ITEMS) * 100}%` }}
              />
            </div>
          </div>

          {/* Checklist Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {SECTIONS.map((section) => {
              const Icon = section.icon
              const sectionChecked = section.items.filter((item) => checked.has(`${section.title}-${item}`)).length
              return (
                <div key={section.title} className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between border-b px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <h2 className="text-sm font-semibold">{section.title}</h2>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {sectionChecked}/{section.items.length}
                    </span>
                  </div>
                  <div>
                    {section.items.map((item, idx) => {
                      const key = `${section.title}-${item}`
                      const isChecked = checked.has(key)
                      const isLast = idx === section.items.length - 1
                      return (
                        <button
                          key={key}
                          onClick={() => toggleItem(key)}
                          disabled={closed}
                          className={`flex items-center gap-3 px-5 py-3 w-full text-left hover:bg-muted/20 transition-colors disabled:cursor-not-allowed ${!isLast ? "border-b" : ""}`}
                        >
                          {isChecked ? (
                            <div className="h-5 w-5 rounded-md bg-primary flex items-center justify-center shrink-0">
                              <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />
                            </div>
                          ) : (
                            <div className="h-5 w-5 rounded-md border-2 border-muted-foreground/30 shrink-0" />
                          )}
                          <span className={`text-sm ${isChecked ? "line-through text-muted-foreground" : ""}`}>
                            {item}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Mark Day as Closed Button */}
          <button
            onClick={handleClose}
            disabled={!canClose || closed}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {closed ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Day Closed at {closedTime}
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Mark Day as Closed
              </>
            )}
          </button>
          {!canClose && !closed && (
            <p className="text-xs text-muted-foreground text-center -mt-3">
              Complete at least {Math.ceil(TOTAL_ITEMS * 0.8)} of {TOTAL_ITEMS} items to close the day
            </p>
          )}

          {/* Calendar History */}
          <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b px-5 py-3.5">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                April History
              </h2>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-emerald-500" /> Closed
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-red-500" /> Missed
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-muted" /> Future
                </span>
              </div>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-7 gap-2 mb-2">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <div key={d} className="text-xs text-center text-muted-foreground font-medium">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {[0, 1].map((i) => (
                  <div key={`empty-${i}`} className="h-9" />
                ))}
                {dayStatuses.map((status, idx) => {
                  const day = idx + 1
                  const isToday = day === today.getDate()
                  return (
                    <div
                      key={day}
                      className={`h-9 rounded-md flex items-center justify-center text-xs font-medium transition-colors ${
                        status === 1
                          ? "bg-emerald-500 text-white"
                          : status === 0
                            ? "bg-red-500 text-white"
                            : "bg-muted text-muted-foreground"
                      } ${isToday ? "ring-2 ring-primary ring-offset-1" : ""}`}
                    >
                      {day}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ============ DAILY METRICS TAB ============ */}
      {activeTab === "metrics" && (
        <>
          {/* Form Section Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Orders */}
            <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold">Orders</h2>
                </div>
                <span className="text-xs text-muted-foreground">Assigned: Aditya</span>
              </div>
              <div className="p-5 grid grid-cols-2 gap-4">
                <NumberInput label="Orders received" value={ordersReceived} onChange={setOrdersReceived} />
                <NumberInput label="Orders accepted" value={ordersAccepted} onChange={setOrdersAccepted} />
                <NumberInput label="Shipped" value={ordersShipped} onChange={setOrdersShipped} />
                <NumberInput label="Late orders actioned" value={lateOrdersActioned} onChange={setLateOrdersActioned} />
                <TextareaInput label="Notes" value={ordersNotes} onChange={setOrdersNotes} />
              </div>
            </div>

            {/* Catalog */}
            <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold">Catalog</h2>
                </div>
                <span className="text-xs text-muted-foreground">Assigned: Allen</span>
              </div>
              <div className="p-5 grid grid-cols-2 gap-4">
                <NumberInput label="New listings added" value={newListings} onChange={setNewListings} />
                <NumberInput label="Products moved to Ready" value={movedToReady} onChange={setMovedToReady} />
                <NumberInput label="Published to Faire" value={publishedToFaire} onChange={setPublishedToFaire} />
                <NumberInput label="Images processed" value={imagesProcessed} onChange={setImagesProcessed} />
                <TextareaInput label="Notes" value={catalogNotes} onChange={setCatalogNotes} />
              </div>
            </div>

            {/* Outreach */}
            <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold">Outreach</h2>
                </div>
                <span className="text-xs text-muted-foreground">Assigned: Bharti</span>
              </div>
              <div className="p-5 grid grid-cols-2 gap-4">
                <NumberInput label="WhatsApp messages sent" value={whatsappSent} onChange={setWhatsappSent} />
                <NumberInput label="Email campaigns sent" value={emailCampaigns} onChange={setEmailCampaigns} />
                <NumberInput label="Follow-ups created" value={followUpsCreated} onChange={setFollowUpsCreated} />
                <NumberInput label="Faire Direct invites" value={faireDirectInvites} onChange={setFaireDirectInvites} />
                <TextareaInput label="Notes" value={outreachNotes} onChange={setOutreachNotes} />
              </div>
            </div>

            {/* Summary */}
            <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold">Summary</h2>
                </div>
                <span className="text-xs text-muted-foreground">Auto-computed</span>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total orders received</span>
                    <span className="text-sm font-medium">{ordersReceived}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Orders accepted</span>
                    <span className="text-sm font-medium">{ordersAccepted}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Shipped</span>
                    <span className="text-sm font-medium">{ordersShipped}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Late orders actioned</span>
                    <span className="text-sm font-medium">{lateOrdersActioned}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total listings</span>
                    <span className="text-sm font-medium">{newListings + movedToReady + publishedToFaire}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Images processed</span>
                    <span className="text-sm font-medium">{imagesProcessed}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Messages sent</span>
                    <span className="text-sm font-medium">{whatsappSent + emailCampaigns}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Follow-ups &amp; invites</span>
                    <span className="text-sm font-medium">{followUpsCreated + faireDirectInvites}</span>
                  </div>
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={submitted}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitted ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Submitted at {submittedTime}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Submit Report
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* History Table */}
          <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="border-b px-5 py-3.5">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Report History
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left cursor-pointer select-none" onClick={() => toggleSort("date")}><span className="flex items-center">Date <SortIcon col="date" /></span></th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Submitted By</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left cursor-pointer select-none" onClick={() => toggleSort("orders")}><span className="flex items-center">Orders <SortIcon col="orders" /></span></th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Listings</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left cursor-pointer select-none" onClick={() => toggleSort("messages")}><span className="flex items-center">Messages <SortIcon col="messages" /></span></th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {historyLoading ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">Loading...</td></tr>
                  ) : history.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">No reports yet</td></tr>
                  ) : [...history].sort((a, b) => {
                    const dir = sortDir === "asc" ? 1 : -1
                    if (sortKey === "date") return (new Date(a.date).getTime() - new Date(b.date).getTime()) * dir
                    if (sortKey === "orders") return (a.orders - b.orders) * dir
                    if (sortKey === "messages") return (a.messages - b.messages) * dir
                    return 0
                  }).map((row) => (
                    <tr key={row.date} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3.5 text-sm font-medium">{row.date}</td>
                      <td className="px-4 py-3.5 text-sm">{row.submittedBy}</td>
                      <td className="px-4 py-3.5 text-sm">{row.orders}</td>
                      <td className="px-4 py-3.5 text-sm">{row.listings}</td>
                      <td className="px-4 py-3.5 text-sm">{row.messages}</td>
                      <td className="px-4 py-3.5 text-sm text-muted-foreground">{row.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
