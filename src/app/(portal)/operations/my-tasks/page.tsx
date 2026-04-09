"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

interface Task {
  id: string
  title: string
  description: string
  status: "todo" | "in_progress" | "done"
  priority: "low" | "medium" | "high" | "critical"
  assignee: string
  due_date: string
  brand_store_id?: string
  created_at: string
  updated_at: string
}

const STATUS_STYLES: Record<Task["status"], string> = {
  todo: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  done: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
}

const STATUS_LABELS: Record<Task["status"], string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
}

const PRIORITY_COLORS: Record<Task["priority"], string> = {
  critical: "bg-red-500",
  high: "bg-amber-500",
  medium: "bg-blue-500",
  low: "bg-zinc-400",
}

export default function MyTasksPage() {
  const [tab, setTab] = useState<"active" | "completed">("active")
  const [myTasks, setMyTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMyTasks() {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("assignee", "Lakshay")
        .order("due_date")
      if (!error && data) {
        setMyTasks(data as Task[])
      }
      setLoading(false)
    }
    fetchMyTasks()
  }, [])

  const activeTasks = myTasks.filter((t) => t.status !== "done")
  const completedTasks = myTasks.filter((t) => t.status === "done")
  const displayedTasks = tab === "active" ? activeTasks : completedTasks

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
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">
          My Tasks
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Tasks assigned to you
        </p>
      </div>

      {/* Toggle */}
      <div className="inline-flex rounded-md border overflow-hidden">
        <button
          onClick={() => setTab("active")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            tab === "active"
              ? "bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          Active ({activeTasks.length})
        </button>
        <button
          onClick={() => setTab("completed")}
          className={`px-4 py-2 text-sm font-medium border-l transition-colors ${
            tab === "completed"
              ? "bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          Completed ({completedTasks.length})
        </button>
      </div>

      {/* Task List */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b text-sm font-semibold">
          {tab === "active" ? "Active Tasks" : "Completed Tasks"}
        </div>
        <div className="divide-y">
          {displayedTasks.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              No tasks to show.
            </div>
          ) : (
            displayedTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors"
              >
                {/* Left */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_COLORS[task.priority]}`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-sm">
                      {task.description}
                    </p>
                  </div>
                </div>

                {/* Right */}
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`border-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[task.status]}`}
                  >
                    {STATUS_LABELS[task.status]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(task.due_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  {task.brand_store_id && (
                    <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {task.brand_store_id}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
