import { notFound } from "next/navigation"
import { Briefcase, CalendarDays, Flag, Activity } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { formatDate } from "@/lib/format"
import { GenericEditLauncher } from "../../../_components/GenericEditLauncher"
import { MilestoneLauncher } from "./MilestoneLauncher"

export const dynamic = "force-dynamic"

type Params = { id: string }

export default async function LifeProjectDetailPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params

  const [projectRes, milestonesRes] = await Promise.all([
    supabaseLife
      .from("personal_projects")
      .select(
        "id, name, category, description, status, progress, start_date, target_date, next_action, notes, created_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabaseLife
      .from("project_milestones")
      .select("id, title, due_date, done, created_at")
      .eq("project_id", id)
      .order("due_date", { ascending: true, nullsFirst: false }),
  ])

  if (!projectRes.data) notFound()
  const project = projectRes.data as {
    id: string
    name: string | null
    category: string | null
    description: string | null
    status: string | null
    progress: number | null
    start_date: string | null
    target_date: string | null
    next_action: string | null
    notes: string | null
    created_at: string | null
  }
  const milestones = milestonesRes.data ?? []

  const doneCount = milestones.filter((m) => m.done).length

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title={project.name ?? "Untitled project"}
        subtitle={project.description ?? project.category ?? undefined}
        breadcrumbs={[
          { label: "Life", href: "/life" },
          { label: "Projects", href: "/life/plans/projects" },
          { label: project.name ?? "Project" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <MilestoneLauncher projectId={project.id} />
            <GenericEditLauncher
              table="personal_projects"
              row={project}
              title="Edit project"
              listHref="/life/plans/projects"
            />
          </div>
        }
      />

      <KPIGrid>
        <MetricCard
          label="Progress"
          value={project.progress !== null ? `${project.progress}%` : "—"}
          icon={Flag}
          iconTone="emerald"
        />
        <MetricCard
          label="Target date"
          value={formatDate(project.target_date)}
          icon={CalendarDays}
          iconTone="blue"
        />
        <MetricCard
          label="Milestones"
          value={`${doneCount} / ${milestones.length}`}
          icon={Briefcase}
          iconTone="amber"
        />
        <MetricCard
          label="Status"
          value={project.status ?? "—"}
          icon={Activity}
          iconTone="violet"
        />
      </KPIGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <DetailCard title="Overview" className="lg:col-span-2">
          <div className="divide-y divide-border">
            <InfoRow
              label="Status"
              value={
                <StatusBadge tone={toneForStatus(project.status)}>
                  {project.status ?? "—"}
                </StatusBadge>
              }
            />
            <InfoRow label="Category" value={project.category ?? "—"} />
            <InfoRow label="Next action" value={project.next_action ?? "—"} />
            <InfoRow label="Start date" value={formatDate(project.start_date)} />
            <InfoRow label="Target date" value={formatDate(project.target_date)} />
            <InfoRow label="Created" value={formatDate(project.created_at)} />
          </div>
        </DetailCard>

        <DetailCard title="Notes">
          {project.notes ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {project.notes}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">No notes yet.</p>
          )}
        </DetailCard>
      </div>

      <DetailCard title={`Milestones (${milestones.length})`}>
        {milestones.length === 0 ? (
          <EmptyState
            icon={Flag}
            title="No milestones"
            description="Break this project into deliverables so progress stays real."
          />
        ) : (
          <ul className="divide-y divide-border">
            {milestones.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between py-2.5 gap-3"
              >
                <div className="min-w-0 flex items-center gap-3">
                  <span
                    className={
                      m.done
                        ? "size-2 rounded-full bg-emerald-500 shrink-0"
                        : "size-2 rounded-full bg-slate-300 shrink-0"
                    }
                  />
                  <span className="text-sm truncate">
                    {m.title ?? "Untitled milestone"}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {m.due_date && (
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {formatDate(m.due_date)}
                    </span>
                  )}
                  <StatusBadge tone={m.done ? "emerald" : "amber"}>
                    {m.done ? "Done" : "Open"}
                  </StatusBadge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DetailCard>
    </div>
  )
}
