"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Tag,
  Plus,
  LifeBuoy,
  X,
  AlertTriangle,
  Ticket,
  User,
  MessageSquare,
  CheckCircle2,
  Clock,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { SubNav } from "@/components/shared/sub-nav"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CategorySource = "internal" | "client" | "both"
type CategoryPriority = "low" | "medium" | "high" | "urgent" | "critical"

interface CategoryRow {
  id: string
  name: string
  description: string | null
  source: CategorySource
  default_priority: CategoryPriority | null
  default_sla_hours: number | null
  default_assignee_team: string | null
  color: string | null
  icon: string | null
  is_active: boolean
  created_at?: string
  updated_at?: string
}

const TICKETS_SUBNAV = [
  { title: "Dashboard", href: "/workspace/tickets/dashboard" },
  { title: "All", href: "/workspace/tickets/all" },
  { title: "Internal", href: "/workspace/tickets/internal" },
  { title: "Client", href: "/workspace/tickets/client" },
  { title: "Categories", href: "/workspace/tickets/categories" },
]

const SOURCE_STYLES: Record<CategorySource, string> = {
  internal: "bg-blue-50 text-blue-700",
  client: "bg-violet-50 text-violet-700",
  both: "bg-emerald-50 text-emerald-700",
}

const PRIORITY_STYLES: Record<CategoryPriority, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-50 text-blue-700",
  high: "bg-amber-50 text-amber-700",
  urgent: "bg-orange-50 text-orange-700",
  critical: "bg-red-50 text-red-700",
}

const TEAM_OPTIONS = [
  "support",
  "engineering",
  "operations",
  "finance",
  "marketing",
  "sales",
  "design",
]

const ICON_OPTIONS = [
  "Ticket",
  "LifeBuoy",
  "MessageSquare",
  "User",
  "AlertTriangle",
  "CheckCircle2",
  "Clock",
  "Tag",
]

const ICON_MAP: Record<string, typeof Ticket> = {
  Ticket,
  LifeBuoy,
  MessageSquare,
  User,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Tag,
}

