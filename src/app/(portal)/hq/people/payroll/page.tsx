import Link from "next/link"
import { Wallet, IndianRupee, TrendingUp, Users } from "lucide-react"
import { supabaseHq } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Payroll — HQ | Suprans" }

interface Run {
  id: string
  month: string
  status: string | null
  total_net: number | null
}
interface Line {
  id: string
  run_id: string
  employee_id: string
  basic: number | null
  hra: number | null
  allowances: number | null
  deductions: number | null
  net_pay: number | null
  status: string | null
  payment_mode: string | null
  payment_date: string | null
}

export default async function HqPayrollPage() {
  const [runsRes, linesRes, empsRes] = await Promise.all([
    supabaseHq.from("payroll_runs").select("id, month, status, total_net").order("month", { ascending: false }),
    supabaseHq
      .from("payroll_line_items")
      .select("id, run_id, employee_id, basic, hra, allowances, deductions, net_pay, status, payment_mode, payment_date")
      .order("payment_date", { ascending: false })
      .limit(200),
    supabaseHq.from("employees").select("id, full_name, office, employment_type"),
  ])

  const runs = (runsRes.data ?? []) as Run[]
  const lines = (linesRes.data ?? []) as Line[]
  const emps = new Map(
    (empsRes.data ?? []).map((e: { id: string; full_name: string | null; office: string | null; employment_type: string | null }) =>
      [e.id, e],
    ),
  )

  const latestRun = runs[0]
  const totalPaid = lines.filter((l) => l.status === "paid").reduce((s, l) => s + (Number(l.net_pay) || 0), 0)
  const headcount = new Set(lines.map((l) => l.employee_id)).size
  const avg = headcount > 0 ? totalPaid / headcount : 0

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Payroll"
        subtitle="Monthly payroll runs and per-employee breakdowns."
        actions={
          <>
            <Button variant="outline" size="sm" disabled>Export CSV</Button>
            <Button size="sm" disabled>+ New run</Button>
          </>
        }
      />

      <KPIGrid>
        <MetricCard
          label={latestRun ? `Net paid (${latestRun.month?.slice(0,7) ?? "—"})` : "Net paid"}
          value={formatCurrency(latestRun?.total_net ?? 0, "₹")}
          icon={IndianRupee}
          iconTone="emerald"
        />
        <MetricCard label="Employees on payroll" value={headcount} icon={Users} iconTone="blue" />
        <MetricCard label="Avg net salary" value={formatCurrency(avg, "₹")} icon={TrendingUp} iconTone="violet" />
        <MetricCard label="Runs total" value={runs.length} icon={Wallet} iconTone="slate" />
      </KPIGrid>

      <DetailCard title={`Payroll runs (${runs.length})`}>
        {runs.length === 0 ? (
          <EmptyState icon={Wallet} title="No payroll runs yet" />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs font-medium text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Month</th>
                  <th className="text-right px-3 py-2 tabular-nums">Total net</th>
                  <th className="text-right px-3 py-2 tabular-nums">Line items</th>
                  <th className="text-left px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {runs.map((r) => {
                  const n = lines.filter((l) => l.run_id === r.id).length
                  return (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium tabular-nums">{r.month?.slice(0,7) ?? "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(r.total_net, "₹")}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{n}</td>
                      <td className="px-3 py-2">
                        {r.status ? <StatusBadge tone={toneForStatus(r.status)}>{r.status}</StatusBadge> : "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </DetailCard>

      <DetailCard title={`Line items — ${latestRun ? latestRun.month?.slice(0,7) : "latest"} (${lines.length})`}>
        {lines.length === 0 ? (
          <EmptyState icon={Wallet} title="No line items" />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs font-medium text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Employee</th>
                  <th className="text-left px-3 py-2">Office</th>
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-right px-3 py-2 tabular-nums">Basic</th>
                  <th className="text-right px-3 py-2 tabular-nums">HRA</th>
                  <th className="text-right px-3 py-2 tabular-nums">Allowances</th>
                  <th className="text-right px-3 py-2 tabular-nums">Deductions</th>
                  <th className="text-right px-3 py-2 tabular-nums">Net pay</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Paid on</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lines.map((l) => {
                  const emp = emps.get(l.employee_id)
                  return (
                    <tr key={l.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium">
                        <Link href={`/hq/people/directory/${l.employee_id}`} className="hover:underline">
                          {emp?.full_name ?? "—"}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{emp?.office ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{emp?.employment_type ?? "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(l.basic, "₹")}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(l.hra, "₹")}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(l.allowances, "₹")}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-red-600">{formatCurrency(l.deductions, "₹")}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold">{formatCurrency(l.net_pay, "₹")}</td>
                      <td className="px-3 py-2">
                        {l.status ? <StatusBadge tone={toneForStatus(l.status)}>{l.status}</StatusBadge> : "—"}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-muted-foreground">{formatDate(l.payment_date)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </DetailCard>
    </div>
  )
}
