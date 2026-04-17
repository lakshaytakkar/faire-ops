import { Dumbbell, Timer, Flame, TrendingUp } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { GenericAddLauncher } from "../../_components/GenericEditLauncher"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import {
  TrendChartGrid,
  type TrendSeries,
} from "@/components/shared/trend-chart-grid"
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import { formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Fitness — Life | Suprans" }

interface WorkoutRow {
  id: string
  date: string | null
  type: string | null
  duration_mins: number | null
  energy_level: number | null
  notes: string | null
}

async function fetchWorkouts() {
  const { data, error } = await supabaseLife
    .from("workout_logs")
    .select("id, date, type, duration_mins, energy_level, notes")
    .order("date", { ascending: false })
    .limit(300)
  if (error) console.error("life.workout_logs:", error.message)
  return (data ?? []) as WorkoutRow[]
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d)
  const day = copy.getDay() // 0=Sun
  const diff = (day + 6) % 7 // Mon-start
  copy.setDate(copy.getDate() - diff)
  copy.setHours(0, 0, 0, 0)
  return copy
}

export default async function LifeFitnessPage() {
  const rows = await fetchWorkouts()

  const now = new Date()
  const sixtyDaysAgo = new Date(now)
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

  const window60 = rows.filter((r) => {
    if (!r.date) return false
    const d = new Date(r.date)
    return d >= sixtyDaysAgo && d <= now
  })

  // Aggregate per day — sum duration, avg energy
  const byDay = new Map<string, { duration: number; energySum: number; energyCount: number }>()
  for (const r of window60) {
    if (!r.date) continue
    const key = String(r.date).slice(0, 10)
    const bucket = byDay.get(key) ?? { duration: 0, energySum: 0, energyCount: 0 }
    bucket.duration += r.duration_mins ?? 0
    if (typeof r.energy_level === "number") {
      bucket.energySum += r.energy_level
      bucket.energyCount += 1
    }
    byDay.set(key, bucket)
  }
  const dayPoints = Array.from(byDay.entries())
    .map(([date, b]) => ({
      date,
      duration: b.duration,
      energy: b.energyCount ? b.energySum / b.energyCount : null,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const durationSeries: TrendSeries = {
    key: "duration",
    label: "Duration",
    unit: "min",
    data: dayPoints.map((p) => ({ x: p.date, y: p.duration })),
  }
  const energySeries: TrendSeries = {
    key: "energy",
    label: "Energy level",
    unit: "/10",
    data: dayPoints
      .filter((p) => p.energy !== null)
      .map((p) => ({ x: p.date, y: p.energy as number })),
  }

  const weekStart = startOfWeek(now)
  const weekRows = rows.filter((r) => {
    if (!r.date) return false
    const d = new Date(r.date)
    return d >= weekStart
  })
  const workoutsThisWeek = weekRows.length
  const minutesThisWeek = weekRows.reduce((s, r) => s + (r.duration_mins ?? 0), 0)
  const avgPerSession = workoutsThisWeek
    ? Math.round(minutesThisWeek / workoutsThisWeek)
    : 0

  // consistency streak: consecutive days up to today with at least one workout
  const loggedDates = new Set(
    rows.filter((r) => r.date).map((r) => String(r.date).slice(0, 10)),
  )
  let streak = 0
  const cursor = new Date(now)
  cursor.setHours(0, 0, 0, 0)
  while (streak < 400 && loggedDates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  // type breakdown
  const byType = new Map<string, number>()
  for (const r of rows) {
    const key = r.type ?? "—"
    byType.set(key, (byType.get(key) ?? 0) + 1)
  }
  const typeEntries = Array.from(byType.entries()).sort((a, b) => b[1] - a[1])

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Fitness"
        subtitle={`${rows.length.toLocaleString("en-IN")} workout${rows.length === 1 ? "" : "s"}`}
        actions={
          <GenericAddLauncher
            table="workout_logs"
            listHref="/life/health/fitness"
            title="Log workout"
          />
        }
      />

      <KPIGrid>
        <MetricCard
          label="Workouts this week"
          value={workoutsThisWeek}
          icon={Dumbbell}
          iconTone="emerald"
        />
        <MetricCard
          label="Minutes this week"
          value={minutesThisWeek.toLocaleString("en-IN")}
          icon={Timer}
          iconTone="blue"
        />
        <MetricCard
          label="Avg per session"
          value={avgPerSession ? `${avgPerSession} min` : "—"}
          icon={TrendingUp}
          iconTone="violet"
        />
        <MetricCard
          label="Consistency streak"
          value={`${streak} day${streak === 1 ? "" : "s"}`}
          icon={Flame}
          iconTone="amber"
        />
      </KPIGrid>

      <TrendChartGrid series={[durationSeries, energySeries]} columns={2} />

      {typeEntries.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {typeEntries.map(([type, count]) => (
            <StatusBadge key={type} tone="slate">
              {type} · {count}
            </StatusBadge>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          title="No workouts yet"
          description="Capture every session — strength, cardio, mobility. The log is the proof."
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Duration</TableHead>
                <TableHead className="text-right">Energy</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, 30).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm tabular-nums">{formatDate(r.date)}</TableCell>
                  <TableCell className="text-sm font-medium">{r.type ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {r.duration_mins !== null ? `${r.duration_mins} min` : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {r.energy_level !== null ? `${r.energy_level} / 10` : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {r.notes ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
