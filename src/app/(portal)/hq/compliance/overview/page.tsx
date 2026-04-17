import Link from "next/link"
import {
  Building2,
  FileCheck,
  ScrollText,
  Gavel,
  AlertTriangle,
  Clock,
  CalendarDays,
  Inbox,
} from "lucide-react"

import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import { supabaseHq } from "@/lib/supabase"
import { formatDate } from "@/lib/format"

// HQ → Compliance → Overview dashboard. See suprans-hq-full-spec.md §8.1
// and SPACE_PATTERN.md §3. Server-rendered; aggregates entities / filings /
// contracts / legal_cases for the four KPI cards + four alert tables.

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Compliance — HQ | Suprans",
}

interface EntityRow {
  id: string
  name: string | null
  is_active: boolean | null
}

interface FilingRow {
  id: string
  entity_id: string | null
  filing_type: string | null
  period: string | null
  due_date: string | null
  filed_date: string | null
  status: string | null
}

interface ContractRow {
  id: string
  name: string | null
  parties: string | null
  end_date: string | null
  status: string | null
}

interface LegalCaseRow {
  id: string
  case_code: string | null
  description: string | null
  court: string | null
  status: string | null
  next_hearing_at: string | null
  urgency: string | null
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const ms = d.getTime() - Date.now()
  return Math.ceil(ms / (24 * 60 * 60 * 1000))
}

function isOverdue(filing: FilingRow, today: Date): boolean {
  if (filing.status === "filed") return false
  if (!filing.due_date) return false
  return new Date(filing.due_date).getTime() < today.getTime()
}

async function fetchData() {
  const [entitiesRes, filingsRes, contractsRes, casesRes] = await Promise.all([
    supabaseHq
      .from("entities")
      .select("id, name, is_active")
      .order("name", { ascending: true }),
    supabaseHq
      .from("filings")
      .select("id, entity_id, filing_type, period, due_date, filed_date, status")
      .order("due_date", { ascending: true }),
    supabaseHq
      .from("contracts")
      .select("id, name, parties, end_date, status")
      .order("end_date", { ascending: true }),
    supabaseHq
      .from("legal_cases")
      .select("id, case_code, description, court, status, next_hearing_at, urgency")
      .order("next_hearing_at", { ascending: true }),
  ])

  return {
    entities: (entitiesRes.data ?? []) as EntityRow[],
    filings: (filingsRes.data ?? []) as FilingRow[],
    contracts: (contractsRes.data ?? []) as ContractRow[],
    cases: (casesRes.data ?? []) as LegalCaseRow[],
  }
}

