import { supabaseHq } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid, MetricCard } from "@/components/shared/kpi-grid"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { formatPaise, formatEpochDateTime } from "../_lib"
import { ArrowLeftRight, ArrowDownToLine, ArrowUpFromLine, Wallet } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function TransactionsPage() {
  const { data: transactions } = await supabaseHq
    .from("razorpay_transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200)

  const rows = transactions ?? []
  const credits = rows.filter((t) => Number(t.credit ?? 0) > 0)
  const debits = rows.filter((t) => Number(t.debit ?? 0) > 0)
  const totalCredit = credits.reduce((s, t) => s + Number(t.credit ?? 0), 0)
  const totalDebit = debits.reduce((s, t) => s + Number(t.debit ?? 0), 0)
  const latestBalance = rows.length > 0 ? Number(rows[0].balance ?? 0) : 0

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">

      <PageHeader title="Transactions" subtitle="Razorpay X account statement — all credits and debits on your business account." />

      <KPIGrid>
        <MetricCard label="Current Balance" value={formatPaise(latestBalance)} icon={Wallet} iconTone="blue" />
        <MetricCard label="Total Credits" value={formatPaise(totalCredit)} hint={`${credits.length} entries`} icon={ArrowDownToLine} iconTone="emerald" />
        <MetricCard label="Total Debits" value={formatPaise(totalDebit)} hint={`${debits.length} entries`} icon={ArrowUpFromLine} iconTone="red" />
        <MetricCard label="Entries" value={String(rows.length)} icon={ArrowLeftRight} iconTone="slate" />
      </KPIGrid>

      <DetailCard title={`Account Statement (${rows.length})`}>
        {rows.length === 0 ? (
          <EmptyState icon={ArrowLeftRight} title="No transactions" description="Razorpay X transactions will appear here after syncing." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                  <th className="pb-2 pr-3">Transaction ID</th>
                  <th className="pb-2 pr-3">Credit</th>
                  <th className="pb-2 pr-3">Debit</th>
                  <th className="pb-2 pr-3">Balance</th>
                  <th className="pb-2 pr-3">Account</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                    <td className="py-2.5 pr-3 font-mono text-xs">{t.id}</td>
                    <td className="py-2.5 pr-3 tabular-nums text-emerald-600 font-medium">{Number(t.credit ?? 0) > 0 ? `+${formatPaise(t.credit)}` : "—"}</td>
                    <td className="py-2.5 pr-3 tabular-nums text-red-600 font-medium">{Number(t.debit ?? 0) > 0 ? `-${formatPaise(t.debit)}` : "—"}</td>
                    <td className="py-2.5 pr-3 tabular-nums font-medium">{formatPaise(t.balance)}</td>
                    <td className="py-2.5 pr-3 font-mono text-xs text-muted-foreground">{t.account_number ? `•••${t.account_number.slice(-4)}` : "—"}</td>
                    <td className="py-2.5 text-muted-foreground">{formatEpochDateTime(t.created_at)}</td>
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
