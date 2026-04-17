"use client"

import { useState, useMemo } from "react"
import { Mail, Send, Eye, MessageSquare, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"

type CampaignStatus = "draft" | "active" | "completed" | "paused"

interface Campaign {
  id: string; name: string; sentCount: number; openRate: number; replyRate: number; status: CampaignStatus; sentDate: string
}

const CAMPAIGNS: Campaign[] = [
  { id: "c1", name: "Spring Launch 2026", sentCount: 1240, openRate: 42.3, replyRate: 8.1, status: "completed", sentDate: "Mar 1, 2026" },
  { id: "c2", name: "New Arrivals Blast", sentCount: 860, openRate: 38.7, replyRate: 6.4, status: "completed", sentDate: "Mar 10, 2026" },
  { id: "c3", name: "Wholesale Intro Offer", sentCount: 2100, openRate: 45.1, replyRate: 11.2, status: "active", sentDate: "Mar 18, 2026" },
  { id: "c4", name: "Restock Reminder", sentCount: 540, openRate: 51.8, replyRate: 14.3, status: "active", sentDate: "Mar 22, 2026" },
  { id: "c5", name: "Easter Collection Preview", sentCount: 1680, openRate: 36.2, replyRate: 5.9, status: "paused", sentDate: "Mar 25, 2026" },
  { id: "c6", name: "VIP Retailer Exclusive", sentCount: 320, openRate: 62.4, replyRate: 22.1, status: "completed", sentDate: "Mar 28, 2026" },
  { id: "c7", name: "Summer Catalog Teaser", sentCount: 0, openRate: 0, replyRate: 0, status: "draft", sentDate: "\u2014" },
  { id: "c8", name: "Win-back Inactive Buyers", sentCount: 740, openRate: 29.5, replyRate: 3.8, status: "active", sentDate: "Apr 1, 2026" },
]

const STATUS_BADGE: Record<CampaignStatus, string> = {
  draft: "bg-slate-100 text-slate-600", active: "bg-emerald-50 text-emerald-700",
  completed: "bg-blue-50 text-blue-700", paused: "bg-amber-50 text-amber-700",
}

export default function JSBlueridgeCampaignsPage() {
  type SortKey = "date" | "sent"
  type SortDir = "asc" | "desc"
  const [sortKey, setSortKey] = useState<SortKey>("date")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  function toggleSort(key: SortKey) { if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc"); else { setSortKey(key); setSortDir("desc") } }
  function SortIcon({ col }: { col: SortKey }) { if (sortKey !== col) return <ArrowUpDown className="size-3 opacity-30 ml-1" />; return sortDir === "asc" ? <ArrowUp className="size-3 text-primary ml-1" /> : <ArrowDown className="size-3 text-primary ml-1" /> }

  const campaigns = CAMPAIGNS
  const sortedCampaigns = useMemo(() => [...campaigns].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1
    switch (sortKey) { case "date": return dir * (new Date(a.sentDate === "\u2014" ? 0 : a.sentDate).getTime() - new Date(b.sentDate === "\u2014" ? 0 : b.sentDate).getTime()); case "sent": return dir * (a.sentCount - b.sentCount); default: return 0 }
  }), [campaigns, sortKey, sortDir])

  const totalCampaigns = campaigns.length
  const totalSent = campaigns.reduce((s, c) => s + c.sentCount, 0)
  const sentCampaigns = campaigns.filter(c => c.sentCount > 0)
  const avgOpenRate = sentCampaigns.length > 0 ? sentCampaigns.reduce((s, c) => s + c.openRate, 0) / sentCampaigns.length : 0
  const avgReplyRate = sentCampaigns.length > 0 ? sentCampaigns.reduce((s, c) => s + c.replyRate, 0) / sentCampaigns.length : 0

  const STATS = [
    { label: "Total Campaigns", value: String(totalCampaigns), trend: "All time", icon: Mail, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
    { label: "Emails Sent", value: totalSent.toLocaleString(), trend: "Across all campaigns", icon: Send, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
    { label: "Avg Open Rate", value: `${avgOpenRate.toFixed(1)}%`, trend: "Sent campaigns only", icon: Eye, iconBg: "bg-purple-50", iconColor: "text-purple-600" },
    { label: "Avg Reply Rate", value: `${avgReplyRate.toFixed(1)}%`, trend: "Sent campaigns only", icon: MessageSquare, iconBg: "bg-amber-50", iconColor: "text-amber-600" },
  ]

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <div><h1 className="text-2xl font-bold font-heading text-foreground">Outreach Campaigns</h1><p className="mt-0.5 text-sm text-muted-foreground">JS Blueridge email campaign performance</p></div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map(s => (
          <div key={s.label} className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
            <div><p className="text-xs font-medium text-muted-foreground">{s.label}</p><p className="text-2xl font-bold font-heading mt-2">{s.value}</p><p className="text-xs text-muted-foreground mt-1">{s.trend}</p></div>
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${s.iconBg}`}><s.icon className={`h-4 w-4 ${s.iconColor}`} /></div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b bg-muted/40">
          <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Campaign Name</th>
          <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right cursor-pointer select-none" onClick={() => toggleSort("sent")}><span className="flex items-center justify-end">Sent <SortIcon col="sent" /></span></th>
          <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right">Open Rate %</th>
          <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right">Reply Rate %</th>
          <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Status</th>
          <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left cursor-pointer select-none" onClick={() => toggleSort("date")}><span className="flex items-center">Date <SortIcon col="date" /></span></th>
        </tr></thead>
        <tbody>{sortedCampaigns.map(c => (
          <tr key={c.id} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
            <td className="px-4 py-3.5 text-sm font-medium">{c.name}</td>
            <td className="px-4 py-3.5 text-sm text-right tabular-nums">{c.sentCount > 0 ? c.sentCount.toLocaleString() : "\u2014"}</td>
            <td className="px-4 py-3.5 text-sm text-right tabular-nums">{c.openRate > 0 ? `${c.openRate}%` : "\u2014"}</td>
            <td className="px-4 py-3.5 text-sm text-right tabular-nums">{c.replyRate > 0 ? `${c.replyRate}%` : "\u2014"}</td>
            <td className="px-4 py-3.5 text-sm"><span className={`border-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[c.status]}`}>{c.status.charAt(0).toUpperCase() + c.status.slice(1)}</span></td>
            <td className="px-4 py-3.5 text-sm text-muted-foreground">{c.sentDate}</td>
          </tr>
        ))}{campaigns.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">No campaigns found.</td></tr>}</tbody></table></div>
      </div>
    </div>
  )
}
