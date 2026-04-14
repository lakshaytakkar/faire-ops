"use client"

import { useMemo, useState } from "react"
import { TrendingUp } from "lucide-react"
import { FilterBar, type FilterTab } from "@/components/shared/filter-bar"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"

export interface PaymentLinkRow {
  id: string
  lead_user_id: string | null
  amount: number | null
  currency: string | null
  title: string | null
  description: string | null
  status: string | null
  payment_url: string | null
  paid_at: string | null
  expires_at: string | null
  created_by: string | null
  created_at: string | null
}

export interface ProfileLite {
  id: string
  full_name: string | null
  email: string | null
}

function formatCurrency(n: number | null | undefined, currency = "$") {
  if (n === null || n === undefined) return "—"
  const num = typeof n === "string" ? parseFloat(n) : n
  if (isNaN(num)) return "—"
  return `${currency}${num.toLocaleString("en-IN")}`
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

export function PayoutsClient({
  rows,
  profiles,
}: {
  rows: PaymentLinkRow[]
  profiles: ProfileLite[]
}) {
  const pMap = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles])
  const [search, setSearch] = useState("")
  const [activeStatus, setActiveStatus] = useState<string>("all")

  const statusTabs: FilterTab[] = useMemo(() => {
    const counts = rows.reduce<Record<string, number>>((acc, r) => {
      const k = (r.status ?? "unknown").toLowerCase()
      acc[k] = (acc[k] ?? 0) + 1
      return acc
    }, {})
    return [
      { id: "all", label: "All", count: rows.length },
      { id: "pending", label: "Pending", count: counts.pending ?? 0 },
      { id: "paid", label: "Paid", count: counts.paid ?? 0 },
      { id: "expired", label: "Expired", count: counts.expired ?? 0 },
      { id: "cancelled", label: "Cancelled", count: counts.cancelled ?? counts.canceled ?? 0 },
    ].filter((t) => t.id === "all" || (t.count ?? 0) > 0)
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (activeStatus !== "all" && (r.status ?? "").toLowerCase() !== activeStatus) return false
      if (search) {
        const needle = search.toLowerCase()
        const recipient = r.lead_user_id ? pMap.get(r.lead_user_id) : undefined
        const by = r.created_by ? pMap.get(r.created_by) : undefined
        const hay = [
          r.title,
          r.description,
          recipient?.full_name,
          recipient?.email,
          by?.full_name,
          by?.email,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [rows, activeStatus, search, pMap])

  return (
    <>
      <FilterBar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search title, recipient, creator…",
        }}
        tabs={statusTabs}
        activeTab={activeStatus}
        onTabChange={setActiveStatus}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No payouts match"
          description="Try clearing the filter to see more payment links."
        />
      ) : (
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/30 border-b">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Title</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Recipient</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Created by</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Amount</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Paid</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Expires</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const recipient = r.lead_user_id ? pMap.get(r.lead_user_id) : undefined
                const by = r.created_by ? pMap.get(r.created_by) : undefined
                return (
                  <tr
                    key={r.id}
                    className="border-b last:border-b-0 hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium">{r.title ?? "Payment link"}</div>
                      {r.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {r.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">{recipient?.full_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {recipient?.email ?? "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {by?.full_name ?? by?.email ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums">
                      {formatCurrency(r.amount, r.currency === "INR" ? "₹" : "$")}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={toneForStatus(r.status)}>{r.status ?? "—"}</StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(r.paid_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(r.expires_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(r.created_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
