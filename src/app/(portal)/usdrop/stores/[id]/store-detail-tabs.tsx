"use client"

import { useState } from "react"
import Link from "next/link"
import { Package, ShoppingCart } from "lucide-react"
import { FilterBar, type FilterTab } from "@/components/shared/filter-bar"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"

export type StoreFull = {
  id: string
  user_id: string | null
  shop_domain: string | null
  store_name: string | null
  store_email: string | null
  plan: string | null
  is_active: boolean | null
  last_synced_at: string | null
  currency: string | null
  country: string | null
  products_count: number | null
  orders_count: number | null
  token_expires_at: string | null
  scopes: string[] | null
  created_at: string | null
  updated_at: string | null
}

export type OwnerFull = {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
} | null

export type ProductRow = {
  id: string
  title: string | null
  product_type: string | null
  vendor: string | null
  status: string | null
  total_inventory: number | null
  created_at: string | null
}

export type OrderRow = {
  id: string
  order_number: number | string | null
  email: string | null
  financial_status: string | null
  fulfillment_status: string | null
  total_price: number | string | null
  currency: string | null
  shopify_created_at: string | null
}

type TabId = "overview" | "products" | "orders"

function formatDate(v: string | null) {
  if (!v) return "—"
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
}

function formatCurrency(v: number | string | null, symbol = "$") {
  if (v === null || v === undefined) return "—"
  const n = typeof v === "string" ? Number(v) : v
  if (Number.isNaN(n)) return "—"
  return `${symbol}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function initials(name: string | null | undefined) {
  if (!name) return "—"
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function StoreDetailTabs({
  store,
  owner,
  products,
  orders,
}: {
  store: StoreFull
  owner: OwnerFull
  products: ProductRow[]
  orders: OrderRow[]
}) {
  const [tab, setTab] = useState<TabId>("overview")

  const tabs: FilterTab[] = [
    { id: "overview", label: "Overview" },
    { id: "products", label: "Products", count: products.length },
    { id: "orders", label: "Orders", count: orders.length },
  ]

  const tokenExpires = store.token_expires_at ? new Date(store.token_expires_at) : null
  const tokenHealthy = tokenExpires ? tokenExpires > new Date() : null

  return (
    <>
      <FilterBar tabs={tabs} activeTab={tab} onTabChange={(id) => setTab(id as TabId)} />

      {tab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <DetailCard title="Owner">
            {owner ? (
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold shrink-0">
                  {initials(owner.full_name ?? owner.email)}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/usdrop/users/${owner.id}`}
                    className="text-sm font-medium hover:text-primary"
                  >
                    {owner.full_name ?? owner.email ?? "—"}
                  </Link>
                  <div className="text-sm text-muted-foreground truncate">
                    {owner.email ?? "—"}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No owner linked.</p>
            )}
          </DetailCard>

          <DetailCard title="Shop">
            <InfoRow
              label="Domain"
              value={
                store.shop_domain ? (
                  <span className="font-mono text-xs">{store.shop_domain}</span>
                ) : (
                  "—"
                )
              }
            />
            <InfoRow label="Store name" value={store.store_name ?? "—"} />
            <InfoRow label="Store email" value={store.store_email ?? "—"} />
            <InfoRow label="Country" value={store.country ?? "—"} />
            <InfoRow label="Currency" value={store.currency ?? "—"} />
            <InfoRow label="Plan" value={store.plan ?? "—"} />
            <InfoRow label="Connected" value={formatDate(store.created_at)} />
          </DetailCard>

          <div className="md:col-span-2">
            <DetailCard title="Connection health">
              <InfoRow
                label="Token status"
                value={
                  tokenExpires === null ? (
                    <span className="text-muted-foreground">Never expires / unset</span>
                  ) : tokenHealthy ? (
                    <StatusBadge tone="emerald">
                      Valid until {formatDate(store.token_expires_at)}
                    </StatusBadge>
                  ) : (
                    <StatusBadge tone="red">
                      Expired {formatDate(store.token_expires_at)}
                    </StatusBadge>
                  )
                }
              />
              <InfoRow
                label="Scopes"
                value={
                  Array.isArray(store.scopes) && store.scopes.length > 0 ? (
                    <div className="flex flex-wrap gap-1 justify-end">
                      {store.scopes.map((sc) => (
                        <span
                          key={sc}
                          className="inline-flex items-center rounded-md border border-border/80 bg-muted/40 px-2 py-0.5 font-mono text-[11px]"
                        >
                          {sc}
                        </span>
                      ))}
                    </div>
                  ) : (
                    "—"
                  )
                }
              />
              <InfoRow label="Last sync" value={formatDate(store.last_synced_at)} />
              <InfoRow label="Updated" value={formatDate(store.updated_at)} />
            </DetailCard>
          </div>
        </div>
      )}

      {tab === "products" &&
        (products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No synced products"
            description="This store hasn't synced any products yet. Force a resync from the stores list if it should have inventory."
          />
        ) : (
          <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/30 border-b">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Title</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Type</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Vendor</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Status</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Inventory</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Added</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b last:border-b-0 hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium line-clamp-1">
                      {p.title ?? "Untitled"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {p.product_type ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {p.vendor ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={toneForStatus(p.status)}>{p.status ?? "—"}</StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums">
                      {p.total_inventory?.toLocaleString() ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(p.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {tab === "orders" &&
        (orders.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="No orders"
            description="No orders have landed against this store yet."
          />
        ) : (
          <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/30 border-b">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Order</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Customer</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Financial</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Fulfillment</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Total</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Placed</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b last:border-b-0 hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium">
                      #{o.order_number ?? o.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {o.email ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={toneForStatus(o.financial_status)}>
                        {o.financial_status ?? "—"}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={toneForStatus(o.fulfillment_status ?? "pending")}>
                        {o.fulfillment_status ?? "pending"}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums">
                      {formatCurrency(o.total_price, o.currency === "USD" ? "$" : (o.currency ?? "$"))}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(o.shopify_created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </>
  )
}
