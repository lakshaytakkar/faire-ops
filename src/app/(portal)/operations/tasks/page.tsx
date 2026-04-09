"use client"

import { useState, useEffect } from "react"
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  ListTodo,
  Plus,
  Calendar,
  User,
  X,
  ChevronRight,
  Link2,
  MessageCircle,
  Send,
  ExternalLink,
  CheckCircle2,
  Circle,
  LayoutGrid,
  List,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { TreeExplorer, type TreeNode } from "@/components/shared/tree-explorer"

interface Task {
  id: string
  task_number?: number
  title: string
  description: string
  status: "backlog" | "todo" | "in_progress" | "under_review" | "done"
  priority: "low" | "medium" | "high" | "critical"
  assignee: string
  due_date: string
  tags?: string[]
  parent_id?: string | null
  depth?: number
  sort_order?: number
  brand_store_id?: string
  created_at: string
  updated_at: string
}

const COLUMNS: { key: Task["status"]; label: string; color: string; headerBg: string; headerText: string }[] = [
  { key: "backlog", label: "Backlog", color: "bg-slate-500", headerBg: "bg-slate-50", headerText: "text-slate-700" },
  { key: "todo", label: "To Do", color: "bg-amber-500", headerBg: "bg-amber-50", headerText: "text-amber-700" },
  { key: "in_progress", label: "In Progress", color: "bg-blue-500", headerBg: "bg-blue-50", headerText: "text-blue-700" },
  { key: "under_review", label: "Under Review", color: "bg-purple-500", headerBg: "bg-purple-50", headerText: "text-purple-700" },
  { key: "done", label: "Done", color: "bg-emerald-500", headerBg: "bg-emerald-50", headerText: "text-emerald-700" },
]

const TAG_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-700",
  daily: "bg-blue-100 text-blue-700",
  weekly: "bg-purple-100 text-purple-700",
  orders: "bg-amber-100 text-amber-700",
  fulfilment: "bg-sky-100 text-sky-700",
  catalog: "bg-indigo-100 text-indigo-700",
  marketing: "bg-pink-100 text-pink-700",
  operations: "bg-teal-100 text-teal-700",
  strategy: "bg-violet-100 text-violet-700",
  finance: "bg-emerald-100 text-emerald-700",
  reporting: "bg-orange-100 text-orange-700",
  images: "bg-cyan-100 text-cyan-700",
  outreach: "bg-rose-100 text-rose-700",
  audit: "bg-yellow-100 text-yellow-700",
  "faire-direct": "bg-fuchsia-100 text-fuchsia-700",
}

