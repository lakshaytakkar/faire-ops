import { supabase } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import {
  KanbanBoard,
  type KanbanCard,
  type KanbanColumn,
} from "@/components/shared/kanban-board"
import { formatDate } from "@/lib/format"
import type { StatusTone } from "@/components/shared/status-badge"

export const dynamic = "force-dynamic"

export const metadata = { title: "Tasks — Kanban | Development | Suprans" }

const COLUMNS: KanbanColumn[] = [
  { key: "not-started", label: "Not started", tone: "slate" },
  { key: "in-progress", label: "In progress", tone: "amber" },
  { key: "in-review", label: "In review", tone: "blue" },
  { key: "blocked", label: "Blocked", tone: "red" },
  { key: "completed", label: "Completed", tone: "emerald" },
]

const PRIORITY_TONE: Record<string, StatusTone> = {
  urgent: "red",
  high: "amber",
  medium: "blue",
  low: "slate",
}

interface TaskRow {
  id: string
  task_number: number | null
  title: string
  description: string | null
  status: string
  priority: string
  assignee: string | null
  due_date: string | null
  tags: string[] | null
  updated_at: string | null
}

export default async function DevelopmentTasksKanbanPage() {
  const { data: raw } = await supabase
    .from("tasks")
    .select(
      "id, task_number, title, description, status, priority, assignee, due_date, tags, updated_at",
    )
    .eq("space_slug", "development")
    .order("updated_at", { ascending: false })
    .limit(500)

  const tasks: TaskRow[] = (raw ?? []).map((t) => ({
    id: t.id as string,
    task_number: (t.task_number as number | null) ?? null,
    title: t.title as string,
    description: (t.description as string | null) ?? null,
    status: (t.status as string) ?? "not-started",
    priority: (t.priority as string) ?? "medium",
    assignee: (t.assignee as string | null) ?? null,
    due_date: (t.due_date as string | null) ?? null,
    tags: Array.isArray(t.tags) ? (t.tags as string[]) : [],
    updated_at: (t.updated_at as string | null) ?? null,
  }))

  const cards: KanbanCard[] = tasks.map((task) => ({
    id: task.id,
    columnKey: task.status,
    title: `#${task.task_number ?? "—"} · ${task.title}`,
    subtitle: task.assignee ?? "Unassigned",
    meta: task.due_date ? `due ${formatDate(task.due_date)}` : undefined,
    badge: {
      label: task.priority,
      tone: PRIORITY_TONE[task.priority] ?? "slate",
    },
  }))

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Tasks — Kanban"
        subtitle={`${tasks.length} tasks across ${COLUMNS.length} columns`}
      />
      <KanbanBoard columns={COLUMNS} cards={cards} />
    </div>
  )
}
