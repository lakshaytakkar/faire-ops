import Link from "next/link"
import { Briefcase, Pause, CheckCircle2, Archive } from "lucide-react"
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
export const metadata = { title: "Roles — Hiring · Suprans HQ" }

const STATUS_TABS = [
  { key: "all",     label: "All" },
  { key: "active",  label: "Active" },
  { key: "paused",  label: "Paused" },
  { key: "filled",  label: "Filled" },
  { key: "closed",  label: "Closed" },
] as const

type StatusKey = (typeof STATUS_TABS)[number]["key"]

interface RoleRow {
  id: string
  title: string
  department: string | null
  vertical: string | null
  status: string
  posted_at: string | null
  target_close: string | null
  target_headcount: number | null
  salary_min: number | null
  salary_max: number | null
  currency: string | null
}

interface CountRow { role_id: string; n: number }

export default async function HqHiringRolesPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; q?: string }>
}) {
  const sp = (await searchParams) ?? {}
  const activeTab: StatusKey =
    (STATUS_TABS.find((t) => t.key === sp.status)?.key ?? "all") as StatusKey
  const query = (sp.q ?? "").trim()

  // ── Roles + counts in parallel
  let rolesQ = supabaseHq
    .from("job_roles")
    .select(
      "id, title, department, vertical, status, posted_at, target_close, target_headcount, salary_min, salary_max, currency",
    )
    .order("posted_at", { ascending: false, nullsFirst: false })

  if (activeTab !== "all") rolesQ = rolesQ.eq("status", activeTab)
  if (query) rolesQ = rolesQ.ilike("title", `%${query}%`)

  const [rolesRes, allCountsRes, applicantsRes, interviewsRes] = await Promise.all([
    rolesQ,
    supabaseHq.from("job_roles").select("status"),
    supabaseHq.from("candidates").select("role_id"),
    supabaseHq.from("interviews").select("role_id"),
  ])

  const roles = (rolesRes.data ?? []) as RoleRow[]
  const allRoles = (allCountsRes.data ?? []) as { status: string }[]
  const applicants = (applicantsRes.data ?? []) as { role_id: string | null }[]
  const interviews = (interviewsRes.data ?? []) as { role_id: string | null }[]

  // Counts
  const counts: Record<string, number> = { all: allRoles.length }
  for (const r of allRoles) counts[r.status] = (counts[r.status] ?? 0) + 1

  const applicantCounts = new Map<string, number>()
  for (const a of applicants) {
    if (!a.role_id) continue
    applicantCounts.set(a.role_id, (applicantCounts.get(a.role_id) ?? 0) + 1)
  }
  const interviewCounts = new Map<string, number>()
  for (const i of interviews) {
    if (!i.role_id) continue
    interviewCounts.set(i.role_id, (interviewCounts.get(i.role_id) ?? 0) + 1)
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Roles"
        subtitle="Open positions across every vertical. Track applications, interviews, and hiring velocity."
        actions={
          <>
            <Button variant="outline" size="sm" disabled>
              Export
            </Button>
            <Button size="sm" disabled>
              + New role
            </Button>
          </>
        }
      />

      <KPIGrid>
        <MetricCard label="Total roles"   value={counts.all ?? 0}     icon={Briefcase}    iconTone="blue" />
        <MetricCard label="Active"        value={counts.active ?? 0}  icon={CheckCircle2} iconTone="emerald" />
        <MetricCard label="Paused"        value={counts.paused ?? 0}  icon={Pause}        iconTone="amber" />
        <MetricCard label="Filled / Closed" value={(counts.filled ?? 0) + (counts.closed ?? 0)} icon={Archive} iconTone="slate" />
      </KPIGrid>

      <DetailCard title="All roles">
        {/* Chip-style status tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {STATUS_TABS.map((t) => {
            const isActive = t.key === activeTab
            const n = counts[t.key] ?? 0
            const href = (() => {
              const params = new URLSearchParams()
              if (t.key !== "all") params.set("status", t.key)
              if (query) params.set("q", query)
              const qs = params.toString()
              return qs ? `/hq/hiring/roles?${qs}` : "/hq/hiring/roles"
            })()
            return (
              <Link
                key={t.key}
                href={href}
                className={
                  isActive
                    ? "inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium"
                    : "inline-flex items-center gap-2 rounded-full bg-muted text-foreground px-3 py-1.5 text-sm font-medium hover:bg-muted/70"
                }
              >
                <span>{t.label}</span>
                <span className="tabular-nums opacity-75">{n}</span>
              </Link>
            )
          })}
        </div>

        {roles.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No roles match this filter"
            description={
              query
                ? `No "${query}" roles in this status. Try clearing search.`
                : "Nothing to show. Open another tab or add a new role."
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs font-medium text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Role</th>
                  <th className="text-left px-3 py-2">Department</th>
                  <th className="text-left px-3 py-2">Vertical</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-right px-3 py-2 tabular-nums">Applicants</th>
                  <th className="text-right px-3 py-2 tabular-nums">Interviews</th>
                  <th className="text-right px-3 py-2 tabular-nums">Headcount</th>
                  <th className="text-left px-3 py-2">Salary</th>
                  <th className="text-left px-3 py-2">Posted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {roles.map((r) => {
                  const apps = applicantCounts.get(r.id) ?? 0
                  const ints = interviewCounts.get(r.id) ?? 0
                  const salary =
                    r.salary_min || r.salary_max
                      ? `${formatCurrency(r.salary_min, r.currency === "USD" ? "$" : "₹")} – ${formatCurrency(r.salary_max, r.currency === "USD" ? "$" : "₹")}`
                      : "—"
                  return (
                    <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2 font-medium">{r.title}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.department ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.vertical ?? "—"}</td>
                      <td className="px-3 py-2">
                        <StatusBadge tone={toneForStatus(r.status)}>{r.status}</StatusBadge>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{apps}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{ints}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.target_headcount ?? 1}</td>
                      <td className="px-3 py-2 text-muted-foreground">{salary}</td>
                      <td className="px-3 py-2 text-muted-foreground">{formatDate(r.posted_at)}</td>
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
