import { CreditCard, Calendar, TrendingDown, Hash } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { GenericAddLauncher } from "../../_components/GenericEditLauncher"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { formatCurrency, formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "EMIs — Life | Suprans" }

interface EmiRow {
  id: string
  label: string | null
  lender: string | null
  status: string | null
  monthly_amount: number | null
  outstanding: number | null
  next_due: string | null
  tenure_left: number | null
}

async function fetchEmis() {
  const { data, error } = await supabaseLife
    .from("emis")
    .select("id, label, lender, status, monthly_amount, outstanding, next_due, tenure_left")
    .order("next_due", { ascending: true })
    .limit(200)
  if (error) console.error("life.emis:", error.message)
  return (data ?? []) as EmiRow[]
}

export default async function LifeEmisPage() {
  const rows = await fetchEmis()
  const active = rows.filter((r) => r.status === "active")
  const monthly = active.reduce((s, r) => s + (r.monthly_amount ?? 0), 0)
  const outstanding = active.reduce((s, r) => s + (r.outstanding ?? 0), 0)

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="EMIs"
        subtitle={`${rows.length.toLocaleString("en-IN")} EMI${rows.length === 1 ? "" : "s"}`}
        actions={
          <GenericAddLauncher
            table="emis"
            listHref="/life/finance/emis"
            title="New EMI"
            defaults={{ active: true }}
          />
        }
      />

      <KPIGrid>
        <MetricCard
          label="Monthly outflow"
          value={formatCurrency(monthly)}
          icon={TrendingDown}
          iconTone="amber"
        />
        <MetricCard label="Active EMIs" value={active.length} icon={CreditCard} iconTone="blue" />
        <MetricCard
          label="Total outstanding"
          value={formatCurrency(outstanding)}
          icon={Hash}
          iconTone="red"
        />
        <MetricCard
          label="Next due"
          value={rows[0]?.next_due ? formatDate(rows[0].next_due) : "—"}
          icon={Calendar}
          iconTone="slate"
        />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No EMIs tracked"
          description="Loans, BNPL, credit-card conversions — keep the monthly drag visible so you can kill it faster."
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Lender</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Monthly</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead className="text-right">Months left</TableHead>
                <TableHead>Next due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-sm">{r.label ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.lender ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge tone={toneForStatus(r.status)}>{r.status ?? "—"}</StatusBadge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {formatCurrency(r.monthly_amount)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {formatCurrency(r.outstanding)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {r.tenure_left ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.next_due)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
