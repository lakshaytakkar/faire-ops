import { MessageCircle, CalendarDays, TrendingUp, Hash } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { GenericAddLauncher } from "../../_components/GenericEditLauncher"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { TimelineList, type TimelineItem } from "@/components/shared/timeline-list"

export const dynamic = "force-dynamic"
export const metadata = { title: "Interactions — Life | Suprans" }

interface InteractionRow {
  id: string
  person_id: string | null
  date: string | null
  mode: string | null
  summary: string | null
}

interface PersonLite {
  id: string
  name: string | null
}

async function fetchInteractions() {
  const { data, error } = await supabaseLife
    .from("interaction_logs")
    .select("id, person_id, date, mode, summary")
    .order("date", { ascending: false })
    .limit(500)
  if (error) console.error("life.interaction_logs:", error.message)
  return (data ?? []) as InteractionRow[]
}

async function fetchPeopleByIds(ids: string[]) {
  if (ids.length === 0) return new Map<string, string>()
  const { data, error } = await supabaseLife
    .from("people")
    .select("id, name")
    .in("id", ids)
  if (error) console.error("life.people (interactions):", error.message)
  const map = new Map<string, string>()
  for (const p of (data ?? []) as PersonLite[]) {
    if (p.id) map.set(p.id, p.name ?? "Unknown")
  }
  return map
}

export default async function LifeInteractionsPage() {
  const rows = await fetchInteractions()
  const personIds = Array.from(
    new Set(rows.map((r) => r.person_id).filter((v): v is string => !!v)),
  )
  const peopleMap = await fetchPeopleByIds(personIds)

  const now = new Date()
  const monthRows = rows.filter((r) => {
    if (!r.date) return false
    const d = new Date(r.date)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })
  const byMode = rows.reduce<Record<string, number>>((acc, r) => {
    const k = r.mode ?? "other"
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})
  const topMode = Object.entries(byMode).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—"
  const modesCount = Object.keys(byMode).length

  const items: TimelineItem[] = rows
    .filter((r) => r.date)
    .map((r) => {
      const personName = r.person_id ? peopleMap.get(r.person_id) ?? "Unknown" : "Unknown"
      const mode = r.mode ?? "note"
      return {
        id: r.id,
        date: r.date as string,
        title: `${personName} — ${mode}`,
        body: r.summary ?? undefined,
        badge: { label: mode, tone: "slate" as const },
        href: r.person_id ? `/life/people/${r.person_id}` : undefined,
      }
    })

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        actions={
          <GenericAddLauncher
            table="interaction_logs"
            listHref="/life/people/interactions"
            title="Log interaction"
            defaults={{ date: new Date().toISOString().slice(0, 10) }}
          />
        }
        title="Interactions"
        subtitle={`${rows.length.toLocaleString("en-IN")} interaction${rows.length === 1 ? "" : "s"}`}
      />

      <KPIGrid>
        <MetricCard
          label="This month"
          value={monthRows.length}
          icon={CalendarDays}
          iconTone="emerald"
        />
        <MetricCard label="Top mode" value={topMode} icon={TrendingUp} iconTone="violet" />
        <MetricCard label="Modes used" value={modesCount} icon={MessageCircle} iconTone="blue" />
        <MetricCard label="All-time" value={rows.length} icon={Hash} iconTone="slate" />
      </KPIGrid>

      <TimelineList
        items={items}
        emptyMessage="No interactions logged. Capture meaningful conversations — relationships compound when you remember the threads."
      />
    </div>
  )
}
