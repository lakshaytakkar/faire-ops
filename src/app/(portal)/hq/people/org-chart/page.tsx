import Link from "next/link"
import { Network } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { supabase, supabaseHq } from "@/lib/supabase"
import { formatInitials } from "@/lib/format"

// HQ → People → Org Chart. Session 2 renders a simple nested list
// grouped by department; the interactive D3 tree arrives in Session 3.
// See suprans-hq-full-spec.md §2.6.

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Org Chart — HQ | Suprans",
}

interface EmployeeRow {
  id: string
  team_member_id: string | null
  full_name: string | null
  role_title: string | null
  department_id: string | null
  vertical: string | null
  photo_url: string | null
}

interface DepartmentRow {
  id: string
  name: string | null
  vertical: string | null
}

async function fetchOrgChart() {
  const [employeesRes, departmentsRes] = await Promise.all([
    supabaseHq
      .from("employees")
      .select("id, team_member_id, full_name, role_title, department_id, vertical, photo_url")
      .neq("status", "terminated")
      .order("full_name", { ascending: true }),
    supabaseHq
      .from("departments")
      .select("id, name, vertical")
      .order("name", { ascending: true }),
  ])

  const employees = (employeesRes.data ?? []) as EmployeeRow[]
  const departments = (departmentsRes.data ?? []) as DepartmentRow[]

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

export default async function HqOrgChartPage() {
  const { employees, departments, avatars } = await fetchOrgChart()

  // Group employees by department_id; employees with no department go
  // into a synthetic "Unassigned" bucket so they remain visible.
  const byDept = new Map<string | null, EmployeeRow[]>()
  for (const e of employees) {
    const key = e.department_id ?? null
    if (!byDept.has(key)) byDept.set(key, [])
    byDept.get(key)!.push(e)
  }

  const deptEntries: Array<{ id: string | null; label: string; vertical: string | null }> =
    departments.map((d) => ({
      id: d.id,
      label: d.name ?? "Unnamed",
      vertical: d.vertical,
    }))

  if (byDept.has(null)) {
    deptEntries.push({ id: null, label: "Unassigned", vertical: null })
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Org Chart"
        subtitle="Teams and reporting structure across Suprans HQ."
      />

      {employees.length === 0 ? (
        <DetailCard title="Company">
          <EmptyState
            icon={Network}
            title="No employees yet"
            description="Add employees to see them grouped by department here."
          />
        </DetailCard>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {deptEntries
            .filter((d) => (byDept.get(d.id) ?? []).length > 0)
            .map((d) => {
              const members = byDept.get(d.id) ?? []
              return (
                <DetailCard
                  key={d.id ?? "unassigned"}
                  title={d.vertical ? `${d.label} · ${d.vertical}` : d.label}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {members.map((e) => {
                      const avatarUrl =
                        (e.team_member_id ? avatars[e.team_member_id] : null) ?? e.photo_url
                      return (
                        <Link
                          key={e.id}
                          href={`/hq/people/directory/${e.id}`}
                          className="flex items-center gap-3 rounded-md border border-border/80 bg-card px-3 py-2 hover:bg-muted/40 transition-colors"
                        >
                          {avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={avatarUrl}
                              alt=""
                              className="size-10 rounded-full object-cover border border-border bg-muted shrink-0"
                            />
                          ) : (
                            <span className="size-10 rounded-full inline-flex items-center justify-center bg-muted text-muted-foreground text-xs font-semibold border border-border shrink-0">
                              {formatInitials(e.full_name)}
                            </span>
                          )}
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">
                              {e.full_name ?? "—"}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {e.role_title ?? "—"}
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </DetailCard>
              )
            })}
        </div>
      )}
    </div>
  )
}
