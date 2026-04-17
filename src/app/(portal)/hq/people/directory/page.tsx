import Link from "next/link"
import { Users, UserCheck, Building2, MapPin, Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DirectoryFilters } from "./directory-filters"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge"
import { type PerformanceTag } from "@/components/shared/performance-dot"
import { EmployeeCardActions } from "./employee-card-actions"
import { EmptyState } from "@/components/shared/empty-state"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { supabase, supabaseHq } from "@/lib/supabase"
import { formatDate, formatInitials } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Employees — HQ | Suprans" }

const STATUS_TONE: Record<string, StatusTone> = {
  active: "emerald",
  probation: "amber",
  onboarding: "blue",
  on_leave: "violet",
  notice_period: "amber",
  resigned: "red",
  terminated: "slate",
  offboarded: "slate",
}

const TYPE_TONE: Record<string, StatusTone> = {
  FTE: "emerald",
  "FTE-Ops": "blue",
  Intern: "amber",
  Contract: "violet",
}

const PERF_CARD_BORDER: Record<PerformanceTag, string> = {
  dark_green: "border-emerald-700 ring-1 ring-emerald-700/40",
  green: "border-emerald-500 ring-1 ring-emerald-500/30",
  yellow: "border-amber-500 ring-1 ring-amber-500/30",
  red: "border-rose-500 ring-1 ring-rose-500/30",
}

const PERF_TABLE_RING: Record<PerformanceTag, string> = {
  dark_green: "ring-2 ring-offset-1 ring-emerald-700",
  green: "ring-2 ring-offset-1 ring-emerald-500",
  yellow: "ring-2 ring-offset-1 ring-amber-500",
  red: "ring-2 ring-offset-1 ring-rose-500",
}

// Sort rank: directors pinned (0), then dark_green, green, untagged, yellow, red
const PERF_RANK: Record<string, number> = {
  dark_green: 1,
  green: 2,
  yellow: 4,
  red: 5,
}
function perfRank(tag: string | null | undefined): number {
  if (!tag) return 3
  return PERF_RANK[tag] ?? 3
}

const RESIGNED_STATUSES = new Set(["resigned", "terminated", "offboarded"])

const INITIALS_COLORS = [
  "bg-blue-600", "bg-emerald-600", "bg-violet-600", "bg-amber-600",
  "bg-rose-600", "bg-cyan-600", "bg-indigo-600", "bg-teal-600",
]

function initialsColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return INITIALS_COLORS[Math.abs(hash) % INITIALS_COLORS.length]
}

interface EmployeeRow {
  id: string
  team_member_id: string | null
  full_name: string | null
  email: string | null
  work_email: string | null
  photo_url: string | null
  whatsapp_photo_url: string | null
  role_title: string | null
  department_id: string | null
  vertical: string | null
  status: string | null
  join_date: string | null
  office: string | null
  employment_type: string | null
  phone: string | null
  dob: string | null
  performance_tag: string | null
}

interface DepartmentRow {
  id: string
  name: string | null
}

type SearchParams = { q?: string; status?: string; office?: string; type?: string; dept?: string; view?: string }

