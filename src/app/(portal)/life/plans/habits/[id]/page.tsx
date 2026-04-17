import { notFound } from "next/navigation"
import { Repeat, Flame, Trophy, Activity } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { formatDate } from "@/lib/format"
import { GenericEditLauncher } from "../../../_components/GenericEditLauncher"
import { HabitLogLauncher } from "./HabitLogLauncher"
import { HabitHeatmap } from "./HabitHeatmap"

export const dynamic = "force-dynamic"

type Params = { id: string }

export default async function LifeHabitDetailPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params

  const now = new Date()
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86_400_000)
  const from = ninetyDaysAgo.toISOString().slice(0, 10)

  const [habitRes, logsRes] = await Promise.all([
    supabaseLife
      .from("habits")
      .select(
        "id, name, category, frequency, custom_days, target_description, why, streak, longest_streak, status, sort_order, created_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabaseLife
      .from("habit_logs")
      .select("id, date, status, note")
      .eq("habit_id", id)
      .gte("date", from)
      .order("date", { ascending: false }),
  ])

  if (!habitRes.data) notFound()
  const habit = habitRes.data as {
    id: string
    name: string | null
    category: string | null
    frequency: string | null
    custom_days: string[] | null
    target_description: string | null
    why: string | null
    streak: number | null
    longest_streak: number | null
    status: string | null
    sort_order: number | null
    created_at: string | null
  }
  const logs = (logsRes.data ?? []) as Array<{
    id: string
    date: string | null
    status: string | null
    note: string | null
  }>

  const completedCount = logs.filter((l) => l.status === "done").length
  const completionRate = logs.length > 0 ? Math.round((completedCount / 90) * 100) : 0

  const logMap = new Map<string, string>()
  for (const l of logs) if (l.date) logMap.set(l.date, l.status ?? "")

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title={habit.name ?? "Untitled habit"}
        subtitle={habit.target_description ?? habit.category ?? undefined}
        breadcrumbs={[
          { label: "Life", href: "/life" },
          { label: "Habits", href: "/life/plans/habits" },
          { label: habit.name ?? "Habit" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <HabitLogLauncher habitId={habit.id} />
            <GenericEditLauncher
              table="habits"
              row={habit}
              title="Edit habit"
              listHref="/life/plans/habits"
            />
          </div>
        }
      />

      <KPIGrid>
        <MetricCard
          label="Current streak"
          value={habit.streak ?? 0}
          icon={Flame}
          iconTone="amber"
        />
        <MetricCard
          label="Best streak"
          value={habit.longest_streak ?? 0}
          icon={Trophy}
          iconTone="violet"
        />
        <MetricCard
          label="Frequency"
          value={habit.frequency ?? "—"}
          icon={Repeat}
          iconTone="blue"
        />
        <MetricCard
          label="90-day completion"
          value={`${completionRate}%`}
          icon={Activity}
          iconTone="emerald"
        />
      </KPIGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <DetailCard title="Overview" className="lg:col-span-2">
          <div className="divide-y divide-border">
            <InfoRow
              label="Status"
              value={
                <StatusBadge tone={toneForStatus(habit.status)}>
                  {habit.status ?? "—"}
                </StatusBadge>
              }
            />
            <InfoRow label="Category" value={habit.category ?? "—"} />
            <InfoRow label="Frequency" value={habit.frequency ?? "—"} />
            <InfoRow label="Target" value={habit.target_description ?? "—"} />
            <InfoRow label="Added" value={formatDate(habit.created_at)} />
          </div>
        </DetailCard>

        <DetailCard title="Why">
          {habit.why ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{habit.why}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No reason captured.</p>
          )}
        </DetailCard>
      </div>

      <DetailCard title="Last 90 days">
        <HabitHeatmap logMap={Array.from(logMap.entries())} days={90} />
      </DetailCard>
    </div>
  )
}
