"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
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
import { formatCurrency, formatDate } from "@/lib/format"

export interface TripRow {
  id: string
  destination: string | null
  type: string | null
  status: string | null
  departure_date: string | null
  return_date: string | null
  budget: number | null
  spent: number | null
}

const TABS: FilterTab[] = [
  { id: "all", label: "All" },
  { id: "idea", label: "Idea" },
  { id: "planning", label: "Planning" },
  { id: "booked", label: "Booked" },
  { id: "completed", label: "Completed" },
]

export function TripsClient({ rows }: { rows: TripRow[] }) {
  const [tab, setTab] = useState("all")
  const [q, setQ] = useState("")

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (tab !== "all" && r.status !== tab) return false
      if (q.trim()) {
        const t = q.trim().toLowerCase()
        const hay = [r.destination, r.type].filter(Boolean).join(" ").toLowerCase()
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
        search={{ value: q, onChange: setQ, placeholder: "Search destination or type…" }}
        tabs={tabsWithCounts}
        activeTab={tab}
        onTabChange={setTab}
      />

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Destination</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Departure</TableHead>
              <TableHead>Return</TableHead>
              <TableHead className="text-right">Budget</TableHead>
              <TableHead className="text-right">Spent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium text-sm">
                  <Link href={`/life/plans/trips/${r.id}`} className="hover:text-primary">
                    {r.destination ?? "—"}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.type ?? "—"}</TableCell>
                <TableCell>
                  <StatusBadge tone={toneForStatus(r.status)}>{r.status ?? "—"}</StatusBadge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(r.departure_date)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(r.return_date)}</TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {formatCurrency(r.budget)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {formatCurrency(r.spent)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  )
}
