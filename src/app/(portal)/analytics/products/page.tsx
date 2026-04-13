"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Package,
  TrendingUp,
  AlertCircle,
  Trophy,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react"
import { useBrandFilter } from "@/lib/brand-filter-context"
import { useProducts, useOrders } from "@/lib/use-faire-data"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ProductStats {
  orders: number
  revenue: number
  quantity: number
}

interface CategoryStats {
  name: string
  products: number
  orders: number
  revenue: number
}

interface StoreProductStats {
  storeId: string
  storeName: string
  storeColor: string
  products: number
  productsWithOrders: number
  bestseller: string
  revenue: number
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function parseCategory(categoryJson: string | null): string {
  if (!categoryJson) return "Uncategorized"
  try {
    const parsed = JSON.parse(categoryJson)
    if (typeof parsed === "string") return parsed
    if (parsed?.name) return parsed.name
    if (Array.isArray(parsed) && parsed.length > 0) {
      const last = parsed[parsed.length - 1]
      return typeof last === "string" ? last : last?.name ?? "Uncategorized"
    }
    return String(parsed)
  } catch {
    return categoryJson || "Uncategorized"
  }
}

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 0
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

type SortMode = "orders" | "revenue" | "inventory" | "newest"

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "orders", label: "Most Orders" },
  { value: "revenue", label: "Most Revenue" },
  { value: "inventory", label: "Most Inventory" },
  { value: "newest", label: "Newest" },
]

