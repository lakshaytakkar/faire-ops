"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { PageResourcesButton } from "@/components/shared/page-resources"
import { Search, DollarSign, Clock, Truck, Package, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, SlidersHorizontal, X, List, LayoutGrid } from "lucide-react"
import { useOrders, useOrderStats } from "@/lib/use-faire-data"
import { useBrandFilter } from "@/lib/brand-filter-context"
import { supabaseB2B } from "@/lib/supabase"
import type { FaireOrder } from "@/lib/supabase"

const STATE_BADGE: Record<string, { variant: string; label: string }> = {
  NEW: { variant: "warning", label: "New" },
  PROCESSING: { variant: "info", label: "Processing" },
  PRE_TRANSIT: { variant: "info", label: "Pre-Transit" },
  IN_TRANSIT: { variant: "success", label: "In Transit" },
  DELIVERED: { variant: "neutral", label: "Delivered" },
  CANCELED: { variant: "error", label: "Canceled" },
  PENDING_RETAILER_CONFIRMATION: { variant: "warning", label: "Pending" },
  BACKORDERED: { variant: "warning", label: "Backordered" },
}

const BADGE_STYLES: Record<string, string> = {
  success: "bg-emerald-50 text-emerald-700",
  error: "bg-red-50 text-red-700",
  warning: "bg-amber-50 text-amber-700",
  neutral: "bg-slate-100 text-slate-600",
  info: "bg-blue-50 text-blue-700",
}

const KANBAN_COLUMNS = [
  { key: "NEW", label: "New", color: "#f59e0b", maxShow: 20 },
  { key: "PROCESSING", label: "Processing", color: "#3b82f6", maxShow: 20 },
  { key: "IN_TRANSIT", label: "In Transit", color: "#10b981", maxShow: 20 },
  { key: "DELIVERED", label: "Delivered", color: "#94a3b8", maxShow: 5 },
  { key: "CANCELED", label: "Canceled", color: "#ef4444", maxShow: 5 },
] as const

type TabKey = "all" | "NEW" | "PROCESSING" | "IN_TRANSIT" | "DELIVERED" | "CANCELED"
type SortKey = "date" | "total" | "items" | "retailer"
type SortDir = "asc" | "desc"

function getRetailerName(order: FaireOrder): string {
  const addr = order.shipping_address as Record<string, unknown> | null
  if (!addr) return "—"
  return (addr.company_name as string) || (addr.name as string) || "—"
}

