import Link from "next/link"
import { LineChart, TrendingUp, Wallet, Hash } from "lucide-react"
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
export const metadata = { title: "Investments — Life | Suprans" }

interface InvestmentRow {
  id: string
  name: string | null
  asset_class: string | null
  platform: string | null
  total_invested: number | null
  current_value: number | null
  units: number | null
}

async function fetchInvestments() {
  const { data, error } = await supabaseLife
    .from("investments")
    .select("id, name, asset_class, platform, total_invested, current_value, units")
    .order("current_value", { ascending: false })
    .limit(200)
  if (error) console.error("life.investments:", error.message)
  return (data ?? []) as InvestmentRow[]
}

export default async function LifeInvestmentsPage() {
  const rows = await fetchInvestments()

  const invested = rows.reduce((s, r) => s + (r.total_invested ?? 0), 0)
  const current = rows.reduce((s, r) => s + (r.current_value ?? 0), 0)
  const pnl = current - invested

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Investments"
        subtitle={`${rows.length.toLocaleString("en-IN")} holding${rows.length === 1 ? "" : "s"}`}
        actions={
          <GenericAddLauncher
            table="investments"
            listHref="/life/finance/investments"
            title="New investment"
          />
        }
      />

      <KPIGrid>
        <MetricCard label="Total invested" value={formatCurrency(invested)} icon={Wallet} iconTone="blue" />
        <MetricCard label="Current value" value={formatCurrency(current)} icon={LineChart} iconTone="violet" />
        <MetricCard
          label="Unrealised P&L"
          value={formatCurrency(pnl)}
          icon={TrendingUp}
          iconTone={pnl >= 0 ? "emerald" : "red"}
        />
        <MetricCard label="Holdings" value={rows.length} icon={Hash} iconTone="slate" />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={LineChart}
          title="No investments tracked"
          description="Add mutual funds, stocks, crypto, or anything else you own. See what's working, together."
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Asset class</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead className="text-right">Invested</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">P&L</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const ppl = (r.current_value ?? 0) - (r.total_invested ?? 0)
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-sm">
                      <Link
                        href={`/life/finance/investments/${r.id}`}
                        className="hover:text-primary"
                      >
                        {r.name ?? "—"}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {r.asset_class ? <StatusBadge tone="blue">{r.asset_class}</StatusBadge> : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.platform ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {formatCurrency(r.total_invested)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {formatCurrency(r.current_value)}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums text-sm font-semibold ${ppl >= 0 ? "text-emerald-600" : "text-red-600"}`}
                    >
                      {formatCurrency(ppl)}
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
