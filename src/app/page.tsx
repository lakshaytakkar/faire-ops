import { listSpaces } from "@/lib/spaces"
import {
  listProjects,
  listChecklistFor,
  summarizeChecklist,
  type ChecklistSummary,
} from "@/lib/projects"
import { HomeLauncher } from "@/components/home/home-launcher"

export const dynamic = "force-dynamic"

/**
 * Homepage — thin server wrapper. Fetches:
 *   - the list of active spaces (for the Home view)
 *   - the full projects catalogue + per-project checklist summaries
 *     (for the inline Projects view)
 *
 * and hands them to the <HomeLauncher> client component, which owns the
 * view state (Home / Plugins / Projects) and renders the wallpaper once
 * so it stays mounted as the user switches views.
 */
export default async function HomePage() {
  const [spaces, projects] = await Promise.all([
    listSpaces(),
    listProjects(),
  ])
  const activeApps = spaces.filter((s) => s.is_active)

  const checklists = await listChecklistFor(projects.map((p) => p.id))
  const summaryEntries: Array<[string, ChecklistSummary]> = projects.map(
    (p) => [p.id, summarizeChecklist(checklists.get(p.id) ?? [])]
  )

  return (
    <HomeLauncher
      activeApps={activeApps}
      projects={projects}
      projectSummaries={summaryEntries}
    />
  )
}
