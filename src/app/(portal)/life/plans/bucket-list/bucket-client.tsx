"use client"

import { useMemo, useState } from "react"
import { FilterBar, type FilterTab } from "@/components/shared/filter-bar"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { formatDate } from "@/lib/format"

export interface BucketRow {
  id: string
  title: string | null
  category: string | null
  priority: string | null
  status: string | null
  completed_at: string | null
  created_at: string | null
}

const TABS: FilterTab[] = [
  { id: "all", label: "All" },
  { id: "dreaming", label: "Dreaming" },
  { id: "planning", label: "Planning" },
  { id: "in_progress", label: "In progress" },
  { id: "complete", label: "Complete" },
]

export function BucketClient({ rows }: { rows: BucketRow[] }) {
  const [tab, setTab] = useState("all")
  const [q, setQ] = useState("")

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (tab !== "all" && r.status !== tab) return false
      if (q.trim()) {
        const t = q.trim().toLowerCase()
        const hay = [r.title, r.category].filter(Boolean).join(" ").toLowerCase()
        if (!hay.includes(t)) return false
      }
      return true
    })
  }, [rows, tab, q])

  const tabsWithCounts = TABS.map((x) =>
    x.id === "all"
      ? { ...x, count: rows.length }
      : { ...x, count: rows.filter((r) => r.status === x.id).length },
  )

  return (
    <>
      <FilterBar
        search={{ value: q, onChange: setQ, placeholder: "Search bucket list…" }}
        tabs={tabsWithCounts}
        activeTab={tab}
        onTabChange={setTab}
      />

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Completed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium text-sm">{r.title ?? "—"}</TableCell>
                <TableCell>
                  {r.category ? <StatusBadge tone="violet">{r.category}</StatusBadge> : "—"}
                </TableCell>
                <TableCell>
                  {r.priority ? <StatusBadge tone={toneForStatus(r.priority)}>{r.priority}</StatusBadge> : "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge tone={toneForStatus(r.status)}>{r.status ?? "—"}</StatusBadge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(r.completed_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  )
}
