"use client"

import { useState, useMemo, useCallback, Fragment } from "react"
import Link from "next/link"
import {
  Package,
  AlertTriangle,
  XCircle,
  Clock,
  Plus,
  Minus,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useBrandFilter } from "@/lib/brand-filter-context"
import { useProducts } from "@/lib/use-faire-data"
import type { FaireProduct } from "@/lib/supabase"

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

type ComputedStatus = "in_stock" | "low_stock" | "out_of_stock"

function computeStatus(stock: number, minStock: number): ComputedStatus {
  if (stock === 0) return "out_of_stock"
  if (stock < minStock) return "low_stock"
  return "in_stock"
}

const STATUS_BADGE: Record<ComputedStatus, string> = {
  in_stock: "bg-emerald-50 text-emerald-700",
  low_stock: "bg-amber-50 text-amber-700",
  out_of_stock: "bg-red-50 text-red-700",
}

const STATUS_LABEL: Record<ComputedStatus, string> = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
}

const REASONS = [
  "Received Shipment",
  "Inventory Count",
  "Damaged/Lost",
  "Customer Return",
  "Other",
] as const

// Derive a reasonable min stock threshold from the product
function getMinStock(product: FaireProduct): number {
  return product.minimum_order_quantity > 0 ? product.minimum_order_quantity : 10
}

/* ------------------------------------------------------------------ */
/*  Adjust Stock Dialog                                                */
/* ------------------------------------------------------------------ */

