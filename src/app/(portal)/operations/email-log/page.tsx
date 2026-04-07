"use client"

import { useState } from "react"
import {
  Mail,
  Plus,
  Send,
  ChevronUp,
  Calendar,
  BarChart3,
  Award,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import { useBrandFilter } from "@/lib/brand-filter-context"

function StatusBadge({
  label,
  variant,
}: {
  label: string
  variant: "success" | "error" | "warning" | "neutral" | "info"
}) {
  const styles: Record<string, string> = {
    success: "bg-emerald-50 text-emerald-700",
    error: "bg-red-50 text-red-700",
    warning: "bg-amber-50 text-amber-700",
    neutral: "bg-slate-100 text-slate-600",
    info: "bg-blue-50 text-blue-700",
  }
  return (
    <span className={`inline-flex items-center border-0 text-xs font-medium px-2 py-0.5 rounded-full ${styles[variant]}`}>
      {label}
    </span>
  )
}

interface EmailEntry {
  id: string
  date: string
  brandShort: string
  campaignName: string
  segment: string
  sentCount: number
  status: "sent" | "draft" | "scheduled"
  filledBy: string
}

const MOCK_ENTRIES: EmailEntry[] = [
  { id: "e1", date: "Apr 3, 2026", brandShort: "BA", campaignName: "Spring Launch Promo", segment: "New Retailers", sentCount: 245, status: "sent", filledBy: "Bharti" },
  { id: "e2", date: "Apr 3, 2026", brandShort: "TN", campaignName: "Toy Fair Follow-up", segment: "Trade Show Leads", sentCount: 182, status: "sent", filledBy: "Bharti" },
  { id: "e3", date: "Apr 2, 2026", brandShort: "SN", campaignName: "Party Season Preview", segment: "Active Buyers", sentCount: 310, status: "sent", filledBy: "Aditya" },
  { id: "e4", date: "Apr 2, 2026", brandShort: "LG", campaignName: "Lunar New Arrivals", segment: "All Retailers", sentCount: 0, status: "draft", filledBy: "Allen" },
  { id: "e5", date: "Apr 1, 2026", brandShort: "CB", campaignName: "Cozy Collection Drop", segment: "Reorder Customers", sentCount: 198, status: "sent", filledBy: "Bharti" },
  { id: "e6", date: "Apr 1, 2026", brandShort: "BD", campaignName: "Garden Essentials", segment: "Home & Garden", sentCount: 156, status: "sent", filledBy: "Aditya" },
  { id: "e7", date: "Mar 31, 2026", brandShort: "BA", campaignName: "Clearance Alert", segment: "Inactive Retailers", sentCount: 420, status: "sent", filledBy: "Bharti" },
  { id: "e8", date: "Mar 31, 2026", brandShort: "TN", campaignName: "Easter Collection", segment: "All Retailers", sentCount: 0, status: "scheduled", filledBy: "Allen" },
  { id: "e9", date: "Mar 28, 2026", brandShort: "SN", campaignName: "Balloon Bestsellers", segment: "Event Planners", sentCount: 275, status: "sent", filledBy: "Bharti" },
  { id: "e10", date: "Mar 28, 2026", brandShort: "LG", campaignName: "Constellation Series", segment: "Gift Shops", sentCount: 189, status: "sent", filledBy: "Aditya" },
]

const statusVariants: Record<string, "success" | "neutral" | "info"> = {
  sent: "success",
  draft: "neutral",
  scheduled: "info",
}

export default function EmailLogPage() {
  const { stores, storesLoading } = useBrandFilter()
  const [showForm, setShowForm] = useState(false)
  const [entries] = useState<EmailEntry[]>(MOCK_ENTRIES)
  const [sortKey, setSortKey] = useState("date")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir(prev => prev === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("desc") }
  }

  function SortIcon({ col }: { col: string }) {
    if (sortKey !== col) return <ArrowUpDown className="size-3 opacity-30 ml-1" />
    return sortDir === "asc" ? <ArrowUp className="size-3 text-primary ml-1" /> : <ArrowDown className="size-3 text-primary ml-1" />
  }

  // Form state
  const [formDate, setFormDate] = useState("")
  const [formBrand, setFormBrand] = useState("")
  const [formCampaign, setFormCampaign] = useState("")
  const [formSegment, setFormSegment] = useState("")
  const [formCount, setFormCount] = useState(0)
  const [formNotes, setFormNotes] = useState("")

  if (storesLoading) {
    return (
      <div className="space-y-6 max-w-[1440px] mx-auto w-full">
        <div className="h-[60px] rounded-md bg-muted animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[120px] rounded-md bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-[400px] rounded-md bg-muted animate-pulse" />
      </div>
    )
  }

  /** Resolve a brandShort to a store from Supabase */
  function findStore(short: string) {
    return stores.find((s) => s.short === short)
  }

  // Stats
  const thisMonth = entries.filter((e) => e.date.startsWith("Apr"))
  const totalSentMonth = thisMonth.filter((e) => e.status === "sent").reduce((s, e) => s + e.sentCount, 0)
  const campaignsThisWeek = entries.filter((e) => {
    const d = e.date
    return d.startsWith("Apr 1") || d.startsWith("Apr 2") || d.startsWith("Apr 3")
  }).length
  const sentEntries = entries.filter((e) => e.status === "sent")
  const avgOpenRate = sentEntries.length > 0 ? "24.3%" : "0%"

  // Top brand by send count
  const brandSends: Record<string, number> = {}
  sentEntries.forEach((e) => {
    brandSends[e.brandShort] = (brandSends[e.brandShort] || 0) + e.sentCount
  })
  const topBrandShort = Object.entries(brandSends).sort((a, b) => b[1] - a[1])[0]?.[0]
  const topStore = topBrandShort ? findStore(topBrandShort) : undefined

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Email Log</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Daily campaign send log</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Entry
        </button>
      </div>

      {/* Add Entry Form (collapsible) */}
      {showForm && (
        <div className="rounded-md border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-3.5">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              New Entry
            </h2>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
              <ChevronUp className="h-4 w-4" />
            </button>
          </div>
          <div className="p-5 grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">Date</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Brand</label>
              <select
                value={formBrand}
                onChange={(e) => setFormBrand(e.target.value)}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                <option value="">Select brand...</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Campaign Name</label>
              <input
                type="text"
                value={formCampaign}
                onChange={(e) => setFormCampaign(e.target.value)}
                placeholder="e.g., Spring Collection Launch"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Segment</label>
              <input
                type="text"
                value={formSegment}
                onChange={(e) => setFormSegment(e.target.value)}
                placeholder="e.g., New Retailers"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Sent Count</label>
              <input
                type="number"
                min={0}
                value={formCount}
                onChange={(e) => setFormCount(Number(e.target.value) || 0)}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Notes</label>
              <input
                type="text"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Optional"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div className="col-span-full flex justify-end">
              <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                <Send className="h-4 w-4" />
                Save Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-md border bg-card p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total Sent This Month</p>
            <p className="text-2xl font-bold font-heading mt-2">{totalSentMonth.toLocaleString()}</p>
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(34,90,234,0.1)" }}>
            <Mail className="h-4 w-4" style={{ color: "#225aea" }} />
          </div>
        </div>
        <div className="rounded-md border bg-card p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Campaigns This Week</p>
            <p className="text-2xl font-bold font-heading mt-2">{campaignsThisWeek}</p>
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(16,185,129,0.1)" }}>
            <Calendar className="h-4 w-4" style={{ color: "#10b981" }} />
          </div>
        </div>
        <div className="rounded-md border bg-card p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Avg Open Rate</p>
            <p className="text-2xl font-bold font-heading mt-2">{avgOpenRate}</p>
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(245,158,11,0.1)" }}>
            <BarChart3 className="h-4 w-4" style={{ color: "#f59e0b" }} />
          </div>
        </div>
        <div className="rounded-md border bg-card p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Top Brand</p>
            <p className="text-2xl font-bold font-heading mt-2">{topStore?.short ?? "-"}</p>
            <p className="text-xs text-muted-foreground mt-1">{topStore?.name ?? ""}</p>
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: topStore ? `${topStore.color}15` : "rgba(139,92,246,0.1)" }}>
            <Award className="h-4 w-4" style={{ color: topStore?.color ?? "#8b5cf6" }} />
          </div>
        </div>
      </div>

      {/* Email Log Table */}
      <div className="rounded-md border bg-card overflow-hidden">
        <div className="border-b px-5 py-3.5">
          <h2 className="text-sm font-semibold">Campaign Log</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left cursor-pointer select-none" onClick={() => toggleSort("date")}><span className="flex items-center">Date <SortIcon col="date" /></span></th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Brand</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Campaign Name</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Segment</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left cursor-pointer select-none" onClick={() => toggleSort("sentCount")}><span className="flex items-center">Sent Count <SortIcon col="sentCount" /></span></th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Filled By</th>
              </tr>
            </thead>
            <tbody>
              {[...entries].sort((a, b) => {
                const dir = sortDir === "asc" ? 1 : -1
                if (sortKey === "date") return (new Date(a.date).getTime() - new Date(b.date).getTime()) * dir
                if (sortKey === "sentCount") return (a.sentCount - b.sentCount) * dir
                return 0
              }).map((entry) => {
                const store = findStore(entry.brandShort)
                return (
                  <tr key={entry.id} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3.5 text-sm">{entry.date}</td>
                    <td className="px-4 py-3.5 text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: store?.color ?? "#94a3b8" }}
                        />
                        <span className="font-medium">{store?.name ?? entry.brandShort}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm font-medium">{entry.campaignName}</td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground">{entry.segment}</td>
                    <td className="px-4 py-3.5 text-sm">
                      {entry.status === "draft" ? "-" : entry.sentCount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-sm">
                      <StatusBadge
                        label={entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                        variant={statusVariants[entry.status]}
                      />
                    </td>
                    <td className="px-4 py-3.5 text-sm">{entry.filledBy}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
