import { ListTodo, User2, Calendar } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "By assignee — Tasks | Suprans",
  description: "Development tasks grouped by the person carrying them.",
}

type TaskRow = {
  id: string
  task_number: number
  title: string
  status: string
  priority: string
  assignee: string | null
  due_date: string | null
}

type Group = {
  name: string
  isUnassigned: boolean
  tasks: TaskRow[]
  openCount: number
}

const PRIORITY_TONE: Record<string, "red" | "amber" | "blue" | "slate"> = {
  urgent: "red",
  high: "red",
  medium: "amber",
  low: "blue",
}

const OPEN_STATES = new Set([
  "not-started",
  "in-progress",
  "in-review",
  "review",
  "blocked",
])

function humanize(s: string): string {
  return s
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

export default async function TasksByAssigneePage() {
  const { data: raw } = await supabase
    .from("tasks")
    .select("id, task_number, title, status, priority, assignee, due_date, sort_order, created_at")
    .eq("space_slug", "development")
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(500)

  const rows: TaskRow[] = (raw ?? []).map((t) => ({
    id: t.id as string,
    task_number: (t.task_number as number) ?? 0,
    title: t.title as string,
    status: (t.status as string) ?? "not-started",
    priority: (t.priority as string) ?? "medium",
    assignee: (t.assignee as string | null) ?? null,
    due_date: (t.due_date as string | null) ?? null,
  }))

  const groups = new Map<string, Group>()
  for (const r of rows) {
    const key = r.assignee ?? "__unassigned__"
    const cur = groups.get(key) ?? {
      name: r.assignee ?? "Unassigned",
      isUnassigned: !r.assignee,
      tasks: [],
      openCount: 0,
    }
    cur.tasks.push(r)
    if (OPEN_STATES.has(r.status)) cur.openCount++
    groups.set(key, cur)
  }

  const sorted = Array.from(groups.values()).sort((a, b) => {
    if (b.openCount !== a.openCount) return b.openCount - a.openCount
    return a.name.localeCompare(b.name)
  })

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Tasks by assignee"
        subtitle={`${rows.length} development tasks across ${sorted.length} ${sorted.length === 1 ? "person" : "people"} — sorted by open workload.`}
      />

      {sorted.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="No tasks yet"
          description="Insert rows into public.tasks with space_slug='development' to populate this view."
        />
      ) : (
        <div className="space-y-5">
          {sorted.map((group) => (
            <DetailCard
              key={group.name}
              title={group.name}
              actions={
                <div className="flex items-center gap-2">
                  {group.openCount > 0 && (
                    <StatusBadge tone="amber">{group.openCount} open</StatusBadge>
                  )}
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {group.tasks.length} total
                  </span>
                </div>
              }
            >
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left text-xs font-medium text-muted-foreground pb-2 w-16">#</th>
                    <th className="text-left text-xs font-medium text-muted-foreground pb-2">Title</th>
                    <th className="text-left text-xs font-medium text-muted-foreground pb-2">Status</th>
                    <th className="text-left text-xs font-medium text-muted-foreground pb-2">Priority</th>
                    <th className="text-right text-xs font-medium text-muted-foreground pb-2">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {group.tasks.map((t) => (
                    <tr key={t.id} className="border-b last:border-b-0">
                      <td className="py-2.5 text-sm text-muted-foreground tabular-nums">
                        #{t.task_number}
                      </td>
                      <td className="py-2.5 max-w-xl">
                        <div className="text-sm font-medium truncate">{t.title}</div>
                      </td>
                      <td className="py-2.5">
                        <StatusBadge tone={toneForStatus(t.status)}>
                          {humanize(t.status)}
                        </StatusBadge>
                      </td>
                      <td className="py-2.5">
                        <StatusBadge tone={PRIORITY_TONE[t.priority] ?? "slate"}>
                          {humanize(t.priority)}
                        </StatusBadge>
                      </td>
                      <td className="py-2.5 text-right text-sm text-muted-foreground tabular-nums whitespace-nowrap">
                        {t.due_date ? (
                          <span className="inline-flex items-center gap-1 justify-end">
                            <Calendar className="size-3" />
                            {new Date(t.due_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {group.isUnassigned && (
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <User2 className="size-3" />
                  These tasks have no assignee yet.
                </div>
              )}
            </DetailCard>
          ))}
        </div>
      )}
    </div>
  )
}
