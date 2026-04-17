import { supabaseHq } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid, MetricCard } from "@/components/shared/kpi-grid"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { formatPaise, formatEpochDateTime, rpMethodLabel } from "../_lib"
import { CreditCard, CheckCircle, Clock, XCircle } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function AllPaymentsPage() {
  const { data: payments } = await supabaseHq
    .from("razorpay_payments")
    .select("id, amount, currency, status, method, email, contact, description, order_id, vpa, bank, wallet, fee, tax, captured, refund_status, created_at")
    .order("created_at", { ascending: false })
    .limit(200)

  const rows = payments ?? []
  const captured = rows.filter((p) => p.status === "captured")
  const authorized = rows.filter((p) => p.status === "authorized")
  const failed = rows.filter((p) => p.status === "failed")
  const refunded = rows.filter((p) => p.status === "refunded")

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">

      <PageHeader
        title="Payments"
        subtitle="All payment transactions synced from Razorpay."
      />

      <KPIGrid>
        <MetricCard label="Total" value={String(rows.length)} icon={CreditCard} iconTone="blue" />
        <MetricCard label="Captured" value={String(captured.length)} hint={formatPaise(captured.reduce((s, p) => s + Number(p.amount ?? 0), 0))} icon={CheckCircle} iconTone="emerald" />
        <MetricCard label="Authorized" value={String(authorized.length)} hint="Pending capture" icon={Clock} iconTone="amber" />
        <MetricCard label="Failed" value={String(failed.length)} icon={XCircle} iconTone="red" />
      </KPIGrid>

      <DetailCard title={`All Payments (${rows.length})`}>
        {rows.length === 0 ? (
          <EmptyState icon={CreditCard} title="No payments" description="Payments will appear here after syncing with Razorpay." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                  <th className="pb-2 pr-3">Payment ID</th>
                  <th className="pb-2 pr-3">Amount</th>
                  <th className="pb-2 pr-3">Method</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Customer</th>
                  <th className="pb-2 pr-3">Description</th>
                  <th className="pb-2 pr-3">Fee</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                    <td className="py-2.5 pr-3">
                      <Link href={`/hq/razorpay/all/${p.id}`} className="font-mono text-xs text-primary hover:underline">
                        {p.id}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums font-medium">{formatPaise(p.amount, p.currency === "INR" ? "₹" : "$")}</td>
                    <td className="py-2.5 pr-3">{rpMethodLabel(p.method)}</td>
                    <td className="py-2.5 pr-3"><StatusBadge tone={toneForStatus(p.status)}>{p.status}</StatusBadge></td>
                    <td className="py-2.5 pr-3 truncate max-w-[160px]">{p.email ?? p.contact ?? "—"}</td>
                    <td className="py-2.5 pr-3 truncate max-w-[200px] text-muted-foreground">{p.description ?? "—"}</td>
                    <td className="py-2.5 pr-3 tabular-nums text-muted-foreground">{formatPaise(p.fee)}</td>
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
