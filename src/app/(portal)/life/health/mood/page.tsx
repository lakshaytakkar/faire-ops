import { Smile, Flame, Sparkles, CalendarDays } from "lucide-react"
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
import { formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Mood — Life | Suprans" }

interface MoodRow {
  id: string
  date: string | null
  mood: number | null
  energy: number | null
  tag: string | null
  notes: string | null
}

async function fetchMood() {
  const { data, error } = await supabaseLife
    .from("mood_logs")
    .select("id, date, mood, energy, tag, notes")
    .order("date", { ascending: false })
    .limit(200)
  if (error) console.error("life.mood_logs:", error.message)
  return (data ?? []) as MoodRow[]
}

function avg(nums: (number | null | undefined)[]): number | null {
  const v = nums.filter((n): n is number => typeof n === "number")
  if (!v.length) return null
  return Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10
}

export default async function LifeMoodPage() {
  const rows = await fetchMood()

  const now = new Date()
  const sixtyDaysAgo = new Date(now)
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

  const window60 = rows.filter((r) => {
    if (!r.date) return false
    const d = new Date(r.date)
    return d >= sixtyDaysAgo && d <= now
  })

  const asc = [...window60]
    .filter((r) => r.date)
    .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())

  const moodSeries: TrendSeries = {
    key: "mood",
    label: "Mood",
    unit: "/10",
    data: asc
      .filter((r) => typeof r.mood === "number")
      .map((r) => ({ x: r.date as string, y: r.mood as number })),
  }
  const energySeries: TrendSeries = {
    key: "energy",
    label: "Energy",
    unit: "/10",
    data: asc
      .filter((r) => typeof r.energy === "number")
      .map((r) => ({ x: r.date as string, y: r.energy as number })),
  }

  const last7 = rows.slice(0, 7)
  const avgMood7 = avg(last7.map((r) => r.mood))
  const avgEnergy7 = avg(last7.map((r) => r.energy))
  const monthRows = rows.filter((r) => {
    if (!r.date) return false
    const d = new Date(r.date)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })
  const highDays = rows.filter(
    (r) => typeof r.mood === "number" && (r.mood as number) >= 8,
  ).length

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Mood"
        subtitle={`${rows.length.toLocaleString("en-IN")} entr${rows.length === 1 ? "y" : "ies"}`}
        actions={
          <GenericAddLauncher
            table="mood_logs"
            listHref="/life/health/mood"
            title="Log mood"
          />
        }
      />

      <KPIGrid>
        <MetricCard
          label="Avg mood (7d)"
          value={avgMood7 !== null ? `${avgMood7} / 10` : "—"}
          icon={Smile}
          iconTone="amber"
        />
        <MetricCard
          label="Avg energy (7d)"
          value={avgEnergy7 !== null ? `${avgEnergy7} / 10` : "—"}
          icon={Flame}
          iconTone="red"
        />
        <MetricCard
          label="High days (8+)"
          value={highDays}
          icon={Sparkles}
          iconTone="emerald"
        />
        <MetricCard
          label="Logs this month"
          value={monthRows.length}
          icon={CalendarDays}
          iconTone="blue"
        />
      </KPIGrid>

      <TrendChartGrid series={[moodSeries, energySeries]} columns={2} />

      {rows.length === 0 ? (
        <EmptyState
          title="No mood logs"
          description="A 30-second daily check-in builds the dataset that explains why bad weeks happen."
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Mood</TableHead>
                <TableHead className="text-right">Energy</TableHead>
                <TableHead>Tag</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, 30).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm tabular-nums">{formatDate(r.date)}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {r.mood !== null ? `${r.mood} / 10` : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {r.energy !== null ? `${r.energy} / 10` : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.tag ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-md truncate">
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