function AdjustStockDialog({
  productNames,
  currentStock,
  onClose,
  onApply,
}: {
  productNames: string[]
  currentStock: number | null
  onClose: () => void
  onApply: (change: number, reason: string, notes: string) => void
}) {
  const [adjustment, setAdjustment] = useState(0)
  const [reason, setReason] = useState<string>(REASONS[0])
  const [notes, setNotes] = useState("")
  const isBulk = productNames.length > 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-lg border bg-card shadow-xl">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-bold font-heading">
            {isBulk
              ? `Bulk Adjust Stock \u2014 ${productNames.length} items`
              : `Adjust Stock \u2014 ${productNames[0]}`}
          </h2>
        </div>

        <div className="space-y-5 px-6 py-5">
          {currentStock !== null && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Current Stock</p>
              <p className="text-3xl font-bold font-heading mt-1">{currentStock}</p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-foreground">Adjustment</label>
            <div className="mt-1.5 flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setAdjustment((v) => v - 1)}>
                <Minus className="size-4" />
              </Button>
              <Input
                type="number"
                value={adjustment}
                onChange={(e) => setAdjustment(parseInt(e.target.value) || 0)}
                className="text-center text-base [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <Button variant="outline" size="icon" onClick={() => setAdjustment((v) => v + 1)}>
                <Plus className="size-4" />
              </Button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Reason</label>
            <div className="mt-1.5">
              <Select value={reason} onValueChange={(v) => setReason(v ?? REASONS[0])}>
                <SelectTrigger className="h-8 w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1.5 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none"
              placeholder="Add any notes..."
            />
          </div>

          {currentStock !== null && (
            <div className="rounded-md bg-muted/40 px-4 py-3 text-sm">
              <span className="text-muted-foreground">New stock level: </span>
              <span className="font-bold">
                {Math.max(0, currentStock + adjustment)}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-6 py-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onApply(adjustment, reason, notes)}>Apply</Button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */

function InventorySkeleton() {
  return (
    <div className="space-y-6 max-w-[1440px] mx-auto w-full animate-pulse">
      <div className="flex items-start justify-between">
        <div>
          <div className="h-7 w-32 bg-muted rounded" />
          <div className="h-4 w-56 bg-muted rounded mt-2" />
        </div>
        <div className="h-9 w-28 bg-muted rounded" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-md border bg-card p-5 h-28" />
        ))}
      </div>
      <div className="rounded-md border bg-card h-96" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function InventoryPage() {
  const { activeBrand, stores } = useBrandFilter()
  const storeId = activeBrand === "all" ? undefined : activeBrand
  const { products: faireProducts, loading } = useProducts(storeId)

  // Sorting state
  type SortKey = "stock" | "name"
  type SortDir = "asc" | "desc"
  const [sortKey, setSortKey] = useState<SortKey>("stock")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("desc") }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="size-3 opacity-30 ml-1" />
    return sortDir === "asc" ? <ArrowUp className="size-3 text-primary ml-1" /> : <ArrowDown className="size-3 text-primary ml-1" />
  }

  const sortedProducts = useMemo(() => {
    return [...faireProducts].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1
      switch (sortKey) {
        case "stock":
          return dir * (a.total_inventory - b.total_inventory)
        case "name":
          return dir * a.name.localeCompare(b.name)
        default:
          return 0
      }
    })
  }, [faireProducts, sortKey, sortDir])

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Adjust dialog state
  const [adjustTarget, setAdjustTarget] = useState<FaireProduct[] | null>(null)

  // Map store_id -> store for brand display
  const storeMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>()
    for (const s of stores) map.set(s.id, { name: s.name, color: s.color })
    return map
  }, [stores])

  // Computed data
  const totalUnits = faireProducts.reduce((sum, p) => sum + p.total_inventory, 0)
  const lowStockItems = faireProducts.filter((p) => p.total_inventory > 0 && p.total_inventory < getMinStock(p))
  const outOfStockItems = faireProducts.filter((p) => p.total_inventory === 0)

  const allLowStock = faireProducts.filter((p) => p.total_inventory < getMinStock(p))

  // Handlers
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === faireProducts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(faireProducts.map((p) => p.id)))
    }
  }, [selectedIds.size, faireProducts])

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }, [])

  const handleAdjustApply = useCallback(
    (_change: number, _reason: string, _notes: string) => {
      // In a real app this would POST to Supabase
      setAdjustTarget(null)
      setSelectedIds(new Set())
    },
    [],
  )

  const openBulkAdjust = useCallback(() => {
    const selected = faireProducts.filter((p) => selectedIds.has(p.id))
    if (selected.length > 0) setAdjustTarget(selected)
  }, [faireProducts, selectedIds])

  if (loading) return <InventorySkeleton />

  // Stats
  const statCards = [
    {
      label: "Total Units",
      value: totalUnits.toLocaleString(),
      sub: `Across ${faireProducts.length} SKUs`,
      icon: <Package className="h-4 w-4" />,
      bg: "rgba(59,130,246,0.1)",
      color: "#3B82F6",
    },
    {
      label: "Low Stock Items",
      value: String(lowStockItems.length),
      sub: "Below minimum threshold",
      icon: <AlertTriangle className="h-4 w-4" />,
      bg: "rgba(245,158,11,0.1)",
      color: "#F59E0B",
    },
    {
      label: "Out of Stock",
      value: String(outOfStockItems.length),
      sub: "Requires immediate restock",
      icon: <XCircle className="h-4 w-4" />,
      bg: "rgba(239,68,68,0.1)",
      color: "#EF4444",
    },
    {
      label: "Total Variants",
      value: String(faireProducts.reduce((sum, p) => sum + p.variant_count, 0)),
      sub: "Across all products",
      icon: <Clock className="h-4 w-4" />,
      bg: "rgba(139,92,246,0.1)",
      color: "#8B5CF6",
    },
  ]

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto w-full">
      {/* ---- Header ---- */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Inventory</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Stock management across all brands
          </p>
        </div>
        <Button
          variant="outline"
          disabled={selectedIds.size === 0}
          onClick={openBulkAdjust}
        >
          <ArrowUpDown className="size-4 mr-1.5" />
          Bulk Adjust
        </Button>
      </div>

      {/* ---- Low Stock Alerts ---- */}
      {allLowStock.length > 0 && (
        <div className="rounded-md border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/40">
            <AlertTriangle className="size-4 text-amber-600" />
            <span className="text-sm font-medium">Low Stock Alerts</span>
            <span className="rounded-full bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5">
              {allLowStock.length}
            </span>
          </div>
          <div className="divide-y">
            {allLowStock.slice(0, 5).map((p) => {
              const brand = storeMap.get(p.store_id)
              return (
                <div key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{p.name}</span>
                    {brand && (
                      <span className="inline-flex items-center gap-1">
                        <span
                          className="inline-block w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: brand.color }}
                        />
                        <span className="text-muted-foreground text-xs">{brand.name}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">
                      Stock: <span className="font-bold text-amber-600">{p.total_inventory}</span>
                      <span className="text-muted-foreground/60">/{getMinStock(p)}</span>
                    </span>
                    <Link
                      href="/catalog/sourcing"
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Reorder
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
          {allLowStock.length > 5 && (
            <div className="border-t px-4 py-2.5 text-center">
              <Link
                href="/catalog/sourcing"
                className="text-xs font-medium text-primary hover:underline"
              >
                View all {allLowStock.length} items
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ---- Stat Cards ---- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-md border bg-card p-5 flex items-start justify-between"
          >
            <div>
              <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
              <p className="text-2xl font-bold font-heading mt-2">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
            </div>
            <div
              className="h-9 w-9 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: card.bg, color: card.color }}
            >
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {/* ---- Inventory Table ---- */}
      <div className="rounded-md border bg-card overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={faireProducts.length > 0 && selectedIds.size === faireProducts.length}
                    onChange={toggleSelectAll}
                    className="size-3.5 rounded border-border accent-primary cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left w-10">
                  {/* Thumbnail */}
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left cursor-pointer select-none" onClick={() => toggleSort("name")}>
                  <span className="flex items-center">Product Name <SortIcon col="name" /></span>
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">
                  Brand
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">
                  Category
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right cursor-pointer select-none" onClick={() => toggleSort("stock")}>
                  <span className="flex items-center justify-end">Current Stock <SortIcon col="stock" /></span>
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right">
                  Variants
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right">
                  Min Order Qty
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-center">
                  Status
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">
                  State
                </th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-center">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {faireProducts.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No inventory items found
                  </td>
                </tr>
              ) : (
                sortedProducts.map((product) => {
                  const brand = storeMap.get(product.store_id)
                  const minStock = getMinStock(product)
                  const status = computeStatus(product.total_inventory, minStock)
                  const stockColor =
                    product.total_inventory === 0
                      ? "text-red-600"
                      : product.total_inventory < minStock
                        ? "text-amber-600"
                        : "text-emerald-600"
                  const isExpanded = expandedId === product.id

                  return (
                    <Fragment key={product.id}>
                      <tr
                        className="border-b last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer"
                        onClick={() => toggleExpand(product.id)}
                      >
                        {/* Checkbox */}
                        <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(product.id)}
                            onChange={() => toggleSelect(product.id)}
                            className="size-3.5 rounded border-border accent-primary cursor-pointer"
                          />
                        </td>

                        {/* Thumbnail */}
                        <td className="px-4 py-3.5">
                          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center shrink-0">
                            <Package className="size-3.5 text-muted-foreground/50" />
                          </div>
                        </td>

                        {/* Product Name */}
                        <td className="px-4 py-3.5 text-sm font-medium">
                          <div className="flex items-center gap-1.5">
                            {isExpanded ? (
                              <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
                            ) : (
                              <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
                            )}
                            <span className="text-foreground truncate max-w-[250px]">
                              {product.name}
                            </span>
                          </div>
                        </td>

                        {/* Brand */}
                        <td className="px-4 py-3.5 text-sm">
                          {brand ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className="inline-block w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: brand.color }}
                              />
                              <span className="text-muted-foreground">{brand.name}</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">--</span>
                          )}
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3.5 text-sm">
                          <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {(() => { try { const p = JSON.parse(product.category ?? ""); return p?.name ?? product.category } catch { return product.category ?? "--" } })()}
                          </span>
                        </td>

                        {/* Current Stock */}
                        <td className="px-4 py-3.5 text-sm text-right">
                          <span className={`font-bold ${stockColor}`}>
                            {product.total_inventory === 0 ? "\u2014" : product.total_inventory}
                          </span>
                        </td>

                        {/* Variants */}
                        <td className="px-4 py-3.5 text-sm text-right text-muted-foreground">
                          {product.variant_count}
                        </td>

                        {/* Min Order Qty */}
                        <td className="px-4 py-3.5 text-sm text-right text-muted-foreground">
                          {product.minimum_order_quantity}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 text-sm text-center">
                          <span
                            className={`border-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[status]}`}
                          >
                            {STATUS_LABEL[status]}
                          </span>
                        </td>

                        {/* Lifecycle State */}
                        <td className="px-4 py-3.5 text-sm text-muted-foreground">
                          {product.lifecycle_state}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setAdjustTarget([product])}
                          >
                            Adjust
                          </Button>
                        </td>
                      </tr>

                      {/* Expanded detail sub-row */}
                      {isExpanded && (
                        <tr className="border-b last:border-b-0">
                          <td colSpan={11} className="bg-muted/20 px-8 py-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground">Wholesale Price</p>
                                <p className="font-medium">${(product.wholesale_price_cents / 100).toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Retail Price</p>
                                <p className="font-medium">${(product.retail_price_cents / 100).toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Made In</p>
                                <p className="font-medium">{product.made_in_country ?? "--"}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Tags</p>
                                <p className="font-medium">{product.tags.length > 0 ? product.tags.join(", ") : "--"}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- Footer ---- */}
      <div className="text-sm text-muted-foreground">
        Showing {faireProducts.length} items
      </div>

      {/* ---- Bottom Bar (bulk selection) ---- */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-lg border bg-card px-5 py-3 shadow-lg">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button size="sm" onClick={openBulkAdjust}>
            Bulk Adjust
          </Button>
        </div>
      )}

      {/* ---- Adjust Stock Dialog ---- */}
      {adjustTarget && (
        <AdjustStockDialog
          productNames={adjustTarget.map((p) => p.name)}
          currentStock={adjustTarget.length === 1 ? adjustTarget[0].total_inventory : null}
          onClose={() => setAdjustTarget(null)}
          onApply={handleAdjustApply}
        />
      )}
    </div>
  )
}
