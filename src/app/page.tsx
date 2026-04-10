import { listSpaces } from "@/lib/spaces"
import {
  listProjects,
  listAllProjectChildren,
  summarizeChecklist,
  type ChecklistSummary,
  type ProjectWithChildren,
} from "@/lib/projects"
import { HomeLauncher } from "@/components/home/home-launcher"

export const dynamic = "force-dynamic"

/**
 * Homepage — thin server wrapper. Fetches:
 *   - the list of active spaces (for the Home view)
 *   - the full projects catalogue + per-project checklist, pages, plugins
 *     (for the inline Projects view AND the inline project detail view)
 *
 * Everything is fetched server-side in parallel and passed down as plain
 * serializable props so the <HomeLauncher> client component can swap views
 * instantly without a second round-trip.
 */
export default async function HomePage() {
  const [spaces, projects] = await Promise.all([
    listSpaces(),
    listProjects(),
  ])
  const activeApps = spaces.filter((s) => s.is_active)

  const { checklistByProject, pagesByProject, pluginsByProject } =
    await listAllProjectChildren(projects.map((p) => p.id))

  const summaryEntries: Array<[string, ChecklistSummary]> = projects.map(
    (p) => [p.id, summarizeChecklist(checklistByProject.get(p.id) ?? [])]
  )

  const detailEntries: Array<[string, ProjectWithChildren]> = projects.map(
    (p) => [
      p.slug,
      {
        ...p,
        checklist: checklistByProject.get(p.id) ?? [],
        pages: pagesByProject.get(p.id) ?? [],
        plugins: pluginsByProject.get(p.id) ?? [],
      },
    ]
  )

  return (
    <HomeLauncher
      activeApps={activeApps}
      projects={projects}
      projectSummaries={summaryEntries}
      projectDetails={detailEntries}
    />
  )
}
