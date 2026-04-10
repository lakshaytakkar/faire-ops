import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import {
  listProjects,
  listChecklistFor,
  summarizeChecklist,
  type ChecklistSummary,
} from "@/lib/projects"
import { ProjectsGrid } from "@/components/home/projects-grid"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Projects — TeamSync AI",
  description:
    "Every landing page, client portal, admin portal and vendor portal we're building — grouped by brand with delivery checklists.",
}

export default async function ProjectsPage() {
  const projects = await listProjects()
  const checklists = await listChecklistFor(projects.map((p) => p.id))

  const summaries = new Map<string, ChecklistSummary>()
  for (const p of projects) {
    summaries.set(p.id, summarizeChecklist(checklists.get(p.id) ?? []))
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-[1280px] mx-auto px-6 py-10 md:py-14">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to home
        </Link>

        <ProjectsGrid projects={projects} summaries={summaries} tone="light" />
      </div>
    </main>
  )
}
