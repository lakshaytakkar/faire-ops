"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { PageResourcesButton } from "@/components/shared/page-resources"
import {
  DollarSign,
  ShoppingCart,
  Package,
  ArrowRight,
  AlertTriangle,
  TrendingUp,
  Zap,
  Clock,
  RefreshCw,
  CheckCircle2,
  BookOpen,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  X,
} from "lucide-react"
import { useBrandFilter } from "@/lib/brand-filter-context"
import { useOrderStats, useSync } from "@/lib/use-faire-data"
import { PartnerCardStrip } from "@/components/overview/partner-card"
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge"

const VARIANT_TO_TONE: Record<"success" | "error" | "warning" | "neutral" | "info", StatusTone> = {
  success: "emerald",
  error: "red",
  warning: "amber",
  neutral: "slate",
  info: "blue",
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
  return `${days}d ago`
}

function isStale(dateStr: string | null): boolean {
  if (!dateStr) return true
  return Date.now() - new Date(dateStr).getTime() > 24 * 60 * 60 * 1000
}

/* ------------------------------------------------------------------ */
/*  Update Views Modal                                                 */
/* ------------------------------------------------------------------ */

interface StoreInfo {
  id: string
  name: string
  color: string
}

interface MissingDay {
  date: string // YYYY-MM-DD
  stores: StoreInfo[] // stores missing data on this day
}

