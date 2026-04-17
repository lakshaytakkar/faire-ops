"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Inbox } from "lucide-react"
import { FilterBar, type FilterTab } from "@/components/shared/filter-bar"
import { StatusBadge } from "@/components/shared/status-badge"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { relativeTime } from "@/lib/format"
import { bucketLabel, bucketTone, priorityTone, stageLabel, stageTone } from "../_components/stage-labels"

export interface OpsQueueRow {
  id: string
  rfq_id: string | null
  rfq_number: string
  buyer_company: string
  product_summary: string
  priority: string
  bucket: string
  stage: string | null
  timeline_kind: string | null
  assigned_agent_key: string | null
  age_hours_on_submit: number
  last_action_at: string | null
  last_action_summary: string | null
}

const BUCKETS = ["new", "sourcing", "quote_ready", "sample_phase", "bulk_phase", "shipping_phase", "closed"] as const

export function QueueClient({ rows }: { rows: OpsQueueRow[] }) {
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  const tabs: FilterTab[] = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of rows) counts.set(r.bucket, (counts.get(r.bucket) || 0) + 1)
    return [
      { id: "all", label: "All", count: rows.length },
      ...BUCKETS.map((b) => ({ id: b, label: bucketLabel(b), count: counts.get(b) || 0 })),
    ]
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (activeTab !== "all" && r.bucket !== activeTab) return false
      if (search) {
        const needle = search.toLowerCase()
        const hay = [r.rfq_number, r.buyer_company, r.product_summary, r.assigned_agent_key]
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
        search={{ value: search, onChange: setSearch, placeholder: "Search RFQ, company, product…" }}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <DetailCard title={`Queue · ${filtered.length}`}>
        {filtered.length === 0 ? (
          <EmptyState icon={Inbox} title="No RFQs in this bucket" description="Try a different filter or clear the search." />
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/30 border-y">
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">RFQ</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Company</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Product</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Bucket</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Stage</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Priority</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Agent</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-5 py-2.5">Age</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Last action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b last:border-b-0 hover:bg-muted/40 transition-colors">
                    <td className="px-5 py-3">
                      <Link
                        href={r.rfq_id ? `/chinaimports/queue/${r.rfq_id}` : "/chinaimports/queue"}
                        className="text-sm font-mono font-semibold hover:text-primary"
                      >
                        {r.rfq_number}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-sm font-medium">{r.buyer_company}</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground max-w-[360px] truncate">{r.product_summary}</td>
                    <td className="px-5 py-3"><StatusBadge tone={bucketTone(r.bucket)}>{bucketLabel(r.bucket)}</StatusBadge></td>
                    <td className="px-5 py-3">
                      {r.stage ? <StatusBadge tone={stageTone(r.stage)}>{stageLabel(r.stage)}</StatusBadge> : <span className="text-sm text-muted-foreground">—</span>}
                    </td>
                    <td className="px-5 py-3"><StatusBadge tone={priorityTone(r.priority)}>{r.priority}</StatusBadge></td>
                    <td className="px-5 py-3 text-sm">{r.assigned_agent_key ?? <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-5 py-3 text-right text-sm tabular-nums">{Math.round(r.age_hours_on_submit)}h</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground tabular-nums">{relativeTime(r.last_action_at)}</td>
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
