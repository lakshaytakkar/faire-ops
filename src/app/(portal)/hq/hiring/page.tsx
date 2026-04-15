import Link from "next/link"
import {
  Briefcase,
  UserCircle,
  Video,
  FileCheck,
  AlertTriangle,
  Calendar,
  Users,
  MapPin,
  Phone,
  Sparkles,
  Target,
  TrendingUp,
  Megaphone,
} from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { formatDate, formatNumber, relativeTime, formatInitials } from "@/lib/format"
import { supabaseHq } from "@/lib/supabase"

export const dynamic = "force-dynamic"
export const metadata = { title: "Hiring — Suprans HQ" }

// ATS dashboard per suprans-hq-full-spec.md §2.9.
// Server component. Reads directly from hq.* tables + the two v_hiring_* views.

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

// Funnel spine — rendered as horizontal bars in order.
const FUNNEL_STAGES = [
  "applied",
  "screened",
  "interview_1",
  "interview_2",
  "offer",
  "hired",
] as const

const STAGE_LABEL: Record<string, string> = {
  applied: "Applied",
  screened: "Screened",
  assessment: "Assessment",
  interview_1: "Interview 1",
  interview_2: "Interview 2",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
}

// Source -> badge tone for the chip row under each funnel bar. Matches the
// source-tone map specced in the hiring dashboard polish brief.
const SOURCE_TONE: Record<string, "blue" | "amber" | "emerald" | "violet" | "cyan" | "slate"> = {
  "Naukri Resdex": "blue",
  Naukri: "blue",
  "Applied on Workindia": "amber",
  Workindia: "amber",
  Internshala: "emerald",
  Indeed: "violet",
  Email: "cyan",
  WhatsApp: "emerald",
  Poster: "slate",
}
function sourceTone(s: string): "blue" | "amber" | "emerald" | "violet" | "slate" {
  const mapped = SOURCE_TONE[s]
  // StatusBadge supports emerald/amber/red/blue/slate/violet — flatten cyan→blue
  // for the badge surface while keeping bar colors tuned per stage below.
  if (!mapped) return "slate"
  if (mapped === "cyan") return "blue"
  return mapped
}

// Per-stage fill colors for the funnel bars. No hex — Tailwind tokens only.
const STAGE_BAR_COLOR: Record<string, string> = {
  applied: "bg-blue-500",
  screened: "bg-amber-500",
  assessment: "bg-cyan-500",
  interview_1: "bg-violet-400",
  interview_2: "bg-violet-600",
  offer: "bg-emerald-400",
  hired: "bg-emerald-600",
  rejected: "bg-slate-400",
}

// Deterministic initials-avatar tone picker. Hashes the name, picks one of 8
// tone classes. Keeps avatars consistent across renders.
const AVATAR_TONES = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-violet-100 text-violet-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
  "bg-slate-100 text-slate-700",
  "bg-indigo-100 text-indigo-700",
] as const

function avatarTone(name: string | null | undefined): string {
  const key = (name ?? "").trim() || "?"
  let h = 0
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) | 0
  }
  const idx = Math.abs(h) % AVATAR_TONES.length
  return AVATAR_TONES[idx]
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Candidate {
  id: string
  name: string | null
  stage: string | null
  source: string | null
  applied_for: string | null
  updated_at: string | null
  created_at: string | null
  role_id: string | null
}

interface FunnelRow {
  stage: string | null
  source: string | null
  n: number | null
}

interface SourcePerfRow {
  source: string | null
  applied: number | null
  connected: number | null
  interested: number | null
  interview_scheduled: number | null
  hired: number | null
}

interface InterviewRow {
  id: string
  scheduled_at: string | null
  interviewer: string | null
  status: string | null
  candidate_id: string | null
  role_id: string | null
}

interface DailyReport {
  report_date: string | null
  total_calls: number | null
  connected_calls: number | null
  interviews_scheduled: number | null
  selected: number | null
}

interface IssueRow {
  id: string
  title: string | null
  location: string | null
  status: string | null
  resolved_at: string | null
}

interface RoleRow {
  id: string
  title: string | null
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function isoStartOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x.toISOString()
}

function isoEndOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x.toISOString()
}

