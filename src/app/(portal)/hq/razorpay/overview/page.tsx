import { supabaseHq } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid, MetricCard } from "@/components/shared/kpi-grid"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { formatPaise, formatEpochDateTime } from "../_lib"
import { SyncRazorpayButton } from "../_sync-button"
import { IndianRupee, ArrowDownToLine, ArrowUpFromLine, RefreshCw, AlertTriangle, CreditCard, Link2, FileText, Clock } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function RazorpayOverviewPage() {
  const [
    { data: payments },
    { data: refunds },
    { data: settlements },
    { data: paymentLinks },
    { data: invoices },
    { data: payouts },
    { data: disputes },
    { data: syncLogs },
    { data: recentPayments },
  ] = await Promise.all([
    supabaseHq.from("razorpay_payments").select("id, amount, status, method, created_at"),
    supabaseHq.from("razorpay_refunds").select("id, amount, status"),
    supabaseHq.from("razorpay_settlements").select("id, amount, status"),
    supabaseHq.from("razorpay_payment_links").select("id, amount, status"),
    supabaseHq.from("razorpay_invoices").select("id, amount, status"),
    supabaseHq.from("razorpay_payouts").select("id, amount, status"),
    supabaseHq.from("razorpay_disputes").select("id, amount, status"),
    supabaseHq.from("razorpay_sync_log").select("*").order("started_at", { ascending: false }).limit(5),
    supabaseHq.from("razorpay_payments").select("id, amount, currency, status, method, email, contact, description, created_at").order("created_at", { ascending: false }).limit(10),
  ])

  const rows = payments ?? []
  const captured = rows.filter((p) => p.status === "captured")
  const capturedTotal = captured.reduce((s, p) => s + Number(p.amount ?? 0), 0)
  const authorized = rows.filter((p) => p.status === "authorized")
  const authorizedTotal = authorized.reduce((s, p) => s + Number(p.amount ?? 0), 0)
  const refundedTotal = (refunds ?? []).filter((r) => r.status === "processed").reduce((s, r) => s + Number(r.amount ?? 0), 0)
  const settledTotal = (settlements ?? []).filter((s) => s.status === "processed").reduce((s, r) => s + Number(r.amount ?? 0), 0)
  const openDisputes = (disputes ?? []).filter((d) => d.status === "open" || d.status === "under_review")
  const pendingPayouts = (payouts ?? []).filter((p) => p.status === "queued" || p.status === "pending" || p.status === "processing")

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">

      <PageHeader
        title="Razorpay"
        subtitle="Payment gateway dashboard — collections, payouts, settlements, and billing across all verticals."
        actions={<SyncRazorpayButton />}
      />

      <KPIGrid>
        <MetricCard label="Collected" value={formatPaise(capturedTotal)} hint={`${captured.length} payments`} icon={IndianRupee} iconTone="emerald" />
        <MetricCard label="Authorized (pending)" value={formatPaise(authorizedTotal)} hint={`${authorized.length} pending capture`} icon={Clock} iconTone="amber" />
        <MetricCard label="Refunded" value={formatPaise(refundedTotal)} hint={`${(refunds ?? []).length} refunds`} icon={RefreshCw} iconTone="red" />
        <MetricCard label="Settled" value={formatPaise(settledTotal)} hint={`${(settlements ?? []).length} settlements`} icon={ArrowDownToLine} iconTone="blue" />
      </KPIGrid>

      <KPIGrid>
        <MetricCard label="Payment Links" value={String((paymentLinks ?? []).length)} hint={`${(paymentLinks ?? []).filter((l) => l.status === "paid").length} paid`} icon={Link2} iconTone="violet" />
        <MetricCard label="Invoices" value={String((invoices ?? []).length)} hint={`${(invoices ?? []).filter((i) => i.status === "paid").length} paid`} icon={FileText} iconTone="blue" />
        <MetricCard label="Payouts" value={formatPaise(pendingPayouts.reduce((s, p) => s + Number(p.amount ?? 0), 0))} hint={`${pendingPayouts.length} pending`} icon={ArrowUpFromLine} iconTone="amber" />
        <MetricCard label="Open Disputes" value={String(openDisputes.length)} hint={openDisputes.length > 0 ? "Action required" : "All clear"} icon={AlertTriangle} iconTone={openDisputes.length > 0 ? "red" : "emerald"} />
      </KPIGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <DetailCard title="Recent Payments">
            {(recentPayments ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No payments synced yet. Add your Razorpay API keys and run a sync.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                      <th className="pb-2 pr-3">ID</th>
                      <th className="pb-2 pr-3">Amount</th>
                      <th className="pb-2 pr-3">Method</th>
                      <th className="pb-2 pr-3">Status</th>
                      <th className="pb-2 pr-3">Customer</th>
                      <th className="pb-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(recentPayments ?? []).map((p) => (
                      <tr key={p.id} className="border-b border-border/50 last:border-0">
                        <td className="py-2.5 pr-3 font-mono text-xs">{p.id}</td>
                        <td className="py-2.5 pr-3 tabular-nums font-medium">{formatPaise(p.amount)}</td>
                        <td className="py-2.5 pr-3 capitalize">{p.method ?? "—"}</td>
                        <td className="py-2.5 pr-3"><StatusBadge tone={toneForStatus(p.status)}>{p.status}</StatusBadge></td>
                        <td className="py-2.5 pr-3 truncate max-w-[140px]">{p.email ?? p.contact ?? "—"}</td>
                        <td className="py-2.5 text-muted-foreground">{formatEpochDateTime(p.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DetailCard>
        </div>

        <div className="space-y-5">
          <DetailCard title="Sync Status">
            {(syncLogs ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No syncs yet</p>
            ) : (
              <div className="space-y-3">
                {(syncLogs ?? []).map((log) => (
                  <div key={log.id} className="flex items-center justify-between text-sm">
                    <div>
                      <StatusBadge tone={toneForStatus(log.status)}>{log.status}</StatusBadge>
                      <span className="ml-2 text-muted-foreground text-xs">{log.triggered_by}</span>
                    </div>
                    <div className="text-right">
                      <span className="tabular-nums">{log.records_synced ?? 0} synced</span>
                      <div className="text-xs text-muted-foreground">{new Date(log.started_at).toLocaleString("en-IN")}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DetailCard>

          <DetailCard title="Payment Methods">
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No data</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(
                  rows.reduce<Record<string, number>>((acc, p) => {
                    const m = p.method ?? "other"
                    acc[m] = (acc[m] ?? 0) + 1
                    return acc
                  }, {})
                )
                  .sort((a, b) => b[1] - a[1])
                  .map(([method, count]) => (
                    <div key={method} className="flex items-center justify-between text-sm">
                      <span className="capitalize">{method}</span>
                      <span className="tabular-nums font-medium">{count}</span>
                    </div>
                  ))}
              </div>
            )}
          </DetailCard>
        </div>
      </div>
    </div>
  )
}
