"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Package } from "lucide-react"
import { FilterBar, type FilterTab } from "@/components/shared/filter-bar"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/format"

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

export function ProductsClient({
  rows,
  catMap,
  supMap,
}: {
  rows: ProductRow[]
  catMap: Record<string, string>
  supMap: Record<string, string>
}) {
  const [search, setSearch] = useState("")
  const [activeStatus, setActiveStatus] = useState<string>("all")

  const statusTabs: FilterTab[] = useMemo(() => {
    const inStock = rows.filter((r) => r.in_stock).length
    const outOfStock = rows.filter((r) => !r.in_stock).length
    return [
      { id: "all", label: "All", count: rows.length },
      { id: "in_stock", label: "In stock", count: inStock },
      { id: "out", label: "Out of stock", count: outOfStock },
    ]
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (activeStatus === "in_stock" && !r.in_stock) return false
      if (activeStatus === "out" && r.in_stock) return false
      if (search) {
        const needle = search.toLowerCase()
        const hay = [
          r.title,
          r.category_id ? catMap[r.category_id] : null,
          r.supplier_id ? supMap[r.supplier_id] : null,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [rows, activeStatus, search, catMap, supMap])

  return (
    <>
      <FilterBar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search title, category, supplier…",
        }}
        tabs={statusTabs}
        activeTab={activeStatus}
        onTabChange={setActiveStatus}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products match"
          description="Adjust filters or clear the search to see more products."
        />
      ) : (
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/30 border-b">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Product</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Category</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Supplier</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Buy</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Sell</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Profit</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Stock</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className="border-b last:border-b-0 hover:bg-muted/40 transition-colors"
                >
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
                          className="size-9 rounded-lg object-cover bg-muted shrink-0 border border-border/60"
                          loading="lazy"
                        />
                      ) : (
                        <span className="size-9 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                          <Package className="size-4" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-medium line-clamp-2">
                          {p.title ?? "Untitled"}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {p.category_id ? (
                      <Badge variant="outline">{catMap[p.category_id] ?? "—"}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {p.supplier_id ? supMap[p.supplier_id] ?? "—" : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-sm tabular-nums">
                    {formatCurrency(p.buy_price, "$")}
                  </td>
                  <td className="px-4 py-3 text-right text-sm tabular-nums">
                    {formatCurrency(p.sell_price, "$")}
                  </td>
                  <td className="px-4 py-3 text-right text-sm tabular-nums">
                    {formatCurrency(p.profit_per_order, "$")}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={toneForStatus(p.in_stock ? "active" : "inactive")}>
                      {p.in_stock ? "In stock" : "Out"}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
