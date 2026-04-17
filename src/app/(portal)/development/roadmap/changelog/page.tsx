import { supabase } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { TimelineList, type TimelineItem } from "@/components/shared/timeline-list"
import { ventureMeta } from "@/components/development/dev-primitives"
import type { StatusTone } from "@/components/shared/status-badge"

export const dynamic = "force-dynamic"

export const metadata = { title: "Changelog — Development | Suprans" }

type ChangelogKind = "release" | "feature" | "fix" | "chore"

interface ChangelogRow {
  id: string
  entry_date: string
  venture: string | null
  title: string
  description: string | null
  linked_project_id: string | null
  kind: ChangelogKind
}

const KIND_TONE: Record<ChangelogKind, StatusTone> = {
  release: "emerald",
  feature: "blue",
  fix: "amber",
  chore: "slate",
}

export default async function DevelopmentChangelogPage() {
  const { data: raw } = await supabase
    .from("changelog_entries")
    .select("id, entry_date, venture, title, description, linked_project_id, kind")
    .order("entry_date", { ascending: false })
    .limit(200)

  const rows: ChangelogRow[] = (raw ?? []).map((e) => ({
    id: e.id as string,
    entry_date: e.entry_date as string,
    venture: (e.venture as string | null) ?? null,
    title: e.title as string,
    description: (e.description as string | null) ?? null,
    linked_project_id: (e.linked_project_id as string | null) ?? null,
    kind: (e.kind as ChangelogKind) ?? "release",
  }))

  const items: TimelineItem[] = rows.map((r) => ({
    id: r.id,
    date: r.entry_date,
    title: r.title,
    body: r.description ?? undefined,
    badge: { label: r.kind, tone: KIND_TONE[r.kind] ?? "slate" },
    meta: r.venture ? ventureMeta(r.venture).label : undefined,
  }))

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader title="Changelog" subtitle={`${rows.length} entries`} />
      <TimelineList items={items} emptyMessage="No changelog entries yet." />
    </div>
  )
}
