import Link from "next/link"
import { AlertTriangle, Clock, ExternalLink, GitBranch, FolderKanban } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { listProjects, type Project } from "@/lib/projects"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { ventureMeta } from "@/components/development/dev-primitives"
import { relativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Errors — Deployments | Suprans",
  description: "Failed and canceled deployment events across every project.",
}

export default async function DeploymentErrorsPage() {
  const [{ data: rawEvents }, projects] = await Promise.all([
    supabase
      .from("deployment_events")
      .select(
        "id, vercel_deployment_id, project_id, project_slug, commit_sha, commit_message, branch, author_name, author_email, status, deployed_at, url",
      )
      .in("status", ["error", "canceled"])
      .order("deployed_at", { ascending: false, nullsFirst: false })
      .limit(500),
    listProjects(),
  ])

  const projectById = new Map<string, Project>(projects.map((p) => [p.id, p]))
  const projectBySlug = new Map<string, Project>(projects.map((p) => [p.slug, p]))

  const rows = (rawEvents ?? []).map((e) => {
    const projectId = (e.project_id as string | null) ?? null
    const projectSlug = (e.project_slug as string | null) ?? null
    const project =
      (projectId && projectById.get(projectId)) ||
      (projectSlug && projectBySlug.get(projectSlug)) ||
      null
    return {
      id: e.id as string,
      project_id: projectId,
      project_slug: projectSlug,
      project_name: project?.name ?? projectSlug ?? null,
      venture: project?.venture ?? null,
      commit_sha: (e.commit_sha as string | null) ?? null,
      commit_message: (e.commit_message as string | null) ?? null,
      branch: (e.branch as string | null) ?? null,
      status: e.status as string,
      deployed_at: (e.deployed_at as string | null) ?? null,
      url: (e.url as string | null) ?? null,
    }
  })

  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  const errors24h = rows.filter(
    (r) => r.deployed_at && now - new Date(r.deployed_at).getTime() < day,
  ).length
  const errors7d = rows.filter(
    (r) => r.deployed_at && now - new Date(r.deployed_at).getTime() < 7 * day,
  ).length
  const failedProjects = new Set(
    rows.map((r) => r.project_slug ?? r.project_id).filter(Boolean) as string[],
  ).size

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Deploy errors"
        subtitle="Failed and canceled deployment events — the projects and commits that didn't make it to prod."
      />

      <KPIGrid>
        <MetricCard
          label="Total errors"
          value={rows.length}
          icon={AlertTriangle}
          iconTone={rows.length > 0 ? "red" : "emerald"}
          hint="all-time"
        />
        <MetricCard
          label="Errors (7d)"
          value={errors7d}
          icon={Clock}
          iconTone={errors7d > 0 ? "red" : "emerald"}
          hint="last 7 days"
        />
        <MetricCard
          label="Errors (24h)"
          value={errors24h}
          icon={Clock}
          iconTone={errors24h > 0 ? "red" : "emerald"}
          hint="last 24 hours"
        />
        <MetricCard
          label="Affected projects"
          value={failedProjects}
          icon={FolderKanban}
          iconTone="amber"
          hint="distinct projects"
        />
      </KPIGrid>

      <DetailCard title="Failed and canceled events">
        {rows.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="No deploy errors"
            description="Every recent deployment succeeded. Keep it that way."
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left text-xs font-medium text-muted-foreground pb-2">Project</th>
                <th className="text-left text-xs font-medium text-muted-foreground pb-2">Commit</th>
                <th className="text-left text-xs font-medium text-muted-foreground pb-2">Branch</th>
                <th className="text-left text-xs font-medium text-muted-foreground pb-2">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground pb-2">When</th>
                <th className="text-left text-xs font-medium text-muted-foreground pb-2">Logs</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const v = ventureMeta(r.venture)
                return (
                  <tr key={r.id} className="border-b last:border-b-0">
                    <td className="py-2.5">
                      {r.project_slug ? (
                        <Link
                          href={`/development/projects/${r.project_slug}`}
                          className="inline-flex items-center gap-2 hover:text-primary"
                        >
                          <span
                            className={cn(
                              "size-6 rounded flex items-center justify-center text-white text-xs font-semibold",
                              v.gradientClass,
                            )}
                          >
                            {v.short}
                          </span>
                          <span className="text-sm font-medium">{r.project_name ?? "—"}</span>
                        </Link>
                      ) : (
                        <span className="text-sm">{r.project_name ?? "—"}</span>
                      )}
                    </td>
                    <td className="py-2.5 max-w-md">
                      <div className="text-sm truncate">{r.commit_message ?? "—"}</div>
                    </td>
                    <td className="py-2.5">
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <GitBranch className="size-3" />
                        {r.branch ?? "main"}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <StatusBadge tone={toneForStatus(r.status)}>{r.status}</StatusBadge>
                    </td>
                    <td className="py-2.5 text-sm text-muted-foreground tabular-nums whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" />
                        {relativeTime(r.deployed_at)}
                      </span>
                    </td>
                    <td className="py-2.5">
                      {r.url ? (
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          Open <ExternalLink className="size-3.5" />
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </DetailCard>
    </div>
  )
}
