"use client"

import { useState, useMemo } from "react"
import { Package, Truck, CheckCircle, Clock, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { useOrders } from "@/lib/use-faire-data"
import { useBrandFilter } from "@/lib/brand-filter-context"
import type { FaireOrder } from "@/lib/supabase"

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getRetailerName(order: FaireOrder): string {
  const addr = order.shipping_address as Record<string, unknown> | null
  if (!addr) return "\u2014"
  return (addr.company_name as string) || (addr.name as string) || "\u2014"
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014"
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function daysSince(dateStr: string | null, now: Date): number {
  if (!dateStr) return 0
  const parsed = new Date(dateStr)
  const diff = now.getTime() - parsed.getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

const CARRIERS = ["UPS", "USPS", "FedEx", "DHL", "Other"]

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function FulfillmentPage() {
  const { activeBrand, stores } = useBrandFilter()
  const storeId = activeBrand === "all" ? undefined : activeBrand
  const { orders, loading } = useOrders(storeId, "PROCESSING")

  const now = new Date()
  const [shippedIds, setShippedIds] = useState<Set<string>>(new Set())

  type SortKey = "date" | "total"
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

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1
      switch (sortKey) {
        case "date":
          return dir * ((new Date(a.faire_updated_at ?? 0).getTime()) - (new Date(b.faire_updated_at ?? 0).getTime()))
        case "total":
          return dir * ((a.total_cents ?? 0) - (b.total_cents ?? 0))
        default:
          return 0
      }
    })
  }, [orders, sortKey, sortDir])

  const awaitingTracking = orders.filter((o) => !shippedIds.has(o.id)).length
  const readyToShip = orders.length
  const shippedToday = shippedIds.size
  const avgFulfillmentDays = useMemo(() => {
    if (orders.length === 0) return "0"
    return (orders.reduce((s, o) => s + daysSince(o.faire_updated_at, now), 0) / orders.length).toFixed(1)
  }, [orders])

  function markShipped(id: string) {
    setShippedIds((prev) => new Set(prev).add(id))
  }

  function getStoreName(id: string): string {
    return stores.find((s) => s.id === id)?.name ?? "\u2014"
  }

  function getStoreColor(id: string): string {
    return stores.find((s) => s.id === id)?.color ?? "#94a3b8"
  }

  const STATS = [
    { label: "Awaiting Tracking", value: String(awaitingTracking), trend: "Need tracking info",    icon: Package,     iconBg: "bg-amber-50",   iconColor: "text-amber-600" },
    { label: "Ready to Ship",     value: String(readyToShip),      trend: "Accepted orders",       icon: Truck,       iconBg: "bg-blue-50",    iconColor: "text-blue-600" },
    { label: "Shipped Today",     value: String(shippedToday),     trend: "Including just marked",  icon: CheckCircle, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
    { label: "Avg Fulfillment",   value: `${avgFulfillmentDays}d`, trend: "Days since accepted",    icon: Clock,       iconBg: "bg-purple-50",  iconColor: "text-purple-600" },
  ]

  if (loading) {
    return (
      <div className="space-y-6 max-w-[1440px] mx-auto w-full">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Fulfillment</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Loading...</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-md border bg-muted animate-pulse" />
          ))}
        </div>
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-8 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-[1440px] mx-auto w-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">Fulfillment</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Add tracking and mark orders as shipped</p>
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

      {/* Table */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Order ID</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Retailer</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Brand</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-center">Items</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right cursor-pointer select-none" onClick={() => toggleSort("total")}>
                  <span className="flex items-center justify-end">Total <SortIcon col="total" /></span>
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left cursor-pointer select-none" onClick={() => toggleSort("date")}>
                  <span className="flex items-center">Accepted <SortIcon col="date" /></span>
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-center">Days</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Carrier</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Tracking #</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No orders being processed
                  </td>
                </tr>
              ) : (
                sortedOrders.map((order) => {
                  const daysSinceAccepted = daysSince(order.faire_updated_at, now)
                  const isOverdue = daysSinceAccepted > 2
                  const isMarkedShipped = shippedIds.has(order.id)

                  return (
                    <tr key={order.id} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3.5 text-sm">
                        <span className="text-xs truncate max-w-[120px] inline-block align-bottom" title={order.faire_order_id}>
                          {order.display_id ?? order.faire_order_id.slice(0, 12)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm font-medium">{getRetailerName(order)}</td>
                      <td className="px-4 py-3.5 text-sm">
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getStoreColor(order.store_id) }} />
                          {getStoreName(order.store_id)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-center tabular-nums">{order.item_count}</td>
                      <td className="px-4 py-3.5 text-sm text-right tabular-nums font-medium">${formatCents(order.total_cents)}</td>
                      <td className="px-4 py-3.5 text-sm text-muted-foreground">{formatDate(order.faire_updated_at)}</td>
                      <td className="px-4 py-3.5 text-sm text-center">
                        <span
                          className={`inline-flex items-center border-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                            isOverdue ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {daysSinceAccepted}d
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm">
                        {isMarkedShipped ? (
                          <span className="text-muted-foreground">UPS</span>
                        ) : (
                          <select className="h-8 rounded-md border bg-background px-2 text-xs">
                            {CARRIERS.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-sm">
                        {isMarkedShipped ? (
                          <span className="text-xs text-muted-foreground">Marked</span>
                        ) : (
                          <input
                            type="text"
                            placeholder="Enter tracking #"
                            className="h-8 rounded-md border bg-background px-2 text-xs w-36"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-right">
                        {isMarkedShipped ? (
                          <span className="border-0 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Shipped</span>
                        ) : (
                          <button
                            onClick={() => markShipped(order.id)}
                            className="h-8 gap-1 text-xs inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-3 font-medium hover:bg-primary/90 transition-colors"
                          >
                            Mark Shipped
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t px-4 py-3 text-xs text-muted-foreground">
          Showing {orders.length} orders
        </div>
      </div>
    </div>
  )
}