function formatTimeShort(iso: string | null | undefined): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return "—"
  }
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default async function HiringDashboardPage() {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const thirtyDaysAgoDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
  const today = new Date(now)
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const sevenDaysAgoDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  const [
    openRolesRes,
    applicationsWeekRes,
    interviewsScheduledRes,
    offersPendingRes,
    activeJobPostsRes,
    onboardingRes,
    funnelRes,
    sourcePerfRes,
    todayInterviewsRes,
    tomorrowInterviewsRes,
    dailyRes,
    issuesRes,
    recentHiresRes,
    rolesDirRes,
  ] = await Promise.all([
    supabaseHq
      .from("job_roles")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabaseHq
      .from("candidates")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekAgo),
    supabaseHq
      .from("interviews")
      .select("id", { count: "exact", head: true })
      .eq("status", "scheduled"),
    supabaseHq
      .from("offers")
      .select("id", { count: "exact", head: true })
      .in("status", ["sent", "draft"]),
    supabaseHq
      .from("job_posts")
      .select("id", { count: "exact", head: true })
      .eq("status", "live"),
    supabaseHq
      .from("employees")
      .select("id", { count: "exact", head: true })
      .eq("status", "probation")
      .gte("join_date", thirtyDaysAgoDate),
    supabaseHq.from("v_hiring_funnel").select("stage, source, n"),
    supabaseHq
      .from("v_hiring_source_performance")
      .select("source, applied, connected, interested, interview_scheduled, hired"),
    supabaseHq
      .from("interviews")
      .select("id, scheduled_at, interviewer, status, candidate_id, role_id")
      .gte("scheduled_at", isoStartOfDay(today))
      .lte("scheduled_at", isoEndOfDay(today))
      .order("scheduled_at", { ascending: true }),
    supabaseHq
      .from("interviews")
      .select("id, scheduled_at, interviewer, status, candidate_id, role_id")
      .gte("scheduled_at", isoStartOfDay(tomorrow))
      .lte("scheduled_at", isoEndOfDay(tomorrow))
      .order("scheduled_at", { ascending: true }),
    supabaseHq
      .from("hiring_daily_reports")
      .select("report_date, total_calls, connected_calls, interviews_scheduled, selected")
      .gte("report_date", sevenDaysAgoDate)
      .order("report_date", { ascending: false })
      .limit(7),
    supabaseHq
      .from("hiring_issues")
      .select("id, title, location, status, resolved_at")
      .is("resolved_at", null)
      .order("created_at", { ascending: false })
      .limit(8),
    supabaseHq
      .from("candidates")
      .select("id, name, stage, source, applied_for, updated_at, created_at, role_id")
      .eq("stage", "hired")
      .order("updated_at", { ascending: false })
      .limit(5),
    supabaseHq.from("job_roles").select("id, title"),
  ])

  const openRoles = openRolesRes.count ?? 0
  const applicationsWeek = applicationsWeekRes.count ?? 0
  const interviewsScheduled = interviewsScheduledRes.count ?? 0
  const offersPending = offersPendingRes.count ?? 0
  const activeJobPosts = activeJobPostsRes.count ?? 0
  const onboardingInProgress = onboardingRes.count ?? 0

  const funnel = (funnelRes.data ?? []) as FunnelRow[]
  const sourcePerf = (sourcePerfRes.data ?? []) as SourcePerfRow[]
  const todayInterviews = (todayInterviewsRes.data ?? []) as InterviewRow[]
  const tomorrowInterviews = (tomorrowInterviewsRes.data ?? []) as InterviewRow[]
  const daily = (dailyRes.data ?? []) as DailyReport[]
  const issues = (issuesRes.data ?? []) as IssueRow[]
  const recentHires = (recentHiresRes.data ?? []) as Candidate[]
  const roles = (rolesDirRes.data ?? []) as RoleRow[]

  const roleById = new Map<string, string>()
  roles.forEach((r) => {
    if (r.id) roleById.set(r.id, r.title ?? "—")
  })

  // Enrich interviews with candidate + role info using a single query per list.
  const interviewCandidateIds = Array.from(
    new Set(
      [...todayInterviews, ...tomorrowInterviews]
        .map((i) => i.candidate_id)
        .filter((x): x is string => !!x),
    ),
  )
  let interviewCandidates: Record<string, Candidate> = {}
  if (interviewCandidateIds.length > 0) {
    const { data } = await supabaseHq
      .from("candidates")
      .select("id, name, stage, source, applied_for, updated_at, created_at, role_id")
      .in("id", interviewCandidateIds)
    interviewCandidates = Object.fromEntries(
      ((data ?? []) as Candidate[]).map((c) => [c.id, c]),
    )
  }

  /* --------------------------- funnel aggregation --------------------------- */
  const stageTotals: Record<string, number> = {}
  const stageBySource: Record<string, { source: string; n: number }[]> = {}
  for (const row of funnel) {
    const stage = row.stage ?? ""
    const source = row.source ?? "Other"
    const n = Number(row.n ?? 0)
    stageTotals[stage] = (stageTotals[stage] ?? 0) + n
    if (!stageBySource[stage]) stageBySource[stage] = []
    stageBySource[stage].push({ source, n })
  }
  // Sort each stage's source breakdown desc.
  for (const s of Object.keys(stageBySource)) {
    stageBySource[s].sort((a, b) => b.n - a.n)
  }
  const mainFunnelMax = Math.max(
    1,
    ...FUNNEL_STAGES.map((s) => stageTotals[s] ?? 0),
  )
  const assessmentCount = stageTotals["assessment"] ?? 0
  const rejectedCount = stageTotals["rejected"] ?? 0

  /* ---------------------------- partial error flags ------------------------- */
  const funnelErrored = !!funnelRes.error
  const sourceErrored = !!sourcePerfRes.error
  const todayErrored = !!todayInterviewsRes.error
  const tomorrowErrored = !!tomorrowInterviewsRes.error
  const dailyErrored = !!dailyRes.error
  const issuesErrored = !!issuesRes.error
  const hiresErrored = !!recentHiresRes.error

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Hiring"
        subtitle="Company-wide hiring pulse. Candidates, roles, interviews, and daily recruiter activity."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/hq/hiring/candidates?stage=applied" />}
            >
              + Add candidate
            </Button>
            <Button size="sm" render={<Link href="/hq/hiring/pipeline" />}>
              Open pipeline
            </Button>
          </>
        }
      />

      <KPIGrid>
        <MetricCard
          label="Open roles"
          value={formatNumber(openRoles)}
          icon={Briefcase}
          iconTone="blue"
          href="/hq/hiring/roles"
        />
        <MetricCard
          label="Applications this week"
          value={formatNumber(applicationsWeek)}
          icon={UserCircle}
          iconTone="amber"
          href="/hq/hiring/candidates"
        />
        <MetricCard
          label="Interviews scheduled"
          value={formatNumber(interviewsScheduled)}
          icon={Video}
          iconTone="violet"
          href="/hq/hiring/interviews"
        />
        <MetricCard
          label="Offers pending"
          value={formatNumber(offersPending)}
          icon={FileCheck}
          iconTone="emerald"
          href="/hq/hiring/offers"
        />
        <MetricCard
          label="Active job posts"
          value={formatNumber(activeJobPosts)}
          icon={Megaphone}
          iconTone="amber"
          href="/hq/hiring/roles"
        />
        <MetricCard
          label="Onboarding in progress"
          value={formatNumber(onboardingInProgress)}
          icon={Sparkles}
          iconTone="emerald"
          href="/hq/people/directory?status=probation"
        />
      </KPIGrid>

      {/* Stage funnel — full width */}
      <DetailCard title="Stage funnel">
        {funnelErrored ? (
          <EmptyState
            icon={AlertTriangle}
            title="Funnel unavailable"
            description="Couldn't load stage counts right now. Try again in a moment."
          />
        ) : funnel.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No candidates yet"
            description="As candidates come in, each stage will show up here."
          />
        ) : (
          <div className="space-y-2">
            {FUNNEL_STAGES.map((s, i) => {
              const n = stageTotals[s] ?? 0
              const width = `${Math.round((n / mainFunnelMax) * 100)}%`
              const sources = stageBySource[s] ?? []
              const barColor = STAGE_BAR_COLOR[s] ?? "bg-primary/60"
              // Conversion to NEXT stage — render as inline chip to the right.
              const next = FUNNEL_STAGES[i + 1]
              const nextN = next ? stageTotals[next] ?? 0 : 0
              const pct =
                next && n > 0 ? Math.round((nextN / n) * 100) : null
              return (
                <div key={s} className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <div className="w-32 shrink-0 text-sm font-medium text-foreground">
                      {STAGE_LABEL[s]}
                    </div>
                    <div className="flex-1 h-7 rounded bg-muted relative overflow-hidden">
                      <div
                        className={`absolute inset-y-0 left-0 ${barColor}`}
                        style={{ width }}
                      />
                    </div>
                    <div className="w-14 text-right text-sm font-semibold tabular-nums">
                      {formatNumber(n)}
                    </div>
                    <div className="w-14 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                      {pct !== null ? `→ ${pct}%` : ""}
                    </div>
                  </div>
                  {sources.length > 0 && (
                    <div className="ml-32 pl-3 flex flex-wrap gap-1.5">
                      {sources.slice(0, 6).map((src) => (
                        <StatusBadge
                          key={src.source}
                          tone={sourceTone(src.source)}
                          className="normal-case"
                        >
                          <span>{src.source}</span>
                          <span className="tabular-nums font-semibold">
                            {formatNumber(src.n)}
                          </span>
                        </StatusBadge>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {(assessmentCount > 0 || rejectedCount > 0) && (
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t">
                <span className="text-xs font-medium text-muted-foreground">
                  Side pools
                </span>
                {assessmentCount > 0 && (
                  <StatusBadge tone="blue" className="normal-case">
                    <Sparkles className="size-3" />
                    <span>Assessment</span>
                    <span className="tabular-nums font-semibold">
                      {formatNumber(assessmentCount)}
                    </span>
                  </StatusBadge>
                )}
                {rejectedCount > 0 && (
                  <StatusBadge tone="red" className="normal-case">
                    <span>Rejected</span>
                    <span className="tabular-nums font-semibold">
                      {formatNumber(rejectedCount)}
                    </span>
                  </StatusBadge>
                )}
              </div>
            )}
          </div>
        )}
      </DetailCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Today's interviews */}
          <DetailCard
            title="Today's interviews"
            actions={
              <Link
                href="/hq/hiring/interviews"
                className="text-xs font-medium text-primary hover:underline"
              >
                View all
              </Link>
            }
          >
            <InterviewList
              errored={todayErrored}
              rows={todayInterviews}
              candidates={interviewCandidates}
              roleById={roleById}
              emptyCopy="No interviews are scheduled for today."
            />
          </DetailCard>

          {/* Tomorrow's interviews */}
          <DetailCard title="Tomorrow's interviews">
            <InterviewList
              errored={tomorrowErrored}
              rows={tomorrowInterviews}
              candidates={interviewCandidates}
              roleById={roleById}
              emptyCopy="Nothing on the calendar for tomorrow yet."
            />
          </DetailCard>

          {/* Source performance */}
          <DetailCard title="Source performance (last 30 days)">
            {sourceErrored ? (
              <EmptyState
                icon={AlertTriangle}
                title="Couldn't load source performance"
                description="Try refreshing. If it persists, the underlying view may be down."
              />
            ) : sourcePerf.length === 0 ? (
              <EmptyState
                icon={TrendingUp}
                title="No activity yet"
                description="Source conversion will populate once calls start logging."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-medium text-muted-foreground border-b">
                      <th className="py-2 pr-3 font-medium">Source</th>
                      <th className="py-2 px-3 font-medium text-right">Applied</th>
                      <th className="py-2 px-3 font-medium text-right">Connected</th>
                      <th className="py-2 px-3 font-medium text-right">Interested</th>
                      <th className="py-2 px-3 font-medium text-right">Interview</th>
                      <th className="py-2 px-3 font-medium text-right">Hired</th>
                      <th className="py-2 pl-3 font-medium text-right">Conv %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...sourcePerf]
                      .sort((a, b) => Number(b.applied ?? 0) - Number(a.applied ?? 0))
                      .map((row) => {
                        const applied = Number(row.applied ?? 0)
                        const interested = Number(row.interested ?? 0)
                        const conv =
                          applied > 0
                            ? ((interested / applied) * 100).toFixed(1)
                            : "0.0"
                        return (
                          <tr
                            key={row.source ?? "—"}
                            className="border-b last:border-0"
                          >
                            <td className="py-2 pr-3 font-medium text-foreground">
                              {row.source ?? "—"}
                            </td>
                            <td className="py-2 px-3 text-right tabular-nums">
                              {formatNumber(applied)}
                            </td>
                            <td className="py-2 px-3 text-right tabular-nums">
                              {formatNumber(Number(row.connected ?? 0))}
                            </td>
                            <td className="py-2 px-3 text-right tabular-nums">
                              {formatNumber(interested)}
                            </td>
                            <td className="py-2 px-3 text-right tabular-nums">
                              {formatNumber(Number(row.interview_scheduled ?? 0))}
                            </td>
                            <td className="py-2 px-3 text-right tabular-nums">
                              {formatNumber(Number(row.hired ?? 0))}
                            </td>
                            <td className="py-2 pl-3 text-right tabular-nums text-muted-foreground">
                              {conv}%
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

        <div className="space-y-5">
          {/* Daily activity */}
          <DetailCard title="Daily activity (last 7 days)">
            {dailyErrored ? (
              <EmptyState
                icon={AlertTriangle}
                title="Daily report unavailable"
                description="Couldn't load recruiter reports."
              />
            ) : daily.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No reports yet"
                description="Daily reports will appear as the recruiter logs activity."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-medium text-muted-foreground border-b">
                      <th className="py-2 pr-2 font-medium">Date</th>
                      <th className="py-2 px-2 font-medium text-right">Calls</th>
                      <th className="py-2 px-2 font-medium text-right">Conn.</th>
                      <th className="py-2 px-2 font-medium text-right">Intv.</th>
                      <th className="py-2 pl-2 font-medium text-right">Sel.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daily.map((d) => (
                      <tr
                        key={d.report_date ?? Math.random()}
                        className="border-b last:border-0"
                      >
                        <td className="py-2 pr-2 text-foreground">
                          {formatDate(d.report_date)}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums">
                          {formatNumber(d.total_calls ?? 0)}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums">
                          {formatNumber(d.connected_calls ?? 0)}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums">
                          {formatNumber(d.interviews_scheduled ?? 0)}
                        </td>
                        <td className="py-2 pl-2 text-right tabular-nums">
                          {formatNumber(d.selected ?? 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DetailCard>

          {/* Hiring blockers */}
          <DetailCard
            title={
              issues.length > 0
                ? `Hiring blockers (${issues.length})`
                : "Hiring blockers"
            }
            actions={
              issues.length > 0 ? (
                <AlertTriangle
                  className="h-4 w-4 text-amber-600"
                  aria-hidden
                />
              ) : undefined
            }
          >
            {issuesErrored ? (
              <EmptyState
                icon={AlertTriangle}
                title="Blockers unavailable"
                description="Couldn't fetch open issues."
              />
            ) : issues.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="No open blockers"
                description="Nothing is flagged — keep the momentum."
              />
            ) : (
              <ul className="space-y-2">
                {issues.map((i) => (
                  <li
                    key={i.id}
                    className="flex items-start justify-between gap-3 py-1"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="text-sm font-medium text-foreground leading-snug">
                        {i.title ?? "Untitled issue"}
                      </div>
                      {i.location && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3" />
                          <span>{i.location}</span>
                        </div>
                      )}
                    </div>
                    <StatusBadge tone={toneForStatus(i.status)}>
                      {i.status ?? "open"}
                    </StatusBadge>
                  </li>
                ))}
              </ul>
            )}
          </DetailCard>

          {/* Recent hires */}
          <DetailCard title="Recent hires">
            {hiresErrored ? (
              <EmptyState
                icon={AlertTriangle}
                title="Hires unavailable"
                description="Couldn't fetch recent hires."
              />
            ) : recentHires.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No hires yet"
                description="Closed hires will land here."
              />
            ) : (
              <ul className="space-y-3">
                {recentHires.map((c) => {
                  const role =
                    (c.role_id && roleById.get(c.role_id)) ||
                    c.applied_for ||
                    "—"
                  return (
                    <li key={c.id} className="flex items-center gap-3">
                      <span
                        className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold ${avatarTone(c.name)}`}
                      >
                        {formatInitials(c.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-foreground truncate">
                          {c.name ?? "Unnamed"}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {role}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                        {relativeTime(c.updated_at)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </DetailCard>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Shared sub-component: interview list                               */
/* ------------------------------------------------------------------ */

function InterviewList({
  errored,
  rows,
  candidates,
  roleById,
  emptyCopy,
}: {
  errored: boolean
  rows: InterviewRow[]
  candidates: Record<string, Candidate>
  roleById: Map<string, string>
  emptyCopy: string
}) {
  if (errored) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Interviews unavailable"
        description="Couldn't load interviews right now."
      />
    )
  }
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="Clear calendar"
        description={emptyCopy}
      />
    )
  }
  return (
    <ul className="divide-y">
      {rows.map((r) => {
        const cand = r.candidate_id ? candidates[r.candidate_id] : undefined
        const name = cand?.name ?? "Candidate"
        const role =
          (r.role_id && roleById.get(r.role_id)) ||
          cand?.applied_for ||
          "—"
        return (
          <li key={r.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
            <span
              className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold ${avatarTone(name)}`}
            >
              {formatInitials(name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-foreground truncate">{name}</div>
              <div className="text-xs text-muted-foreground truncate">{role}</div>
            </div>
            <div className="text-right shrink-0 space-y-0.5">
              <div className="text-sm font-semibold tabular-nums">
                {formatTimeShort(r.scheduled_at)}
              </div>
              {r.interviewer && (
                <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                  <Phone className="size-3" />
                  <span>{r.interviewer}</span>
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
