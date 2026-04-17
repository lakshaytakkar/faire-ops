"use client"

import { useMemo, useState } from "react"
import { Calendar, User2 } from "lucide-react"
import { FilterBar, type FilterTab } from "@/components/shared/filter-bar"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { LargeModal, DetailCard, InfoRow } from "@/components/shared/detail-views"

export interface DevTaskRow {
  id: string
  task_number: number
  title: string
  description: string | null
  status: string
  priority: string
  assignee: string | null
  due_date: string | null
  tags: string[]
  parent_id: string | null
  depth: number
  sort_order: number
  created_at: string | null
  updated_at: string | null
}

const PRIORITY_TONE: Record<string, "red" | "amber" | "blue" | "slate"> = {
  urgent: "red",
  high: "red",
  medium: "amber",
  low: "blue",
}

export function TasksClient({ rows }: { rows: DevTaskRow[] }) {
  const [search, setSearch] = useState("")
  const [activeStatus, setActiveStatus] = useState("all")
  const [activePriority, setActivePriority] = useState("all")
  const [selected, setSelected] = useState<DevTaskRow | null>(null)

  const statusTabs: FilterTab[] = useMemo(() => {
    const counts = rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1
      return acc
    }, {})
    const order = ["not-started", "in-progress", "in-review", "completed", "blocked"]
    return [
      { id: "all", label: "All", count: rows.length },
      ...order.map((s) => ({ id: s, label: humanize(s), count: counts[s] ?? 0 })),
    ]
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (activeStatus !== "all" && r.status !== activeStatus) return false
      if (activePriority !== "all" && r.priority !== activePriority) return false
      if (search) {
        const needle = search.toLowerCase()
        const hay = [r.title, r.description, r.assignee, ...r.tags].filter(Boolean).join(" ").toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [rows, activeStatus, activePriority, search])

  return (
    <>
      <FilterBar
        search={{ value: search, onChange: setSearch, placeholder: "Search tasks…" }}
        tabs={statusTabs}
        activeTab={activeStatus}
        onTabChange={setActiveStatus}
        right={
          <select
            value={activePriority}
            onChange={(e) => setActivePriority(e.target.value)}
            className="h-8 rounded-md border border-input bg-transparent px-2.5 text-xs"
          >
            <option value="all">All priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        }
      />

      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/30 border-b">
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-14">#</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Title</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Status</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Priority</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Assignee</th>
              <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Due</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr
                key={r.id}
                onClick={() => setSelected(r)}
                className="border-b last:border-b-0 cursor-pointer hover:bg-muted/40 transition-colors"
              >
                <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">#{r.task_number}</td>
                <td className="px-4 py-3 max-w-xl">
                  <div className="text-sm font-medium truncate">{r.title}</div>
                  {r.description && (
                    <div className="text-xs text-muted-foreground truncate">{r.description}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge tone={toneForStatus(r.status)}>{humanize(r.status)}</StatusBadge>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge tone={PRIORITY_TONE[r.priority] ?? "slate"}>{humanize(r.priority)}</StatusBadge>
                </td>
                <td className="px-4 py-3 text-sm">
                  {r.assignee ? (
                    <span className="inline-flex items-center gap-1">
                      <User2 className="size-3 text-muted-foreground" />
                      {r.assignee}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Unassigned</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                  {r.due_date ? (
                    <span className="inline-flex items-center gap-1 justify-end">
                      <Calendar className="size-3" />
                      {new Date(r.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No tasks match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <LargeModal title={selected.title} onClose={() => setSelected(null)}>
          <div className="space-y-4">
            <DetailCard title="Summary">
              <InfoRow label="Task #" value={`#${selected.task_number}`} />
              <InfoRow
                label="Status"
                value={<StatusBadge tone={toneForStatus(selected.status)}>{humanize(selected.status)}</StatusBadge>}
              />
              <InfoRow
                label="Priority"
                value={<StatusBadge tone={PRIORITY_TONE[selected.priority] ?? "slate"}>{humanize(selected.priority)}</StatusBadge>}
              />
              <InfoRow label="Assignee" value={selected.assignee ?? "Unassigned"} />
              <InfoRow
                label="Due date"
                value={
                  selected.due_date
                    ? new Date(selected.due_date).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "—"
                }
              />
              <InfoRow
                label="Created"
                value={selected.created_at ? new Date(selected.created_at).toLocaleString() : "—"}
              />
            </DetailCard>
            {selected.description && (
              <DetailCard title="Description">
                <p className="text-sm whitespace-pre-wrap">{selected.description}</p>
              </DetailCard>
            )}
            {selected.tags.length > 0 && (
              <DetailCard title="Tags">
                <div className="flex flex-wrap gap-1.5">
                  {selected.tags.map((tag) => (
                    <StatusBadge key={tag} tone="slate">
                      {tag}
                    </StatusBadge>
                  ))}
                </div>
              </DetailCard>
            )}
          </div>
        </LargeModal>
      )}
    </>
  )
}

function humanize(s: string): string {
  return s
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}
