import { notFound } from "next/navigation"
import { NotebookPen, Smile, Zap, Star } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { formatDate } from "@/lib/format"
import { JournalEditLauncher } from "./JournalEditLauncher"

export const dynamic = "force-dynamic"

type Params = { date: string }

/**
 * Journal entries are keyed by natural date, not by `id`. We accept YYYY-MM-DD
 * in the route param and look it up via eq("date", param).
 */
export default async function LifeJournalDetailPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { date } = await params
  // Basic shape validation — otherwise the DB rejects the filter outright
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound()

  const { data } = await supabaseLife
    .from("journal_entries")
    .select(
      "id, date, brain_dump, best_part, change_one_thing, grateful_for, worried_about, one_learning, mood, energy, day_rating, word_count, created_at, updated_at",
    )
    .eq("date", date)
    .maybeSingle()
  if (!data) notFound()
  const j = data as {
    id: string
    date: string | null
    brain_dump: string | null
    best_part: string | null
    change_one_thing: string | null
    grateful_for: string | null
    worried_about: string | null
    one_learning: string | null
    mood: number | null
    energy: number | null
    day_rating: number | null
    word_count: number | null
    created_at: string | null
    updated_at: string | null
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title={`Journal — ${formatDate(j.date)}`}
        subtitle={
          j.word_count !== null
            ? `${j.word_count.toLocaleString("en-IN")} words`
            : undefined
        }
        breadcrumbs={[
          { label: "Life", href: "/life" },
          { label: "Journal", href: "/life/journal" },
          { label: formatDate(j.date) },
        ]}
        actions={<JournalEditLauncher entry={j} />}
      />

      <KPIGrid>
        <MetricCard
          label="Mood"
          value={j.mood !== null ? `${j.mood} / 10` : "—"}
          icon={Smile}
          iconTone="amber"
        />
        <MetricCard
          label="Energy"
          value={j.energy !== null ? `${j.energy} / 10` : "—"}
          icon={Zap}
          iconTone="emerald"
        />
        <MetricCard
          label="Day rating"
          value={j.day_rating !== null ? `${j.day_rating} / 10` : "—"}
          icon={Star}
          iconTone="violet"
        />
        <MetricCard
          label="Word count"
          value={j.word_count ?? 0}
          icon={NotebookPen}
          iconTone="blue"
        />
      </KPIGrid>

      {j.brain_dump && (
        <DetailCard title="Brain dump">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {j.brain_dump}
          </p>
        </DetailCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {j.best_part && (
          <DetailCard title="Best part of today">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {j.best_part}
            </p>
          </DetailCard>
        )}
        {j.change_one_thing && (
          <DetailCard title="One thing to change">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {j.change_one_thing}
            </p>
          </DetailCard>
        )}
        {j.grateful_for && (
          <DetailCard title="Grateful for">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {j.grateful_for}
            </p>
          </DetailCard>
        )}
        {j.worried_about && (
          <DetailCard title="Worried about">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {j.worried_about}
            </p>
          </DetailCard>
        )}
        {j.one_learning && (
          <DetailCard title="One learning">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {j.one_learning}
            </p>
          </DetailCard>
        )}
      </div>
    </div>
  )
}
