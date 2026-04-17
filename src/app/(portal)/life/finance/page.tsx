import { Wallet, TrendingUp, TrendingDown, PiggyBank, Receipt } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { DetailCard } from "@/components/shared/detail-views"
import { formatCurrency, formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Finance — Life | Suprans" }

interface NetWorthRow {
  month: string | null
  net_worth: number | null
  total_assets: number | null
  total_liabilities: number | null
}
interface TransactionRow {
  id: string
  date: string | null
  type: string | null
  amount: number | null
  category: string | null
  narration: string | null
}
interface InvestmentRow {
  total_invested: number | null
  current_value: number | null
}

async function fetchFinance() {
  const [nw, txns, inv] = await Promise.all([
    supabaseLife
      .from("net_worth_snapshots")
      .select("month, net_worth, total_assets, total_liabilities")
      .order("month", { ascending: false })
      .limit(1),
    supabaseLife
      .from("life_transactions")
      .select("id, date, type, amount, category, narration")
      .order("date", { ascending: false })
      .limit(200),
    supabaseLife.from("investments").select("total_invested, current_value"),
  ])
  if (nw.error) console.error("life.net_worth_snapshots:", nw.error.message)
  if (txns.error) console.error("life.life_transactions:", txns.error.message)
  if (inv.error) console.error("life.investments:", inv.error.message)
  return {
    nw: (nw.data ?? []) as NetWorthRow[],
    txns: (txns.data ?? []) as TransactionRow[],
    inv: (inv.data ?? []) as InvestmentRow[],
  }
}

export default async function LifeFinancePage() {
  const { nw, txns, inv } = await fetchFinance()
  const latestNW = nw[0]

  const now = new Date()
  const thisMonth = txns.filter((t) => {
    if (!t.date) return false
    const d = new Date(t.date)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })
  const monthIncome = thisMonth
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + (t.amount ?? 0), 0)
  const monthExpense = thisMonth
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + (t.amount ?? 0), 0)

  const invested = inv.reduce((s, i) => s + (i.total_invested ?? 0), 0)
  const currentVal = inv.reduce((s, i) => s + (i.current_value ?? 0), 0)
  const pnl = currentVal - invested

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Finance"
        subtitle="Net worth, cash flow, and portfolio at a glance."
      />

      <KPIGrid>
        <MetricCard
          label="Net worth"
          value={formatCurrency(latestNW?.net_worth ?? null)}
          icon={Wallet}
          iconTone="emerald"
          hint={latestNW?.month ? `as of ${latestNW.month}` : undefined}
        />
        <MetricCard
          label="Income (month)"
          value={formatCurrency(monthIncome)}
          icon={TrendingUp}
          iconTone="blue"
        />
        <MetricCard
          label="Expense (month)"
          value={formatCurrency(monthExpense)}
          icon={TrendingDown}
          iconTone="amber"
        />
        <MetricCard
          label="Portfolio P&L"
          value={formatCurrency(pnl)}
          icon={PiggyBank}
          iconTone={pnl >= 0 ? "emerald" : "red"}
          hint={`Invested ${formatCurrency(invested)}`}
        />
      </KPIGrid>

      <DetailCard title="Recent transactions">
        {txns.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No transactions yet"
            description="Track every rupee in and out. Patterns become obvious once they're written down."
          />
        ) : (
          <ul className="divide-y divide-border">
            {txns.slice(0, 10).map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2.5 gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {t.narration ?? t.category ?? "Transaction"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(t.date)} · {t.category ?? "—"}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge tone={toneForStatus(t.type)}>{t.type ?? "—"}</StatusBadge>
                  <span className="tabular-nums text-sm font-semibold">
                    {formatCurrency(t.amount)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DetailCard>
    </div>
  )
}
