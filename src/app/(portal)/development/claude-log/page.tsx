import Link from "next/link"
import { Bot, CalendarDays, CalendarRange, CalendarClock, Layers } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge"
import { supabase } from "@/lib/supabase"
import { formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Claude work log — Development | Suprans" }

interface ClaudeLogRow {
  id: string
  task_id: string | null
  space_slug: string | null
  work_date: string | null
  kind: string | null
  title: string | null
  body: string | null
  files_changed: string[] | null
  commit_sha: string | null
  deploy_url: string | null
  minor: boolean | null
  created_at: string | null
}

type SearchParams = { showMinor?: string; space?: string }

const KIND_TONE: Record<string, StatusTone> = {
  page: "blue",
  table: "violet",
  deploy: "emerald",
  refactor: "amber",
  agent: "slate",
}

function truncate(text: string | null | undefined, n = 240): string {
  if (!text) return ""
  return text.length > n ? `${text.slice(0, n)}…` : text
}

function shortSha(sha: string | null): string {
  if (!sha) return "—"
  return sha.slice(0, 7)
}

function chipHref(params: URLSearchParams, key: string, value: string) {
  const p = new URLSearchParams(params)
  if (value === "all") p.delete(key)
  else p.set(key, value)
  const qs = p.toString()
  return qs ? `/development/claude-log?${qs}` : "/development/claude-log"
}

export default async function ClaudeLogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const showMinor = sp.showMinor === "1"
  const activeSpace = sp.space ?? "all"

  let query = supabase
    .from("claude_work_log")
    .select(
      "id, task_id, space_slug, work_date, kind, title, body, files_changed, commit_sha, deploy_url, minor, created_at",
    )
    .order("work_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false })

  if (!showMinor) query = query.eq("minor", false)

  const { data } = await query
  const allRows = (data ?? []) as ClaudeLogRow[]

  const rows =
    activeSpace === "all"
      ? allRows
      : allRows.filter((r) => r.space_slug === activeSpace)

  // KPI counts (always based on non-minor, independent of showMinor toggle to keep KPIs stable)
  const nonMinor = allRows.filter((r) => !r.minor)
  const today = new Date()
  const todayKey = today.toISOString().slice(0, 10)
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthKey = todayKey.slice(0, 7)

  const kpis = {
    today: nonMinor.filter((r) => (r.work_date ?? "") === todayKey).length,
    week: nonMinor.filter((r) => r.work_date && new Date(r.work_date) >= weekAgo).length,
    month: nonMinor.filter((r) => (r.work_date ?? "").startsWith(monthKey)).length,
    total: nonMinor.length,
  }

  // Space chip options — from the data
  const spaceSet = new Set<string>()
  for (const r of allRows) if (r.space_slug) spaceSet.add(r.space_slug)
  const spaceChips = ["all", ...Array.from(spaceSet).sort()]

  // Group by work_date
  const groups = new Map<string, ClaudeLogRow[]>()
  for (const r of rows) {
    const key = r.work_date ?? "unknown"
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(r)
  }
  const groupedDays = Array.from(groups.entries()).sort((a, b) => {
    if (a[0] === "unknown") return 1
    if (b[0] === "unknown") return -1
    return b[0].localeCompare(a[0])
  })

  const urlParams = new URLSearchParams()
  if (showMinor) urlParams.set("showMinor", "1")
  if (activeSpace !== "all") urlParams.set("space", activeSpace)

  const toggleMinorParams = new URLSearchParams(urlParams)
  if (showMinor) toggleMinorParams.delete("showMinor")
  else toggleMinorParams.set("showMinor", "1")
  const toggleMinorHref = toggleMinorParams.toString()
    ? `/development/claude-log?${toggleMinorParams.toString()}`
    : "/development/claude-log"

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Claude work log"
        subtitle="Major changes Claude has shipped. Minor edits are filtered by default."
        actions={
          <Link
            href={toggleMinorHref}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            {showMinor ? "Hide minor" : "Show minor"}
          </Link>
        }
      />

      <KPIGrid>
        <MetricCard label="Today" value={kpis.today} icon={CalendarDays} iconTone="blue" />
        <MetricCard label="This week" value={kpis.week} icon={CalendarRange} iconTone="emerald" />
        <MetricCard label="This month" value={kpis.month} icon={CalendarClock} iconTone="violet" />
        <MetricCard label="Total" value={kpis.total} icon={Layers} iconTone="slate" />
      </KPIGrid>

      <DetailCard title={`Entries (${rows.length})`}>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {spaceChips.map((s) => {
            const isActive = s === activeSpace
            return (
              <Link
                key={s}
                href={chipHref(urlParams, "space", s)}
                className={
                  isActive
                    ? "inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium"
                    : "inline-flex items-center gap-2 rounded-full bg-muted text-foreground px-3 py-1.5 text-sm font-medium hover:bg-muted/70"
                }
              >
                <span>{s === "all" ? "All spaces" : s}</span>
              </Link>
            )
          })}
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={Bot}
            title="No entries yet"
            description="Claude logs major ships here. Minor edits are hidden unless you flip ?showMinor=1."
          />
        ) : (
          <div className="space-y-6">
            {groupedDays.map(([day, dayRows]) => (
              <div key={day} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold tracking-tight text-foreground tabular-nums">
                    {day === "unknown" ? "Undated" : formatDate(day)}
                  </h3>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    ({dayRows.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {dayRows.map((r) => {
                    const kind = r.kind ?? "agent"
                    const filesCount = r.files_changed?.length ?? 0
                    return (
                      <div
                        key={r.id}
                        className="rounded-lg border border-border/80 bg-card p-4 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <StatusBadge tone={KIND_TONE[kind] ?? "slate"}>{kind}</StatusBadge>
                            {r.space_slug && (
                              <span className="text-sm text-muted-foreground">
                                {r.space_slug}
                              </span>
                            )}
                            {r.minor && (
                              <StatusBadge tone="slate">minor</StatusBadge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 shrink-0 text-sm text-muted-foreground">
                            {r.commit_sha && (
                              <span className="tabular-nums">{shortSha(r.commit_sha)}</span>
                            )}
                            {r.deploy_url && (
                              <a
                                href={r.deploy_url}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="text-blue-600 hover:underline"
                              >
                                Deploy
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="font-semibold text-foreground">
                          {r.title ?? "Untitled"}
                        </div>
                        {r.body && (
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {truncate(r.body, 320)}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="tabular-nums">
                            {filesCount} file{filesCount === 1 ? "" : "s"} changed
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </DetailCard>
    </div>
  )
}
