import Link from "next/link"
import { StickyNote, Pin, Clock, Tag } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import { DetailCard } from "@/components/shared/detail-views"
import { formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Notes — Workspace | Suprans" }

interface NoteRow {
  id: string
  space_slug: string | null
  title: string | null
  body: string
  tags: string[] | null
  pinned: boolean
  author: string | null
  created_at: string | null
  updated_at: string | null
}

async function fetchNotes(spaceSlug: string | null) {
  let query = supabase
    .from("notes")
    .select("id, space_slug, title, body, tags, pinned, author, created_at, updated_at")
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(200)

  if (spaceSlug) {
    query = query.eq("space_slug", spaceSlug)
  }

  const { data, error } = await query
  if (error) console.error("public.notes:", error.message)
  return (data ?? []) as NoteRow[]
}

export default async function WorkspaceNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ space?: string }>
}) {
  const { space } = await searchParams
  const rows = await fetchNotes(space ?? null)
  const pinned = rows.filter((r) => r.pinned)
  const unpinned = rows.filter((r) => !r.pinned)
  const uniqueTags = new Set(rows.flatMap((r) => r.tags ?? []))

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Notes"
        subtitle={`${rows.length} note${rows.length === 1 ? "" : "s"}${space ? ` in ${space}` : " across all spaces"}`}
      />

      <KPIGrid>
        <MetricCard label="Total" value={rows.length} icon={StickyNote} iconTone="blue" />
        <MetricCard label="Pinned" value={pinned.length} icon={Pin} iconTone="amber" />
        <MetricCard label="Tags" value={uniqueTags.size} icon={Tag} iconTone="violet" />
        <MetricCard
          label="Last updated"
          value={rows[0]?.updated_at ? formatDate(rows[0].updated_at) : "—"}
          icon={Clock}
          iconTone="slate"
        />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title="No notes yet"
          description="Quick-capture notes will appear here. Add rows directly in the Supabase public.notes table for now — a create drawer is coming soon."
        />
      ) : (
        <>
          {pinned.length > 0 && (
            <DetailCard title={`Pinned (${pinned.length})`}>
              <div className="space-y-3">
                {pinned.map((n) => (
                  <NoteCard key={n.id} note={n} />
                ))}
              </div>
            </DetailCard>
          )}

          <DetailCard title={pinned.length > 0 ? `Recent (${unpinned.length})` : `All notes (${unpinned.length})`}>
            {unpinned.length === 0 ? (
              <p className="text-sm text-muted-foreground">All notes are pinned.</p>
            ) : (
              <div className="space-y-3">
                {unpinned.map((n) => (
                  <NoteCard key={n.id} note={n} />
                ))}
              </div>
            )}
          </DetailCard>
        </>
      )}
    </div>
  )
}

function NoteCard({ note }: { note: NoteRow }) {
  return (
    <div className="rounded-md border bg-background p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {note.pinned && <Pin className="size-3.5 text-amber-500 shrink-0" />}
            <p className="text-sm font-semibold truncate">{note.title ?? note.body.slice(0, 60)}</p>
          </div>
          {note.title && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-3 whitespace-pre-line">{note.body}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          {note.space_slug && <StatusBadge tone="slate">{note.space_slug}</StatusBadge>}
          <p className="text-sm text-muted-foreground tabular-nums mt-1">
            {note.updated_at ? formatDate(note.updated_at) : "—"}
          </p>
        </div>
      </div>
      {(note.tags ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {(note.tags ?? []).map((t) => (
            <StatusBadge key={t} tone="slate">{t}</StatusBadge>
          ))}
        </div>
      )}
    </div>
  )
}
