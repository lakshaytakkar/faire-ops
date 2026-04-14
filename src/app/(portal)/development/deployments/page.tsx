import { Rocket, CheckCircle2, AlertTriangle, Clock } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { listProjects, type Project } from "@/lib/projects"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
import { DeploymentsClient, type DeploymentRow } from "./deployments-client"

export const dynamic = "force-dynamic"

export const metadata = { title: "Deployments — Development | Suprans" }

export default async function DeploymentsPage() {
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

  const rows: DeploymentRow[] = (rawEvents ?? []).map((e) => {
    const project =
      (e.project_id && projectById.get(e.project_id as string)) ||
      (e.project_slug && projectBySlug.get(e.project_slug as string)) ||
      null
    return {
      id: e.id as string,
      vercel_deployment_id: e.vercel_deployment_id as string,
      project_id: (e.project_id as string | null) ?? null,
      project_slug: (e.project_slug as string | null) ?? null,
      project_name: project?.name ?? (e.project_slug as string | null) ?? null,
      venture: project?.venture ?? null,
      commit_sha: (e.commit_sha as string | null) ?? null,
      commit_message: (e.commit_message as string | null) ?? null,
      branch: (e.branch as string | null) ?? null,
      author_name: (e.author_name as string | null) ?? null,
      author_email: (e.author_email as string | null) ?? null,
      status: e.status as DeploymentRow["status"],
      deployed_at: (e.deployed_at as string | null) ?? null,
      url: (e.url as string | null) ?? null,
    }
  })

  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  const deploysToday = rows.filter(
    (r) => r.deployed_at && now - new Date(r.deployed_at).getTime() < day,
  ).length
  const deploys7d = rows.filter(
    (r) => r.deployed_at && now - new Date(r.deployed_at).getTime() < 7 * day,
  ).length
  const errors7d = rows.filter(
    (r) =>
      r.deployed_at &&
      now - new Date(r.deployed_at).getTime() < 7 * day &&
      r.status === "error",
  ).length
  const failedRate =
    deploys7d > 0 ? `${Math.round((errors7d / deploys7d) * 100)}%` : "—"
  const ventures = Array.from(
    new Set(rows.map((r) => r.venture).filter(Boolean)),
  ) as string[]

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Deployments"
        subtitle={`${rows.length} deploy events — ingested from Vercel webhook + daily backfill.`}
      />

      <KPIGrid>
        <MetricCard label="Deploys today" value={deploysToday} icon={Rocket} iconTone="blue" hint="last 24h" />
        <MetricCard label="Deploys this week" value={deploys7d} icon={Clock} iconTone="violet" hint="last 7d" />
        <MetricCard
          label="Failed rate"
          value={failedRate}
          icon={AlertTriangle}
          iconTone={errors7d > 0 ? "red" : "emerald"}
          hint={`${errors7d} error${errors7d === 1 ? "" : "s"} / 7d`}
        />
        <MetricCard
          label="Successful deploys"
          value={rows.filter((r) => r.status === "ready").length}
          icon={CheckCircle2}
          iconTone="emerald"
          hint="all-time"
        />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={Rocket}
          title="No deployments yet"
          description="Configure the Vercel webhook (POST /api/webhooks/vercel-deploy) and run /api/cron/vercel-backfill to populate this feed."
        />
      ) : (
        <DeploymentsClient rows={rows} ventures={ventures} />
      )}
    </div>
  )
}
