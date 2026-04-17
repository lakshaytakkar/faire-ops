import { HandCoins, Users, Hourglass, CheckCircle2 } from "lucide-react"
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
export const metadata = { title: "Debtors — Life | Suprans" }

interface DebtorRow {
  id: string
  person_name: string | null
  status: string | null
  amount: number | null
  outstanding: number | null
  lent_on: string | null
  due_on: string | null
  notes: string | null
}

async function fetchDebtors() {
  const { data, error } = await supabaseLife
    .from("debtors")
    .select("id, person_name, status, amount, outstanding, lent_on, due_on, notes")
    .order("lent_on", { ascending: false })
    .limit(200)
  if (error) console.error("life.debtors:", error.message)
  return (data ?? []) as DebtorRow[]
}

export default async function LifeDebtorsPage() {
  const rows = await fetchDebtors()

  const totalLent = rows.reduce((s, r) => s + (r.amount ?? 0), 0)
  const outstanding = rows.reduce((s, r) => s + (r.outstanding ?? r.amount ?? 0), 0)
  const open = rows.filter((r) => (r.outstanding ?? r.amount ?? 0) > 0).length
  const settled = rows.filter((r) => (r.outstanding ?? 0) === 0 && (r.amount ?? 0) > 0).length

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Debtors"
        subtitle={`${rows.length.toLocaleString("en-IN")} ledger entr${rows.length === 1 ? "y" : "ies"}`}
        actions={
          <GenericAddLauncher
            table="debtors"
            listHref="/life/finance/debtors"
            title="New debtor"
          />
        }
      />

      <KPIGrid>
        <MetricCard label="Total lent" value={formatCurrency(totalLent)} icon={HandCoins} iconTone="blue" />
        <MetricCard
          label="Outstanding"
          value={formatCurrency(outstanding)}
          icon={Hourglass}
          iconTone="amber"
        />
        <MetricCard label="Open ledgers" value={open} icon={Users} iconTone="red" />
        <MetricCard label="Settled" value={settled} icon={CheckCircle2} iconTone="emerald" />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title="No one owes you"
          description="When you lend money, log it here. Future-you will remember what today-you forgot."
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead>Lent on</TableHead>
                <TableHead>Due on</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-sm">{r.person_name ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge tone={toneForStatus(r.status)}>{r.status ?? "—"}</StatusBadge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {formatCurrency(r.amount)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm font-semibold">
                    {formatCurrency(r.outstanding)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.lent_on)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.due_on)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
