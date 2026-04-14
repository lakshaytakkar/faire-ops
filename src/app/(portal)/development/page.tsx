import Link from "next/link"
import {
  ArrowRight,
  FolderKanban,
  Globe,
  Hammer,
  Sparkles,
  Rocket,
  GitBranch,
  Clock,
  ListTodo as SprintIcon,
} from "lucide-react"
import { listProjects, type Project } from "@/lib/projects"
import { supabase } from "@/lib/supabase"
import { HealthDot, ventureMeta } from "@/components/development/dev-primitives"
import { relativeTime } from "@/lib/format"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Development — Suprans",
  description: "Engineering dashboard for every property shipping across the Suprans ecosystem.",
}

type VentureRoll = { live: number; building: number; planning: number; total: number }

export default async function DevelopmentOverviewPage() {
  const projects: Project[] = await listProjects()

  const [{ data: recentDeploysRaw }, { data: upcomingRaw }] = await Promise.all([
    supabase
      .from("deployment_events")
      .select("id, project_id, project_slug, commit_message, commit_sha, branch, author_name, status, deployed_at, url")
      .order("deployed_at", { ascending: false, nullsFirst: false })
      .limit(8),
    supabase
      .from("roadmap_items")
      .select("id, quarter, venture, title, description, status, target_date, linked_project_id")
      .in("status", ["planned", "in_progress", "at_risk"])
      .order("target_date", { ascending: true, nullsFirst: false })
      .limit(6),
  ])

  const projectById = new Map(projects.map((p) => [p.id, p]))

  const live = projects.filter((p) => p.status === "live").length
  const building = projects.filter((p) => p.status === "building").length
  const planning = projects.filter((p) => p.status === "planning").length

  const now = Date.now()
  const weekMs = 7 * 24 * 60 * 60 * 1000
  const deploys7d = (recentDeploysRaw ?? []).filter(
    (d) => d.deployed_at && now - new Date(d.deployed_at as string).getTime() < weekMs,
  ).length

  const byVenture = new Map<string, VentureRoll>()
  for (const p of projects) {
    const key = p.venture ?? "unassigned"
    const cur = byVenture.get(key) ?? { live: 0, building: 0, planning: 0, total: 0 }
    cur.total++
    if (p.status === "live") cur.live++
    else if (p.status === "building") cur.building++
    else if (p.status === "planning") cur.planning++
    byVenture.set(key, cur)
  }
  const ventureRows = Array.from(byVenture.entries())
    .filter(([v]) => v !== "unassigned")
    .sort((a, b) => b[1].total - a[1].total)

  const activeSprint = projects
    .filter((p) => p.status === "building")
    .slice()
    .sort((a, b) => (b.last_deploy_at ?? "").localeCompare(a.last_deploy_at ?? ""))
    .slice(0, 6)

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Development"
        subtitle={`${projects.length} tracked projects across all ventures — every landing, portal, and app Suprans ships.`}
      />

      <KPIGrid>
        <MetricCard label="Active projects" value={projects.length} icon={FolderKanban} iconTone="slate" />
        <MetricCard label="Building now" value={building} icon={Hammer} iconTone="amber" hint={`${live} live · ${planning} planning`} />
        <MetricCard label="Deploys (7d)" value={deploys7d} icon={Rocket} iconTone="blue" href="/development/deployments" />
        <MetricCard
          label="Roadmap in-flight"
          value={(upcomingRaw ?? []).length}
          icon={Sparkles}
          iconTone="violet"
          href="/development/roadmap"
          hint="planned + in-progress"
        />
      </KPIGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <DetailCard
            title="Venture rollup"
            actions={
              <Link href="/development/projects" className="text-xs font-medium text-primary hover:underline">
                All projects →
              </Link>
            }
          >
            <div className="space-y-1">
              {ventureRows.map(([venture, counts]) => {
                const v = ventureMeta(venture)
                return (
                  <div key={venture} className="flex items-center justify-between gap-3 py-2 border-b last:border-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={cn(
                          "size-9 rounded-md flex items-center justify-center shrink-0 text-white font-semibold text-sm",
                          v.gradientClass,
                        )}
                        aria-hidden
                      >
                        {v.short}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{v.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {counts.total} {counts.total === 1 ? "project" : "projects"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {counts.live > 0 && <StatusBadge tone="emerald">{counts.live} live</StatusBadge>}
                      {counts.building > 0 && <StatusBadge tone="amber">{counts.building} building</StatusBadge>}
                      {counts.planning > 0 && <StatusBadge tone="blue">{counts.planning} planning</StatusBadge>}
                    </div>
                  </div>
                )
              })}
            </div>
          </DetailCard>
        </div>

        <DetailCard
          title="Active sprint"
          actions={
            <Link href="/development/projects" className="text-xs font-medium text-primary hover:underline">
              All →
            </Link>
          }
        >
          {activeSprint.length === 0 ? (
            <EmptyState icon={SprintIcon} title="Nothing in build" description="No projects are currently in status=building." />
          ) : (
            <div className="space-y-3">
              {activeSprint.map((p) => {
                const v = ventureMeta(p.venture)
                return (
                  <Link key={p.id} href={`/development/projects/${p.slug}`} className="flex items-start gap-2.5 group">
                    <span
                      className={cn(
                        "size-8 rounded-md flex items-center justify-center shrink-0 text-white text-xs font-semibold",
                        v.gradientClass,
                      )}
                    >
                      {v.short}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate group-hover:text-primary">{p.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {p.owner_name ?? "Unassigned"} · {p.last_deploy_at ? relativeTime(p.last_deploy_at) : "no deploy yet"}
                      </p>
                    </div>
                    <HealthDot health={p.health} />
                  </Link>
                )
              })}
            </div>
          )}
        </DetailCard>
      </div>

      <DetailCard
        title="Recent deployments"
        actions={
          <Link href="/development/deployments" className="text-xs font-medium text-primary hover:underline">
            Full feed →
          </Link>
        }
      >
        {(!recentDeploysRaw || recentDeploysRaw.length === 0) ? (
          <EmptyState icon={Rocket} title="No deploy events yet" description="Connect the Vercel webhook to populate this feed." />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left text-xs font-medium text-muted-foreground pb-2">Project</th>
                <th className="text-left text-xs font-medium text-muted-foreground pb-2">Commit</th>
                <th className="text-left text-xs font-medium text-muted-foreground pb-2">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground pb-2">Branch</th>
                <th className="text-right text-xs font-medium text-muted-foreground pb-2">When</th>
              </tr>
            </thead>
            <tbody>
              {recentDeploysRaw.map((d) => {
                const project = d.project_id ? projectById.get(d.project_id as string) : undefined
                const name = project?.name ?? (d.project_slug as string | null) ?? "—"
                const venture = project?.venture ?? null
                const v = ventureMeta(venture)
                return (
                  <tr key={d.id as string} className="border-b last:border-b-0">
                    <td className="py-2.5">
                      {d.project_slug ? (
                        <Link
                          href={`/development/projects/${d.project_slug}`}
                          className="inline-flex items-center gap-2 hover:text-primary"
                        >
                          <span className={cn("size-6 rounded flex items-center justify-center text-white text-[10px] font-semibold", v.gradientClass)}>
                            {v.short}
                          </span>
                          <span className="text-sm font-medium">{name}</span>
                        </Link>
                      ) : (
                        <span className="text-sm">{name}</span>
                      )}
                    </td>
                    <td className="py-2.5 max-w-md">
                      <div className="text-sm truncate">{(d.commit_message as string | null) ?? "—"}</div>
                    </td>
                    <td className="py-2.5">
                      <StatusBadge tone={toneForStatus(d.status as string)}>{d.status as string}</StatusBadge>
                    </td>
                    <td className="py-2.5">
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <GitBranch className="size-3" />
                        {(d.branch as string | null) ?? "main"}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-xs text-muted-foreground whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 justify-end">
                        <Clock className="size-3" />
                        {relativeTime(d.deployed_at as string | null)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </DetailCard>

      <DetailCard
        title="Upcoming roadmap"
        actions={
          <Link href="/development/roadmap" className="text-xs font-medium text-primary hover:underline">
            Full roadmap →
          </Link>
        }
      >
        {(!upcomingRaw || upcomingRaw.length === 0) ? (
          <EmptyState icon={Sparkles} title="No planned items" description="Add roadmap items via public.roadmap_items." />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {upcomingRaw.map((r) => (
              <div key={r.id as string} className="rounded-md border bg-background p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">{r.quarter as string}</span>
                  <StatusBadge tone={toneForStatus(r.status as string)}>
                    {(r.status as string).replace("_", " ")}
                  </StatusBadge>
                </div>
                <h4 className="text-sm font-semibold leading-snug">{r.title as string}</h4>
                {r.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{r.description as string}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </DetailCard>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <DeepLink href="/development/projects" icon={FolderKanban} title="All projects" body={`${projects.length} tracked properties across ventures.`} />
        <DeepLink href="/development/deployments" icon={Rocket} title="Deployments feed" body="Real Vercel webhook + backfill stream." />
        <DeepLink href="/development/tasks" icon={Globe} title="Tasks" body="Development-space work items." />
      </div>
    </div>
  )
}

function DeepLink({
  href,
  icon: Icon,
  title,
  body,
}: {
  href: string
  icon: typeof FolderKanban
  title: string
  body: string
}) {
  return (
    <Link href={href} className="group block">
      <div className="rounded-lg border border-border/80 bg-card shadow-sm p-4 transition-shadow hover:shadow-md h-full">
        <div className="flex items-center justify-between mb-3">
          <span className="size-9 rounded-md bg-primary/10 flex items-center justify-center">
            <Icon className="size-4 text-primary" />
          </span>
          <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>
        <h3 className="text-sm font-semibold mb-1 group-hover:text-primary">{title}</h3>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
    </Link>
  )
}

