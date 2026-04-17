import Link from "next/link"
import { ShieldCheck, ShieldAlert, Shield, Umbrella } from "lucide-react"
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
export const metadata = { title: "Insurance — Life | Suprans" }

interface PolicyRow {
  id: string
  policy_name: string | null
  provider: string | null
  kind: string | null
  status: string | null
  coverage_amount: number | null
  premium: number | null
  renewal_date: string | null
}

async function fetchPolicies() {
  const { data, error } = await supabaseLife
    .from("insurance_policies")
    .select("id, policy_name, provider, kind, status, coverage_amount, premium, renewal_date")
    .order("renewal_date", { ascending: true })
    .limit(200)
  if (error) console.error("life.insurance_policies:", error.message)
  return (data ?? []) as PolicyRow[]
}

export default async function LifeInsurancePage() {
  const rows = await fetchPolicies()

  const now = new Date()
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const active = rows.filter((r) => r.status === "active").length
  const expiringThisMonth = rows.filter((r) => {
    if (!r.renewal_date) return false
    const d = new Date(r.renewal_date)
    return d >= now && d <= monthEnd
  }).length
  const totalCoverage = rows.reduce((s, r) => s + (r.coverage_amount ?? 0), 0)
  const totalPremium = rows.reduce((s, r) => s + (r.premium ?? 0), 0)

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Insurance"
        subtitle={`${rows.length.toLocaleString("en-IN")} polic${rows.length === 1 ? "y" : "ies"}`}
        actions={
          <GenericAddLauncher
            table="insurance_policies"
            listHref="/life/finance/insurance"
            title="New policy"
          />
        }
      />

      <KPIGrid>
        <MetricCard label="Active policies" value={active} icon={ShieldCheck} iconTone="emerald" />
        <MetricCard
          label="Expiring this month"
          value={expiringThisMonth}
          icon={ShieldAlert}
          iconTone="red"
        />
        <MetricCard
          label="Total coverage"
          value={formatCurrency(totalCoverage)}
          icon={Umbrella}
          iconTone="blue"
        />
        <MetricCard
          label="Annual premium"
          value={formatCurrency(totalPremium)}
          icon={Shield}
          iconTone="slate"
        />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No policies tracked"
          description="Health, term, motor, home — record every policy so renewals never slip."
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Policy</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Coverage</TableHead>
                <TableHead className="text-right">Premium</TableHead>
                <TableHead>Renewal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-sm">
                    <Link
                      href={`/life/finance/insurance/${r.id}`}
                      className="hover:text-primary"
                    >
                      {r.policy_name ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.provider ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.kind ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge tone={toneForStatus(r.status)}>{r.status ?? "—"}</StatusBadge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {formatCurrency(r.coverage_amount)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {formatCurrency(r.premium)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.renewal_date)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
