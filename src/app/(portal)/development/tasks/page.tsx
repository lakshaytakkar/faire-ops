import { supabase } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
import { CheckSquare, Circle, Pause, AlertOctagon, ListTodo } from "lucide-react"
import { TasksClient, type DevTaskRow } from "./tasks-client"

export const dynamic = "force-dynamic"

export const metadata = { title: "Tasks — Development | Suprans" }

export default async function DevelopmentTasksPage() {
  const { data: raw } = await supabase
    .from("tasks")
    .select(
      "id, task_number, title, description, status, priority, assignee, due_date, tags, parent_id, depth, sort_order, created_at, updated_at",
    )
    .eq("space_slug", "development")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(500)

  const rows: DevTaskRow[] = (raw ?? []).map((t) => ({
    id: t.id as string,
    task_number: (t.task_number as number) ?? 0,
    title: t.title as string,
    description: (t.description as string | null) ?? null,
    status: (t.status as string) ?? "not-started",
    priority: (t.priority as string) ?? "medium",
    assignee: (t.assignee as string | null) ?? null,
    due_date: (t.due_date as string | null) ?? null,
    tags: Array.isArray(t.tags) ? (t.tags as string[]) : [],
    parent_id: (t.parent_id as string | null) ?? null,
    depth: (t.depth as number | null) ?? 0,
    sort_order: (t.sort_order as number | null) ?? 0,
    created_at: (t.created_at as string | null) ?? null,
    updated_at: (t.updated_at as string | null) ?? null,
  }))

  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Tasks"
        subtitle={`${rows.length} active development tasks. Filter by status, priority, or assignee.`}
      />

      <KPIGrid>
        <MetricCard
          label="In progress"
          value={counts["in-progress"] ?? 0}
          icon={Circle}
          iconTone="amber"
          hint="actively being worked"
        />
        <MetricCard
          label="Blocked"
          value={counts["blocked"] ?? 0}
          icon={AlertOctagon}
          iconTone="red"
          hint="waiting on someone"
        />
        <MetricCard
          label="In review"
          value={counts["in-review"] ?? counts["review"] ?? 0}
          icon={Pause}
          iconTone="blue"
          hint="awaiting approval"
        />
        <MetricCard
          label="Completed"
          value={counts["completed"] ?? counts["done"] ?? 0}
          icon={CheckSquare}
          iconTone="emerald"
          hint="shipped"
        />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="No development tasks yet"
          description="Insert rows into public.tasks with space_slug='development' to populate this view."
        />
      ) : (
        <TasksClient rows={rows} />
      )}
    </div>
  )
}
