"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronRight, Square, CheckSquare, Loader2, RefreshCw, ExternalLink, FolderKanban } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface ExternalTaskRow {
  id: string
  task_number: number | null
  title: string
  description: string | null
  status: string
  priority: string | null
  parent_id: string | null
  sort_order: number | null
  tags: string[] | null
  assignee: string | null
  created_at: string | null
}

interface ExternalTaskNode extends ExternalTaskRow {
  children: ExternalTaskNode[]
}

function isDone(status: string): boolean {
  return status === "done" || status === "completed"
}

function buildTree(rows: ExternalTaskRow[]): ExternalTaskNode[] {
  const byId = new Map<string, ExternalTaskNode>()
  rows.forEach((r) => byId.set(r.id, { ...r, children: [] }))
  const roots: ExternalTaskNode[] = []
  rows.forEach((r) => {
    const node = byId.get(r.id)!
    if (r.parent_id && byId.has(r.parent_id)) {
      byId.get(r.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  })
  const sortFn = (a: ExternalTaskNode, b: ExternalTaskNode) =>
    (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
    (a.task_number ?? 0) - (b.task_number ?? 0)
  const sortRec = (arr: ExternalTaskNode[]) => {
    arr.sort(sortFn)
    arr.forEach((n) => sortRec(n.children))
  }
  sortRec(roots)
  return roots
}

function flattenCount(nodes: ExternalTaskNode[]): { total: number; done: number } {
  let total = 0
  let done = 0
  const walk = (arr: ExternalTaskNode[]) => {
    arr.forEach((n) => {
      total++
      if (isDone(n.status)) done++
      walk(n.children)
    })
  }
  walk(nodes)
  return { total, done }
}

const STATUS_TONE: Record<string, string> = {
  todo: "bg-slate-100 text-slate-700",
  backlog: "bg-slate-50 text-slate-600",
  in_progress: "bg-amber-100 text-amber-800",
  "in-progress": "bg-amber-100 text-amber-800",
  under_review: "bg-blue-100 text-blue-800",
  "in-review": "bg-blue-100 text-blue-800",
  done: "bg-emerald-100 text-emerald-800",
  completed: "bg-emerald-100 text-emerald-800",
  blocked: "bg-red-100 text-red-800",
}

export function ExternalProjectsTab() {
  const [rows, setRows] = useState<ExternalTaskRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from("tasks")
      .select(
        "id, task_number, title, description, status, priority, parent_id, sort_order, tags, assignee, created_at",
      )
      .eq("space_slug", "external-projects")
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("task_number", { ascending: true, nullsFirst: false })
      .limit(500)
    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    setRows((data ?? []) as ExternalTaskRow[])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const tree = useMemo(() => buildTree(rows), [rows])
  const stats = useMemo(() => flattenCount(tree), [tree])

  // auto-expand all roots on first load
  useEffect(() => {
    if (tree.length && expanded.size === 0) {
      const all = new Set<string>()
      const walk = (arr: ExternalTaskNode[]) => {
        arr.forEach((n) => {
          if (n.children.length) all.add(n.id)
          walk(n.children)
        })
      }
      walk(tree)
      setExpanded(all)
    }
  }, [tree, expanded.size])

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleStatus = useCallback(
    async (row: ExternalTaskRow) => {
      const wasDone = isDone(row.status)
      const nextStatus = wasDone ? "todo" : "done"
      setUpdatingId(row.id)
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: nextStatus } : r)))
      const { error: err } = await supabase.from("tasks").update({ status: nextStatus }).eq("id", row.id)
      if (err) {
        setError(err.message)
        setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: row.status } : r)))
      }
      setUpdatingId(null)
    },
    [],
  )

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto w-full px-6 md:px-8 py-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading external projects…
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-[1440px] mx-auto w-full px-6 md:px-8 py-5">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">Failed to load external projects</p>
          <p className="text-xs text-red-700 mt-1">{error}</p>
          <button
            onClick={load}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-red-800 hover:text-red-900"
          >
            <RefreshCw className="size-3.5" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (tree.length === 0) {
    return (
      <div className="max-w-[1440px] mx-auto w-full px-6 md:px-8 py-5">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3">
            <FolderKanban className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold text-foreground">No external projects yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-md">
            Tasks in <code className="px-1 py-0.5 rounded bg-muted">public.tasks</code> with{" "}
            <code className="px-1 py-0.5 rounded bg-muted">space_slug = &quot;external-projects&quot;</code> will appear here.
          </p>
          <button
            onClick={load}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 px-3 py-1.5 rounded-md hover:bg-primary/5 transition-colors"
          >
            <RefreshCw className="size-3.5" />
            Refresh
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* progress bar */}
      {stats.total > 0 && (
        <div className="max-w-[1440px] mx-auto w-full px-6 md:px-8 pt-5">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${stats.total > 0 ? (stats.done / stats.total) * 100 : 0}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-muted-foreground tabular-nums">
              {stats.done} of {stats.total} done · Supabase-backed (space_slug: external-projects)
            </p>
            <button
              onClick={load}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
            >
              <RefreshCw className="size-3" />
              Refresh
            </button>
          </div>
        </div>
      )}

      <div className="max-w-[1440px] mx-auto w-full px-6 md:px-8 py-5 space-y-0.5">
        {tree.map((node) => (
          <ExternalNodeRow
            key={node.id}
            node={node}
            depth={0}
            expanded={expanded}
            onToggleExpand={toggleExpand}
            onToggleStatus={toggleStatus}
            updatingId={updatingId}
          />
        ))}
      </div>
    </>
  )
}

