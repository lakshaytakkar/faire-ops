import { Map as MapIcon } from "lucide-react"
import { supabaseUsdrop } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { DetailCard } from "@/components/shared/detail-views"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { Badge } from "@/components/ui/badge"

export const dynamic = "force-dynamic"
export const metadata = { title: "Roadmap — USDrop | Suprans" }

type Stage = {
  id: string
  number: number | null
  title: string | null
  phase: string | null
  order_index: number | null
  is_published: boolean | null
}

type Task = {
  id: string
  stage_id: string | null
  task_no: number | null
  title: string | null
  link: string | null
  order_index: number | null
  is_published: boolean | null
}

async function fetchRoadmap() {
  const [stages, tasks, progress] = await Promise.all([
    supabaseUsdrop
      .from("roadmap_stages")
      .select("id, number, title, phase, order_index, is_published")
      .order("order_index", { ascending: true }),
    supabaseUsdrop
      .from("roadmap_tasks")
      .select("id, stage_id, task_no, title, link, order_index, is_published")
      .order("order_index", { ascending: true }),
    supabaseUsdrop
      .from("roadmap_progress")
      .select("task_id, status")
      .eq("status", "completed"),
  ])
  const completionCounts = new Map<string, number>()
  for (const row of progress.data ?? []) {
    const key = (row as { task_id: string }).task_id
    if (key) completionCounts.set(key, (completionCounts.get(key) ?? 0) + 1)
  }
  return {
    stages: (stages.data ?? []) as Stage[],
    tasks: (tasks.data ?? []) as Task[],
    completionCounts,
  }
}

export default async function RoadmapPage() {
  const { stages, tasks, completionCounts } = await fetchRoadmap()

  return (
    <div className="space-y-5">
      <PageHeader
        title="Roadmap"
        subtitle={`${stages.length.toLocaleString("en-IN")} stages, ${tasks.length.toLocaleString("en-IN")} tasks`}
      />

      {stages.length === 0 ? (
        <EmptyState
          icon={MapIcon}
          title="No roadmap stages yet"
          description="The client journey from signup to first sale is authored here — publish a stage to show it in the app."
        />
      ) : (
        <div className="space-y-5">
          {stages.map((s) => {
            const stageTasks = tasks.filter((t) => t.stage_id === s.id)
            const completionsByTask = stageTasks.map((t) => completionCounts.get(t.id) ?? 0)
            const totalCompletions = completionsByTask.reduce((a, b) => a + b, 0)

            const title = s.title ?? "Untitled"
            const stageLabel = s.number !== null ? `Stage ${s.number} · ${title}` : title

            return (
              <DetailCard
                key={s.id}
                title={stageLabel}
                actions={
                  <div className="flex items-center gap-2">
                    {s.phase && <Badge variant="secondary">{s.phase}</Badge>}
                    <StatusBadge tone={toneForStatus(s.is_published ? "live" : "inactive")}>
                      {s.is_published ? "live" : "draft"}
                    </StatusBadge>
                  </div>
                }
              >
                <p className="text-sm text-muted-foreground mb-4">
                  {stageTasks.length} tasks · {totalCompletions.toLocaleString("en-IN")} total
                  completions across users
                </p>
                {stageTasks.length === 0 ? (
                  <EmptyState
                    icon={MapIcon}
                    title="No tasks in this stage"
                    description="Add a task to roadmap_tasks with this stage_id to populate the stage."
                  />
                ) : (
                  <ol className="space-y-2">
                    {stageTasks.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center gap-3 rounded-md border border-border/80 bg-background px-3 py-2"
                      >
                        <div className="size-7 rounded bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground shrink-0">
                          {t.task_no ?? "·"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{t.title ?? "Untitled"}</div>
                          {t.link && (
                            <div className="text-sm text-muted-foreground truncate">{t.link}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline">
                            {(completionCounts.get(t.id) ?? 0).toLocaleString("en-IN")} done
                          </Badge>
                          <StatusBadge tone={toneForStatus(t.is_published ? "live" : "inactive")}>
                            {t.is_published ? "live" : "draft"}
                          </StatusBadge>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </DetailCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
