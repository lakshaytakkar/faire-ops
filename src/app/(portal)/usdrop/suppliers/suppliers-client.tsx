"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Truck } from "lucide-react"
import { FilterBar, type FilterTab } from "@/components/shared/filter-bar"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { EditSupplierRow } from "./_components/EditSupplierRow"

export type Supplier = {
  id: string
  name: string | null
  website: string | null
  country: string | null
  rating: number | null
  verified: boolean | null
  shipping_time: string | null
  min_order_quantity: number | null
  contact_email: string | null
}

function ratingBucket(r: number | null | undefined): "top" | "mid" | "low" | "none" {
  if (r === null || r === undefined) return "none"
  if (r >= 4.5) return "top"
  if (r >= 3.5) return "mid"
  return "low"
}

export function SuppliersClient({ rows }: { rows: Supplier[] }) {
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState<string>("all")

  const tabs: FilterTab[] = useMemo(() => {
    const verified = rows.filter((s) => s.verified).length
    const top = rows.filter((s) => ratingBucket(s.rating) === "top").length
    const mid = rows.filter((s) => ratingBucket(s.rating) === "mid").length
    const low = rows.filter((s) => ratingBucket(s.rating) === "low").length
    return [
      { id: "all", label: "All", count: rows.length },
      { id: "verified", label: "Verified", count: verified },
      { id: "top", label: "Top rated", count: top },
      { id: "mid", label: "Mid", count: mid },
      { id: "low", label: "Low", count: low },
    ]
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter((s) => {
      if (activeTab === "verified" && !s.verified) return false
      if (activeTab === "top" && ratingBucket(s.rating) !== "top") return false
      if (activeTab === "mid" && ratingBucket(s.rating) !== "mid") return false
      if (activeTab === "low" && ratingBucket(s.rating) !== "low") return false
      if (search) {
        const needle = search.toLowerCase()
        const hay = [s.name, s.country, s.website, s.contact_email]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [rows, search, activeTab])

  return (
    <>
      <FilterBar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search name, country, email…",
        }}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No suppliers match"
          description="Try clearing the search or switching tabs."
        />
      ) : (
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/30 border-b">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Name</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Country</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Rating</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Verified</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Shipping</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">MOQ</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Contact</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b last:border-b-0 hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/usdrop/suppliers/${s.id}`}
                      className="block min-w-0 hover:text-primary"
                    >
                      <div className="text-sm font-medium truncate">{s.name ?? "—"}</div>
                      {s.website && (
                        <div className="text-xs text-muted-foreground truncate">
                          {s.website.replace(/^https?:\/\//, "")}
                        </div>
                      )}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {s.country ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-sm tabular-nums">
                    {s.rating !== null && s.rating !== undefined
                      ? `${Number(s.rating).toFixed(1)} ★`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={toneForStatus(s.verified ? "approved" : "pending")}>
                      {s.verified ? "verified" : "pending"}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {s.shipping_time ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-sm tabular-nums">
                    {s.min_order_quantity?.toLocaleString() ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {s.contact_email ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <EditSupplierRow supplier={s} />
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
