"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Lightbulb,
  Plus,
  X,
  ChevronRight,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Status =
  | "idea"
  | "researching"
  | "validating"
  | "approved"
  | "launched"
  | "rejected"

type Priority = "low" | "medium" | "high" | "critical"

interface ProductIdea {
  id: string
  title: string
  description: string | null
  category: string | null
  status: Status
  priority: Priority
  source: string | null
  estimated_wholesale_price_cents: number | null
  estimated_retail_price_cents: number | null
  estimated_margin_pct: number | null
  target_audience: string | null
  market_size: string | null
  competitor_count: number | null
  research_notes: string | null
  validation_score: number | null
  image_urls: string[] | null
  reference_urls: string[] | null
  tags: string[] | null
  assigned_to_user_id: string | null
  brand_store_id: string | null
  created_at: string
  updated_at: string
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUSES: Status[] = [
  "idea",
  "researching",
  "validating",
  "approved",
  "launched",
  "rejected",
]

const PRIORITIES: Priority[] = ["low", "medium", "high", "critical"]

const STATUS_COLORS: Record<Status, string> = {
  idea: "bg-slate-100 text-slate-700",
  researching: "bg-blue-50 text-blue-700",
  validating: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  launched: "bg-violet-50 text-violet-700",
  rejected: "bg-red-50 text-red-700",
}

const STATUS_LABELS: Record<Status, string> = {
  idea: "Idea",
  researching: "Researching",
  validating: "Validating",
  approved: "Approved",
  launched: "Launched",
  rejected: "Rejected",
}

const PRIORITY_COLORS: Record<Priority, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-50 text-blue-700",
  high: "bg-amber-50 text-amber-700",
  critical: "bg-red-50 text-red-700",
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function scoreColor(score: number | null) {
  if (score == null) return "#cbd5e1"
  if (score < 40) return "#ef4444"
  if (score < 70) return "#f59e0b"
  return "#10b981"
}

/* ------------------------------------------------------------------ */
/*  Score donut                                                        */
/* ------------------------------------------------------------------ */

function ScoreDonut({ value, size = 36 }: { value: number | null; size?: number }) {
  const v = value ?? 0
  const stroke = 4
  const radius = (size - stroke) / 2
  const circ = 2 * Math.PI * radius
  const offset = circ - (v / 100) * circ
  const color = scoreColor(value)
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dy="0.35em"
        fontSize={size * 0.32}
        fontWeight={600}
        fill="#334155"
      >
        {value == null ? "–" : v}
      </text>
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function Skeleton() {
  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <div className="h-8 w-64 bg-muted animate-pulse rounded" />
      <div className="h-10 w-full bg-muted animate-pulse rounded" />
      <div className="grid grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-80 bg-muted/60 animate-pulse rounded-lg"
          />
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ResearchProductsPage() {
  const router = useRouter()
  const [ideas, setIdeas] = useState<ProductIdea[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"kanban" | "table">("kanban")
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("")
  const [assigneeFilter, setAssigneeFilter] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [sortKey, setSortKey] = useState<string>("updated_at")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("research_product_ideas")
      .select("*")
      .order("updated_at", { ascending: false })
    if (!error && data) setIdeas(data as ProductIdea[])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const categories = useMemo(() => {
    const s = new Set<string>()
    ideas.forEach((i) => i.category && s.add(i.category))
    return Array.from(s).sort()
  }, [ideas])

  const assignees = useMemo(() => {
    const s = new Set<string>()
    ideas.forEach((i) => i.assigned_to_user_id && s.add(i.assigned_to_user_id))
    return Array.from(s).sort()
  }, [ideas])

  const filtered = useMemo(() => {
    return ideas.filter((i) => {
      if (
        search &&
        !i.title.toLowerCase().includes(search.toLowerCase())
      )
        return false
      if (categoryFilter && i.category !== categoryFilter) return false
      if (priorityFilter && i.priority !== priorityFilter) return false
      if (assigneeFilter && i.assigned_to_user_id !== assigneeFilter)
        return false
      return true
    })
  }, [ideas, search, categoryFilter, priorityFilter, assigneeFilter])

  const byStatus = useMemo(() => {
    const map: Record<Status, ProductIdea[]> = {
      idea: [],
      researching: [],
      validating: [],
      approved: [],
      launched: [],
      rejected: [],
    }
    filtered.forEach((i) => map[i.status]?.push(i))
    return map
  }, [filtered])

  const sortedForTable = useMemo(() => {
    const copy = [...filtered]
    copy.sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortKey]
      const bv = (b as unknown as Record<string, unknown>)[sortKey]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (av < bv) return sortDir === "asc" ? -1 : 1
      if (av > bv) return sortDir === "asc" ? 1 : -1
      return 0
    })
    return copy
  }, [filtered, sortKey, sortDir])

  const toggleSort = (k: string) => {
    if (sortKey === k) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortKey(k)
      setSortDir("desc")
    }
  }

