import { supabaseHq } from "@/lib/supabase"
import { notFound } from "next/navigation"
import { BackLink } from "@/components/shared/back-link"
import { HeroCard } from "@/components/shared/hero-card"
import { KPIGrid, MetricCard } from "@/components/shared/kpi-grid"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { formatPaise, formatEpochDateTime, rpMethodLabel } from "../../_lib"
import { CreditCard, IndianRupee, RefreshCw, Building2 } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [{ data: payment }, { data: refunds }] = await Promise.all([
    supabaseHq.from("razorpay_payments").select("*").eq("id", id).single(),
    supabaseHq.from("razorpay_refunds").select("*").eq("payment_id", id).order("created_at", { ascending: false }),
  ])

  if (!payment) return notFound()

  const card = payment.card as Record<string, unknown> | null

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <BackLink href="/hq/razorpay/all" label="All Payments" />

      <HeroCard
        title={payment.id}
        subtitle={payment.description ?? "Payment transaction"}
        avatar={
          <div className="h-11 w-11 rounded-md border border-blue-200 bg-blue-50 text-blue-700 flex items-center justify-center">
            <CreditCard className="h-5 w-5" />
          </div>
        }
        meta={<StatusBadge tone={toneForStatus(payment.status)}>{payment.status}</StatusBadge>}
      />

      <KPIGrid>
        <MetricCard label="Amount" value={formatPaise(payment.amount)} icon={IndianRupee} iconTone="emerald" />
        <MetricCard label="Fee + GST" value={formatPaise(payment.fee)} hint={`Tax: ${formatPaise(payment.tax)}`} icon={Building2} iconTone="amber" />
        <MetricCard label="Refunded" value={formatPaise(payment.amount_refunded)} hint={payment.refund_status ?? "None"} icon={RefreshCw} iconTone={payment.refund_status ? "red" : "slate"} />
        <MetricCard label="Net" value={formatPaise(Number(payment.amount ?? 0) - Number(payment.fee ?? 0) - Number(payment.amount_refunded ?? 0))} icon={IndianRupee} iconTone="blue" />
      </KPIGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <DetailCard title="Payment Details">
            <InfoRow label="Payment ID" value={payment.id} mono />
            <InfoRow label="Order ID" value={payment.order_id ?? "—"} mono />
            <InfoRow label="Invoice ID" value={payment.invoice_id ?? "—"} mono />
            <InfoRow label="Amount" value={formatPaise(payment.amount)} />
            <InfoRow label="Currency" value={payment.currency} />
            <InfoRow label="Status" value={<StatusBadge tone={toneForStatus(payment.status)}>{payment.status}</StatusBadge>} />
            <InfoRow label="Captured" value={payment.captured ? "Yes" : "No"} />
            <InfoRow label="International" value={payment.international ? "Yes" : "No"} />
            <InfoRow label="Created" value={formatEpochDateTime(payment.created_at)} />
          </DetailCard>

          <DetailCard title="Payment Method">
            <InfoRow label="Method" value={rpMethodLabel(payment.method)} />
            {payment.method === "card" && card && (
              <>
                <InfoRow label="Card Last 4" value={String(card.last4 ?? "—")} />
                <InfoRow label="Network" value={String(card.network ?? "—")} />
                <InfoRow label="Type" value={String(card.type ?? "—")} />
                <InfoRow label="Issuer" value={String(card.issuer ?? "—")} />
              </>
            )}
            {payment.method === "upi" && <InfoRow label="VPA" value={payment.vpa ?? "—"} />}
            {payment.method === "netbanking" && <InfoRow label="Bank" value={payment.bank ?? "—"} />}
            {payment.method === "wallet" && <InfoRow label="Wallet" value={payment.wallet ?? "—"} />}
          </DetailCard>

          {(refunds ?? []).length > 0 && (
            <DetailCard title={`Refunds (${(refunds ?? []).length})`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                      <th className="pb-2 pr-3">Refund ID</th>
                      <th className="pb-2 pr-3">Amount</th>
                      <th className="pb-2 pr-3">Status</th>
                      <th className="pb-2 pr-3">Speed</th>
                      <th className="pb-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(refunds ?? []).map((r) => (
                      <tr key={r.id} className="border-b border-border/50 last:border-0">
                        <td className="py-2 pr-3 font-mono text-xs">{r.id}</td>
                        <td className="py-2 pr-3 tabular-nums">{formatPaise(r.amount)}</td>
                        <td className="py-2 pr-3"><StatusBadge tone={toneForStatus(r.status)}>{r.status}</StatusBadge></td>
                        <td className="py-2 pr-3">{r.speed_processed ?? r.speed_requested ?? "—"}</td>
                        <td className="py-2 text-muted-foreground">{formatEpochDateTime(r.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DetailCard>
          )}

          {payment.error_code && (
            <DetailCard title="Error Details">
              <InfoRow label="Error Code" value={payment.error_code} />
              <InfoRow label="Description" value={payment.error_description ?? "—"} />
              <InfoRow label="Source" value={payment.error_source ?? "—"} />
              <InfoRow label="Step" value={payment.error_step ?? "—"} />
              <InfoRow label="Reason" value={payment.error_reason ?? "—"} />
            </DetailCard>
          )}
        </div>

        <div className="space-y-5">
          <DetailCard title="Customer">
            <InfoRow label="Email" value={payment.email ?? "—"} />
            <InfoRow label="Phone" value={payment.contact ?? "—"} />
            <InfoRow label="Customer ID" value={payment.customer_id ?? "—"} mono />
          </DetailCard>

          <DetailCard title="Fees Breakdown">
            <InfoRow label="Razorpay Fee" value={formatPaise(payment.fee)} />
            <InfoRow label="GST" value={formatPaise(payment.tax)} />
            <InfoRow label="Net Amount" value={formatPaise(Number(payment.amount ?? 0) - Number(payment.fee ?? 0))} />
          </DetailCard>

          {payment.notes && Object.keys(payment.notes).length > 0 && (
            <DetailCard title="Notes">
              {Object.entries(payment.notes as Record<string, string>).map(([k, v]) => (
                <InfoRow key={k} label={k} value={v} />
              ))}
            </DetailCard>
          )}

          <DetailCard title="Metadata">
            <InfoRow label="Vertical" value={payment.vertical ?? "—"} />
            <InfoRow label="Space" value={payment.space_slug ?? "—"} />
            <InfoRow label="Last Synced" value={payment.synced_at ? new Date(payment.synced_at).toLocaleString("en-IN") : "—"} />
          </DetailCard>
        </div>
      </div>
    </div>
  )
}
