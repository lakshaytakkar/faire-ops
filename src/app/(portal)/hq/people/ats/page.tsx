import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { Briefcase, UserCircle, Video, FileCheck, Check } from "lucide-react"
import { supabaseHq } from "@/lib/supabase"

export const dynamic = "force-dynamic"
export const metadata = { title: "ATS Dashboard — Suprans HQ" }

// ATS dashboard per suprans-hq-full-spec.md §2.9.
// Counts are live from hq.job_roles / hq.candidates / hq.interviews / hq.offers.
export default async function AtsDashboardPage() {
  const sinceWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [roles, candidates, interviews, offers, hired] = await Promise.all([
    supabaseHq.from("job_roles").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabaseHq.from("candidates").select("id, created_at, stage", { count: "exact" }),
    supabaseHq.from("interviews").select("id", { count: "exact", head: true }).eq("status", "scheduled"),
    supabaseHq.from("offers").select("id", { count: "exact", head: true }).in("status", ["sent", "draft"]),
    supabaseHq.from("candidates").select("id", { count: "exact", head: true }).eq("stage", "hired").gte("updated_at", since30),
  ])

  const openRoles = roles.count ?? 0
  const allCandidates = candidates.data ?? []
  const applicationsThisWeek = allCandidates.filter((c: { created_at: string }) => c.created_at >= sinceWeek).length
  const interviewsScheduled = interviews.count ?? 0
  const offersPending = offers.count ?? 0
  const hiredLast30 = hired.count ?? 0

  // Simple stage funnel
  const STAGES = ["applied", "screened", "interview_1", "interview_2", "offer", "hired"] as const
  const STAGE_LABEL: Record<string, string> = {
    applied: "Applied", screened: "Screened", interview_1: "Interview 1",
    interview_2: "Interview 2", offer: "Offer", hired: "Hired",
  }
  const stageCounts: Record<string, number> = Object.fromEntries(STAGES.map(s => [s, 0]))
  for (const c of allCandidates as { stage: string }[]) {
    if (c.stage in stageCounts) stageCounts[c.stage]++
  }
  const funnelMax = Math.max(1, ...Object.values(stageCounts))

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="ATS Dashboard"
        subtitle="Hiring pulse across open roles. Drill into a stage from the pipeline."
      />

      <KPIGrid>
        <MetricCard label="Open roles" value={openRoles} icon={Briefcase} iconTone="blue" href="/hq/people/ats/roles" />
        <MetricCard label="Applications this week" value={applicationsThisWeek} icon={UserCircle} iconTone="amber" href="/hq/people/ats/candidates" />
        <MetricCard label="Interviews scheduled" value={interviewsScheduled} icon={Video} iconTone="violet" href="/hq/people/ats/interviews" />
        <MetricCard label="Offers pending" value={offersPending} icon={FileCheck} iconTone="emerald" href="/hq/people/ats/offers" />
      </KPIGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <DetailCard title="Stage funnel">
            <div className="space-y-2">
              {STAGES.map(s => {
                const n = stageCounts[s]
                const width = `${Math.round((n / funnelMax) * 100)}%`
                return (
                  <div key={s} className="flex items-center gap-3">
                    <div className="w-32 shrink-0 text-sm text-muted-foreground">{STAGE_LABEL[s]}</div>
                    <div className="flex-1 h-7 rounded bg-muted relative overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-primary/60" style={{ width }} />
                    </div>
                    <div className="w-10 text-right tabular-nums font-semibold">{n}</div>
                  </div>
                )
              })}
            </div>
          </DetailCard>
        </div>
        <div className="space-y-5">
          <DetailCard title="Recent hires (30d)">
            <p className="text-sm"><span className="text-2xl font-bold font-heading tabular-nums">{hiredLast30}</span> <span className="text-muted-foreground">candidates hired in the last 30 days.</span></p>
          </DetailCard>
        </div>
      </div>
    </div>
  )
}