const PRIORITY_STYLES: Record<Task["priority"], string> = {
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

function isOverdue(dueDate: string): boolean {
  return new Date(dueDate) < new Date()
}

function formatDueDate(dueDate: string): string {
  const date = new Date(dueDate)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / 86400000)

  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Tomorrow"
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default function TasksPage() {
  interface Subtask { id: string; title: string; is_done: boolean; sort_order: number }
  interface TaskComment { id: string; sender_name: string; body: string; created_at: string }
  interface TaskLink { id: string; title: string; url: string }

  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [dragTaskId, setDragTaskId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [comments, setComments] = useState<TaskComment[]>([])
  const [links, setLinks] = useState<TaskLink[]>([])
  const [newComment, setNewComment] = useState("")
  const [newSubtask, setNewSubtask] = useState("")
  const [newLinkTitle, setNewLinkTitle] = useState("")
  const [newLinkUrl, setNewLinkUrl] = useState("")
  const [rightTab, setRightTab] = useState<"activity" | "links">("activity")
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [createStep, setCreateStep] = useState<1 | 2>(1)
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "medium" as Task["priority"], assignee: "", due_date: "", tags: "" })
  const [creating, setCreating] = useState(false)
  const [viewMode, setViewMode] = useState<"board" | "explorer">("board")

  function buildTree(tasks: Task[]): TreeNode[] {
    const map = new Map<string, TreeNode>()
    const roots: TreeNode[] = []

    for (const t of tasks) {
      map.set(t.id, {
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        assignee: t.assignee,
        due_date: t.due_date,
        tags: t.tags,
        depth: 0,
        parent_id: t.parent_id ?? null,
        task_number: t.task_number,
        children: [],
      })
    }

    for (const t of tasks) {
      const node = map.get(t.id)!
      const parentId = t.parent_id
      if (parentId && map.has(parentId)) {
        const parent = map.get(parentId)!
        node.depth = parent.depth + 1
        parent.children!.push(node)
      } else {
        roots.push(node)
      }
    }

    // Fix depths recursively
    function setDepths(nodes: TreeNode[], d: number) {
      for (const n of nodes) {
        n.depth = d
        if (n.children?.length) setDepths(n.children, d + 1)
      }
    }
    setDepths(roots, 0)

    return roots
  }

  async function handleCreateTask() {
    if (!newTask.title.trim()) return
    setCreating(true)
    const tags = newTask.tags.split(",").map(t => t.trim()).filter(Boolean)
    const { data, error } = await supabase.from("tasks").insert({
      title: newTask.title.trim(),
      description: newTask.description.trim() || null,
      priority: newTask.priority,
      assignee: newTask.assignee || "Lakshay",
      due_date: newTask.due_date || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      status: "todo",
      tags,
    }).select().single()
    setCreating(false)
    if (!error && data) {
      setTasks(prev => [...prev, data as Task])
      setShowCreateTask(false)
      setCreateStep(1)
      setNewTask({ title: "", description: "", priority: "medium", assignee: "", due_date: "", tags: "" })
    }
  }
  const [teamAvatars, setTeamAvatars] = useState<Record<string, string>>({})

  // Fetch team avatars once
  useEffect(() => {
    supabase.from("team_members").select("name, avatar_url").then(({ data }) => {
      const map: Record<string, string> = {}
      for (const m of (data ?? [])) if (m.avatar_url) map[m.name] = m.avatar_url
      setTeamAvatars(map)
    })
  }, [])

  // Load task details when selected
  useEffect(() => {
    if (!selectedTask) return
    const tid = selectedTask.id
    Promise.all([
      supabase.from("task_subtasks").select("*").eq("task_id", tid).order("sort_order"),
      supabase.from("task_comments").select("*").eq("task_id", tid).order("created_at"),
      supabase.from("task_links").select("*").eq("task_id", tid).order("created_at"),
    ]).then(([s, c, l]) => {
      setSubtasks((s.data ?? []) as Subtask[])
      setComments((c.data ?? []) as TaskComment[])
      setLinks((l.data ?? []) as TaskLink[])
    })
  }, [selectedTask?.id])

  async function toggleSubtask(id: string, done: boolean) {
    await supabase.from("task_subtasks").update({ is_done: done }).eq("id", id)
    setSubtasks(prev => prev.map(s => s.id === id ? { ...s, is_done: done } : s))
  }

  async function addSubtask() {
    if (!newSubtask.trim() || !selectedTask) return
    const { data } = await supabase.from("task_subtasks").insert({ task_id: selectedTask.id, title: newSubtask.trim(), sort_order: subtasks.length }).select().single()
    if (data) setSubtasks(prev => [...prev, data as Subtask])
    setNewSubtask("")
  }

  async function addComment() {
    if (!newComment.trim() || !selectedTask) return
    const { data } = await supabase.from("task_comments").insert({ task_id: selectedTask.id, sender_name: "Lakshay", body: newComment.trim() }).select().single()
    if (data) setComments(prev => [...prev, data as TaskComment])
    setNewComment("")
  }

  async function addLink() {
    if (!newLinkTitle.trim() || !newLinkUrl.trim() || !selectedTask) return
    const { data } = await supabase.from("task_links").insert({ task_id: selectedTask.id, title: newLinkTitle.trim(), url: newLinkUrl.trim() }).select().single()
    if (data) setLinks(prev => [...prev, data as TaskLink])
    setNewLinkTitle(""); setNewLinkUrl("")
  }

  useEffect(() => {
    async function fetchTasks() {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("sort_order")
        .order("due_date")
      if (!error && data) {
        setTasks(data as Task[])
      }
      setLoading(false)
    }
    fetchTasks()
  }, [])

  async function updateTaskStatus(taskId: string, newStatus: Task["status"]) {
    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", taskId)
    if (!error) {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      )
    }
  }

  const totalTasks = tasks.length
  const inProgress = tasks.filter((t) => t.status === "in_progress").length
  const doneCount = tasks.filter((t) => t.status === "done").length
  const overdueCount = tasks.filter(
    (t) => t.status !== "done" && isOverdue(t.due_date)
  ).length

  const stats = [
    {
      label: "Total Tasks",
      value: totalTasks,
      icon: ListTodo,
      iconBg: "bg-primary/10 text-primary",
    },
    {
      label: "In Progress",
      value: inProgress,
      icon: Clock,
      iconBg: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
    },
    {
      label: "Completed This Week",
      value: doneCount,
      icon: CheckSquare,
      iconBg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
    },
    {
      label: "Overdue",
      value: overdueCount,
      icon: AlertTriangle,
      iconBg: "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400",
    },
  ]

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto w-full py-10 text-center text-sm text-muted-foreground">
        Loading tasks...
      </div>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">
            Tasks
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage team tasks and backlog
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View switcher */}
          <div className="flex items-center border rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode("board")}
              className={`inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium transition-colors ${
                viewMode === "board"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              <LayoutGrid className="size-3.5" />
              Board
            </button>
            <button
              onClick={() => setViewMode("explorer")}
              className={`inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium transition-colors ${
                viewMode === "explorer"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              <List className="size-3.5" />
              Explorer
            </button>
          </div>

          <button onClick={() => { setShowCreateTask(true); setCreateStep(1) }} className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="size-4" />
            Add Task
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between"
            >
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold font-heading mt-2">
                  {stat.value}
                </p>
              </div>
              <div
                className={`h-9 w-9 rounded-lg flex items-center justify-center ${stat.iconBg}`}
              >
                <Icon className="size-4" />
              </div>
            </div>
          )
        })}
      </div>

      {/* Explorer View */}
      {viewMode === "explorer" && (
        <TreeExplorer
          nodes={buildTree(tasks)}
          onStatusChange={(id, status) => updateTaskStatus(id, status as Task["status"])}
          onNodeClick={(node) => {
            const task = tasks.find((t) => t.id === node.id)
            if (task) setSelectedTask(task)
          }}
        />
      )}

      {/* Kanban Board — Drag & Drop */}
      {viewMode === "board" && <div className="grid grid-cols-5 gap-4">
        {COLUMNS.map((col) => {
          const columnTasks = tasks.filter((t) => t.status === col.key)
          const isDragOver = dragOverCol === col.key
          return (
            <div
              key={col.key}
              className={`rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden transition-all ${isDragOver ? "ring-2 ring-primary/40 bg-primary/5" : "bg-card"}`}
              onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.key) }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={async (e) => {
                e.preventDefault()
                setDragOverCol(null)
                if (!dragTaskId) return
                const task = tasks.find(t => t.id === dragTaskId)
                if (task && task.status !== col.key) {
                  await updateTaskStatus(dragTaskId, col.key)
                }
                setDragTaskId(null)
              }}
            >
              {/* Column Header — colored */}
              <div className={`px-4 py-3 border-b ${col.headerBg} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                  <span className={`text-xs font-semibold tracking-wide uppercase ${col.headerText}`}>
                    {col.label}
                  </span>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.color} text-white`}>
                  {columnTasks.length}
                </span>
              </div>

              {/* Column Body */}
              <div className={`p-2 space-y-2 min-h-[300px] transition-colors ${isDragOver ? "bg-primary/5" : ""}`}>
                {columnTasks.map((task) => {
                  const overdue = task.status !== "done" && isOverdue(task.due_date)
                  const avatar = teamAvatars[task.assignee]
                  const tags = task.tags ?? []
                  const isDragging = dragTaskId === task.id
                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => {
                        setDragTaskId(task.id)
                        e.dataTransfer.effectAllowed = "move"
                        // Ghost image styling
                        const el = e.currentTarget
                        el.style.opacity = "0.5"
                        setTimeout(() => { el.style.opacity = "1" }, 0)
                      }}
                      onDragEnd={() => { setDragTaskId(null); setDragOverCol(null) }}
                      className={`rounded-lg border bg-card p-3 space-y-2 cursor-grab active:cursor-grabbing transition-all ${
                        isDragging ? "opacity-40 scale-95 border-primary" : "hover:shadow-sm"
                      }`}
                      onClick={() => { if (!dragTaskId) setSelectedTask(task) }}
                    >
                      {/* Task number + title */}
                      <div className="flex items-start gap-1.5">
                        <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">#{task.task_number}</span>
                        <p className="text-sm font-medium leading-snug">{task.title}</p>
                      </div>
                      {/* Tags */}
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {tags.map(tag => (
                            <span key={tag} className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${TAG_COLORS[tag] ?? "bg-slate-100 text-slate-600"}`}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Priority + Due */}
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded capitalize ${PRIORITY_STYLES[task.priority]}`}>
                          {task.priority}
                        </span>
                        <div className="flex items-center gap-0.5">
                          <Calendar className={`size-2.5 ${overdue ? "text-red-500" : "text-muted-foreground"}`} />
                          <span className={`text-[10px] ${overdue ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                            {formatDueDate(task.due_date)}
                          </span>
                        </div>
                      </div>
                      {/* Assignee */}
                      <div className="flex items-center gap-1.5 pt-0.5">
                        {avatar ? (
                          <img src={avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[8px] font-bold flex items-center justify-center">
                            {getInitials(task.assignee)}
                          </div>
                        )}
                        <span className="text-[10px] text-muted-foreground">{task.assignee}</span>
                      </div>
                    </div>
                  )
                })}
                {/* Drop zone indicator */}
                {isDragOver && columnTasks.length === 0 && (
                  <div className="border-2 border-dashed border-primary/30 rounded-lg h-20 flex items-center justify-center">
                    <span className="text-xs text-primary/50">Drop here</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>}
      {/* Create Task Modal — 2 steps */}
      {showCreateTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreateTask(false)}>
          <div className="bg-card border rounded-xl shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-base font-semibold">New Task</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Step {createStep} of 2</p>
              </div>
              <button onClick={() => setShowCreateTask(false)} className="p-1.5 rounded-md hover:bg-muted">
                <X className="size-4" />
              </button>
            </div>
            {/* Step indicator */}
            <div className="px-5 pt-4 flex gap-2">
              <div className={`flex-1 h-1 rounded-full ${createStep >= 1 ? "bg-primary" : "bg-muted"}`} />
              <div className={`flex-1 h-1 rounded-full ${createStep >= 2 ? "bg-primary" : "bg-muted"}`} />
            </div>

            <div className="p-5 space-y-4">
              {createStep === 1 && (
                <>
                  <div>
                    <label className="text-sm font-medium">Title *</label>
                    <input
                      value={newTask.title}
                      onChange={(e) => setNewTask(p => ({ ...p, title: e.target.value }))}
                      placeholder="What needs to be done?"
                      className="mt-1.5 w-full h-10 rounded-md border bg-background px-3 text-sm"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <textarea
                      value={newTask.description}
                      onChange={(e) => setNewTask(p => ({ ...p, description: e.target.value }))}
                      placeholder="Add details..."
                      rows={3}
                      className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Priority</label>
                    <div className="flex gap-2 mt-1.5">
                      {(["low", "medium", "high"] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => setNewTask(prev => ({ ...prev, priority: p }))}
                          className={`flex-1 h-9 rounded-md text-xs font-medium capitalize border transition-colors ${
                            newTask.priority === p
                              ? PRIORITY_STYLES[p] + " border-current"
                              : "hover:bg-muted"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {createStep === 2 && (
                <>
                  <div>
                    <label className="text-sm font-medium">Assignee</label>
                    <select
                      value={newTask.assignee}
                      onChange={(e) => setNewTask(p => ({ ...p, assignee: e.target.value }))}
                      className="mt-1.5 w-full h-10 rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="">Select team member</option>
                      <option value="Lakshay">Lakshay</option>
                      <option value="Shantanu">Shantanu</option>
                      <option value="Yash Jain">Yash Jain</option>
                      <option value="Krish Verma">Krish Verma</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Due Date</label>
                    <input
                      type="date"
                      value={newTask.due_date}
                      onChange={(e) => setNewTask(p => ({ ...p, due_date: e.target.value }))}
                      className="mt-1.5 w-full h-10 rounded-md border bg-background px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Tags</label>
                    <input
                      value={newTask.tags}
                      onChange={(e) => setNewTask(p => ({ ...p, tags: e.target.value }))}
                      placeholder="urgent, catalog, daily (comma separated)"
                      className="mt-1.5 w-full h-10 rounded-md border bg-background px-3 text-sm"
                    />
                    <div className="flex flex-wrap gap-1 mt-2">
                      {["daily", "weekly", "urgent", "catalog", "fulfilment", "marketing", "operations", "strategy"].map(tag => (
                        <button
                          key={tag}
                          onClick={() => {
                            const current = newTask.tags.split(",").map(t => t.trim()).filter(Boolean)
                            if (current.includes(tag)) return
                            setNewTask(p => ({ ...p, tags: [...current, tag].join(", ") }))
                          }}
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${TAG_COLORS[tag] ?? "bg-slate-100 text-slate-600"}`}
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-between border-t px-5 py-4">
              {createStep === 2 ? (
                <button onClick={() => setCreateStep(1)} className="px-4 py-2 text-sm font-medium rounded-md border hover:bg-muted">
                  Back
                </button>
              ) : (
                <button onClick={() => setShowCreateTask(false)} className="px-4 py-2 text-sm font-medium rounded-md border hover:bg-muted">
                  Cancel
                </button>
              )}
              {createStep === 1 ? (
                <button
                  onClick={() => setCreateStep(2)}
                  disabled={!newTask.title.trim()}
                  className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleCreateTask}
                  disabled={creating}
                  className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Task"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (() => {
        const col = COLUMNS.find(c => c.key === selectedTask.status)
        const overdue = selectedTask.status !== "done" && isOverdue(selectedTask.due_date)
        const assigneeAvatar = teamAvatars[selectedTask.assignee]
        const doneCount = subtasks.filter(s => s.is_done).length
        const tags = selectedTask.tags ?? []

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedTask(null)}>
            <div className="bg-card border rounded-xl shadow-xl w-full max-w-5xl h-[90vh] mx-4 flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${col?.color ?? "bg-slate-400"} text-white`}>
                    {col?.label}
                  </span>
                  <span className="text-sm text-muted-foreground font-medium">#{String(selectedTask.task_number ?? "—")}</span>
                  <h2 className="text-base font-semibold truncate">{selectedTask.title}</h2>
                </div>
                <button onClick={() => setSelectedTask(null)} className="p-1.5 rounded-md hover:bg-muted shrink-0">
                  <X className="size-5" />
                </button>
              </div>

              {/* Body — 3:1 */}
              <div className="flex-1 overflow-hidden flex">
                {/* LEFT — Details + Subtasks */}
                <div className="flex-[3] overflow-y-auto p-6 space-y-6 border-r">
                  {/* Assignee + Meta */}
                  <div className="flex items-center gap-4">
                    {assigneeAvatar ? (
                      <img src={assigneeAvatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">
                        {getInitials(selectedTask.assignee)}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold">{selectedTask.assignee}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${PRIORITY_STYLES[selectedTask.priority]}`}>
                          {selectedTask.priority}
                        </span>
                        <span className={`text-xs ${overdue ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                          Due {new Date(selectedTask.due_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map(tag => (
                        <span key={tag} className={`text-xs font-medium px-2 py-0.5 rounded-md ${TAG_COLORS[tag] ?? "bg-slate-100 text-slate-600"}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Description */}
                  {selectedTask.description && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</p>
                      <p className="text-sm leading-relaxed">{selectedTask.description}</p>
                    </div>
                  )}

                  {/* Status change */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Status</p>
                    <div className="flex flex-wrap gap-2">
                      {COLUMNS.map((c) => (
                        <button
                          key={c.key}
                          disabled={selectedTask.status === c.key}
                          onClick={async () => {
                            await updateTaskStatus(selectedTask.id, c.key)
                            setSelectedTask({ ...selectedTask, status: c.key })
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                            selectedTask.status === c.key ? `${c.headerBg} ${c.headerText} border-current` : "hover:bg-muted"
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${c.color}`} />
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Subtasks */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <CheckSquare className="size-3.5" />
                      Subtasks {subtasks.length > 0 && `(${doneCount}/${subtasks.length})`}
                    </p>
                    {subtasks.length > 0 && (
                      <div className="mb-3 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(doneCount / subtasks.length) * 100}%` }} />
                      </div>
                    )}
                    <div className="space-y-0.5">
                      {subtasks.map((st) => (
                        <button
                          key={st.id}
                          onClick={() => toggleSubtask(st.id, !st.is_done)}
                          className="flex items-center gap-2.5 w-full text-left py-2 px-2 rounded-md hover:bg-muted/50"
                        >
                          {st.is_done ? (
                            <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />
                          ) : (
                            <Circle className="size-5 text-muted-foreground/30 shrink-0" />
                          )}
                          <span className={`text-sm ${st.is_done ? "line-through text-muted-foreground" : ""}`}>{st.title}</span>
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <input
                        value={newSubtask}
                        onChange={(e) => setNewSubtask(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addSubtask()}
                        placeholder="Add a subtask..."
                        className="flex-1 h-9 rounded-md border bg-background px-3 text-sm"
                      />
                      <button onClick={addSubtask} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium">Add</button>
                    </div>
                  </div>
                </div>

                {/* RIGHT — Tabbed: Activity / Links */}
                <div className="flex-[1] flex flex-col min-w-[280px]">
                  {/* Tabs */}
                  <div className="flex border-b shrink-0">
                    {[
                      { key: "activity", label: "Activity", icon: MessageCircle },
                      { key: "links", label: "Links", icon: Link2 },
                    ].map((tab) => {
                      const isActive = (rightTab ?? "activity") === tab.key
                      return (
                        <button
                          key={tab.key}
                          onClick={() => setRightTab(tab.key as "activity" | "links")}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium border-b-2 transition-colors ${
                            isActive ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <tab.icon className="size-3.5" />
                          {tab.label}
                          {tab.key === "activity" && comments.length > 0 && (
                            <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded-full">{comments.length}</span>
                          )}
                          {tab.key === "links" && links.length > 0 && (
                            <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded-full">{links.length}</span>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {/* Activity tab */}
                  {(rightTab ?? "activity") === "activity" && (
                    <>
                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {comments.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-6">No comments yet</p>
                        )}
                        {comments.map((cm) => (
                          <div key={cm.id} className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              {teamAvatars[cm.sender_name] ? (
                                <img src={teamAvatars[cm.sender_name]} alt="" className="w-6 h-6 rounded-full object-cover" />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center">
                                  {getInitials(cm.sender_name)}
                                </div>
                              )}
                              <span className="text-xs font-semibold">{cm.sender_name}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(cm.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                            </div>
                            <p className="text-sm text-foreground/80 leading-relaxed pl-8">{cm.body}</p>
                          </div>
                        ))}
                      </div>
                      <div className="border-t p-3 shrink-0">
                        <div className="flex gap-2">
                          <input
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addComment()}
                            placeholder="Write a comment..."
                            className="flex-1 h-9 rounded-md border bg-background px-3 text-sm"
                          />
                          <button onClick={addComment} className="h-9 w-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
                            <Send className="size-4" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Links tab */}
                  {(rightTab ?? "activity") === "links" && (
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {links.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-6">No links added</p>
                      )}
                      {links.map((lk) => (
                        <a key={lk.id} href={lk.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 p-2.5 rounded-md border hover:bg-muted/50 transition-colors">
                          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                            <ExternalLink className="size-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{lk.title}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{lk.url}</p>
                          </div>
                        </a>
                      ))}
                      <div className="space-y-2 pt-2 border-t">
                        <input value={newLinkTitle} onChange={(e) => setNewLinkTitle(e.target.value)} placeholder="Link title" className="w-full h-9 rounded-md border bg-background px-3 text-sm" />
                        <input value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} placeholder="https://..." className="w-full h-9 rounded-md border bg-background px-3 text-sm" />
                        <button onClick={addLink} className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium">Add Link</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
