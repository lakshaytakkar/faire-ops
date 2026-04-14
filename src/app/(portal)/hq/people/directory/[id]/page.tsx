import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { BackLink } from "@/components/shared/back-link"
import { HeroCard } from "@/components/shared/hero-card"
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge"
import { supabase, supabaseHq } from "@/lib/supabase"
import { formatDate, formatInitials } from "@/lib/format"
import {
  EmployeeDetailTabs,
  type EmployeeDetail,
  type AttendanceRow,
  type LeaveRequestRow,
  type LeaveBalanceRow,
  type AssetRow,
  type PerformanceReviewRow,
  type PayrollRow,
} from "./employee-detail-tabs"

// HQ → People → Directory → [id] (detail). Server component; fetches
// everything up front and hands it to a client tabs component. See
// suprans-hq-full-spec.md §2.1 + SPACE_PATTERN.md §4.

export const dynamic = "force-dynamic"

type Params = { id: string }

const EMPLOYEE_STATUS_TONE: Record<string, StatusTone> = {
  active: "emerald",
  probation: "amber",
  on_leave: "blue",
  terminated: "slate",
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { id } = await params
  return { title: `Employee ${id.slice(0, 8)} — HQ | Suprans` }
}

async function fetchEmployee(id: string) {
  // 30 days ago for attendance; 6 months ago for payroll.
  const now = new Date()
  const attendanceSince = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
  const payrollSince = new Date(now.getTime() - 183 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  const [
    empRes,
    attendanceRes,
    leaveReqRes,
    leaveBalRes,
    assetsRes,
    perfRes,
    payrollRes,
  ] = await Promise.all([
    supabaseHq
      .from("employees")
      .select(
        "id, team_member_id, full_name, email, phone, photo_url, role_title, department_id, vertical, status, join_date, reporting_to, blood_group, ctc_annual, ctc_currency",
      )
      .eq("id", id)
      .maybeSingle(),
    supabaseHq
      .from("attendance_records")
      .select("id, date, clock_in, clock_out, total_hours, status, late_by_minutes")
      .eq("employee_id", id)
      .gte("date", attendanceSince)
      .order("date", { ascending: false }),
    supabaseHq
      .from("leave_requests")
      .select("id, leave_type, from_date, to_date, days, status")
      .eq("employee_id", id)
      .order("from_date", { ascending: false })
      .limit(20),
    supabaseHq
      .from("leave_balances")
      .select("id, leave_type, total_allowance, used, remaining, year")
      .eq("employee_id", id)
      .order("year", { ascending: false }),
    supabaseHq
      .from("assets")
      .select("id, asset_code, type, brand_model, status")
      .eq("assigned_to_employee_id", id)
      .order("asset_code", { ascending: true }),
    supabaseHq
      .from("performance_reviews")
      .select("id, cycle_id, rating, status, submitted_at")
      .eq("employee_id", id)
      .order("submitted_at", { ascending: false })
      .limit(20),
    supabaseHq
      .from("payroll_line_items")
      .select("id, basic, hra, allowances, deductions, net_pay, status, payment_date")
      .eq("employee_id", id)
      .gte("payment_date", payrollSince)
      .order("payment_date", { ascending: false }),
  ])

  if (!empRes.data) return null
  const emp = empRes.data as {
    id: string
    team_member_id: string | null
    full_name: string | null
    email: string | null
    phone: string | null
    photo_url: string | null
    role_title: string | null
    department_id: string | null
    vertical: string | null
    status: string | null
    join_date: string | null
    reporting_to: string | null
    blood_group: string | null
    ctc_annual: number | null
    ctc_currency: string | null
  }

  // Resolve department name + reporting-to name + avatar in parallel.
  const [deptRes, reporterRes, avatarRes] = await Promise.all([
    emp.department_id
      ? supabaseHq
          .from("departments")
          .select("id, name")
          .eq("id", emp.department_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    emp.reporting_to
      ? supabaseHq
          .from("employees")
          .select("id, full_name")
          .eq("id", emp.reporting_to)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    emp.team_member_id
      ? supabase
          .from("team_members")
          .select("id, avatar_url")
          .eq("id", emp.team_member_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const detail: EmployeeDetail = {
    id: emp.id,
    full_name: emp.full_name,
    email: emp.email,
    phone: emp.phone,
    role_title: emp.role_title,
    vertical: emp.vertical,
    status: emp.status,
    join_date: emp.join_date,
    reporting_to: emp.reporting_to,
    blood_group: emp.blood_group,
    ctc_annual: emp.ctc_annual,
    ctc_currency: emp.ctc_currency,
    department_name: (deptRes.data as { name: string | null } | null)?.name ?? null,
    reporting_to_name:
      (reporterRes.data as { full_name: string | null } | null)?.full_name ?? null,
  }

  const avatarUrl =
    (avatarRes.data as { avatar_url: string | null } | null)?.avatar_url ?? emp.photo_url ?? null

  return {
    detail,
    avatarUrl,
    attendance: (attendanceRes.data ?? []) as AttendanceRow[],
    leaveRequests: (leaveReqRes.data ?? []) as LeaveRequestRow[],
    leaveBalances: (leaveBalRes.data ?? []) as LeaveBalanceRow[],
    assets: (assetsRes.data ?? []) as AssetRow[],
    performanceReviews: (perfRes.data ?? []) as PerformanceReviewRow[],
    payroll: (payrollRes.data ?? []) as PayrollRow[],
  }
}

export default async function HqEmployeeDetailPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params
  const data = await fetchEmployee(id)
  if (!data) notFound()
  const {
    detail,
    avatarUrl,
    attendance,
    leaveRequests,
    leaveBalances,
    assets,
    performanceReviews,
    payroll,
  } = data

  const avatarNode = avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarUrl}
      alt=""
      className="size-11 rounded-md object-cover bg-muted border border-border"
    />
  ) : (
    <span className="size-11 rounded-md inline-flex items-center justify-center bg-muted text-muted-foreground text-sm font-semibold border border-border">
      {formatInitials(detail.full_name)}
    </span>
  )

  const subtitleParts = [detail.role_title, detail.department_name, detail.vertical].filter(
    Boolean,
  ) as string[]

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <BackLink href="/hq/people/directory" label="All employees" />

      <HeroCard
        title={detail.full_name ?? "Untitled employee"}
        subtitle={subtitleParts.length ? subtitleParts.join(" · ") : undefined}
        avatar={avatarNode}
        meta={
          <>
            {detail.status && (
              <StatusBadge tone={EMPLOYEE_STATUS_TONE[detail.status] ?? "slate"}>
                {detail.status.replace(/_/g, " ")}
              </StatusBadge>
            )}
            <span className="text-xs text-muted-foreground">
              Joined {formatDate(detail.join_date)}
            </span>
          </>
        }
        actions={
          <>
            <Button size="sm" variant="outline" disabled>
              Edit
            </Button>
            <Button size="sm" variant="outline" disabled>
              Assign Asset
            </Button>
            <Button size="sm" variant="outline" disabled>
              Mark Leave
            </Button>
          </>
        }
      />

      <EmployeeDetailTabs
        employee={detail}
        attendance={attendance}
        leaveRequests={leaveRequests}
        leaveBalances={leaveBalances}
        assets={assets}
        performanceReviews={performanceReviews}
        payroll={payroll}
      />
    </div>
  )
}
