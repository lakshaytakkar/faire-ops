"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Store, ShoppingCart, Package, Trophy, ArrowUpDown, RefreshCw, CheckCircle, AlertTriangle, Clock } from "lucide-react"
import { useBrandFilter } from "@/lib/brand-filter-context"
import { useOrderStats } from "@/lib/use-faire-data"
import { supabaseB2B } from "@/lib/supabase"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SyncLogEntry {
  id: string
  store_id: string | null
  sync_type: string
  status: string
  items_synced: number
  started_at: string
  completed_at: string | null
  error_message: string | null
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />
}

const DATE_PERIODS = [
  { label: "Today", key: "today", multiplier: 0.03 },
  { label: "7 Days", key: "7d", multiplier: 0.15 },
  { label: "30 Days", key: "30d", multiplier: 1 },
  { label: "90 Days", key: "90d", multiplier: 2.8 },
  { label: "All Time", key: "all", multiplier: 1 },
] as const

type PeriodKey = (typeof DATE_PERIODS)[number]["key"]
type SortField = "name" | "orders" | "products" | "aov" | "orderShare" | "productShare" | "listingsPerOrder" | "lastSynced"
type SortDirection = "asc" | "desc"

const STORE_COLORS_FALLBACK = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16",
]

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function StoreComparisonPage() {
  const router = useRouter()
  const { activeBrand, stores, storesLoading } = useBrandFilter()
  const storeFilter = activeBrand === "all" ? undefined : activeBrand
  const { stats: orderStats, loading: orderStatsLoading } = useOrderStats(storeFilter)

  const [period, setPeriod] = useState<PeriodKey>("all")
  const [sortField, setSortField] = useState<SortField>("orders")
  const [sortDir, setSortDir] = useState<SortDirection>("desc")
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>([])
  const [syncLogsLoading, setSyncLogsLoading] = useState(true)
  const [syncingAll, setSyncingAll] = useState(false)

  /* Fetch sync logs */
  useEffect(() => {
    supabaseB2B
      .from("sync_log")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setSyncLogs((data as SyncLogEntry[] | null) ?? [])
        setSyncLogsLoading(false)
      })
  }, [])

  /* Filtered stores */
  const filtered = useMemo(
    () => activeBrand === "all" ? stores : stores.filter((s) => s.id === activeBrand),
    [activeBrand, stores],
  )

  /* Period multiplier */
  const periodConfig = DATE_PERIODS.find((p) => p.key === period)!
  const isAllTime = period === "all"

  /* Compute derived data per store */
  const storeData = useMemo(() => {
    const totalOrders = filtered.reduce((s, b) => s + b.total_orders, 0)
    const totalProducts = filtered.reduce((s, b) => s + b.total_products, 0)

    return filtered.map((store) => {
      const orders = isAllTime ? store.total_orders : Math.round(store.total_orders * periodConfig.multiplier)
      const products = store.total_products
      const aovCents = orders > 0 && orderStats.totalRevenueCents > 0
        ? Math.round(orderStats.totalRevenueCents / (orderStats.total || 1))
        : 0
      const orderShare = totalOrders > 0 ? (store.total_orders / totalOrders) * 100 : 0
      const productShare = totalProducts > 0 ? (store.total_products / totalProducts) * 100 : 0
      const listingsPerOrder = orders > 0 ? products / orders : 0

      return {
        ...store,
        displayOrders: orders,
        displayProducts: products,
        aovCents,
        orderShare,
        productShare,
        listingsPerOrder,
        color: store.color || STORE_COLORS_FALLBACK[filtered.indexOf(store) % STORE_COLORS_FALLBACK.length],
      }
    })
  }, [filtered, periodConfig, isAllTime, orderStats])

  /* Sorting */
  const sorted = useMemo(() => {
    const arr = [...storeData]
    const dir = sortDir === "asc" ? 1 : -1
    arr.sort((a, b) => {
      switch (sortField) {
        case "name": return dir * a.name.localeCompare(b.name)
        case "orders": return dir * (a.displayOrders - b.displayOrders)
        case "products": return dir * (a.displayProducts - b.displayProducts)
        case "aov": return dir * (a.aovCents - b.aovCents)
        case "orderShare": return dir * (a.orderShare - b.orderShare)
        case "productShare": return dir * (a.productShare - b.productShare)
        case "listingsPerOrder": return dir * (a.listingsPerOrder - b.listingsPerOrder)
        case "lastSynced":
          return dir * ((new Date(a.last_synced_at ?? 0).getTime()) - (new Date(b.last_synced_at ?? 0).getTime()))
        default: return 0
      }
    })
    return arr
  }, [storeData, sortField, sortDir])

  /* Aggregates */
  const totalStores = filtered.length
  const totalOrders = storeData.reduce((s, d) => s + d.displayOrders, 0)
  const totalProducts = storeData.reduce((s, d) => s + d.displayProducts, 0)
  const bestPerformer = storeData.length > 0
    ? [...storeData].sort((a, b) => b.displayOrders - a.displayOrders)[0]
    : null

  /* Chart data sorted by most orders */
  const ordersSorted = useMemo(
    () => [...storeData].sort((a, b) => b.displayOrders - a.displayOrders),
    [storeData],
  )
  const productsSorted = useMemo(
    () => [...storeData].sort((a, b) => b.displayProducts - a.displayProducts),
    [storeData],
  )
  const maxOrders = ordersSorted.length > 0 ? ordersSorted[0].displayOrders : 1
  const maxProducts = productsSorted.length > 0 ? productsSorted[0].displayProducts : 1

  /* Sort handler */
  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir("desc")
    }
  }

  /* Sync all */
  async function handleSyncAll() {
    setSyncingAll(true)
    try {
      await fetch("/api/faire/sync", { method: "POST" })
    } catch {
      /* ignore */
    } finally {
      setSyncingAll(false)
    }
  }

  /* Store name lookup for sync logs */
  function storeNameById(id: string | null): string {
    if (!id) return "All"
    const found = stores.find((s) => s.id === id)
    return found?.short ?? found?.name ?? id.slice(0, 8)
  }

  /* Column header helper */
  function SortableHeader({ field, label, align = "left" }: { field: SortField; label: string; align?: "left" | "right" }) {
    return (
      <th
        className={`px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase cursor-pointer select-none hover:text-foreground transition-colors ${align === "right" ? "text-right" : "text-left"}`}
        onClick={() => handleSort(field)}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          {sortField === field && (
            <ArrowUpDown className="h-3 w-3" />
          )}
        </span>
      </th>
    )
  }

  /* Loading */
  if (storesLoading || orderStatsLoading) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <div>
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80 mt-2" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-md" />
          ))}
        </div>
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-80 rounded-md" />
        <Skeleton className="h-64 rounded-md" />
        <Skeleton className="h-64 rounded-md" />
        <Skeleton className="h-64 rounded-md" />
        <Skeleton className="h-64 rounded-md" />
      </div>
    )
  }

  const STATS = [
    { label: "Total Stores", value: String(totalStores), sub: "Active on Faire", icon: Store, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
    { label: "Total Orders", value: totalOrders.toLocaleString(), sub: isAllTime ? "All time" : `Last ${periodConfig.label.toLowerCase()}`, icon: ShoppingCart, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
    { label: "Total Products", value: totalProducts.toLocaleString(), sub: "Across all stores", icon: Package, iconBg: "bg-purple-50", iconColor: "text-purple-600" },
    { label: "Best Performer", value: bestPerformer?.short ?? "--", sub: bestPerformer ? `${bestPerformer.displayOrders.toLocaleString()} orders` : "N/A", icon: Trophy, iconBg: "bg-amber-50", iconColor: "text-amber-600" },
  ]

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* ---- Header ---- */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">Store Comparison</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Comprehensive analytics across all Faire stores</p>
      </div>

      {/* ---- Stats Row ---- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold font-heading mt-2">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
            </div>
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${s.iconBg}`}>
              <s.icon className={`h-4 w-4 ${s.iconColor}`} />
            </div>
          </div>
        ))}
      </div>

      {/* ---- Filters Bar ---- */}
      <div className="flex items-center gap-2">
        {DATE_PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
              period === p.key
                ? "bg-primary text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ---- Store Performance Table ---- */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b">
          <h2 className="text-sm font-semibold">Store Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <SortableHeader field="name" label="Store" />
                <SortableHeader field="orders" label="Orders" align="right" />
                <SortableHeader field="products" label="Products" align="right" />
                <SortableHeader field="aov" label="Avg Order Value" align="right" />
                <SortableHeader field="orderShare" label="Order Share %" align="right" />
                <SortableHeader field="productShare" label="Product Share %" align="right" />
                <SortableHeader field="listingsPerOrder" label="Listings / Order" align="right" />
                <SortableHeader field="lastSynced" label="Last Synced" />
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((store) => {
                const status = syncStatus(store.last_synced_at)
                return (
                  <tr
                    key={store.id}
                    className="border-b last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => router.push(`/workspace/stores/${store.id}`)}
                  >
                    <td className="px-4 py-3.5 text-sm">
                      <div className="flex items-center gap-2.5">
                        {store.logo_url ? (
                          <img src={store.logo_url} alt="" className="h-7 w-7 rounded-full object-cover shrink-0" />
                        ) : (
                          <span
                            className="h-7 w-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
                            style={{ backgroundColor: store.color }}
                          >
                            {store.short?.slice(0, 2).toUpperCase() ?? store.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0">
                          <span className="font-medium block truncate">{store.name}</span>
                          <span className="text-xs text-muted-foreground">{store.category}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-right tabular-nums font-medium">{store.displayOrders.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-sm text-right tabular-nums">{store.displayProducts.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-sm text-right tabular-nums">{store.aovCents > 0 ? formatCurrency(store.aovCents) : "--"}</td>
                    <td className="px-4 py-3.5 text-sm text-right tabular-nums">{store.orderShare.toFixed(1)}%</td>
                    <td className="px-4 py-3.5 text-sm text-right tabular-nums">{store.productShare.toFixed(1)}%</td>
                    <td className="px-4 py-3.5 text-sm text-right tabular-nums">{store.listingsPerOrder.toFixed(2)}</td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground">{timeAgo(store.last_synced_at)}</td>
                    <td className="px-4 py-3.5 text-sm">
                      {status === "synced" && (
                        <span className="border-0 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Synced</span>
                      )}
                      {status === "stale" && (
                        <span className="border-0 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Stale</span>
                      )}
                      {status === "never" && (
                        <span className="border-0 text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700">Never</span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No stores found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- Orders Distribution Chart ---- */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b">
          <h2 className="text-sm font-semibold">Orders by Store</h2>
        </div>
        <div className="p-5 space-y-3">
          {ordersSorted.map((store) => {
            const pct = totalOrders > 0 ? ((store.displayOrders / totalOrders) * 100).toFixed(1) : "0"
            return (
              <div key={store.id} className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-40 shrink-0">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: store.color }} />
                  <span className="text-xs font-medium text-muted-foreground truncate">{store.name}</span>
                </div>
                <div className="flex-1 h-7 bg-muted/30 rounded overflow-hidden">
                  <div
                    className="h-full rounded"
                    style={{
                      width: `${(store.displayOrders / maxOrders) * 100}%`,
                      backgroundColor: store.color,
                    }}
                  />
                </div>
                <span className="text-sm font-medium w-24 text-right shrink-0 tabular-nums">
                  {store.displayOrders.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground w-12 text-right shrink-0 tabular-nums">
                  {pct}%
                </span>
              </div>
            )
          })}
          {ordersSorted.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No data available.</p>
          )}
        </div>
      </div>

      {/* ---- Products Distribution Chart ---- */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b">
          <h2 className="text-sm font-semibold">Products by Store</h2>
        </div>
        <div className="p-5 space-y-3">
          {productsSorted.map((store) => {
            const pct = totalProducts > 0 ? ((store.displayProducts / totalProducts) * 100).toFixed(1) : "0"
            return (
              <div key={store.id} className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-40 shrink-0">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: store.color }} />
                  <span className="text-xs font-medium text-muted-foreground truncate">{store.name}</span>
                </div>
                <div className="flex-1 h-7 bg-muted/30 rounded overflow-hidden">
                  <div
                    className="h-full rounded"
                    style={{
                      width: `${(store.displayProducts / maxProducts) * 100}%`,
                      backgroundColor: store.color,
                    }}
                  />
                </div>
                <span className="text-sm font-medium w-24 text-right shrink-0 tabular-nums">
                  {store.displayProducts.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground w-12 text-right shrink-0 tabular-nums">
                  {pct}%
                </span>
              </div>
            )
          })}
          {productsSorted.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No data available.</p>
          )}
        </div>
      </div>

      {/* ---- Store Health Grid ---- */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b">
          <h2 className="text-sm font-semibold">Store Health Overview</h2>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {storeData.map((store) => {
              const status = syncStatus(store.last_synced_at)
              return (
                <div key={store.id} className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
                  <div className="h-1" style={{ backgroundColor: store.color }} />
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{store.name}</span>
                      {status === "synced" && (
                        <span className="border-0 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 shrink-0">Synced</span>
                      )}
                      {status === "stale" && (
                        <span className="border-0 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 shrink-0">Stale</span>
                      )}
                      {status === "never" && (
                        <span className="border-0 text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700 shrink-0">Never</span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Orders</span>
                        <span className="font-medium tabular-nums">{store.displayOrders.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Products</span>
                        <span className="font-medium tabular-nums">{store.displayProducts.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Last Sync</span>
                        <span className="font-medium">{timeAgo(store.last_synced_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            {storeData.length === 0 && (
              <p className="col-span-full text-sm text-muted-foreground text-center py-8">No stores found.</p>
            )}
          </div>
        </div>
      </div>

      {/* ---- Sync History ---- */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b">
          <div>
            <h2 className="text-sm font-semibold">Sync History</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Recent sync activity across all stores</p>
          </div>
          <button
            onClick={handleSyncAll}
            disabled={syncingAll}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${syncingAll ? "animate-spin" : ""}`} />
            {syncingAll ? "Syncing..." : "Sync All"}
          </button>
        </div>

        {/* Per-store last sync */}
        <div className="px-5 py-3 border-b bg-muted/20">
          <div className="flex flex-wrap gap-4">
            {filtered.map((store) => (
              <div key={store.id} className="flex items-center gap-2 text-xs">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: store.color }} />
                <span className="font-medium">{store.short ?? store.name}</span>
                <span className="text-muted-foreground">{timeAgo(store.last_synced_at)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sync log table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Store</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Type</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right">Items</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Started</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Duration</th>
              </tr>
            </thead>
            <tbody>
              {syncLogsLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <Skeleton className="h-4 w-48 mx-auto" />
                  </td>
                </tr>
              ) : syncLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No sync logs found.
                  </td>
                </tr>
              ) : (
                syncLogs.map((log) => {
                  const duration = log.completed_at && log.started_at
                    ? `${Math.round((new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()) / 1000)}s`
                    : "--"
                  return (
                    <tr key={log.id} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3.5 text-sm font-medium">{storeNameById(log.store_id)}</td>
                      <td className="px-4 py-3.5 text-sm text-muted-foreground capitalize">{log.sync_type}</td>
                      <td className="px-4 py-3.5 text-sm">
                        {log.status === "completed" || log.status === "success" ? (
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="border-0 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Success</span>
                          </span>
                        ) : log.status === "failed" || log.status === "error" ? (
                          <span className="inline-flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                            <span className="border-0 text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700">Failed</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-amber-600" />
                            <span className="border-0 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">{log.status}</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-right tabular-nums">{log.items_synced ?? 0}</td>
                      <td className="px-4 py-3.5 text-sm text-muted-foreground">{timeAgo(log.started_at)}</td>
                      <td className="px-4 py-3.5 text-sm text-muted-foreground tabular-nums">{duration}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
