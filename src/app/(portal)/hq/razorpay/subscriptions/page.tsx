import { supabaseHq } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid, MetricCard } from "@/components/shared/kpi-grid"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { formatPaise, formatEpoch } from "../_lib"
import { Repeat, CheckCircle, Pause, AlertTriangle, ExternalLink } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function SubscriptionsPage() {
  const [{ data: subscriptions }, { data: plans }] = await Promise.all([
    supabaseHq.from("razorpay_subscriptions").select("*").order("created_at", { ascending: false }).limit(200),
    supabaseHq.from("razorpay_plans").select("*").order("created_at", { ascending: false }),
  ])

  const subs = subscriptions ?? []
  const active = subs.filter((s) => s.status === "active")
  const halted = subs.filter((s) => s.status === "halted")
  const completed = subs.filter((s) => s.status === "completed")

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">

      <PageHeader title="Subscriptions" subtitle="Recurring billing via Razorpay Subscriptions. Manage plans and active subscribers." />

      <KPIGrid>
        <MetricCard label="Total Subscriptions" value={String(subs.length)} icon={Repeat} iconTone="blue" />
        <MetricCard label="Active" value={String(active.length)} icon={CheckCircle} iconTone="emerald" />
        <MetricCard label="Halted" value={String(halted.length)} hint="Payment failed" icon={AlertTriangle} iconTone="red" />
        <MetricCard label="Completed" value={String(completed.length)} icon={Pause} iconTone="slate" />
      </KPIGrid>

      {(plans ?? []).length > 0 && (
        <DetailCard title={`Plans (${(plans ?? []).length})`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                  <th className="pb-2 pr-3">Plan ID</th>
                  <th className="pb-2 pr-3">Name</th>
                  <th className="pb-2 pr-3">Amount</th>
                  <th className="pb-2 pr-3">Period</th>
                  <th className="pb-2 pr-3">Interval</th>
                  <th className="pb-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {(plans ?? []).map((p) => (
                  <tr key={p.id} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 pr-3 font-mono text-xs">{p.id}</td>
                    <td className="py-2.5 pr-3 font-medium">{p.item_name ?? "—"}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{formatPaise(p.item_amount)}</td>
                    <td className="py-2.5 pr-3 capitalize">{p.period}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{p.interval}</td>
                    <td className="py-2.5 text-muted-foreground">{formatEpoch(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DetailCard>
      )}

      <DetailCard title={`All Subscriptions (${subs.length})`}>
        {subs.length === 0 ? (
          <EmptyState icon={Repeat} title="No subscriptions" description="Subscriptions will appear here after syncing with Razorpay." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                  <th className="pb-2 pr-3">Subscription ID</th>
                  <th className="pb-2 pr-3">Plan</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Paid / Total</th>
                  <th className="pb-2 pr-3">Current Period</th>
                  <th className="pb-2 pr-3">Next Charge</th>
                  <th className="pb-2 pr-3">Link</th>
                  <th className="pb-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                    <td className="py-2.5 pr-3 font-mono text-xs">{s.id}</td>
                    <td className="py-2.5 pr-3 font-mono text-xs text-muted-foreground">{s.plan_id}</td>
                    <td className="py-2.5 pr-3"><StatusBadge tone={toneForStatus(s.status)}>{s.status}</StatusBadge></td>
                    <td className="py-2.5 pr-3 tabular-nums">{s.paid_count ?? 0} / {s.total_count ?? "∞"}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{formatEpoch(s.current_start)} — {formatEpoch(s.current_end)}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{formatEpoch(s.charge_at)}</td>
                    <td className="py-2.5 pr-3">
                      {s.short_url ? (
                        <a href={s.short_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                          Auth <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : "—"}
                    </td>
                    <td className="py-2.5 text-muted-foreground">{formatEpoch(s.created_at)}</td>
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
