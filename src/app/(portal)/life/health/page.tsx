import { Moon, Dumbbell, Smile, HeartPulse, Activity } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { DetailCard } from "@/components/shared/detail-views"
import { formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Health — Life | Suprans" }

interface SleepRow {
  date: string | null
  hours: number | null
  quality: number | null
}
interface WorkoutRow {
  id: string
  date: string | null
  type: string | null
  duration_mins: number | null
  energy_level: number | null
}
interface MoodRow {
  mood: number | null
  date: string | null
}
interface VitalRow {
  weight_kg: number | null
  date: string | null
}

async function fetchHealth() {
  const [sleep, workouts, mood, vitals] = await Promise.all([
    supabaseLife
      .from("sleep_logs")
      .select("date, hours, quality")
      .order("date", { ascending: false })
      .limit(14),
    supabaseLife
      .from("workout_logs")
      .select("id, date, type, duration_mins, energy_level")
      .order("date", { ascending: false })
      .limit(10),
    supabaseLife
      .from("mood_logs")
      .select("mood, date")
      .order("date", { ascending: false })
      .limit(30),
    supabaseLife
      .from("vital_logs")
      .select("weight_kg, date")
      .order("date", { ascending: false })
      .limit(50),
  ])
  if (sleep.error) console.error("life.sleep_logs:", sleep.error.message)
  if (workouts.error) console.error("life.workout_logs:", workouts.error.message)
  if (mood.error) console.error("life.mood_logs:", mood.error.message)
  if (vitals.error) console.error("life.vital_logs:", vitals.error.message)

  return {
    sleep: (sleep.data ?? []) as SleepRow[],
    workouts: (workouts.data ?? []) as WorkoutRow[],
    mood: (mood.data ?? []) as MoodRow[],
    vitals: (vitals.data ?? []) as VitalRow[],
  }
}

function avg(nums: (number | null)[]): number | null {
  const v = nums.filter((n): n is number => typeof n === "number")
  if (!v.length) return null
  return Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10
}

export default async function LifeHealthPage() {
  const { sleep, workouts, mood, vitals } = await fetchHealth()

  const weekSleep = sleep.slice(0, 7).map((s) => s.hours)
  const avgSleep = avg(weekSleep)

  const now = new Date()
  const workoutsThisMonth = workouts.filter((w) => {
    if (!w.date) return false
    const d = new Date(w.date)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }).length

  const avgMood = avg(mood.map((m) => m.mood))
  const latestWeight = vitals.find((v) => typeof v.weight_kg === "number")

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader title="Health" subtitle="Body, mind, and recovery at a glance." />

      <KPIGrid>
        <MetricCard
          label="Avg sleep (week)"
          value={avgSleep !== null ? `${avgSleep} hr` : "—"}
          icon={Moon}
          iconTone="violet"
        />
        <MetricCard
          label="Workouts this month"
          value={workoutsThisMonth}
          icon={Dumbbell}
          iconTone="emerald"
        />
        <MetricCard
          label="Avg mood"
          value={avgMood !== null ? `${avgMood} / 10` : "—"}
          icon={Smile}
          iconTone="amber"
        />
        <MetricCard
          label="Latest weight"
          value={
            latestWeight && latestWeight.weight_kg !== null
              ? `${latestWeight.weight_kg} kg`
              : "—"
          }
          icon={HeartPulse}
          iconTone="red"
        />
      </KPIGrid>

      <DetailCard title="Recent workouts">
        {workouts.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No workouts logged"
            description="Log sessions — even a 20-min walk. Consistency shows up on this list over weeks."
          />
        ) : (
          <ul className="divide-y divide-border">
            {workouts.map((w) => (
              <li key={w.id} className="flex items-center justify-between py-2.5 gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{w.type ?? "Workout"}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(w.date)}
                    {w.duration_mins ? ` · ${w.duration_mins} min` : ""}
                  </div>
                </div>
                <StatusBadge tone={toneForStatus(w.type)}>
                  {w.energy_level !== null ? `energy ${w.energy_level}/10` : "—"}
                </StatusBadge>
              </li>
            ))}
          </ul>
        )}
      </DetailCard>
    </div>
  )
}
