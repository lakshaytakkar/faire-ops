import { Lock, Unlock, Hourglass, Wallet } from "lucide-react"
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
import { formatCurrency, formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Blocked money — Life | Suprans" }

interface BlockedRow {
  id: string
  label: string | null
  kind: string | null
  amount: number | null
  locked_until: string | null
  platform: string | null
}

async function fetchBlocked() {
  const { data, error } = await supabaseLife
    .from("blocked_money")
    .select("id, label, kind, amount, locked_until, platform")
    .order("locked_until", { ascending: true })
    .limit(200)
  if (error) console.error("life.blocked_money:", error.message)
  return (data ?? []) as BlockedRow[]
}

export default async function LifeBlockedPage() {
  const rows = await fetchBlocked()

  const total = rows.reduce((s, r) => s + (r.amount ?? 0), 0)
  const now = new Date()
  const in30 = new Date(now.getTime() + 30 * 86400000)
  const maturingSoon = rows.filter((r) => {
    if (!r.locked_until) return false
    const d = new Date(r.locked_until)
    return d >= now && d <= in30
  })
  const maturingSoonAmount = maturingSoon.reduce((s, r) => s + (r.amount ?? 0), 0)

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Blocked money"
        subtitle={`${rows.length.toLocaleString("en-IN")} lock${rows.length === 1 ? "" : "s"}`}
        actions={
          <GenericAddLauncher
            table="blocked_money"
            listHref="/life/finance/blocked"
            title="New blocked fund"
          />
        }
      />

      <KPIGrid>
        <MetricCard label="Total blocked" value={formatCurrency(total)} icon={Lock} iconTone="amber" />
        <MetricCard
          label="Maturing in 30 days"
          value={maturingSoon.length}
          icon={Hourglass}
          iconTone="blue"
        />
        <MetricCard
          label="Unlocking soon (₹)"
          value={formatCurrency(maturingSoonAmount)}
          icon={Unlock}
          iconTone="emerald"
        />
        <MetricCard label="Accounts" value={rows.length} icon={Wallet} iconTone="slate" />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={Lock}
          title="No blocked funds"
          description="FDs, deposits, margin money, security deposits — anything you can't touch today lives here."
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Unlocks on</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-sm">{r.label ?? "—"}</TableCell>
                  <TableCell>
                    {r.kind ? <StatusBadge tone="amber">{r.kind}</StatusBadge> : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.platform ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm font-semibold">
                    {formatCurrency(r.amount)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.locked_until)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
