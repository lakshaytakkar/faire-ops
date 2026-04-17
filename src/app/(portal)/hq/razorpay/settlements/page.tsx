import { supabaseHq } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid, MetricCard } from "@/components/shared/kpi-grid"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { formatPaise, formatEpochDateTime } from "../_lib"
import { Landmark, CheckCircle, Clock, IndianRupee, Building2 } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function SettlementsPage() {
  const { data: settlements } = await supabaseHq
    .from("razorpay_settlements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200)

  const rows = settlements ?? []
  const processed = rows.filter((s) => s.status === "processed")
  const totalSettled = processed.reduce((s, r) => s + Number(r.amount ?? 0), 0)
  const totalFees = rows.reduce((s, r) => s + Number(r.fees ?? 0), 0)
  const pending = rows.filter((s) => s.status === "created")

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">

      <PageHeader title="Settlements" subtitle="Bank settlements from Razorpay. Funds are settled to your registered bank account on a T+2 cycle." />

      <KPIGrid>
        <MetricCard label="Total Settled" value={formatPaise(totalSettled)} hint={`${processed.length} settlements`} icon={IndianRupee} iconTone="emerald" />
        <MetricCard label="Pending" value={String(pending.length)} icon={Clock} iconTone="amber" />
        <MetricCard label="Total Fees" value={formatPaise(totalFees)} icon={Building2} iconTone="red" />
        <MetricCard label="Settlements" value={String(rows.length)} icon={Landmark} iconTone="blue" />
      </KPIGrid>

      <DetailCard title={`All Settlements (${rows.length})`}>
        {rows.length === 0 ? (
          <EmptyState icon={Landmark} title="No settlements" description="Settlement data will appear after syncing with Razorpay." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                  <th className="pb-2 pr-3">Settlement ID</th>
                  <th className="pb-2 pr-3">Amount</th>
                  <th className="pb-2 pr-3">Fees</th>
                  <th className="pb-2 pr-3">Tax</th>
                  <th className="pb-2 pr-3">Net</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">UTR</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                    <td className="py-2.5 pr-3 font-mono text-xs">{s.id}</td>
                    <td className="py-2.5 pr-3 tabular-nums font-medium">{formatPaise(s.amount)}</td>
                    <td className="py-2.5 pr-3 tabular-nums text-muted-foreground">{formatPaise(s.fees)}</td>
                    <td className="py-2.5 pr-3 tabular-nums text-muted-foreground">{formatPaise(s.tax)}</td>
                    <td className="py-2.5 pr-3 tabular-nums font-medium">{formatPaise(Number(s.amount ?? 0) - Number(s.fees ?? 0))}</td>
                    <td className="py-2.5 pr-3"><StatusBadge tone={toneForStatus(s.status)}>{s.status}</StatusBadge></td>
                    <td className="py-2.5 pr-3 font-mono text-xs text-muted-foreground">{s.utr ?? "—"}</td>
                    <td className="py-2.5 text-muted-foreground">{formatEpochDateTime(s.created_at)}</td>
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
