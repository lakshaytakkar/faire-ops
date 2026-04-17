"use client"

import { useState } from "react"
import { FileText, Inbox } from "lucide-react"
import { FilterBar, type FilterTab } from "@/components/shared/filter-bar"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, toneForStatus, type StatusTone } from "@/components/shared/status-badge"
import { formatCurrency, formatDate } from "@/lib/format"

/* ---------------- Types shared with the server page ---------------- */

export interface EmployeeDetail {
  id: string
  full_name: string | null
  email: string | null
  work_email: string | null
  phone: string | null
  role_title: string | null
  vertical: string | null
  status: string | null
  join_date: string | null
  reporting_to: string | null
  blood_group: string | null
  ctc_annual: number | null
  ctc_currency: string | null
  department_name: string | null
  reporting_to_name: string | null
  father_name: string | null
  relation: string | null
  dob: string | null
  aadhaar_address: string | null
  pan_no: string | null
  bank_name: string | null
  bank_account: string | null
  ifsc: string | null
  office: string | null
  employment_type: string | null
  pf_applicable: boolean | null
  esic_applicable: boolean | null
  office_phone: string | null
  salary_monthly: number | null
}

export interface AttendanceRow {
  id: string
  date: string | null
  clock_in: string | null
  clock_out: string | null
  total_hours: number | null
  status: string | null
  late_by_minutes: number | null
}

export interface LeaveRequestRow {
  id: string
  leave_type: string | null
  from_date: string | null
  to_date: string | null
  days: number | null
  status: string | null
}

export interface LeaveBalanceRow {
  id: string
  leave_type: string | null
  total_allowance: number | null
  used: number | null
  remaining: number | null
  year: number | null
}

export interface AssetRow {
  id: string
  asset_code: string | null
  type: string | null
  brand_model: string | null
  status: string | null
}

export interface PerformanceReviewRow {
  id: string
  cycle_id: string | null
  rating: number | null
  status: string | null
  submitted_at: string | null
}

export interface PayrollRow {
  id: string
  basic: number | null
  hra: number | null
  allowances: number | null
  deductions: number | null
  net_pay: number | null
  status: string | null
  payment_date: string | null
}

const EMPLOYEE_STATUS_TONE: Record<string, StatusTone> = {
  active: "emerald",
  probation: "amber",
  on_leave: "blue",
  terminated: "slate",
}

function EmployeeStatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-muted-foreground">—</span>
  return (
    <StatusBadge tone={EMPLOYEE_STATUS_TONE[status] ?? "slate"}>
      {status.replace(/_/g, " ")}
    </StatusBadge>
  )
}

/* ---------------- Tabs ---------------- */

