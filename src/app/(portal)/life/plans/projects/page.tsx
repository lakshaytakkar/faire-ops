import Link from "next/link"
import { FolderKanban, Pause, CheckCircle2, Percent } from "lucide-react"
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
export const metadata = { title: "Projects — Life | Suprans" }

interface ProjectRow {
  id: string
  name: string | null
  status: string | null
  category: string | null
  progress: number | null
  start_date: string | null
  target_date: string | null
}

async function fetchProjects() {
  const { data, error } = await supabaseLife
    .from("personal_projects")
    .select("id, name, status, category, progress, start_date, target_date")
    .order("progress", { ascending: false, nullsFirst: false })
    .limit(200)
  if (error) console.error("life.personal_projects:", error.message)
  return (data ?? []) as ProjectRow[]
}

export default async function LifeProjectsPage() {
  const rows = await fetchProjects()
  const active = rows.filter((r) => r.status === "in_progress").length
  const onHold = rows.filter((r) => r.status === "on_hold").length
  const done = rows.filter((r) => r.status === "complete").length
  const progressVals = rows
    .map((r) => r.progress)
    .filter((n): n is number => typeof n === "number")
  const avgProgress = progressVals.length
    ? Math.round(progressVals.reduce((a, b) => a + b, 0) / progressVals.length)
    : null

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Personal projects"
        subtitle={`${rows.length.toLocaleString("en-IN")} project${rows.length === 1 ? "" : "s"}`}
        actions={
          <GenericAddLauncher
            table="personal_projects"
            listHref="/life/plans/projects"
            title="New project"
          />
        }
      />

      <KPIGrid>
        <MetricCard label="Active" value={active} icon={FolderKanban} iconTone="emerald" />
        <MetricCard label="On hold" value={onHold} icon={Pause} iconTone="amber" />
        <MetricCard label="Done" value={done} icon={CheckCircle2} iconTone="blue" />
        <MetricCard
          label="Avg progress"
          value={avgProgress !== null ? `${avgProgress}%` : "—"}
          icon={Percent}
          iconTone="violet"
        />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No personal projects"
          description="Side projects are how you stay learning. Even one slot in progress beats none."
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Progress</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>Target</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-sm">
                    <Link
                      href={`/life/plans/projects/${r.id}`}
                      className="hover:text-primary"
                    >
                      {r.name ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.category ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge tone={toneForStatus(r.status)}>{r.status ?? "—"}</StatusBadge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {r.progress !== null ? `${r.progress}%` : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.start_date)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.target_date)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
