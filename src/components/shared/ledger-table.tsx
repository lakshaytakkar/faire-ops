// LedgerTable — double-entry ledger view with running balance + totals footer.
// Typical uses: finance space transaction lists, wallet history, vendor
// statements. Rows are sorted ascending by date at render time so the running
// balance is always correct regardless of parent ordering.

import Link from "next/link"
import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/format"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { StatusBadge, type StatusTone } from "./status-badge"
import { EmptyState } from "./empty-state"

export interface LedgerRow {
  id: string
  date: string | Date
  description: ReactNode
  category?: { label: string; tone?: StatusTone }
  debit?: number | null
  credit?: number | null
  href?: string
}

export function LedgerTable({
  rows,
  currency = "INR",
  locale = "en-IN",
  openingBalance = 0,
  emptyMessage = "No transactions yet.",
}: {
  rows: LedgerRow[]
  currency?: string
  locale?: string
  openingBalance?: number
  emptyMessage?: string
}) {
  if (rows.length === 0) {
    return <EmptyState title="No activity" description={emptyMessage} />
  }

  const money = new Intl.NumberFormat(locale, { style: "currency", currency })
  const fmt = (n: number) => money.format(n)

  const sorted = [...rows].sort((a, b) => {
    const da = typeof a.date === "string" ? new Date(a.date).getTime() : a.date.getTime()
    const db = typeof b.date === "string" ? new Date(b.date).getTime() : b.date.getTime()
    return da - db
  })

  let running = openingBalance
  let totalDebit = 0
  let totalCredit = 0
  const withBalance = sorted.map((row) => {
    const debit = row.debit ?? 0
    const credit = row.credit ?? 0
    running = running + credit - debit
    totalDebit += debit
    totalCredit += credit
    return { row, balance: running, debit, credit }
  })

  const closingBalance = running

  return (
    <Card className="p-0" size="sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-[140px]">Category</TableHead>
            <TableHead className="w-[140px] text-right">Debit</TableHead>
            <TableHead className="w-[140px] text-right">Credit</TableHead>
            <TableHead className="w-[160px] text-right">Balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {openingBalance !== 0 && (
            <TableRow className="bg-muted/30">
              <TableCell className="text-sm text-muted-foreground tabular-nums">—</TableCell>
              <TableCell className="text-sm font-medium text-muted-foreground" colSpan={4}>
                Opening balance
              </TableCell>
              <TableCell className="text-right text-sm font-semibold tabular-nums">
                {fmt(openingBalance)}
              </TableCell>
            </TableRow>
          )}
          {withBalance.map(({ row, balance, debit, credit }) => (
            <LedgerBodyRow
              key={row.id}
              row={row}
              balance={balance}
              debit={debit}
              credit={credit}
              fmt={fmt}
            />
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell className="text-sm font-semibold" colSpan={3}>
              Totals
            </TableCell>
            <TableCell className="text-right text-sm font-semibold text-red-600 tabular-nums">
              {totalDebit > 0 ? fmt(totalDebit) : "—"}
            </TableCell>
            <TableCell className="text-right text-sm font-semibold text-emerald-600 tabular-nums">
              {totalCredit > 0 ? fmt(totalCredit) : "—"}
            </TableCell>
            <TableCell className="text-right text-sm font-semibold tabular-nums">
              {fmt(closingBalance)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </Card>
  )
}

function LedgerBodyRow({
  row,
  balance,
  debit,
  credit,
  fmt,
}: {
  row: LedgerRow
  balance: number
  debit: number
  credit: number
  fmt: (n: number) => string
}) {
  const content = (
    <>
      <TableCell className="text-sm text-muted-foreground tabular-nums">
        {formatDate(row.date)}
      </TableCell>
      <TableCell className="text-sm font-medium text-foreground">
        {row.description}
      </TableCell>
      <TableCell>
        {row.category ? (
          <StatusBadge tone={row.category.tone ?? "slate"}>{row.category.label}</StatusBadge>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className={cn("text-right text-sm tabular-nums", debit > 0 && "text-red-600 font-medium")}>
        {debit > 0 ? fmt(debit) : "—"}
      </TableCell>
      <TableCell className={cn("text-right text-sm tabular-nums", credit > 0 && "text-emerald-600 font-medium")}>
        {credit > 0 ? fmt(credit) : "—"}
      </TableCell>
      <TableCell className="text-right text-sm font-semibold tabular-nums">
        {fmt(balance)}
      </TableCell>
    </>
  )

  if (row.href) {
    return (
      <TableRow className="cursor-pointer">
        <TableCell className="p-0" colSpan={6}>
          <Link href={row.href} className="grid grid-cols-[120px_1fr_140px_140px_140px_160px] items-center">
            {/* When href is set we render the cells again inside a link grid to keep the row clickable */}
            <span className="p-2 text-sm text-muted-foreground tabular-nums">{formatDate(row.date)}</span>
            <span className="p-2 text-sm font-medium text-foreground truncate">{row.description}</span>
            <span className="p-2">
              {row.category ? (
                <StatusBadge tone={row.category.tone ?? "slate"}>{row.category.label}</StatusBadge>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </span>
            <span className={cn("p-2 text-right text-sm tabular-nums", debit > 0 && "text-red-600 font-medium")}>
              {debit > 0 ? fmt(debit) : "—"}
            </span>
            <span className={cn("p-2 text-right text-sm tabular-nums", credit > 0 && "text-emerald-600 font-medium")}>
              {credit > 0 ? fmt(credit) : "—"}
            </span>
            <span className="p-2 text-right text-sm font-semibold tabular-nums">
              {fmt(balance)}
            </span>
          </Link>
        </TableCell>
      </TableRow>
    )
  }

  return <TableRow>{content}</TableRow>
}
