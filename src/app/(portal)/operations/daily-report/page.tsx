"use client"

import { useState, useEffect, useCallback } from "react"
import {
  FileText,
  ShoppingCart,
  Layers,
  MessageSquare,
  BarChart3,
  Send,
  Clock,
  CheckCircle2,
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

function StatusBadge({
  label,
  variant,
}: {
  label: string
  variant: "success" | "warning" | "neutral"
}) {
  const styles: Record<string, string> = {
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    neutral: "bg-slate-100 text-slate-600",
  }
  return (
    <span className={`inline-flex items-center border-0 text-xs font-medium px-2 py-0.5 rounded-full ${styles[variant]}`}>
      {label}
    </span>
  )
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
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

function TextareaInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
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

export default function DailyReportPage() {
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

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir(prev => prev === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("desc") }
  }

  function SortIcon({ col }: { col: string }) {
    if (sortKey !== col) return <ArrowUpDown className="size-3 opacity-30 ml-1" />
    return sortDir === "asc" ? <ArrowUp className="size-3 text-primary ml-1" /> : <ArrowDown className="size-3 text-primary ml-1" />
  }

  // Orders section
  const [ordersReceived, setOrdersReceived] = useState(0)
  const [ordersAccepted, setOrdersAccepted] = useState(0)
  const [ordersShipped, setOrdersShipped] = useState(0)
  const [lateOrdersActioned, setLateOrdersActioned] = useState(0)
  const [ordersNotes, setOrdersNotes] = useState("")

  // Catalog section
  const [newListings, setNewListings] = useState(0)
  const [movedToReady, setMovedToReady] = useState(0)
  const [publishedToFaire, setPublishedToFaire] = useState(0)
  const [imagesProcessed, setImagesProcessed] = useState(0)
  const [catalogNotes, setCatalogNotes] = useState("")

  // Outreach section
  const [whatsappSent, setWhatsappSent] = useState(0)
  const [emailCampaigns, setEmailCampaigns] = useState(0)
  const [followUpsCreated, setFollowUpsCreated] = useState(0)
  const [faireDirectInvites, setFaireDirectInvites] = useState(0)
  const [outreachNotes, setOutreachNotes] = useState("")

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

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Daily Report</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{todayLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          {submitted ? (
            <StatusBadge label={`Submitted at ${submittedTime}`} variant="success" />
          ) : (
            <StatusBadge label="Not submitted" variant="warning" />
          )}
          <button
            onClick={handleSubmit}
            disabled={submitted}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-4 w-4" />
            Submit Report
          </button>
        </div>
      </div>

      {/* Form Section Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Orders */}
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

        {/* Card 2: Catalog */}
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

        {/* Card 3: Outreach */}
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

        {/* Card 4: Summary (auto-computed) */}
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
    </div>
  )
}
