import { Moon, Star, BedDouble, CheckCircle2 } from "lucide-react"
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
export const metadata = { title: "Sleep — Life | Suprans" }

interface SleepRow {
  id: string
  date: string | null
  bedtime: string | null
  wake_time: string | null
  hours: number | null
  quality: number | null
  notes: string | null
}

async function fetchSleep() {
  const { data, error } = await supabaseLife
    .from("sleep_logs")
    .select("id, date, bedtime, wake_time, hours, quality, notes")
    .order("date", { ascending: false })
    .limit(200)
  if (error) console.error("life.sleep_logs:", error.message)
  return (data ?? []) as SleepRow[]
}

function avg(nums: (number | null | undefined)[]): number | null {
  const v = nums.filter((n): n is number => typeof n === "number")
  if (!v.length) return null
  return Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10
}

export default async function LifeSleepPage() {
  const rows = await fetchSleep()

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

  const hoursSeries: TrendSeries = {
    key: "hours",
    label: "Hours slept",
    unit: "hrs",
    data: asc
      .filter((r) => typeof r.hours === "number")
      .map((r) => ({ x: r.date as string, y: r.hours as number })),
  }
  const qualitySeries: TrendSeries = {
    key: "quality",
    label: "Quality",
    unit: "/10",
    data: asc
      .filter((r) => typeof r.quality === "number")
      .map((r) => ({ x: r.date as string, y: r.quality as number })),
  }

  const last7 = rows.slice(0, 7)
  const avgHours7 = avg(last7.map((r) => r.hours))
  const avgQuality7 = avg(last7.map((r) => r.quality))
  // Consistency: % of last 7 days with a log
  const consistency = Math.round((last7.length / 7) * 100)
  const nightsLogged = rows.length

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Sleep"
        subtitle={`${rows.length.toLocaleString("en-IN")} night${rows.length === 1 ? "" : "s"} logged`}
        actions={
          <GenericAddLauncher
            table="sleep_logs"
            listHref="/life/health/sleep"
            title="Log sleep"
          />
        }
      />

      <KPIGrid>
        <MetricCard
          label="Avg hours (7d)"
          value={avgHours7 !== null ? avgHours7 : "—"}
          icon={Moon}
          iconTone="violet"
        />
        <MetricCard
          label="Avg quality (7d)"
          value={avgQuality7 !== null ? `${avgQuality7} / 10` : "—"}
          icon={Star}
          iconTone="amber"
        />
        <MetricCard
          label="Consistency (7d)"
          value={`${consistency}%`}
          icon={CheckCircle2}
          iconTone="emerald"
        />
        <MetricCard
          label="Nights logged"
          value={nightsLogged}
          icon={BedDouble}
          iconTone="blue"
        />
      </KPIGrid>

      <TrendChartGrid series={[hoursSeries, qualitySeries]} columns={2} />

      {rows.length === 0 ? (
        <EmptyState
          title="No sleep logs"
          description="Track bedtime and hours. The longest cause-effect chain in your day starts here."
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Bedtime</TableHead>
                <TableHead>Wake</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Quality</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, 30).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm tabular-nums">{formatDate(r.date)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground tabular-nums">
                    {r.bedtime ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground tabular-nums">
                    {r.wake_time ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {r.hours ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {r.quality !== null ? `${r.quality} / 10` : "—"}
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
