import { Wallet, TrendingUp, TrendingDown, Calendar } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { GenericAddLauncher } from "../../_components/GenericEditLauncher"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import {
  TrendChartGrid,
  type TrendSeries,
} from "@/components/shared/trend-chart-grid"
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/shared/empty-state"
import { formatCurrency } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Net worth — Life | Suprans" }

interface SnapshotRow {
  id: string
  month: string | null
  total_assets: number | null
  total_liabilities: number | null
  net_worth: number | null
  notes: string | null
}

async function fetchSnapshots() {
  const { data, error } = await supabaseLife
    .from("net_worth_snapshots")
    .select("id, month, total_assets, total_liabilities, net_worth, notes")
    .order("month", { ascending: false })
    .limit(240)
  if (error) console.error("life.net_worth_snapshots:", error.message)
  return (data ?? []) as SnapshotRow[]
}

function monthLabel(month: string | null): string {
  if (!month) return "—"
  const [y, m] = month.split("-")
  if (!y || !m) return month
  const date = new Date(Number(y), Number(m) - 1, 1)
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" })
}

export default async function LifeNetWorthPage() {
  const rows = await fetchSnapshots()

  // asc by month for trend
  const asc = [...rows]
    .filter((r) => r.month)
    .sort((a, b) => (a.month! < b.month! ? -1 : a.month! > b.month! ? 1 : 0))

  const latest = asc[asc.length - 1]
  const previous = asc[asc.length - 2]
  const yearAgo = asc.find((r) => {
    if (!latest?.month || !r.month) return false
    const [ly, lm] = latest.month.split("-").map(Number)
    const [ry, rm] = r.month.split("-").map(Number)
    return ry === ly - 1 && rm === lm
  })

  const momDelta =
    latest && previous && latest.net_worth !== null && previous.net_worth !== null
      ? latest.net_worth - previous.net_worth
      : null
  const yoyDelta =
    latest && yearAgo && latest.net_worth !== null && yearAgo.net_worth !== null
      ? latest.net_worth - yearAgo.net_worth
      : null

  const buildSeries = (
    key: string,
    label: string,
    pick: (r: SnapshotRow) => number | null,
  ): TrendSeries => ({
    key,
    label,
    unit: "INR",
    data: asc
      .map((r) => ({ x: `${r.month}-01`, y: pick(r) ?? 0 }))
      .filter((p) => p.y !== null),
  })

  const series: TrendSeries[] = [
    buildSeries("net_worth", "Net worth", (r) => r.net_worth),
    buildSeries("total_assets", "Total assets", (r) => r.total_assets),
    buildSeries("total_liabilities", "Total liabilities", (r) => r.total_liabilities),
  ]

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Net worth"
        subtitle={`${rows.length.toLocaleString("en-IN")} snapshot${rows.length === 1 ? "" : "s"}`}
        actions={
          <GenericAddLauncher
            table="net_worth_snapshots"
            listHref="/life/finance/net-worth"
            title="New snapshot"
          />
        }
      />

      <KPIGrid>
        <MetricCard
          label="Latest net worth"
          value={formatCurrency(latest?.net_worth ?? null)}
          icon={Wallet}
          iconTone="emerald"
          hint={latest?.month ? monthLabel(latest.month) : undefined}
        />
        <MetricCard
          label="MoM delta"
          value={momDelta !== null ? formatCurrency(momDelta) : "—"}
          icon={TrendingUp}
          iconTone={momDelta !== null && momDelta >= 0 ? "emerald" : "red"}
        />
        <MetricCard
          label="YoY delta"
          value={yoyDelta !== null ? formatCurrency(yoyDelta) : "—"}
          icon={TrendingDown}
          iconTone={yoyDelta !== null && yoyDelta >= 0 ? "emerald" : "red"}
        />
        <MetricCard
          label="Snapshots"
          value={rows.length}
          icon={Calendar}
          iconTone="blue"
        />
      </KPIGrid>

      <TrendChartGrid series={series} columns={1} />

      {rows.length === 0 ? (
        <EmptyState
          title="No snapshots yet"
          description="Take a net-worth snapshot monthly. The curve over years becomes the most honest scoreboard."
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Assets</TableHead>
                <TableHead className="text-right">Liabilities</TableHead>
                <TableHead className="text-right">Net worth</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm tabular-nums">
                    {monthLabel(r.month)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {formatCurrency(r.total_assets)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {formatCurrency(r.total_liabilities)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm font-semibold">
                    {formatCurrency(r.net_worth)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                    {r.notes ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
