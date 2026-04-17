import { GraduationCap, PlayCircle, CheckCircle2, Percent } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { GenericAddLauncher } from "../../_components/GenericEditLauncher"
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
export const metadata = { title: "Courses — Life | Suprans" }

interface CourseRow {
  id: string
  title: string | null
  platform: string | null
  status: string | null
  progress_pct: number | null
  started_at: string | null
  finished_at: string | null
}

async function fetchCourses() {
  const { data, error } = await supabaseLife
    .from("courses")
    .select("id, title, platform, status, progress_pct, started_at, finished_at")
    .order("started_at", { ascending: false, nullsFirst: false })
    .limit(200)
  if (error) console.error("life.courses:", error.message)
  return (data ?? []) as CourseRow[]
}

export default async function LifeCoursesPage() {
  const rows = await fetchCourses()
  const inProgress = rows.filter((r) => r.status === "in_progress").length
  const completed = rows.filter((r) => r.status === "complete").length
  const progressVals = rows
    .map((r) => r.progress_pct)
    .filter((n): n is number => typeof n === "number")
  const avgProgress = progressVals.length
    ? Math.round(progressVals.reduce((a, b) => a + b, 0) / progressVals.length)
    : null

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Courses"
        subtitle={`${rows.length.toLocaleString("en-IN")} course${rows.length === 1 ? "" : "s"}`}
        actions={
          <GenericAddLauncher
            table="courses"
            listHref="/life/growth/courses"
            title="New course"
          />
        }
      />

      <KPIGrid>
        <MetricCard label="In progress" value={inProgress} icon={PlayCircle} iconTone="amber" />
        <MetricCard label="Completed" value={completed} icon={CheckCircle2} iconTone="emerald" />
        <MetricCard
          label="Avg progress"
          value={avgProgress !== null ? `${avgProgress}%` : "—"}
          icon={Percent}
          iconTone="violet"
        />
        <MetricCard label="Total enrolled" value={rows.length} icon={GraduationCap} iconTone="blue" />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No courses tracked"
          description="Courses you started, paused, or finished — log them so progress doesn't disappear into a tab."
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Progress</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Finished</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-sm">{r.title ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.platform ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge tone={toneForStatus(r.status)}>{r.status ?? "—"}</StatusBadge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {r.progress_pct !== null ? `${r.progress_pct}%` : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.started_at)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.finished_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
