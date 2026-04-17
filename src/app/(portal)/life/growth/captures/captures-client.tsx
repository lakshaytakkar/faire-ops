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

export interface CaptureRow {
  id: string
  content: string | null
  source: string | null
  category: string | null
  status: string | null
  created_at: string | null
}

const TABS: FilterTab[] = [
  { id: "all", label: "All" },
  { id: "saved", label: "Saved" },
  { id: "reviewed", label: "Reviewed" },
  { id: "actioned", label: "Actioned" },
]

function preview(s: string | null, n = 80): string {
  if (!s) return "Untitled"
  const trimmed = s.trim()
  return trimmed.length > n ? `${trimmed.slice(0, n).trimEnd()}…` : trimmed
}

export function CapturesClient({ rows }: { rows: CaptureRow[] }) {
  const [tab, setTab] = useState("all")
  const [q, setQ] = useState("")

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (tab !== "all" && r.status !== tab) return false
      if (q.trim()) {
        const t = q.trim().toLowerCase()
        const hay = [r.content, r.source, r.category].filter(Boolean).join(" ").toLowerCase()
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
        search={{ value: q, onChange: setQ, placeholder: "Search content, source, category…" }}
        tabs={tabsWithCounts}
        activeTab={tab}
        onTabChange={setTab}
      />

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Content</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Captured</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium text-sm max-w-md truncate">
                  {preview(r.content)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.source ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.category ?? "—"}</TableCell>
                <TableCell>
                  <StatusBadge tone={toneForStatus(r.status)}>{r.status ?? "—"}</StatusBadge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(r.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  )
}
