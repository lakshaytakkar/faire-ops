"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { LargeModal } from "@/components/shared/detail-views"
import { SubNav } from "@/components/shared/sub-nav"

const SUB_NAV_ITEMS = [
  { title: "Dashboard", href: "/workspace/research/dashboard" },
  { title: "Tools", href: "/workspace/research/tools" },
  { title: "Products", href: "/workspace/research/products" },
  { title: "Competitors", href: "/workspace/research/competitors" },
  { title: "Trends", href: "/workspace/research/trends" },
  { title: "Goals", href: "/workspace/research/goals" },
  { title: "Reports", href: "/workspace/research/reports" },
  { title: "Sources", href: "/workspace/research/sources" },
]
import {
  Target,
  Plus,
  Calendar,
  AlertCircle,
  ChevronRight,
} from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type GoalType = "discovery" | "validation" | "launch" | "learning"
type GoalStatus = "active" | "completed" | "abandoned"

interface ResearchGoal {
  id: string
  title: string
  description: string | null
  goal_type: GoalType | null
  target_metric: string | null
  target_value: string | null
  current_value: string | null
  status: GoalStatus | null
  due_date: string | null
  assigned_to_user_id: string | null
  related_product_idea_id: string | null
  progress_notes: string | null
  created_at: string
}

interface WorkspaceUser {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
}

interface ProductIdea {
  id: string
  title: string | null
  name?: string | null
}

const STATUS_TABS: { value: "all" | GoalStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "abandoned", label: "Abandoned" },
]

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-blue-50", text: "text-blue-700", label: "Active" },
  completed: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Completed" },
  abandoned: { bg: "bg-slate-100", text: "text-slate-600", label: "Abandoned" },
}

const TYPE_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  discovery: { bg: "bg-purple-50", text: "text-purple-700", label: "Discovery" },
  validation: { bg: "bg-amber-50", text: "text-amber-700", label: "Validation" },
  launch: { bg: "bg-blue-50", text: "text-blue-700", label: "Launch" },
  learning: { bg: "bg-cyan-50", text: "text-cyan-700", label: "Learning" },
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "No date"
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false
  return new Date(dateStr).getTime() < Date.now()
}

