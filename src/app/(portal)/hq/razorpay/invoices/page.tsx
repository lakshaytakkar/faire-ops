import { supabaseHq } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid, MetricCard } from "@/components/shared/kpi-grid"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { formatPaise, formatEpoch } from "../_lib"
import { FileText, CheckCircle, Clock, Send, ExternalLink } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function InvoicesPage() {
  const { data: invoices } = await supabaseHq
    .from("razorpay_invoices")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200)

  const rows = invoices ?? []
  const paid = rows.filter((i) => i.status === "paid")
  const issued = rows.filter((i) => i.status === "issued")
  const draft = rows.filter((i) => i.status === "draft")
  const overdue = rows.filter((i) => i.status === "expired")

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">

      <PageHeader title="Invoices" subtitle="GST-compliant invoices created via Razorpay. Supports line items, HSN/SAC codes, and auto-notifications." />

      <KPIGrid>
        <MetricCard label="Total Invoices" value={String(rows.length)} icon={FileText} iconTone="blue" />
        <MetricCard label="Paid" value={String(paid.length)} hint={formatPaise(paid.reduce((s, i) => s + Number(i.amount_paid ?? 0), 0))} icon={CheckCircle} iconTone="emerald" />
        <MetricCard label="Issued" value={String(issued.length)} hint="Awaiting payment" icon={Send} iconTone="amber" />
        <MetricCard label="Draft" value={String(draft.length)} icon={Clock} iconTone="slate" />
      </KPIGrid>

      <DetailCard title={`All Invoices (${rows.length})`}>
        {rows.length === 0 ? (
          <EmptyState icon={FileText} title="No invoices" description="Invoices will appear here after syncing or creation via Razorpay." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                  <th className="pb-2 pr-3">Invoice #</th>
                  <th className="pb-2 pr-3">Customer</th>
                  <th className="pb-2 pr-3">Amount</th>
                  <th className="pb-2 pr-3">Paid</th>
                  <th className="pb-2 pr-3">Due</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Tax</th>
                  <th className="pb-2 pr-3">Link</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((inv) => {
                  const cust = inv.customer_details as Record<string, unknown> | null
                  return (
                    <tr key={inv.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                      <td className="py-2.5 pr-3 font-mono text-xs">{inv.invoice_number ?? inv.id}</td>
                      <td className="py-2.5 pr-3 truncate max-w-[160px]">{(cust?.name as string) ?? "—"}</td>
                      <td className="py-2.5 pr-3 tabular-nums font-medium">{formatPaise(inv.amount)}</td>
                      <td className="py-2.5 pr-3 tabular-nums">{formatPaise(inv.amount_paid)}</td>
                      <td className="py-2.5 pr-3 tabular-nums">{formatPaise(inv.amount_due)}</td>
                      <td className="py-2.5 pr-3"><StatusBadge tone={toneForStatus(inv.status)}>{inv.status}</StatusBadge></td>
                      <td className="py-2.5 pr-3 tabular-nums text-muted-foreground">{formatPaise(inv.tax_amount)}</td>
                      <td className="py-2.5 pr-3">
                        {inv.short_url ? (
                          <a href={inv.short_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                            Pay <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : "—"}
                      </td>
                      <td className="py-2.5 text-muted-foreground">{formatEpoch(inv.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </DetailCard>
    </div>
  )
}
