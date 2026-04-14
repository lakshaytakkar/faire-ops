"use client"

import { useState } from "react"
import Link from "next/link"
import { Package } from "lucide-react"
import { FilterBar, type FilterTab } from "@/components/shared/filter-bar"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"

export type SupplierFull = {
  id: string
  name: string | null
  website: string | null
  country: string | null
  rating: number | null
  verified: boolean | null
  shipping_time: string | null
  min_order_quantity: number | null
  contact_email: string | null
  contact_phone: string | null
  description: string | null
  logo_url: string | null
  payment_terms: string | null
  lead_time_days: number | null
  created_at: string | null
  updated_at: string | null
}

export type SupplierProductRow = {
  id: string
  title: string | null
  image: string | null
  buy_price: number | string | null
  sell_price: number | string | null
  profit_per_order: number | string | null
  in_stock: boolean | null
  rating: number | null
  created_at: string | null
}

type TabId = "overview" | "products"

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

export function SupplierDetailTabs({
  supplier,
  products,
}: {
  supplier: SupplierFull
  products: SupplierProductRow[]
}) {
  const [tab, setTab] = useState<TabId>("overview")

  const tabs: FilterTab[] = [
    { id: "overview", label: "Overview" },
    { id: "products", label: "Products", count: products.length },
  ]

  return (
    <>
      <FilterBar tabs={tabs} activeTab={tab} onTabChange={(id) => setTab(id as TabId)} />

      {tab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <DetailCard title="Contact">
            <InfoRow label="Name" value={supplier.name ?? "—"} />
            <InfoRow label="Email" value={supplier.contact_email ?? "—"} />
            <InfoRow label="Phone" value={supplier.contact_phone ?? "—"} />
            <InfoRow
              label="Website"
              value={
                supplier.website ? (
                  <a
                    href={supplier.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {supplier.website.replace(/^https?:\/\//, "")}
                  </a>
                ) : (
                  "—"
                )
              }
            />
            <InfoRow label="Country" value={supplier.country ?? "—"} />
          </DetailCard>

          <DetailCard title="Commercial terms">
            <InfoRow label="Shipping time" value={supplier.shipping_time ?? "—"} />
            <InfoRow
              label="Lead time"
              value={supplier.lead_time_days ? `${supplier.lead_time_days}d` : "—"}
            />
            <InfoRow
              label="MOQ"
              value={supplier.min_order_quantity?.toLocaleString() ?? "—"}
            />
            <InfoRow label="Payment terms" value={supplier.payment_terms ?? "—"} />
            <InfoRow
              label="Verified"
              value={
                <StatusBadge tone={toneForStatus(supplier.verified ? "approved" : "pending")}>
                  {supplier.verified ? "verified" : "pending"}
                </StatusBadge>
              }
            />
            <InfoRow
              label="Rating"
              value={
                supplier.rating !== null && supplier.rating !== undefined
                  ? `${Number(supplier.rating).toFixed(1)} ★`
                  : "—"
              }
            />
            <InfoRow label="Created" value={formatDate(supplier.created_at)} />
          </DetailCard>

          {supplier.description && (
            <div className="md:col-span-2">
              <DetailCard title="Description">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {supplier.description}
                </p>
              </DetailCard>
            </div>
          )}
        </div>
      )}

      {tab === "products" &&
        (products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products"
            description="No products are sourced from this supplier yet."
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
                      {formatCurrency(p.buy_price)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums">
                      {formatCurrency(p.sell_price)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums">
                      {formatCurrency(p.profit_per_order)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums">
                      {p.rating !== null && p.rating !== undefined
                        ? Number(p.rating).toFixed(1)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={toneForStatus(p.in_stock ? "active" : "inactive")}>
                        {p.in_stock ? "in stock" : "out"}
                      </StatusBadge>
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
    </>
  )
}