function initialsOf(name: string | null | undefined): string {
  if (!name) return "?"
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

function parsePercent(current: string | null, target: string | null): number | null {
  if (!current || !target) return null
  const c = parseFloat(current)
  const t = parseFloat(target)
  if (isNaN(c) || isNaN(t) || t === 0) return null
  return Math.min(100, Math.max(0, Math.round((c / t) * 100)))
}

/* ------------------------------------------------------------------ */
/*  Add Goal Modal                                                     */
/* ------------------------------------------------------------------ */

function AddGoalModal({
  onClose,
  onCreated,
  users,
  productIdeas,
}: {
  onClose: () => void
  onCreated: () => void
  users: WorkspaceUser[]
  productIdeas: ProductIdea[]
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: "",
    description: "",
    goal_type: "discovery" as GoalType,
    target_metric: "",
    target_value: "",
    current_value: "",
    due_date: "",
    assigned_to_user_id: "",
    related_product_idea_id: "",
  })

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((p) => ({ ...p, [key]: value }))
  }

  async function handleSubmit() {
    if (!form.title.trim()) return
    setSaving(true)
    await supabase.from("research_goals").insert({
      title: form.title.trim(),
      description: form.description.trim() || null,
      goal_type: form.goal_type,
      target_metric: form.target_metric.trim() || null,
      target_value: form.target_value.trim() || null,
      current_value: form.current_value.trim() || null,
      due_date: form.due_date || null,
      assigned_to_user_id: form.assigned_to_user_id || null,
      related_product_idea_id: form.related_product_idea_id || null,
      status: "active",
    })
    setSaving(false)
    onCreated()
    onClose()
  }

  return (
    <LargeModal
      title="Add Research Goal"
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !form.title.trim()}>
            {saving ? "Saving..." : "Add Goal"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Title *</label>
          <input
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-md bg-background"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-sm border rounded-md bg-background resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Type</label>
            <select
              value={form.goal_type}
              onChange={(e) => update("goal_type", e.target.value as GoalType)}
              className="w-full px-3 py-2 text-sm border rounded-md bg-background"
            >
              <option value="discovery">Discovery</option>
              <option value="validation">Validation</option>
              <option value="launch">Launch</option>
              <option value="learning">Learning</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Due Date</label>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => update("due_date", e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md bg-background"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Target Metric</label>
            <input
              value={form.target_metric}
              onChange={(e) => update("target_metric", e.target.value)}
              placeholder="e.g. sign-ups"
              className="w-full px-3 py-2 text-sm border rounded-md bg-background"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Target Value</label>
            <input
              value={form.target_value}
              onChange={(e) => update("target_value", e.target.value)}
              placeholder="e.g. 100"
              className="w-full px-3 py-2 text-sm border rounded-md bg-background"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Current Value</label>
            <input
              value={form.current_value}
              onChange={(e) => update("current_value", e.target.value)}
              placeholder="e.g. 25"
              className="w-full px-3 py-2 text-sm border rounded-md bg-background"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Assignee</label>
            <select
              value={form.assigned_to_user_id}
              onChange={(e) => update("assigned_to_user_id", e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md bg-background"
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name ?? u.email ?? u.id}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Related Product Idea</label>
            <select
              value={form.related_product_idea_id}
              onChange={(e) => update("related_product_idea_id", e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md bg-background"
            >
              <option value="">None</option>
              {productIdeas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title ?? p.name ?? p.id}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </LargeModal>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function GoalsPage() {
  const [loading, setLoading] = useState(true)
  const [goals, setGoals] = useState<ResearchGoal[]>([])
  const [users, setUsers] = useState<WorkspaceUser[]>([])
  const [productIdeas, setProductIdeas] = useState<ProductIdea[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [showAdd, setShowAdd] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [progressDraft, setProgressDraft] = useState<Record<string, string>>({})
  const [updating, setUpdating] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [goalsRes, usersRes, ideasRes] = await Promise.all([
      supabase.from("research_goals").select("*").order("created_at", { ascending: false }),
      supabase.from("users").select("id, full_name, email, avatar_url"),
      supabase.from("research_product_ideas").select("id, title, name"),
    ])
    setGoals((goalsRes.data as ResearchGoal[]) ?? [])
    setUsers((usersRes.data as WorkspaceUser[]) ?? [])
    setProductIdeas((ideasRes.data as ProductIdea[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const usersById = useMemo(() => {
    const map = new Map<string, WorkspaceUser>()
    users.forEach((u) => map.set(u.id, u))
    return map
  }, [users])

  const stats = useMemo(() => {
    const active = goals.filter((g) => g.status === "active").length
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const completedThisMonth = goals.filter(
      (g) => g.status === "completed" && new Date(g.created_at) >= startOfMonth
    ).length
    const atRisk = goals.filter(
      (g) => g.status === "active" && g.due_date && isOverdue(g.due_date)
    ).length
    return { active, completedThisMonth, atRisk }
  }, [goals])

  const filtered = useMemo(() => {
    return goals.filter((g) => {
      if (statusFilter !== "all" && g.status !== statusFilter) return false
      return true
    })
  }, [goals, statusFilter])

  async function updateProgress(goalId: string) {
    const text = progressDraft[goalId] ?? ""
    setUpdating(goalId)
    await supabase.from("research_goals").update({ progress_notes: text }).eq("id", goalId)
    setUpdating(null)
    void load()
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <SubNav items={SUB_NAV_ITEMS} />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target className="size-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Research Goals</h1>
          <span className="text-sm text-muted-foreground">({stats.active} active)</span>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="size-4 mr-1" /> Add Goal
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Active Goals" value={stats.active} color="text-blue-600" />
        <StatCard label="Completed This Month" value={stats.completedThisMonth} color="text-emerald-600" />
        <StatCard label="Goals at Risk" value={stats.atRisk} color="text-red-600" />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 border rounded-lg p-1 bg-card w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              statusFilter === tab.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Goals grid */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-12 text-center">
          <Target className="size-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">No research goals yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((g) => {
            const status = STATUS_BADGE[g.status ?? "active"] ?? STATUS_BADGE.active
            const type = TYPE_BADGE[g.goal_type ?? "discovery"] ?? TYPE_BADGE.discovery
            const assignee = g.assigned_to_user_id ? usersById.get(g.assigned_to_user_id) : null
            const pct = parsePercent(g.current_value, g.target_value)
            const overdue = g.due_date && isOverdue(g.due_date) && g.status === "active"
            const expanded = expandedId === g.id
            const draftVal = progressDraft[g.id] ?? g.progress_notes ?? ""
            return (
              <div
                key={g.id}
                className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => {
                    setExpandedId(expanded ? null : g.id)
                    if (!expanded) {
                      setProgressDraft((prev) => ({
                        ...prev,
                        [g.id]: g.progress_notes ?? "",
                      }))
                    }
                  }}
                  className="w-full text-left px-5 py-4 space-y-3 hover:bg-muted/20 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-base">{g.title}</h3>
                    <ChevronRight
                      className={`size-4 text-muted-foreground shrink-0 mt-1 transition-transform ${
                        expanded ? "rotate-90" : ""
                      }`}
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${type.bg} ${type.text}`}
                    >
                      {type.label}
                    </span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  {g.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {g.description}
                    </p>
                  )}
                  <div>
                    {pct != null ? (
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">
                            {g.target_metric ?? "Progress"}
                          </span>
                          <span className="font-medium">{pct}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    ) : g.target_value ? (
                      <div className="text-xs text-muted-foreground">
                        {g.target_metric && <span>{g.target_metric}: </span>}
                        <span className="font-medium text-foreground">
                          {g.current_value ?? "0"} / {g.target_value}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div
                      className={`inline-flex items-center gap-1 text-xs ${
                        overdue ? "text-red-600" : "text-muted-foreground"
                      }`}
                    >
                      {overdue ? (
                        <AlertCircle className="size-3.5" />
                      ) : (
                        <Calendar className="size-3.5" />
                      )}
                      {formatDate(g.due_date)}
                    </div>
                    {assignee && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center">
                          {initialsOf(assignee.full_name ?? assignee.email)}
                        </div>
                      </div>
                    )}
                  </div>
                </button>
                {expanded && (
                  <div className="px-5 py-4 border-t bg-muted/10 space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        Progress Notes
                      </label>
                      <textarea
                        value={draftVal}
                        onChange={(e) =>
                          setProgressDraft((prev) => ({ ...prev, [g.id]: e.target.value }))
                        }
                        rows={3}
                        className="w-full px-3 py-2 text-sm border rounded-md bg-background resize-none"
                        placeholder="Log updates, findings, blockers..."
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => updateProgress(g.id)}
                        disabled={updating === g.id}
                      >
                        {updating === g.id ? "Updating..." : "Update"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showAdd && (
        <AddGoalModal
          onClose={() => setShowAdd(false)}
          onCreated={load}
          users={users}
          productIdeas={productIdeas}
        />
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5">
      <div className="text-xs font-medium text-muted-foreground uppercase">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  )
}
