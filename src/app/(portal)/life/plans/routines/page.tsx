import { Clock, Sun, Moon, Hash } from "lucide-react"
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

export const dynamic = "force-dynamic"
export const metadata = { title: "Routines — Life | Suprans" }

interface RoutineRow {
  id: string
  name: string | null
  time_of_day: string | null
  duration_mins: number | null
  active: boolean | null
}

async function fetchRoutines() {
  const { data, error } = await supabaseLife
    .from("routines")
    .select("id, name, time_of_day, duration_mins, active")
    .order("time_of_day", { ascending: true })
    .limit(200)
  if (error) console.error("life.routines:", error.message)
  return (data ?? []) as RoutineRow[]
}

export default async function LifeRoutinesPage() {
  const rows = await fetchRoutines()
  const totalDuration = rows.reduce((s, r) => s + (r.duration_mins ?? 0), 0)
  const morning = rows.filter((r) => (r.time_of_day ?? "").toLowerCase().includes("morning")).length
  const evening = rows.filter((r) => (r.time_of_day ?? "").toLowerCase().includes("evening")).length

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        actions={
          <GenericAddLauncher
            table="routines"
            listHref="/life/plans/routines"
            title="New routine"
            defaults={{ active: true }}
          />
        }
        title="Routines"
        subtitle={`${rows.length.toLocaleString("en-IN")} routine${rows.length === 1 ? "" : "s"}`}
      />

      <KPIGrid>
        <MetricCard label="Total routines" value={rows.length} icon={Hash} iconTone="blue" />
        <MetricCard
          label="Total minutes"
          value={totalDuration.toLocaleString("en-IN")}
          icon={Clock}
          iconTone="amber"
        />
        <MetricCard label="Morning" value={morning} icon={Sun} iconTone="emerald" />
        <MetricCard label="Evening" value={evening} icon={Moon} iconTone="violet" />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No routines defined"
          description="Stack habits into a sequence — morning, work-shutdown, evening. Less decision fatigue, more flow."
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Time of day</TableHead>
                <TableHead className="text-right">Duration</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-sm">{r.name ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.time_of_day ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {r.duration_mins !== null ? `${r.duration_mins} min` : "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={r.active ? "emerald" : "slate"}>
                      {r.active ? "active" : "inactive"}
                    </StatusBadge>
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
