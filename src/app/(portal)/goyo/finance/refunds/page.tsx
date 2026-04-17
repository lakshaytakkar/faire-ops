import Link from "next/link"
import { RotateCcw, AlertCircle, CheckCircle2, Wallet } from "lucide-react"
import { supabaseGoyo } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { formatINR, refundStatusTone } from "../../_lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Refunds — Goyo | Suprans" }

interface RefundRow {
  id: string
  client_code: string | null
  total_amount: number | null
  amount_paid: number | null
  deducted_amount: number | null
  refunded_amount: number | null
  reason: string | null
  status: string | null
  handler: string | null
  done: boolean | null
}

export default async function GoyoRefundsPage() {
  const { data, error } = await supabaseGoyo
    .from("refunds")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) console.error("goyo.refunds:", error.message)
  const rows = (data ?? []) as RefundRow[]

  const total = rows.length
  const doneCount = rows.filter((r) => r.done).length
  const pendingCount = total - doneCount
  const totalRefunded = rows.reduce((s, r) => s + (Number(r.refunded_amount) || 0), 0)

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Refunds"
        subtitle={`${total} refund record${total === 1 ? "" : "s"}`}
      />

      <KPIGrid>
        <MetricCard label="Total refunds" value={total} icon={RotateCcw} iconTone="slate" />
        <MetricCard label="Completed" value={doneCount} icon={CheckCircle2} iconTone="emerald" />
        <MetricCard label="Pending" value={pendingCount} icon={AlertCircle} iconTone="amber" />
        <MetricCard label="Total refunded (₹)" value={formatINR(totalRefunded)} icon={Wallet} iconTone="red" />
      </KPIGrid>

      <DetailCard title="Refund ledger">
        {rows.length === 0 ? (
          <EmptyState icon={RotateCcw} title="No refunds" description="No refund records found." />
        ) : (
          <Card className="overflow-hidden p-0 gap-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Client</TableHead>
                  <TableHead className="w-[120px] text-right">Total</TableHead>
                  <TableHead className="w-[120px] text-right">Paid</TableHead>
                  <TableHead className="w-[100px] text-right">Deducted</TableHead>
                  <TableHead className="w-[120px] text-right">Refunded</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="w-[140px]">Status</TableHead>
                  <TableHead className="w-[80px] text-center">Done</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm font-medium tabular-nums">
                      {r.client_code ?? "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {formatINR(r.total_amount)}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {formatINR(r.amount_paid)}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {formatINR(r.deducted_amount)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums">
                      {formatINR(r.refunded_amount)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">
                      {r.reason ?? "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={refundStatusTone(r.status)}>
                        {r.status ?? "—"}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {r.done ? "✓" : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </DetailCard>
    </div>
  )
}
