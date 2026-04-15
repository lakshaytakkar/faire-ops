import Link from "next/link"
import {
  Layers,
  UserCheck,
  UserMinus,
  UserX,
  Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import { supabaseHq } from "@/lib/supabase"
import { formatDate } from "@/lib/format"

// HQ → People → Departments (spec §2.7). Server component — table lives
// at hq.departments with a join into hq.employees for headcount numbers.

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Departments — HQ | Suprans",
}

interface DepartmentRow {
  id: string
  name: string | null
  vertical: string | null
  head_employee_id: string | null
  created_at: string | null
}

interface EmployeeRow {
  id: string
  full_name: string | null
  department_id: string | null
  status: string | null
}

async function fetchData() {
  const [deptsRes, employeesRes] = await Promise.all([
    supabaseHq
      .from("departments")
      .select("id, name, vertical, head_employee_id, created_at")
      .order("name", { ascending: true }),
    supabaseHq
      .from("employees")
      .select("id, full_name, department_id, status"),
  ])
  const departments = (deptsRes.data ?? []) as DepartmentRow[]
  const employees = (employeesRes.data ?? []) as EmployeeRow[]
  return { departments, employees }
}

export default async function HqDepartmentsPage() {
  const { departments, employees } = await fetchData()

  const employeeById = new Map(employees.map((e) => [e.id, e]))

  const totalDepts = departments.length
  const activeEmployees = employees.filter((e) => e.status === "active").length
  const onLeaveEmployees = employees.filter((e) => e.status === "on_leave").length
  const vacantHeads = departments.filter((d) => !d.head_employee_id).length

  // Per-department rollups
  const perDept = departments.map((d) => {
    const members = employees.filter((e) => e.department_id === d.id)
    return {
      dept: d,
      headcount: members.length,
      active: members.filter((e) => e.status === "active").length,
      onLeave: members.filter((e) => e.status === "on_leave").length,
      head: d.head_employee_id
        ? employeeById.get(d.head_employee_id)?.full_name ?? null
        : null,
    }
  })

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Departments"
        subtitle="All departments across Suprans verticals."
        actions={
          <Button disabled>
            <Plus className="size-3.5" /> Add Department
          </Button>
        }
      />

      <KPIGrid>
        <MetricCard
          label="Total departments"
          value={totalDepts}
          icon={Layers}
          iconTone="blue"
        />
        <MetricCard
          label="Active employees"
          value={activeEmployees}
          icon={UserCheck}
          iconTone="emerald"
        />
        <MetricCard
          label="On leave"
          value={onLeaveEmployees}
          icon={UserMinus}
          iconTone="amber"
        />
        <MetricCard
          label="Vacant heads"
          value={vacantHeads}
          icon={UserX}
          iconTone="red"
        />
      </KPIGrid>

      <DetailCard title="All departments">
        {perDept.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No departments yet"
            description="Add a department to start tracking headcount and heads."
          />
        ) : (
          <div className="overflow-x-auto -mx-5 -my-5">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border/80">
                <tr className="text-left">
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Department
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Vertical
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Head
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Headcount
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Active
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    On leave
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {perDept.map(({ dept, headcount, active, onLeave, head }) => {
                  const name = dept.name ?? "—"
                  const href = `/hq/people/directory?dept=${encodeURIComponent(dept.id)}`
                  return (
                    <tr
                      key={dept.id}
                      className="hover:bg-muted/20 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        <Link href={href} className="hover:underline">
                          {name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {dept.vertical ? (
                          <StatusBadge tone="slate">{dept.vertical}</StatusBadge>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {head ? (
                          <span className="text-foreground">{head}</span>
                        ) : (
                          <span className="text-red-700 font-medium">
                            Vacant
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-foreground">{headcount}</td>
                      <td className="px-4 py-3 text-emerald-700 font-medium">
                        {active}
                      </td>
                      <td className="px-4 py-3 text-amber-700 font-medium">
                        {onLeave}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(dept.created_at)}
                      </td>
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
