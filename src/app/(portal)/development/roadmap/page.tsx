import { supabase } from "@/lib/supabase"
import { listProjects, type Project } from "@/lib/projects"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Sparkles } from "lucide-react"
import { RoadmapTabs, type ChangelogEntryRow, type RoadmapRow } from "./roadmap-tabs"

export const dynamic = "force-dynamic"

export const metadata = { title: "Roadmap — Development | Suprans" }

export default async function RoadmapPage() {
  const [{ data: roadmapRaw }, { data: changelogRaw }, projects] = await Promise.all([
    supabase
      .from("roadmap_items")
      .select("id, quarter, venture, title, description, bullets, owner, target_date, status, linked_project_id, sort_order")
      .order("quarter", { ascending: true })
      .order("sort_order", { ascending: true }),
    supabase
      .from("changelog_entries")
      .select("id, entry_date, venture, title, description, linked_project_id, kind")
      .order("entry_date", { ascending: false })
      .limit(200),
    listProjects(),
  ])

  const projectById = new Map<string, Project>(projects.map((p) => [p.id, p]))

  const roadmap: RoadmapRow[] = (roadmapRaw ?? []).map((r) => ({
    id: r.id as string,
    quarter: r.quarter as string,
    venture: (r.venture as string | null) ?? null,
    title: r.title as string,
    description: (r.description as string | null) ?? null,
    bullets: Array.isArray(r.bullets) ? (r.bullets as string[]) : [],
    owner: (r.owner as string | null) ?? null,
    target_date: (r.target_date as string | null) ?? null,
    status: (r.status as RoadmapRow["status"]) ?? "planned",
    linked_project_id: (r.linked_project_id as string | null) ?? null,
    linked_project_slug:
      r.linked_project_id && projectById.has(r.linked_project_id as string)
        ? projectById.get(r.linked_project_id as string)!.slug
        : null,
    linked_project_name:
      r.linked_project_id && projectById.has(r.linked_project_id as string)
        ? projectById.get(r.linked_project_id as string)!.name
        : null,
    sort_order: (r.sort_order as number) ?? 0,
  }))

  const changelog: ChangelogEntryRow[] = (changelogRaw ?? []).map((e) => ({
    id: e.id as string,
    entry_date: e.entry_date as string,
    venture: (e.venture as string | null) ?? null,
    title: e.title as string,
    description: (e.description as string | null) ?? null,
    linked_project_id: (e.linked_project_id as string | null) ?? null,
    linked_project_slug:
      e.linked_project_id && projectById.has(e.linked_project_id as string)
        ? projectById.get(e.linked_project_id as string)!.slug
        : null,
    linked_project_name:
      e.linked_project_id && projectById.has(e.linked_project_id as string)
        ? projectById.get(e.linked_project_id as string)!.name
        : null,
    kind: (e.kind as ChangelogEntryRow["kind"]) ?? "release",
  }))

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Roadmap"
        subtitle="Themes through end of 2026 plus a reverse-chronological changelog. Each quarter rolls up to a venture; each bullet is a deliverable someone is named on."
      />

      {roadmap.length === 0 && changelog.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Nothing planned yet"
          description="Add items to public.roadmap_items and public.changelog_entries."
        />
      ) : (
        <RoadmapTabs roadmap={roadmap} changelog={changelog} />
      )}
    </div>
  )
}
