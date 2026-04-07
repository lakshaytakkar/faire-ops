"use client"

import { useState, useMemo } from "react"
import { DollarSign, TrendingUp, ShoppingCart, Percent, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { useBrandFilter } from "@/lib/brand-filter-context"

/* ------------------------------------------------------------------ */
/*  Static mock monthly data (kept for trend chart)                    */
/* ------------------------------------------------------------------ */

const MONTHLY_REVENUE = [
  { month: "Nov", value: 24800 },
  { month: "Dec", value: 29350 },
  { month: "Jan", value: 26100 },
  { month: "Feb", value: 28900 },
  { month: "Mar", value: 32400 },
  { month: "Apr", value: 36170 },
]

const maxMonthlyRevenue = Math.max(...MONTHLY_REVENUE.map((m) => m.value))

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                   */
/* ------------------------------------------------------------------ */

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<"30" | "90">("30")
  const { activeBrand, stores, storesLoading } = useBrandFilter()
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

  const filtered = useMemo(
    () => activeBrand === "all" ? stores : stores.filter((s) => s.id === activeBrand),
    [activeBrand, stores],
  )

  const totalOrders = filtered.reduce((sum, s) => sum + s.total_orders, 0)
  const totalProducts = filtered.reduce((sum, s) => sum + s.total_products, 0)
  const averageOrdersPerStore = filtered.length > 0 ? Math.round(totalOrders / filtered.length) : 0
  const estimatedCommissionOrders = Math.round(totalOrders * 0.15)

  const STATS = [
    { label: "Total Orders", value: totalOrders.toLocaleString(), trend: activeBrand === "all" ? "Sum of all stores" : "Selected store", icon: DollarSign, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
    { label: "MoM Growth", value: "+12.4%", trend: "vs previous month", icon: TrendingUp, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
    { label: "Avg Orders / Store", value: String(averageOrdersPerStore), trend: `Across ${filtered.length} stores`, icon: ShoppingCart, iconBg: "bg-purple-50", iconColor: "text-purple-600" },
    { label: "Total Products", value: totalProducts.toLocaleString(), trend: "Active listings", icon: Percent, iconBg: "bg-amber-50", iconColor: "text-amber-600" },
  ]

  if (storesLoading) {
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
          <div key={s.label} className="rounded-md border bg-card p-5 flex items-start justify-between">
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

      {/* Revenue Trend */}
      <div className="rounded-md border bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <h2 className="text-sm font-semibold">Revenue Trend</h2>
          <span className="text-xs text-muted-foreground">Last 6 months</span>
        </div>
        <div className="p-5 space-y-3">
          {MONTHLY_REVENUE.map((item) => (
            <div key={item.month} className="flex items-center gap-4">
              <span className="text-xs font-medium text-muted-foreground w-8 shrink-0">
                {item.month}
              </span>
              <div className="flex-1 h-7 bg-muted/30 rounded overflow-hidden">
                <div
                  className="h-full rounded"
                  style={{
                    width: `${(item.value / maxMonthlyRevenue) * 100}%`,
                    backgroundColor: "hsl(223 83% 53%)",
                  }}
                />
              </div>
              <span className="text-sm font-medium w-20 text-right shrink-0">
                ${item.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Store Performance Table */}
      <div className="rounded-md border bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <h2 className="text-sm font-semibold">Store Performance</h2>
          <div className="flex items-center gap-0 rounded-md border overflow-hidden">
            <button
              onClick={() => setPeriod("30")}
              className={`px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                period === "30" ? "bg-foreground text-background" : "bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              30d
            </button>
            <button
              onClick={() => setPeriod("90")}
              className={`px-3 py-1 text-xs font-medium transition-colors cursor-pointer border-l ${
                period === "90" ? "bg-foreground text-background" : "bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              90d
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Store</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Category</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right cursor-pointer select-none" onClick={() => toggleSort("orders")}><span className="flex items-center justify-end">Orders <SortIcon col="orders" /></span></th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right cursor-pointer select-none" onClick={() => toggleSort("products")}><span className="flex items-center justify-end">Products <SortIcon col="products" /></span></th>
              </tr>
            </thead>
            <tbody>
              {[...filtered].sort((a, b) => {
                const dir = sortDir === "asc" ? 1 : -1
                const aOrders = period === "90" ? Math.round(a.total_orders * 2.8) : a.total_orders
                const bOrders = period === "90" ? Math.round(b.total_orders * 2.8) : b.total_orders
                if (sortKey === "orders") return (aOrders - bOrders) * dir
                if (sortKey === "products") return (a.total_products - b.total_products) * dir
                return 0
              }).map((store) => {
                const orders = period === "90" ? Math.round(store.total_orders * 2.8) : store.total_orders
                return (
                  <tr key={store.id} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3.5 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: store.color }} />
                        <span className="font-medium">{store.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground">{store.category}</td>
                    <td className="px-4 py-3.5 text-sm text-right tabular-nums font-medium">{orders.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-sm text-right tabular-nums">{store.total_products}</td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-sm text-muted-foreground">
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