export default async function HqComplianceOverviewPage() {
  const { entities, filings, contracts, cases } = await fetchData()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const entityNameById = new Map(entities.map((e) => [e.id, e.name ?? "—"]))

  const activeEntities = entities.filter((e) => e.is_active !== false).length

  // "This month" = filings with due_date in current calendar month and not filed.
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const filingsDueThisMonth = filings.filter((f) => {
    if (!f.due_date) return false
    if (f.status === "filed") return false
    const d = new Date(f.due_date)
    return d >= thisMonthStart && d <= thisMonthEnd
  }).length

  const contractsExpiring30d = contracts.filter((c) => {
    const d = daysUntil(c.end_date)
    return d !== null && d >= 0 && d <= 30
  }).length

  const activeCases = cases.filter(
    (c) => c.status === "active" || c.status === "pending",
  ).length

  const overdueFilings = filings.filter((f) => isOverdue(f, today))

  const filingsDueNext30 = filings.filter((f) => {
    if (f.status === "filed") return false
    const d = daysUntil(f.due_date)
    return d !== null && d >= 0 && d <= 30
  })

  const contractsExpiringNext30 = contracts.filter((c) => {
    const d = daysUntil(c.end_date)
    return d !== null && d >= 0 && d <= 30
  })

  const upcomingHearings = cases.filter((c) => {
    const d = daysUntil(c.next_hearing_at)
    return d !== null && d >= 0
  })

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Hero Banner */}
      <div className="rounded-md px-8 py-7 text-white" style={{ background: "linear-gradient(135deg, hsl(220,50%,12%) 0%, hsl(215,60%,30%) 100%)" }}>
        <p className="text-sm font-medium opacity-75">HQ Compliance</p>
        <h1 className="mt-1 text-3xl font-bold font-heading tracking-tight">Compliance Center</h1>
        <p className="mt-1 text-sm opacity-60">Entities, filings, contracts & legal cases</p>
        <div className="mt-5 flex items-center gap-8">
          <div><p className="text-2xl font-bold tabular-nums">{entities.length}</p><p className="text-xs opacity-50">Entities</p></div>
          <div><p className="text-2xl font-bold tabular-nums">{filings.length}</p><p className="text-xs opacity-50">Filings</p></div>
          <div><p className="text-2xl font-bold tabular-nums">{contracts.length}</p><p className="text-xs opacity-50">Contracts</p></div>
        </div>
      </div>

      <KPIGrid>
        <MetricCard
          label="Active Entities"
          value={activeEntities}
          icon={Building2}
          iconTone="blue"
        />
        <MetricCard
          label="Filings Due This Month"
          value={filingsDueThisMonth}
          icon={FileCheck}
          iconTone="amber"
        />
        <MetricCard
          label="Contracts Expiring in 30d"
          value={contractsExpiring30d}
          icon={ScrollText}
          iconTone="amber"
        />
        <MetricCard
          label="Active Legal Cases"
          value={activeCases}
          icon={Gavel}
          iconTone="red"
        />
      </KPIGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-5">
          <DetailCard title="Overdue filings">
            {overdueFilings.length === 0 ? (
              <EmptyState
                icon={AlertTriangle}
                title="No overdue filings"
                description="Every filing is on time."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b text-left text-xs font-medium text-muted-foreground">
                    <tr>
                      <th className="px-2 py-2 font-medium">Entity</th>
                      <th className="px-2 py-2 font-medium">Filing</th>
                      <th className="px-2 py-2 font-medium">Due</th>
                      <th className="px-2 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overdueFilings.map((f) => (
                      <tr key={f.id} className="border-b last:border-0">
                        <td className="px-2 py-2">
                          {f.entity_id ? entityNameById.get(f.entity_id) ?? "—" : "—"}
                        </td>
                        <td className="px-2 py-2">
                          <Link
                            href={`/hq/compliance/filings/${f.id}`}
                            className="font-medium hover:underline"
                          >
                            {f.filing_type ?? "—"}
                          </Link>
                          {f.period && (
                            <div className="text-xs text-muted-foreground">{f.period}</div>
                          )}
                        </td>
                        <td className="px-2 py-2 text-red-600 font-medium">
                          {formatDate(f.due_date)}
                        </td>
                        <td className="px-2 py-2">
                          <StatusBadge tone="red">overdue</StatusBadge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DetailCard>

          <DetailCard title="Filings due next 30 days">
            {filingsDueNext30.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="No upcoming filings"
                description="Nothing due in the next 30 days."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b text-left text-xs font-medium text-muted-foreground">
                    <tr>
                      <th className="px-2 py-2 font-medium">Entity</th>
                      <th className="px-2 py-2 font-medium">Filing</th>
                      <th className="px-2 py-2 font-medium">Due</th>
                      <th className="px-2 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filingsDueNext30.map((f) => (
                      <tr key={f.id} className="border-b last:border-0">
                        <td className="px-2 py-2">
                          {f.entity_id ? entityNameById.get(f.entity_id) ?? "—" : "—"}
                        </td>
                        <td className="px-2 py-2">
                          <Link
                            href={`/hq/compliance/filings/${f.id}`}
                            className="font-medium hover:underline"
                          >
                            {f.filing_type ?? "—"}
                          </Link>
                          {f.period && (
                            <div className="text-xs text-muted-foreground">{f.period}</div>
                          )}
                        </td>
                        <td className="px-2 py-2 text-amber-700 font-medium">
                          {formatDate(f.due_date)}
                        </td>
                        <td className="px-2 py-2">
                          <StatusBadge tone="amber">{f.status ?? "upcoming"}</StatusBadge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DetailCard>
        </div>

        <div className="space-y-5">
          <DetailCard title="Contracts expiring next 30 days">
            {contractsExpiringNext30.length === 0 ? (
              <EmptyState
                icon={ScrollText}
                title="No expiring contracts"
                description="No contracts expire in the next 30 days."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b text-left text-xs font-medium text-muted-foreground">
                    <tr>
                      <th className="px-2 py-2 font-medium">Contract</th>
                      <th className="px-2 py-2 font-medium">Parties</th>
                      <th className="px-2 py-2 font-medium">Expires</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contractsExpiringNext30.map((c) => (
                      <tr key={c.id} className="border-b last:border-0">
                        <td className="px-2 py-2">
                          <Link
                            href={`/hq/compliance/contracts/${c.id}`}
                            className="font-medium hover:underline"
                          >
                            {c.name ?? "—"}
                          </Link>
                        </td>
                        <td className="px-2 py-2 text-muted-foreground">
                          {c.parties ?? "—"}
                        </td>
                        <td className="px-2 py-2 text-amber-700 font-medium">
                          {formatDate(c.end_date)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DetailCard>

          <DetailCard title="Upcoming hearing dates">
            {upcomingHearings.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No upcoming hearings"
                description="No hearings scheduled."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b text-left text-xs font-medium text-muted-foreground">
                    <tr>
                      <th className="px-2 py-2 font-medium">Case</th>
                      <th className="px-2 py-2 font-medium">Court</th>
                      <th className="px-2 py-2 font-medium">Next hearing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingHearings.map((c) => (
                      <tr key={c.id} className="border-b last:border-0">
                        <td className="px-2 py-2">
                          <Link
                            href={`/hq/compliance/legal-cases/${c.id}`}
                            className="font-medium hover:underline"
                          >
                            {c.case_code ?? c.description ?? "—"}
                          </Link>
                        </td>
                        <td className="px-2 py-2 text-muted-foreground">
                          {c.court ?? "—"}
                        </td>
                        <td className="px-2 py-2">{formatDate(c.next_hearing_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DetailCard>
        </div>
      </div>

      {entities.length === 0 && filings.length === 0 && contracts.length === 0 && cases.length === 0 && (
        <EmptyState
          icon={Inbox}
          title="Compliance is empty"
          description="Seed entities, filings, contracts and cases in hq.* to see this dashboard light up."
        />
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/hq/compliance/entities" className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow block">
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary"><Building2 className="size-4" /></span>
            <span className="text-[0.9375rem] font-semibold tracking-tight">Entities</span>
          </div>
          <p className="text-sm text-muted-foreground">Manage registered entities</p>
        </Link>
        <Link href="/hq/compliance/filings" className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow block">
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-flex size-9 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600"><FileCheck className="size-4" /></span>
            <span className="text-[0.9375rem] font-semibold tracking-tight">Filings</span>
          </div>
          <p className="text-sm text-muted-foreground">Track annual filings & returns</p>
        </Link>
        <Link href="/hq/compliance/contracts" className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow block">
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-flex size-9 items-center justify-center rounded-md bg-amber-500/10 text-amber-600"><ScrollText className="size-4" /></span>
            <span className="text-[0.9375rem] font-semibold tracking-tight">Contracts</span>
          </div>
          <p className="text-sm text-muted-foreground">Review vendor & client contracts</p>
        </Link>
      </div>
    </div>
  )
}
