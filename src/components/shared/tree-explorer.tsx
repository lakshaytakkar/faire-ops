"use client"

import { useState, useMemo, useEffect } from "react"
import { ChevronRight, ChevronDown, Search, ChevronsUpDown, Calendar, User } from "lucide-react"

interface TreeNode {
  id: string
  title: string
  status?: string
  priority?: string
  assignee?: string
  due_date?: string
  tags?: string[]
  depth: number
  parent_id: string | null
  children?: TreeNode[]
  task_number?: number
}

interface TreeExplorerProps {
  nodes: TreeNode[]
  onStatusChange?: (id: string, status: string) => void
  onNodeClick?: (node: TreeNode) => void
  expandAll?: boolean
}

const STATUS_OPTIONS = [
  { key: "backlog", label: "Backlog", dot: "bg-slate-500" },
  { key: "todo", label: "To Do", dot: "bg-amber-500" },
  { key: "in_progress", label: "In Progress", dot: "bg-blue-500" },
  { key: "under_review", label: "Under Review", dot: "bg-purple-500" },
  { key: "done", label: "Done", dot: "bg-emerald-500" },
]

const STATUS_DOT_COLOR: Record<string, string> = {
  backlog: "bg-slate-500",
  todo: "bg-amber-500",
  in_progress: "bg-blue-500",
  under_review: "bg-purple-500",
  done: "bg-emerald-500",
}

const PRIORITY_STYLES: Record<string, string> = {
  critical: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  high: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function countAll(nodes: TreeNode[]): { total: number; done: number } {
  let total = 0
  let done = 0
  function walk(list: TreeNode[]) {
    for (const n of list) {
      total++
      if (n.status === "done") done++
      if (n.children?.length) walk(n.children)
    }
  }
  walk(nodes)
  return { total, done }
}

function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
  if (!query) return nodes
  const q = query.toLowerCase()
  function matches(node: TreeNode): boolean {
    if (node.title.toLowerCase().includes(q)) return true
    if (node.assignee?.toLowerCase().includes(q)) return true
    if (node.tags?.some((t) => t.toLowerCase().includes(q))) return true
    if (node.children?.some(matches)) return true
    return false
  }
  function prune(list: TreeNode[]): TreeNode[] {
    const out: TreeNode[] = []
    for (const n of list) {
      if (matches(n)) {
        out.push({ ...n, children: n.children ? prune(n.children) : [] })
      }
    }
    return out
  }
  return prune(nodes)
}

function collectIds(nodes: TreeNode[]): Set<string> {
  const ids = new Set<string>()
  function walk(list: TreeNode[]) {
    for (const n of list) {
      if (n.children?.length) {
        ids.add(n.id)
        walk(n.children)
      }
    }
  }
  walk(nodes)
  return ids
}

export function TreeExplorer({ nodes, onStatusChange, onNodeClick, expandAll: initialExpandAll }: TreeExplorerProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")
  const [initialized, setInitialized] = useState(false)

  // Expand all when nodes first arrive and expandAll is true
  useEffect(() => {
    if (initialExpandAll && nodes.length > 0 && !initialized) {
      setExpanded(collectIds(nodes))
      setInitialized(true)
    }
  }, [nodes, initialExpandAll, initialized])
  const [statusDropdownId, setStatusDropdownId] = useState<string | null>(null)

  const filteredNodes = useMemo(() => filterTree(nodes, search), [nodes, search])
  const { total, done } = useMemo(() => countAll(filteredNodes), [filteredNodes])

  function toggleNode(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function expandAllNodes() {
    setExpanded(collectIds(filteredNodes))
  }

  function collapseAllNodes() {
    setExpanded(new Set())
  }

  function renderNode(node: TreeNode, index: number) {
    const hasChildren = (node.children?.length ?? 0) > 0
    const isExpanded = expanded.has(node.id)
    const dotColor = STATUS_DOT_COLOR[node.status ?? "backlog"] ?? "bg-slate-400"
    const isEven = index % 2 === 0

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 py-2 px-3 border-b border-border/50 text-sm ${
            isEven ? "bg-card" : "bg-muted/30"
          }`}
          style={{ paddingLeft: `${node.depth * 24 + 12}px` }}
        >
          {/* Expand/collapse or bullet */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleNode(node.id)
              }}
              className="shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-muted"
            >
              {isExpanded ? (
                <ChevronDown className="size-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="size-3.5 text-muted-foreground" />
              )}
            </button>
          ) : (
            <span className="shrink-0 w-5 h-5 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
            </span>
          )}

          {/* Status dot (clickable) */}
          <div className="relative shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setStatusDropdownId(statusDropdownId === node.id ? null : node.id)
              }}
              className={`w-2.5 h-2.5 rounded-full ${dotColor} cursor-pointer`}
              title={node.status ?? "backlog"}
            />
            {statusDropdownId === node.id && (
              <div className="absolute left-0 top-5 z-50 bg-card border rounded-md shadow-lg py-1 w-36">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={(e) => {
                      e.stopPropagation()
                      onStatusChange?.(node.id, opt.key)
                      setStatusDropdownId(null)
                    }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-muted text-left"
                  >
                    <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Task number */}
          {node.task_number && (
            <span className="text-xs text-muted-foreground shrink-0">#{node.task_number}</span>
          )}

          {/* Title */}
          <button
            onClick={() => onNodeClick?.(node)}
            className="text-sm font-medium truncate text-left hover:underline min-w-0"
          >
            {node.title}
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Tags */}
          {node.tags && node.tags.length > 0 && (
            <div className="hidden sm:flex items-center gap-1 shrink-0">
              {node.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
              {node.tags.length > 2 && (
                <span className="text-[9px] text-muted-foreground">+{node.tags.length - 2}</span>
              )}
            </div>
          )}

          {/* Priority badge */}
          {node.priority && (
            <span
              className={`text-xs font-medium px-1.5 py-0.5 rounded capitalize shrink-0 ${
                PRIORITY_STYLES[node.priority] ?? ""
              }`}
            >
              {node.priority}
            </span>
          )}

          {/* Due date */}
          {node.due_date && (
            <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-0.5">
              <Calendar className="size-2.5" />
              {new Date(node.due_date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}

          {/* Assignee */}
          {node.assignee && (
            <div className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-[8px] font-bold flex items-center justify-center" title={node.assignee}>
              {getInitials(node.assignee)}
            </div>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map((child, i) => renderNode(child, index + i + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden"
      onClick={() => setStatusDropdownId(null)}
    >
      {/* Controls bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-1">
          <button
            onClick={expandAllNodes}
            className="text-xs font-medium px-2 py-1 rounded hover:bg-muted"
          >
            Expand All
          </button>
          <button
            onClick={collapseAllNodes}
            className="text-xs font-medium px-2 py-1 rounded hover:bg-muted"
          >
            Collapse All
          </button>
        </div>

        <div className="flex-1" />

        <span className="text-xs text-muted-foreground">
          {total} items, {done} completed
        </span>

        <div className="relative">
          <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter..."
            className="h-8 w-48 rounded-md border bg-background pl-8 pr-3 text-xs"
          />
        </div>
      </div>

      {/* Tree rows */}
      <div>
        {filteredNodes.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No tasks found
          </div>
        )}
        {filteredNodes.map((node, i) => renderNode(node, i))}
      </div>
    </div>
  )
}

export type { TreeNode, TreeExplorerProps }
