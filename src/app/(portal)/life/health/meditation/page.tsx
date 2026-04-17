import { Brain, Timer, Calendar, Sparkles } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { GenericAddLauncher } from "../../_components/GenericEditLauncher"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Meditation — Life | Suprans" }

interface MeditationRow {
  id: string
  date: string | null
  duration_mins: number | null
  type: string | null
  notes: string | null
}

async function fetchMeditation() {
  const { data, error } = await supabaseLife
    .from("meditation_logs")
    .select("id, date, duration_mins, type, notes")
    .order("date", { ascending: false })
    .limit(200)
  if (error) console.error("life.meditation_logs:", error.message)
  return (data ?? []) as MeditationRow[]
}

export default async function LifeMeditationPage() {
  const rows = await fetchMeditation()
  const now = new Date()
  const monthRows = rows.filter((r) => {
    if (!r.date) return false
    const d = new Date(r.date)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })
  const monthMinutes = monthRows.reduce((s, r) => s + (r.duration_mins ?? 0), 0)
  const totalMinutes = rows.reduce((s, r) => s + (r.duration_mins ?? 0), 0)
  const techniques = new Set(rows.map((r) => r.type).filter(Boolean)).size

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Meditation"
        subtitle={`${rows.length.toLocaleString("en-IN")} session${rows.length === 1 ? "" : "s"}`}
        actions={
          <GenericAddLauncher
            table="meditation_logs"
            listHref="/life/health/meditation"
            title="Log session"
          />
        }
      />

      <KPIGrid>
        <MetricCard label="Sessions this month" value={monthRows.length} icon={Brain} iconTone="violet" />
        <MetricCard
          label="Minutes this month"
          value={monthMinutes.toLocaleString("en-IN")}
          icon={Timer}
          iconTone="amber"
        />
        <MetricCard
          label="Lifetime minutes"
          value={totalMinutes.toLocaleString("en-IN")}
          icon={Sparkles}
          iconTone="emerald"
        />
        <MetricCard label="Techniques tried" value={techniques} icon={Calendar} iconTone="blue" />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={Brain}
          title="No sessions logged"
          description="Five minutes counts. Capture each sit and watch the lifetime number compound."
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Technique</TableHead>
                <TableHead className="text-right">Duration</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm">{formatDate(r.date)}</TableCell>
                  <TableCell>
                    {r.type ? <StatusBadge tone="violet">{r.type}</StatusBadge> : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {r.duration_mins !== null ? `${r.duration_mins} min` : "—"}
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
