import Link from "next/link"
import { Users, UserCheck, UserMinus, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { supabase, supabaseHq } from "@/lib/supabase"
import { formatDate, formatInitials } from "@/lib/format"
import { DirectoryFilterBar } from "./directory-filter-bar"

// Spec-locked employee-status tones (active=emerald, probation=amber,
// on_leave=blue, terminated=slate). Kept inline here because these values
// aren't in toneForStatus()'s default map.
const EMPLOYEE_STATUS_TONE: Record<string, StatusTone> = {
  active: "emerald",
  probation: "amber",
  on_leave: "blue",
  terminated: "slate",
}

// HQ → People → Directory (list). See suprans-hq-full-spec.md §2.1 and
// SPACE_PATTERN.md §3. Server-rendered; URL query params (?q=&dept=&status=)
// drive the filter state so every link + refresh is shareable.

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Employees — HQ | Suprans",
}

interface EmployeeRow {
  id: string
  team_member_id: string | null
  full_name: string | null
  email: string | null
  photo_url: string | null
  role_title: string | null
  department_id: string | null
  vertical: string | null
  status: string | null
  join_date: string | null
}

interface DepartmentRow {
  id: string
  name: string | null
  vertical: string | null
}

async function fetchDirectoryData() {
  const [employeesRes, departmentsRes] = await Promise.all([
    supabaseHq
      .from("employees")
      .select(
        "id, team_member_id, full_name, email, photo_url, role_title, department_id, vertical, status, join_date",
      )
      .order("full_name", { ascending: true }),
    supabaseHq
      .from("departments")
      .select("id, name, vertical")
      .order("name", { ascending: true }),
  ])

  const employees = (employeesRes.data ?? []) as EmployeeRow[]
  const departments = (departmentsRes.data ?? []) as DepartmentRow[]

  // Cross-schema avatar lookup — supabaseHq is schema-scoped to `hq`, so
  // we hit public.team_members via the default client.
  const teamMemberIds = employees
    .map((e) => e.team_member_id)
    .filter((x): x is string => !!x)

  const avatars: Record<string, string | null> = {}
  if (teamMemberIds.length > 0) {
    const { data } = await supabase
      .from("team_members")
      .select("id, avatar_url")
      .in("id", teamMemberIds)
    for (const row of data ?? []) {
      avatars[row.id as string] = (row.avatar_url as string | null) ?? null
    }
  }

  return { employees, departments, avatars }
}

type SearchParams = {
  q?: string
  status?: string
  dept?: string
}

export default async function HqDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { q = "", status = "all", dept = "all" } = await searchParams
  const { employees, departments, avatars } = await fetchDirectoryData()

  const deptMap = new Map(departments.map((d) => [d.id, d]))

  // Status counts — always computed against the *unfiltered* employee set
  // so the tabs show real totals.
  const counts = {
    all: employees.length,
    active: employees.filter((e) => e.status === "active").length,
    probation: employees.filter((e) => e.status === "probation").length,
    on_leave: employees.filter((e) => e.status === "on_leave").length,
    terminated: employees.filter((e) => e.status === "terminated").length,
  }

  const qLower = q.trim().toLowerCase()
  const filtered = employees.filter((e) => {
    if (status !== "all" && e.status !== status) return false
    if (dept !== "all" && e.department_id !== dept) return false
    if (qLower) {
      const hay = `${e.full_name ?? ""} ${e.role_title ?? ""} ${e.email ?? ""}`.toLowerCase()
      if (!hay.includes(qLower)) return false
    }
    return true
  })

  const departmentOptions = departments.map((d) => ({
    id: d.id,
    label: d.name ?? "Unnamed",
  }))

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Employees"
        subtitle="Company-wide directory across all verticals."
        actions={
          <Button variant="outline" size="sm" disabled>
            + Add Employee
          </Button>
        }
      />

      <KPIGrid>
        <MetricCard label="Active" value={counts.active} icon={UserCheck} iconTone="emerald" />
        <MetricCard label="Probation" value={counts.probation} icon={CalendarDays} iconTone="amber" />
        <MetricCard label="On leave" value={counts.on_leave} icon={UserMinus} iconTone="blue" />
        <MetricCard label="Total" value={counts.all} icon={Users} iconTone="slate" />
      </KPIGrid>

      <DirectoryFilterBar
        q={q}
        status={status}
        dept={dept}
        departments={departmentOptions}
        counts={counts}
      />

      <DetailCard title="All employees">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No employees match"
            description="Try clearing filters or searching for another name."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role / Title</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Vertical</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => {
                const avatarUrl =
                  (e.team_member_id ? avatars[e.team_member_id] : null) ?? e.photo_url
                const deptRow = e.department_id ? deptMap.get(e.department_id) : null
                return (
                  <TableRow key={e.id} className="cursor-pointer">
                    <TableCell className="py-2">
                      <Link
                        href={`/hq/people/directory/${e.id}`}
                        className="block"
                        aria-label={`Open ${e.full_name ?? "employee"}`}
                      >
                        {avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={avatarUrl}
                            alt=""
                            className="size-8 rounded-full object-cover border border-border bg-muted"
                          />
                        ) : (
                          <span className="size-8 rounded-full inline-flex items-center justify-center bg-muted text-muted-foreground text-[11px] font-semibold border border-border">
                            {formatInitials(e.full_name)}
                          </span>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/hq/people/directory/${e.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {e.full_name ?? "—"}
                      </Link>
                      {e.email && (
                        <div className="text-xs text-muted-foreground">{e.email}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{e.role_title ?? "—"}</TableCell>
                    <TableCell className="text-sm">{deptRow?.name ?? "—"}</TableCell>
                    <TableCell className="text-sm">{e.vertical ?? "—"}</TableCell>
                    <TableCell>
                      {e.status ? (
                        <StatusBadge tone={EMPLOYEE_STATUS_TONE[e.status] ?? "slate"}>
                          {e.status.replace(/_/g, " ")}
                        </StatusBadge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(e.join_date)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">—</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </DetailCard>
    </div>
  )
}
