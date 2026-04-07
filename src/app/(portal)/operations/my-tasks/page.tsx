"use client"

import { useState } from "react"

interface Task {
  id: string
  title: string
  description: string
  status: "todo" | "in_progress" | "review" | "done"
  priority: "low" | "medium" | "high" | "critical"
  assignee: string
  dueDate: string
  brand?: string
  createdAt: string
}

const TASKS: Task[] = [
  {
    id: "T-001",
    title: "Audit Q1 product listings",
    description: "Review all product listings for accuracy and compliance with Faire guidelines",
    status: "todo",
    priority: "high",
    assignee: "Lakshay",
    dueDate: "2026-04-07",
    brand: "Moonlit Candles",
    createdAt: "2026-03-28",
  },
  {
    id: "T-002",
    title: "Fix shipping rate calculator",
    description: "The calculator is returning incorrect rates for orders over 10 lbs",
    status: "in_progress",
    priority: "critical",
    assignee: "Aditya",
    dueDate: "2026-04-04",
    createdAt: "2026-03-25",
  },
  {
    id: "T-003",
    title: "Update brand imagery for spring launch",
    description: "Swap hero images and lifestyle photos for the spring collection",
    status: "review",
    priority: "medium",
    assignee: "Bharti",
    dueDate: "2026-04-05",
    brand: "Terra Ceramics",
    createdAt: "2026-03-20",
  },
  {
    id: "T-004",
    title: "Onboard new retailer batch",
    description: "Process and verify 12 new retailer applications from the waitlist",
    status: "todo",
    priority: "medium",
    assignee: "Khushal",
    dueDate: "2026-04-10",
    createdAt: "2026-03-30",
  },
  {
    id: "T-005",
    title: "Resolve duplicate SKU conflicts",
    description: "Identify and merge duplicate SKUs across brands in the catalog",
    status: "in_progress",
    priority: "high",
    assignee: "Lakshay",
    dueDate: "2026-04-03",
    brand: "Bloom & Bark",
    createdAt: "2026-03-22",
  },
  {
    id: "T-006",
    title: "Prepare monthly analytics report",
    description: "Compile March revenue, traffic, and conversion data for the team",
    status: "done",
    priority: "medium",
    assignee: "Allen",
    dueDate: "2026-04-01",
    createdAt: "2026-03-26",
  },
  {
    id: "T-007",
    title: "Set up automated follow-up emails",
    description: "Configure the CRM to send follow-ups 3 days after initial outreach",
    status: "review",
    priority: "high",
    assignee: "Harsh",
    dueDate: "2026-04-06",
    createdAt: "2026-03-29",
  },
  {
    id: "T-008",
    title: "Migrate legacy pricing tiers",
    description: "Move remaining brands from old pricing structure to the new volume-based model",
    status: "in_progress",
    priority: "critical",
    assignee: "Lakshay",
    dueDate: "2026-04-02",
    brand: "Aura Home",
    createdAt: "2026-03-18",
  },
  {
    id: "T-009",
    title: "Test new product scraper endpoints",
    description: "Validate scraper output against expected product data for 5 brands",
    status: "todo",
    priority: "low",
    assignee: "Aditya",
    dueDate: "2026-04-12",
    createdAt: "2026-04-01",
  },
  {
    id: "T-010",
    title: "Design outreach email templates",
    description: "Create 3 new email templates for different retailer segments",
    status: "done",
    priority: "medium",
    assignee: "Bharti",
    dueDate: "2026-03-30",
    createdAt: "2026-03-15",
  },
  {
    id: "T-011",
    title: "Investigate late shipment spike",
    description: "Analyze why late shipment rate doubled last week for two brands",
    status: "in_progress",
    priority: "high",
    assignee: "Khushal",
    dueDate: "2026-04-04",
    brand: "Moonlit Candles",
    createdAt: "2026-03-31",
  },
  {
    id: "T-012",
    title: "Update team permissions matrix",
    description: "Review and update access levels for all team members in the portal",
    status: "todo",
    priority: "low",
    assignee: "Allen",
    dueDate: "2026-04-15",
    createdAt: "2026-04-02",
  },
  {
    id: "T-013",
    title: "Reconcile inventory discrepancies",
    description: "Cross-check warehouse counts with Faire inventory for all active products",
    status: "review",
    priority: "high",
    assignee: "Harsh",
    dueDate: "2026-04-05",
    brand: "Terra Ceramics",
    createdAt: "2026-03-27",
  },
  {
    id: "T-014",
    title: "Write API docs for pipeline module",
    description: "Document all endpoints, request/response schemas, and auth requirements",
    status: "done",
    priority: "low",
    assignee: "Lakshay",
    dueDate: "2026-03-28",
    createdAt: "2026-03-10",
  },
  {
    id: "T-015",
    title: "Plan Q2 brand acquisition targets",
    description: "Research and shortlist 20 potential brands for Q2 onboarding push",
    status: "todo",
    priority: "medium",
    assignee: "Allen",
    dueDate: "2026-04-14",
    createdAt: "2026-04-01",
  },
]

const STATUS_STYLES: Record<Task["status"], string> = {
  todo: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  review: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  done: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
}

const STATUS_LABELS: Record<Task["status"], string> = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
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

  const myTasks = TASKS.filter((t) => t.assignee === "Lakshay")
  const activeTasks = myTasks.filter((t) => t.status !== "done")
  const completedTasks = myTasks.filter((t) => t.status === "done")
  const displayedTasks = tab === "active" ? activeTasks : completedTasks

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
      <div className="rounded-md border bg-card overflow-hidden">
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
                    {new Date(task.dueDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  {task.brand && (
                    <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {task.brand}
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
