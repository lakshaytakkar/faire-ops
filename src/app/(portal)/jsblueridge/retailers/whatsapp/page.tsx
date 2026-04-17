"use client"

import { useState, useMemo } from "react"
import { MessageSquare, CalendarDays, Clock, Building2, Plus, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"

const WHATSAPP_ENTRIES = [
  { id: 1, date: "Apr 3, 2026", retailer: "Twilight House of Salem", type: "follow-up", template: "Order Follow-Up v2", status: "sent", sentBy: "Charlie" },
  { id: 2, date: "Apr 3, 2026", retailer: "Enchanted Shire", type: "order-update", template: "Shipping Confirmation", status: "sent", sentBy: "Charlie" },
  { id: 3, date: "Apr 2, 2026", retailer: "Great Turtle Toys", type: "outreach", template: "New Product Launch", status: "sent", sentBy: "Priya" },
  { id: 4, date: "Apr 2, 2026", retailer: "Wildflowers Boutique", type: "follow-up", template: "Reorder Reminder", status: "pending", sentBy: "Charlie" },
  { id: 5, date: "Apr 1, 2026", retailer: "The Olive Branch Boutique", type: "outreach", template: "Welcome First Order", status: "sent", sentBy: "Priya" },
  { id: 6, date: "Apr 1, 2026", retailer: "Furniture Cottage", type: "order-update", template: "Delivery Confirmation", status: "sent", sentBy: "Charlie" },
  { id: 7, date: "Mar 31, 2026", retailer: "Urban Bloom Store", type: "follow-up", template: "Order Follow-Up v2", status: "sent", sentBy: "Priya" },
  { id: 8, date: "Mar 31, 2026", retailer: "Coast & Craft Co.", type: "outreach", template: "Seasonal Promo Q2", status: "pending", sentBy: "Charlie" },
]

const TYPE_LABELS: Record<string, string> = { "follow-up": "Follow-up", "order-update": "Order Update", "outreach": "Outreach" }
const TYPE_BADGE: Record<string, string> = { "follow-up": "bg-blue-50 text-blue-700", "order-update": "bg-purple-50 text-purple-700", "outreach": "bg-amber-50 text-amber-700" }
const STATUS_BADGE: Record<string, string> = { sent: "bg-emerald-50 text-emerald-700", pending: "bg-amber-50 text-amber-700" }

export default function JSBlueridgeWhatsAppLogPage() {
  type SortKey = "date"
  type SortDir = "asc" | "desc"
  const [sortKey, setSortKey] = useState<SortKey>("date")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  function toggleSort(key: SortKey) { if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc"); else { setSortKey(key); setSortDir("desc") } }
  function SortIcon({ col }: { col: SortKey }) { if (sortKey !== col) return <ArrowUpDown className="size-3 opacity-30 ml-1" />; return sortDir === "asc" ? <ArrowUp className="size-3 text-primary ml-1" /> : <ArrowDown className="size-3 text-primary ml-1" /> }

  const filteredEntries = WHATSAPP_ENTRIES
  const sortedEntries = useMemo(() => [...filteredEntries].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1
    return dir * (new Date(a.date).getTime() - new Date(b.date).getTime())
  }), [filteredEntries, sortDir])

  const totalSent = filteredEntries.filter(e => e.status === "sent").length
  const thisWeek = filteredEntries.filter(e => e.date.startsWith("Apr")).length

  const STATS = [
    { label: "Messages Sent", value: String(totalSent), trend: "All time", icon: MessageSquare, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
    { label: "This Week", value: String(thisWeek), trend: "Apr 2026", icon: CalendarDays, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
    { label: "Avg Response Time", value: "2.4h", trend: "Across all retailers", icon: Clock, iconBg: "bg-purple-50", iconColor: "text-purple-600" },
    { label: "Total Entries", value: String(filteredEntries.length), trend: "JS Blueridge", icon: Building2, iconBg: "bg-amber-50", iconColor: "text-amber-600" },
  ]

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold font-heading text-foreground">WhatsApp Log</h1><p className="mt-0.5 text-sm text-muted-foreground">JS Blueridge retailer messages</p></div>
        <button className="h-9 gap-1.5 text-sm inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-3 font-medium hover:bg-primary/90 transition-colors"><Plus className="h-4 w-4" />Add Entry</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map(s => (<div key={s.label} className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between"><div><p className="text-xs font-medium text-muted-foreground">{s.label}</p><p className="text-2xl font-bold font-heading mt-2">{s.value}</p><p className="text-xs text-muted-foreground mt-1">{s.trend}</p></div><div className={`h-9 w-9 rounded-lg flex items-center justify-center ${s.iconBg}`}><s.icon className={`h-4 w-4 ${s.iconColor}`} /></div></div>))}
      </div>

      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b bg-muted/40">
          <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left cursor-pointer select-none" onClick={() => toggleSort("date")}><span className="flex items-center">Date <SortIcon col="date" /></span></th>
          <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Retailer</th>
          <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Message Type</th>
          <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Template Used</th>
          <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-center">Status</th>
          <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Sent By</th>
        </tr></thead>
        <tbody>{sortedEntries.map(entry => (
          <tr key={entry.id} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
            <td className="px-4 py-3.5 text-sm text-muted-foreground">{entry.date}</td>
            <td className="px-4 py-3.5 text-sm font-medium">{entry.retailer}</td>
            <td className="px-4 py-3.5 text-sm"><span className={`border-0 text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_BADGE[entry.type]}`}>{TYPE_LABELS[entry.type]}</span></td>
            <td className="px-4 py-3.5 text-sm text-muted-foreground">{entry.template}</td>
            <td className="px-4 py-3.5 text-sm text-center"><span className={`border-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[entry.status]}`}>{entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}</span></td>
            <td className="px-4 py-3.5 text-sm">{entry.sentBy}</td>
          </tr>
        ))}</tbody></table></div>
        <div className="border-t px-4 py-3 text-xs text-muted-foreground">Showing {filteredEntries.length} entries</div>
      </div>
    </div>
  )
}
