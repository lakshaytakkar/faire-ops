import { CheckCircle2, FolderKanban, Clock, Layers, Rocket } from "lucide-react"
import { listProjects, type Project } from "@/lib/projects"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
import { relativeTime } from "@/lib/format"
import { ProjectsClient } from "../projects-client"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Live — Development | Suprans",
  description: "Projects shipping to real users today.",
}

export default async function LiveProjectsPage() {
  const all: Project[] = await listProjects()
  const projects = all.filter((p) => p.status === "live")

  const ventureCount = new Set(projects.map((p) => p.venture).filter(Boolean)).size

  const sortedByDeploy = projects
    .filter((p) => p.last_deploy_at)
    .slice()
    .sort((a, b) => (a.last_deploy_at ?? "").localeCompare(b.last_deploy_at ?? ""))

  const oldestInProd = sortedByDeploy[0]
  const mostRecent = sortedByDeploy[sortedByDeploy.length - 1]

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Live"
        subtitle="Projects shipping to real users today — production across every venture."
      />

      <KPIGrid>
        <MetricCard
          label="Total live"
          value={projects.length}
          icon={CheckCircle2}
          iconTone="emerald"
          hint="status = live"
        />
        <MetricCard
          label="Ventures"
          value={ventureCount}
          icon={Layers}
          iconTone="violet"
          hint="distinct ventures"
        />
        <MetricCard
          label="Oldest in prod"
          value={oldestInProd ? relativeTime(oldestInProd.last_deploy_at) : "—"}
          icon={Clock}
          iconTone="slate"
          hint={oldestInProd?.name ?? "no deploys"}
        />
        <MetricCard
          label="Most recent deploy"
          value={mostRecent ? relativeTime(mostRecent.last_deploy_at) : "—"}
          icon={Rocket}
          iconTone="blue"
          hint={mostRecent?.name ?? "no deploys"}
        />
      </KPIGrid>

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Nothing live yet"
          description="No projects are currently in status=live. Move something to live in public.projects once it ships."
        />
      ) : (
        <ProjectsClient projects={projects} />
      )}
    </div>
  )
}
