"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Inbox } from "lucide-react"
import { FilterBar, type FilterTab } from "@/components/shared/filter-bar"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { formatCurrency, relativeTime } from "@/lib/format"
import { intentLabel, intentTone, priorityTone } from "../_components/queue-labels"

export interface RepQueueRow {
  id: string
  buyer_name: string
  buyer_company: string | null
  buyer_phone: string | null
  buyer_email: string | null
  intent: string
  priority: string
  potential_value_inr: number | string | null
  last_activity_at: string | null
  last_activity_summary: string | null
  status: string
  created_at: string | null
}

export function QueueClient({ rows }: { rows: RepQueueRow[] }) {
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  const tabs: FilterTab[] = useMemo(() => {
    const counts = {
      all: rows.length,
      open: rows.filter((r) => r.status === "open").length,
      in_progress: rows.filter((r) => r.status === "in_progress").length,
      resolved: rows.filter((r) => r.status === "resolved").length,
    }
    return [
      { id: "all",         label: "All",         count: counts.all },
      { id: "open",        label: "Open",        count: counts.open },
      { id: "in_progress", label: "In progress", count: counts.in_progress },
      { id: "resolved",    label: "Resolved",    count: counts.resolved },
    ]
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (activeTab !== "all" && r.status !== activeTab) return false
      if (search) {
        const needle = search.toLowerCase()
        const hay = [r.buyer_name, r.buyer_company, r.buyer_phone, r.buyer_email, intentLabel(r.intent)]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [rows, activeTab, search])

  return (
    <>
      <FilterBar
        search={{ value: search, onChange: setSearch, placeholder: "Search buyer, company, phone…" }}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <DetailCard title={`Queue · ${filtered.length}`}>
        {filtered.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No results"
            description="Try a different tab or clear the search."
          />
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/30 border-y">
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Buyer</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Intent</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Priority</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-5 py-2.5">Potential</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Status</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b last:border-b-0 hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <Link href={`/chinaproducts/queue/${r.id}`} className="block hover:text-primary">
                        <div className="text-sm font-semibold text-foreground">{r.buyer_name}</div>
                        {r.buyer_company && (
                          <div className="text-sm text-muted-foreground">{r.buyer_company}</div>
                        )}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge tone={intentTone(r.intent)}>{intentLabel(r.intent)}</StatusBadge>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge tone={priorityTone(r.priority)}>{r.priority}</StatusBadge>
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-medium tabular-nums">
                      {formatCurrency(r.potential_value_inr)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge tone={toneForStatus(r.status)}>{r.status.replace("_", " ")}</StatusBadge>
                    </td>
                    <td className="px-5 py-3 text-sm text-muted-foreground tabular-nums">
                      {relativeTime(r.last_activity_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DetailCard>
    </>
  )
}
