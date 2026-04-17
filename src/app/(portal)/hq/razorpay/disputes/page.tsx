import { supabaseHq } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid, MetricCard } from "@/components/shared/kpi-grid"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { formatPaise, formatEpoch } from "../_lib"
import { AlertTriangle, ShieldCheck, ShieldX, Clock, Scale } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function DisputesPage() {
  const { data: disputes } = await supabaseHq
    .from("razorpay_disputes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200)

  const rows = disputes ?? []
  const open = rows.filter((d) => d.status === "open")
  const underReview = rows.filter((d) => d.status === "under_review")
  const won = rows.filter((d) => d.status === "won")
  const lost = rows.filter((d) => d.status === "lost")

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">

      <PageHeader title="Disputes" subtitle="Payment disputes and chargebacks. Respond before the deadline to avoid auto-acceptance." />

      <KPIGrid>
        <MetricCard label="Open" value={String(open.length)} hint={open.length > 0 ? "Action required" : "All clear"} icon={AlertTriangle} iconTone={open.length > 0 ? "red" : "emerald"} />
        <MetricCard label="Under Review" value={String(underReview.length)} icon={Clock} iconTone="amber" />
        <MetricCard label="Won" value={String(won.length)} icon={ShieldCheck} iconTone="emerald" />
        <MetricCard label="Lost" value={String(lost.length)} hint={formatPaise(lost.reduce((s, d) => s + Number(d.amount_deducted ?? 0), 0)) + " deducted"} icon={ShieldX} iconTone="red" />
      </KPIGrid>

      <DetailCard title={`All Disputes (${rows.length})`}>
        {rows.length === 0 ? (
          <EmptyState icon={Scale} title="No disputes" description="Disputes and chargebacks will appear here after syncing." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                  <th className="pb-2 pr-3">Dispute ID</th>
                  <th className="pb-2 pr-3">Payment ID</th>
                  <th className="pb-2 pr-3">Amount</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Phase</th>
                  <th className="pb-2 pr-3">Reason</th>
                  <th className="pb-2 pr-3">Respond By</th>
                  <th className="pb-2 pr-3">Deducted</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                    <td className="py-2.5 pr-3 font-mono text-xs">{d.id}</td>
                    <td className="py-2.5 pr-3 font-mono text-xs text-primary">{d.payment_id}</td>
                    <td className="py-2.5 pr-3 tabular-nums font-medium">{formatPaise(d.amount)}</td>
                    <td className="py-2.5 pr-3"><StatusBadge tone={toneForStatus(d.status)}>{d.status}</StatusBadge></td>
                    <td className="py-2.5 pr-3 capitalize">{d.phase ?? "—"}</td>
                    <td className="py-2.5 pr-3 truncate max-w-[200px] text-muted-foreground">{d.reason_description ?? d.reason_code ?? "—"}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{formatEpoch(d.respond_by)}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{formatPaise(d.amount_deducted)}</td>
                    <td className="py-2.5 text-muted-foreground">{formatEpoch(d.created_at)}</td>
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
