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

export interface QueueRow {
  id: string
  title: string | null
  url: string | null
  type: string | null
  status: string | null
  creator: string | null
  created_at: string | null
}

const TABS: FilterTab[] = [
  { id: "all", label: "All" },
  { id: "video", label: "Video" },
  { id: "article", label: "Article" },
  { id: "podcast", label: "Podcast" },
]

export function QueueClient({ rows }: { rows: QueueRow[] }) {
  const [tab, setTab] = useState("all")
  const [q, setQ] = useState("")

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (tab !== "all" && r.type !== tab) return false
      if (q.trim()) {
        const t = q.trim().toLowerCase()
        const hay = [r.title, r.url, r.creator].filter(Boolean).join(" ").toLowerCase()
        if (!hay.includes(t)) return false
      }
      return true
    })
  }, [rows, tab, q])

  const tabsWithCounts = TABS.map((x) =>
    x.id === "all"
      ? { ...x, count: rows.length }
      : { ...x, count: rows.filter((r) => r.type === x.id).length },
  )

  return (
    <>
      <FilterBar
        search={{ value: q, onChange: setQ, placeholder: "Search queue…" }}
        tabs={tabsWithCounts}
        activeTab={tab}
        onTabChange={setTab}
      />

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Creator</TableHead>
              <TableHead>Added</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium text-sm max-w-md truncate">
                  {r.url ? (
                    <a href={r.url} target="_blank" rel="noreferrer" className="hover:text-primary">
                      {r.title ?? r.url}
                    </a>
                  ) : (
                    r.title ?? "Untitled"
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge tone="violet">{r.type ?? "—"}</StatusBadge>
                </TableCell>
                <TableCell>
                  <StatusBadge tone={toneForStatus(r.status)}>{r.status ?? "—"}</StatusBadge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.creator ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(r.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  )
}
