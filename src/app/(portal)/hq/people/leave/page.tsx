"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  CalendarOff,
  CheckCircle2,
  XCircle,
  CalendarDays,
  Plus,
} from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { FilterBar } from "@/components/shared/filter-bar"
import { DetailCard } from "@/components/shared/detail-views"
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { supabaseHq } from "@/lib/supabase"
import { formatDate, relativeTime } from "@/lib/format"

// HQ → People → Leave Requests (spec §2.3). Client component — approve
// and reject actions mutate hq.leave_requests inline. The table is
// currently empty; we render the EmptyState until the first request
// lands.

type LeaveStatus = "pending" | "approved" | "rejected"

interface LeaveRow {
  id: string
  employee_id: string | null
  leave_type: string | null
  from_date: string | null
  to_date: string | null
  days: number | null
  reason: string | null
  status: LeaveStatus
  applied_at: string | null
  approved_by: string | null
  approved_at: string | null
}

interface EmployeeLite {
  id: string
  full_name: string | null
}

type TabId = "all" | LeaveStatus

const STATUS_TONE: Record<LeaveStatus, StatusTone> = {
  pending: "amber",
  approved: "emerald",
  rejected: "red",
}

const LEAVE_TYPES = [
  "annual",
  "sick",
  "casual",
  "unpaid",
  "compensatory",
] as const

function truncate(s: string | null, n = 60): string {
  if (!s) return "—"
  if (s.length <= n) return s
  return `${s.slice(0, n - 1)}…`
}

