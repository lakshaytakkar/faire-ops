import { Repeat, CheckCircle2, TrendingUp, Trophy } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { GenericAddLauncher } from "../../_components/GenericEditLauncher"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { CalendarGrid } from "@/components/shared/calendar-grid"
import { EmptyState } from "@/components/shared/empty-state"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"
export const metadata = { title: "Habits — Life | Suprans" }

interface HabitRow {
  id: string
  name: string | null
  category: string | null
  frequency: string | null
  status: string | null
}

interface HabitLogRow {
  id: string
  habit_id: string
  date: string | null
  status: string | null
  note: string | null
}

async function fetchHabitsAndLogs() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month + 1, 0)
  const fromStr = monthStart.toISOString().slice(0, 10)
  const toStr = monthEnd.toISOString().slice(0, 10)

  const [{ data: habitsData, error: habitsError }, { data: logsData, error: logsError }] =
    await Promise.all([
      supabaseLife
        .from("habits")
        .select("id, name, category, frequency, status")
        .order("name", { ascending: true })
        .limit(200),
      supabaseLife
        .from("habit_logs")
        .select("id, habit_id, date, status, note")
        .gte("date", fromStr)
        .lte("date", toStr)
        .limit(5000),
    ])

  if (habitsError) console.error("life.habits:", habitsError.message)
  if (logsError) console.error("life.habit_logs:", logsError.message)

  return {
    habits: (habitsData ?? []) as HabitRow[],
    logs: (logsData ?? []) as HabitLogRow[],
    year,
    month,
    monthStart,
    monthEnd,
  }
}

function dotClass(status: string | null | undefined): string {
  switch (status) {
    case "done":
      return "bg-emerald-500"
    case "skip":
      return "bg-amber-500"
    case "miss":
      return "bg-rose-400"
    default:
      return "bg-transparent"
  }
}

export default async function LifeHabitsPage() {
  const { habits, logs, year, month, monthStart, monthEnd } = await fetchHabitsAndLogs()

  const active = habits.filter((h) => h.status === "active")

  // logs index by habit + iso date
  const logsByHabitDate = new Map<string, HabitLogRow>()
  for (const l of logs) {
    if (!l.date) continue
    const key = `${l.habit_id}|${String(l.date).slice(0, 10)}`
    logsByHabitDate.set(key, l)
  }

  // monthly completions (status = done)
  const completionsThisMonth = logs.filter((l) => l.status === "done").length

  // Consistency %: done over total active-habit-days up to today this month
  const today = new Date()
  const todayMonth = today.getMonth() === month && today.getFullYear() === year ? today : monthEnd
  const daysElapsed =
    Math.floor((todayMonth.getTime() - monthStart.getTime()) / (24 * 60 * 60 * 1000)) + 1
  const totalSlots = Math.max(1, active.length * daysElapsed)
  const satisfied = logs.filter(
    (l) => l.status === "done" && active.some((h) => h.id === l.habit_id),
  ).length
  const consistencyPct = Math.round((satisfied / totalSlots) * 100)

  // top habit by done count this month
  const doneByHabit = new Map<string, number>()
  for (const l of logs) {
    if (l.status !== "done") continue
    doneByHabit.set(l.habit_id, (doneByHabit.get(l.habit_id) ?? 0) + 1)
  }
  let topHabitId: string | null = null
  let topHabitCount = 0
  for (const [hid, c] of doneByHabit) {
    if (c > topHabitCount) {
      topHabitCount = c
      topHabitId = hid
    }
  }
  const topHabitName = topHabitId
    ? habits.find((h) => h.id === topHabitId)?.name ?? "—"
    : "—"

  // Per-habit totals
  const perHabitTotals = habits.map((h) => {
    const hLogs = logs.filter((l) => l.habit_id === h.id)
    return {
      id: h.id,
      name: h.name ?? "—",
      done: hLogs.filter((l) => l.status === "done").length,
      skip: hLogs.filter((l) => l.status === "skip").length,
      miss: hLogs.filter((l) => l.status === "miss").length,
    }
  })

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Habits"
        subtitle={`${habits.length.toLocaleString("en-IN")} habit${habits.length === 1 ? "" : "s"}`}
        actions={
          <GenericAddLauncher
            table="habits"
            listHref="/life/plans/habits"
            title="New habit"
            defaults={{ status: "active", frequency: "daily" }}
          />
        }
      />

      <KPIGrid>
        <MetricCard
          label="Active habits"
          value={active.length}
          icon={Repeat}
          iconTone="emerald"
        />
        <MetricCard
          label="Completions this month"
          value={completionsThisMonth}
          icon={CheckCircle2}
          iconTone="blue"
        />
        <MetricCard
          label="Consistency"
          value={`${consistencyPct}%`}
          icon={TrendingUp}
          iconTone="violet"
        />
        <MetricCard
          label="Top habit"
          value={topHabitName}
          icon={Trophy}
          iconTone="amber"
          hint={topHabitCount ? `${topHabitCount} done` : undefined}
        />
      </KPIGrid>

      {habits.length === 0 ? (
        <EmptyState
          title="No habits yet"
          description="Pick one tiny habit. Make it stupidly easy. Log it daily. The system runs itself."
        />
      ) : (
        <div className="space-y-6">
          {habits.map((habit) => (
            <section key={habit.id} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold tracking-tight text-foreground truncate">
                    {habit.name ?? "—"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {[habit.category, habit.frequency, habit.status]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                </div>
              </div>
              <CalendarGrid
                year={year}
                month={month}
                render={(date) => {
                  if (date.getMonth() !== month) return null
                  const iso = date.toISOString().slice(0, 10)
                  const log = logsByHabitDate.get(`${habit.id}|${iso}`)
                  if (!log) return null
                  return (
                    <div className="flex items-center justify-start">
                      <span
                        className={cn("inline-block size-2.5 rounded-full", dotClass(log.status))}
                        aria-label={log.status ?? "no log"}
                      />
                    </div>
                  )
                }}
              />
            </section>
          ))}

          <section className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
              Month totals
            </div>
            <table className="w-full">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">
                    Habit
                  </th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-muted-foreground">
                    Done
                  </th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-muted-foreground">
                    Skip
                  </th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-muted-foreground">
                    Miss
                  </th>
                </tr>
              </thead>
              <tbody>
                {perHabitTotals.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="px-4 py-2 text-sm font-medium text-foreground">{t.name}</td>
                    <td className="px-4 py-2 text-right text-sm tabular-nums text-emerald-600">
                      {t.done}
                    </td>
                    <td className="px-4 py-2 text-right text-sm tabular-nums text-amber-600">
                      {t.skip}
                    </td>
                    <td className="px-4 py-2 text-right text-sm tabular-nums text-muted-foreground">
                      {t.miss}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </div>
  )
}