function UpdateViewsModal({
  stores,
  onClose,
}: {
  stores: StoreInfo[]
  onClose: () => void
}) {
  const [missingDays, setMissingDays] = useState<MissingDay[]>([])
  const [values, setValues] = useState<Record<string, Record<string, string>>>({}) // date -> storeId -> count
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedCount, setSavedCount] = useState<number | null>(null)

  // Load existing views and compute missing days
  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/views?from=2026-04-01`)
      const json = await res.json()
      const existingViews = (json.data ?? []) as Array<{
        store_id: string
        view_date: string
        view_count: number
      }>

      // Build a set of "storeId|date" that already have data
      const filled = new Set(
        existingViews.map((v) => `${v.store_id}|${v.view_date}`),
      )

      // Generate all dates from Apr 1 to yesterday
      const start = new Date("2026-04-01")
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      const days: MissingDay[] = []
      const initValues: Record<string, Record<string, string>> = {}

      for (let d = new Date(start); d <= yesterday; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().slice(0, 10)
        const missingStores = stores.filter(
          (s) => !filled.has(`${s.id}|${dateStr}`),
        )
        if (missingStores.length > 0) {
          days.push({ date: dateStr, stores: missingStores })
          initValues[dateStr] = {}
          for (const s of missingStores) {
            initValues[dateStr][s.id] = ""
          }
        }
      }

      setMissingDays(days)
      setValues(initValues)
      setLoading(false)
    }
    load()
  }, [stores])

  function updateValue(date: string, storeId: string, val: string) {
    setValues((prev) => ({
      ...prev,
      [date]: { ...prev[date], [storeId]: val },
    }))
  }

  async function handleSave() {
    setSaving(true)
    setSavedCount(null)
    const entries: Array<{ store_id: string; view_date: string; view_count: number }> = []
    for (const [date, storeMap] of Object.entries(values)) {
      for (const [storeId, val] of Object.entries(storeMap)) {
        const num = parseInt(val, 10)
        if (!isNaN(num) && num >= 0) {
          entries.push({ store_id: storeId, view_date: date, view_count: num })
        }
      }
    }
    if (entries.length === 0) {
      setSaving(false)
      return
    }
    try {
      const res = await fetch("/api/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setSavedCount(entries.length)
      // Remove saved days from missing list
      const savedDates = new Set(entries.map((e) => `${e.store_id}|${e.view_date}`))
      setMissingDays((prev) =>
        prev
          .map((day) => ({
            ...day,
            stores: day.stores.filter(
              (s) => !savedDates.has(`${s.id}|${day.date}`),
            ),
          }))
          .filter((day) => day.stores.length > 0),
      )
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const totalPending = missingDays.reduce((sum, d) => sum + d.stores.length, 0)
  const filledCount = Object.values(values).reduce(
    (sum, storeMap) =>
      sum +
      Object.values(storeMap).filter((v) => v !== "" && !isNaN(Number(v)))
        .length,
    0,
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border/80 rounded-lg shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-bold font-heading">Update Views</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {loading
                ? "Loading…"
                : totalPending === 0
                  ? "All caught up!"
                  : `${totalPending} entries missing since Apr 1`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-md bg-muted animate-pulse" />
              ))}
            </div>
          ) : missingDays.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              All store views are up to date since April 1, 2026.
            </div>
          ) : (
            <div className="space-y-4">
              {missingDays.map((day) => (
                <div
                  key={day.date}
                  className="rounded-lg border border-border/80 overflow-hidden"
                >
                  <div className="bg-muted/40 px-4 py-2 border-b">
                    <p className="text-sm font-semibold">
                      {new Date(day.date + "T00:00:00").toLocaleDateString(
                        "en-US",
                        {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        },
                      )}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
                    {day.stores.map((store) => (
                      <div key={store.id} className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: store.color }}
                        />
                        <label className="text-sm text-muted-foreground truncate flex-1 min-w-0">
                          {store.name}
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder="—"
                          value={values[day.date]?.[store.id] ?? ""}
                          onChange={(e) =>
                            updateValue(day.date, store.id, e.target.value)
                          }
                          className="w-20 h-8 px-2 text-sm tabular-nums text-right bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t bg-muted/20">
          <div className="text-xs text-muted-foreground">
            {savedCount !== null && (
              <span className="text-emerald-600 font-medium">
                Saved {savedCount} entries
              </span>
            )}
            {savedCount === null && filledCount > 0 && (
              <span>{filledCount} entries ready to save</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || filledCount === 0}
              className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : `Save ${filledCount} entries`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Dashboard                                                          */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const { activeBrand, stores, storesLoading } = useBrandFilter()
  const [dateFilter, setDateFilter] = useState("All Time")
  const [showViews, setShowViews] = useState(false)
  const { stats, loading: statsLoading } = useOrderStats(activeBrand === "all" ? undefined : activeBrand, dateFilter)
  const { syncing, error: syncError, triggerSync } = useSync()
  const [sortKey, setSortKey] = useState("orders")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir(prev => prev === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("desc") }
  }

  function SortIcon({ col }: { col: string }) {
    if (sortKey !== col) return <ArrowUpDown className="size-3 opacity-30 ml-1" />
    return sortDir === "asc" ? <ArrowUp className="size-3 text-primary ml-1" /> : <ArrowDown className="size-3 text-primary ml-1" />
  }

  const loading = storesLoading || statsLoading

  const filteredStores = activeBrand === "all" ? stores : stores.filter((s) => s.id === activeBrand)
  const totalRevenue = stats.totalRevenueCents / 100
  const pendingCount = stats.newOrders + stats.processing
  const totalOrders = stats.total
  const totalListings = filteredStores.reduce((sum, s) => sum + s.total_products, 0)

  // Revenue and orders are now properly filtered by date in the useOrderStats hook

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
  const brandLabel = activeBrand === "all" ? `All ${stores.length} Brands` : filteredStores[0]?.name ?? ""

  // Generate alerts from real data
  const alerts: { id: string; title: string; detail: string; severity: "error" | "warning" | "info" }[] = [
    ...stores
      .filter((s) => isStale(s.last_synced_at))
      .map((s) => ({
        id: `stale-${s.id}`,
        title: `${s.name} not synced recently`,
        detail: `Last sync: ${timeAgo(s.last_synced_at)} — data may be outdated`,
        severity: "warning" as const,
      })),
    ...(pendingCount > 0
      ? [
          {
            id: "pending",
            title: `${pendingCount} orders awaiting action`,
            detail: `${stats.newOrders} new + ${stats.processing} processing`,
            severity: "error" as const,
          },
        ]
      : []),
    ...(totalOrders > 100
      ? [
          {
            id: "high-volume",
            title: "High order volume",
            detail: `${totalOrders} total orders across portfolio`,
            severity: "info" as const,
          },
        ]
      : []),
  ].slice(0, 6)

  if (loading) {
    return (
      <div className="space-y-6 max-w-[1440px] mx-auto w-full">
        <div className="h-[200px] rounded-md bg-muted animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[120px] rounded-md bg-muted animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-[300px] rounded-md bg-muted animate-pulse" />
          <div className="h-[300px] rounded-md bg-muted animate-pulse" />
        </div>
        <div className="h-[300px] rounded-md bg-muted animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto w-full">
      {/* Hero Banner */}
      <div
        className="rounded-md px-8 py-7 text-white"
        style={{ background: "linear-gradient(135deg, hsl(225,47%,15%) 0%, hsl(223,83%,35%) 100%)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium opacity-75">👋 {greeting}</p>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 bg-black/20 rounded-md p-0.5">
              {["Today", "This Month", "3 Months", "All Time"].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setDateFilter(p)}
                  className={`h-8 px-3 rounded text-sm font-medium transition-colors ${dateFilter === p ? "bg-white text-[hsl(225,47%,15%)]" : "text-white/80 hover:text-white hover:bg-white/10"}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
        <h1 className="mt-1 text-3xl font-bold font-heading tracking-tight">
          Faire Operations Center
        </h1>
        <p className="mt-1 text-sm opacity-60">
          {brandLabel} &middot; Wholesale portfolio management &amp; fulfillment
        </p>
        <div className="mt-5 flex items-center gap-8">
          <div>
            <p className="text-2xl font-bold">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
            <p className="text-xs opacity-50">{dateFilter} Revenue</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{totalOrders}</p>
            <p className="text-xs opacity-50">{dateFilter} Orders</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{totalListings.toLocaleString()}</p>
            <p className="text-xs opacity-50">Active Listings</p>
          </div>
        </div>
      </div>

      {/* Pinned platform partners (Faire account manager, etc.) */}
      <PartnerCardStrip spaceSlug="b2b-ecommerce" />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{dateFilter} Revenue</p>
            <p className="text-2xl font-bold font-heading mt-2">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
            <p className="text-xs text-muted-foreground mt-1">{totalOrders} orders</p>
          </div>
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "rgba(34,90,234,0.1)" }}
          >
            <DollarSign className="h-4 w-4" style={{ color: "#225aea" }} />
          </div>
        </div>

        {/* Pending Orders */}
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Pending Orders</p>
            <p className={`text-2xl font-bold font-heading mt-2 ${pendingCount > 0 ? "text-red-600" : ""}`}>{pendingCount}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.newOrders} new, {stats.processing} processing
            </p>
          </div>
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "rgba(239,68,68,0.1)" }}
          >
            <ShoppingCart className="h-4 w-4" style={{ color: "#ef4444" }} />
          </div>
        </div>

        {/* Active Stores */}
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Active Stores</p>
            <p className="text-2xl font-bold font-heading mt-2">{filteredStores.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredStores.filter((s) => !isStale(s.last_synced_at)).length} synced recently
            </p>
          </div>
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "rgba(16,185,129,0.1)" }}
          >
            <Package className="h-4 w-4" style={{ color: "#10b981" }} />
          </div>
        </div>

        {/* In Transit */}
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">In Transit</p>
            <p className="text-2xl font-bold font-heading mt-2">{stats.inTransit}</p>
            <p className="text-xs text-muted-foreground mt-1">{stats.delivered} delivered</p>
          </div>
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "rgba(245,158,11,0.1)" }}
          >
            <TrendingUp className="h-4 w-4" style={{ color: "#f59e0b" }} />
          </div>
        </div>
      </div>

      {/* Section Grid: Recent Activity | Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity / Sync */}
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-3.5">
            <h2 className="text-sm font-semibold">Recent Activity</h2>
            <button
              onClick={triggerSync}
              disabled={syncing}
              className="text-xs text-primary font-medium flex items-center gap-1 hover:underline disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing..." : "Sync Now"}
            </button>
          </div>
          <div className="divide-y">
            {syncError && (
              <div className="px-5 py-3.5 text-sm text-red-600 bg-red-50 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Sync failed: {syncError}
              </div>
            )}
            {filteredStores.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                No stores found
              </div>
            ) : (
              filteredStores.map((store) => (
                <div
                  key={store.id}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors"
                >
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${store.color}15` }}
                  >
                    {isStale(store.last_synced_at) ? (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" style={{ color: store.color }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{store.name}</p>
                      <StatusBadge
                        tone={VARIANT_TO_TONE[isStale(store.last_synced_at) ? "warning" : "success"]}
                      >
                        {isStale(store.last_synced_at) ? "Stale" : "Synced"}
                      </StatusBadge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Last synced {timeAgo(store.last_synced_at)} &middot; {store.total_orders} orders
                    </p>
                  </div>
                  <span className="text-sm font-medium shrink-0 text-muted-foreground">
                    {store.total_products} products
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Alerts */}
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-3.5">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              Alerts
              {alerts.filter((a) => a.severity === "error").length > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {alerts.filter((a) => a.severity === "error").length}
                </span>
              )}
            </h2>
            <Link
              href="/analytics"
              className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
            >
              Details <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y">
            {alerts.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                No alerts — everything looks good
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors"
                >
                  <AlertTriangle
                    className={`h-4 w-4 shrink-0 ${
                      alert.severity === "error"
                        ? "text-red-500"
                        : alert.severity === "warning"
                          ? "text-amber-500"
                          : "text-blue-500"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{alert.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{alert.detail}</p>
                  </div>
                  <StatusBadge tone={VARIANT_TO_TONE[alert.severity]}>
                    {alert.severity === "error"
                      ? "High"
                      : alert.severity === "warning"
                        ? "Medium"
                        : "Low"}
                  </StatusBadge>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Store Performance Table */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <h2 className="text-sm font-semibold">Store Performance</h2>
          <Link
            href="/analytics/brands"
            className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
          >
            Full Analytics <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">
                  Store
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">
                  Category
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left cursor-pointer select-none" onClick={() => toggleSort("orders")}>
                  <span className="flex items-center">Orders <SortIcon col="orders" /></span>
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left cursor-pointer select-none" onClick={() => toggleSort("products")}>
                  <span className="flex items-center">Products <SortIcon col="products" /></span>
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">
                  Last Synced
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {[...filteredStores].sort((a, b) => {
                const dir = sortDir === "asc" ? 1 : -1
                if (sortKey === "orders") return (a.total_orders - b.total_orders) * dir
                if (sortKey === "products") return (a.total_products - b.total_products) * dir
                return 0
              }).map((store) => (
                <tr
                  key={store.id}
                  className="border-b last:border-b-0 hover:bg-muted/20 transition-colors"
                >
                  <td className="px-4 py-3.5 text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: store.color }}
                      />
                      <span className="font-medium">{store.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground">{store.category}</td>
                  <td className="px-4 py-3.5 text-sm">{store.total_orders}</td>
                  <td className="px-4 py-3.5 text-sm">{store.total_products}</td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground">
                    {timeAgo(store.last_synced_at)}
                  </td>
                  <td className="px-4 py-3.5 text-sm">
                    <StatusBadge
                      tone={VARIANT_TO_TONE[isStale(store.last_synced_at) ? "warning" : "success"]}
                    >
                      {isStale(store.last_synced_at) ? "Stale" : "Synced"}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setShowViews(true)}
          className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-center gap-4 hover:bg-muted/20 transition-colors cursor-pointer text-left"
        >
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-violet-500/10">
            <Eye className="h-4 w-4 text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-semibold">Update Views</p>
            <p className="text-xs text-muted-foreground">Fill missing daily counts</p>
          </div>
        </button>
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-center gap-4 hover:bg-muted/20 transition-colors cursor-pointer">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-primary/10">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Run Scraper</p>
            <p className="text-xs text-muted-foreground">Find trending products</p>
          </div>
        </div>
        <Link
          href="/analytics/revenue"
          className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-center gap-4 hover:bg-muted/20 transition-colors cursor-pointer"
        >
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-emerald-500/10">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold">View Analytics</p>
            <p className="text-xs text-muted-foreground">Revenue &amp; performance</p>
          </div>
        </Link>
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-center gap-4 hover:bg-muted/20 transition-colors cursor-pointer">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-amber-500/10">
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold">Pending Actions</p>
            <p className="text-xs text-muted-foreground">{pendingCount} orders waiting</p>
          </div>
        </div>
      </div>

      {/* Update Views Modal */}
      {showViews && (
        <UpdateViewsModal
          stores={stores.map((s) => ({ id: s.id, name: s.name, color: s.color }))}
          onClose={() => setShowViews(false)}
        />
      )}
    </div>
  )
}