export default function HqLeaveRequestsPage() {
  const [rows, setRows] = useState<LeaveRow[]>([])
  const [employees, setEmployees] = useState<EmployeeLite[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [tab, setTab] = useState<TabId>("all")

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const [leaveRes, employeesRes] = await Promise.all([
        supabaseHq
          .from("leave_requests")
          .select(
            "id, employee_id, leave_type, from_date, to_date, days, reason, status, applied_at, approved_by, approved_at",
          )
          .order("applied_at", { ascending: false }),
        supabaseHq.from("employees").select("id, full_name"),
      ])
      if (cancelled) return
      if (leaveRes.error) {
        toast.error(`Failed to load leave requests: ${leaveRes.error.message}`)
      }
      setRows((leaveRes.data ?? []) as LeaveRow[])
      setEmployees((employeesRes.data ?? []) as EmployeeLite[])
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const employeeMap = useMemo(
    () => new Map(employees.map((e) => [e.id, e])),
    [employees],
  )

  const counts = useMemo(() => {
    const now = new Date()
    const monthKey = `${now.getUTCFullYear()}-${now.getUTCMonth()}`
    const inThisMonth = (d: string | null): boolean => {
      if (!d) return false
      const x = new Date(d)
      if (Number.isNaN(x.getTime())) return false
      return `${x.getUTCFullYear()}-${x.getUTCMonth()}` === monthKey
    }
    const pending = rows.filter((r) => r.status === "pending").length
    const approvedThisMonth = rows.filter(
      (r) => r.status === "approved" && inThisMonth(r.approved_at),
    ).length
    const rejected = rows.filter((r) => r.status === "rejected").length
    const totalDaysOffThisMonth = rows
      .filter(
        (r) =>
          r.status === "approved" &&
          inThisMonth(r.approved_at ?? r.from_date),
      )
      .reduce((sum, r) => sum + (r.days ?? 0), 0)
    return {
      pending,
      approvedThisMonth,
      rejected,
      totalDaysOffThisMonth,
      all: rows.length,
    }
  }, [rows])

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows.filter((r) => {
      if (tab !== "all" && r.status !== tab) return false
      if (typeFilter !== "all" && r.leave_type !== typeFilter) return false
      if (needle) {
        const emp = r.employee_id ? employeeMap.get(r.employee_id) : null
        const hay = `${emp?.full_name ?? ""} ${r.reason ?? ""}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [rows, tab, typeFilter, q, employeeMap])

  async function approveRow(id: string) {
    const original = rows
    const approved_at = new Date().toISOString()
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: "approved" as const,
              approved_by: "admin@suprans",
              approved_at,
            }
          : r,
      ),
    )
    const { error } = await supabaseHq
      .from("leave_requests")
      .update({
        status: "approved",
        approved_by: "admin@suprans",
        approved_at,
      })
      .eq("id", id)
    if (error) {
      setRows(original)
      toast.error(`Approve failed: ${error.message}`)
      return
    }
    toast.success("Leave approved")
  }

  async function rejectRow(id: string) {
    const reason = window.prompt("Rejection reason (required):")?.trim()
    if (!reason) {
      toast.error("Rejection reason is required")
      return
    }
    const original = rows
    const approved_at = new Date().toISOString()
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: "rejected" as const,
              approved_by: "admin@suprans",
              approved_at,
              reason: `${r.reason ?? ""}${r.reason ? "\n\n" : ""}[Rejected] ${reason}`,
            }
          : r,
      ),
    )
    const row = original.find((r) => r.id === id)
    const mergedReason = `${row?.reason ?? ""}${row?.reason ? "\n\n" : ""}[Rejected] ${reason}`
    const { error } = await supabaseHq
      .from("leave_requests")
      .update({
        status: "rejected",
        approved_by: "admin@suprans",
        approved_at,
        reason: mergedReason,
      })
      .eq("id", id)
    if (error) {
      setRows(original)
      toast.error(`Reject failed: ${error.message}`)
      return
    }
    toast.success("Leave rejected")
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Leave Requests"
        subtitle="Review and action employee leave requests across Suprans."
        actions={
          <Button disabled>
            <Plus className="size-3.5" /> New Leave Request
          </Button>
        }
      />

      <KPIGrid>
        <MetricCard
          label="Pending"
          value={counts.pending}
          icon={CalendarOff}
          iconTone="amber"
        />
        <MetricCard
          label="Approved this month"
          value={counts.approvedThisMonth}
          icon={CheckCircle2}
          iconTone="emerald"
        />
        <MetricCard
          label="Rejected"
          value={counts.rejected}
          icon={XCircle}
          iconTone="red"
        />
        <MetricCard
          label="Days off this month"
          value={counts.totalDaysOffThisMonth}
          icon={CalendarDays}
          iconTone="blue"
        />
      </KPIGrid>

      <FilterBar
        search={{
          value: q,
          onChange: setQ,
          placeholder: "Search employee or reason…",
        }}
        tabs={[
          { id: "all", label: "All", count: counts.all },
          { id: "pending", label: "Pending", count: counts.pending },
          {
            id: "approved",
            label: "Approved",
            count: rows.filter((r) => r.status === "approved").length,
          },
          { id: "rejected", label: "Rejected", count: counts.rejected },
        ]}
        activeTab={tab}
        onTabChange={(id) => setTab(id as TabId)}
        right={
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-8 rounded-md border border-input bg-transparent px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">All types</option>
            {LEAVE_TYPES.map((t) => (
              <option key={t} value={t} className="capitalize">
                {t}
              </option>
            ))}
          </select>
        }
      />

      <DetailCard title="All leave requests">
        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Loading leave requests…
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={CalendarOff}
            title="No leave requests yet"
            description={
              rows.length === 0
                ? "Leave requests from employees will appear here."
                : "No leave requests match your current filters."
            }
          />
        ) : (
          <div className="overflow-x-auto -mx-5 -my-5">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border/80">
                <tr className="text-left">
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Employee
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Type
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    From
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    To
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Days
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Applied
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Reason
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Approved by
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {visible.map((r) => {
                  const emp = r.employee_id
                    ? employeeMap.get(r.employee_id)
                    : null
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {emp?.full_name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-foreground capitalize">
                        {r.leave_type ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(r.from_date)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(r.to_date)}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {r.days ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {relativeTime(r.applied_at)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={STATUS_TONE[r.status] ?? "slate"}>
                          {r.status}
                        </StatusBadge>
                      </td>
                      <td
                        className="px-4 py-3 text-muted-foreground max-w-[18rem] truncate"
                        title={r.reason ?? undefined}
                      >
                        {truncate(r.reason, 60)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {r.approved_by ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 justify-end">
                          {r.status === "pending" && (
                            <>
                              <Button
                                variant="outline"
                                size="xs"
                                onClick={() => approveRow(r.id)}
                              >
                                <CheckCircle2 className="size-3" /> Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="xs"
                                onClick={() => rejectRow(r.id)}
                              >
                                <XCircle className="size-3" /> Reject
                              </Button>
                            </>
                          )}
                          {r.employee_id && (
                            <Link
                              href={`/hq/people/directory/${r.employee_id}`}
                              className="inline-flex items-center gap-1 h-6 rounded-[10px] border border-border bg-background px-2 text-xs font-medium hover:bg-muted transition-colors"
                            >
                              Profile
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </DetailCard>

      <p className="text-xs text-muted-foreground">
        For the team leave calendar, visit{" "}
        <Link
          href="/hq/people/leave/calendar"
          className="underline hover:text-foreground"
        >
          Leave Calendar
        </Link>{" "}
        (not built yet).
      </p>
    </div>
  )
}
