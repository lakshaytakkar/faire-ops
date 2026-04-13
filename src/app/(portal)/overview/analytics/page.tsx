"use client"

import { useState, useEffect, useMemo, Fragment } from "react"
import Link from "next/link"
import {
  DollarSign,
  ShoppingCart,
  Store as StoreIcon,
  TrendingUp,
  ArrowRight,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { useBrandFilter } from "@/lib/brand-filter-context"
import { useOrderStats } from "@/lib/use-faire-data"
import { supabaseB2B } from "@/lib/supabase"
import { ComposableMap, Geographies, Geography } from "react-simple-maps"

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"

const LINE_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
]

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
  logoUrl: string | null
  revenueCents: number
  orderCount: number
}

interface BestsellerRow {
  productId: string
  name: string
  orders: number
  revenueCents: number
  imageUrl?: string | null
}

interface CategoryRow {
  name: string
  orders: number
}

interface StateRowTop {
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

interface ViewRow {
  store_id: string
  view_date: string
  view_count: number
}

interface CityAgg {
  orders: number
  revenue: number
}

interface StateAgg {
  orders: number
  revenue: number
  cities: Record<string, CityAgg>
}

type StateSortField =
  | "rank"
  | "state"
  | "orders"
  | "revenue"
  | "cities"
  | "avgOrder"
  | "share"
type SortDirection = "asc" | "desc"

type StoreTableSortField =
  | "name"
  | "orders"
  | "products"
  | "aov"
  | "orderShare"
  | "lastSynced"

interface DailyStorePoint {
  date: string
  label: string
  values: Record<string, number>
  total: number
}

interface MonthlyRow {
  month: string
  value: number
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

function formatCurrencyFull(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatCurrencyCompact(cents: number): string {
  const dollars = cents / 100
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(1)}K`
  return `$${dollars.toFixed(0)}`
}

function periodStartIso(period: PeriodKey): string | null {
  const opt = PERIODS.find((p) => p.key === period)
  if (!opt || opt.days === null) return null
  const d = new Date()
  d.setDate(d.getDate() - opt.days)
  return d.toISOString()
}

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

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

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never"
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function syncStatus(lastSynced: string | null): "synced" | "stale" | "never" {
  if (!lastSynced) return "never"
  const diff = Date.now() - new Date(lastSynced).getTime()
  const hours = diff / (1000 * 60 * 60)
  return hours < 24 ? "synced" : "stale"
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />
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
    if (period === "7d") return "Today"
    if (period === "30d") return "This Month"
    if (period === "90d") return "3 Months"
    return "All Time"
  }, [period])

  const { stats: allTimeStats, loading: statsLoading } = useOrderStats(
    storeFilter,
    orderStatsDateFilter,
  )

  /* -------------- Period-scoped real count / sum queries --------------
   * Powers the "Total Revenue" and "Total Orders" KPI cards at the top of
   * the page. Old path fetched up to 50 000 rows of total_cents and summed
   * in JS — PostgREST's default max-rows (1 000) silently capped it, so
   * both KPIs under-reported for any period that contained >1 000 orders.
   *
   * Fix: reuse the b2b.faire_store_revenue(p_start) RPC — it aggregates
   * revenue_cents and order_count server-side per store in one round-trip.
   * Sum across stores (or scope to a single store) to produce both KPIs.
   * This is strictly more correct than the client reduce and also faster
   * (returns ~17 rows instead of 10k+).
   */
  const [periodTotalOrders, setPeriodTotalOrders] = useState<number>(0)
  const [periodTotalRevenueCents, setPeriodTotalRevenueCents] = useState<number>(0)
  const [periodCountsLoading, setPeriodCountsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function run() {
      setPeriodCountsLoading(true)
      const startIso = periodStartIso(period)

      const { data, error } = await supabaseB2B.rpc("faire_store_revenue", {
        p_start: startIso,
      })
      if (cancelled) return

      if (error) {
        console.error("faire_store_revenue RPC error (period totals):", error)
        setPeriodTotalOrders(0)
        setPeriodTotalRevenueCents(0)
        setPeriodCountsLoading(false)
        return
      }

      const rows = ((data ?? []) as Array<{
        store_id: string
        order_count: number
        revenue_cents: number | string
      }>).filter((r) => !storeFilter || r.store_id === storeFilter)

      const totalOrders = rows.reduce((s, r) => s + (r.order_count ?? 0), 0)
      const totalRevenue = rows.reduce(
        (s, r) => s + Number(r.revenue_cents ?? 0),
        0,
      )

      setPeriodTotalOrders(totalOrders)
      setPeriodTotalRevenueCents(totalRevenue)
      setPeriodCountsLoading(false)
    }
    run()
    return () => {
      cancelled = true
    }
  }, [period, storeFilter])

  /* -------------- Top stores by revenue (period-scoped) --------------
   * Uses the b2b.faire_store_revenue(p_start) RPC to aggregate revenue and
   * order count per store server-side in one query. The old path ran an N+1
   * Promise.all (two queries per store) and was capped by PostgREST's
   * default max-rows on the .range(0, 20000) call, silently under-reporting
   * revenue for high-volume stores.
   */
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

      const { data, error } = await supabaseB2B.rpc("faire_store_revenue", {
        p_start: startIso,
      })

      if (cancelled) return

      if (error) {
        console.error("faire_store_revenue RPC error:", error)
        setTopStores([])
        setTopStoresLoading(false)
        return
      }

      const byStoreId = new Map<
        string,
        { orderCount: number; revenueCents: number }
      >()
      for (const row of (data ?? []) as Array<{
        store_id: string
        order_count: number
        revenue_cents: number | string
      }>) {
        byStoreId.set(row.store_id, {
          orderCount: row.order_count ?? 0,
          revenueCents: Number(row.revenue_cents ?? 0),
        })
      }

      const scopedStores =
        activeBrand === "all" ? stores : stores.filter((s) => s.id === activeBrand)

      const rows: StoreRevenueRow[] = scopedStores.map((store) => {
        const agg = byStoreId.get(store.id) ?? { orderCount: 0, revenueCents: 0 }
        return {
          id: store.id,
          name: store.name,
          color: store.color,
          logoUrl: (store as { logo_url?: string | null }).logo_url ?? null,
          revenueCents: agg.revenueCents,
          orderCount: agg.orderCount,
        }
      })

      rows.sort((a, b) => b.revenueCents - a.revenueCents)
      setTopStores(rows.slice(0, 5))
      setTopStoresLoading(false)
    }
    run()
    return () => {
      cancelled = true
    }
  }, [stores, activeBrand, period])

  /* -------------- Orders pool for bestsellers / categories / states / map -------------- */
  const [recentOrders, setRecentOrders] = useState<OrderRowLite[]>([])
  const [recentOrdersLoading, setRecentOrdersLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function run() {
      setRecentOrdersLoading(true)
      const startIso = periodStartIso(period)

      // The categories and states widgets derive from this pool; the old 500
      // cap silently excluded every low-volume store's history when the user
      // hadn't filtered to a specific brand. Bumping to 10 000 via .range()
      // bypasses PostgREST's default 1 000 max-rows. Current order table is
      // ~1.8k rows so there's plenty of headroom; if it grows past 10k we
      // should move these two widgets to their own SQL RPCs like bestsellers.
      let q = supabaseB2B
        .from("faire_orders")
        .select("store_id, total_cents, faire_created_at, shipping_address, raw_data")
        .order("faire_created_at", { ascending: false })
        .range(0, 9999)
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

  /* -------------- Orders for daily/monthly charts (last 6 months) -------------- */
  const [chartOrders, setChartOrders] = useState<OrderRowLite[]>([])
  const [chartOrdersLoading, setChartOrdersLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function run() {
      setChartOrdersLoading(true)
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

      let q = supabaseB2B
        .from("faire_orders")
        .select("store_id, total_cents, faire_created_at, shipping_address, raw_data")
        .gte("faire_created_at", sixMonthsAgo.toISOString())
        .order("faire_created_at", { ascending: false })
        .limit(2000)
      if (storeFilter) q = q.eq("store_id", storeFilter)

      const { data } = await q
      if (cancelled) return
      setChartOrders((data ?? []) as OrderRowLite[])
      setChartOrdersLoading(false)
    }
    run()
    return () => {
      cancelled = true
    }
  }, [storeFilter])

  /* -------------- Daily store views -------------- */
  const [views, setViews] = useState<ViewRow[]>([])
  const [viewsLoading, setViewsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function run() {
      setViewsLoading(true)
      const daysBack = period === "7d" ? 7 : period === "90d" ? 90 : 30
      const since = new Date()
      since.setDate(since.getDate() - daysBack)

      let query = supabaseB2B
        .from("store_daily_views")
        .select("store_id, view_date, view_count")
        .gte("view_date", since.toISOString().slice(0, 10))
        .order("view_date", { ascending: true })
      if (storeFilter) query = query.eq("store_id", storeFilter)

      const { data } = await query
      if (cancelled) return
      setViews((data ?? []) as ViewRow[])
      setViewsLoading(false)
    }
    run()
    return () => {
      cancelled = true
    }
  }, [period, storeFilter])

  /* -------------- Bestsellers (server-aggregated) --------------
   * Uses the b2b.faire_bestsellers(p_store_id, p_start, p_limit) RPC which
   * unnests raw_data.items server-side, groups by product_id, orders by
   * count desc, and joins faire_products.primary_image_url — all in one
   * round-trip. The old path "fetch 500 orders then reduce client-side"
   * silently dropped any product whose orders fell outside the 500 most
   * recent globally (visible as the BuddhaAyurveda "Birds Branch Desk
   * Ornament" bug — filtered=visible, unfiltered=missing).
   */
  const [bestsellers, setBestsellers] = useState<BestsellerRow[]>([])
  const [bestsellersLoading, setBestsellersLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function run() {
      setBestsellersLoading(true)
      const startIso = periodStartIso(period)
      const { data, error } = await supabaseB2B.rpc("faire_bestsellers", {
        p_store_id: storeFilter ?? null,
        p_start: startIso,
        p_limit: 5,
      })
      if (cancelled) return
      if (error) {
        console.error("faire_bestsellers RPC error:", error)
        setBestsellers([])
        setBestsellersLoading(false)
        return
      }
      setBestsellers(
        ((data ?? []) as Array<{
          product_id: string
          product_name: string | null
          order_count: number
          revenue_cents: number | string
          primary_image_url: string | null
        }>).map((r) => ({
          productId: r.product_id,
          name: r.product_name ?? "Unknown product",
          orders: r.order_count ?? 0,
          revenueCents: Number(r.revenue_cents ?? 0),
          imageUrl: r.primary_image_url,
        })),
      )
      setBestsellersLoading(false)
    }
    run()
    return () => {
      cancelled = true
    }
  }, [period, storeFilter])

  /* -------------- Bestsellers fallback (no orders at all) --------------
   * The RPC returns empty only when no orders match the current filters
   * (new stores, very-recent periods). Fall back to the most-recently-
   * updated products so the card never shows an empty state.
   */
  const [fallbackProducts, setFallbackProducts] = useState<BestsellerRow[]>([])

  useEffect(() => {
    if (bestsellersLoading) return
    if (bestsellers.length > 0) {
      setFallbackProducts([])
      return
    }
    let cancelled = false
    async function run() {
      let q = supabaseB2B
        .from("faire_products")
        .select("faire_product_id, name, wholesale_price_cents, primary_image_url")
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
            primary_image_url: string | null
          }) => ({
            productId: p.faire_product_id,
            name: p.name,
            orders: 0,
            revenueCents: p.wholesale_price_cents ?? 0,
            imageUrl: p.primary_image_url,
          }),
        ),
      )
    }
    run()
    return () => {
      cancelled = true
    }
  }, [bestsellers.length, bestsellersLoading, storeFilter])

  const displayBestsellers =
    bestsellers.length > 0 ? bestsellers : fallbackProducts

  /* -------------- Top categories -------------- */
  const [topCategories, setTopCategories] = useState<CategoryRow[]>([])
  const [topCategoriesLoading, setTopCategoriesLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function run() {
      setTopCategoriesLoading(true)
      let q = supabaseB2B
        .from("faire_products")
        .select("faire_product_id, category")
        .range(0, 2000)
      if (storeFilter) q = q.eq("store_id", storeFilter)
      const { data } = await q
      if (cancelled) return

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

  /* -------------- Top states text list -------------- */
  const topStatesList: StateRowTop[] = useMemo(() => {
    const map = new Map<string, StateRowTop>()
    for (const order of recentOrders) {
      const addr = order.shipping_address as Record<string, unknown> | null
      if (!addr) continue
      const country = (addr.country as string | undefined) ?? "US"
      const isUS =
        country === "US" || country === "United States" || country === "USA"
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

  /* -------------- US Map: State aggregation from recentOrders -------------- */
  const stateData: Record<string, StateAgg> = useMemo(() => {
    const sd: Record<string, StateAgg> = {}
    for (const order of recentOrders) {
      const addr = order.shipping_address as Record<string, unknown> | null
      if (!addr) continue
      const country = (addr.country as string) || "US"
      const stateName =
        (addr.state as string) || (addr.state_code as string) || "Unknown"
      const city = (addr.city as string) || "Unknown"
      const isUS =
        country === "US" || country === "United States" || country === "USA"
      if (!isUS) continue
      if (!sd[stateName]) sd[stateName] = { orders: 0, revenue: 0, cities: {} }
      sd[stateName].orders++
      sd[stateName].revenue += order.total_cents ?? 0
      if (!sd[stateName].cities[city]) {
        sd[stateName].cities[city] = { orders: 0, revenue: 0 }
      }
      sd[stateName].cities[city].orders++
      sd[stateName].cities[city].revenue += order.total_cents ?? 0
    }
    return sd
  }, [recentOrders])

  const mapMaxOrders = useMemo(() => {
    let m = 0
    for (const s of Object.values(stateData)) {
      if (s.orders > m) m = s.orders
    }
    return m || 1
  }, [stateData])

  const domesticRevenue = useMemo(
    () => Object.values(stateData).reduce((s, d) => s + d.revenue, 0),
    [stateData],
  )

  const [stateSort, setStateSort] = useState<StateSortField>("orders")
  const [stateSortDir, setStateSortDir] = useState<SortDirection>("desc")
  const [expandedState, setExpandedState] = useState<string | null>(null)

  function handleStateSort(field: StateSortField) {
    if (stateSort === field) {
      setStateSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setStateSort(field)
      setStateSortDir("desc")
    }
  }

  const stateRankings = useMemo(() => {
    const entries = Object.entries(stateData).map(([name, d]) => ({
      name,
      orders: d.orders,
      revenue: d.revenue,
      cities: Object.keys(d.cities).length,
      avgOrder: d.orders > 0 ? d.revenue / d.orders : 0,
      share: domesticRevenue > 0 ? (d.revenue / domesticRevenue) * 100 : 0,
    }))

    entries.sort((a, b) => b.orders - a.orders)
    const ranked = entries.slice(0, 10).map((e, i) => ({ ...e, rank: i + 1 }))

    const dir = stateSortDir === "asc" ? 1 : -1
    ranked.sort((a, b) => {
      switch (stateSort) {
        case "rank":
          return dir * (a.rank - b.rank)
        case "state":
          return dir * a.name.localeCompare(b.name)
        case "orders":
          return dir * (a.orders - b.orders)
        case "revenue":
          return dir * (a.revenue - b.revenue)
        case "cities":
          return dir * (a.cities - b.cities)
        case "avgOrder":
          return dir * (a.avgOrder - b.avgOrder)
        case "share":
          return dir * (a.share - b.share)
        default:
          return 0
      }
    })

    return ranked
  }, [stateData, stateSort, stateSortDir, domesticRevenue])

  function getTopCitiesForState(stateName: string) {
    const cities = stateData[stateName]?.cities ?? {}
    return Object.entries(cities)
      .map(([name, d]) => ({ name, orders: d.orders, revenue: d.revenue }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 5)
  }

  /* -------------- Storewise comparison table -------------- */
  const filteredStores = useMemo(
    () =>
      activeBrand === "all" ? stores : stores.filter((s) => s.id === activeBrand),
    [activeBrand, stores],
  )

  const storeAggregates = useMemo(() => {
    const map: Record<string, { revenue: number; orders: number }> = {}
    for (const order of chartOrders) {
      if (!map[order.store_id]) map[order.store_id] = { revenue: 0, orders: 0 }
      map[order.store_id].revenue += order.total_cents ?? 0
      map[order.store_id].orders += 1
    }
    return map
  }, [chartOrders])

  const [storeTableSort, setStoreTableSort] =
    useState<StoreTableSortField>("orders")
  const [storeTableSortDir, setStoreTableSortDir] =
    useState<SortDirection>("desc")

  function handleStoreTableSort(field: StoreTableSortField) {
    if (storeTableSort === field) {
      setStoreTableSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setStoreTableSort(field)
      setStoreTableSortDir("desc")
    }
  }

  const storeTableRows = useMemo(() => {
    const totalOrdersAll = filteredStores.reduce(
      (s, b) => s + b.total_orders,
      0,
    )
    const rows = filteredStores.map((store) => {
      const agg = storeAggregates[store.id] ?? { revenue: 0, orders: 0 }
      const aovCents = agg.orders > 0 ? Math.round(agg.revenue / agg.orders) : 0
      const orderShare =
        totalOrdersAll > 0 ? (store.total_orders / totalOrdersAll) * 100 : 0
      return {
        id: store.id,
        name: store.name,
        short: store.short,
        color: store.color,
        logoUrl: (store as { logo_url?: string | null }).logo_url ?? null,
        category: store.category,
        orders: store.total_orders,
        products: store.total_products,
        aovCents,
        orderShare,
        last_synced_at: store.last_synced_at,
      }
    })

    const dir = storeTableSortDir === "asc" ? 1 : -1
    rows.sort((a, b) => {
      switch (storeTableSort) {
        case "name":
          return dir * a.name.localeCompare(b.name)
        case "orders":
          return dir * (a.orders - b.orders)
        case "products":
          return dir * (a.products - b.products)
        case "aov":
          return dir * (a.aovCents - b.aovCents)
        case "orderShare":
          return dir * (a.orderShare - b.orderShare)
        case "lastSynced":
          return (
            dir *
            (new Date(a.last_synced_at ?? 0).getTime() -
              new Date(b.last_synced_at ?? 0).getTime())
          )
        default:
          return 0
      }
    })
    return rows
  }, [filteredStores, storeAggregates, storeTableSort, storeTableSortDir])

  /* -------------- Daily sales multi-store comparison -------------- */
  const dailySalesByStore: DailyStorePoint[] = useMemo(() => {
    const days = period === "7d" ? 7 : period === "90d" ? 90 : 30
    const now = new Date()
    const dayMap: Record<string, Record<string, number>> = {}

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      dayMap[toLocalDateStr(d)] = {}
    }

    for (const order of chartOrders) {
      if (!order.faire_created_at) continue
      const key = toLocalDateStr(new Date(order.faire_created_at))
      if (key in dayMap) {
        dayMap[key][order.store_id] =
          (dayMap[key][order.store_id] ?? 0) + (order.total_cents ?? 0)
      }
    }

    return Object.entries(dayMap).map(([date, values]) => {
      const d = new Date(date + "T00:00:00")
      return {
        date,
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        values,
        total: Object.values(values).reduce((s, v) => s + v, 0),
      }
    })
  }, [chartOrders, period])

  const dailySalesMax = useMemo(() => {
    let m = 1
    for (const row of dailySalesByStore) {
      if (row.total > m) m = row.total
    }
    return m
  }, [dailySalesByStore])

  const dailySalesTotal = useMemo(
    () => dailySalesByStore.reduce((s, d) => s + d.total, 0),
    [dailySalesByStore],
  )

  /* -------------- Daily views multi-store -------------- */
  const viewLines = useMemo(() => {
    const dateMap = new Map<string, Record<string, number>>()
    for (const v of views) {
      const entry = dateMap.get(v.view_date) ?? {}
      entry[v.store_id] = v.view_count
      dateMap.set(v.view_date, entry)
    }
    const dates = [...dateMap.keys()].sort()
    return dates.map((d) => ({ date: d, stores: dateMap.get(d)! }))
  }, [views])

  const viewStores = useMemo(() => {
    if (activeBrand !== "all") return stores.filter((s) => s.id === activeBrand)
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

  /* -------------- Monthly revenue (horizontal bars) -------------- */
  const monthlyRevenue: MonthlyRow[] = useMemo(() => {
    const monthMap: Record<string, number> = {}
    for (const order of chartOrders) {
      if (!order.faire_created_at) continue
      const d = new Date(order.faire_created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      monthMap[key] = (monthMap[key] ?? 0) + (order.total_cents ?? 0)
    }
    const sorted = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
    const shortMonths = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ]
    return sorted.map(([key, value]) => {
      const month = parseInt(key.split("-")[1], 10) - 1
      return { month: shortMonths[month], value }
    })
  }, [chartOrders])

  const maxMonthlyRevenue =
    monthlyRevenue.length > 0 ? Math.max(...monthlyRevenue.map((m) => m.value)) : 1

  const momGrowth = useMemo(() => {
    if (monthlyRevenue.length < 2) return null
    const current = monthlyRevenue[monthlyRevenue.length - 1].value
    const previous = monthlyRevenue[monthlyRevenue.length - 2].value
    if (previous === 0) return null
    return ((current - previous) / previous) * 100
  }, [monthlyRevenue])

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
    chartOrdersLoading ||
    viewsLoading ||
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
        <Skeleton className="h-[320px] rounded-lg" />
        <Skeleton className="h-[320px] rounded-lg" />
        <Skeleton className="h-[260px] rounded-lg" />
        <Skeleton className="h-[500px] rounded-lg" />
      </div>
    )
  }

  /* -------------- SortableHeader helpers -------------- */
  function StateSortHeader({
    field,
    label,
    align = "left",
  }: {
    field: StateSortField
    label: string
    align?: "left" | "right"
  }) {
    return (
      <th
        className={`px-3 py-2 text-[11px] font-medium text-muted-foreground tracking-wide uppercase cursor-pointer select-none hover:text-foreground transition-colors ${align === "right" ? "text-right" : "text-left"}`}
        onClick={() => handleStateSort(field)}
      >
        <span className="inline-flex items-center gap-0.5">
          {label}
          {stateSort === field && <ArrowUpDown className="size-3" />}
        </span>
      </th>
    )
  }

  function StoreSortHeader({
    field,
    label,
    align = "left",
  }: {
    field: StoreTableSortField
    label: string
    align?: "left" | "right"
  }) {
    return (
      <th
        className={`px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase cursor-pointer select-none hover:text-foreground transition-colors ${align === "right" ? "text-right" : "text-left"}`}
        onClick={() => handleStoreTableSort(field)}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          {storeTableSort === field && <ArrowUpDown className="h-3 w-3" />}
        </span>
      </th>
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
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/20 transition-colors"
                >
                  {store.logoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={store.logoUrl}
                      alt=""
                      className="h-8 w-8 rounded-md object-cover shrink-0 ring-1 ring-border/60"
                    />
                  ) : (
                    <span
                      className="h-8 w-8 rounded-md shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ backgroundColor: store.color }}
                    >
                      {store.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
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
              displayBestsellers.map((prod, i) => {
                const img = prod.imageUrl ?? null
                return (
                  <div
                    key={prod.productId}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/20 transition-colors"
                  >
                    <div className="relative shrink-0">
                      {img ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={img}
                          alt=""
                          className="h-10 w-10 rounded-md object-cover ring-1 ring-border/60 bg-muted/40"
                        />
                      ) : (
                        <span className="h-10 w-10 rounded-md bg-muted/60 flex items-center justify-center text-[10px] font-semibold text-muted-foreground">
                          {prod.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      <span className="absolute -top-1 -left-1 h-4 w-4 rounded-full bg-foreground text-background flex items-center justify-center text-[9px] font-bold tabular-nums ring-2 ring-card">
                        {i + 1}
                      </span>
                    </div>
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
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* ========================================================== */}
      {/*  1. STOREWISE COMPARISON TABLE                              */}
      {/* ========================================================== */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Storewise comparison</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              All active stores &middot; orders, products, AOV and sync status
            </p>
          </div>
          <Link
            href="/analytics/stores"
            className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
          >
            Full table <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <StoreSortHeader field="name" label="Store" />
                <StoreSortHeader field="orders" label="Orders" align="right" />
                <StoreSortHeader field="products" label="Products" align="right" />
                <StoreSortHeader field="aov" label="Avg Order Value" align="right" />
                <StoreSortHeader field="orderShare" label="Order Share %" align="right" />
                <StoreSortHeader field="lastSynced" label="Last Synced" />
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {storeTableRows.map((store) => {
                const status = syncStatus(store.last_synced_at)
                return (
                  <tr
                    key={store.id}
                    className="border-b last:border-b-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3.5 text-sm">
                      <div className="flex items-center gap-2.5">
                        {store.logoUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={store.logoUrl}
                            alt=""
                            className="h-7 w-7 rounded-md object-cover shrink-0 ring-1 ring-border/60"
                          />
                        ) : (
                          <span
                            className="h-7 w-7 rounded-md shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
                            style={{ backgroundColor: store.color }}
                          >
                            {store.short?.slice(0, 2).toUpperCase() ??
                              store.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0">
                          <span className="font-medium block truncate">
                            {store.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {store.category}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-right tabular-nums font-medium">
                      {store.orders.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-right tabular-nums">
                      {store.products.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-right tabular-nums">
                      {store.aovCents > 0 ? formatCurrencyFull(store.aovCents) : "--"}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-right tabular-nums">
                      {store.orderShare.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground">
                      {timeAgo(store.last_synced_at)}
                    </td>
                    <td className="px-4 py-3.5 text-sm">
                      {status === "synced" && (
                        <span className="border-0 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                          Synced
                        </span>
                      )}
                      {status === "stale" && (
                        <span className="border-0 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                          Stale
                        </span>
                      )}
                      {status === "never" && (
                        <span className="border-0 text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700">
                          Never
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {storeTableRows.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-sm text-muted-foreground"
                  >
                    No stores found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================== */}
      {/*  2. DAILY SALES COMPARISON (multi-store)                    */}
      {/* ========================================================== */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <div>
            <h2 className="text-sm font-semibold">Daily sales by store</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatCurrencyCompact(dailySalesTotal)} total &middot;{" "}
              {dailySalesByStore.length} days
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 flex-wrap max-w-md">
            {filteredStores.map((s) => (
              <span
                key={s.id}
                className="flex items-center gap-1 text-[10px] text-muted-foreground"
              >
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: s.color }}
                />
                {s.name}
              </span>
            ))}
          </div>
        </div>
        <div className="p-5">
          {dailySalesByStore.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No data</p>
          ) : (
            <>
              <div className="flex gap-2">
                <div className="flex flex-col justify-between h-56 shrink-0 w-14 text-right pr-1">
                  <span className="text-[10px] text-muted-foreground">
                    {formatCurrencyCompact(dailySalesMax)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatCurrencyCompact(dailySalesMax / 2)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">$0</span>
                </div>
                <div className="flex-1 relative">
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    <div className="border-b border-dashed border-muted/50" />
                    <div className="border-b border-dashed border-muted/50" />
                    <div className="border-b border-muted/30" />
                  </div>
                  <div className="flex items-end gap-px h-56 relative z-10">
                    {dailySalesByStore.map((day) => {
                      const totalPct =
                        dailySalesMax > 0 ? (day.total / dailySalesMax) * 100 : 0
                      return (
                        <div
                          key={day.date}
                          className="flex-1 flex flex-col justify-end group relative h-full"
                        >
                          <div
                            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-20 pointer-events-none"
                          >
                            <div className="bg-foreground text-background text-[10px] rounded px-2 py-1 shadow-lg whitespace-nowrap">
                              <p className="font-semibold">{day.label}</p>
                              <p>Total: {formatCurrencyFull(day.total)}</p>
                              {filteredStores
                                .filter((s) => (day.values[s.id] ?? 0) > 0)
                                .map((s) => (
                                  <p
                                    key={s.id}
                                    className="flex items-center gap-1"
                                  >
                                    <span
                                      className="w-2 h-2 rounded-sm"
                                      style={{ backgroundColor: s.color }}
                                    />
                                    {s.name}:{" "}
                                    {formatCurrencyFull(day.values[s.id] ?? 0)}
                                  </p>
                                ))}
                            </div>
                          </div>
                          <div
                            className="w-full flex flex-col-reverse rounded-t-sm overflow-hidden"
                            style={{
                              height: `${Math.max(totalPct, day.total > 0 ? 2 : 0.5)}%`,
                              minHeight: day.total > 0 ? "2px" : "1px",
                            }}
                          >
                            {filteredStores.map((s) => {
                              const v = day.values[s.id] ?? 0
                              if (v === 0) return null
                              const segPct = day.total > 0 ? (v / day.total) * 100 : 0
                              return (
                                <div
                                  key={s.id}
                                  style={{
                                    height: `${segPct}%`,
                                    backgroundColor: s.color,
                                  }}
                                />
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-1">
                <div className="w-14 shrink-0" />
                <div className="flex-1 flex justify-between">
                  {dailySalesByStore
                    .filter(
                      (_, i) =>
                        i === 0 ||
                        i === dailySalesByStore.length - 1 ||
                        (i + 1) % 7 === 0,
                    )
                    .map((day) => (
                      <span
                        key={day.date}
                        className="text-[9px] text-muted-foreground"
                      >
                        {day.label}
                      </span>
                    ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ========================================================== */}
      {/*  3. DAILY VIEWS TREND                                       */}
      {/* ========================================================== */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <div>
            <h2 className="text-sm font-semibold">Daily store views</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeBrand === "all"
                ? "All stores"
                : viewStores[0]?.name ?? "Store"}{" "}
              &middot; {viewLines.length} days tracked
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 flex-wrap max-w-md">
            {viewStores.map((s, i) => (
              <span
                key={s.id}
                className="flex items-center gap-1 text-[10px] text-muted-foreground"
              >
                <span
                  className="w-2.5 h-[3px] rounded-full"
                  style={{
                    backgroundColor:
                      s.color || LINE_COLORS[i % LINE_COLORS.length],
                  }}
                />
                {s.name}
              </span>
            ))}
          </div>
        </div>
        <div className="p-5">
          {viewLines.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No view data available.
            </p>
          ) : (
            <>
              <div className="flex gap-2">
                <div className="flex flex-col justify-between h-64 shrink-0 w-10 text-right pr-1">
                  <span className="text-[10px] text-muted-foreground">
                    {maxViewCount}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {Math.round(maxViewCount / 2)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">0</span>
                </div>
                <div className="flex-1 relative h-64">
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    <div className="border-b border-dashed border-muted/40" />
                    <div className="border-b border-dashed border-muted/40" />
                    <div className="border-b border-muted/30" />
                  </div>
                  <svg
                    viewBox={`0 0 ${Math.max(viewLines.length - 1, 1)} 100`}
                    className="absolute inset-0 w-full h-full"
                    preserveAspectRatio="none"
                  >
                    {viewStores.map((store, si) => {
                      const color =
                        store.color || LINE_COLORS[si % LINE_COLORS.length]
                      const pointsArray: [number, number][] = viewLines.map(
                        (row, i) => {
                          const val = row.stores[store.id] ?? 0
                          const y = 100 - (val / maxViewCount) * 100
                          return [i, y] as [number, number]
                        },
                      )
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
                  <div className="absolute inset-0 flex">
                    {viewLines.map((row) => {
                      const d = new Date(row.date + "T00:00:00")
                      const label = d.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                      return (
                        <div key={row.date} className="flex-1 group relative">
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 hidden group-hover:block z-20">
                            <div className="bg-foreground text-background text-[10px] rounded px-2 py-1.5 shadow-lg whitespace-nowrap">
                              <p className="font-semibold mb-0.5">{label}</p>
                              {viewStores.map((s, si) => (
                                <p
                                  key={s.id}
                                  className="flex items-center gap-1"
                                >
                                  <span
                                    className="w-2 h-[2px] rounded"
                                    style={{
                                      backgroundColor:
                                        s.color ||
                                        LINE_COLORS[si % LINE_COLORS.length],
                                    }}
                                  />
                                  {s.name}: {row.stores[s.id] ?? 0}
                                </p>
                              ))}
                            </div>
                          </div>
                          <div className="w-px h-full mx-auto bg-muted/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-1">
                <div className="w-10 shrink-0" />
                <div className="flex-1 flex justify-between">
                  {viewLines
                    .filter(
                      (_, i) =>
                        i === 0 ||
                        i === viewLines.length - 1 ||
                        (i + 1) % 7 === 0,
                    )
                    .map((row) => {
                      const d = new Date(row.date + "T00:00:00")
                      return (
                        <span
                          key={row.date}
                          className="text-[9px] text-muted-foreground"
                        >
                          {d.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )
                    })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ========================================================== */}
      {/*  4. MONTHLY SALES HORIZONTAL BAR CHART                      */}
      {/* ========================================================== */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <div>
            <h2 className="text-sm font-semibold">Sales by month</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Last {monthlyRevenue.length} months
            </p>
          </div>
          {momGrowth !== null && (
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${momGrowth >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
            >
              {momGrowth >= 0 ? "+" : ""}
              {momGrowth.toFixed(1)}% MoM
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
                  <span className="text-xs font-medium text-muted-foreground w-8 shrink-0">
                    {item.month}
                  </span>
                  <div className="flex-1 h-8 bg-muted/20 rounded overflow-hidden">
                    <div
                      className="h-full rounded bg-emerald-500"
                      style={{
                        width: `${(item.value / maxMonthlyRevenue) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold w-20 text-right shrink-0 tabular-nums">
                    {formatCurrencyCompact(item.value)}
                  </span>
                </div>
              ))}
            </div>
          )}
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

        {/* Top states (text list) */}
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b">
            <h2 className="text-sm font-semibold">Top states</h2>
          </div>
          <div className="divide-y">
            {topStatesList.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                No shipping data yet.
              </div>
            ) : (
              topStatesList.map((st, i) => (
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

      {/* ========================================================== */}
      {/*  5. US MAP (GEOGRAPHY) + state-by-revenue table             */}
      {/* ========================================================== */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">US geography</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Orders by state &middot; click a row to see top cities
            </p>
          </div>
          <Link
            href="/analytics/geography"
            className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
          >
            Full geography <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          {/* Map */}
          <div className="relative h-[500px] border-b lg:border-b-0 lg:border-r border-border/80">
            <ComposableMap projection="geoAlbersUsa" className="w-full h-full">
              <Geographies geography={GEO_URL}>
                {({
                  geographies,
                }: {
                  geographies: Array<{
                    rsmKey: string
                    properties: { name: string }
                  }>
                }) =>
                  geographies.map((geo) => {
                    const stateName = geo.properties.name
                    const data = stateData[stateName]
                    const intensity = data
                      ? Math.min(data.orders / mapMaxOrders, 1)
                      : 0
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        onClick={() =>
                          setExpandedState(
                            expandedState === stateName ? null : stateName,
                          )
                        }
                        style={{
                          default: {
                            fill:
                              intensity > 0
                                ? `hsl(223, 83%, ${80 - intensity * 50}%)`
                                : "#e2e8f0",
                            stroke: "#fff",
                            strokeWidth: 0.5,
                            outline: "none",
                          },
                          hover: {
                            fill: "hsl(223, 83%, 53%)",
                            stroke: "#fff",
                            strokeWidth: 1,
                            outline: "none",
                            cursor: "pointer",
                          },
                          pressed: {
                            fill: "hsl(223, 83%, 40%)",
                            outline: "none",
                          },
                        }}
                      />
                    )
                  })
                }
              </Geographies>
            </ComposableMap>

            {/* Legend */}
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded border bg-card/90 backdrop-blur-sm px-2 py-1 shadow-sm">
              <span className="text-[9px] text-muted-foreground">0</span>
              <div className="flex h-2">
                <div
                  className="w-4 rounded-l"
                  style={{ backgroundColor: "#e2e8f0" }}
                />
                <div
                  className="w-4"
                  style={{ backgroundColor: "hsl(223, 83%, 75%)" }}
                />
                <div
                  className="w-4"
                  style={{ backgroundColor: "hsl(223, 83%, 62%)" }}
                />
                <div
                  className="w-4"
                  style={{ backgroundColor: "hsl(223, 83%, 49%)" }}
                />
                <div
                  className="w-4 rounded-r"
                  style={{ backgroundColor: "hsl(223, 83%, 30%)" }}
                />
              </div>
              <span className="text-[9px] text-muted-foreground">
                {mapMaxOrders.toLocaleString()}
              </span>
            </div>
          </div>

          {/* State revenue table */}
          <div className="overflow-auto max-h-[500px]">
            <table className="w-full">
              <thead className="sticky top-0 bg-card border-b">
                <tr>
                  <StateSortHeader field="rank" label="#" />
                  <StateSortHeader field="state" label="State" />
                  <StateSortHeader field="orders" label="Orders" align="right" />
                  <StateSortHeader field="revenue" label="Revenue" align="right" />
                  <StateSortHeader field="share" label="Share %" align="right" />
                </tr>
              </thead>
              <tbody>
                {stateRankings.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-10 text-center text-sm text-muted-foreground"
                    >
                      No state data available.
                    </td>
                  </tr>
                ) : (
                  stateRankings.map((s) => {
                    const isExpanded = expandedState === s.name
                    const topCities = isExpanded ? getTopCitiesForState(s.name) : []
                    return (
                      <Fragment key={s.name}>
                        <tr
                          className={`border-b last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer ${
                            isExpanded ? "bg-muted/10" : ""
                          }`}
                          onClick={() =>
                            setExpandedState(isExpanded ? null : s.name)
                          }
                        >
                          <td className="px-3 py-2.5 text-sm tabular-nums text-muted-foreground">
                            {s.rank}
                          </td>
                          <td className="px-3 py-2.5 text-sm font-medium text-primary">
                            <span className="inline-flex items-center gap-1">
                              {s.name}
                              {isExpanded ? (
                                <ChevronUp className="size-3" />
                              ) : (
                                <ChevronDown className="size-3 opacity-40" />
                              )}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-sm text-right tabular-nums">
                            {s.orders.toLocaleString()}
                          </td>
                          <td className="px-3 py-2.5 text-sm text-right tabular-nums">
                            {formatCurrencyFull(s.revenue)}
                          </td>
                          <td className="px-3 py-2.5 text-sm text-right tabular-nums">
                            {s.share.toFixed(1)}%
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-muted/10">
                            <td colSpan={5} className="px-6 py-3">
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground mb-2">
                                  Top cities in {s.name}
                                </p>
                                {topCities.length > 0 ? (
                                  topCities.map((city) => (
                                    <div
                                      key={city.name}
                                      className="flex items-center justify-between text-xs py-1"
                                    >
                                      <span>{city.name}</span>
                                      <span className="text-muted-foreground">
                                        {city.orders} orders &middot;{" "}
                                        {formatCurrencyFull(city.revenue)}
                                      </span>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-xs text-muted-foreground">
                                    No city data.
                                  </p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
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