function ExternalNodeRow({
  node,
  depth,
  expanded,
  onToggleExpand,
  onToggleStatus,
  updatingId,
}: {
  node: ExternalTaskNode
  depth: number
  expanded: Set<string>
  onToggleExpand: (id: string) => void
  onToggleStatus: (row: ExternalTaskRow) => void
  updatingId: string | null
}) {
  const isExpanded = expanded.has(node.id)
  const hasChildren = node.children.length > 0
  const done = isDone(node.status)
  const updating = updatingId === node.id
  const statusClass = STATUS_TONE[node.status] ?? "bg-slate-100 text-slate-700"

  return (
    <div>
      <div
        className="group flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-muted/40 transition-colors"
        style={{ paddingLeft: `${0.5 + depth * 1.25}rem` }}
      >
        <button
          type="button"
          onClick={() => hasChildren && onToggleExpand(node.id)}
          className={`mt-0.5 h-4 w-4 flex items-center justify-center rounded transition-transform ${hasChildren ? "text-muted-foreground hover:text-foreground" : "opacity-0 pointer-events-none"}`}
          aria-label={isExpanded ? "Collapse" : "Expand"}
        >
          <ChevronRight className={`size-3.5 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
        </button>

        <button
          type="button"
          onClick={() => onToggleStatus(node)}
          disabled={updating}
          className="mt-0.5 h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-50"
          aria-label={done ? "Mark as todo" : "Mark as done"}
        >
          {updating ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : done ? (
            <CheckSquare className="size-3.5 text-emerald-600" />
          ) : (
            <Square className="size-3.5" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            {node.task_number != null && (
              <span className="text-[11px] font-medium text-muted-foreground tabular-nums">#{node.task_number}</span>
            )}
            <span className={`text-sm ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {node.title}
            </span>
            {node.status && !done && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusClass}`}>
                {node.status.replace(/_/g, " ")}
              </span>
            )}
            {node.priority && node.priority !== "medium" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">
                {node.priority}
              </span>
            )}
            {node.tags && node.tags.length > 0 && node.tags.map((t) => (
              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">
                {t}
              </span>
            ))}
          </div>
          {node.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{node.description}</p>
          )}
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <ExternalNodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggleExpand={onToggleExpand}
              onToggleStatus={onToggleStatus}
              updatingId={updatingId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
