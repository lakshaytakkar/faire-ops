"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  Package,
  TrendingUp,
  Trophy,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { FilterBar, type FilterTab } from "@/components/shared/filter-bar"
import { StatusBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { formatCurrency, formatDate } from "@/lib/format"

export interface ProductRow {
  id: string
  title: string | null
  image: string | null
  category_id: string | null
  supplier_id: string | null
  buy_price: number | null
  sell_price: number | null
  profit_per_order: number | null
  in_stock: boolean | null
  created_at: string | null
}

export interface MetaRow {
  id: string
  is_winning: boolean | null
  is_trending: boolean | null
  profit_margin: number | null
  pot_revenue: number | null
  items_sold: number | null
}

type SortKey = "title" | "sell" | "buy" | "profit" | "date"
type SortDir = "asc" | "desc"

const PAGE_SIZE = 50

export function ProductsClient({
  rows,
  catMap,
  supMap,
  metaMap,
  catDistribution,
  categories,
}: {
  rows: ProductRow[]
  catMap: Record<string, string>
  supMap: Record<string, string>
  metaMap: Record<string, MetaRow>
  catDistribution: [string, number][]
  categories: { id: string; name: string }[]
}) {
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [sortKey, setSortKey] = useState<SortKey>("date")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [page, setPage] = useState(1)
  const [showCatChart, setShowCatChart] = useState(true)

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else {
      setSortKey(key)
      setSortDir("desc")
    }
    setPage(1)
  }

  /* Tab counts */
  const tabs: FilterTab[] = useMemo(() => {
    const trending = rows.filter((r) => metaMap[r.id]?.is_trending).length
    const winning = rows.filter((r) => metaMap[r.id]?.is_winning).length
    const inStock = rows.filter((r) => r.in_stock).length
    const outStock = rows.filter((r) => !r.in_stock).length
    return [
      { id: "all", label: "All", count: rows.length },
      { id: "trending", label: "Trending", count: trending },
      { id: "winning", label: "Winning", count: winning },
      { id: "in_stock", label: "In Stock", count: inStock },
      { id: "out", label: "Out of Stock", count: outStock },
    ]
  }, [rows, metaMap])

  /* Filter + sort */
  const filtered = useMemo(() => {
    let out = rows.filter((r) => {
      if (activeTab === "trending" && !metaMap[r.id]?.is_trending) return false
      if (activeTab === "winning" && !metaMap[r.id]?.is_winning) return false
      if (activeTab === "in_stock" && !r.in_stock) return false
      if (activeTab === "out" && r.in_stock) return false

      if (categoryFilter !== "all" && r.category_id !== categoryFilter) return false

      if (search) {
        const needle = search.toLowerCase()
        const hay = [r.title, r.category_id ? catMap[r.category_id] : null, r.supplier_id ? supMap[r.supplier_id] : null]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })

    out.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1
      switch (sortKey) {
        case "title":
          return ((a.title ?? "").localeCompare(b.title ?? "")) * dir
        case "sell":
          return ((a.sell_price ?? 0) - (b.sell_price ?? 0)) * dir
        case "buy":
          return ((a.buy_price ?? 0) - (b.buy_price ?? 0)) * dir
        case "profit":
          return ((a.profit_per_order ?? 0) - (b.profit_per_order ?? 0)) * dir
        case "date":
          return ((a.created_at ?? "").localeCompare(b.created_at ?? "")) * dir
        default:
          return 0
      }
    })

    return out
  }, [rows, activeTab, categoryFilter, search, sortKey, sortDir, catMap, supMap, metaMap])

  /* Pagination */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const maxCatCount = catDistribution.length > 0 ? catDistribution[0][1] : 1

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="size-3 opacity-30 ml-1 inline" />
    return sortDir === "asc" ? (
      <ArrowUp className="size-3 text-primary ml-1 inline" />
    ) : (
      <ArrowDown className="size-3 text-primary ml-1 inline" />
    )
  }

  return (
    <>
      {/* ── Filter Bar ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <FilterBar
            search={{ value: search, onChange: (v) => { setSearch(v); setPage(1) }, placeholder: "Search products…" }}
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={(t) => { setActiveTab(t); setPage(1) }}
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* ── Category Distribution ────────────────────────────── */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowCatChart(!showCatChart)}
          className="flex items-center justify-between w-full border-b px-5 py-3.5 hover:bg-muted/20 transition-colors"
        >
          <span className="text-[0.9375rem] font-semibold tracking-tight">
            Category Distribution
          </span>
          {showCatChart ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
        </button>
        {showCatChart && (
          <div className="p-5 space-y-2.5">
            {catDistribution.map(([name, count]) => (
              <div key={name} className="flex items-center gap-3">
                <span className="text-sm w-[180px] truncate shrink-0">{name}</span>
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div
                    className="bg-violet-500 h-2 rounded-full transition-all"
                    style={{ width: `${(count / maxCatCount) * 100}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground tabular-nums w-[50px] text-right shrink-0">
                  {count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Results Summary ──────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filtered.length.toLocaleString()} products
          {categoryFilter !== "all" && " in this category"}
          {search && ` matching "${search}"`}
        </p>
        <p className="text-sm text-muted-foreground tabular-nums">
          Page {safePage} of {totalPages}
        </p>
      </div>

      {/* ── Product Table ────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products match"
          description="Adjust filters or clear the search."
        />
      ) : (
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/30 border-b">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 min-w-[280px]">
                    Product
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">
                    Category
                  </th>
                  <th
                    className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5 cursor-pointer select-none"
                    onClick={() => toggleSort("sell")}
                  >
                    <span className="flex items-center justify-end">
                      Sell <SortIcon col="sell" />
                    </span>
                  </th>
                  <th
                    className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5 cursor-pointer select-none"
                    onClick={() => toggleSort("buy")}
                  >
                    <span className="flex items-center justify-end">
                      Buy <SortIcon col="buy" />
                    </span>
                  </th>
                  <th
                    className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5 cursor-pointer select-none"
                    onClick={() => toggleSort("profit")}
                  >
                    <span className="flex items-center justify-end">
                      Profit <SortIcon col="profit" />
                    </span>
                  </th>
                  <th className="text-center text-xs font-medium text-muted-foreground px-4 py-2.5 w-[80px]">
                    Signals
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-[80px]">
                    Stock
                  </th>
                  <th
                    className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 cursor-pointer select-none w-[100px]"
                    onClick={() => toggleSort("date")}
                  >
                    <span className="flex items-center">
                      Added <SortIcon col="date" />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paged.map((p) => {
                  const meta = metaMap[p.id]
                  return (
                    <tr
                      key={p.id}
                      className="border-b last:border-b-0 hover:bg-muted/40 transition-colors"
                    >
                      {/* Product cell */}
                      <td className="px-4 py-3">
                        <Link
                          href={`/usdrop/products/${p.id}`}
                          className="flex items-center gap-3 hover:text-primary"
                        >
                          {p.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.image}
                              alt=""
                              className="size-10 rounded-lg object-cover bg-muted shrink-0 border border-border/60"
                              loading="lazy"
                            />
                          ) : (
                            <span className="size-10 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                              <Package className="size-4" />
                            </span>
                          )}
                          <span className="text-sm font-medium line-clamp-2 min-w-0">
                            {p.title ?? "Untitled"}
                          </span>
                        </Link>
                      </td>
                      {/* Category */}
                      <td className="px-4 py-3">
                        {p.category_id ? (
                          <StatusBadge tone="slate">
                            {catMap[p.category_id] ?? "—"}
                          </StatusBadge>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </td>
                      {/* Sell */}
                      <td className="px-4 py-3 text-right text-sm font-medium tabular-nums">
                        {formatCurrency(p.sell_price, "$")}
                      </td>
                      {/* Buy */}
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-muted-foreground">
                        {formatCurrency(p.buy_price, "$")}
                      </td>
                      {/* Profit */}
                      <td className="px-4 py-3 text-right text-sm tabular-nums">
                        <span className={(p.profit_per_order ?? 0) > 0 ? "text-emerald-600 font-medium" : "text-muted-foreground"}>
                          {formatCurrency(p.profit_per_order, "$")}
                        </span>
                      </td>
                      {/* Signals */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {meta?.is_trending && (
                            <span title="Trending" className="inline-flex size-6 items-center justify-center rounded-md bg-amber-500/10">
                              <TrendingUp className="size-3.5 text-amber-600" />
                            </span>
                          )}
                          {meta?.is_winning && (
                            <span title="Winning" className="inline-flex size-6 items-center justify-center rounded-md bg-emerald-500/10">
                              <Trophy className="size-3.5 text-emerald-600" />
                            </span>
                          )}
                          {!meta?.is_trending && !meta?.is_winning && (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </div>
                      </td>
                      {/* Stock */}
                      <td className="px-4 py-3">
                        <StatusBadge tone={p.in_stock ? "emerald" : "red"}>
                          {p.in_stock ? "In stock" : "Out"}
                        </StatusBadge>
                      </td>
                      {/* Date */}
                      <td className="px-4 py-3 text-sm text-muted-foreground tabular-nums">
                        {formatDate(p.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Pagination ───────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-2">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="h-8 w-8 rounded-md border flex items-center justify-center hover:bg-muted/40 disabled:opacity-30"
          >
            <ChevronLeft className="size-4" />
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let pageNum: number
            if (totalPages <= 7) {
              pageNum = i + 1
            } else if (safePage <= 4) {
              pageNum = i + 1
            } else if (safePage >= totalPages - 3) {
              pageNum = totalPages - 6 + i
            } else {
              pageNum = safePage - 3 + i
            }
            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => setPage(pageNum)}
                className={`h-8 w-8 rounded-md text-sm font-medium transition-colors ${
                  pageNum === safePage
                    ? "bg-primary text-primary-foreground"
                    : "border hover:bg-muted/40"
                }`}
              >
                {pageNum}
              </button>
            )
          })}
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="h-8 w-8 rounded-md border flex items-center justify-center hover:bg-muted/40 disabled:opacity-30"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </>
  )
}
