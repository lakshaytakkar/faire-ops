import { AlertTriangle, AlertOctagon, AlertCircle, Info } from "lucide-react"
import Link from "next/link"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { GenericAddLauncher } from "../_components/GenericEditLauncher"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge"
import {
  KanbanBoard,
  type KanbanCard,
  type KanbanColumn,
} from "@/components/shared/kanban-board"
import { formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Issues — Life | Suprans" }

interface IssueRow {
  id: string
  title: string | null
  description: string | null
  domain: string | null
  severity: string | null
  status: string | null
  target_date: string | null
  notes: string | null
}

async function fetchIssues() {
  const { data, error } = await supabaseLife
    .from("life_issues")
    .select("id, title, description, domain, severity, status, target_date, notes")
    .order("created_at", { ascending: false })
    .limit(300)
  if (error) console.error("life.life_issues:", error.message)
  return (data ?? []) as IssueRow[]
}

const COLUMNS: KanbanColumn[] = [
  { key: "critical", label: "Critical", tone: "red" },
  { key: "high", label: "High", tone: "amber" },
  { key: "medium", label: "Medium", tone: "blue" },
  { key: "low", label: "Low", tone: "slate" },
]

function statusTone(status: string | null): StatusTone {
  switch (status) {
    case "open":
      return "amber"
    case "in_progress":
      return "blue"
    case "resolved":
      return "emerald"
    case "archived":
      return "slate"
    default:
      return "slate"
  }
}

export default async function LifeIssuesPage() {
  const rows = await fetchIssues()

  const critical = rows.filter((r) => r.severity === "critical").length
  const high = rows.filter((r) => r.severity === "high").length
  const medium = rows.filter((r) => r.severity === "medium").length
  const low = rows.filter((r) => r.severity === "low").length

  const activeRows = rows.filter((r) => r.status !== "archived")
  const archivedRows = rows.filter((r) => r.status === "archived")

  const cards: KanbanCard[] = activeRows
    .filter((r) => r.severity && COLUMNS.some((c) => c.key === r.severity))
    .map((r) => {
      const metaParts: string[] = []
      if (r.status) metaParts.push(r.status)
      if (r.target_date) metaParts.push(`target ${formatDate(r.target_date)}`)
      return {
        id: r.id,
        columnKey: r.severity as string,
        title: r.title ?? "Untitled",
        subtitle: r.domain ?? undefined,
        meta: metaParts.length ? metaParts.join(" · ") : undefined,
        href: `/life/issues/${r.id}`,
        badge: r.status
          ? { label: r.status.replace(/_/g, " "), tone: statusTone(r.status) }
          : undefined,
      }
    })

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Issues"
        subtitle={`${rows.length.toLocaleString("en-IN")} issue${rows.length === 1 ? "" : "s"}`}
        actions={
          <GenericAddLauncher
            table="life_issues"
            listHref="/life/issues"
            title="New issue"
          />
        }
      />

      <KPIGrid>
        <MetricCard label="Critical" value={critical} icon={AlertOctagon} iconTone="red" />
        <MetricCard label="High" value={high} icon={AlertTriangle} iconTone="amber" />
        <MetricCard label="Medium" value={medium} icon={AlertCircle} iconTone="blue" />
        <MetricCard label="Low" value={low} icon={Info} iconTone="slate" />
      </KPIGrid>

      <KanbanBoard
        columns={COLUMNS}
        cards={cards}
        emptyColumnMessage="No issues at this severity"
      />

      {archivedRows.length > 0 && (
        <DetailCard title={`Archived (${archivedRows.length})`}>
          <ul className="divide-y">
            {archivedRows.map((r) => (
              <li key={r.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/life/issues/${r.id}`}
                    className="text-sm font-medium text-foreground hover:text-primary truncate block"
                  >
                    {r.title ?? "Untitled"}
                  </Link>
                  <div className="text-sm text-muted-foreground tabular-nums">
                    {r.domain ?? "—"}
                    {r.target_date ? ` · target ${formatDate(r.target_date)}` : ""}
                  </div>
                </div>
                <StatusBadge tone="slate">archived</StatusBadge>
              </li>
            ))}
          </ul>
        </DetailCard>
      )}
    </div>
  )
}
