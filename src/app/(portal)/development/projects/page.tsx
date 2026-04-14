import { listProjects, type Project } from "@/lib/projects"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { FolderKanban, Hammer, CheckCircle2, CircleDashed } from "lucide-react"
import { ProjectsClient } from "./projects-client"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Projects — Development | Suprans",
  description: "The full engineering portfolio — every landing, portal, and app.",
}

export default async function DevelopmentProjectsPage() {
  const projects: Project[] = await listProjects()

  const live = projects.filter((p) => p.status === "live").length
  const building = projects.filter((p) => p.status === "building").length
  const planning = projects.filter((p) => p.status === "planning").length

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Projects"
        subtitle={`${projects.length} tracked properties across all ventures — every landing, portal, and app Suprans ships, grouped by the venture that funds it.`}
      />

      <KPIGrid>
        <MetricCard label="Total projects" value={projects.length} icon={FolderKanban} iconTone="slate" />
        <MetricCard label="Live" value={live} icon={CheckCircle2} iconTone="emerald" hint="shipping today" />
        <MetricCard label="Building" value={building} icon={Hammer} iconTone="amber" hint="active dev" />
        <MetricCard label="Planning" value={planning} icon={CircleDashed} iconTone="blue" hint="scoped" />
      </KPIGrid>

      <ProjectsClient projects={projects} />
    </div>
  )
}