export default async function HqDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const q = (sp.q ?? "").trim()
  const activeStatus = sp.status ?? "all"
  const activeOffice = sp.office ?? "all"
  const activeType = sp.type ?? "all"
  const activeDept = sp.dept ?? "all"
  const activeView = sp.view ?? "grid"

  const [empRes, deptRes] = await Promise.all([
    supabaseHq
      .from("employees")
      .select(
        "id, team_member_id, full_name, email, work_email, photo_url, whatsapp_photo_url, role_title, department_id, vertical, status, join_date, office, employment_type, phone, dob, performance_tag",
      )
      .order("full_name", { ascending: true }),
    supabaseHq.from("departments").select("id, name").order("name"),
  ])

  const allEmployees = (empRes.data ?? []) as EmployeeRow[]
  const departments = (deptRes.data ?? []) as DepartmentRow[]
  const deptMap = new Map(departments.map((d) => [d.id, d.name ?? "—"]))

  // Exclude resigned/terminated/offboarded from default view — only show if explicitly filtered
  const employees = activeStatus !== "all" && RESIGNED_STATUSES.has(activeStatus)
    ? allEmployees
    : allEmployees.filter((e) => !RESIGNED_STATUSES.has(e.status ?? ""))

  const teamMemberIds = employees.map((e) => e.team_member_id).filter((x): x is string => !!x)
  const avatars: Record<string, string | null> = {}
  if (teamMemberIds.length > 0) {
    const { data } = await supabase.from("team_members").select("id, avatar_url").in("id", teamMemberIds)
    for (const row of data ?? []) avatars[row.id as string] = (row.avatar_url as string | null) ?? null
  }

  // KPI counts (active employees only)
  const activeEmployees = employees.filter((e) => e.status === "active" || e.status === "probation" || e.status === "onboarding")
  const kpis = {
    total: employees.length,
    active: activeEmployees.length,
    gurgaon: employees.filter((e) => e.office === "Gurgaon").length,
    rewari: employees.filter((e) => e.office === "Rewari").length,
  }

  // Filter
  const qLower = q.toLowerCase()
  let filtered = employees.filter((e) => {
    if (activeStatus !== "all" && e.status !== activeStatus) return false
    if (activeOffice !== "all" && e.office !== activeOffice) return false
    if (activeType !== "all" && e.employment_type !== activeType) return false
    if (activeDept !== "all" && e.department_id !== activeDept) return false
    if (qLower) {
      const hay = `${e.full_name ?? ""} ${e.role_title ?? ""} ${e.email ?? ""} ${e.phone ?? ""}`.toLowerCase()
      if (!hay.includes(qLower)) return false
    }
    return true
  })

  // Pin directors, then sort by performance rank (dark_green → green → untagged → yellow → red), then alpha
  filtered = filtered.sort((a, b) => {
    const aIsMD = a.role_title === "Managing Director" ? 0 : 1
    const bIsMD = b.role_title === "Managing Director" ? 0 : 1
    if (aIsMD !== bIsMD) return aIsMD - bIsMD
    const aRank = perfRank(a.performance_tag)
    const bRank = perfRank(b.performance_tag)
    if (aRank !== bRank) return aRank - bRank
    return (a.full_name ?? "").localeCompare(b.full_name ?? "")
  })

  const base = "/hq/people/directory"
  const urlParams = new URLSearchParams()
  if (q) urlParams.set("q", q)
  if (activeStatus !== "all") urlParams.set("status", activeStatus)
  if (activeOffice !== "all") urlParams.set("office", activeOffice)
  if (activeType !== "all") urlParams.set("type", activeType)
  if (activeDept !== "all") urlParams.set("dept", activeDept)
  if (activeView !== "grid") urlParams.set("view", activeView)

  // Dropdown option sets
  const statusOptions = [
    { value: "all", label: "All statuses" },
    { value: "active", label: `Active (${employees.filter((e) => e.status === "active").length})` },
    { value: "probation", label: `Probation (${employees.filter((e) => e.status === "probation").length})` },
    { value: "on_leave", label: `On leave (${employees.filter((e) => e.status === "on_leave").length})` },
    { value: "notice_period", label: `Notice period (${employees.filter((e) => e.status === "notice_period").length})` },
    { value: "resigned", label: `Resigned (${allEmployees.filter((e) => e.status === "resigned").length})` },
    { value: "terminated", label: `Terminated (${allEmployees.filter((e) => e.status === "terminated").length})` },
  ]
  const officeOptions = [
    { value: "all", label: "All offices" },
    { value: "Gurgaon", label: `Gurgaon (${employees.filter((e) => e.office === "Gurgaon").length})` },
    { value: "Rewari", label: `Rewari (${employees.filter((e) => e.office === "Rewari").length})` },
  ]
  const typeOptions = [
    { value: "all", label: "All types" },
    { value: "FTE", label: `FTE (${employees.filter((e) => e.employment_type === "FTE").length})` },
    { value: "FTE-Ops", label: `Operations (${employees.filter((e) => e.employment_type === "FTE-Ops").length})` },
    { value: "Intern", label: `Interns (${employees.filter((e) => e.employment_type === "Intern").length})` },
    { value: "Contract", label: `Contract (${employees.filter((e) => e.employment_type === "Contract").length})` },
  ]
  const deptOptions = [
    { value: "all", label: "All departments" },
    ...departments.map((d) => ({ value: d.id, label: d.name ?? "—" })),
  ]

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Employees"
        subtitle={`${kpis.active} active across Gurgaon and Rewari offices.`}
        actions={
          <>
            <Button variant="outline" size="sm" disabled>Export</Button>
            <Button size="sm" disabled>+ Add employee</Button>
          </>
        }
      />

      <KPIGrid>
        <MetricCard label="Total employees" value={kpis.total} icon={Users} iconTone="blue" />
        <MetricCard label="Active" value={kpis.active} icon={UserCheck} iconTone="emerald" />
        <MetricCard label="Gurgaon office" value={kpis.gurgaon} icon={Building2} iconTone="violet" />
        <MetricCard label="Rewari office" value={kpis.rewari} icon={MapPin} iconTone="amber" />
      </KPIGrid>

      <DetailCard title={`Directory (${filtered.length})`}>
        <DirectoryFilters
          q={q}
          activeStatus={activeStatus}
          activeOffice={activeOffice}
          activeType={activeType}
          activeDept={activeDept}
          activeView={activeView}
          statusOptions={statusOptions}
          officeOptions={officeOptions}
          typeOptions={typeOptions}
          deptOptions={deptOptions}
        />

        {filtered.length === 0 ? (
          <EmptyState icon={Users} title="No employees match" description="Try clearing filters or searching again." />
        ) : activeView === "grid" ? (
          /* ===== GRID CARD VIEW ===== */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {filtered.map((e) => {
              const avatarUrl = (e.team_member_id ? avatars[e.team_member_id] : null) ?? e.photo_url
              const deptName = e.department_id ? deptMap.get(e.department_id) : null
              const isMD = e.role_title === "Managing Director"
              const isResigned = e.status === "resigned" || e.status === "terminated"
              const perfTag = (e.performance_tag ?? null) as PerformanceTag | null

              const phoneClean = e.phone?.replace(/[^0-9]/g, "") ?? ""
              const whatsappUrl = phoneClean ? `https://wa.me/91${phoneClean.slice(-10)}` : null
              const gmailUrl = (e.work_email || e.email) ? `mailto:${e.work_email ?? e.email}` : null

              return (
                <div
                  key={e.id}
                  className={`group rounded-lg overflow-hidden bg-card border-2 transition-colors hover:border-foreground/30 ${
                    perfTag
                      ? PERF_CARD_BORDER[perfTag]
                      : isMD
                        ? "border-emerald-300 ring-1 ring-emerald-200"
                        : "border-border"
                  } ${isResigned ? "opacity-60" : ""}`}
                >
                  {/* Photo / Initials area */}
                  <Link href={`/hq/people/directory/${e.id}`}>
                    <div className="relative overflow-hidden">
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatarUrl}
                          alt=""
                          className="w-full aspect-square object-cover object-top bg-muted"
                          loading="lazy"
                        />
                      ) : (
                        <div className={`w-full aspect-square flex items-center justify-center text-white text-5xl font-bold ${initialsColor(e.full_name ?? "")}`}>
                          {formatInitials(e.full_name)}
                        </div>
                      )}
                      {/* MD crown badge */}
                      {isMD && (
                        <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-xs font-semibold">
                          <Crown className="size-3" />
                          MD
                        </span>
                      )}
                      {/* Office badge */}
                      {e.office && (
                        <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 text-white text-xs font-medium backdrop-blur-sm">
                          <MapPin className="size-3" />
                          {e.office}
                        </span>
                      )}
                    </div>
                  </Link>

                  {/* Content */}
                  <div className="p-3 space-y-2">
                    {/* Name + Role */}
                    <Link href={`/hq/people/directory/${e.id}`}>
                      <h3 className="text-sm font-bold font-heading leading-tight group-hover:text-primary transition-colors">
                        {e.full_name ?? "—"}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{e.role_title ?? "—"}</p>
                    </Link>

                    {/* Badges row */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {deptName && (
                        <StatusBadge tone="blue">{deptName}</StatusBadge>
                      )}
                      {e.employment_type && (
                        <StatusBadge tone={TYPE_TONE[e.employment_type] ?? "slate"}>{e.employment_type}</StatusBadge>
                      )}
                      {e.status && e.status !== "active" && (
                        <StatusBadge tone={STATUS_TONE[e.status] ?? "slate"}>{e.status.replace(/_/g, " ")}</StatusBadge>
                      )}
                    </div>

                    {/* Quick action buttons */}
                    <div className="pt-2 border-t border-border">
                      <EmployeeCardActions
                        id={e.id}
                        fullName={e.full_name}
                        phone={e.phone}
                        workEmail={e.work_email ?? e.email}
                        waProfileUrl={e.whatsapp_photo_url}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* ===== TABLE VIEW ===== */
          <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Office</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => {
                  const avatarUrl = (e.team_member_id ? avatars[e.team_member_id] : null) ?? e.photo_url
                  const deptName = e.department_id ? deptMap.get(e.department_id) : null
                  const rowTag = (e.performance_tag ?? null) as PerformanceTag | null
                  const ringCls = rowTag ? PERF_TABLE_RING[rowTag] : "border border-border"
                  return (
                    <TableRow key={e.id} className="cursor-pointer">
                      <TableCell className="py-2">
                        <Link href={`/hq/people/directory/${e.id}`} aria-label={`Open ${e.full_name ?? "employee"}`}>
                          {avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={avatarUrl} alt="" className={`size-8 rounded-full object-cover bg-muted ${ringCls}`} />
                          ) : (
                            <span className={`size-8 rounded-full inline-flex items-center justify-center text-white text-sm font-semibold ${initialsColor(e.full_name ?? "")} ${ringCls}`}>
                              {formatInitials(e.full_name)}
                            </span>
                          )}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/hq/people/directory/${e.id}`} className="font-medium text-foreground hover:underline">
                          {e.full_name ?? "—"}
                        </Link>
                        {(e.work_email || e.email) && (
                          <div className="text-sm text-muted-foreground">{e.work_email ?? e.email}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{e.role_title ?? "—"}</TableCell>
                      <TableCell className="text-sm">{deptName ?? "—"}</TableCell>
                      <TableCell className="text-sm">{e.office ?? "—"}</TableCell>
                      <TableCell>
                        {e.employment_type ? (
                          <StatusBadge tone={TYPE_TONE[e.employment_type] ?? "slate"}>{e.employment_type}</StatusBadge>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        {e.status ? (
                          <StatusBadge tone={STATUS_TONE[e.status] ?? "slate"}>{e.status.replace(/_/g, " ")}</StatusBadge>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums text-muted-foreground">{e.phone ?? "—"}</TableCell>
                      <TableCell className="text-sm tabular-nums text-muted-foreground">{formatDate(e.join_date)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </DetailCard>
    </div>
  )
}
