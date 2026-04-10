"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  DollarSign,
  ShoppingCart,
  Store as StoreIcon,
  TrendingUp,
  ArrowRight,
} from "lucide-react"
import { useBrandFilter } from "@/lib/brand-filter-context"
import { useOrderStats } from "@/lib/use-faire-data"
import { supabase } from "@/lib/supabase"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type PeriodKey = "7d" | "30d" | "90d" | "all"

interface PeriodOption {
  key: PeriodKey
  label: string
  days: number | null
}

const PERIODS: PeriodOption[] = [
  { key: "7d", label: "Last 7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
  { key: "all", label: "All time", days: null },
]

interface StoreRevenueRow {
  id: string
  name: string
  color: string
  revenueCents: number
  orderCount: number
}

interface BestsellerRow {
  productId: string
  name: string
  orders: number
  revenueCents: number
}

interface DailyRevenuePoint {
  date: string
  revenueCents: number
}

interface CategoryRow {
  name: string
  orders: number
}

interface StateRow {
  state: string
  revenueCents: number
  orders: number
}

interface OrderItem {
  product_id?: string
  product_name?: string
  price_cents?: number
  quantity?: number
}

interface OrderRowLite {
  store_id: string
  total_cents: number | null
  faire_created_at: string | null
  shipping_address: Record<string, unknown> | null
  raw_data: Record<string, unknown> | null
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCurrency(cents: number): string {
  const dollars = cents / 100
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`
  if (dollars >= 10_000) return `$${(dollars / 1_000).toFixed(1)}K`
  return `$${dollars.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatCurrencyExact(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function periodStartIso(period: PeriodKey): string | null {
  const opt = PERIODS.find((p) => p.key === period)
  if (!opt || opt.days === null) return null
  const d = new Date()
  d.setDate(d.getDate() - opt.days)
  return d.toISOString()
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />
}

/* ------------------------------------------------------------------ */
/*  Daily revenue sparkline                                            */
/* ------------------------------------------------------------------ */

function DailyRevenueChart({ points }: { points: DailyRevenuePoint[] }) {
  if (points.length === 0) {
    return (
      <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">
        No revenue data available for the selected period.
      </div>
    )
  }

  const width = 1200
  const height = 180
  const padX = 16
  const padY = 20
  const innerW = width - padX * 2
  const innerH = height - padY * 2

  const maxVal = Math.max(1, ...points.map((p) => p.revenueCents))
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0

  const coords: [number, number][] = points.map((p, i) => [
    padX + i * stepX,
    padY + innerH - (p.revenueCents / maxVal) * innerH,
  ])

  const linePath = coords
    .map((c, i) => (i === 0 ? `M ${c[0]},${c[1]}` : `L ${c[0]},${c[1]}`))
    .join(" ")

  const areaPath =
    `M ${coords[0][0]},${padY + innerH} ` +
    coords.map((c) => `L ${c[0]},${c[1]}`).join(" ") +
    ` L ${coords[coords.length - 1][0]},${padY + innerH} Z`

  const firstDate = points[0]?.date ?? ""
  const lastDate = points[points.length - 1]?.date ?? ""
  const total = points.reduce((s, p) => s + p.revenueCents, 0)

  return (
    <div>
      <div className="flex items-end justify-between mb-2 px-1">
        <div>
          <p className="text-xs text-muted-foreground">Total (30 days)</p>
          <p className="text-xl font-bold font-heading">{formatCurrencyExact(total)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Peak day</p>
          <p className="text-sm font-medium">{formatCurrency(maxVal)}</p>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full h-[180px]"
      >
        <defs>
          <linearGradient id="revenue-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#225aea" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#225aea" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#revenue-grad)" />
        <path
          d={linePath}
          fill="none"
          stroke="#225aea"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {coords.map((c, i) => (
          <circle key={i} cx={c[0]} cy={c[1]} r="1.5" fill="#225aea" />
        ))}
      </svg>
      <div className="flex justify-between px-1 mt-1 text-xs text-muted-foreground tabular-nums">
        <span>{firstDate}</span>
        <span>{lastDate}</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ConsolidatedAnalyticsPage() {
  const { activeBrand, stores, storesLoading } = useBrandFilter()
  const [period, setPeriod] = useState<PeriodKey>("30d")

  const storeFilter = activeBrand === "all" ? undefined : activeBrand
  // Map our period to useOrderStats's dateFilter wording
  const orderStatsDateFilter = useMemo(() => {
    if (period === "all") return "All Time"
    if (period === "7d") return "Today" // custom handled below via direct queries; fallback
    if (period === "30d") return "This Month"
    if (period === "90d") return "3 Months"
    return "All Time"
  }, [period])

  // We'll use useOrderStats ONLY for "all time" or general snapshot.
  // For period-scoped revenue / order counts, run our own parallel queries.
  const { stats: allTimeStats, loading: statsLoading } = useOrderStats(
    storeFilter,
    orderStatsDateFilter,
  )

  /* -------------- Period-scoped real count / sum queries -------------- */
  const [periodTotalOrders, setPeriodTotalOrders] = useState<number>(0)
  const [periodTotalRevenueCents, setPeriodTotalRevenueCents] = useState<number>(0)
  const [periodCountsLoading, setPeriodCountsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function run() {
      setPeriodCountsLoading(true)
      const startIso = periodStartIso(period)

      // count: exact, head: true — real count, no .length
      let countQ = supabase
        .from("faire_orders")
        .select("*", { count: "exact", head: true })
      if (storeFilter) countQ = countQ.eq("store_id", storeFilter)
      if (startIso) countQ = countQ.gte("faire_created_at", startIso)

      // Revenue sum — Supabase has no native SUM w/o RPC, so fetch total_cents
      let revQ = supabase
        .from("faire_orders")
        .select("total_cents")
        .range(0, 50000)
      if (storeFilter) revQ = revQ.eq("store_id", storeFilter)
      if (startIso) revQ = revQ.gte("faire_created_at", startIso)

      const [{ count }, { data: revData }] = await Promise.all([countQ, revQ])
      if (cancelled) return
      setPeriodTotalOrders(count ?? 0)
      const sumCents = (revData ?? []).reduce(
        (s: number, r: { total_cents: number | null }) => s + (r.total_cents ?? 0),
        0,
      )
      setPeriodTotalRevenueCents(sumCents)
      setPeriodCountsLoading(false)
    }
    run()
    return () => {
      cancelled = true
    }
  }, [period, storeFilter])

  /* -------------- Top stores by revenue (period-scoped) -------------- */
  const [topStores, setTopStores] = useState<StoreRevenueRow[]>([])
  const [topStoresLoading, setTopStoresLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function run() {
      setTopStoresLoading(true)
      if (stores.length === 0) {
        setTopStores([])
        setTopStoresLoading(false)
        return
      }
      const startIso = periodStartIso(period)
      const scopedStores =
        activeBrand === "all" ? stores : stores.filter((s) => s.id === activeBrand)

      const rows = await Promise.all(
        scopedStores.map(async (store) => {
          // Real count per store
          let cq = supabase
            .from("faire_orders")
            .select("*", { count: "exact", head: true })
            .eq("store_id", store.id)
          if (startIso) cq = cq.gte("faire_created_at", startIso)

          // Revenue per store
          let rq = supabase
            .from("faire_orders")
            .select("total_cents")
            .eq("store_id", store.id)
            .range(0, 20000)
          if (startIso) rq = rq.gte("faire_created_at", startIso)

          const [{ count }, { data }] = await Promise.all([cq, rq])
          const revenueCents = (data ?? []).reduce(
            (s: number, r: { total_cents: number | null }) => s + (r.total_cents ?? 0),
            0,
          )
          return {
            id: store.id,
            name: store.name,
            color: store.color,
            revenueCents,
            orderCount: count ?? 0,
          }
        }),
      )

      if (cancelled) return
      rows.sort((a, b) => b.revenueCents - a.revenueCents)
      setTopStores(rows.slice(0, 5))
      setTopStoresLoading(false)
    }
    run()
    return () => {
      cancelled = true
    }
  }, [stores, activeBrand, period])

  /* -------------- Orders pool for bestsellers / categories / states -------------- */
  const [recentOrders, setRecentOrders] = useState<OrderRowLite[]>([])
  const [recentOrdersLoading, setRecentOrdersLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function run() {
      setRecentOrdersLoading(true)
      const startIso = periodStartIso(period)

      let q = supabase
        .from("faire_orders")
        .select("store_id, total_cents, faire_created_at, shipping_address, raw_data")
        .order("faire_created_at", { ascending: false })
        .limit(500)
      if (storeFilter) q = q.eq("store_id", storeFilter)
      if (startIso) q = q.gte("faire_created_at", startIso)

      const { data } = await q
      if (cancelled) return
      setRecentOrders((data ?? []) as OrderRowLite[])
      setRecentOrdersLoading(false)
    }
    run()
    return () => {
      cancelled = true
    }
  }, [period, storeFilter])

  /* -------------- Daily revenue (last 30 days, always) -------------- */
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenuePoint[]>([])
  const [dailyRevenueLoading, setDailyRevenueLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function run() {
      setDailyRevenueLoading(true)
      const since = new Date()
      since.setDate(since.getDate() - 30)
      const sinceIso = since.toISOString()

      let q = supabase
        .from("faire_orders")
        .select("total_cents, faire_created_at")
        .gte("faire_created_at", sinceIso)
        .order("faire_created_at", { ascending: true })
        .range(0, 20000)
      if (storeFilter) q = q.eq("store_id", storeFilter)

      const { data } = await q
      if (cancelled) return

      // Build 30 buckets, one per day
      const buckets: DailyRevenuePoint[] = []
      for (let i = 29; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const key = d.toISOString().slice(0, 10)
        buckets.push({ date: key, revenueCents: 0 })
      }
      const index = new Map(buckets.map((b, i) => [b.date, i]))

      for (const row of (data ?? []) as Array<{
        total_cents: number | null
        faire_created_at: string | null
      }>) {
        if (!row.faire_created_at) continue
        const key = row.faire_created_at.slice(0, 10)
        const idx = index.get(key)
        if (idx === undefined) continue
        buckets[idx].revenueCents += row.total_cents ?? 0
      }

      setDailyRevenue(buckets)
      setDailyRevenueLoading(false)
    }
    run()
    return () => {
      cancelled = true
    }
  }, [storeFilter])

  /* -------------- Bestsellers (from recentOrders.raw_data.items) -------------- */
  const bestsellers: BestsellerRow[] = useMemo(() => {
    const map = new Map<string, BestsellerRow>()
    for (const order of recentOrders) {
      const raw = order.raw_data as Record<string, unknown> | null
      const items = (raw?.items as OrderItem[] | undefined) ?? []
      for (const item of items) {
        const pid = item.product_id
        if (!pid) continue
        const existing = map.get(pid) ?? {
          productId: pid,
          name: item.product_name ?? "Unknown product",
          orders: 0,
          revenueCents: 0,
        }
        existing.orders += 1
        existing.revenueCents += (item.price_cents ?? 0) * (item.quantity ?? 1)
        if (!existing.name || existing.name === "Unknown product") {
          existing.name = item.product_name ?? existing.name
        }
        map.set(pid, existing)
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 5)
  }, [recentOrders])

  /* -------------- Bestsellers fallback: top products by faire_updated_at -------------- */
  const [fallbackProducts, setFallbackProducts] = useState<BestsellerRow[]>([])

  useEffect(() => {
    // Only load fallback if we have zero aggregated bestsellers after orders loaded
    if (recentOrdersLoading) return
    if (bestsellers.length > 0) {
      setFallbackProducts([])
      return
    }
    let cancelled = false
    async function run() {
      let q = supabase
        .from("faire_products")
        .select("faire_product_id, name, wholesale_price_cents")
        .order("faire_updated_at", { ascending: false })
        .limit(5)
      if (storeFilter) q = q.eq("store_id", storeFilter)
      const { data } = await q
      if (cancelled) return
      setFallbackProducts(
        (data ?? []).map(
          (p: {
            faire_product_id: string
            name: string
            wholesale_price_cents: number | null
          }) => ({
            productId: p.faire_product_id,
            name: p.name,
            orders: 0,
            revenueCents: p.wholesale_price_cents ?? 0,
          }),
        ),
      )
    }
    run()
    return () => {
      cancelled = true
    }
  }, [bestsellers.length, recentOrdersLoading, storeFilter])

  const displayBestsellers =
    bestsellers.length > 0 ? bestsellers : fallbackProducts

  /* -------------- Top categories (from product catalog, weighted by order count) -------------- */
  const [topCategories, setTopCategories] = useState<CategoryRow[]>([])
  const [topCategoriesLoading, setTopCategoriesLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function run() {
      setTopCategoriesLoading(true)
      let q = supabase
        .from("faire_products")
        .select("faire_product_id, category")
        .range(0, 2000)
      if (storeFilter) q = q.eq("store_id", storeFilter)
      const { data } = await q
      if (cancelled) return

      // Build product -> category index
      const prodCat = new Map<string, string>()
      for (const row of (data ?? []) as Array<{
        faire_product_id: string
        category: string | null
      }>) {
        let cat = "Uncategorized"
        if (row.category) {
          try {
            const parsed = JSON.parse(row.category)
            if (typeof parsed === "string") cat = parsed
            else if (parsed && typeof parsed === "object" && "name" in parsed) {
              cat = String((parsed as { name: unknown }).name ?? "Uncategorized")
            } else if (Array.isArray(parsed) && parsed.length > 0) {
              const last = parsed[parsed.length - 1]
              cat =
                typeof last === "string"
                  ? last
                  : String((last as { name?: unknown })?.name ?? "Uncategorized")
            }
          } catch {
            cat = row.category
          }
        }
        prodCat.set(row.faire_product_id, cat)
      }

      // Aggregate orders by category using recentOrders
      const catOrders = new Map<string, number>()
      for (const order of recentOrders) {
        const raw = order.raw_data as Record<string, unknown> | null
        const items = (raw?.items as OrderItem[] | undefined) ?? []
        for (const item of items) {
          const pid = item.product_id
          if (!pid) continue
          const cat = prodCat.get(pid) ?? "Uncategorized"
          catOrders.set(cat, (catOrders.get(cat) ?? 0) + 1)
        }
      }

      const rows: CategoryRow[] = Array.from(catOrders.entries())
        .map(([name, orders]) => ({ name, orders }))
        .sort((a, b) => b.orders - a.orders)
        .slice(0, 5)

      setTopCategories(rows)
      setTopCategoriesLoading(false)
    }
    run()
    return () => {
      cancelled = true
    }
  }, [recentOrders, storeFilter])

  /* -------------- Top states (aggregated client-side from recentOrders) -------------- */
  const topStates: StateRow[] = useMemo(() => {
    const map = new Map<string, StateRow>()
    for (const order of recentOrders) {
      const addr = order.shipping_address as Record<string, unknown> | null
      if (!addr) continue
      const country =
        (addr.country as string | undefined) ?? "US"
      const isUS = country === "US" || country === "United States" || country === "USA"
      if (!isUS) continue
      const state =
        (addr.state as string | undefined) ??
        (addr.state_code as string | undefined) ??
        "Unknown"
      const existing = map.get(state) ?? { state, revenueCents: 0, orders: 0 }
      existing.revenueCents += order.total_cents ?? 0
      existing.orders += 1
      map.set(state, existing)
    }
    return Array.from(map.values())
      .sort((a, b) => b.revenueCents - a.revenueCents)
      .slice(0, 5)
  }, [recentOrders])

  /* -------------- Derived stat card values -------------- */
  const activeBrandStores =
    activeBrand === "all" ? stores : stores.filter((s) => s.id === activeBrand)
  const activeStoresCount = activeBrandStores.length
  const totalRevenueCents =
    period === "all" ? allTimeStats.totalRevenueCents : periodTotalRevenueCents
  const totalOrders = period === "all" ? allTimeStats.total : periodTotalOrders
  const avgOrderValueCents =
    totalOrders > 0 ? Math.round(totalRevenueCents / totalOrders) : 0

  const loading =
    storesLoading ||
    statsLoading ||
    periodCountsLoading ||
    topStoresLoading ||
    recentOrdersLoading ||
    dailyRevenueLoading ||
    topCategoriesLoading

  /* -------------- Skeleton loading -------------- */
  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-8 w-72" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[110px] rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-[260px] rounded-lg" />
          <Skeleton className="h-[260px] rounded-lg" />
        </div>
        <Skeleton className="h-[260px] rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-[260px] rounded-lg" />
          <Skeleton className="h-[260px] rounded-lg" />
        </div>
      </div>
    )
  }

  /* -------------- Render -------------- */
  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* ---- Header ---- */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Analytics</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Cross-store performance overview
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border/80 bg-card shadow-sm p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                period === p.key
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ---- Stat cards row ---- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold font-heading mt-2">
              {formatCurrencyExact(totalRevenueCents)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {PERIODS.find((p) => p.key === period)?.label}
            </p>
          </div>
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "rgba(34,90,234,0.1)" }}
          >
            <DollarSign className="h-4 w-4" style={{ color: "#225aea" }} />
          </div>
        </div>

        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total Orders</p>
            <p className="text-2xl font-bold font-heading mt-2">
              {totalOrders.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {PERIODS.find((p) => p.key === period)?.label}
            </p>
          </div>
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "rgba(16,185,129,0.1)" }}
          >
            <ShoppingCart className="h-4 w-4" style={{ color: "#10b981" }} />
          </div>
        </div>

        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Active Stores</p>
            <p className="text-2xl font-bold font-heading mt-2">{activeStoresCount}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {activeBrand === "all" ? "All brands" : "Filtered"}
            </p>
          </div>
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "rgba(139,92,246,0.1)" }}
          >
            <StoreIcon className="h-4 w-4" style={{ color: "#8b5cf6" }} />
          </div>
        </div>

        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Avg Order Value</p>
            <p className="text-2xl font-bold font-heading mt-2">
              {formatCurrencyExact(avgOrderValueCents)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Per order</p>
          </div>
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "rgba(245,158,11,0.1)" }}
          >
            <TrendingUp className="h-4 w-4" style={{ color: "#f59e0b" }} />
          </div>
        </div>
      </div>

      {/* ---- Two column: Top stores | Bestsellers ---- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top stores */}
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b">
            <h2 className="text-sm font-semibold">Top stores by revenue</h2>
          </div>
          <div className="divide-y">
            {topStores.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                No store revenue data yet.
              </div>
            ) : (
              topStores.map((store) => (
                <div
                  key={store.id}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: store.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{store.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {store.orderCount.toLocaleString()} orders
                    </p>
                  </div>
                  <span className="text-sm font-medium tabular-nums shrink-0">
                    {formatCurrency(store.revenueCents)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bestsellers */}
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b flex items-center justify-between">
            <h2 className="text-sm font-semibold">Bestsellers</h2>
            {bestsellers.length === 0 && fallbackProducts.length > 0 && (
              <span className="text-xs text-muted-foreground">Recently updated</span>
            )}
          </div>
          <div className="divide-y">
            {displayBestsellers.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                No product sales data yet.
              </div>
            ) : (
              displayBestsellers.map((prod, i) => (
                <div
                  key={prod.productId}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors"
                >
                  <span className="h-6 w-6 rounded-md bg-muted/60 flex items-center justify-center text-xs font-semibold shrink-0 tabular-nums">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{prod.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {prod.orders > 0
                        ? `${prod.orders} orders`
                        : "Recently updated"}
                    </p>
                  </div>
                  <span className="text-sm font-medium tabular-nums shrink-0">
                    {formatCurrency(prod.revenueCents)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ---- Daily revenue chart ---- */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b">
          <h2 className="text-sm font-semibold">Daily revenue (last 30 days)</h2>
        </div>
        <div className="p-5">
          <DailyRevenueChart points={dailyRevenue} />
        </div>
      </div>

      {/* ---- Two column: Top categories | Top states ---- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top categories */}
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b">
            <h2 className="text-sm font-semibold">Top categories</h2>
          </div>
          <div className="divide-y">
            {topCategories.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                No category data yet.
              </div>
            ) : (
              topCategories.map((cat, i) => {
                const maxOrders = topCategories[0]?.orders || 1
                const pct = (cat.orders / maxOrders) * 100
                return (
                  <div
                    key={cat.name}
                    className="px-5 py-3.5 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-6 w-6 rounded-md bg-muted/60 flex items-center justify-center text-xs font-semibold shrink-0 tabular-nums">
                          {i + 1}
                        </span>
                        <p className="text-sm font-medium truncate">{cat.name}</p>
                      </div>
                      <span className="text-sm font-medium tabular-nums shrink-0">
                        {cat.orders} orders
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted/40 rounded overflow-hidden ml-8">
                      <div
                        className="h-full rounded bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Top states */}
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b">
            <h2 className="text-sm font-semibold">Top states</h2>
          </div>
          <div className="divide-y">
            {topStates.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                No shipping data yet.
              </div>
            ) : (
              topStates.map((st, i) => (
                <div
                  key={st.state}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors"
                >
                  <span className="h-6 w-6 rounded-md bg-muted/60 flex items-center justify-center text-xs font-semibold shrink-0 tabular-nums">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{st.state}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {st.orders} orders
                    </p>
                  </div>
                  <span className="text-sm font-medium tabular-nums shrink-0">
                    {formatCurrency(st.revenueCents)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ---- Footer drill-down links ---- */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm px-5 py-4">
        <p className="text-xs text-muted-foreground mb-2">View detailed analytics</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link
            href="/analytics/revenue"
            className="inline-flex items-center gap-1 text-primary font-medium hover:underline"
          >
            Revenue <ArrowRight className="h-3 w-3" />
          </Link>
          <Link
            href="/analytics/stores"
            className="inline-flex items-center gap-1 text-primary font-medium hover:underline"
          >
            Stores <ArrowRight className="h-3 w-3" />
          </Link>
          <Link
            href="/analytics/products"
            className="inline-flex items-center gap-1 text-primary font-medium hover:underline"
          >
            Products <ArrowRight className="h-3 w-3" />
          </Link>
          <Link
            href="/analytics/geography"
            className="inline-flex items-center gap-1 text-primary font-medium hover:underline"
          >
            Geography <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}
