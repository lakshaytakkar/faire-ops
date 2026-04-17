import { supabaseHq } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid, MetricCard } from "@/components/shared/kpi-grid"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { formatPaise, formatEpoch } from "../_lib"
import { QrCode, CheckCircle, Ban, IndianRupee, ExternalLink } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function QrCodesPage() {
  const { data: qrCodes } = await supabaseHq
    .from("razorpay_qr_codes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200)

  const rows = qrCodes ?? []
  const active = rows.filter((q) => q.status === "active")
  const closed = rows.filter((q) => q.status === "closed")
  const totalReceived = rows.reduce((s, q) => s + Number(q.payments_amount_received ?? 0), 0)
  const totalPayments = rows.reduce((s, q) => s + Number(q.payments_count_received ?? 0), 0)

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">

      <PageHeader title="QR Codes" subtitle="UPI QR codes for receiving payments. Supports single-use and multiple-use codes." />

      <KPIGrid>
        <MetricCard label="Active" value={String(active.length)} icon={QrCode} iconTone="emerald" />
        <MetricCard label="Closed" value={String(closed.length)} icon={Ban} iconTone="slate" />
        <MetricCard label="Total Received" value={formatPaise(totalReceived)} icon={IndianRupee} iconTone="blue" />
        <MetricCard label="Payment Count" value={String(totalPayments)} icon={CheckCircle} iconTone="violet" />
      </KPIGrid>

      <DetailCard title={`All QR Codes (${rows.length})`}>
        {rows.length === 0 ? (
          <EmptyState icon={QrCode} title="No QR codes" description="UPI QR codes will appear here after creation or syncing." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                  <th className="pb-2 pr-3">QR ID</th>
                  <th className="pb-2 pr-3">Name</th>
                  <th className="pb-2 pr-3">Amount</th>
                  <th className="pb-2 pr-3">Usage</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Received</th>
                  <th className="pb-2 pr-3">Payments</th>
                  <th className="pb-2 pr-3">Image</th>
                  <th className="pb-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((q) => (
                  <tr key={q.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                    <td className="py-2.5 pr-3 font-mono text-xs">{q.id}</td>
                    <td className="py-2.5 pr-3">{q.name ?? "—"}</td>
                    <td className="py-2.5 pr-3 tabular-nums font-medium">{q.fixed_amount ? formatPaise(q.payment_amount) : "Any"}</td>
                    <td className="py-2.5 pr-3 capitalize">{q.usage?.replace("_", " ") ?? "—"}</td>
                    <td className="py-2.5 pr-3"><StatusBadge tone={toneForStatus(q.status)}>{q.status}</StatusBadge></td>
                    <td className="py-2.5 pr-3 tabular-nums">{formatPaise(q.payments_amount_received)}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{q.payments_count_received ?? 0}</td>
                    <td className="py-2.5 pr-3">
                      {q.image_url ? (
                        <a href={q.image_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : "—"}
                    </td>
                    <td className="py-2.5 text-muted-foreground">{formatEpoch(q.created_at)}</td>
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