function getCity(order: FaireOrder): string {
  const addr = order.shipping_address as Record<string, unknown> | null
  if (!addr) return "—"
  return (addr.city as string) || "—"
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function formatCents(cents: number): string {
  return "$" + (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const PAGE_SIZE = 25

export default function OrdersPage() {
  const router = useRouter()
  const { activeBrand, stores } = useBrandFilter()
  const storeId = activeBrand === "all" ? undefined : activeBrand
  const { orders, totalCount, loading: ordersLoading, refetch } = useOrders(storeId)
  const { stats, loading: statsLoading } = useOrderStats(storeId)

  const [view, setView] = useState<"list" | "board">("board")
  const [activeTab, setActiveTab] = useState<TabKey>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("date")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [sourceFilter, setSourceFilter] = useState<string>("all")
  const [page, setPage] = useState(1)

  // Board-specific state
  const [expandedColumns, setExpandedColumns] = useState<Record<string, boolean>>({})
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [shipDialogOrder, setShipDialogOrder] = useState<FaireOrder | null>(null)
  const [shipTracking, setShipTracking] = useState("")
  const [shipCarrier, setShipCarrier] = useState("")
  const [shipping, setShipping] = useState(false)

  const [trackingMap, setTrackingMap] = useState<Record<string, any>>({})

  // Fetch 17Track shipment tracking for in-transit orders
  useEffect(() => {
    if (ordersLoading || orders.length === 0) return
    const inTransitIds = orders
      .filter((o) => ["IN_TRANSIT", "PRE_TRANSIT"].includes(o.state))
      .map((o) => o.faire_order_id)
    if (inTransitIds.length === 0) return
    supabaseB2B
      .from("shipment_tracking")
      .select("order_id, status, transit_days, is_delayed, last_event")
      .in("order_id", inTransitIds)
      .then(({ data }) => {
        const map: Record<string, any> = {}
        for (const t of data ?? []) map[t.order_id] = t
        setTrackingMap(map)
      })
  }, [orders, ordersLoading])

  const loading = ordersLoading || statsLoading

  // Filter + sort + paginate (for list view)
  const { paginatedOrders, totalFiltered, totalPages } = useMemo(() => {
    let result = orders

    // Tab filter
    if (activeTab !== "all") {
      if (activeTab === "IN_TRANSIT") {
        result = result.filter((o) => o.state === "IN_TRANSIT" || o.state === "PRE_TRANSIT")
      } else {
        result = result.filter((o) => o.state === activeTab)
      }
    }

    // Source filter
    if (sourceFilter !== "all") {
      result = result.filter((o) => o.source === sourceFilter)
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter((o) => {
        const displayId = (o.display_id ?? o.faire_order_id ?? "").toLowerCase()
        const retailer = getRetailerName(o).toLowerCase()
        const city = getCity(o).toLowerCase()
        return displayId.includes(q) || retailer.includes(q) || city.includes(q)
      })
    }

    // Sort
    result = [...result].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1
      switch (sortKey) {
        case "date":
          return dir * ((new Date(a.faire_created_at ?? 0).getTime()) - (new Date(b.faire_created_at ?? 0).getTime()))
        case "total":
          return dir * ((a.total_cents ?? 0) - (b.total_cents ?? 0))
        case "items":
          return dir * ((a.item_count ?? 0) - (b.item_count ?? 0))
        case "retailer":
          return dir * getRetailerName(a).localeCompare(getRetailerName(b))
        default:
          return 0
      }
    })

    const totalFiltered = result.length
    const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE))
    const start = (page - 1) * PAGE_SIZE
    const paginatedOrders = result.slice(start, start + PAGE_SIZE)

    return { paginatedOrders, totalFiltered, totalPages }
  }, [orders, activeTab, searchQuery, sortKey, sortDir, sourceFilter, page])

  // Group orders by state for board view
  const ordersByState = useMemo(() => {
    const groups: Record<string, FaireOrder[]> = { NEW: [], PROCESSING: [], IN_TRANSIT: [], DELIVERED: [], CANCELED: [] }

    // Apply search and source filters to board view too
    let filtered = orders
    if (sourceFilter !== "all") {
      filtered = filtered.filter((o) => o.source === sourceFilter)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter((o) => {
        const displayId = (o.display_id ?? o.faire_order_id ?? "").toLowerCase()
        const retailer = getRetailerName(o).toLowerCase()
        const city = getCity(o).toLowerCase()
        return displayId.includes(q) || retailer.includes(q) || city.includes(q)
      })
    }

    for (const o of filtered) {
      const key = o.state === "PRE_TRANSIT" ? "IN_TRANSIT" : o.state
      if (groups[key]) groups[key].push(o)
    }
    return groups
  }, [orders, sourceFilter, searchQuery])

  // Reset page when filters change
  function handleTabChange(tab: TabKey) { setActiveTab(tab); setPage(1) }
  function handleSearch(q: string) { setSearchQuery(q); setPage(1) }
  function handleSourceChange(s: string) { setSourceFilter(s); setPage(1) }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="size-3 opacity-30 ml-1" />
    return sortDir === "asc" ? <ArrowUp className="size-3 text-primary ml-1" /> : <ArrowDown className="size-3 text-primary ml-1" />
  }

  const activeStoreName = activeBrand === "all" ? "all stores" : stores.find((s) => s.id === activeBrand)?.name ?? "selected store"

  function getStoreName(sid: string): string { return stores.find((s) => s.id === sid)?.name ?? "—" }
  function getStoreColor(sid: string): string { return stores.find((s) => s.id === sid)?.color ?? "#94a3b8" }

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "all", label: "All", count: stats.total },
    { key: "NEW", label: "New", count: stats.newOrders },
    { key: "PROCESSING", label: "Processing", count: stats.processing },
    { key: "IN_TRANSIT", label: "In Transit", count: stats.inTransit },
    { key: "DELIVERED", label: "Delivered", count: stats.delivered },
    { key: "CANCELED", label: "Canceled", count: stats.canceled },
  ]

  const hasActiveFilters = searchQuery || sourceFilter !== "all" || activeTab !== "all"

  // Accept order action
  const [actionError, setActionError] = useState<string | null>(null)
  async function handleAccept(orderId: string, e: React.MouseEvent) {
    e.stopPropagation()
    setAcceptingId(orderId)
    setActionError(null)
    try {
      const res = await fetch(`/api/faire/orders/${orderId}/accept`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        setActionError(data.error ?? "Failed to accept order")
        return
      }
      refetch()
    } catch (err) {
      setActionError((err as Error).message)
    } finally {
      setAcceptingId(null)
    }
  }

  // Ship order action
  async function handleShip() {
    if (!shipDialogOrder || !shipTracking || !shipCarrier) return
    setShipping(true)
    try {
      const res = await fetch(`/api/faire/orders/${shipDialogOrder.faire_order_id}/ship`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tracking_code: shipTracking, carrier: shipCarrier }),
      })
      if (!res.ok) throw new Error("Failed to ship order")
      refetch()
      setShipDialogOrder(null)
      setShipTracking("")
      setShipCarrier("")
    } catch (err) {
      console.error("Ship order failed:", err)
    } finally {
      setShipping(false)
    }
  }

  function toggleColumnExpand(key: string) {
    setExpandedColumns((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="space-y-5 max-w-[1440px] mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Orders</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{stats.total} orders across {activeStoreName}</p>
        </div>
        <PageResourcesButton pageRoute="/orders" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">New Orders</p>
            <p className="text-2xl font-bold font-heading mt-2">{stats.newOrders}</p>
            <p className="text-xs text-muted-foreground mt-1">Awaiting action</p>
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(245,158,11,0.1)" }}>
            <Clock className="h-4 w-4" style={{ color: "#f59e0b" }} />
          </div>
        </div>
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Processing</p>
            <p className="text-2xl font-bold font-heading mt-2">{stats.processing}</p>
            <p className="text-xs text-muted-foreground mt-1">Being prepared</p>
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(59,130,246,0.1)" }}>
            <Package className="h-4 w-4" style={{ color: "#3b82f6" }} />
          </div>
        </div>
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">In Transit</p>
            <p className="text-2xl font-bold font-heading mt-2">{stats.inTransit}</p>
            <p className="text-xs text-muted-foreground mt-1">On the way</p>
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(16,185,129,0.1)" }}>
            <Truck className="h-4 w-4" style={{ color: "#10b981" }} />
          </div>
        </div>
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold font-heading mt-2">{formatCents(stats.totalRevenueCents)}</p>
            <p className="text-xs text-muted-foreground mt-1">{stats.total} orders</p>
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(34,90,234,0.1)" }}>
            <DollarSign className="h-4 w-4" style={{ color: "#225aea" }} />
          </div>
        </div>
      </div>

      {/* Table / Board */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search orders, retailers, cities..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="h-8 w-64 pl-8 text-sm rounded-md border bg-transparent px-3 focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* View Toggle */}
            <div className="flex items-center border rounded-md overflow-hidden">
              <button
                onClick={() => setView("list")}
                className={view === "list" ? "h-7 px-2.5 text-xs bg-primary text-primary-foreground" : "h-7 px-2.5 text-xs text-muted-foreground hover:bg-muted"}
              >
                <List className="size-3.5" />
              </button>
              <button
                onClick={() => setView("board")}
                className={view === "board" ? "h-7 px-2.5 text-xs bg-primary text-primary-foreground" : "h-7 px-2.5 text-xs text-muted-foreground hover:bg-muted"}
              >
                <LayoutGrid className="size-3.5" />
              </button>
            </div>

            <select
              value={sourceFilter}
              onChange={(e) => handleSourceChange(e.target.value)}
              className="h-8 rounded-md border bg-transparent px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">All Sources</option>
              <option value="MARKETPLACE">Marketplace</option>
              <option value="FAIRE_DIRECT">Faire Direct</option>
              <option value="TRADESHOW">Tradeshow</option>
            </select>
            {hasActiveFilters && (
              <button
                onClick={() => { setSearchQuery(""); setSourceFilter("all"); setActiveTab("all"); setPage(1) }}
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <X className="size-3" /> Clear filters
              </button>
            )}
          </div>
          {view === "list" && (
            <div className="flex items-center gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={`h-7 px-2.5 text-xs font-medium rounded-md transition-colors ${
                    activeTab === tab.key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {tab.label} <span className="ml-0.5 opacity-70">{tab.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* List View */}
        {view === "list" && (
          <>
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <div key={i} className="h-11 rounded bg-muted animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Order ID</th>
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left cursor-pointer select-none" onClick={() => toggleSort("retailer")}>
                        <span className="flex items-center">Retailer <SortIcon col="retailer" /></span>
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Store</th>
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">City</th>
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-center cursor-pointer select-none" onClick={() => toggleSort("items")}>
                        <span className="flex items-center justify-center">Items <SortIcon col="items" /></span>
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right cursor-pointer select-none" onClick={() => toggleSort("total")}>
                        <span className="flex items-center justify-end">Total <SortIcon col="total" /></span>
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Source</th>
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left cursor-pointer select-none" onClick={() => toggleSort("date")}>
                        <span className="flex items-center">Date <SortIcon col="date" /></span>
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Status</th>
                      <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOrders.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-12 text-center text-sm text-muted-foreground">
                          No orders found matching your filters
                        </td>
                      </tr>
                    ) : paginatedOrders.map((order) => {
                      const badge = STATE_BADGE[order.state] ?? { variant: "neutral", label: order.state }
                      return (
                        <tr
                          key={order.id}
                          onClick={() => router.push("/orders/" + order.faire_order_id)}
                          className="border-b last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer"
                        >
                          <td className="px-4 py-3.5 text-sm">
                            <span className="text-xs truncate max-w-[100px] inline-block align-bottom" title={order.faire_order_id}>
                              {order.display_id ?? order.faire_order_id.slice(0, 12)}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-sm font-medium">{getRetailerName(order)}</td>
                          <td className="px-4 py-3.5 text-sm">
                            <span className="flex items-center gap-1.5">
                              <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getStoreColor(order.store_id) }} />
                              <span className="text-muted-foreground">{getStoreName(order.store_id)}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-muted-foreground">{getCity(order)}</td>
                          <td className="px-4 py-3.5 text-sm text-center">{order.item_count}</td>
                          <td className="px-4 py-3.5 text-sm text-right font-medium">{formatCents(order.total_cents)}</td>
                          <td className="px-4 py-3.5 text-sm">
                            {order.source && (
                              <span className={`inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded ${order.source === "FAIRE_DIRECT" ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                                {order.source === "FAIRE_DIRECT" ? "Direct" : order.source === "TRADESHOW" ? "Trade" : "Mkt"}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-muted-foreground">{formatDate(order.faire_created_at)}</td>
                          <td className="px-4 py-3.5 text-sm">
                            <span className="inline-flex items-center gap-1.5">
                              <span className={`inline-flex items-center border-0 text-xs font-medium px-2 py-0.5 rounded-full ${BADGE_STYLES[badge.variant]}`}>
                                {badge.label}
                              </span>
                              {trackingMap[order.faire_order_id] && (
                                <span
                                  className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                                    trackingMap[order.faire_order_id].is_delayed
                                      ? "bg-red-50 text-red-700"
                                      : "bg-emerald-50 text-emerald-700"
                                  }`}
                                  title={trackingMap[order.faire_order_id].last_event ?? ""}
                                >
                                  <Truck className="size-2.5" />
                                  {trackingMap[order.faire_order_id].transit_days > 0
                                    ? `${trackingMap[order.faire_order_id].transit_days}d`
                                    : ""}
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-right">
                            <Link href={"/orders/" + order.faire_order_id} onClick={(e) => e.stopPropagation()} className="text-xs text-primary font-medium hover:underline">
                              View
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            <div className="border-t px-4 py-3 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, totalFiltered)} of {totalFiltered} orders{totalCount > totalFiltered ? ` (${totalCount.toLocaleString()} total)` : ""}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="h-7 w-7 flex items-center justify-center rounded-md border text-sm disabled:opacity-30 hover:bg-muted transition-colors"
                >
                  <ChevronLeft className="size-3.5" />
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                  let pageNum: number
                  if (totalPages <= 7) {
                    pageNum = i + 1
                  } else if (page <= 4) {
                    pageNum = i + 1
                  } else if (page >= totalPages - 3) {
                    pageNum = totalPages - 6 + i
                  } else {
                    pageNum = page - 3 + i
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`h-7 w-7 flex items-center justify-center rounded-md text-xs font-medium transition-colors ${
                        page === pageNum ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="h-7 w-7 flex items-center justify-center rounded-md border text-sm disabled:opacity-30 hover:bg-muted transition-colors"
                >
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            </div>
          </>
        )}

        {/* Board View */}
        {view === "board" && (
          <>
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-32 rounded bg-muted animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="p-4 overflow-x-auto">
                <div className="grid grid-cols-5 gap-3">
                  {KANBAN_COLUMNS.map((col) => {
                    const colOrders = ordersByState[col.key] ?? []
                    const isExpanded = expandedColumns[col.key] ?? false
                    const visibleOrders = isExpanded ? colOrders : colOrders.slice(0, col.maxShow)
                    const remaining = colOrders.length - col.maxShow

                    return (
                      <div key={col.key} className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden min-w-[220px]">
                        {/* Column Header */}
                        <div className="px-3 py-2.5 border-b bg-muted/40 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                            <span className="text-xs font-medium uppercase tracking-wide">{col.label}</span>
                          </div>
                          <span className="text-xs font-medium bg-muted px-1.5 py-0.5 rounded">{colOrders.length}</span>
                        </div>

                        {/* Column Body */}
                        <div className="p-2 space-y-2 max-h-[calc(100vh-350px)] overflow-y-auto">
                          {visibleOrders.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-6">No orders</p>
                          )}
                          {visibleOrders.map((order) => (
                            <div
                              key={order.id}
                              onClick={() => router.push("/orders/" + order.faire_order_id)}
                              className="rounded-lg border border-border/80 bg-card shadow-sm p-3 hover:shadow-sm transition-shadow cursor-pointer"
                            >
                              {/* Row 1: ID + Total */}
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium truncate" title={order.faire_order_id}>
                                  {order.display_id ?? order.faire_order_id.slice(0, 12)}
                                </span>
                                <span className="text-xs font-medium">{formatCents(order.total_cents)}</span>
                              </div>

                              {/* Row 2: Retailer */}
                              <p className="text-sm font-medium truncate mt-1">{getRetailerName(order)}</p>

                              {/* Row 3: Store + Source */}
                              <div className="flex items-center justify-between mt-1">
                                <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                                  <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: getStoreColor(order.store_id) }} />
                                  {getStoreName(order.store_id)}
                                </span>
                                {order.source && (
                                  <span className={`inline-flex items-center text-xs font-medium px-1 py-0.5 rounded ${order.source === "FAIRE_DIRECT" ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                                    {order.source === "FAIRE_DIRECT" ? "Direct" : order.source === "TRADESHOW" ? "Trade" : "Mkt"}
                                  </span>
                                )}
                              </div>

                              {/* Row 4: Date */}
                              <p className="text-xs text-muted-foreground mt-1">{formatDate(order.faire_created_at)}</p>

                              {/* Row 5: Action */}
                              {col.key === "NEW" && (
                                <button
                                  onClick={(e) => handleAccept(order.faire_order_id, e)}
                                  disabled={acceptingId === order.faire_order_id}
                                  className="mt-2 w-full h-7 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                                >
                                  {acceptingId === order.faire_order_id ? "Accepting..." : "Accept"}
                                </button>
                              )}
                              {col.key === "PROCESSING" && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setShipDialogOrder(order); setShipTracking(""); setShipCarrier("") }}
                                  className="mt-2 w-full h-7 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                                >
                                  Ship
                                </button>
                              )}
                              {col.key === "IN_TRANSIT" && (
                                <div className="mt-2 flex items-center justify-center gap-1">
                                  {trackingMap[order.faire_order_id] ? (
                                    <span
                                      className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                                        trackingMap[order.faire_order_id].is_delayed
                                          ? "bg-red-50 text-red-700"
                                          : "bg-emerald-50 text-emerald-700"
                                      }`}
                                      title={trackingMap[order.faire_order_id].last_event ?? ""}
                                    >
                                      <Truck className="size-2.5" />
                                      {trackingMap[order.faire_order_id].transit_days > 0
                                        ? `${trackingMap[order.faire_order_id].transit_days}d`
                                        : "In Transit"}
                                    </span>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">In Transit</p>
                                  )}
                                </div>
                              )}
                              {(col.key === "DELIVERED" || col.key === "CANCELED") && (
                                <Link
                                  href={"/orders/" + order.faire_order_id}
                                  onClick={(e) => e.stopPropagation()}
                                  className="mt-2 block w-full h-7 text-xs font-medium rounded-md border text-center leading-7 hover:bg-muted transition-colors"
                                >
                                  View
                                </Link>
                              )}
                            </div>
                          ))}

                          {/* Show more button for collapsed columns */}
                          {!isExpanded && remaining > 0 && (
                            <button
                              onClick={() => toggleColumnExpand(col.key)}
                              className="w-full text-xs text-muted-foreground hover:text-foreground py-2 text-center transition-colors"
                            >
                              Show more ({remaining})
                            </button>
                          )}
                          {isExpanded && remaining > 0 && (
                            <button
                              onClick={() => toggleColumnExpand(col.key)}
                              className="w-full text-xs text-muted-foreground hover:text-foreground py-2 text-center transition-colors"
                            >
                              Show less
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Ship Order Dialog */}
      {shipDialogOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShipDialogOrder(null)} />
          <div className="relative bg-card rounded-lg border shadow-lg w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">
              Ship Order #{shipDialogOrder.display_id ?? shipDialogOrder.faire_order_id.slice(0, 12)}
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Tracking Number</label>
                <input
                  type="text"
                  value={shipTracking}
                  onChange={(e) => setShipTracking(e.target.value)}
                  placeholder="Enter tracking number"
                  className="h-9 w-full rounded-md border bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Carrier</label>
                <select
                  value={shipCarrier}
                  onChange={(e) => setShipCarrier(e.target.value)}
                  className="h-9 w-full rounded-md border bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Select carrier</option>
                  <option value="UPS">UPS</option>
                  <option value="USPS">USPS</option>
                  <option value="FedEx">FedEx</option>
                  <option value="DHL">DHL</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShipDialogOrder(null)}
                className="h-9 px-4 text-sm font-medium rounded-md border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleShip}
                disabled={!shipTracking || !shipCarrier || shipping}
                className="h-9 px-4 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {shipping ? "Shipping..." : "Ship Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
