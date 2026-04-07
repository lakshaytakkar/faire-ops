"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { PageResourcesButton } from "@/components/shared/page-resources"
import {
  Search,
  Package,
  TrendingUp,
  BarChart3,
  Boxes,
  MoreHorizontal,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import { useProducts } from "@/lib/use-faire-data"
import { useBrandFilter } from "@/lib/brand-filter-context"
import type { FaireProduct } from "@/lib/supabase"

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmt(v: number): string {
  return `$${v.toFixed(2)}`
}

function parseCategoryName(cat: string | null): string {
  if (!cat) return "—"
  try {
    const parsed = JSON.parse(cat)
    if (parsed && typeof parsed === "object" && parsed.name) return parsed.name
  } catch { /* not JSON */ }
  return cat
}

function calcMargin(ws: number, msrp: number): number {
  if (msrp === 0) return 0
  return Math.round(((msrp - ws) / msrp) * 100)
}

type LifecycleState = "PUBLISHED" | "DRAFT" | "UNPUBLISHED" | "DELETED"

const STATUS_BADGE: Record<LifecycleState, string> = {
  PUBLISHED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  DRAFT: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  UNPUBLISHED: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  DELETED: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
}

const STATUS_LABEL: Record<LifecycleState, string> = {
  PUBLISHED: "Published",
  DRAFT: "Draft",
  UNPUBLISHED: "Unpublished",
  DELETED: "Deleted",
}

type FilterTab = "all" | "PUBLISHED" | "DRAFT" | "UNPUBLISHED"
type SortKey = "name" | "price" | "stock" | "margin"
type SortDir = "asc" | "desc"

const PAGE_SIZE = 10

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */

function Skeleton() {
  return (
    <div className="space-y-6 max-w-[1440px] mx-auto w-full animate-pulse">
      <div className="h-8 w-48 rounded bg-muted" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-md border bg-card p-5 h-[108px]" />
        ))}
      </div>
      <div className="rounded-md border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b h-14" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="px-4 py-4 border-b flex gap-4">
            <div className="w-9 h-9 rounded-md bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 rounded bg-muted" />
              <div className="h-3 w-32 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ListingsPage() {
  const router = useRouter()
  const { activeBrand, stores } = useBrandFilter()
  const { products, loading } = useProducts(activeBrand === "all" ? undefined : activeBrand)

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<FilterTab>("all")
  const [actionsOpenId, setActionsOpenId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey>("name")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  // Status + search filtered
  const filtered = useMemo(() => {
    let list = products
    if (statusFilter !== "all") {
      list = list.filter((p) => p.lifecycle_state === statusFilter)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        parseCategoryName(p.category).toLowerCase().includes(q) ||
        p.faire_product_id.toLowerCase().includes(q),
      )
    }
    return list
  }, [products, statusFilter, searchQuery])

  // Sort + paginate
  const sorted = useMemo(() => {
    const list = [...filtered]
    list.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name)
          break
        case "price":
          cmp = a.wholesale_price_cents - b.wholesale_price_cents
          break
        case "stock":
          cmp = a.total_inventory - b.total_inventory
          break
        case "margin": {
          const mA = calcMargin(a.wholesale_price_cents / 100, a.retail_price_cents / 100)
          const mB = calcMargin(b.wholesale_price_cents / 100, b.retail_price_cents / 100)
          cmp = mA - mB
          break
        }
      }
      return sortDir === "asc" ? cmp : -cmp
    })
    return list
  }, [filtered, sortKey, sortDir])

  const totalFiltered = sorted.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE))
  const paginatedProducts = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Reset page when filters change
  function handleSearch(q: string) { setSearchQuery(q); setPage(1) }
  function handleStatusChange(t: FilterTab) { setStatusFilter(t); setPage(1) }
  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
    setPage(1)
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return null
    return sortDir === "asc" ? <ArrowUp className="size-3 inline ml-1" /> : <ArrowDown className="size-3 inline ml-1" />
  }

  // Stats
  const totalProducts = products.length
  const publishedCount = products.filter((p) => p.lifecycle_state === "PUBLISHED").length
  const avgWs = totalProducts > 0 ? products.reduce((s, p) => s + p.wholesale_price_cents, 0) / totalProducts / 100 : 0
  const totalInventory = products.reduce((s, p) => s + p.total_inventory, 0)

  // Store lookup helper
  const getStore = (storeId: string) => stores.find((s) => s.id === storeId)

  if (loading) return <Skeleton />

  const statCards = [
    { label: "Total Products", value: String(totalProducts), trend: `${new Set(products.map((p) => p.store_id)).size} brand${new Set(products.map((p) => p.store_id)).size !== 1 ? "s" : ""}`, icon: <Package className="h-4 w-4" />, bg: "rgba(59,130,246,0.1)", color: "#3B82F6" },
    { label: "Published", value: String(publishedCount), trend: `${totalProducts > 0 ? Math.round((publishedCount / totalProducts) * 100) : 0}% of catalog`, icon: <TrendingUp className="h-4 w-4" />, bg: "rgba(16,185,129,0.1)", color: "#10B981" },
    { label: "Avg WS Price", value: fmt(avgWs), trend: `${totalProducts} products`, icon: <BarChart3 className="h-4 w-4" />, bg: "rgba(139,92,246,0.1)", color: "#8B5CF6" },
    { label: "Total Inventory", value: totalInventory.toLocaleString(), trend: "Units across all SKUs", icon: <Boxes className="h-4 w-4" />, bg: "rgba(245,158,11,0.1)", color: "#F59E0B" },
  ]

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "PUBLISHED", label: "Published" },
    { key: "DRAFT", label: "Draft" },
    { key: "UNPUBLISHED", label: "Unpublished" },
  ]

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Listings</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {totalProducts} product{totalProducts !== 1 ? "s" : ""} across your catalog
          </p>
        </div>
        <PageResourcesButton pageRoute="/catalog/listings" />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-md border bg-card p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
              <p className="text-2xl font-bold font-heading mt-2">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.trend}</p>
            </div>
            <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: card.bg, color: card.color }}>
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Products Table */}
      <div className="rounded-md border bg-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="h-8 w-60 pl-8 text-sm rounded-md border bg-background px-3 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-1">
            {filterTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => handleStatusChange(t.key)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${statusFilter === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort("name")}>Product Name<SortIcon col="name" /></th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Brand</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Category</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort("price")}>WS Price<SortIcon col="price" /></th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right">MSRP</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-center cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort("margin")}>Margin %<SortIcon col="margin" /></th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-center cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort("stock")}>Stock<SortIcon col="stock" /></th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-center">Variants</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-center">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-center w-12">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No products found
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product) => {
                  const store = getStore(product.store_id)
                  const wsPrice = product.wholesale_price_cents / 100
                  const retailPrice = product.retail_price_cents / 100
                  const margin = calcMargin(wsPrice, retailPrice)
                  const state = product.lifecycle_state as LifecycleState
                  const badgeCls = STATUS_BADGE[state] ?? STATUS_BADGE.DRAFT
                  const badgeLabel = STATUS_LABEL[state] ?? state

                  return (
                    <tr
                      key={product.id}
                      onClick={() => router.push("/catalog/listings/" + product.faire_product_id)}
                      className="border-b last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer"
                    >
                      {/* Product Name + Faire ID */}
                      <td className="px-4 py-3.5 text-sm">
                        <div className="flex items-center gap-3">
                          {product.primary_image_url ? (
                            <img
                              src={product.primary_image_url}
                              alt={product.name}
                              className="w-9 h-9 rounded-md object-cover bg-muted"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-md bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center shrink-0">
                              <Package className="size-4 text-muted-foreground/50" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-medium block truncate max-w-[280px]">{product.name}</span>
                            <p className="text-xs text-muted-foreground mt-0.5">{product.faire_product_id}</p>
                          </div>
                        </div>
                      </td>

                      {/* Brand */}
                      <td className="px-4 py-3.5 text-sm">
                        {store ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: store.color }} />
                            <span className="text-muted-foreground">{store.name}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3.5 text-sm">
                        <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {parseCategoryName(product.category)}
                        </span>
                      </td>

                      {/* WS Price */}
                      <td className="px-4 py-3.5 text-sm text-right font-medium">{fmt(wsPrice)}</td>

                      {/* MSRP */}
                      <td className="px-4 py-3.5 text-sm text-right text-muted-foreground">{fmt(retailPrice)}</td>

                      {/* Margin % */}
                      <td className="px-4 py-3.5 text-sm text-center">
                        <span className={`font-medium ${margin >= 50 ? "text-emerald-600" : margin >= 40 ? "text-foreground" : "text-amber-600"}`}>
                          {margin}%
                        </span>
                      </td>

                      {/* Stock */}
                      <td className="px-4 py-3.5 text-sm text-center">
                        <span className={`font-medium ${product.total_inventory === 0 ? "text-red-600" : product.total_inventory < 10 ? "text-amber-600" : "text-foreground"}`}>
                          {product.total_inventory === 0 ? "\u2014" : product.total_inventory}
                        </span>
                      </td>

                      {/* Variants */}
                      <td className="px-4 py-3.5 text-sm text-center text-muted-foreground">{product.variant_count}</td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-sm text-center">
                        <span className={`border-0 text-xs font-medium px-2 py-0.5 rounded-full ${badgeCls}`}>
                          {badgeLabel}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-sm text-center" data-actions>
                        <div className="relative inline-block">
                          <button
                            data-actions
                            onClick={(e) => {
                              e.stopPropagation()
                              setActionsOpenId(actionsOpenId === product.id ? null : product.id)
                            }}
                            className="p-1 rounded hover:bg-muted transition-colors"
                          >
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                          </button>
                          {actionsOpenId === product.id && (
                            <div
                              data-actions
                              className="absolute right-0 top-8 z-30 w-48 rounded-md border bg-card shadow-lg py-1"
                            >
                              <a
                                href={`https://www.faire.com/product/${product.faire_product_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                                onClick={() => setActionsOpenId(null)}
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                View on Faire
                              </a>
                              {product.tags && product.tags.length > 0 && (
                                <div className="px-3 py-1.5 text-xs text-muted-foreground border-t mt-1 pt-1.5">
                                  <span className="font-medium">Tags:</span>{" "}
                                  {product.tags.join(", ")}
                                </div>
                              )}
                              {product.made_in_country && (
                                <div className="px-3 py-1.5 text-xs text-muted-foreground">
                                  <span className="font-medium">Made in:</span>{" "}
                                  {product.made_in_country}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="border-t px-4 py-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {totalFiltered === 0 ? 0 : ((page - 1) * PAGE_SIZE) + 1}&ndash;{Math.min(page * PAGE_SIZE, totalFiltered)} of {totalFiltered} products
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
      </div>
    </div>
  )
}
