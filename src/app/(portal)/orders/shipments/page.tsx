"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  Truck,
  Package,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Loader2,
  Copy,
  Check,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useBrandFilter } from "@/lib/brand-filter-context"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ShipmentTracking {
  id: string
  order_id: string
  tracking_code: string
  carrier: string | null
  carrier_code: number
  status: string
  last_event: string | null
  last_event_time: string | null
  origin_country: string | null
  destination_country: string | null
  transit_days: number
  is_delayed: boolean
  delivered_at: string | null
  shipped_at: string | null
  delivery_notification_sent: boolean
  last_checked_at: string | null
  created_at: string
}

interface OrderInfo {
  faire_order_id: string
  display_id: string | null
  store_id: string
  state: string
  total_cents: number
  item_count: number
  shipping_address: Record<string, unknown> | null
  faire_created_at: string | null
  raw_data?: Record<string, unknown> | null
}

type TabKey = "all" | "in_transit" | "delivered" | "delayed" | "exception"

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014"
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "\u2014"
  return new Date(dateStr).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

function formatCents(cents: number): string {
  return "$" + (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getRetailerName(addr: Record<string, unknown> | null): string {
  if (!addr) return "\u2014"
  return (addr.company_name as string) || (addr.name as string) || "\u2014"
}

function statusConfig(status: string): { label: string; cls: string; icon: React.ElementType } {
  switch (status) {
    case "delivered":
      return { label: "Delivered", cls: "bg-emerald-50 text-emerald-700", icon: CheckCircle2 }
    case "in_transit":
      return { label: "In Transit", cls: "bg-blue-50 text-blue-700", icon: Truck }
    case "pending":
      return { label: "Pending", cls: "bg-slate-100 text-slate-600", icon: Clock }
    case "exception":
      return { label: "Exception", cls: "bg-red-50 text-red-700", icon: AlertTriangle }
    default:
      return { label: status || "Unknown", cls: "bg-slate-100 text-slate-600", icon: Package }
  }
}

/* ------------------------------------------------------------------ */
/*  Copy button                                                        */
/* ------------------------------------------------------------------ */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="p-0.5 rounded hover:bg-muted transition-colors"
      title="Copy tracking number"
    >
      {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3 text-muted-foreground" />}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ShipmentsPage() {
  const { activeBrand, stores } = useBrandFilter()
  const [shipments, setShipments] = useState<ShipmentTracking[]>([])
  const [orderMap, setOrderMap] = useState<Record<string, OrderInfo>>({})
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>("all")
  const [searchQuery, setSearchQuery] = useState("")

  type SortKey = "date" | "transit" | "status"
  type SortDir = "asc" | "desc"
  const [sortKey, setSortKey] = useState<SortKey>("date")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("desc") }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="size-3 opacity-30 ml-1" />
    return sortDir === "asc" ? <ArrowUp className="size-3 text-primary ml-1" /> : <ArrowDown className="size-3 text-primary ml-1" />
  }

  // Fetch all shipped/in-transit orders + tracking data
  async function fetchShipments() {
    setLoading(true)

    // 1. Get all orders that are shipped/in-transit/delivered
    const { data: shippedOrders } = await supabase
      .from("faire_orders")
      .select("faire_order_id, display_id, store_id, state, total_cents, item_count, shipping_address, faire_created_at, raw_data")
      .in("state", ["IN_TRANSIT", "PRE_TRANSIT", "DELIVERED"])
      .order("faire_created_at", { ascending: false })
      .limit(500)

    const orders = shippedOrders ?? []
    const oMap: Record<string, OrderInfo> = {}
    for (const o of orders) oMap[o.faire_order_id] = o
    setOrderMap(oMap)

    // 2. Get all tracking entries
    const { data: trackingData } = await supabase
      .from("shipment_tracking")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500)

    const trackingEntries = trackingData ?? []
    const trackingByOrder = new Map<string, ShipmentTracking>()
    for (const t of trackingEntries) trackingByOrder.set(t.order_id, t)

    // 3. Merge: create a shipment entry for every shipped order
    //    Use real tracking data if available, otherwise create a placeholder
    const merged: ShipmentTracking[] = []
    const seenOrderIds = new Set<string>()

    // First add all orders with real tracking
    for (const t of trackingEntries) {
      merged.push(t)
      seenOrderIds.add(t.order_id)
    }

    // Then add orders without tracking entries (shipped but not yet registered with 17Track)
    for (const o of orders) {
      if (seenOrderIds.has(o.faire_order_id)) continue
      // Extract tracking from raw_data.shipments[] array (Faire API structure)
      const raw = o.raw_data as Record<string, unknown> | undefined
      const shipments = (raw?.shipments ?? []) as Array<Record<string, unknown>>
      const firstShipment = shipments[0]
      const trackingCode = (firstShipment?.tracking_code as string) || (raw?.tracking_number as string) || ""
      const carrier = (firstShipment?.carrier as string) || (raw?.carrier as string) || ""

      // If order has multiple shipments, create an entry for each
      if (shipments.length > 1) {
        for (let i = 0; i < shipments.length; i++) {
          const s = shipments[i]
          merged.push({
            id: `order-${o.faire_order_id}-${i}`,
            order_id: o.faire_order_id,
            tracking_code: (s.tracking_code as string) || "",
            carrier: (s.carrier as string) || null,
            carrier_code: 0,
            status: o.state === "DELIVERED" ? "delivered" : "in_transit",
            last_event: null,
            last_event_time: null,
            origin_country: null,
            destination_country: null,
            transit_days: 0,
            is_delayed: false,
            delivered_at: null,
            shipped_at: (s.created_at as string) || null,
            delivery_notification_sent: false,
            last_checked_at: null,
            created_at: (s.created_at as string) || (o.faire_created_at ?? new Date().toISOString()),
          })
        }
      } else {
        merged.push({
          id: `order-${o.faire_order_id}`,
          order_id: o.faire_order_id,
          tracking_code: trackingCode,
          carrier: carrier || null,
          carrier_code: 0,
          status: o.state === "DELIVERED" ? "delivered" : "in_transit",
          last_event: null,
          last_event_time: null,
          origin_country: null,
          destination_country: null,
          transit_days: 0,
          is_delayed: false,
          delivered_at: null,
          shipped_at: (firstShipment?.created_at as string) || null,
          delivery_notification_sent: false,
          last_checked_at: null,
          created_at: o.faire_created_at ?? new Date().toISOString(),
        })
      }
    }

    setShipments(merged)
    setLoading(false)
  }

  useEffect(() => { fetchShipments() }, [])

  // Sync tracking from 17Track
  async function handleSync() {
    setSyncing(true)
    try {
      await fetch("/api/tracking/sync", { method: "POST" })
      await fetchShipments()
    } catch (err) {
      console.error("Sync error:", err)
    }
    setSyncing(false)
  }

  // Filter by brand
  const brandFiltered = useMemo(() => {
    if (activeBrand === "all") return shipments
    return shipments.filter((s) => {
      const order = orderMap[s.order_id]
      return order?.store_id === activeBrand
    })
  }, [shipments, activeBrand, orderMap])

  // Filter by tab
  const tabFiltered = useMemo(() => {
    if (activeTab === "all") return brandFiltered
    if (activeTab === "delayed") return brandFiltered.filter((s) => s.is_delayed)
    return brandFiltered.filter((s) => s.status === activeTab)
  }, [brandFiltered, activeTab])

  // Search
  const searchFiltered = useMemo(() => {
    if (!searchQuery) return tabFiltered
    const q = searchQuery.toLowerCase()
    return tabFiltered.filter((s) => {
      const order = orderMap[s.order_id]
      const orderId = (order?.display_id ?? s.order_id).toLowerCase()
      const retailer = getRetailerName(order?.shipping_address ?? null).toLowerCase()
      const tracking = (s.tracking_code ?? "").toLowerCase()
      return orderId.includes(q) || retailer.includes(q) || tracking.includes(q)
    })
  }, [tabFiltered, searchQuery, orderMap])

  // Sort
  const sorted = useMemo(() => {
    return [...searchFiltered].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1
      switch (sortKey) {
        case "date":
          return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        case "transit":
          return dir * ((a.transit_days ?? 0) - (b.transit_days ?? 0))
        case "status": {
          const order = ["pending", "in_transit", "exception", "delivered"]
          return dir * (order.indexOf(a.status) - order.indexOf(b.status))
        }
        default:
          return 0
      }
    })
  }, [searchFiltered, sortKey, sortDir])

  // Stats
  const totalShipments = brandFiltered.length
  const inTransitCount = brandFiltered.filter((s) => s.status === "in_transit" || s.status === "pending").length
  const deliveredCount = brandFiltered.filter((s) => s.status === "delivered").length
  const delayedCount = brandFiltered.filter((s) => s.is_delayed).length
  const avgTransitDays = useMemo(() => {
    const delivered = brandFiltered.filter((s) => s.status === "delivered" && s.transit_days > 0)
    if (delivered.length === 0) return "0"
    return (delivered.reduce((s, t) => s + t.transit_days, 0) / delivered.length).toFixed(1)
  }, [brandFiltered])

  function getStoreName(id: string): string {
    return stores.find((s) => s.id === id)?.name ?? "\u2014"
  }

  function getStoreColor(id: string): string {
    return stores.find((s) => s.id === id)?.color ?? "#94a3b8"
  }

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "all", label: "All", count: totalShipments },
    { key: "in_transit", label: "In Transit", count: inTransitCount },
    { key: "delivered", label: "Delivered", count: deliveredCount },
    { key: "delayed", label: "Delayed", count: delayedCount },
    { key: "exception", label: "Exceptions", count: brandFiltered.filter((s) => s.status === "exception").length },
  ]

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Shipments</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Loading...</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 rounded-md border bg-muted animate-pulse" />
          ))}
        </div>
        <div className="rounded-md border bg-card p-8 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 rounded bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Shipments</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Track all shipped orders via 17Track
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {syncing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          {syncing ? "Syncing..." : "Sync Tracking"}
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-md border bg-card p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total Shipments</p>
            <p className="text-2xl font-bold font-heading mt-2">{totalShipments}</p>
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-blue-50">
            <Package className="h-4 w-4 text-blue-600" />
          </div>
        </div>
        <div className="rounded-md border bg-card p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">In Transit</p>
            <p className="text-2xl font-bold font-heading mt-2">{inTransitCount}</p>
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-sky-50">
            <Truck className="h-4 w-4 text-sky-600" />
          </div>
        </div>
        <div className="rounded-md border bg-card p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Delivered</p>
            <p className="text-2xl font-bold font-heading mt-2">{deliveredCount}</p>
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-emerald-50">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
        </div>
        <div className="rounded-md border bg-card p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Delayed</p>
            <p className="text-2xl font-bold font-heading mt-2">{delayedCount}</p>
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </div>
        </div>
        <div className="rounded-md border bg-card p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Avg Transit</p>
            <p className="text-2xl font-bold font-heading mt-2">{avgTransitDays}d</p>
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-purple-50">
            <Clock className="h-4 w-4 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search order, retailer, tracking..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-72 pl-8 text-sm rounded-md border bg-transparent px-3 focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`h-8 px-3 text-xs font-medium rounded-md transition-colors ${
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {tab.label}{" "}
                <span className="ml-1 opacity-70">{tab.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Order</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Retailer</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Store</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left cursor-pointer select-none" onClick={() => toggleSort("status")}>
                  <span className="flex items-center">Status <SortIcon col="status" /></span>
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Carrier / Tracking</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Route</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-center cursor-pointer select-none" onClick={() => toggleSort("transit")}>
                  <span className="flex items-center justify-center">Transit <SortIcon col="transit" /></span>
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Last Event</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left cursor-pointer select-none" onClick={() => toggleSort("date")}>
                  <span className="flex items-center">Shipped <SortIcon col="date" /></span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <Truck className="size-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">No shipments found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Shipments appear here when orders are marked as shipped with tracking numbers
                    </p>
                    <button
                      onClick={handleSync}
                      className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border hover:bg-muted transition-colors"
                    >
                      <RefreshCw className="size-3" />
                      Sync Now
                    </button>
                  </td>
                </tr>
              ) : (
                sorted.map((shipment) => {
                  const order = orderMap[shipment.order_id]
                  const sc = statusConfig(shipment.status)
                  const StatusIcon = sc.icon

                  return (
                    <tr key={shipment.id} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                      {/* Order ID */}
                      <td className="px-4 py-3.5 text-sm">
                        <Link
                          href={`/orders/${shipment.order_id}`}
                          className="text-primary hover:underline font-medium"
                        >
                          {order?.display_id ?? shipment.order_id.slice(0, 12)}
                        </Link>
                        {order && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatCents(order.total_cents)} &middot; {order.item_count} items
                          </p>
                        )}
                      </td>

                      {/* Retailer */}
                      <td className="px-4 py-3.5 text-sm font-medium">
                        {getRetailerName(order?.shipping_address ?? null)}
                      </td>

                      {/* Store */}
                      <td className="px-4 py-3.5 text-sm">
                        {order ? (
                          <span className="flex items-center gap-1.5">
                            <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getStoreColor(order.store_id) }} />
                            {getStoreName(order.store_id)}
                          </span>
                        ) : "\u2014"}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-sm">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${sc.cls}`}>
                            <StatusIcon className="size-3" />
                            {sc.label}
                          </span>
                          {shipment.is_delayed && (
                            <span className="inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full bg-red-50 text-red-700">
                              Delayed
                            </span>
                          )}
                          {shipment.delivery_notification_sent && (
                            <span className="inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                              Notified
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Carrier / Tracking */}
                      <td className="px-4 py-3.5 text-sm">
                        <div>
                          {shipment.carrier && (
                            <span className="text-xs font-medium">{shipment.carrier}</span>
                          )}
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-xs text-muted-foreground truncate max-w-[160px]" title={shipment.tracking_code}>
                              {shipment.tracking_code}
                            </span>
                            <CopyButton text={shipment.tracking_code} />
                          </div>
                        </div>
                      </td>

                      {/* Route */}
                      <td className="px-4 py-3.5 text-sm">
                        {shipment.origin_country && shipment.destination_country ? (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="size-3" />
                            {shipment.origin_country} → {shipment.destination_country}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">\u2014</span>
                        )}
                      </td>

                      {/* Transit Days */}
                      <td className="px-4 py-3.5 text-sm text-center">
                        <span
                          className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                            shipment.is_delayed
                              ? "bg-red-50 text-red-700"
                              : shipment.status === "delivered"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {shipment.transit_days}d
                        </span>
                      </td>

                      {/* Last Event */}
                      <td className="px-4 py-3.5 text-sm max-w-[250px]">
                        {shipment.last_event ? (
                          <div>
                            <p className="text-xs leading-tight truncate" title={shipment.last_event}>
                              {shipment.last_event}
                            </p>
                            {shipment.last_event_time && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {formatDateTime(shipment.last_event_time)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No events yet</span>
                        )}
                        {shipment.status === "delivered" && shipment.delivered_at && (
                          <p className="text-xs text-emerald-600 font-medium mt-1">
                            Delivered {formatDate(shipment.delivered_at)}
                          </p>
                        )}
                      </td>

                      {/* Shipped Date */}
                      <td className="px-4 py-3.5 text-sm text-muted-foreground">
                        {formatDate(shipment.shipped_at ?? shipment.created_at)}
                        {shipment.last_checked_at && (
                          <p className="text-xs text-muted-foreground/60 mt-0.5" title="Last checked">
                            Checked {formatDateTime(shipment.last_checked_at)}
                          </p>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>Showing {sorted.length} of {totalShipments} shipments</span>
          {shipments.length > 0 && shipments[0].last_checked_at && (
            <span>Last synced: {formatDateTime(shipments[0].last_checked_at)}</span>
          )}
        </div>
      </div>
    </div>
  )
}
