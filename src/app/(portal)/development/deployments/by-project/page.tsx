import Link from "next/link"
import { GitBranch, Clock, Rocket } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { listProjects, type Project } from "@/lib/projects"
import { PageHeader } from "@/components/shared/page-header"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { ventureMeta } from "@/components/development/dev-primitives"
import { relativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "By project — Deployments | Suprans",
  description: "Deployment events grouped by the project they ship to.",
}

type DeployEvent = {
  id: string
  project_id: string | null
  project_slug: string | null
  commit_sha: string | null
  commit_message: string | null
  branch: string | null
  status: string
  deployed_at: string | null
  url: string | null
}

type Group = {
  key: string
  project: Project | null
  projectName: string
  projectSlug: string | null
  mostRecent: string | null
  events: DeployEvent[]
}

export default async function DeploymentsByProjectPage() {
  const [{ data: rawEvents }, projects] = await Promise.all([
    supabase
      .from("deployment_events")
      .select(
        "id, vercel_deployment_id, project_id, project_slug, commit_sha, commit_message, branch, author_name, author_email, status, deployed_at, url",
      )
      .order("deployed_at", { ascending: false, nullsFirst: false })
      .limit(500),
    listProjects(),
  ])

  const projectById = new Map<string, Project>(projects.map((p) => [p.id, p]))
  const projectBySlug = new Map<string, Project>(projects.map((p) => [p.slug, p]))

  const groups = new Map<string, Group>()
  for (const row of rawEvents ?? []) {
    const projectId = (row.project_id as string | null) ?? null
    const projectSlug = (row.project_slug as string | null) ?? null
    const project =
      (projectId && projectById.get(projectId)) ||
      (projectSlug && projectBySlug.get(projectSlug)) ||
      null
    const key = projectSlug ?? projectId ?? "unknown"
    const event: DeployEvent = {
      id: row.id as string,
      project_id: projectId,
      project_slug: projectSlug,
      commit_sha: (row.commit_sha as string | null) ?? null,
      commit_message: (row.commit_message as string | null) ?? null,
      branch: (row.branch as string | null) ?? null,
      status: row.status as string,
      deployed_at: (row.deployed_at as string | null) ?? null,
      url: (row.url as string | null) ?? null,
    }
    const current = groups.get(key)
    if (current) {
      current.events.push(event)
      if (
        event.deployed_at &&
        (!current.mostRecent || event.deployed_at > current.mostRecent)
      ) {
        current.mostRecent = event.deployed_at
      }
    } else {
      groups.set(key, {
        key,
        project,
        projectName: project?.name ?? projectSlug ?? "Unknown project",
        projectSlug,
        mostRecent: event.deployed_at,
        events: [event],
      })
    }
  }

  const sorted = Array.from(groups.values())
    .filter((g) => g.events.length > 0)
    .sort((a, b) => {
      if (!a.mostRecent && !b.mostRecent) return 0
      if (!a.mostRecent) return 1
      if (!b.mostRecent) return -1
      return b.mostRecent.localeCompare(a.mostRecent)
    })

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Deployments by project"
        subtitle={`${sorted.length} ${sorted.length === 1 ? "project" : "projects"} with recent deploys — the 10 most recent events per project.`}
      />

      {sorted.length === 0 ? (
        <EmptyState
          icon={Rocket}
          title="No deployments yet"
          description="Connect the Vercel webhook to populate this feed."
        />
      ) : (
        <div className="space-y-5">
          {sorted.map((group) => {
            const v = ventureMeta(group.project?.venture ?? null)
            return (
              <DetailCard
                key={group.key}
                title={group.projectName}
                actions={
                  <div className="flex items-center gap-2">
                    <StatusBadge tone="slate">
                      {group.events.length} {group.events.length === 1 ? "deploy" : "deploys"}
                    </StatusBadge>
                    {group.projectSlug && (
                      <Link
                        href={`/development/projects/${group.projectSlug}`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Open project →
                      </Link>
                    )}
                  </div>
                }
              >
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left text-xs font-medium text-muted-foreground pb-2">Commit</th>
                      <th className="text-left text-xs font-medium text-muted-foreground pb-2">Status</th>
                      <th className="text-left text-xs font-medium text-muted-foreground pb-2">Branch</th>
                      <th className="text-right text-xs font-medium text-muted-foreground pb-2">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.events.slice(0, 10).map((e) => (
                      <tr key={e.id} className="border-b last:border-b-0">
                        <td className="py-2.5 max-w-lg">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={cn(
                                "size-5 rounded flex items-center justify-center text-white text-xs font-semibold shrink-0",
                                v.gradientClass,
                              )}
                            >
                              {v.short}
                            </span>
                            <span className="text-sm truncate">{e.commit_message ?? "—"}</span>
                          </div>
                        </td>
                        <td className="py-2.5">
                          <StatusBadge tone={toneForStatus(e.status)}>{e.status}</StatusBadge>
                        </td>
                        <td className="py-2.5">
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <GitBranch className="size-3" />
                            {e.branch ?? "main"}
                          </span>
                        </td>
                        <td className="py-2.5 text-right text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 justify-end">
                            <Clock className="size-3" />
                            {relativeTime(e.deployed_at)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DetailCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
