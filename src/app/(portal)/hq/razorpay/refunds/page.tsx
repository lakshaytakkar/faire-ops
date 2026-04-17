import { supabaseHq } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid, MetricCard } from "@/components/shared/kpi-grid"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { formatPaise, formatEpochDateTime } from "../_lib"
import { RefreshCw, CheckCircle, Clock, XCircle, Zap } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function RefundsPage() {
  const { data: refunds } = await supabaseHq
    .from("razorpay_refunds")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200)

  const rows = refunds ?? []
  const processed = rows.filter((r) => r.status === "processed")
  const pending = rows.filter((r) => r.status === "pending")
  const failed = rows.filter((r) => r.status === "failed")
  const instant = rows.filter((r) => r.speed_processed === "instant")

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">

      <PageHeader title="Refunds" subtitle="All refunds issued against payments. Supports normal and instant (optimum) speed refunds." />

      <KPIGrid>
        <MetricCard label="Total Refunds" value={String(rows.length)} hint={formatPaise(rows.reduce((s, r) => s + Number(r.amount ?? 0), 0))} icon={RefreshCw} iconTone="blue" />
        <MetricCard label="Processed" value={String(processed.length)} hint={formatPaise(processed.reduce((s, r) => s + Number(r.amount ?? 0), 0))} icon={CheckCircle} iconTone="emerald" />
        <MetricCard label="Pending" value={String(pending.length)} icon={Clock} iconTone="amber" />
        <MetricCard label="Instant" value={String(instant.length)} hint="Processed instantly" icon={Zap} iconTone="violet" />
      </KPIGrid>

      <DetailCard title={`All Refunds (${rows.length})`}>
        {rows.length === 0 ? (
          <EmptyState icon={RefreshCw} title="No refunds" description="Refunds will appear here after syncing with Razorpay." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                  <th className="pb-2 pr-3">Refund ID</th>
                  <th className="pb-2 pr-3">Payment ID</th>
                  <th className="pb-2 pr-3">Amount</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Speed Requested</th>
                  <th className="pb-2 pr-3">Speed Processed</th>
                  <th className="pb-2 pr-3">Receipt</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                    <td className="py-2.5 pr-3 font-mono text-xs">{r.id}</td>
                    <td className="py-2.5 pr-3 font-mono text-xs text-primary">{r.payment_id}</td>
                    <td className="py-2.5 pr-3 tabular-nums font-medium">{formatPaise(r.amount)}</td>
                    <td className="py-2.5 pr-3"><StatusBadge tone={toneForStatus(r.status)}>{r.status}</StatusBadge></td>
                    <td className="py-2.5 pr-3 capitalize">{r.speed_requested ?? "—"}</td>
                    <td className="py-2.5 pr-3 capitalize">{r.speed_processed ?? "—"}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{r.receipt ?? "—"}</td>
                    <td className="py-2.5 text-muted-foreground">{formatEpochDateTime(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DetailCard>
    </div>
  )
}
