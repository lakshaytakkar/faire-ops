import { Flag, Pause, CheckCircle2, TrendingUp } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { GenericAddLauncher } from "../_components/GenericEditLauncher"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import {
  KanbanBoard,
  type KanbanCard,
  type KanbanColumn,
} from "@/components/shared/kanban-board"

export const dynamic = "force-dynamic"
export const metadata = { title: "Goals — Life | Suprans" }

interface GoalRow {
  id: string
  title: string | null
  description: string | null
  why: string | null
  domain: string | null
  horizon: string | null
  status: string | null
  progress: number | null
  completed_at: string | null
}

async function fetchGoals() {
  const { data, error } = await supabaseLife
    .from("life_goals")
    .select("id, title, description, why, domain, horizon, status, progress, completed_at")
    .order("created_at", { ascending: false })
    .limit(300)
  if (error) console.error("life.life_goals:", error.message)
  return (data ?? []) as GoalRow[]
}

const COLUMNS: KanbanColumn[] = [
  { key: "active", label: "Active", tone: "emerald" },
  { key: "on_hold", label: "On hold", tone: "amber" },
  { key: "complete", label: "Complete", tone: "blue" },
  { key: "dropped", label: "Dropped", tone: "slate" },
]

function isStalled(horizon: string | null, status: string | null, progress: number | null): boolean {
  // Short-horizon goals (today/1_week/1_month) stuck under 10% count as stalled.
  if (status !== "active") return false
  if (!horizon) return false
  const shortHorizons = new Set(["today", "1_week", "1_month"])
  if (!shortHorizons.has(horizon)) return false
  return (progress ?? 0) < 10
}

export default async function LifeGoalsPage() {
  const rows = await fetchGoals()

  const active = rows.filter((r) => r.status === "active").length
  const stalledCount = rows.filter((r) => isStalled(r.horizon, r.status, r.progress)).length
  const progressValues = rows
    .filter((r) => r.status === "active")
    .map((r) => r.progress)
    .filter((n): n is number => typeof n === "number")
  const avgProgress = progressValues.length
    ? Math.round(progressValues.reduce((a, b) => a + b, 0) / progressValues.length)
    : 0

  const cards: KanbanCard[] = rows
    .filter((r) => r.status && COLUMNS.some((c) => c.key === r.status))
    .map((r) => {
      const metaParts: string[] = []
      if (typeof r.progress === "number") metaParts.push(`${r.progress}%`)
      if (r.horizon) metaParts.push(`horizon ${r.horizon}`)
      const meta = metaParts.length ? metaParts.join(" · ") : undefined
      return {
        id: r.id,
        columnKey: r.status as string,
        title: r.title ?? "Untitled goal",
        subtitle: r.domain ?? undefined,
        meta,
        href: `/life/goals/${r.id}`,
        badge: isStalled(r.horizon, r.status, r.progress)
          ? { label: "Stalled", tone: "amber" as const }
          : undefined,
      }
    })

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Goals"
        subtitle={`${rows.length.toLocaleString("en-IN")} goal${rows.length === 1 ? "" : "s"}`}
        actions={
          <GenericAddLauncher
            table="life_goals"
            listHref="/life/goals"
            title="New goal"
          />
        }
      />

      <KPIGrid>
        <MetricCard label="Total" value={rows.length} icon={Flag} iconTone="blue" />
        <MetricCard label="Active" value={active} icon={Flag} iconTone="emerald" />
        <MetricCard
          label="Avg progress (active)"
          value={`${avgProgress}%`}
          icon={TrendingUp}
          iconTone="violet"
        />
        <MetricCard label="Stalled" value={stalledCount} icon={Pause} iconTone="amber" />
      </KPIGrid>

      <KanbanBoard
        columns={COLUMNS}
        cards={cards}
        emptyColumnMessage="No goals in this lane"
      />
    </div>
  )
}
