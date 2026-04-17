import { Compass, Eye, Hourglass, Infinity as InfinityIcon } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
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
export const metadata = { title: "Vision — Life | Suprans" }

interface GoalRow {
  id: string
  title: string | null
  horizon: string | null
  domain: string | null
  status: string | null
  completed_at: string | null
  progress: number | null
}

const HORIZONS = ["3_years", "10_years", "lifetime"]

async function fetchVision() {
  const { data, error } = await supabaseLife
    .from("life_goals")
    .select("id, title, horizon, domain, status, completed_at, progress")
    .in("horizon", HORIZONS)
    .order("horizon", { ascending: true })
    .limit(200)
  if (error) console.error("life.life_goals:", error.message)
  return (data ?? []) as GoalRow[]
}

export default async function LifeVisionPage() {
  const rows = await fetchVision()
  const byHorizon = (h: string) => rows.filter((r) => r.horizon === h).length

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Vision"
        subtitle={`${rows.length.toLocaleString("en-IN")} long-horizon goal${rows.length === 1 ? "" : "s"}`}
      />

      <KPIGrid>
        <MetricCard label="Total vision" value={rows.length} icon={Compass} iconTone="violet" />
        <MetricCard label="3 years" value={byHorizon("3_years")} icon={Eye} iconTone="blue" />
        <MetricCard label="10 years" value={byHorizon("10_years")} icon={Hourglass} iconTone="amber" />
        <MetricCard label="Lifetime" value={byHorizon("lifetime")} icon={InfinityIcon} iconTone="emerald" />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="Vision is empty"
          description="Write down what life should look like in 3, 10, and many years — the north star for every quarter."
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Horizon</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Progress</TableHead>
                <TableHead>Completed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.title ?? "Untitled"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.horizon ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.domain ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge tone={toneForStatus(r.status)}>{r.status ?? "—"}</StatusBadge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {r.progress !== null ? `${r.progress}%` : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.completed_at ? formatDate(r.completed_at) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
