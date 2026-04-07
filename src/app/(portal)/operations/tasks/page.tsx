"use client"

import { useState } from "react"
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  ListTodo,
  Plus,
} from "lucide-react"

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

const COLUMNS: { key: Task["status"]; label: string }[] = [
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "review", label: "Review" },
  { key: "done", label: "Done" },
]

const PRIORITY_STYLES: Record<Task["priority"], string> = {
  critical: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  high: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  low: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
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
  return new Date(dueDate) < new Date("2026-04-03")
}

export default function TasksPage() {
  const [tasks] = useState<Task[]>(TASKS)

  const totalTasks = tasks.length
  const inProgress = tasks.filter((t) => t.status === "in_progress").length
  const doneCount = tasks.filter((t) => t.status === "done").length
  const overdueCount = tasks.filter(
    (t) => t.status !== "done" && isOverdue(t.dueDate)
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
        <button className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="size-4" />
          Add Task
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className="rounded-md border bg-card p-5 flex items-start justify-between"
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

      {/* Kanban Board */}
      <div className="grid grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const columnTasks = tasks.filter((t) => t.status === col.key)
          return (
            <div
              key={col.key}
              className="rounded-md border bg-card overflow-hidden"
            >
              {/* Column Header */}
              <div className="px-4 py-3 border-b bg-muted/40 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
                  {col.label}
                </span>
                <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded-full">
                  {columnTasks.length}
                </span>
              </div>

              {/* Column Body */}
              <div className="p-2 space-y-2 min-h-[300px]">
                {columnTasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-md border bg-card p-3 space-y-2 hover:shadow-sm transition-shadow cursor-pointer"
                  >
                    <p className="text-sm font-medium">{task.title}</p>
                    <span
                      className={`inline-block border-0 text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_STYLES[task.priority]}`}
                    >
                      {task.priority}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                        {getInitials(task.assignee)}
                      </div>
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
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
