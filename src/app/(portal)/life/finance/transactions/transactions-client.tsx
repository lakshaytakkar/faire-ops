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
import { formatCurrency, formatDate } from "@/lib/format"

export interface TransactionRow {
  id: string
  date: string | null
  type: string | null
  amount: number | null
  category: string | null
  narration: string | null
  account: string | null
  notes: string | null
}

const TABS: FilterTab[] = [
  { id: "all", label: "All" },
  { id: "income", label: "Income" },
  { id: "expense", label: "Expense" },
  { id: "transfer", label: "Transfer" },
]

export function TransactionsClient({ rows }: { rows: TransactionRow[] }) {
  const [tab, setTab] = useState("all")
  const [q, setQ] = useState("")

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (tab !== "all" && r.type !== tab) return false
      if (q.trim()) {
        const t = q.trim().toLowerCase()
        const hay = [r.narration, r.category, r.notes].filter(Boolean).join(" ").toLowerCase()
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
        search={{ value: q, onChange: setQ, placeholder: "Search narration, category…" }}
        tabs={tabsWithCounts}
        activeTab={tab}
        onTabChange={setTab}
      />

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Narration</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Account</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-sm">{formatDate(r.date)}</TableCell>
                <TableCell className="font-medium text-sm">{r.narration ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.category ?? "—"}</TableCell>
                <TableCell>
                  <StatusBadge tone={toneForStatus(r.type)}>{r.type ?? "—"}</StatusBadge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.account ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums text-sm font-semibold">
                  {formatCurrency(r.amount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  )
}
