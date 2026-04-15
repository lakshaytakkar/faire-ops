import Link from "next/link"
import {
  Calendar,
  Phone,
  PhoneCall,
  Video,
  UserCheck,
  Plus,
  AlertTriangle,
} from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { FilterBar } from "@/components/shared/filter-bar"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { supabaseHq } from "@/lib/supabase"
import { formatDate, formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"
export const metadata = { title: "Daily Reports — Hiring" }

/**
 * Daily Reports — ATS spec §2.9 adjacent.
 * Server component. Reads hq.hiring_daily_reports and renders the
 * past log + a 7-day trend bar strip.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DailyReport {
  id: string
  report_date: string | null
  recruiter: string | null
  total_calls: number | null
  connected_calls: number | null
  interviews_scheduled: number | null
  interviews_tomorrow: number | null
  interviews_next_days: number | null
  interviews_taken: number | null
  selected: number | null
  onboarding_done: number | null
  job_postings: number | null
  other_tasks: string | null
  remarks: string | null
}

type RangeId = "this_week" | "last_7" | "this_month" | "all"

const RANGE_LABEL: Record<RangeId, string> = {
  this_week: "This week",
  last_7: "Last 7 days",
  this_month: "This month",
  all: "All",
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function parseRange(raw: string | undefined): RangeId {
  if (raw === "this_week" || raw === "last_7" || raw === "this_month" || raw === "all") {
    return raw
  }
  return "this_week"
}

function rangeStartDate(range: RangeId): string | null {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  if (range === "last_7") {
    const d = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
    return d.toISOString().slice(0, 10)
  }
  if (range === "this_week") {
    // start of week (Mon). getDay: 0=Sun,1=Mon,...,6=Sat
    const day = now.getDay()
    const diff = day === 0 ? 6 : day - 1
    const d = new Date(now.getTime() - diff * 24 * 60 * 60 * 1000)
    return d.toISOString().slice(0, 10)
  }
  if (range === "this_month") {
    const d = new Date(now.getFullYear(), now.getMonth(), 1)
    return d.toISOString().slice(0, 10)
  }
  return null
}

function isWeekend(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const dow = d.getDay()
  return dow === 0 || dow === 6
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default async function HqHiringDailyPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const sp = await searchParams
  const range = parseRange(sp.range)
  const startIso = rangeStartDate(range)

  // Main list for the selected range.
  const listQuery = supabaseHq
    .from("hiring_daily_reports")
    .select(
      "id, report_date, recruiter, total_calls, connected_calls, interviews_scheduled, interviews_tomorrow, interviews_next_days, interviews_taken, selected, onboarding_done, job_postings, other_tasks, remarks",
    )
    .order("report_date", { ascending: false })

  if (startIso) {
    listQuery.gte("report_date", startIso)
  }

  // KPI window is always last 7 calendar days regardless of tab,
  // per spec ("4 cards from last 7 days").
  const sevenStart = new Date()
  sevenStart.setHours(0, 0, 0, 0)
  sevenStart.setDate(sevenStart.getDate() - 6)
  const sevenIso = sevenStart.toISOString().slice(0, 10)

  const kpiQuery = supabaseHq
    .from("hiring_daily_reports")
    .select(
      "report_date, total_calls, connected_calls, interviews_taken, selected",
    )
    .gte("report_date", sevenIso)
    .order("report_date", { ascending: true })

  const [listRes, kpiRes] = await Promise.all([listQuery, kpiQuery])

  const errored = !!listRes.error
  const rows = (listRes.data ?? []) as DailyReport[]
  const kpiRows = (kpiRes.data ?? []) as Pick<
    DailyReport,
    "report_date" | "total_calls" | "connected_calls" | "interviews_taken" | "selected"
  >[]

  /* --------------------------- KPIs --------------------------- */
  const kpiSum = kpiRows.reduce(
    (acc, r) => {
      acc.calls += Number(r.total_calls ?? 0)
      acc.connected += Number(r.connected_calls ?? 0)
      acc.intv += Number(r.interviews_taken ?? 0)
      acc.sel += Number(r.selected ?? 0)
      return acc
    },
    { calls: 0, connected: 0, intv: 0, sel: 0 },
  )
  const days = Math.max(1, kpiRows.length)
  const avgCalls = kpiSum.calls / days
  const avgConnected = kpiSum.connected / days

  /* --------------------------- trend (last 7d) --------------------------- */
  // Build one entry per day in the last 7 calendar days; fill missing days with 0.
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const trend: { date: string; label: string; total: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
    const iso = d.toISOString().slice(0, 10)
    const hit = kpiRows.find((r) => r.report_date === iso)
    trend.push({
      date: iso,
      label: d.toLocaleDateString("en-IN", { weekday: "short" }),
      total: Number(hit?.total_calls ?? 0),
    })
  }
  const trendMax = Math.max(1, ...trend.map((t) => t.total))

  const tabs = (Object.keys(RANGE_LABEL) as RangeId[]).map((id) => ({
    id,
    label: RANGE_LABEL[id],
  }))

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Daily Reports"
        subtitle="Recruiter daily activity log — calls, connects, interviews, and selections."
        actions={
          <Button size="sm" render={<Link href="/hq/hiring/daily" />}>
            <Plus className="size-3.5" />
            Today&apos;s report
          </Button>
        }
      />

      <KPIGrid>
        <MetricCard
          label="Avg calls / day"
          value={avgCalls.toFixed(1)}
          icon={Phone}
          iconTone="blue"
          hint="last 7 days"
        />
        <MetricCard
          label="Avg connected / day"
          value={avgConnected.toFixed(1)}
          icon={PhoneCall}
          iconTone="violet"
          hint="last 7 days"
        />
        <MetricCard
          label="Interviews this week"
          value={formatNumber(kpiSum.intv)}
          icon={Video}
          iconTone="amber"
          hint="last 7 days"
        />
        <MetricCard
          label="Selected this week"
          value={formatNumber(kpiSum.sel)}
          icon={UserCheck}
          iconTone="emerald"
          hint="last 7 days"
        />
      </KPIGrid>

      <ServerFilterBar tabs={tabs} activeTab={range} />

      <DetailCard title="Daily activity">
        {errored ? (
          <EmptyState
            icon={AlertTriangle}
            title="Daily reports unavailable"
            description="Couldn't load recruiter reports right now."
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No reports in this range"
            description="Try widening the range, or capture today's report."
          />
        ) : (
          <div className="overflow-x-auto -mx-5 -my-5">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border/80">
                <tr className="text-left">
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    Date
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Recruiter
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                    Total calls
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                    Connected
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right whitespace-nowrap">
                    Intv. scheduled
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right whitespace-nowrap">
                    Intv. taken
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                    Selected
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                    Onboarded
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right whitespace-nowrap">
                    Job postings
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Other tasks
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {rows.map((r) => {
                  const weekend = isWeekend(r.report_date)
                  return (
                    <tr
                      key={r.id}
                      className={cn(
                        "hover:bg-muted/20 transition-colors align-middle",
                        weekend && "text-muted-foreground",
                      )}
                    >
                      <td
                        className={cn(
                          "px-5 py-3 whitespace-nowrap tabular-nums",
                          weekend ? "text-muted-foreground" : "text-foreground",
                        )}
                      >
                        {formatDate(r.report_date)}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        {r.recruiter ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums font-medium">
                        {formatNumber(r.total_calls ?? 0)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {formatNumber(r.connected_calls ?? 0)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {formatNumber(r.interviews_scheduled ?? 0)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {formatNumber(r.interviews_taken ?? 0)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {formatNumber(r.selected ?? 0)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {formatNumber(r.onboarding_done ?? 0)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {formatNumber(r.job_postings ?? 0)}
                      </td>
                      <td
                        className="px-5 py-3 max-w-[20rem]"
                        title={r.other_tasks ?? undefined}
                      >
                        <span className="line-clamp-2 text-sm">
                          {r.other_tasks ?? "—"}
                        </span>
                      </td>
                      <td
                        className="px-5 py-3 max-w-[16rem]"
                        title={r.remarks ?? undefined}
                      >
                        <span className="line-clamp-2 text-sm">
                          {r.remarks ?? "—"}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </DetailCard>

      <DetailCard title="Trend (last 7 days)">
        {trend.every((t) => t.total === 0) ? (
          <EmptyState
            icon={Calendar}
            title="No activity yet"
            description="Trend will populate once daily reports are logged."
          />
        ) : (
          <ul className="space-y-2">
            {trend.map((t) => {
              const width = `${Math.round((t.total / trendMax) * 100)}%`
              return (
                <li key={t.date} className="flex items-center gap-3">
                  <div className="w-24 shrink-0 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{t.label}</span>
                    <span className="ml-1.5 tabular-nums">
                      {formatDate(t.date)}
                    </span>
                  </div>
                  <div className="flex-1 h-5 rounded bg-muted relative overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-blue-500/60"
                      style={{ width }}
                    />
                  </div>
                  <div className="w-14 text-right text-sm font-semibold tabular-nums">
                    {formatNumber(t.total)}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </DetailCard>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  ServerFilterBar — a server-rendered FilterBar lookalike             */
/*                                                                       */
/*  The shared FilterBar is a client component with onChange handlers.   */
/*  Since we're keeping this page a server component, we render chip-    */
/*  style tabs as plain <Link>s that update ?range=. Same visual grammar */
/*  as FilterBar's chip-tabs.                                            */
/* ------------------------------------------------------------------ */

function ServerFilterBar({
  tabs,
  activeTab,
}: {
  tabs: { id: RangeId; label: string }[]
  activeTab: RangeId
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="flex items-center gap-1 flex-wrap">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <Link
              key={tab.id}
              href={`/hq/hiring/daily?range=${tab.id}`}
              className={cn(
                "h-7 px-2.5 text-xs font-medium rounded-md transition-colors inline-flex items-center",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
