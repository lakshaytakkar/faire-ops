import { Receipt, TrendingUp, TrendingDown, Equal } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { GenericAddLauncher } from "../../_components/GenericEditLauncher"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { LedgerTable, type LedgerRow } from "@/components/shared/ledger-table"
import { formatCurrency } from "@/lib/format"
import type { StatusTone } from "@/components/shared/status-badge"

export const dynamic = "force-dynamic"
export const metadata = { title: "Transactions — Life | Suprans" }

interface TxRow {
  id: string
  date: string | null
  type: string | null
  category: string | null
  sub_category: string | null
  amount: number | null
  currency: string | null
  account: string | null
  narration: string | null
  notes: string | null
  receipt_url: string | null
  itr_relevant: boolean | null
}

async function fetchTransactions() {
  const { data, error } = await supabaseLife
    .from("life_transactions")
    .select(
      "id, date, type, category, sub_category, amount, currency, account, narration, notes, receipt_url, itr_relevant",
    )
    .order("date", { ascending: false })
    .limit(500)
  if (error) console.error("life.life_transactions:", error.message)
  return (data ?? []) as TxRow[]
}

function toneForType(type: string | null): StatusTone {
  switch (type) {
    case "income":
      return "emerald"
    case "expense":
      return "red"
    case "transfer":
      return "blue"
    default:
      return "slate"
  }
}

export default async function LifeTransactionsPage() {
  const rows = await fetchTransactions()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  const monthRows = rows.filter((r) => {
    if (!r.date) return false
    const d = new Date(r.date)
    return d.getFullYear() === year && d.getMonth() === month
  })
  const ytdRows = rows.filter((r) => {
    if (!r.date) return false
    const d = new Date(r.date)
    return d.getFullYear() === year
  })

  const sumBy = (arr: TxRow[], type: string) =>
    arr
      .filter((r) => r.type === type)
      .reduce((s, r) => s + (r.amount ?? 0), 0)

  const monthIncome = sumBy(monthRows, "income")
  const monthExpense = sumBy(monthRows, "expense")
  const monthNet = monthIncome - monthExpense
  const ytdNet = sumBy(ytdRows, "income") - sumBy(ytdRows, "expense")

  const ledgerRows: LedgerRow[] = rows
    .filter((r) => r.date)
    .map((r) => {
      const amount = r.amount ?? 0
      const row: LedgerRow = {
        id: r.id,
        date: r.date as string,
        description: r.narration || r.category || "Transaction",
        category: {
          label: r.sub_category || r.category || (r.type ?? "—"),
          tone: toneForType(r.type),
        },
        debit:
          r.type === "expense" ? amount : r.type === "transfer" ? amount : null,
        credit: r.type === "income" ? amount : null,
        href: `/life/finance/transactions/${r.id}`,
      }
      return row
    })

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Transactions"
        subtitle={`${rows.length.toLocaleString("en-IN")} transaction${rows.length === 1 ? "" : "s"}`}
        actions={
          <GenericAddLauncher
            table="life_transactions"
            listHref="/life/finance/transactions"
            title="New transaction"
          />
        }
      />

      <KPIGrid>
        <MetricCard
          label="Income (month)"
          value={formatCurrency(monthIncome)}
          icon={TrendingUp}
          iconTone="emerald"
        />
        <MetricCard
          label="Expense (month)"
          value={formatCurrency(monthExpense)}
          icon={TrendingDown}
          iconTone="amber"
        />
        <MetricCard
          label="Net (month)"
          value={formatCurrency(monthNet)}
          icon={Equal}
          iconTone={monthNet >= 0 ? "emerald" : "red"}
        />
        <MetricCard
          label="Net (YTD)"
          value={formatCurrency(ytdNet)}
          icon={Receipt}
          iconTone={ytdNet >= 0 ? "emerald" : "red"}
        />
      </KPIGrid>

      <LedgerTable
        rows={ledgerRows}
        currency="INR"
        locale="en-IN"
        openingBalance={0}
        emptyMessage="No transactions yet. Every rupee counts — log income, expense, transfers."
      />
    </div>
  )
}
