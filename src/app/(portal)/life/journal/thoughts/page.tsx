import { Brain, Lightbulb, Tag, CalendarDays } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { GenericAddLauncher } from "../../_components/GenericEditLauncher"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { TimelineList, type TimelineItem } from "@/components/shared/timeline-list"
import { formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Thoughts — Life | Suprans" }

interface ThoughtRow {
  id: string
  title: string | null
  content: string | null
  tags: string[] | null
  created_at: string | null
}

async function fetchThoughts() {
  const { data, error } = await supabaseLife
    .from("thought_notes")
    .select("id, title, content, tags, created_at")
    .order("created_at", { ascending: false })
    .limit(200)
  if (error) console.error("life.thought_notes:", error.message)
  return (data ?? []) as ThoughtRow[]
}

function truncate(s: string, n: number) {
  if (s.length <= n) return s
  return `${s.slice(0, n).trimEnd()}…`
}

export default async function LifeThoughtsPage() {
  const rows = await fetchThoughts()
  const now = new Date()
  const thisMonth = rows.filter((r) => {
    if (!r.created_at) return false
    const d = new Date(r.created_at)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }).length
  const allTags = rows.flatMap((r) => r.tags ?? [])
  const uniqueTags = new Set(allTags).size
  const lastEntry = rows[0]?.created_at ?? null

  const items: TimelineItem[] = rows
    .filter((r) => r.created_at)
    .map((r) => {
      const tags = r.tags ?? []
      const title = r.title ?? (r.content ? truncate(r.content, 80) : "Untitled")
      const body = r.content && r.title ? truncate(r.content, 220) : undefined
      return {
        id: r.id,
        date: r.created_at as string,
        title,
        body,
        badge: tags[0] ? { label: tags[0], tone: "slate" as const } : undefined,
        meta: tags.length > 1 ? `${tags.length} tags` : undefined,
      }
    })

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        actions={
          <GenericAddLauncher
            table="thought_notes"
            listHref="/life/journal/thoughts"
            title="New thought"
          />
        }
        title="Thoughts"
        subtitle={`${rows.length.toLocaleString("en-IN")} note${rows.length === 1 ? "" : "s"}`}
      />

      <KPIGrid>
        <MetricCard label="Total thoughts" value={rows.length} icon={Brain} iconTone="violet" />
        <MetricCard label="This month" value={thisMonth} icon={Lightbulb} iconTone="amber" />
        <MetricCard label="Unique tags" value={uniqueTags} icon={Tag} iconTone="blue" />
        <MetricCard
          label="Last captured"
          value={lastEntry ? formatDate(lastEntry) : "—"}
          icon={CalendarDays}
          iconTone="slate"
        />
      </KPIGrid>

      <TimelineList
        items={items}
        emptyMessage="No thoughts captured yet. Stray ideas, half-formed insights, one-liners — this is where they go before they're lost."
      />
    </div>
  )
}
