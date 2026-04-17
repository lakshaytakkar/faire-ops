import { CalendarCheck, UserCheck, UserMinus, Clock } from "lucide-react"
import { supabaseHq } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Attendance — HQ | Suprans" }

export default async function HqAttendancePage() {
  const todayStr = new Date().toISOString().slice(0, 10)
  const thirtyAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)

  const [todayRes, recentRes, empRes] = await Promise.all([
    supabaseHq
      .from("attendance_records")
      .select("id, status, late_by_minutes")
      .eq("date", todayStr),
    supabaseHq
      .from("attendance_records")
      .select("id, employee_id, date, clock_in, clock_out, total_hours, status, late_by_minutes")
      .gte("date", thirtyAgo)
      .order("date", { ascending: false })
      .order("clock_in", { ascending: false })
      .limit(100),
    supabaseHq.from("employees").select("id, full_name").eq("status", "active"),
  ])

  const today = todayRes.data ?? []
  const rows = recentRes.data ?? []
  const emps = new Map(
    (empRes.data ?? []).map((e: { id: string; full_name: string | null }) => [e.id, e.full_name ?? "—"]),
  )

  const presentToday = today.filter((r) => r.status === "present" || r.status === "late").length
  const lateToday = today.filter((r) => r.status === "late").length
  const absentToday = today.filter((r) => r.status === "absent").length

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Attendance"
        subtitle="Daily clock-in / clock-out records across all offices."
      />

      <KPIGrid>
        <MetricCard label="Present today" value={presentToday} icon={UserCheck} iconTone="emerald" />
        <MetricCard label="Late today" value={lateToday} icon={Clock} iconTone="amber" />
        <MetricCard label="Absent today" value={absentToday} icon={UserMinus} iconTone="red" />
        <MetricCard label="Records (30d)" value={rows.length} icon={CalendarCheck} iconTone="blue" />
      </KPIGrid>

      <DetailCard title={`Recent attendance (${rows.length})`}>
        {rows.length === 0 ? (
          <EmptyState icon={CalendarCheck} title="No attendance records" />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs font-medium text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-left px-3 py-2">Employee</th>
                  <th className="text-left px-3 py-2">Clock in</th>
                  <th className="text-left px-3 py-2">Clock out</th>
                  <th className="text-right px-3 py-2 tabular-nums">Hours</th>
                  <th className="text-right px-3 py-2 tabular-nums">Late by</th>
                  <th className="text-left px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2 tabular-nums">{formatDate(a.date)}</td>
                    <td className="px-3 py-2 font-medium">{emps.get(a.employee_id) ?? "—"}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {a.clock_in ? new Date(a.clock_in).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}) : "—"}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {a.clock_out ? new Date(a.clock_out).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {a.total_hours !== null ? Number(a.total_hours).toFixed(1) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                      {a.late_by_minutes ? `${a.late_by_minutes}m` : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {a.status ? (
                        <StatusBadge tone={toneForStatus(a.status)}>{a.status}</StatusBadge>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DetailCard>
    </div>
  )
}