export function EmployeeDetailTabs({
  employee,
  attendance,
  leaveRequests,
  leaveBalances,
  assets,
  performanceReviews,
  payroll,
}: {
  employee: EmployeeDetail
  attendance: AttendanceRow[]
  leaveRequests: LeaveRequestRow[]
  leaveBalances: LeaveBalanceRow[]
  assets: AssetRow[]
  performanceReviews: PerformanceReviewRow[]
  payroll: PayrollRow[]
}) {
  const [tab, setTab] = useState<string>("profile")

  const tabs: FilterTab[] = [
    { id: "profile", label: "Profile" },
    { id: "employment", label: "Employment" },
    { id: "bank", label: "Bank & tax" },
    { id: "documents", label: "Documents" },
    { id: "attendance", label: "Attendance", count: attendance.length },
    { id: "leave", label: "Leave", count: leaveBalances.length + leaveRequests.length },
    { id: "assets", label: "Assets", count: assets.length },
    { id: "performance", label: "Performance", count: performanceReviews.length },
    { id: "payroll", label: "Payroll", count: payroll.length },
  ]

  const ctc =
    employee.ctc_annual !== null && employee.ctc_annual !== undefined
      ? formatCurrency(
          employee.ctc_annual,
          employee.ctc_currency === "INR" || !employee.ctc_currency ? "₹" : `${employee.ctc_currency} `,
        )
      : "—"
  const monthly =
    employee.salary_monthly !== null && employee.salary_monthly !== undefined
      ? formatCurrency(employee.salary_monthly, "₹")
      : "—"

  return (
    <>
      <FilterBar tabs={tabs} activeTab={tab} onTabChange={setTab} />

      {tab === "profile" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <DetailCard title="Contact">
            <InfoRow label="Personal phone" value={employee.phone ?? "—"} />
            <InfoRow label="Office phone" value={employee.office_phone ?? "—"} />
            <InfoRow label="Personal email" value={employee.email ?? "—"} />
            <InfoRow label="Work email" value={employee.work_email ?? "—"} />
            <InfoRow label="Office" value={employee.office ?? "—"} />
          </DetailCard>
          <DetailCard title="Personal">
            <InfoRow
              label={`Father${employee.relation ? ` (${employee.relation})` : ""}`}
              value={employee.father_name ?? "—"}
            />
            <InfoRow label="Date of birth" value={formatDate(employee.dob)} />
            <InfoRow label="Blood group" value={employee.blood_group ?? "—"} />
            <InfoRow label="Aadhaar address" value={employee.aadhaar_address ?? "—"} />
            <InfoRow label="Status" value={<EmployeeStatusBadge status={employee.status} />} />
          </DetailCard>
        </div>
      )}

      {tab === "employment" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <DetailCard title="Role">
            <InfoRow label="Role / Title" value={employee.role_title ?? "—"} />
            <InfoRow label="Department" value={employee.department_name ?? "—"} />
            <InfoRow label="Office" value={employee.office ?? "—"} />
            <InfoRow
              label="Type"
              value={employee.employment_type ? (
                <StatusBadge tone="blue">{employee.employment_type}</StatusBadge>
              ) : "—"}
            />
            <InfoRow label="Reporting to" value={employee.reporting_to_name ?? "—"} />
            <InfoRow label="Vertical" value={employee.vertical ?? "—"} />
          </DetailCard>
          <DetailCard title="Tenure & compensation">
            <InfoRow label="Join date" value={formatDate(employee.join_date)} />
            <InfoRow label="Status" value={<EmployeeStatusBadge status={employee.status} />} />
            <InfoRow label="Monthly salary" value={<span className="tabular-nums">{monthly}</span>} />
            <InfoRow label="CTC (annual)" value={<span className="tabular-nums">{ctc}</span>} />
            <InfoRow
              label="PF applicable"
              value={<StatusBadge tone={employee.pf_applicable ? "emerald" : "slate"}>
                {employee.pf_applicable ? "Yes" : "No"}
              </StatusBadge>}
            />
            <InfoRow
              label="ESIC applicable"
              value={<StatusBadge tone={employee.esic_applicable ? "emerald" : "slate"}>
                {employee.esic_applicable ? "Yes" : "No"}
              </StatusBadge>}
            />
          </DetailCard>
        </div>
      )}

      {tab === "bank" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <DetailCard title="Verified bank account">
            <InfoRow label="Bank" value={employee.bank_name ?? "—"} />
            <InfoRow
              label="Account no."
              value={<span className="tabular-nums">{employee.bank_account ?? "—"}</span>}
            />
            <InfoRow
              label="IFSC"
              value={<span className="tabular-nums">{employee.ifsc ?? "—"}</span>}
            />
          </DetailCard>
          <DetailCard title="Tax identifiers">
            <InfoRow
              label="PAN"
              value={<span className="tabular-nums">{employee.pan_no ?? "—"}</span>}
            />
            <InfoRow
              label="PF"
              value={<StatusBadge tone={employee.pf_applicable ? "emerald" : "slate"}>
                {employee.pf_applicable ? "Applicable" : "Not applicable"}
              </StatusBadge>}
            />
            <InfoRow
              label="ESIC"
              value={<StatusBadge tone={employee.esic_applicable ? "emerald" : "slate"}>
                {employee.esic_applicable ? "Applicable" : "Not applicable"}
              </StatusBadge>}
            />
          </DetailCard>
        </div>
      )}

      {tab === "documents" && (
        <DetailCard title="Documents">
          <EmptyState
            icon={FileText}
            title="No documents uploaded yet."
            description="Offer letters, ID proofs and contracts will appear here once uploaded."
          />
        </DetailCard>
      )}

      {tab === "attendance" && (
        <DetailCard title="Attendance — last 30 days">
          {attendance.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No attendance records"
              description="Clock-in / clock-out events will populate this view."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs font-medium text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 font-medium">Date</th>
                    <th className="px-2 py-2 font-medium">Clock in</th>
                    <th className="px-2 py-2 font-medium">Clock out</th>
                    <th className="px-2 py-2 font-medium">Hours</th>
                    <th className="px-2 py-2 font-medium">Late by</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((a) => (
                    <tr key={a.id} className="border-b last:border-0">
                      <td className="px-2 py-2">{formatDate(a.date)}</td>
                      <td className="px-2 py-2">
                        {a.clock_in
                          ? new Date(a.clock_in).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="px-2 py-2">
                        {a.clock_out
                          ? new Date(a.clock_out).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="px-2 py-2">
                        {a.total_hours !== null ? Number(a.total_hours).toFixed(1) : "—"}
                      </td>
                      <td className="px-2 py-2">
                        {a.late_by_minutes ? `${a.late_by_minutes}m` : "—"}
                      </td>
                      <td className="px-2 py-2">
                        {a.status ? (
                          <StatusBadge tone={toneForStatus(a.status)}>{a.status}</StatusBadge>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DetailCard>
      )}

      {tab === "leave" && (
        <div className="grid grid-cols-1 gap-5">
          <DetailCard title="Leave balances">
            {leaveBalances.length === 0 ? (
              <EmptyState icon={Inbox} title="No balances yet" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b text-left text-xs font-medium text-muted-foreground">
                    <tr>
                      <th className="px-2 py-2 font-medium">Type</th>
                      <th className="px-2 py-2 font-medium">Year</th>
                      <th className="px-2 py-2 font-medium">Allowance</th>
                      <th className="px-2 py-2 font-medium">Used</th>
                      <th className="px-2 py-2 font-medium">Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveBalances.map((b) => (
                      <tr key={b.id} className="border-b last:border-0">
                        <td className="px-2 py-2 capitalize">{b.leave_type ?? "—"}</td>
                        <td className="px-2 py-2">{b.year ?? "—"}</td>
                        <td className="px-2 py-2">{b.total_allowance ?? "—"}</td>
                        <td className="px-2 py-2">{b.used ?? "—"}</td>
                        <td className="px-2 py-2 font-medium">{b.remaining ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DetailCard>
          <DetailCard title="Recent requests">
            {leaveRequests.length === 0 ? (
              <EmptyState icon={Inbox} title="No leave requests" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b text-left text-xs font-medium text-muted-foreground">
                    <tr>
                      <th className="px-2 py-2 font-medium">Type</th>
                      <th className="px-2 py-2 font-medium">From</th>
                      <th className="px-2 py-2 font-medium">To</th>
                      <th className="px-2 py-2 font-medium">Days</th>
                      <th className="px-2 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveRequests.map((r) => (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="px-2 py-2 capitalize">{r.leave_type ?? "—"}</td>
                        <td className="px-2 py-2">{formatDate(r.from_date)}</td>
                        <td className="px-2 py-2">{formatDate(r.to_date)}</td>
                        <td className="px-2 py-2">{r.days ?? "—"}</td>
                        <td className="px-2 py-2">
                          {r.status ? (
                            <StatusBadge tone={toneForStatus(r.status)}>{r.status}</StatusBadge>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DetailCard>
        </div>
      )}

      {tab === "assets" && (
        <DetailCard title="Assigned assets">
          {assets.length === 0 ? (
            <EmptyState icon={Inbox} title="No assets assigned" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs font-medium text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 font-medium">Code</th>
                    <th className="px-2 py-2 font-medium">Type</th>
                    <th className="px-2 py-2 font-medium">Brand / Model</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((a) => (
                    <tr key={a.id} className="border-b last:border-0">
                      <td className="px-2 py-2 text-sm tabular-nums">{a.asset_code ?? "—"}</td>
                      <td className="px-2 py-2 capitalize">{a.type ?? "—"}</td>
                      <td className="px-2 py-2">{a.brand_model ?? "—"}</td>
                      <td className="px-2 py-2">
                        {a.status ? (
                          <StatusBadge tone={toneForStatus(a.status)}>{a.status}</StatusBadge>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DetailCard>
      )}

      {tab === "performance" && (
        <DetailCard title="Performance reviews">
          {performanceReviews.length === 0 ? (
            <EmptyState icon={Inbox} title="No reviews yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs font-medium text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 font-medium">Cycle</th>
                    <th className="px-2 py-2 font-medium">Submitted</th>
                    <th className="px-2 py-2 font-medium">Rating</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {performanceReviews.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="px-2 py-2 text-sm text-muted-foreground tabular-nums">
                        {r.cycle_id ? r.cycle_id.slice(0, 8) : "—"}
                      </td>
                      <td className="px-2 py-2">{formatDate(r.submitted_at)}</td>
                      <td className="px-2 py-2 font-medium">
                        {r.rating !== null ? Number(r.rating).toFixed(1) : "—"}
                      </td>
                      <td className="px-2 py-2">
                        {r.status ? (
                          <StatusBadge tone={toneForStatus(r.status)}>{r.status}</StatusBadge>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DetailCard>
      )}

      {tab === "payroll" && (
        <DetailCard title="Payroll — last 6 months">
          {payroll.length === 0 ? (
            <EmptyState icon={Inbox} title="No payroll runs yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs font-medium text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 font-medium">Paid on</th>
                    <th className="px-2 py-2 font-medium">Basic</th>
                    <th className="px-2 py-2 font-medium">HRA</th>
                    <th className="px-2 py-2 font-medium">Allowances</th>
                    <th className="px-2 py-2 font-medium">Deductions</th>
                    <th className="px-2 py-2 font-medium">Net pay</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payroll.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="px-2 py-2">{formatDate(p.payment_date)}</td>
                      <td className="px-2 py-2">{formatCurrency(p.basic)}</td>
                      <td className="px-2 py-2">{formatCurrency(p.hra)}</td>
                      <td className="px-2 py-2">{formatCurrency(p.allowances)}</td>
                      <td className="px-2 py-2">{formatCurrency(p.deductions)}</td>
                      <td className="px-2 py-2 font-medium">{formatCurrency(p.net_pay)}</td>
                      <td className="px-2 py-2">
                        {p.status ? (
                          <StatusBadge tone={toneForStatus(p.status)}>{p.status}</StatusBadge>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DetailCard>
      )}
    </>
  )
}
