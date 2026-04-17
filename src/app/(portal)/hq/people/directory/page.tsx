import Link from "next/link"
import {
  Users, UserCheck, CalendarDays, Building2,
  MapPin, Mail, Phone, Crown, Download,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { DirectoryFilters } from "./directory-filters"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge"
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
        "id, team_member_id, full_name, email, work_email, photo_url, whatsapp_photo_url, role_title, department_id, vertical, status, join_date, office, employment_type, phone, dob",
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

  // Sort MDs first
  filtered = filtered.sort((a, b) => {
    const aIsMD = a.role_title === "Managing Director" ? 0 : 1
    const bIsMD = b.role_title === "Managing Director" ? 0 : 1
    if (aIsMD !== bIsMD) return aIsMD - bIsMD
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

              const phoneClean = e.phone?.replace(/[^0-9]/g, "") ?? ""
              const whatsappUrl = phoneClean ? `https://wa.me/91${phoneClean.slice(-10)}` : null
              const gmailUrl = (e.work_email || e.email) ? `mailto:${e.work_email ?? e.email}` : null

              return (
                <div
                  key={e.id}
                  className={`group rounded-lg overflow-hidden bg-card border transition-colors hover:border-foreground/20 ${
                    isMD ? "border-emerald-300 ring-1 ring-emerald-200" : "border-border"
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
                    <div className="flex items-center gap-1.5 pt-2 border-t border-border">
                      {whatsappUrl && (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center size-8 rounded-md border border-border bg-background text-muted-foreground hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors"
                          title="WhatsApp"
                        >
                          <svg className="size-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        </a>
                      )}
                      {gmailUrl && (
                        <a
                          href={gmailUrl}
                          className="inline-flex items-center justify-center size-8 rounded-md border border-border bg-background text-muted-foreground hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                          title="Email"
                        >
                          <Mail className="size-4" />
                        </a>
                      )}
                      <Link
                        href={`/hq/people/directory/${e.id}?tab=chat`}
                        className="inline-flex items-center justify-center size-8 rounded-md border border-border bg-background text-muted-foreground hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200 transition-colors"
                        title="Chat"
                      >
                        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      </Link>
                      {e.phone && (
                        <a
                          href={`tel:${e.phone}`}
                          className="inline-flex items-center justify-center size-8 rounded-md border border-border bg-background text-muted-foreground hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 transition-colors"
                          title="Call"
                        >
                          <Phone className="size-4" />
                        </a>
                      )}
                      {e.whatsapp_photo_url && (
                        <a
                          href={e.whatsapp_photo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="inline-flex items-center justify-center size-8 rounded-md border border-border bg-background text-muted-foreground hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors ml-auto"
                          title="Download WA/Email profile"
                        >
                          <Download className="size-4" />
                        </a>
                      )}
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
                  return (
                    <TableRow key={e.id} className="cursor-pointer">
                      <TableCell className="py-2">
                        <Link href={`/hq/people/directory/${e.id}`} aria-label={`Open ${e.full_name ?? "employee"}`}>
                          {avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={avatarUrl} alt="" className="size-8 rounded-full object-cover border border-border bg-muted" />
                          ) : (
                            <span className={`size-8 rounded-full inline-flex items-center justify-center text-white text-sm font-semibold ${initialsColor(e.full_name ?? "")}`}>
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
