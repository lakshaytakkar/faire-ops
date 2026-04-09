"use client"

import { useState, useEffect, useMemo } from "react"
import { DollarSign, TrendingUp, ShoppingCart, Percent, ArrowUpDown, ArrowUp, ArrowDown, Plus, X, AlertCircle, Check } from "lucide-react"
import { useBrandFilter } from "@/lib/brand-filter-context"
import { supabase } from "@/lib/supabase"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface OrderRow {
  total_cents: number
  store_id: string
  state: string
  faire_created_at: string | null
}

interface ViewRow {
  store_id: string
  view_date: string
  view_count: number
}

const LINE_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4",
]

function smoothPath(points: [number, number][]): string {
  if (points.length < 2) return ""
  let d = `M ${points[0][0]},${points[0][1]}`
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const cpx = (prev[0] + curr[0]) / 2
    d += ` C ${cpx},${prev[1]} ${cpx},${curr[1]} ${curr[0]},${curr[1]}`
  }
  return d
}

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                   */
/* ------------------------------------------------------------------ */

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatCurrencyCompact(cents: number): string {
  const dollars = cents / 100
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(1)}K`
  return `$${dollars.toFixed(0)}`
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<"30" | "90">("30")
  const { activeBrand, stores, storesLoading } = useBrandFilter()
  const [sortKey, setSortKey] = useState("revenue")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  const [orders, setOrders] = useState<OrderRow[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)

  /* Fetch orders — limited to last 6 months for analytics */
  useEffect(() => {
    async function fetchRecent() {
      setOrdersLoading(true)
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      let query = supabase
        .from("faire_orders")
        .select("total_cents, store_id, state, faire_created_at")
        .gte("faire_created_at", sixMonthsAgo.toISOString())
        .order("faire_created_at", { ascending: false })
        .limit(500)
      if (activeBrand !== "all") query = query.eq("store_id", activeBrand)
      const { data } = await query
      setOrders((data ?? []) as OrderRow[])
      setOrdersLoading(false)
    }
    fetchRecent()
  }, [activeBrand])

  /* Fetch daily views */
  const [views, setViews] = useState<ViewRow[]>([])

  useEffect(() => {
    async function fetchViews() {
      const daysBack = parseInt(period, 10)
      const since = new Date()
      since.setDate(since.getDate() - daysBack)
      let query = supabase
        .from("store_daily_views")
        .select("store_id, view_date, view_count")
        .gte("view_date", since.toISOString().slice(0, 10))
        .order("view_date", { ascending: true })
      if (activeBrand !== "all") query = query.eq("store_id", activeBrand)
      const { data } = await query
      setViews((data ?? []) as ViewRow[])
    }
    fetchViews()
  }, [activeBrand, period])

  /* Build line chart data: date -> { storeId: count } */
  const viewLines = useMemo(() => {
    const dateMap = new Map<string, Record<string, number>>()
    for (const v of views) {
      const entry = dateMap.get(v.view_date) ?? {}
      entry[v.store_id] = v.view_count
      dateMap.set(v.view_date, entry)
    }
    const dates = [...dateMap.keys()].sort()
    return dates.map(d => ({ date: d, stores: dateMap.get(d)! }))
  }, [views])

  const viewStores = useMemo(() => {
    if (activeBrand !== "all") return stores.filter(s => s.id === activeBrand)
    return stores
  }, [stores, activeBrand])

  const maxViewCount = useMemo(() => {
    let max = 1
    for (const row of viewLines) {
      for (const count of Object.values(row.stores)) {
        if (count > max) max = count
      }
    }
    return max
  }, [viewLines])

  /* Add Views modal state */
  const [showAddViews, setShowAddViews] = useState(false)
  const [addViewDate, setAddViewDate] = useState(new Date().toISOString().slice(0, 10))
  const [addViewCounts, setAddViewCounts] = useState<Record<string, number>>({})
  const [addViewSaving, setAddViewSaving] = useState(false)
  const [addViewSuccess, setAddViewSuccess] = useState(false)

  // Detect missing days (days with no view data in last 30 days)
  const missingDays = useMemo(() => {
    const existingDates = new Set(viewLines.map(r => r.date))
    const missing: string[] = []
    const now = new Date()
    for (let i = 1; i <= 30; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      if (!existingDates.has(key)) missing.push(key)
    }
    return missing.slice(0, 10) // show max 10
  }, [viewLines])

  async function handleSaveViews() {
    setAddViewSaving(true)
    const entries = stores.filter(s => s.active !== false).map(s => ({
      store_id: s.id,
      view_date: addViewDate,
      view_count: addViewCounts[s.id] ?? 0,
    })).filter(e => e.view_count > 0)

    if (entries.length === 0) { setAddViewSaving(false); return }

    const res = await fetch("/api/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
    })

    setAddViewSaving(false)
    if (res.ok) {
      setAddViewSuccess(true)
      setTimeout(() => { setAddViewSuccess(false); setShowAddViews(false); setAddViewCounts({}) }, 1500)
      // Refresh views data
      const daysBack = parseInt(period, 10)
      const since = new Date()
      since.setDate(since.getDate() - daysBack)
      const { data } = await supabase
        .from("store_daily_views")
        .select("store_id, view_date, view_count")
        .gte("view_date", since.toISOString().slice(0, 10))
        .order("view_date", { ascending: true })
      setViews((data ?? []) as ViewRow[])
    }
  }

  /* Filter orders by active brand */
  const filteredOrders = useMemo(() => {
    if (activeBrand === "all") return orders
    return orders.filter((o) => o.store_id === activeBrand)
  }, [orders, activeBrand])

  /* Compute monthly revenue from real data */
  const monthlyRevenue = useMemo(() => {
    const monthMap: Record<string, number> = {}
    for (const order of filteredOrders) {
      if (!order.faire_created_at) continue
      const d = new Date(order.faire_created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      monthMap[key] = (monthMap[key] ?? 0) + (order.total_cents ?? 0)
    }
    const sorted = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6) // last 6 months
    const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return sorted.map(([key, value]) => {
      const month = parseInt(key.split("-")[1], 10) - 1
      return { month: shortMonths[month], value }
    })
  }, [filteredOrders])

  const maxMonthlyRevenue = monthlyRevenue.length > 0 ? Math.max(...monthlyRevenue.map((m) => m.value)) : 1

  /* Compute MoM growth from last 2 months */
  const momGrowth = useMemo(() => {
    if (monthlyRevenue.length < 2) return null
    const current = monthlyRevenue[monthlyRevenue.length - 1].value
    const previous = monthlyRevenue[monthlyRevenue.length - 2].value
    if (previous === 0) return null
    return ((current - previous) / previous) * 100
  }, [monthlyRevenue])

  /* Filter stores by active brand */
  const filteredStores = useMemo(
    () => activeBrand === "all" ? stores : stores.filter((s) => s.id === activeBrand),
    [activeBrand, stores],
  )

  /* Compute per-store revenue from real orders */
  const storeRevenue = useMemo(() => {
    const map: Record<string, number> = {}
    for (const order of filteredOrders) {
      map[order.store_id] = (map[order.store_id] ?? 0) + (order.total_cents ?? 0)
    }
    return map
  }, [filteredOrders])

  const storeOrderCounts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const order of filteredOrders) {
      map[order.store_id] = (map[order.store_id] ?? 0) + 1
    }
    return map
  }, [filteredOrders])

  /* Aggregate stats */
  const totalRevenueCents = filteredOrders.reduce((sum, o) => sum + (o.total_cents ?? 0), 0)
  const totalOrders = filteredOrders.length
  const avgOrderValue = totalOrders > 0 ? totalRevenueCents / totalOrders : 0
  const totalProducts = filteredStores.reduce((sum, s) => sum + s.total_products, 0)

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir(prev => prev === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("desc") }
  }

  function SortIcon({ col }: { col: string }) {
    if (sortKey !== col) return <ArrowUpDown className="size-3 opacity-30 ml-1" />
    return sortDir === "asc" ? <ArrowUp className="size-3 text-primary ml-1" /> : <ArrowDown className="size-3 text-primary ml-1" />
  }

  /* Compute daily sales for last 30/90 days */
  const dailySales = useMemo(() => {
    const days = parseInt(period, 10)
    const now = new Date()
    const dayMap: Record<string, number> = {}

    // Helper: format a Date as YYYY-MM-DD in local timezone (avoids UTC offset mismatch)
    const toLocalDateStr = (d: Date) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, "0")
      const day = String(d.getDate()).padStart(2, "0")
      return `${y}-${m}-${day}`
    }

    // Initialize all days to 0
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      dayMap[toLocalDateStr(d)] = 0
    }

    // Fill with real data — convert each order timestamp to local date
    for (const order of filteredOrders) {
      if (!order.faire_created_at) continue
      const key = toLocalDateStr(new Date(order.faire_created_at))
      if (key in dayMap) {
        dayMap[key] += order.total_cents ?? 0
      }
    }

    return Object.entries(dayMap).map(([date, value]) => {
      const d = new Date(date + "T00:00:00")
      return {
        date,
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        dayOfWeek: d.toLocaleDateString("en-US", { weekday: "short" }),
        value,
      }
    })
  }, [filteredOrders, period])

  const maxDailyValue = Math.max(...dailySales.map(d => d.value), 1)
  const totalDailyPeriod = dailySales.reduce((s, d) => s + d.value, 0)
  const avgDaily = dailySales.length > 0 ? totalDailyPeriod / dailySales.length : 0
  const daysWithSales = dailySales.filter(d => d.value > 0).length

  const STATS = [
    { label: "Total Revenue", value: formatCurrency(totalRevenueCents), trend: activeBrand === "all" ? "All stores" : "Selected store", icon: DollarSign, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
    { label: "MoM Growth", value: momGrowth !== null ? `${momGrowth >= 0 ? "+" : ""}${momGrowth.toFixed(1)}%` : "--", trend: "vs previous month", icon: TrendingUp, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
    { label: "Total Orders", value: totalOrders.toLocaleString(), trend: `Avg ${formatCurrency(avgOrderValue)} / order`, icon: ShoppingCart, iconBg: "bg-purple-50", iconColor: "text-purple-600" },
    { label: "Total Products", value: totalProducts.toLocaleString(), trend: "Active listings", icon: Percent, iconBg: "bg-amber-50", iconColor: "text-amber-600" },
  ]

  if (storesLoading || ordersLoading) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <div>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-md" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-md" />
        <Skeleton className="h-80 rounded-md" />
      </div>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">Revenue Analytics</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Track performance across all stores</p>
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

      {/* Charts Row — Daily Sales + Monthly Revenue side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily Sales Bar Chart */}
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-3.5">
            <div>
              <h2 className="text-sm font-semibold">Daily Sales</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatCurrencyCompact(totalDailyPeriod)} total &middot; {daysWithSales} active days
              </p>
            </div>
            <div className="flex items-center gap-1">
              {(["30", "90"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    period === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {p}d
                </button>
              ))}
            </div>
          </div>
          <div className="p-5">
            {dailySales.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No data</p>
            ) : (
              <>
                {/* Y-axis + bars */}
                <div className="flex gap-2">
                  {/* Y-axis labels */}
                  <div className="flex flex-col justify-between h-52 shrink-0 w-12 text-right pr-1">
                    <span className="text-[10px] text-muted-foreground">{formatCurrencyCompact(maxDailyValue)}</span>
                    <span className="text-[10px] text-muted-foreground">{formatCurrencyCompact(maxDailyValue / 2)}</span>
                    <span className="text-[10px] text-muted-foreground">$0</span>
                  </div>
                  {/* Bars container */}
                  <div className="flex-1 relative">
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                      <div className="border-b border-dashed border-muted/50" />
                      <div className="border-b border-dashed border-muted/50" />
                      <div className="border-b border-muted/30" />
                    </div>
                    {/* Bars */}
                    <div className="flex items-end gap-px h-52 relative z-10">
                      {dailySales.map((day, i) => {
                        const pct = maxDailyValue > 0 ? (day.value / maxDailyValue) * 100 : 0
                        const today = new Date()
                        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
                        const isToday = day.date === todayStr
                        return (
                          <div key={day.date} className="flex-1 flex flex-col items-center justify-end group relative">
                            <div className="absolute bottom-full mb-2 hidden group-hover:block z-20">
                              <div className="bg-foreground text-background text-[10px] rounded px-2 py-1 whitespace-nowrap shadow-lg">
                                <p className="font-semibold">{day.label} ({day.dayOfWeek})</p>
                                <p>{formatCurrency(day.value)}</p>
                              </div>
                            </div>
                            <div
                              className={`w-full rounded-t-sm transition-all ${
                                isToday ? "bg-primary" : day.value > 0 ? "bg-primary/50 hover:bg-primary/70" : "bg-muted/20"
                              }`}
                              style={{ height: `${Math.max(pct, day.value > 0 ? 2 : 0.5)}%`, minHeight: day.value > 0 ? "2px" : "1px" }}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
                {/* X-axis */}
                <div className="flex gap-2 mt-1">
                  <div className="w-12 shrink-0" />
                  <div className="flex-1 flex justify-between">
                    {dailySales.filter((_, i) => i === 0 || i === dailySales.length - 1 || (i + 1) % 7 === 0).map((day) => (
                      <span key={day.date} className="text-[9px] text-muted-foreground">{day.label.split(" ")[0]} {day.label.split(" ")[1]}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground border-t pt-2">
                  <span>Avg: {formatCurrency(avgDaily)}/day</span>
                  <span>Peak: {formatCurrency(maxDailyValue)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Monthly Revenue Bar Chart */}
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-3.5">
            <div>
              <h2 className="text-sm font-semibold">Monthly Revenue</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Last {monthlyRevenue.length} months
              </p>
            </div>
            {momGrowth !== null && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${momGrowth >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                {momGrowth >= 0 ? "+" : ""}{momGrowth.toFixed(1)}% MoM
              </span>
            )}
          </div>
          <div className="p-5">
            {monthlyRevenue.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No data</p>
            ) : (
              <div className="space-y-2">
                {monthlyRevenue.map((item) => (
                  <div key={item.month} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-muted-foreground w-8 shrink-0">{item.month}</span>
                    <div className="flex-1 h-8 bg-muted/20 rounded overflow-hidden">
                      <div className="h-full rounded bg-emerald-500" style={{ width: `${(item.value / maxMonthlyRevenue) * 100}%` }} />
                    </div>
                    <span className="text-sm font-semibold w-16 text-right shrink-0">{formatCurrencyCompact(item.value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Daily Views Line Chart */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <div>
            <h2 className="text-sm font-semibold">Daily Store Views</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeBrand === "all" ? "All stores" : viewStores[0]?.name ?? "Store"} &middot; {viewLines.length} days tracked
              {missingDays.length > 0 && (
                <span className="text-amber-600 ml-2">
                  <AlertCircle className="size-3 inline -mt-0.5" /> {missingDays.length} days missing
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Legend */}
            <div className="hidden md:flex items-center gap-2 flex-wrap">
              {viewStores.map((s, i) => (
                <span key={s.id} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="w-2.5 h-[3px] rounded-full" style={{ backgroundColor: s.color || LINE_COLORS[i % LINE_COLORS.length] }} />
                  {s.name}
                </span>
              ))}
            </div>
            {/* Add Views button */}
            <button
              onClick={() => setShowAddViews(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="size-3" />
              Add Views
            </button>
          </div>
        </div>
        <div className="p-5">
          {viewLines.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No view data available.</p>
          ) : (
            <>
              <div className="flex gap-2">
                {/* Y axis */}
                <div className="flex flex-col justify-between h-64 shrink-0 w-8 text-right pr-1">
                  <span className="text-[10px] text-muted-foreground">{maxViewCount}</span>
                  <span className="text-[10px] text-muted-foreground">{Math.round(maxViewCount / 2)}</span>
                  <span className="text-[10px] text-muted-foreground">0</span>
                </div>
                {/* Chart area */}
                <div className="flex-1 relative h-64">
                  {/* Grid lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    <div className="border-b border-dashed border-muted/40" />
                    <div className="border-b border-dashed border-muted/40" />
                    <div className="border-b border-muted/30" />
                  </div>
                  {/* SVG line chart */}
                  <svg viewBox={`0 0 ${viewLines.length - 1} 100`} className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                    {viewStores.map((store, si) => {
                      const color = store.color || LINE_COLORS[si % LINE_COLORS.length]
                      const pointsArray: [number, number][] = viewLines.map((row, i) => {
                        const val = row.stores[store.id] ?? 0
                        const y = 100 - (val / maxViewCount) * 100
                        return [i, y] as [number, number]
                      })
                      return (
                        <g key={store.id}>
                          <path
                            d={smoothPath(pointsArray)}
                            fill="none"
                            stroke={color}
                            strokeWidth="1.5"
                            vectorEffect="non-scaling-stroke"
                            strokeLinejoin="round"
                          />
                        </g>
                      )
                    })}
                  </svg>
                  {/* Hover columns for tooltips */}
                  <div className="absolute inset-0 flex">
                    {viewLines.map((row, i) => {
                      const d = new Date(row.date + "T00:00:00")
                      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      return (
                        <div key={row.date} className="flex-1 group relative">
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 hidden group-hover:block z-20">
                            <div className="bg-foreground text-background text-[10px] rounded px-2 py-1.5 shadow-lg whitespace-nowrap">
                              <p className="font-semibold mb-0.5">{label}</p>
                              {viewStores.map((s, si) => (
                                <p key={s.id} className="flex items-center gap-1">
                                  <span className="w-2 h-[2px] rounded" style={{ backgroundColor: s.color || LINE_COLORS[si % LINE_COLORS.length] }} />
                                  {s.name}: {row.stores[s.id] ?? 0}
                                </p>
                              ))}
                            </div>
                          </div>
                          {/* Hover line */}
                          <div className="w-px h-full mx-auto bg-muted/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
              {/* X axis */}
              <div className="flex gap-2 mt-1">
                <div className="w-8 shrink-0" />
                <div className="flex-1 flex justify-between">
                  {viewLines
                    .filter((_, i) => i === 0 || i === viewLines.length - 1 || (i + 1) % 7 === 0)
                    .map((row) => {
                      const d = new Date(row.date + "T00:00:00")
                      return (
                        <span key={row.date} className="text-[9px] text-muted-foreground">
                          {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      )
                    })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Views Modal */}
      {showAddViews && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAddViews(false)}>
          <div className="w-full max-w-md rounded-lg border bg-card shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-lg font-semibold">Add Daily Views</h2>
              <button onClick={() => setShowAddViews(false)} className="p-1 rounded hover:bg-muted"><X className="size-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Date picker */}
              <div>
                <label className="text-sm font-medium">Date</label>
                <input
                  type="date"
                  value={addViewDate}
                  onChange={(e) => setAddViewDate(e.target.value)}
                  className="mt-1 w-full h-9 rounded-md border bg-background px-3 text-sm"
                />
                {/* Quick fill missing days */}
                {missingDays.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-1">Missing days (click to fill):</p>
                    <div className="flex flex-wrap gap-1">
                      {missingDays.map(d => (
                        <button
                          key={d}
                          onClick={() => setAddViewDate(d)}
                          className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                            addViewDate === d ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
                          }`}
                        >
                          {new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Per-store view counts */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Views per store</label>
                {stores.map(s => (
                  <div key={s.id} className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-sm flex-1 truncate">{s.name}</span>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={addViewCounts[s.id] ?? ""}
                      onChange={(e) => setAddViewCounts(prev => ({ ...prev, [s.id]: parseInt(e.target.value) || 0 }))}
                      className="w-20 h-8 rounded-md border bg-background px-2 text-sm text-right"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-4">
              <button onClick={() => setShowAddViews(false)} className="px-4 py-2 text-sm font-medium rounded-md border hover:bg-muted">Cancel</button>
              <button
                onClick={handleSaveViews}
                disabled={addViewSaving || addViewSuccess}
                className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {addViewSuccess ? <><Check className="size-3.5" /> Saved</> : addViewSaving ? "Saving..." : "Save Views"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Store Performance Table */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <h2 className="text-sm font-semibold">Store Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Store</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Category</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right cursor-pointer select-none" onClick={() => toggleSort("revenue")}><span className="flex items-center justify-end">Revenue <SortIcon col="revenue" /></span></th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right cursor-pointer select-none" onClick={() => toggleSort("orders")}><span className="flex items-center justify-end">Orders <SortIcon col="orders" /></span></th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right cursor-pointer select-none" onClick={() => toggleSort("aov")}><span className="flex items-center justify-end">Avg Order <SortIcon col="aov" /></span></th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right cursor-pointer select-none" onClick={() => toggleSort("products")}><span className="flex items-center justify-end">Products <SortIcon col="products" /></span></th>
              </tr>
            </thead>
            <tbody>
              {[...filteredStores].sort((a, b) => {
                const dir = sortDir === "asc" ? 1 : -1
                const aRev = storeRevenue[a.id] ?? 0
                const bRev = storeRevenue[b.id] ?? 0
                const aOrd = storeOrderCounts[a.id] ?? 0
                const bOrd = storeOrderCounts[b.id] ?? 0
                const aAov = aOrd > 0 ? aRev / aOrd : 0
                const bAov = bOrd > 0 ? bRev / bOrd : 0
                if (sortKey === "revenue") return (aRev - bRev) * dir
                if (sortKey === "orders") return (aOrd - bOrd) * dir
                if (sortKey === "aov") return (aAov - bAov) * dir
                if (sortKey === "products") return (a.total_products - b.total_products) * dir
                return 0
              }).map((store) => {
                const rev = storeRevenue[store.id] ?? 0
                const ord = storeOrderCounts[store.id] ?? 0
                const aov = ord > 0 ? rev / ord : 0
                return (
                  <tr key={store.id} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3.5 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: store.color }} />
                        <span className="font-medium">{store.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground">{store.category}</td>
                    <td className="px-4 py-3.5 text-sm text-right tabular-nums font-medium">{formatCurrency(rev)}</td>
                    <td className="px-4 py-3.5 text-sm text-right tabular-nums">{ord.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-sm text-right tabular-nums">{formatCurrency(aov)}</td>
                    <td className="px-4 py-3.5 text-sm text-right tabular-nums">{store.total_products}</td>
                  </tr>
                )
              })}
              {filteredStores.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No stores found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
