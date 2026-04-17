import { Network } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { supabase, supabaseHq } from "@/lib/supabase"
import { formatInitials } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Org Chart — HQ | Suprans" }

interface EmployeeRow {
  id: string
  full_name: string | null
  role_title: string | null
  department_id: string | null
  reporting_to: string | null
  photo_url: string | null
  team_member_id: string | null
  status: string | null
}

interface DepartmentRow {
  id: string
  name: string | null
  vertical: string | null
}

async function fetchOrgData() {
  const [empRes, deptRes] = await Promise.all([
    supabaseHq
      .from("employees")
      .select("id, full_name, role_title, department_id, reporting_to, photo_url, team_member_id, status")
      .not("status", "eq", "resigned")
      .order("full_name"),
    supabaseHq.from("departments").select("id, name, vertical").order("name"),
  ])

  const employees = (empRes.data ?? []) as EmployeeRow[]
  const departments = (deptRes.data ?? []) as DepartmentRow[]

  // Fetch avatar URLs from team_members
  const tmIds = employees.map((e) => e.team_member_id).filter((x): x is string => !!x)
  const avatars: Record<string, string | null> = {}
  if (tmIds.length > 0) {
    const { data } = await supabase.from("team_members").select("id, avatar_url").in("id", tmIds)
    for (const r of data ?? []) avatars[r.id as string] = (r.avatar_url as string | null) ?? null
  }

  return { employees, departments, avatars }
}

/* ── Person node ─────────────────────────────────────────────────── */

function PersonNode({
  name,
  role,
  photoUrl,
  initials,
  isLeader,
}: {
  name: string
  role: string
  photoUrl: string | null
  initials: string
  isLeader?: boolean
}) {
  return (
    <div className={`flex flex-col items-center ${isLeader ? "mb-2" : ""}`}>
      <div
        className={`rounded-full border-2 flex items-center justify-center overflow-hidden bg-muted ${
          isLeader
            ? "size-16 border-primary shadow-md"
            : "size-12 border-border/80"
        }`}
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={name} className="size-full object-cover" />
        ) : (
          <span className={`font-semibold text-muted-foreground ${isLeader ? "text-sm" : "text-xs"}`}>
            {initials}
          </span>
        )}
      </div>
      <p className={`mt-1.5 text-center leading-tight ${isLeader ? "text-sm font-semibold" : "text-xs font-medium"} text-foreground`}>
        {name}
      </p>
      <p className="text-[10px] text-muted-foreground text-center leading-tight mt-0.5">
        {role}
      </p>
    </div>
  )
}

/* ── Main page ───────────────────────────────────────────────────── */

export default async function HqOrgChartPage() {
  const { employees, departments, avatars } = await fetchOrgData()

  if (employees.length === 0) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <PageHeader title="Org Chart" subtitle="Teams and reporting structure across Suprans HQ." />
        <DetailCard title="Company">
          <EmptyState icon={Network} title="No employees yet" description="Add employees to see the org chart." />
        </DetailCard>
      </div>
    )
  }

  const deptMap = new Map(departments.map((d) => [d.id, d]))

  // Group by department
  const byDept = new Map<string | null, EmployeeRow[]>()
  for (const e of employees) {
    const key = e.department_id ?? null
    if (!byDept.has(key)) byDept.set(key, [])
    byDept.get(key)!.push(e)
  }

  // Separate leadership from departments
  const leadershipDept = departments.find((d) => d.name?.toLowerCase() === "leadership")
  const leaders = leadershipDept ? (byDept.get(leadershipDept.id) ?? []) : []
  const otherDepts = departments.filter((d) => d.id !== leadershipDept?.id && (byDept.get(d.id) ?? []).length > 0)
  const unassigned = byDept.get(null) ?? []

  function getAvatar(e: EmployeeRow) {
    return (e.team_member_id ? avatars[e.team_member_id] : null) ?? e.photo_url
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Org Chart"
        subtitle={`${employees.length} active team members across ${departments.length} departments`}
      />

      <DetailCard title="Company Structure">
        <div className="flex flex-col items-center py-4">
          {/* ── LEADERSHIP ROW ──────────────────────────────── */}
          {leaders.length > 0 && (
            <>
              <div className="flex items-end justify-center gap-8 flex-wrap">
                {leaders.map((e) => (
                  <PersonNode
                    key={e.id}
                    name={e.full_name ?? "—"}
                    role={e.role_title ?? "—"}
                    photoUrl={getAvatar(e)}
                    initials={formatInitials(e.full_name)}
                    isLeader
                  />
                ))}
              </div>

              {/* Connector line down */}
              <div className="w-px h-8 bg-border" />

              {/* Horizontal connector spanning all departments */}
              {otherDepts.length > 1 && (
                <div className="w-full max-w-3xl flex items-center">
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}
            </>
          )}

          {/* ── DEPARTMENT BRANCHES ─────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full mt-4">
            {otherDepts.map((dept) => {
              const members = byDept.get(dept.id) ?? []
              return (
                <div
                  key={dept.id}
                  className="flex flex-col items-center rounded-xl border border-border/80 bg-card p-4"
                >
                  {/* Department header */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {dept.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      ({members.length})
                    </span>
                  </div>

                  {/* Members grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full">
                    {members.map((e) => (
                      <PersonNode
                        key={e.id}
                        name={e.full_name ?? "—"}
                        role={e.role_title ?? "—"}
                        photoUrl={getAvatar(e)}
                        initials={formatInitials(e.full_name)}
                      />
                    ))}
                  </div>
                </div>
              )
            })}

            {/* Unassigned */}
            {unassigned.length > 0 && (
              <div className="flex flex-col items-center rounded-xl border border-dashed border-border/80 bg-muted/30 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Team Members
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    ({unassigned.length})
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full">
                  {unassigned.map((e) => (
                    <PersonNode
                      key={e.id}
                      name={e.full_name ?? "—"}
                      role={e.role_title ?? "—"}
                      photoUrl={getAvatar(e)}
                      initials={formatInitials(e.full_name)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DetailCard>
    </div>
  )
}
