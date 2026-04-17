import { supabaseHq } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid, MetricCard } from "@/components/shared/kpi-grid"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { formatPaise, formatEpochDateTime } from "../_lib"
import { ArrowUpFromLine, CheckCircle, Clock, XCircle, Banknote } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function PayoutsPage() {
  const { data: payouts } = await supabaseHq
    .from("razorpay_payouts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200)

  const rows = payouts ?? []
  const processed = rows.filter((p) => p.status === "processed")
  const pending = rows.filter((p) => ["queued", "pending", "processing"].includes(p.status))
  const failed = rows.filter((p) => p.status === "failed" || p.status === "reversed" || p.status === "rejected")
  const totalPaid = processed.reduce((s, p) => s + Number(p.amount ?? 0), 0)

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">

      <PageHeader title="Payouts" subtitle="Razorpay X payouts — vendor payments, salary disbursement, and refund transfers via NEFT/RTGS/IMPS/UPI." />

      <KPIGrid>
        <MetricCard label="Total Disbursed" value={formatPaise(totalPaid)} hint={`${processed.length} payouts`} icon={Banknote} iconTone="emerald" />
        <MetricCard label="Pending" value={String(pending.length)} hint={formatPaise(pending.reduce((s, p) => s + Number(p.amount ?? 0), 0))} icon={Clock} iconTone="amber" />
        <MetricCard label="Failed / Reversed" value={String(failed.length)} icon={XCircle} iconTone="red" />
        <MetricCard label="Total Payouts" value={String(rows.length)} icon={ArrowUpFromLine} iconTone="blue" />
      </KPIGrid>

      <DetailCard title={`All Payouts (${rows.length})`}>
        {rows.length === 0 ? (
          <EmptyState icon={ArrowUpFromLine} title="No payouts" description="Razorpay X payouts will appear here after syncing." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                  <th className="pb-2 pr-3">Payout ID</th>
                  <th className="pb-2 pr-3">Amount</th>
                  <th className="pb-2 pr-3">Mode</th>
                  <th className="pb-2 pr-3">Purpose</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">UTR</th>
                  <th className="pb-2 pr-3">Fees</th>
                  <th className="pb-2 pr-3">Reference</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                    <td className="py-2.5 pr-3 font-mono text-xs">{p.id}</td>
                    <td className="py-2.5 pr-3 tabular-nums font-medium">{formatPaise(p.amount)}</td>
                    <td className="py-2.5 pr-3">{p.mode ?? "—"}</td>
                    <td className="py-2.5 pr-3 capitalize">{p.purpose?.replace(/_/g, " ") ?? "—"}</td>
                    <td className="py-2.5 pr-3"><StatusBadge tone={toneForStatus(p.status)}>{p.status}</StatusBadge></td>
                    <td className="py-2.5 pr-3 font-mono text-xs text-muted-foreground">{p.utr ?? "—"}</td>
                    <td className="py-2.5 pr-3 tabular-nums text-muted-foreground">{formatPaise(p.fees)}</td>
                    <td className="py-2.5 pr-3 truncate max-w-[120px] text-muted-foreground">{p.reference_id ?? "—"}</td>
                    <td className="py-2.5 text-muted-foreground">{formatEpochDateTime(p.created_at)}</td>
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
