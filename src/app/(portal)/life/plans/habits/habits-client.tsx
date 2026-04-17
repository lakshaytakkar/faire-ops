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

export interface HabitRow {
  id: string
  name: string | null
  frequency: string | null
  status: string | null
  streak: number | null
  longest_streak: number | null
  category: string | null
}

const TABS: FilterTab[] = [
  { id: "all", label: "All" },
  { id: "daily", label: "Daily" },
  { id: "weekdays", label: "Weekdays" },
  { id: "custom", label: "Custom" },
]

export function HabitsClient({ rows }: { rows: HabitRow[] }) {
  const [tab, setTab] = useState("all")
  const [q, setQ] = useState("")

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (tab !== "all" && r.frequency !== tab) return false
      if (q.trim()) {
        const t = q.trim().toLowerCase()
        const hay = [r.name, r.category].filter(Boolean).join(" ").toLowerCase()
        if (!hay.includes(t)) return false
      }
      return true
    })
  }, [rows, tab, q])

  const tabsWithCounts = TABS.map((x) =>
    x.id === "all"
      ? { ...x, count: rows.length }
      : { ...x, count: rows.filter((r) => r.frequency === x.id).length },
  )

  return (
    <>
      <FilterBar
        search={{ value: q, onChange: setQ, placeholder: "Search habits…" }}
        tabs={tabsWithCounts}
        activeTab={tab}
        onTabChange={setTab}
      />

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Streak</TableHead>
              <TableHead className="text-right">Longest</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium text-sm">{r.name ?? "—"}</TableCell>
                <TableCell>
                  <StatusBadge tone="blue">{r.frequency ?? "—"}</StatusBadge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.category ?? "—"}</TableCell>
                <TableCell>
                  <StatusBadge tone={toneForStatus(r.status)}>{r.status ?? "—"}</StatusBadge>
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm font-semibold">
                  {r.streak ?? 0}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {r.longest_streak ?? 0}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  )
}
