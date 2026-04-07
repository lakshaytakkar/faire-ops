"use client"

import { useState, useMemo } from "react"
import { Users, DollarSign, Percent, Building2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const FD_ENTRIES = [
  { id: 1, retailer: "Twilight House of Salem",   brand: "Buddha Ayurveda",  status: "invited", fdRevenue: 0,      orders: 0,  inviteDate: "Apr 1, 2026" },
  { id: 2, retailer: "Enchanted Shire",           brand: "Lunar Gifts Co.",  status: "active",  fdRevenue: 1120,   orders: 8,  inviteDate: "Feb 10, 2026" },
  { id: 3, retailer: "Great Turtle Toys",         brand: "Toy Nest",         status: "active",  fdRevenue: 1960,   orders: 14, inviteDate: "Jan 15, 2026" },
  { id: 4, retailer: "Wildflowers Boutique",      brand: "Bloom Decor",      status: "pending", fdRevenue: 0,      orders: 0,  inviteDate: "Mar 28, 2026" },
  { id: 5, retailer: "Furniture Cottage",         brand: "Spark Novelty",    status: "active",  fdRevenue: 2370,   orders: 18, inviteDate: "Dec 5, 2025" },
  { id: 6, retailer: "Urban Bloom Store",         brand: "Spark Novelty",    status: "active",  fdRevenue: 890,    orders: 6,  inviteDate: "Jan 22, 2026" },
  { id: 7, retailer: "Coast & Craft Co.",         brand: "Cozy Bedding Co.", status: "invited", fdRevenue: 0,      orders: 0,  inviteDate: "Mar 20, 2026" },
  { id: 8, retailer: "Hearth & Home Shop",        brand: "Lunar Gifts Co.",  status: "active",  fdRevenue: 640,    orders: 5,  inviteDate: "Feb 18, 2026" },
]

const STATUS_BADGE: Record<string, string> = {
  active:  "bg-emerald-50 text-emerald-700",
  invited: "bg-blue-50 text-blue-700",
  pending: "bg-amber-50 text-amber-700",
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function FaireDirectPage() {
  type SortKey = "revenue" | "orders"
  type SortDir = "asc" | "desc"
  const [sortKey, setSortKey] = useState<SortKey>("revenue")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("desc") }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="size-3 opacity-30 ml-1" />
    return sortDir === "asc" ? <ArrowUp className="size-3 text-primary ml-1" /> : <ArrowDown className="size-3 text-primary ml-1" />
  }

  const sortedEntries = useMemo(() => {
    return [...FD_ENTRIES].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1
      switch (sortKey) {
        case "revenue":
          return dir * (a.fdRevenue - b.fdRevenue)
        case "orders":
          return dir * (a.orders - b.orders)
        default:
          return 0
      }
    })
  }, [sortKey, sortDir])

  const activeEntries = FD_ENTRIES.filter((e) => e.status === "active")
  const fdRetailers = activeEntries.length
  const fdRevenue = activeEntries.reduce((s, e) => s + e.fdRevenue, 0)
  const totalRevenue = 36170 // mock total marketplace revenue
  const avgFdPct = ((fdRevenue / totalRevenue) * 100).toFixed(1)
  const brandsWithFd = new Set(activeEntries.map((e) => e.brand)).size

  const STATS = [
    { label: "FD Retailers",  value: String(fdRetailers), trend: `${FD_ENTRIES.length} total invited`, icon: Users,     iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
    { label: "FD Revenue",    value: `$${fdRevenue.toLocaleString()}`, trend: "From active FD links",  icon: DollarSign, iconBg: "bg-blue-50",    iconColor: "text-blue-600" },
    { label: "Avg FD %",      value: `${avgFdPct}%`,      trend: "Of total revenue",                  icon: Percent,   iconBg: "bg-purple-50",  iconColor: "text-purple-600" },
    { label: "Brands with FD",value: String(brandsWithFd), trend: "Active FD programs",                icon: Building2, iconBg: "bg-amber-50",   iconColor: "text-amber-600" },
  ]

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">Faire Direct</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">0% commission retailer program</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-md border bg-card p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold font-heading mt-2">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.trend}</p>
            </div>
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${s.iconBg}`}>
              <s.icon className={`h-4 w-4 ${s.iconColor}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Retailer</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Brand</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-center">FD Status</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right cursor-pointer select-none" onClick={() => toggleSort("revenue")}>
                  <span className="flex items-center justify-end">FD Revenue <SortIcon col="revenue" /></span>
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right cursor-pointer select-none" onClick={() => toggleSort("orders")}>
                  <span className="flex items-center justify-end">Orders <SortIcon col="orders" /></span>
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Invite Date</th>
              </tr>
            </thead>
            <tbody>
              {sortedEntries.map((entry) => (
                <tr key={entry.id} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3.5 text-sm font-medium">{entry.retailer}</td>
                  <td className="px-4 py-3.5 text-sm">{entry.brand}</td>
                  <td className="px-4 py-3.5 text-sm text-center">
                    <span className={`border-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[entry.status]}`}>
                      {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-right tabular-nums font-medium">
                    {entry.fdRevenue > 0 ? `$${entry.fdRevenue.toLocaleString()}` : "\u2014"}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-right tabular-nums">{entry.orders || "\u2014"}</td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground">{entry.inviteDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t px-4 py-3 text-xs text-muted-foreground">
          Showing {FD_ENTRIES.length} entries
        </div>
      </div>
    </div>
  )
}
