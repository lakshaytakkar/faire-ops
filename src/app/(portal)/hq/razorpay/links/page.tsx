import { supabaseHq } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid, MetricCard } from "@/components/shared/kpi-grid"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { formatPaise, formatEpoch } from "../_lib"
import { Link2, CheckCircle, Clock, XCircle, ExternalLink } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function PaymentLinksPage() {
  const { data: links } = await supabaseHq
    .from("razorpay_payment_links")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200)

  const rows = links ?? []
  const paid = rows.filter((l) => l.status === "paid")
  const active = rows.filter((l) => l.status === "created" || l.status === "partially_paid")
  const expired = rows.filter((l) => l.status === "expired" || l.status === "cancelled")

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">

      <PageHeader title="Payment Links" subtitle="Shareable payment links for invoicing clients. Create links via the Razorpay actions API." />

      <KPIGrid>
        <MetricCard label="Total Links" value={String(rows.length)} icon={Link2} iconTone="blue" />
        <MetricCard label="Paid" value={String(paid.length)} hint={formatPaise(paid.reduce((s, l) => s + Number(l.amount_paid ?? 0), 0))} icon={CheckCircle} iconTone="emerald" />
        <MetricCard label="Active" value={String(active.length)} icon={Clock} iconTone="amber" />
        <MetricCard label="Expired / Cancelled" value={String(expired.length)} icon={XCircle} iconTone="red" />
      </KPIGrid>

      <DetailCard title={`All Payment Links (${rows.length})`}>
        {rows.length === 0 ? (
          <EmptyState icon={Link2} title="No payment links" description="Payment links will appear here after syncing or creation." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                  <th className="pb-2 pr-3">ID</th>
                  <th className="pb-2 pr-3">Amount</th>
                  <th className="pb-2 pr-3">Description</th>
                  <th className="pb-2 pr-3">Customer</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Paid</th>
                  <th className="pb-2 pr-3">Link</th>
                  <th className="pb-2 pr-3">Expires</th>
                  <th className="pb-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <tr key={l.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                    <td className="py-2.5 pr-3 font-mono text-xs">{l.id}</td>
                    <td className="py-2.5 pr-3 tabular-nums font-medium">{formatPaise(l.amount)}</td>
                    <td className="py-2.5 pr-3 truncate max-w-[180px]">{l.description ?? "—"}</td>
                    <td className="py-2.5 pr-3 truncate max-w-[140px]">{l.customer_name ?? l.customer_email ?? "—"}</td>
                    <td className="py-2.5 pr-3"><StatusBadge tone={toneForStatus(l.status)}>{l.status}</StatusBadge></td>
                    <td className="py-2.5 pr-3 tabular-nums">{formatPaise(l.amount_paid)}</td>
                    <td className="py-2.5 pr-3">
                      {l.short_url ? (
                        <a href={l.short_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                          Open <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : "—"}
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{formatEpoch(l.expire_by)}</td>
                    <td className="py-2.5 text-muted-foreground">{formatEpoch(l.created_at)}</td>
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