  if (loading) return <Skeleton />

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Lightbulb className="h-6 w-6 text-amber-500" />
            <h1 className="text-2xl font-bold">Product Ideas</h1>
            <span className="text-sm text-muted-foreground font-medium">
              {filtered.length}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Validate ideas before they become listings
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" /> Add Idea
        </Button>
      </div>

      {/* View toggle + Filters */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3 flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-md border border-border/80 overflow-hidden">
            <button
              onClick={() => setView("kanban")}
              className={`px-3 py-1.5 text-xs font-medium ${
                view === "kanban"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted"
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setView("table")}
              className={`px-3 py-1.5 text-xs font-medium ${
                view === "table"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted"
              }`}
            >
              Table
            </button>
          </div>
          <input
            type="text"
            placeholder="Search by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 rounded-md border border-border/80 bg-background px-3 text-xs flex-1 min-w-[180px]"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-8 rounded-md border border-border/80 bg-background px-2 text-xs"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-8 rounded-md border border-border/80 bg-background px-2 text-xs"
          >
            <option value="">All priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="h-8 rounded-md border border-border/80 bg-background px-2 text-xs"
          >
            <option value="">All assignees</option>
            {assignees.map((a) => (
              <option key={a} value={a}>
                {a.slice(0, 8)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Kanban */}
      {view === "kanban" && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto">
          {STATUSES.map((s) => (
            <div
              key={s}
              className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden flex flex-col min-h-[300px]"
            >
              <div className="px-3 py-2.5 border-b flex items-center justify-between">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[s]}`}
                >
                  {STATUS_LABELS[s]}
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  {byStatus[s].length}
                </span>
              </div>
              <div className="flex-1 p-2 space-y-2">
                {byStatus[s].map((idea) => (
                  <button
                    key={idea.id}
                    onClick={() =>
                      router.push(`/workspace/research/products/${idea.id}`)
                    }
                    className="w-full text-left rounded-md border border-border/70 bg-background hover:shadow-md hover:border-primary/40 transition-all p-2.5 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm line-clamp-2">
                          {idea.title}
                        </div>
                        {idea.category && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {idea.category}
                          </div>
                        )}
                      </div>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${PRIORITY_COLORS[idea.priority]}`}
                      >
                        {idea.priority}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <ScoreDonut value={idea.validation_score} />
                      <div className="text-xs text-muted-foreground text-right">
                        <div className="font-semibold text-foreground">
                          {idea.estimated_margin_pct != null
                            ? `${idea.estimated_margin_pct}%`
                            : "—"}
                        </div>
                        <div>margin</div>
                      </div>
                    </div>
                    {idea.tags && idea.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {idea.tags.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
                {byStatus[s].length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-6">
                    No ideas
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {view === "table" && (
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
            All Ideas
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left text-xs font-medium text-muted-foreground">
                  {[
                    ["title", "Title"],
                    ["category", "Category"],
                    ["status", "Status"],
                    ["priority", "Priority"],
                    ["validation_score", "Validation"],
                    ["estimated_margin_pct", "Margin %"],
                    ["updated_at", "Updated"],
                  ].map(([k, label]) => (
                    <th
                      key={k}
                      onClick={() => toggleSort(k)}
                      className="px-4 py-2.5 cursor-pointer select-none hover:text-foreground"
                    >
                      {label}
                      {sortKey === k && (
                        <span className="ml-1">
                          {sortDir === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </th>
                  ))}
                  <th className="px-4 py-2.5">Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedForTable.map((i) => (
                  <tr
                    key={i.id}
                    className="border-t border-border/60 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-medium">{i.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {i.category ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[i.status]}`}
                      >
                        {STATUS_LABELS[i.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_COLORS[i.priority]}`}
                      >
                        {i.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 w-40">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${i.validation_score ?? 0}%`,
                              background: scoreColor(i.validation_score),
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-right">
                          {i.validation_score ?? "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {i.estimated_margin_pct != null
                        ? `${i.estimated_margin_pct}%`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(i.updated_at)}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          router.push(
                            `/workspace/research/products/${i.id}`
                          )
                        }
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {sortedForTable.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      No ideas match the filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAdd && (
        <AddIdeaModal
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false)
            load()
          }}
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Add Idea Modal                                                     */
/* ------------------------------------------------------------------ */

function AddIdeaModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [priority, setPriority] = useState<Priority>("medium")
  const [source, setSource] = useState("")
  const [wholesale, setWholesale] = useState("")
  const [retail, setRetail] = useState("")
  const [targetAudience, setTargetAudience] = useState("")
  const [tags, setTags] = useState("")
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!title.trim()) return
    setSaving(true)
    const wholesaleCents = wholesale
      ? Math.round(parseFloat(wholesale) * 100)
      : null
    const retailCents = retail ? Math.round(parseFloat(retail) * 100) : null
    let margin: number | null = null
    if (wholesaleCents != null && retailCents != null && retailCents > 0) {
      margin = Math.round(
        ((retailCents - wholesaleCents) / retailCents) * 100
      )
    }
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      category: category.trim() || null,
      status: "idea" as Status,
      priority,
      source: source.trim() || null,
      estimated_wholesale_price_cents: wholesaleCents,
      estimated_retail_price_cents: retailCents,
      estimated_margin_pct: margin,
      target_audience: targetAudience.trim() || null,
      tags: tags
        ? tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : null,
    }
    const { error } = await supabase
      .from("research_product_ideas")
      .insert(payload)
    setSaving(false)
    if (!error) onCreated()
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-lg border border-border/80 shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight flex items-center justify-between">
          <span>Add Product Idea</span>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto">
          <Field label="Title *">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
            />
          </Field>
          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-border/80 bg-background px-3 py-2 text-sm resize-none"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
              />
            </Field>
            <Field label="Priority">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full h-9 rounded-md border border-border/80 bg-background px-2 text-sm"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Source">
            <input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g. TikTok, Trade show, Customer request"
              className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Wholesale $">
              <input
                type="number"
                step="0.01"
                value={wholesale}
                onChange={(e) => setWholesale(e.target.value)}
                className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
              />
            </Field>
            <Field label="Retail $">
              <input
                type="number"
                step="0.01"
                value={retail}
                onChange={(e) => setRetail(e.target.value)}
                className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
              />
            </Field>
          </div>
          <Field label="Target audience">
            <input
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
            />
          </Field>
          <Field label="Tags (comma-separated)">
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="eco, handmade, gift"
              className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
            />
          </Field>
        </div>
        <div className="px-5 py-3 border-t flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving || !title.trim()}>
            {saving ? "Saving..." : "Create"}
          </Button>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-muted-foreground mb-1">
        {label}
      </div>
      {children}
    </label>
  )
}

