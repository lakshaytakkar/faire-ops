"use client"

import { useMemo, useState } from "react"
import { FilterBar, type FilterTab } from "@/components/shared/filter-bar"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"

export type StoreLite = { id: string; store_name: string | null; shop_domain: string | null }

export interface OrderRow {
  id: string
  store_id: string | null
  order_number: string | null
  email: string | null
  financial_status: string | null
  fulfillment_status: string | null
  total_price: number | null
  currency: string | null
  shopify_created_at: string | null
  created_at: string | null
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—"
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return d
  }
}

function formatCurrency(n: number | null | undefined, currency: string | null) {
  if (n === null || n === undefined) return "—"
  const num = typeof n === "string" ? parseFloat(n) : n
  if (isNaN(num)) return "—"
  const sym = currency === "USD" || !currency ? "$" : currency
  return `${sym}${num.toLocaleString("en-IN")}`
}

export function OrdersClient({
  rows,
  stores,
}: {
  rows: OrderRow[]
  stores: StoreLite[]
}) {
  const [search, setSearch] = useState("")
  const [activeStatus, setActiveStatus] = useState<string>("all")

  const storeMap = useMemo(() => new Map(stores.map((s) => [s.id, s])), [stores])

  const statusTabs: FilterTab[] = useMemo(() => {
    const paid = rows.filter((r) => r.financial_status === "paid").length
    const fulfilled = rows.filter((r) => r.fulfillment_status === "fulfilled").length
    const refunded = rows.filter(
      (r) => r.financial_status === "refunded" || r.financial_status === "partially_refunded",
    ).length
    const pending = rows.filter(
      (r) =>
        r.financial_status === "pending" ||
        r.fulfillment_status === null ||
        r.fulfillment_status === "pending",
    ).length
    return [
      { id: "all", label: "All", count: rows.length },
      { id: "paid", label: "Paid", count: paid },
      { id: "fulfilled", label: "Fulfilled", count: fulfilled },
      { id: "pending", label: "Pending", count: pending },
      { id: "refunded", label: "Refunded", count: refunded },
    ]
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (activeStatus === "paid" && r.financial_status !== "paid") return false
      if (activeStatus === "fulfilled" && r.fulfillment_status !== "fulfilled") return false
      if (
        activeStatus === "refunded" &&
        r.financial_status !== "refunded" &&
        r.financial_status !== "partially_refunded"
      ) {
        return false
      }
      if (
        activeStatus === "pending" &&
        r.financial_status !== "pending" &&
        r.fulfillment_status !== null &&
        r.fulfillment_status !== "pending"
      ) {
        return false
      }
      if (search) {
        const needle = search.toLowerCase()
        const s = r.store_id ? storeMap.get(r.store_id) : undefined
        const hay = [
          r.order_number,
          r.email,
          s?.store_name,
          s?.shop_domain,
          r.financial_status,
          r.fulfillment_status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [rows, activeStatus, search, storeMap])

  return (
    <>
      <FilterBar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search order, email, store…",
        }}
        tabs={statusTabs}
        activeTab={activeStatus}
        onTabChange={setActiveStatus}
      />

      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/30 border-b">
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Order</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Store</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Customer</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Financial</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Fulfillment</th>
              <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Total</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Placed</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => {
              const s = o.store_id ? storeMap.get(o.store_id) : undefined
              return (
                <tr key={o.id} className="border-b last:border-b-0 hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium">
                    #{o.order_number ?? o.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {s?.store_name ?? s?.shop_domain ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{o.email ?? "—"}</td>
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
                    {formatCurrency(o.total_price, o.currency)}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatDate(o.shopify_created_at ?? o.created_at)}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No orders match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
