import { NotebookPen, Smile, Flame, Sparkles } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { GenericAddLauncher } from "../_components/GenericEditLauncher"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { TimelineList, type TimelineItem } from "@/components/shared/timeline-list"

export const dynamic = "force-dynamic"
export const metadata = { title: "Journal — Life | Suprans" }

interface JournalRow {
  id: string
  date: string | null
  mood: number | null
  energy: number | null
  day_rating: number | null
  word_count: number | null
  best_part: string | null
  one_learning: string | null
}

async function fetchJournal() {
  const { data, error } = await supabaseLife
    .from("journal_entries")
    .select("id, date, mood, energy, day_rating, word_count, best_part, one_learning")
    .order("date", { ascending: false })
    .limit(300)
  if (error) console.error("life.journal_entries:", error.message)
  return (data ?? []) as JournalRow[]
}

function avg(nums: (number | null)[]): number | null {
  const v = nums.filter((n): n is number => typeof n === "number")
  if (!v.length) return null
  return Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10
}

function dayRatingTone(r: number | null): "emerald" | "amber" | "red" | "slate" {
  if (r === null) return "slate"
  if (r >= 8) return "emerald"
  if (r >= 5) return "amber"
  return "red"
}

export default async function LifeJournalPage() {
  const rows = await fetchJournal()
  const now = new Date()
  const monthRows = rows.filter((r) => {
    if (!r.date) return false
    const d = new Date(r.date)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })

  const avgMood = avg(monthRows.map((r) => r.mood))
  const avgEnergy = avg(monthRows.map((r) => r.energy))
  const avgDay = avg(monthRows.map((r) => r.day_rating))

  const items: TimelineItem[] = rows
    .filter((r) => r.date)
    .map((r) => ({
      id: r.id,
      date: r.date as string,
      title: r.best_part ?? r.one_learning ?? "Entry",
      body: r.one_learning && r.one_learning !== r.best_part ? r.one_learning : undefined,
      href: `/life/journal/${String(r.date).slice(0, 10)}`,
      badge:
        r.day_rating !== null
          ? { label: `Day ${r.day_rating}/10`, tone: dayRatingTone(r.day_rating) }
          : undefined,
      meta:
        r.word_count || r.mood !== null || r.energy !== null ? (
          <span className="tabular-nums">
            {r.word_count ? `${r.word_count.toLocaleString("en-IN")} words` : ""}
            {r.word_count && (r.mood !== null || r.energy !== null) ? " · " : ""}
            {r.mood !== null ? `mood ${r.mood}` : ""}
            {r.mood !== null && r.energy !== null ? " · " : ""}
            {r.energy !== null ? `energy ${r.energy}` : ""}
          </span>
        ) : undefined,
    }))

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Journal"
        subtitle={`${rows.length.toLocaleString("en-IN")} entr${rows.length === 1 ? "y" : "ies"}`}
        actions={
          <GenericAddLauncher
            table="journal_entries"
            listHref="/life/journal"
            title="New entry"
            size="xl"
            defaults={{ date: new Date().toISOString().slice(0, 10) }}
          />
        }
      />

      <KPIGrid>
        <MetricCard
          label="Entries this month"
          value={monthRows.length}
          icon={NotebookPen}
          iconTone="violet"
        />
        <MetricCard
          label="Avg mood (month)"
          value={avgMood !== null ? `${avgMood} / 10` : "—"}
          icon={Smile}
          iconTone="amber"
        />
        <MetricCard
          label="Avg energy (month)"
          value={avgEnergy !== null ? `${avgEnergy} / 10` : "—"}
          icon={Flame}
          iconTone="red"
        />
        <MetricCard
          label="Avg day rating (month)"
          value={avgDay !== null ? `${avgDay} / 10` : "—"}
          icon={Sparkles}
          iconTone="emerald"
        />
      </KPIGrid>

      <TimelineList
        items={items}
        emptyMessage="No entries yet. A few sentences a day compounds — today is a good first entry."
      />
    </div>
  )
}
