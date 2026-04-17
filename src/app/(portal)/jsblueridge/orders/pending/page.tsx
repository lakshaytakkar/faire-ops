"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Clock, DollarSign, AlertTriangle, ShoppingCart, CheckCircle, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { useJSBOrders, useJSBOrderStats } from "@/lib/use-jsblueridge-data"

/* ------------------------------------------------------------------ */
/*  Types & Helpers                                                    */
/* ------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JSBOrder = Record<string, any>

function getRetailerName(order: JSBOrder): string {
  const addr = order.shipping_address as Record<string, unknown> | null
  if (!addr) return "\u2014"
  return (addr.company_name as string) || (addr.name as string) || "\u2014"
}

function getCity(order: JSBOrder): string {
  const addr = order.shipping_address as Record<string, unknown> | null
  if (!addr) return "\u2014"
  return (addr.city as string) || "\u2014"
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

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function JSBPendingOrdersPage() {
  const { orders, loading: ordersLoading } = useJSBOrders("NEW")
  const { stats, loading: statsLoading } = useJSBOrderStats()

  const loading = ordersLoading || statsLoading
  const now = new Date()

  const pendingCount = orders.length
  const totalValueCents = orders.reduce((sum, o) => sum + (o.total_cents ?? 0), 0)

  const daysSinceOldest = useMemo(() => {
    if (pendingCount === 0) return 0
    return Math.max(...orders.map((o) => daysSince(o.faire_created_at, now)))
  }, [orders, pendingCount])

  const avgItems = useMemo(() => {
    if (pendingCount === 0) return "0"
    return (orders.reduce((sum, o) => sum + (o.item_count ?? 0), 0) / pendingCount).toFixed(1)
  }, [orders, pendingCount])

  type SortKey = "date" | "total"
  type SortDir = "asc" | "desc"
  const [sortKey, setSortKey] = useState<SortKey>("date")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [acceptingId, setAcceptingId] = useState<string | null>(null)

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
          return dir * ((new Date(a.faire_created_at ?? 0).getTime()) - (new Date(b.faire_created_at ?? 0).getTime()))
        case "total":
          return dir * ((a.total_cents ?? 0) - (b.total_cents ?? 0))
        default:
          return 0
      }
    })
  }, [orders, sortKey, sortDir])

  async function handleAccept(orderId: string) {
    setAcceptingId(orderId)
    try {
      await fetch(`/api/jsblueridge/orders/${orderId}/accept`, { method: "POST" })
    } catch (err) {
      console.error("Accept failed:", err)
    } finally {
      setAcceptingId(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-[1440px] mx-auto w-full">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Pending Orders</h1>
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

  if (pendingCount === 0) {
    return (
      <div className="space-y-6 max-w-[1440px] mx-auto w-full">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Pending Orders</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">0 orders awaiting action</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="rounded-lg border border-border/80 bg-card shadow-sm p-10 text-center max-w-md">
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-emerald-600" />
            </div>
            <h2 className="text-lg font-semibold font-heading text-foreground">No pending orders</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              All orders have been reviewed. Check back later for new incoming orders.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto w-full">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">Pending Orders</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {pendingCount} orders awaiting action
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Pending Count</p>
            <p className="text-2xl font-bold font-heading mt-2">{pendingCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Orders to review</p>
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(245,158,11,0.1)" }}>
            <ShoppingCart className="h-4 w-4" style={{ color: "#f59e0b" }} />
          </div>
        </div>

        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total Pending Value</p>
            <p className="text-2xl font-bold font-heading mt-2">${formatCents(totalValueCents)}</p>
            <p className="text-xs text-muted-foreground mt-1">Revenue pending</p>
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(34,90,234,0.1)" }}>
            <DollarSign className="h-4 w-4" style={{ color: "#225aea" }} />
          </div>
        </div>

        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Days Since Oldest</p>
            <p className="text-2xl font-bold font-heading mt-2">{daysSinceOldest}d</p>
            <p className="text-xs text-muted-foreground mt-1">Response time matters</p>
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(239,68,68,0.1)" }}>
            <AlertTriangle className="h-4 w-4" style={{ color: "#ef4444" }} />
          </div>
        </div>

        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Avg Items per Order</p>
            <p className="text-2xl font-bold font-heading mt-2">{avgItems}</p>
            <p className="text-xs text-muted-foreground mt-1">Across pending orders</p>
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(16,185,129,0.1)" }}>
            <Clock className="h-4 w-4" style={{ color: "#10b981" }} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <p className="text-sm font-medium text-foreground">
            {pendingCount} pending {pendingCount === 1 ? "order" : "orders"}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Order ID</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Retailer</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">City</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-center">Items</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right cursor-pointer select-none" onClick={() => toggleSort("total")}>
                  <span className="flex items-center justify-end">Total <SortIcon col="total" /></span>
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left cursor-pointer select-none" onClick={() => toggleSort("date")}>
                  <span className="flex items-center">Date <SortIcon col="date" /></span>
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-center">Days Waiting</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedOrders.map((order) => {
                const daysWaiting = daysSince(order.faire_created_at, now)
                const isUrgent = daysWaiting > 2
                return (
                  <tr
                    key={order.id}
                    className="border-b last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3.5 text-sm">
                      <span className="text-xs truncate max-w-[120px] inline-block align-bottom" title={order.faire_order_id}>
                        {order.display_id ?? order.faire_order_id.slice(0, 12)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm">{getRetailerName(order)}</td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground">{getCity(order)}</td>
                    <td className="px-4 py-3.5 text-sm text-center">{order.item_count}</td>
                    <td className="px-4 py-3.5 text-sm text-right">${formatCents(order.total_cents)}</td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground">{formatDate(order.faire_created_at)}</td>
                    <td className="px-4 py-3.5 text-sm text-center">
                      <span
                        className={`inline-flex items-center border-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                          isUrgent ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {daysWaiting}d
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-right">
                      <span className="flex items-center justify-end gap-2">
                        <Link
                          href={`/jsblueridge/orders/${order.faire_order_id}`}
                          className="text-xs text-primary font-medium hover:underline"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => handleAccept(order.faire_order_id)}
                          disabled={acceptingId === order.faire_order_id}
                          className="h-9 gap-1.5 text-sm inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-3 font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          {acceptingId === order.faire_order_id ? "Accepting..." : "Accept"}
                        </button>
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-3 text-xs text-muted-foreground">
          Showing {pendingCount} of {stats.newOrders} pending orders
        </div>
      </div>
    </div>
  )
}
