import { Scale, ThumbsUp, ThumbsDown, Clock } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { GenericAddLauncher } from "../../_components/GenericEditLauncher"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { TimelineList, type TimelineItem } from "@/components/shared/timeline-list"
import { toneForStatus } from "@/components/shared/status-badge"

export const dynamic = "force-dynamic"
export const metadata = { title: "Decisions — Life | Suprans" }

interface DecisionRow {
  id: string
  decision: string | null
  choice_made: string | null
  why: string | null
  outcome: string | null
  date: string | null
  domain: string | null
  notes: string | null
}

async function fetchDecisions() {
  const { data, error } = await supabaseLife
    .from("decision_logs")
    .select("id, decision, choice_made, why, outcome, date, domain, notes")
    .order("date", { ascending: false })
    .limit(200)
  if (error) console.error("life.decision_logs:", error.message)
  return (data ?? []) as DecisionRow[]
}

export default async function LifeDecisionsPage() {
  const rows = await fetchDecisions()

  const pending = rows.filter((r) => r.outcome === "pending" || !r.outcome).length
  const good = rows.filter((r) => r.outcome === "good").length
  const bad = rows.filter((r) => r.outcome === "bad").length
  const tooEarly = rows.filter((r) => r.outcome === "too_early").length

  const items: TimelineItem[] = rows
    .filter((r) => r.date)
    .map((r) => ({
      id: r.id,
      date: r.date as string,
      title: r.decision ?? "Untitled",
      body: r.choice_made ?? r.why ?? r.notes ?? undefined,
      badge: { label: r.outcome ?? "pending", tone: toneForStatus(r.outcome) },
    }))

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        actions={
          <GenericAddLauncher
            table="decision_logs"
            listHref="/life/journal/decisions"
            title="New decision"
          />
        }
        title="Decisions"
        subtitle={`${rows.length.toLocaleString("en-IN")} decision log${rows.length === 1 ? "" : "s"}`}
      />

      <KPIGrid>
        <MetricCard label="Pending review" value={pending} icon={Clock} iconTone="amber" />
        <MetricCard label="Good" value={good} icon={ThumbsUp} iconTone="emerald" />
        <MetricCard label="Bad" value={bad} icon={ThumbsDown} iconTone="red" />
        <MetricCard label="Too early to say" value={tooEarly} icon={Scale} iconTone="slate" />
      </KPIGrid>

      <TimelineList
        items={items}
        emptyMessage="No decisions logged yet. Log hard calls when you make them — context, choice, why. Reviewing later is how judgment compounds."
      />
    </div>
  )
}