const COLOR_OPTIONS = [
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#64748b",
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSla(hours: number | null): string {
  if (hours == null) return "—"
  if (hours < 24) return `${hours}h`
  const days = hours / 24
  return Number.isInteger(days) ? `${days}d` : `${days.toFixed(1)}d`
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type FilterTab = "all" | "internal" | "client" | "both"

export default function TicketCategoriesPage() {
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterTab>("all")
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CategoryRow | null>(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from("ticket_categories")
      .select("*")
      .order("name")
    setCategories((data as CategoryRow[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const counts = useMemo(() => {
    return {
      internal: categories.filter((c) => c.source === "internal" || c.source === "both").length,
      client: categories.filter((c) => c.source === "client" || c.source === "both").length,
    }
  }, [categories])

  const filtered = useMemo(() => {
    if (filter === "all") return categories
    return categories.filter((c) => c.source === filter)
  }, [categories, filter])

  async function toggleActive(c: CategoryRow) {
    const { error } = await supabase
      .from("ticket_categories")
      .update({ is_active: !c.is_active })
      .eq("id", c.id)
    if (!error) {
      setCategories((prev) =>
        prev.map((r) => (r.id === c.id ? { ...r, is_active: !c.is_active } : r)),
      )
    }
  }

  async function archiveCategory(c: CategoryRow) {
    if (!confirm(`Archive "${c.name}"? It will be hidden from new tickets.`)) return
    const { error } = await supabase
      .from("ticket_categories")
      .update({ is_active: false })
      .eq("id", c.id)
    if (!error) {
      setCategories((prev) =>
        prev.map((r) => (r.id === c.id ? { ...r, is_active: false } : r)),
      )
    }
  }

  function openAdd() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(c: CategoryRow) {
    setEditing(c)
    setModalOpen(true)
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <SubNav items={TICKETS_SUBNAV} />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Ticket Categories</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {loading ? "Loading..." : `${categories.length} categories`}
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add Category
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Internal Categories</p>
            <p className="text-2xl font-bold font-heading mt-2">{counts.internal}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Ticket className="h-4 w-4" />
          </div>
        </div>
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Client Categories</p>
            <p className="text-2xl font-bold font-heading mt-2">{counts.client}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
            <MessageSquare className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {(["all", "internal", "client", "both"] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
              filter === tab
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
          Categories
        </div>
        {loading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-md" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Tag className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No categories</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Add a category to start organizing tickets.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-2.5 font-medium">Name</th>
                  <th className="text-left px-3 py-2.5 font-medium">Source</th>
                  <th className="text-left px-3 py-2.5 font-medium">Description</th>
                  <th className="text-left px-3 py-2.5 font-medium">Priority</th>
                  <th className="text-left px-3 py-2.5 font-medium">SLA</th>
                  <th className="text-left px-3 py-2.5 font-medium">Team</th>
                  <th className="text-left px-3 py-2.5 font-medium">Active</th>
                  <th className="text-right px-5 py-2.5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((c) => {
                  const Icon = c.icon ? ICON_MAP[c.icon] ?? Tag : Tag
                  return (
                    <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="h-7 w-7 rounded-md flex items-center justify-center text-white"
                            style={{ backgroundColor: c.color ?? "#64748b" }}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <span className="font-medium text-foreground">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase ${SOURCE_STYLES[c.source]}`}
                        >
                          {c.source}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground max-w-xs line-clamp-1">
                        {c.description ?? "—"}
                      </td>
                      <td className="px-3 py-3">
                        {c.default_priority ? (
                          <span
                            className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase ${PRIORITY_STYLES[c.default_priority]}`}
                          >
                            {c.default_priority}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {formatSla(c.default_sla_hours)}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground capitalize">
                        {c.default_assignee_team ?? "—"}
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => toggleActive(c)}
                          className={`relative h-5 w-9 rounded-full transition-colors ${
                            c.is_active ? "bg-emerald-500" : "bg-slate-300"
                          }`}
                          aria-label="Toggle active"
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                              c.is_active ? "translate-x-4" : ""
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => openEdit(c)}
                          className="text-xs font-medium text-primary hover:underline mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => archiveCategory(c)}
                          className="text-xs font-medium text-muted-foreground hover:text-red-600 hover:underline"
                        >
                          Archive
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <CategoryModal
          editing={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false)
            load()
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Category Modal
// ---------------------------------------------------------------------------

function CategoryModal({
  editing,
  onClose,
  onSaved,
}: {
  editing: CategoryRow | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(editing?.name ?? "")
  const [source, setSource] = useState<CategorySource>(editing?.source ?? "internal")
  const [description, setDescription] = useState(editing?.description ?? "")
  const [defaultPriority, setDefaultPriority] = useState<CategoryPriority>(
    editing?.default_priority ?? "medium",
  )
  const [defaultSlaHours, setDefaultSlaHours] = useState<string>(
    editing?.default_sla_hours != null ? String(editing.default_sla_hours) : "24",
  )
  const [defaultTeam, setDefaultTeam] = useState(editing?.default_assignee_team ?? "support")
  const [color, setColor] = useState(editing?.color ?? COLOR_OPTIONS[0])
  const [icon, setIcon] = useState(editing?.icon ?? "Tag")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError("Name is required")
      return
    }
    setSubmitting(true)
    setError(null)
    const payload = {
      name: name.trim(),
      source,
      description: description.trim() || null,
      default_priority: defaultPriority,
      default_sla_hours: defaultSlaHours ? Number(defaultSlaHours) : null,
      default_assignee_team: defaultTeam || null,
      color,
      icon,
      is_active: editing?.is_active ?? true,
    }
    const res = editing
      ? await supabase.from("ticket_categories").update(payload).eq("id", editing.id)
      : await supabase.from("ticket_categories").insert(payload)
    setSubmitting(false)
    if (res.error) {
      setError(res.error.message)
      return
    }
    onSaved()
  }

  const SelectedIcon = ICON_MAP[icon] ?? Tag

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm py-10 px-4">
      <div className="w-full max-w-xl rounded-lg border border-border/80 bg-card shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b">
          <div className="flex items-center gap-2">
            <div
              className="h-8 w-8 rounded-lg text-white flex items-center justify-center"
              style={{ backgroundColor: color }}
            >
              <SelectedIcon className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-[0.9375rem] font-semibold tracking-tight">
                {editing ? "Edit Category" : "Add Category"}
              </h2>
              <p className="text-xs text-muted-foreground">Configure category defaults</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Source
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as CategorySource)}
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="internal">Internal</option>
                <option value="client">Client</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Default Priority
              </label>
              <select
                value={defaultPriority}
                onChange={(e) => setDefaultPriority(e.target.value as CategoryPriority)}
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-y"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Default SLA (hours)
              </label>
              <input
                type="number"
                min={0}
                value={defaultSlaHours}
                onChange={(e) => setDefaultSlaHours(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Default Team
              </label>
              <select
                value={defaultTeam}
                onChange={(e) => setDefaultTeam(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              >
                {TEAM_OPTIONS.map((t) => (
                  <option key={t} value={t} className="capitalize">
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-md transition-all ${
                    color === c ? "ring-2 ring-offset-2 ring-primary" : ""
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Icon</label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map((name) => {
                const Icon = ICON_MAP[name]
                const active = icon === name
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setIcon(name)}
                    className={`h-8 w-8 rounded-md border flex items-center justify-center transition-colors ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted/40"
                    }`}
                    title={name}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                )
              })}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 text-red-700 px-3 py-2 text-xs">
              <AlertTriangle className="h-3.5 w-3.5" />
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : editing ? "Save Changes" : "Create Category"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
