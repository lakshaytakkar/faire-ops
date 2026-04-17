import Link from "next/link"
import { Target, Star, CheckCircle2, Clock } from "lucide-react"
import { supabaseHq } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Performance — HQ | Suprans" }

export default async function HqPerformancePage() {
  const [cyclesRes, reviewsRes, empRes] = await Promise.all([
    supabaseHq.from("performance_cycles").select("id, name, period_start, period_end, status").order("period_start", { ascending: false }),
    supabaseHq
      .from("performance_reviews")
      .select("id, cycle_id, employee_id, rating, status, submitted_at")
      .order("submitted_at", { ascending: false, nullsFirst: false })
      .limit(200),
    supabaseHq.from("employees").select("id, full_name, role_title, office"),
  ])

  const cycles = cyclesRes.data ?? []
  const reviews = reviewsRes.data ?? []
  const emps = new Map(
    (empRes.data ?? []).map((e: { id: string; full_name: string | null; role_title: string | null; office: string | null }) =>
      [e.id, e],
    ),
  )
  const cycleMap = new Map(cycles.map((c: { id: string; name: string | null }) => [c.id, c.name ?? "—"]))

  const submitted = reviews.filter((r) => r.status === "submitted").length
  const draft = reviews.filter((r) => r.status === "draft").length
  const ratings = reviews.filter((r) => r.rating !== null).map((r) => Number(r.rating))
  const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Performance"
        subtitle="Review cycles, submissions, and ratings across the organisation."
        actions={<Button size="sm" disabled>+ Start cycle</Button>}
      />

      <KPIGrid>
        <MetricCard label="Active cycles" value={cycles.filter((c) => c.status === "in_progress").length} icon={Target} iconTone="blue" />
        <MetricCard label="Submitted" value={submitted} icon={CheckCircle2} iconTone="emerald" />
        <MetricCard label="In draft" value={draft} icon={Clock} iconTone="amber" />
        <MetricCard label="Avg rating" value={avgRating ? avgRating.toFixed(1) : "—"} icon={Star} iconTone="violet" />
      </KPIGrid>

      <DetailCard title={`Cycles (${cycles.length})`}>
        {cycles.length === 0 ? (
          <EmptyState icon={Target} title="No cycles yet" />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs font-medium text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Cycle</th>
                  <th className="text-left px-3 py-2">Period</th>
                  <th className="text-right px-3 py-2 tabular-nums">Reviews</th>
                  <th className="text-left px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cycles.map((c) => {
                  const n = reviews.filter((r) => r.cycle_id === c.id).length
                  return (
                    <tr key={c.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium">{c.name ?? "—"}</td>
                      <td className="px-3 py-2 tabular-nums text-muted-foreground">
                        {formatDate(c.period_start)} → {formatDate(c.period_end)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{n}</td>
                      <td className="px-3 py-2">
                        {c.status ? <StatusBadge tone={toneForStatus(c.status)}>{c.status.replace(/_/g," ")}</StatusBadge> : "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </DetailCard>

      <DetailCard title={`Recent reviews (${reviews.length})`}>
        {reviews.length === 0 ? (
          <EmptyState icon={Target} title="No reviews yet" />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs font-medium text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Employee</th>
                  <th className="text-left px-3 py-2">Role</th>
                  <th className="text-left px-3 py-2">Office</th>
                  <th className="text-left px-3 py-2">Cycle</th>
                  <th className="text-right px-3 py-2 tabular-nums">Rating</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reviews.map((r) => {
                  const emp = emps.get(r.employee_id)
                  return (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium">
                        <Link href={`/hq/people/directory/${r.employee_id}`} className="hover:underline">
                          {emp?.full_name ?? "—"}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{emp?.role_title ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{emp?.office ?? "—"}</td>
                      <td className="px-3 py-2">{cycleMap.get(r.cycle_id) ?? "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold">
                        {r.rating !== null ? Number(r.rating).toFixed(1) : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {r.status ? <StatusBadge tone={toneForStatus(r.status)}>{r.status}</StatusBadge> : "—"}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-muted-foreground">{formatDate(r.submitted_at)}</td>
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
