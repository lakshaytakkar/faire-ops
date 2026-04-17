import { Hammer, FolderKanban, Clock, Layers } from "lucide-react"
import { listProjects, type Project } from "@/lib/projects"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
import { relativeTime } from "@/lib/format"
import { ProjectsClient } from "../projects-client"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Building — Development | Suprans",
  description: "Projects currently in active development across every venture.",
}

export default async function BuildingProjectsPage() {
  const all: Project[] = await listProjects()
  const projects = all.filter((p) => p.status === "building")

  const ventureCount = new Set(projects.map((p) => p.venture).filter(Boolean)).size

  const oldestBuild = projects
    .filter((p) => p.last_deploy_at)
    .sort((a, b) => (a.last_deploy_at ?? "").localeCompare(b.last_deploy_at ?? ""))[0]

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Building"
        subtitle="Projects currently in active development — the heart of the engineering sprint."
      />

      <KPIGrid>
        <MetricCard
          label="In build"
          value={projects.length}
          icon={Hammer}
          iconTone="amber"
          hint="status = building"
        />
        <MetricCard
          label="Ventures"
          value={ventureCount}
          icon={Layers}
          iconTone="violet"
          hint="distinct ventures"
        />
        <MetricCard
          label="Total tracked"
          value={all.length}
          icon={FolderKanban}
          iconTone="slate"
          hint="all projects"
        />
        <MetricCard
          label="Oldest in build"
          value={oldestBuild ? relativeTime(oldestBuild.last_deploy_at) : "—"}
          icon={Clock}
          iconTone="blue"
          hint={oldestBuild?.name ?? "no deploys"}
        />
      </KPIGrid>

      {projects.length === 0 ? (
        <EmptyState
          icon={Hammer}
          title="Nothing building right now"
          description="No projects are currently in status=building. Move something to building in public.projects."
        />
      ) : (
        <ProjectsClient projects={projects} />
      )}
    </div>
  )
}
