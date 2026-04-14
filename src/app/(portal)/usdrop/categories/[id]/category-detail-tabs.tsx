"use client"

import { useState } from "react"
import Link from "next/link"
import { FolderTree, Package } from "lucide-react"
import { FilterBar, type FilterTab } from "@/components/shared/filter-bar"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { formatCurrency, formatDate } from "@/lib/format"

export interface CategoryDetail {
  id: string
  name: string | null
  slug: string | null
  description: string | null
  parent_category_id: string | null
  icon: string | null
  image_url: string | null
  trending: boolean | null
  product_count: number | null
  avg_profit_margin: number | null
  growth_percentage: number | null
  display_order: number | null
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
}

export interface CategoryProduct {
  id: string
  title: string | null
  image: string | null
  buy_price: number | null
  sell_price: number | null
  profit_per_order: number | null
  rating: number | null
  in_stock: boolean | null
  created_at: string | null
}

export interface Subcategory {
  id: string
  name: string | null
  slug: string | null
  product_count: number | null
  trending: boolean | null
  is_active: boolean | null
}

export function CategoryDetailTabs({
  category,
  parentName,
  products,
  subcategories,
}: {
  category: CategoryDetail
  parentName: string | null
  products: CategoryProduct[]
  subcategories: Subcategory[]
}) {
  const [tab, setTab] = useState<string>("overview")

  const tabs: FilterTab[] = [
    { id: "overview", label: "Overview" },
    { id: "products", label: "Products", count: products.length },
    { id: "subcategories", label: "Subcategories", count: subcategories.length },
  ]

  return (
    <>
      <FilterBar tabs={tabs} activeTab={tab} onTabChange={setTab} />

      {tab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <DetailCard title="Details">
            <InfoRow label="Name" value={category.name ?? "—"} />
            <InfoRow
              label="Slug"
              value={category.slug ? <span className="font-mono text-xs">{category.slug}</span> : "—"}
            />
            <InfoRow label="Icon" value={category.icon ?? "—"} />
            <InfoRow label="Display order" value={category.display_order?.toString() ?? "—"} />
            <InfoRow label="Parent" value={parentName ?? "—"} />
            <InfoRow
              label="Status"
              value={
                <StatusBadge tone={toneForStatus(category.is_active ? "active" : "inactive")}>
                  {category.is_active ? "Active" : "Inactive"}
                </StatusBadge>
              }
            />
            <InfoRow
              label="Trending"
              value={
                <StatusBadge tone={toneForStatus(category.trending ? "active" : "inactive")}>
                  {category.trending ? "Yes" : "No"}
                </StatusBadge>
              }
            />
            <InfoRow label="Updated" value={formatDate(category.updated_at)} />
          </DetailCard>
          <DetailCard title="Description">
            {category.description ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{category.description}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No description.</p>
            )}
          </DetailCard>
        </div>
      )}

      {tab === "products" && (
        <>
          {products.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No products"
              description="No products are assigned to this category yet."
            />
          ) : (
            <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/30 border-b">
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Product</th>
                    <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Buy</th>
                    <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Sell</th>
                    <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Profit</th>
                    <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Rating</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Status</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Added</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-b last:border-b-0 hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/usdrop/products/${p.id}`}
                          className="flex items-center gap-2 hover:text-primary"
                        >
                          {p.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.image}
                              alt=""
                              className="size-8 rounded object-cover bg-muted shrink-0"
                            />
                          ) : (
                            <div className="size-8 rounded bg-muted flex items-center justify-center shrink-0">
                              <Package className="size-4 text-muted-foreground" />
                            </div>
                          )}
                          <span className="text-sm font-medium line-clamp-1">
                            {p.title ?? "Untitled"}
                          </span>
                        </Link>
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
                      <td className="px-4 py-3 text-right text-sm tabular-nums">
                        {p.rating !== null && p.rating !== undefined
                          ? Number(p.rating).toFixed(1)
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={toneForStatus(p.in_stock ? "active" : "inactive")}>
                          {p.in_stock ? "In stock" : "Out"}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatDate(p.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === "subcategories" && (
        <>
          {subcategories.length === 0 ? (
            <EmptyState
              icon={FolderTree}
              title="No subcategories"
              description="This category has no children."
            />
          ) : (
            <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/30 border-b">
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Name</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Slug</th>
                    <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Products</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Trending</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {subcategories.map((s) => (
                    <tr key={s.id} className="border-b last:border-b-0 hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/usdrop/categories/${s.id}`}
                          className="text-sm font-medium hover:text-primary"
                        >
                          {s.name ?? "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                        {s.slug ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums">
                        {(s.product_count ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={toneForStatus(s.trending ? "active" : "inactive")}>
                          {s.trending ? "Trending" : "Off"}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={toneForStatus(s.is_active ? "active" : "inactive")}>
                          {s.is_active ? "Active" : "Inactive"}
                        </StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  )
}
