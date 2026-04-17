"use client"

import { useState, useMemo } from "react"
import { ClipboardList, AlertTriangle, Clock, CheckCircle2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"

type Priority = "high" | "medium" | "low"
type FollowUpStatus = "pending" | "completed" | "overdue"

interface FollowUp {
  id: string; retailerName: string; reason: string; priority: Priority; dueDate: string; status: FollowUpStatus; assignedTo: string
}

const FOLLOWUPS: FollowUp[] = [
  { id: "f01", retailerName: "Twilight House of Salem", reason: "No reorder in 30 days", priority: "high", dueDate: "Apr 3, 2026", status: "overdue", assignedTo: "Sarah M." },
  { id: "f02", retailerName: "The Olive Branch Boutique", reason: "Payment issue follow-up", priority: "high", dueDate: "Apr 4, 2026", status: "pending", assignedTo: "James R." },
  { id: "f03", retailerName: "Moonrise Mercantile", reason: "New product introduction", priority: "medium", dueDate: "Apr 3, 2026", status: "pending", assignedTo: "Sarah M." },
  { id: "f04", retailerName: "Harbor Lane Goods", reason: "Shipping complaint", priority: "high", dueDate: "Apr 2, 2026", status: "overdue", assignedTo: "Mike T." },
  { id: "f05", retailerName: "Fern & Fig", reason: "Catalog update request", priority: "low", dueDate: "Apr 7, 2026", status: "pending", assignedTo: "James R." },
  { id: "f06", retailerName: "Copper Fox Trading", reason: "Onboarding check-in", priority: "medium", dueDate: "Apr 1, 2026", status: "completed", assignedTo: "Sarah M." },
  { id: "f07", retailerName: "Wild Poppy Studio", reason: "Volume discount inquiry", priority: "medium", dueDate: "Apr 5, 2026", status: "pending", assignedTo: "Mike T." },
  { id: "f08", retailerName: "Driftwood Home Co.", reason: "VIP tier renewal", priority: "high", dueDate: "Mar 31, 2026", status: "completed", assignedTo: "James R." },
]

const PRIORITY_BADGE: Record<Priority, string> = { high: "bg-red-50 text-red-700", medium: "bg-amber-50 text-amber-700", low: "bg-slate-100 text-slate-600" }
const STATUS_BADGE: Record<FollowUpStatus, string> = { pending: "bg-blue-50 text-blue-700", completed: "bg-emerald-50 text-emerald-700", overdue: "bg-red-50 text-red-700" }

export default function JSBlueridgeFollowupsPage() {
  type SortKey = "date" | "priority"
  type SortDir = "asc" | "desc"
  const [sortKey, setSortKey] = useState<SortKey>("date")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const PRIORITY_RANK: Record<Priority, number> = { high: 3, medium: 2, low: 1 }

  function toggleSort(key: SortKey) { if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc"); else { setSortKey(key); setSortDir("desc") } }
  function SortIcon({ col }: { col: SortKey }) { if (sortKey !== col) return <ArrowUpDown className="size-3 opacity-30 ml-1" />; return sortDir === "asc" ? <ArrowUp className="size-3 text-primary ml-1" /> : <ArrowDown className="size-3 text-primary ml-1" /> }

  const followups = FOLLOWUPS
  const sortedFollowups = useMemo(() => [...followups].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1
    switch (sortKey) { case "date": return dir * (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()); case "priority": return dir * (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]); default: return 0 }
  }), [followups, sortKey, sortDir])

  const total = followups.length
  const overdue = followups.filter(f => f.status === "overdue").length
  const dueToday = followups.filter(f => f.dueDate === "Apr 3, 2026" && f.status !== "completed").length
  const completedThisWeek = followups.filter(f => f.status === "completed").length

  const STATS = [
    { label: "Total Follow-ups", value: String(total), trend: "Active tasks", icon: ClipboardList, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
    { label: "Overdue", value: String(overdue), trend: "Needs attention", icon: AlertTriangle, iconBg: "bg-red-50", iconColor: "text-red-600" },
    { label: "Due Today", value: String(dueToday), trend: "Apr 3, 2026", icon: Clock, iconBg: "bg-amber-50", iconColor: "text-amber-600" },
    { label: "Completed This Week", value: String(completedThisWeek), trend: "Week of Mar 30", icon: CheckCircle2, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
  ]

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <div><h1 className="text-2xl font-bold font-heading text-foreground">Follow-ups</h1><p className="mt-0.5 text-sm text-muted-foreground">JS Blueridge retailer follow-up tasks</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map(s => (<div key={s.label} className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between"><div><p className="text-xs font-medium text-muted-foreground">{s.label}</p><p className="text-2xl font-bold font-heading mt-2">{s.value}</p><p className="text-xs text-muted-foreground mt-1">{s.trend}</p></div><div className={`h-9 w-9 rounded-lg flex items-center justify-center ${s.iconBg}`}><s.icon className={`h-4 w-4 ${s.iconColor}`} /></div></div>))}
      </div>
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b bg-muted/40">
          <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Retailer</th>
          <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Reason</th>
          <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left cursor-pointer select-none" onClick={() => toggleSort("priority")}><span className="flex items-center">Priority <SortIcon col="priority" /></span></th>
          <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left cursor-pointer select-none" onClick={() => toggleSort("date")}><span className="flex items-center">Due Date <SortIcon col="date" /></span></th>
          <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Status</th>
          <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Assigned To</th>
        </tr></thead>
        <tbody>{sortedFollowups.map(f => (
          <tr key={f.id} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
            <td className="px-4 py-3.5 text-sm font-medium">{f.retailerName}</td>
            <td className="px-4 py-3.5 text-sm text-muted-foreground">{f.reason}</td>
            <td className="px-4 py-3.5 text-sm"><span className={`border-0 text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_BADGE[f.priority]}`}>{f.priority.charAt(0).toUpperCase() + f.priority.slice(1)}</span></td>
            <td className="px-4 py-3.5 text-sm text-muted-foreground">{f.dueDate}</td>
            <td className="px-4 py-3.5 text-sm"><span className={`border-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[f.status]}`}>{f.status.charAt(0).toUpperCase() + f.status.slice(1)}</span></td>
            <td className="px-4 py-3.5 text-sm text-muted-foreground">{f.assignedTo}</td>
          </tr>
        ))}</tbody></table></div>
      </div>
    </div>
  )
}