const BAR_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
]

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ProductAnalyticsPage() {
  const router = useRouter()
  const { activeBrand, stores, storesLoading } = useBrandFilter()
  const storeFilter = activeBrand === "all" ? undefined : activeBrand
  // Capped at 200 historically — that meant bestsellers, category stats and
  // per-store bestsellers were all computed over the 200 newest orders / 200
  // products only. Any product whose orders were outside that window was
  // silently excluded from the rankings. Bumped to a wider window that
  // comfortably covers current data volume (~1.8k orders, products grow
  // slower). TODO: move these aggregations to b2b.faire_bestsellers RPC
  // (already exists) when we next touch this page.
  const { products, loading: productsLoading } = useProducts(storeFilter, 5000)
  const { orders, loading: ordersLoading } = useOrders(storeFilter, undefined, 10000)

  const [sortMode, setSortMode] = useState<SortMode>("orders")
  const [zeroOrdersOpen, setZeroOrdersOpen] = useState(false)

  const loading = storesLoading || productsLoading || ordersLoading

  /* ---- Resolve store info ---- */
  function storeName(storeId: string) {
    return stores.find((s) => s.id === storeId)?.name ?? "Unknown"
  }
  function storeColor(storeId: string) {
    return stores.find((s) => s.id === storeId)?.color ?? "#6b7280"
  }

  /* ---- Build product order map ---- */
  const productOrderMap = useMemo(() => {
    const map: Record<string, ProductStats> = {}
    for (const order of orders) {
      const items = (order.raw_data as any)?.items ?? []
      for (const item of items) {
        const pid = item.product_id
        if (!pid) continue
        if (!map[pid]) map[pid] = { orders: 0, revenue: 0, quantity: 0 }
        map[pid].orders++
        map[pid].revenue += (item.price_cents ?? 0) * (item.quantity ?? 1)
        map[pid].quantity += item.quantity ?? 1
      }
    }
    return map
  }, [orders])

  /* ---- Enrich products with stats ---- */
  const enrichedProducts = useMemo(() => {
    return products.map((p) => {
      const stats = productOrderMap[p.faire_product_id] ?? { orders: 0, revenue: 0, quantity: 0 }
      return { ...p, orderCount: stats.orders, orderRevenue: stats.revenue, unitsSold: stats.quantity }
    })
  }, [products, productOrderMap])

  /* ---- Top 20 bestsellers ---- */
  const bestsellers = useMemo(() => {
    const sorted = [...enrichedProducts]
    switch (sortMode) {
      case "orders": sorted.sort((a, b) => b.orderCount - a.orderCount); break
      case "revenue": sorted.sort((a, b) => b.orderRevenue - a.orderRevenue); break
      case "inventory": sorted.sort((a, b) => b.total_inventory - a.total_inventory); break
      case "newest": sorted.sort((a, b) => new Date(b.faire_created_at ?? 0).getTime() - new Date(a.faire_created_at ?? 0).getTime()); break
    }
    return sorted.slice(0, 20)
  }, [enrichedProducts, sortMode])

  /* ---- Category analytics ---- */
  const categoryStats = useMemo(() => {
    const map: Record<string, CategoryStats> = {}
    for (const p of enrichedProducts) {
      const cat = parseCategory(p.category)
      if (!map[cat]) map[cat] = { name: cat, products: 0, orders: 0, revenue: 0 }
      map[cat].products++
      map[cat].orders += p.orderCount
      map[cat].revenue += p.orderRevenue
    }
    return Object.values(map).sort((a, b) => b.revenue - a.revenue)
  }, [enrichedProducts])

  const totalCategoryRevenue = categoryStats.reduce((s, c) => s + c.revenue, 0)
  const topCategories = categoryStats.slice(0, 10)
  const maxCategoryRevenue = topCategories.length > 0 ? topCategories[0].revenue : 1

  /* ---- Zero-order products ---- */
  const zeroOrderProducts = useMemo(() => {
    return enrichedProducts
      .filter((p) => p.orderCount === 0)
      .sort((a, b) => b.total_inventory - a.total_inventory)
  }, [enrichedProducts])

  /* ---- Store-wise performance ---- */
  const storePerformance = useMemo(() => {
    const map: Record<string, StoreProductStats> = {}
    for (const p of enrichedProducts) {
      if (!map[p.store_id]) {
        map[p.store_id] = {
          storeId: p.store_id,
          storeName: storeName(p.store_id),
          storeColor: storeColor(p.store_id),
          products: 0,
          productsWithOrders: 0,
          bestseller: "",
          revenue: 0,
        }
      }
      map[p.store_id].products++
      if (p.orderCount > 0) map[p.store_id].productsWithOrders++
      map[p.store_id].revenue += p.orderRevenue
    }
    // Find bestseller per store
    for (const p of enrichedProducts) {
      const entry = map[p.store_id]
      if (!entry) continue
      const currentBest = enrichedProducts.find((ep) => ep.name === entry.bestseller)
      if (!currentBest || p.orderCount > currentBest.orderCount) {
        entry.bestseller = p.name
      }
    }
    return Object.values(map).sort((a, b) => b.revenue - a.revenue)
  }, [enrichedProducts, stores])

  /* ---- Aggregate stats ---- */
  const totalProducts = enrichedProducts.length
  const productsWithOrders = enrichedProducts.filter((p) => p.orderCount > 0).length
  const bestseller = enrichedProducts.length > 0
    ? [...enrichedProducts].sort((a, b) => b.orderCount - a.orderCount)[0]
    : null
  const zeroOrderCount = totalProducts - productsWithOrders

  /* ---- Loading state ---- */
  if (loading) {
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
        <Skeleton className="h-96 rounded-md" />
        <Skeleton className="h-64 rounded-md" />
        <Skeleton className="h-64 rounded-md" />
      </div>
    )
  }

  const STATS = [
    {
      label: "Total Products",
      value: totalProducts.toLocaleString(),
      sub: "Across all brands",
      icon: Package,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      label: "Products with Orders",
      value: productsWithOrders.toLocaleString(),
      sub: `${totalProducts > 0 ? ((productsWithOrders / totalProducts) * 100).toFixed(1) : 0}% of catalog`,
      icon: TrendingUp,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      label: "Bestseller",
      value: bestseller ? bestseller.name.substring(0, 22) + (bestseller.name.length > 22 ? "..." : "") : "--",
      sub: bestseller ? `${bestseller.orderCount} orders` : "N/A",
      icon: Trophy,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
    {
      label: "Zero-Order Products",
      value: zeroOrderCount.toLocaleString(),
      sub: "Need attention",
      icon: AlertCircle,
      iconBg: "bg-red-50",
      iconColor: "text-red-600",
    },
  ]

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* ---- Header ---- */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">Product Analytics</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Bestsellers, categories, and performance insights</p>
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

      {/* ---- Sort Controls ---- */}
      <div className="flex items-center gap-2">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSortMode(opt.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
              sortMode === opt.value
                ? "bg-primary text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* ---- Bestseller Products Table ---- */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b">
          <h2 className="text-sm font-semibold">Top Selling Products (by orders)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left w-10">#</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Product</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Store</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Category</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right">Orders</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right">Units Sold</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right">Revenue</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right">Avg Price</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right">Inventory</th>
              </tr>
            </thead>
            <tbody>
              {bestsellers.map((product, idx) => {
                const cat = parseCategory(product.category)
                const avgPrice = product.unitsSold > 0 ? product.orderRevenue / product.unitsSold : product.wholesale_price_cents
                return (
                  <tr
                    key={product.id}
                    className="border-b last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => router.push(`/catalog/listings/${product.faire_product_id}`)}
                  >
                    <td className="px-4 py-3.5 text-sm text-muted-foreground tabular-nums">{idx + 1}</td>
                    <td className="px-4 py-3.5 text-sm">
                      <div className="flex items-center gap-3">
                        {product.primary_image_url ? (
                          <img
                            src={product.primary_image_url}
                            alt=""
                            className="h-8 w-8 rounded object-cover shrink-0"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded bg-muted/60 flex items-center justify-center shrink-0">
                            <Package className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                        )}
                        <span className="font-medium truncate max-w-[220px]">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: storeColor(product.store_id) }}
                        />
                        <span className="text-muted-foreground truncate max-w-[120px]">{storeName(product.store_id)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm">
                      <span className="border-0 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                        {cat.length > 20 ? cat.substring(0, 20) + "..." : cat}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-right tabular-nums font-medium">{product.orderCount.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-sm text-right tabular-nums">{product.unitsSold.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-sm text-right tabular-nums font-medium">{formatCurrency(product.orderRevenue)}</td>
                    <td className="px-4 py-3.5 text-sm text-right tabular-nums">{formatCurrency(avgPrice)}</td>
                    <td className="px-4 py-3.5 text-sm text-right tabular-nums">{product.total_inventory.toLocaleString()}</td>
                  </tr>
                )
              })}
              {bestsellers.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t px-4 py-3 text-xs text-muted-foreground">
          Showing top {bestsellers.length} of {totalProducts} products
        </div>
      </div>

      {/* ---- Category Performance ---- */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b">
          <h2 className="text-sm font-semibold">Performance by Category</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Category</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right">Products</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right">Orders</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right">Revenue</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right">Avg Orders/Product</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right">Revenue Share</th>
              </tr>
            </thead>
            <tbody>
              {categoryStats.map((cat) => {
                const avgOrders = cat.products > 0 ? (cat.orders / cat.products).toFixed(1) : "0"
                const share = totalCategoryRevenue > 0 ? ((cat.revenue / totalCategoryRevenue) * 100).toFixed(1) : "0"
                return (
                  <tr key={cat.name} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3.5 text-sm font-medium">{cat.name}</td>
                    <td className="px-4 py-3.5 text-sm text-right tabular-nums">{cat.products.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-sm text-right tabular-nums">{cat.orders.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-sm text-right tabular-nums font-medium">{formatCurrency(cat.revenue)}</td>
                    <td className="px-4 py-3.5 text-sm text-right tabular-nums">{avgOrders}</td>
                    <td className="px-4 py-3.5 text-sm text-right tabular-nums">{share}%</td>
                  </tr>
                )
              })}
              {categoryStats.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No category data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Category Revenue Bar Chart */}
        {topCategories.length > 0 && (
          <div className="border-t p-5 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Revenue by Category (Top 10)</p>
            {topCategories.map((cat, i) => {
              const pct = totalCategoryRevenue > 0 ? ((cat.revenue / totalCategoryRevenue) * 100).toFixed(1) : "0"
              return (
                <div key={cat.name} className="flex items-center gap-4">
                  <div className="w-40 shrink-0">
                    <span className="text-xs font-medium text-muted-foreground truncate block">{cat.name}</span>
                  </div>
                  <div className="flex-1 h-7 bg-muted/30 rounded overflow-hidden">
                    <div
                      className="h-full rounded"
                      style={{
                        width: `${maxCategoryRevenue > 0 ? (cat.revenue / maxCategoryRevenue) * 100 : 0}%`,
                        backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium w-24 text-right shrink-0 tabular-nums">
                    {formatCurrency(cat.revenue)}
                  </span>
                  <span className="text-xs text-muted-foreground w-12 text-right shrink-0 tabular-nums">
                    {pct}%
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ---- Zero-Order Products (collapsible) ---- */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <button
          onClick={() => setZeroOrdersOpen((o) => !o)}
          className="w-full flex items-center justify-between px-5 py-3.5 border-b hover:bg-muted/20 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Products Without Orders</h2>
            <span className="border-0 text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700">
              {zeroOrderCount}
            </span>
          </div>
          {zeroOrdersOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {zeroOrdersOpen && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Product</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Store</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right">Inventory</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right">Days Listed</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {zeroOrderProducts.slice(0, 50).map((product) => (
                    <tr key={product.id} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3.5 text-sm">
                        <div className="flex items-center gap-3">
                          {product.primary_image_url ? (
                            <img
                              src={product.primary_image_url}
                              alt=""
                              className="h-8 w-8 rounded object-cover shrink-0"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded bg-muted/60 flex items-center justify-center shrink-0">
                              <Package className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                          )}
                          <span className="font-medium truncate max-w-[240px]">{product.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: storeColor(product.store_id) }}
                          />
                          <span className="text-muted-foreground">{storeName(product.store_id)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-right tabular-nums">{product.total_inventory.toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-sm text-right tabular-nums text-muted-foreground">
                        {daysSince(product.faire_created_at)}
                      </td>
                      <td className="px-4 py-3.5 text-sm">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/catalog/listings/${product.faire_product_id}`)
                          }}
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                        >
                          View Product
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {zeroOrderProducts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                        All products have orders. Great job!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {zeroOrderProducts.length > 50 && (
              <div className="border-t px-4 py-3 text-xs text-muted-foreground">
                Showing 50 of {zeroOrderProducts.length} zero-order products
              </div>
            )}
          </>
        )}
      </div>

      {/* ---- Store-wise Product Performance ---- */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b">
          <h2 className="text-sm font-semibold">Products per Store</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Store</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right">Products</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right">With Orders</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Bestseller Product</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {storePerformance.map((sp) => (
                <tr key={sp.storeId} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3.5 text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: sp.storeColor }}
                      />
                      <span className="font-medium">{sp.storeName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-right tabular-nums">{sp.products.toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-sm text-right tabular-nums">{sp.productsWithOrders.toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground truncate max-w-[200px]">
                    {sp.bestseller || "--"}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-right tabular-nums font-medium">{formatCurrency(sp.revenue)}</td>
                </tr>
              ))}
              {storePerformance.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No store data available.
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
