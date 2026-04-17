import { supabaseHq } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid, MetricCard } from "@/components/shared/kpi-grid"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { formatPaise, formatEpochDateTime } from "../_lib"
import { ShoppingCart, CheckCircle, Clock, Target } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function OrdersPage() {
  const { data: orders } = await supabaseHq
    .from("razorpay_orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200)

  const rows = orders ?? []
  const paid = rows.filter((o) => o.status === "paid")
  const attempted = rows.filter((o) => o.status === "attempted")
  const created = rows.filter((o) => o.status === "created")

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">

      <PageHeader title="Orders" subtitle="Razorpay orders — each order can have multiple payment attempts." />

      <KPIGrid>
        <MetricCard label="Total Orders" value={String(rows.length)} icon={ShoppingCart} iconTone="blue" />
        <MetricCard label="Paid" value={String(paid.length)} hint={formatPaise(paid.reduce((s, o) => s + Number(o.amount_paid ?? 0), 0))} icon={CheckCircle} iconTone="emerald" />
        <MetricCard label="Attempted" value={String(attempted.length)} icon={Target} iconTone="amber" />
        <MetricCard label="Created" value={String(created.length)} hint="Awaiting payment" icon={Clock} iconTone="slate" />
      </KPIGrid>

      <DetailCard title={`All Orders (${rows.length})`}>
        {rows.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="No orders" description="Orders will appear here after syncing with Razorpay." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                  <th className="pb-2 pr-3">Order ID</th>
                  <th className="pb-2 pr-3">Amount</th>
                  <th className="pb-2 pr-3">Paid</th>
                  <th className="pb-2 pr-3">Due</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Attempts</th>
                  <th className="pb-2 pr-3">Receipt</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                    <td className="py-2.5 pr-3 font-mono text-xs">{o.id}</td>
                    <td className="py-2.5 pr-3 tabular-nums font-medium">{formatPaise(o.amount)}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{formatPaise(o.amount_paid)}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{formatPaise(o.amount_due)}</td>
                    <td className="py-2.5 pr-3"><StatusBadge tone={toneForStatus(o.status)}>{o.status}</StatusBadge></td>
                    <td className="py-2.5 pr-3 tabular-nums">{o.attempts ?? 0}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground truncate max-w-[120px]">{o.receipt ?? "—"}</td>
                    <td className="py-2.5 text-muted-foreground">{formatEpochDateTime(o.created_at)}</td>
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
