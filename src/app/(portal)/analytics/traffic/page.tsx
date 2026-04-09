"use client"

import { useState } from "react"
import { Users, Eye, Percent, DollarSign, ArrowUpDown, ArrowUp, ArrowDown, AlertCircle } from "lucide-react"
import { useBrandFilter } from "@/lib/brand-filter-context"

/* ------------------------------------------------------------------ */
/*  Inline data                                                        */
/* ------------------------------------------------------------------ */

interface TrafficSource {
  source: string
  visitors: number
  pageViews: number
  conversionRate: number
  revenue: number
}

const TRAFFIC_SOURCES: TrafficSource[] = [
  { source: "Faire Marketplace",  visitors: 12480, pageViews: 38200, conversionRate: 4.2,  revenue: 18640 },
  { source: "Google Organic",     visitors: 8320,  pageViews: 21500, conversionRate: 2.8,  revenue: 9870  },
  { source: "Direct",             visitors: 5140,  pageViews: 14800, conversionRate: 5.1,  revenue: 12350 },
  { source: "Instagram",          visitors: 3960,  pageViews: 8900,  conversionRate: 1.9,  revenue: 4280  },
  { source: "Email Campaigns",    visitors: 2740,  pageViews: 7200,  conversionRate: 6.3,  revenue: 8920  },
  { source: "Pinterest",          visitors: 1850,  pageViews: 4100,  conversionRate: 1.4,  revenue: 1940  },
]

interface TopPage {
  path: string
  views: number
}

const TOP_PAGES: TopPage[] = [
  { path: "/collections/spring-2026",       views: 14200 },
  { path: "/products/led-butterfly-lights",  views: 9840  },
  { path: "/collections/home-decor",         views: 8100  },
  { path: "/products/magnetic-puzzle-tiles", views: 6520  },
  { path: "/about",                          views: 4380  },
]

const maxPageViews = Math.max(...TOP_PAGES.map((p) => p.views))

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function TrafficPage() {
  const { activeBrand } = useBrandFilter()
  const [dateFilter, setDateFilter] = useState("Today")
  const [sortKey, setSortKey] = useState("visitors")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir(prev => prev === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("desc") }
  }

  function SortIcon({ col }: { col: string }) {
    if (sortKey !== col) return <ArrowUpDown className="size-3 opacity-30 ml-1" />
    return sortDir === "asc" ? <ArrowUp className="size-3 text-primary ml-1" /> : <ArrowDown className="size-3 text-primary ml-1" />
  }

  const multiplier = dateFilter === "Today" ? 0.03 : dateFilter === "7 Days" ? 0.2 : dateFilter === "30 Days" ? 1 : dateFilter === "90 Days" ? 2.8 : 10

  const scaledSources = TRAFFIC_SOURCES.map((t) => ({
    ...t,
    visitors: Math.round(t.visitors * multiplier),
    pageViews: Math.round(t.pageViews * multiplier),
    revenue: Math.round(t.revenue * multiplier),
  }))

  const totalVisitors = scaledSources.reduce((s, t) => s + t.visitors, 0)
  const totalPageViews = scaledSources.reduce((s, t) => s + t.pageViews, 0)
  const avgConversion = scaledSources.reduce((s, t) => s + t.conversionRate, 0) / scaledSources.length
  const totalRevenue = scaledSources.reduce((s, t) => s + t.revenue, 0)

  const STATS = [
    { label: "Total Visitors", value: totalVisitors.toLocaleString(), trend: dateFilter === "All Time" ? "All time" : dateFilter === "Today" ? "Today" : `Last ${dateFilter}`, icon: Users, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
    { label: "Page Views", value: totalPageViews.toLocaleString(), trend: "Across all sources", icon: Eye, iconBg: "bg-purple-50", iconColor: "text-purple-600" },
    { label: "Conversion Rate", value: `${avgConversion.toFixed(1)}%`, trend: "Average across sources", icon: Percent, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
    { label: "Revenue from Traffic", value: `$${totalRevenue.toLocaleString()}`, trend: "Attributed revenue", icon: DollarSign, iconBg: "bg-amber-50", iconColor: "text-amber-600" },
  ]

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">Traffic Analytics</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Monitor visitor sources and page performance</p>
      </div>

      {/* Sample Data Banner */}
      <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        <span>Traffic data is illustrative. Faire does not provide traffic analytics via API{activeBrand !== "all" ? " — brand filter has no effect on this page" : ""}.</span>
      </div>

      {/* Date Filter Chips */}
      <div className="flex items-center gap-2">
        {["Today", "7 Days", "30 Days", "90 Days", "All Time"].map(period => (
          <button
            key={period}
            onClick={() => setDateFilter(period)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              dateFilter === period
                ? "bg-primary text-white"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {period}
          </button>
        ))}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
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

      {/* Traffic Sources Table */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Source</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right cursor-pointer select-none" onClick={() => toggleSort("visitors")}><span className="flex items-center justify-end">Visitors <SortIcon col="visitors" /></span></th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right">Page Views</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right">Conversion Rate %</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right cursor-pointer select-none" onClick={() => toggleSort("revenue")}><span className="flex items-center justify-end">Revenue <SortIcon col="revenue" /></span></th>
              </tr>
            </thead>
            <tbody>
              {[...scaledSources].sort((a, b) => {
                const dir = sortDir === "asc" ? 1 : -1
                if (sortKey === "visitors") return (a.visitors - b.visitors) * dir
                if (sortKey === "revenue") return (a.revenue - b.revenue) * dir
                return 0
              }).map((t) => (
                <tr key={t.source} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3.5 text-sm font-medium">{t.source}</td>
                  <td className="px-4 py-3.5 text-sm text-right tabular-nums">{t.visitors.toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-sm text-right tabular-nums">{t.pageViews.toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-sm text-right tabular-nums">{t.conversionRate}%</td>
                  <td className="px-4 py-3.5 text-sm text-right tabular-nums font-medium">${t.revenue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Pages */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <h2 className="text-sm font-semibold">Top Pages</h2>
          <span className="text-xs text-muted-foreground">{dateFilter === "All Time" ? "All time" : dateFilter === "Today" ? "Today" : `Last ${dateFilter}`}</span>
        </div>
        <div className="p-5 space-y-3">
          {TOP_PAGES.map((page) => {
            const scaledViews = Math.round(page.views * multiplier)
            return (
            <div key={page.path} className="flex items-center gap-4">
              <span className="text-xs font-medium text-muted-foreground w-56 shrink-0 truncate">
                {page.path}
              </span>
              <div className="flex-1 h-7 bg-muted/30 rounded overflow-hidden">
                <div
                  className="h-full rounded"
                  style={{
                    width: `${(page.views / maxPageViews) * 100}%`,
                    backgroundColor: "hsl(223 83% 53%)",
                  }}
                />
              </div>
              <span className="text-sm font-medium w-20 text-right shrink-0">
                {scaledViews.toLocaleString()}
              </span>
            </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
