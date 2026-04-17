import { PieChart, TrendingDown, Scale, TrendingUp } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { GenericAddLauncher } from "../../_components/GenericEditLauncher"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { formatCurrency } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Budgets — Life | Suprans" }

interface BudgetRow {
  id: string
  month: string | null
  category: string | null
  budget_amount: number | null
}

interface TxnRow {
  date: string | null
  type: string | null
  category: string | null
  amount: number | null
}

async function fetchBudgets() {
  const { data, error } = await supabaseLife
    .from("monthly_budgets")
    .select("id, month, category, budget_amount")
    .order("month", { ascending: false })
    .limit(200)
  if (error) console.error("life.monthly_budgets:", error.message)
  return (data ?? []) as BudgetRow[]
}

async function fetchExpenses(monthKey: string) {
  const first = `${monthKey}-01`
  const next = nextMonthFirst(monthKey)
  const { data, error } = await supabaseLife
    .from("life_transactions")
    .select("date, type, category, amount")
    .eq("type", "expense")
    .gte("date", first)
    .lt("date", next)
  if (error) console.error("life.life_transactions:", error.message)
  return (data ?? []) as TxnRow[]
}

function currentMonthKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function nextMonthFirst(monthKey: string): string {
  const [y, m] = monthKey.split("-").map((x) => Number(x))
  const d = new Date(Date.UTC(y, m - 1, 1))
  d.setUTCMonth(d.getUTCMonth() + 1)
  return d.toISOString().slice(0, 10)
}

export default async function LifeBudgetsPage() {
  const rows = await fetchBudgets()
  const key = currentMonthKey()
  const currentRows = rows.filter((r) => (r.month ?? "").startsWith(key))
  const expenses = await fetchExpenses(key)

  // Sum spend per category
  const spentByCategory = new Map<string, number>()
  for (const t of expenses) {
    const cat = (t.category ?? "").toLowerCase()
    spentByCategory.set(cat, (spentByCategory.get(cat) ?? 0) + Number(t.amount ?? 0))
  }
  function spentFor(category: string | null): number {
    return spentByCategory.get((category ?? "").toLowerCase()) ?? 0
  }

  const planned = currentRows.reduce((s, r) => s + Number(r.budget_amount ?? 0), 0)
  const spent = expenses.reduce((s, t) => s + Number(t.amount ?? 0), 0)
  const remaining = planned - spent

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Budgets"
        subtitle={`${rows.length.toLocaleString("en-IN")} budget line${rows.length === 1 ? "" : "s"}`}
        actions={
          <GenericAddLauncher
            table="monthly_budgets"
            listHref="/life/finance/budgets"
            title="New budget line"
          />
        }
      />

      <KPIGrid>
        <MetricCard label="Planned (month)" value={formatCurrency(planned)} icon={PieChart} iconTone="blue" />
        <MetricCard label="Spent (month)" value={formatCurrency(spent)} icon={TrendingDown} iconTone="amber" hint="from life.life_transactions" />
        <MetricCard
          label="Remaining"
          value={formatCurrency(remaining)}
          icon={Scale}
          iconTone={remaining >= 0 ? "emerald" : "red"}
        />
        <MetricCard
          label="Lines (month)"
          value={currentRows.length}
          icon={TrendingUp}
          iconTone="slate"
        />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={PieChart}
          title="No budgets set"
          description="Plan the month before it spends you. Every category with a number beats no number at all."
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Planned</TableHead>
                <TableHead className="text-right">Spent (this month)</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const isCurrent = (r.month ?? "").startsWith(key)
                const rowSpent = isCurrent ? spentFor(r.category) : 0
                const variance = Number(r.budget_amount ?? 0) - rowSpent
                const over = variance < 0
                return (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{r.month ?? "—"}</TableCell>
                    <TableCell className="font-medium text-sm">{r.category ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {formatCurrency(r.budget_amount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {isCurrent ? formatCurrency(rowSpent) : "—"}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums text-sm font-semibold ${isCurrent ? (over ? "text-red-600" : "text-emerald-600") : "text-muted-foreground"}`}
                    >
                      {isCurrent ? formatCurrency(variance) : "—"}
                    </TableCell>
                    <TableCell>
                      {isCurrent ? (
                        <StatusBadge tone={over ? "red" : "emerald"}>
                          {over ? "over" : "on track"}
                        </StatusBadge>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
