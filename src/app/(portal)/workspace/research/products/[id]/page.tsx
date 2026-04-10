"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Plus,
  X,
  ExternalLink,
  ImageIcon,
  Edit,
  Trash2,
  User,
  Target,
  TrendingUp,
  Lightbulb,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import {
  RichTextEditor,
  RichTextRenderer,
} from "@/components/shared/rich-text-editor"

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

interface LinkedItem {
  id: string
  title: string
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

function formatDollars(cents: number | null) {
  if (cents == null) return "—"
  return `$${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatDate(iso: string | null) {
  if (!iso) return "—"
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
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function Skeleton() {
  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <div className="h-4 w-32 bg-muted animate-pulse rounded" />
      <div className="h-28 bg-muted/60 animate-pulse rounded-lg" />
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-muted/60 animate-pulse rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-5">
          <div className="h-40 bg-muted/60 animate-pulse rounded-lg" />
          <div className="h-60 bg-muted/60 animate-pulse rounded-lg" />
        </div>
        <div className="space-y-5">
          <div className="h-40 bg-muted/60 animate-pulse rounded-lg" />
          <div className="h-40 bg-muted/60 animate-pulse rounded-lg" />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ProductIdeaDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [idea, setIdea] = useState<ProductIdea | null>(null)
  const [loading, setLoading] = useState(true)
  const [linkedGoals, setLinkedGoals] = useState<LinkedItem[]>([])
  const [linkedReports, setLinkedReports] = useState<LinkedItem[]>([])
  const [editMode, setEditMode] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const { data } = await supabase
      .from("research_product_ideas")
      .select("*")
      .eq("id", id)
      .maybeSingle()
    if (data) setIdea(data as ProductIdea)

    const [{ data: g }, { data: r }] = await Promise.all([
      supabase
        .from("research_goals")
        .select("id, title")
        .eq("related_product_idea_id", id),
      supabase
        .from("research_reports")
        .select("id, title")
        .eq("related_product_idea_id", id),
    ])
    setLinkedGoals((g as LinkedItem[]) ?? [])
    setLinkedReports((r as LinkedItem[]) ?? [])
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const persist = useCallback(
    async (patch: Partial<ProductIdea>) => {
      if (!idea) return
      setIdea({ ...idea, ...patch })
      await supabase
        .from("research_product_ideas")
        .update(patch)
        .eq("id", idea.id)
    },
    [idea]
  )

  const margin = useMemo(() => {
    if (!idea) return null
    const w = idea.estimated_wholesale_price_cents
    const r = idea.estimated_retail_price_cents
    if (w == null || r == null || r <= 0) return idea.estimated_margin_pct
    return Math.round(((r - w) / r) * 100)
  }, [idea])

  if (loading) return <Skeleton />
  if (!idea) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <Link
          href="/workspace/research/products"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to product ideas
        </Link>
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-10 text-center text-sm text-muted-foreground">
          Product idea not found.
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Back */}
      <Link
        href="/workspace/research/products"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to product ideas
      </Link>

      {/* Header card */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-4 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {editMode ? (
              <input
                value={idea.title}
                onChange={(e) => setIdea({ ...idea, title: e.target.value })}
                onBlur={(e) => persist({ title: e.target.value })}
                className="w-full text-2xl font-bold bg-transparent border-b border-border/80 focus:outline-none focus:border-primary pb-1"
              />
            ) : (
              <h1 className="text-2xl font-bold">{idea.title}</h1>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {idea.category && (
                <span className="text-xs text-muted-foreground">
                  {idea.category}
                </span>
              )}
              <select
                value={idea.status}
                onChange={(e) =>
                  persist({ status: e.target.value as Status })
                }
                className={`text-xs font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer ${STATUS_COLORS[idea.status]}`}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <select
                value={idea.priority}
                onChange={(e) =>
                  persist({ priority: e.target.value as Priority })
                }
                className={`text-xs font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer ${PRIORITY_COLORS[idea.priority]}`}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              {idea.source && (
                <span className="text-xs text-muted-foreground">
                  via {idea.source}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                <User className="h-3.5 w-3.5" />
              </div>
              <span>
                {idea.assigned_to_user_id
                  ? idea.assigned_to_user_id.slice(0, 8)
                  : "Unassigned"}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditMode((e) => !e)}
            >
              <Edit className="h-3.5 w-3.5" />
              {editMode ? "Done" : "Edit"}
            </Button>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Validation Score"
          icon={<Target className="h-4 w-4 text-emerald-500" />}
        >
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold">
              {idea.validation_score ?? "—"}
            </span>
            {idea.validation_score != null && (
              <span className="text-xs text-muted-foreground">/100</span>
            )}
          </div>
          <div className="h-1.5 mt-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${idea.validation_score ?? 0}%`,
                background: scoreColor(idea.validation_score),
              }}
            />
          </div>
        </StatCard>
        <StatCard
          label="Margin"
          icon={<TrendingUp className="h-4 w-4 text-amber-500" />}
        >
          <div className="text-2xl font-bold mt-1">
            {margin != null ? `${margin}%` : "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Retail – wholesale
          </div>
        </StatCard>
        <StatCard
          label="Competitors"
          icon={<Lightbulb className="h-4 w-4 text-blue-500" />}
        >
          <div className="text-2xl font-bold mt-1">
            {idea.competitor_count ?? "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Known competitors
          </div>
        </StatCard>
        <StatCard
          label="Wholesale Price"
          icon={<TrendingUp className="h-4 w-4 text-violet-500" />}
        >
          <div className="text-2xl font-bold mt-1">
            {formatDollars(idea.estimated_wholesale_price_cents)}
          </div>
          <div className="text-xs text-muted-foreground mt-2">Estimated</div>
        </StatCard>
      </div>

      {/* 2-col layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left */}
        <div className="lg:col-span-2 space-y-5">
          {/* Description */}
          <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
              Description
            </div>
            <div className="p-5">
              {editMode ? (
                <textarea
                  value={idea.description ?? ""}
                  onChange={(e) =>
                    setIdea({ ...idea, description: e.target.value })
                  }
                  onBlur={(e) => persist({ description: e.target.value })}
                  rows={4}
                  className="w-full rounded-md border border-border/80 bg-background px-3 py-2 text-sm resize-none"
                />
              ) : (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {idea.description || "No description yet."}
                </p>
              )}
            </div>
          </div>

          {/* Research Notes */}
          <ResearchNotesCard idea={idea} onPersist={persist} />

          {/* Reference URLs */}
          <ReferenceUrlsCard idea={idea} onPersist={persist} />

          {/* Reference Images */}
          <ReferenceImagesCard idea={idea} onPersist={persist} />
        </div>

        {/* Right */}
        <div className="space-y-5">
          {/* Details */}
          <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
              Details
            </div>
            <div className="p-5 space-y-2 text-sm">
              <InfoRow
                label="Status"
                value={
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[idea.status]}`}
                  >
                    {STATUS_LABELS[idea.status]}
                  </span>
                }
              />
              <InfoRow
                label="Priority"
                value={
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_COLORS[idea.priority]}`}
                  >
                    {idea.priority}
                  </span>
                }
              />
              <EditableRow
                label="Category"
                value={idea.category}
                editMode={editMode}
                onSave={(v) => persist({ category: v })}
              />
              <EditableRow
                label="Source"
                value={idea.source}
                editMode={editMode}
                onSave={(v) => persist({ source: v })}
              />
              <EditableRow
                label="Target Audience"
                value={idea.target_audience}
                editMode={editMode}
                onSave={(v) => persist({ target_audience: v })}
              />
              <EditableRow
                label="Market Size"
                value={idea.market_size}
                editMode={editMode}
                onSave={(v) => persist({ market_size: v })}
              />
              <EditableRow
                label="Competitors"
                value={
                  idea.competitor_count != null
                    ? String(idea.competitor_count)
                    : null
                }
                editMode={editMode}
                onSave={(v) => {
                  const n = v ? parseInt(v, 10) : null
                  persist({
                    competitor_count: Number.isFinite(n as number)
                      ? (n as number)
                      : null,
                  })
                }}
              />
              <InfoRow label="Created" value={formatDate(idea.created_at)} />
            </div>
          </div>

          {/* Pricing */}
          <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
              Pricing
            </div>
            <div className="p-5 space-y-2 text-sm">
              <EditableRow
                label="Wholesale"
                value={
                  idea.estimated_wholesale_price_cents != null
                    ? (idea.estimated_wholesale_price_cents / 100).toFixed(2)
                    : null
                }
                editMode={editMode}
                prefix="$"
                onSave={(v) => {
                  const n = v ? Math.round(parseFloat(v) * 100) : null
                  persist({
                    estimated_wholesale_price_cents: Number.isFinite(
                      n as number
                    )
                      ? (n as number)
                      : null,
                  })
                }}
              />
              <EditableRow
                label="Retail"
                value={
                  idea.estimated_retail_price_cents != null
                    ? (idea.estimated_retail_price_cents / 100).toFixed(2)
                    : null
                }
                editMode={editMode}
                prefix="$"
                onSave={(v) => {
                  const n = v ? Math.round(parseFloat(v) * 100) : null
                  persist({
                    estimated_retail_price_cents: Number.isFinite(n as number)
                      ? (n as number)
                      : null,
                  })
                }}
              />
              <InfoRow
                label="Margin"
                value={margin != null ? `${margin}%` : "—"}
              />
            </div>
          </div>

          {/* Tags */}
          <TagsCard idea={idea} onPersist={persist} />

          {/* Linked Items */}
          <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
              Linked Items
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1.5">
                  Goals
                </div>
                {linkedGoals.length === 0 ? (
                  <div className="text-xs text-muted-foreground">None</div>
                ) : (
                  <ul className="space-y-1">
                    {linkedGoals.map((g) => (
                      <li key={g.id}>
                        <Link
                          href={`/workspace/research/goals/${g.id}`}
                          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                        >
                          {g.title}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1.5">
                  Reports
                </div>
                {linkedReports.length === 0 ? (
                  <div className="text-xs text-muted-foreground">None</div>
                ) : (
                  <ul className="space-y-1">
                    {linkedReports.map((r) => (
                      <li key={r.id}>
                        <Link
                          href={`/workspace/research/reports/${r.id}`}
                          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                        >
                          {r.title}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Sub-cards                                                          */
/* ------------------------------------------------------------------ */

function ResearchNotesCard({
  idea,
  onPersist,
}: {
  idea: ProductIdea
  onPersist: (patch: Partial<ProductIdea>) => Promise<void>
}) {
  const [value, setValue] = useState(idea.research_notes ?? "")
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    setValue(idea.research_notes ?? "")
  }, [idea.research_notes])

  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight flex items-center justify-between">
        <span>Research Notes</span>
        {!editing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditing(true)}
          >
            <Edit className="h-3.5 w-3.5" />
            Edit
          </Button>
        )}
      </div>
      <div className="p-5">
        {editing ? (
          <div
            onBlur={async () => {
              await onPersist({ research_notes: value })
              setEditing(false)
            }}
          >
            <RichTextEditor
              value={value}
              onChange={setValue}
              placeholder="Capture research findings, observations, hypotheses..."
              minHeight="160px"
            />
          </div>
        ) : value ? (
          <RichTextRenderer content={value} />
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Click Edit to add research notes.
          </p>
        )}
      </div>
    </div>
  )
}

function ReferenceUrlsCard({
  idea,
  onPersist,
}: {
  idea: ProductIdea
  onPersist: (patch: Partial<ProductIdea>) => Promise<void>
}) {
  const urls = idea.reference_urls ?? []
  const [newUrl, setNewUrl] = useState("")

  const addUrl = async () => {
    const v = newUrl.trim()
    if (!v) return
    await onPersist({ reference_urls: [...urls, v] })
    setNewUrl("")
  }

  const removeUrl = async (idx: number) => {
    const next = urls.filter((_, i) => i !== idx)
    await onPersist({ reference_urls: next })
  }

  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
        Reference URLs
      </div>
      <div className="p-5 space-y-3">
        {urls.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No reference links yet.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {urls.map((u, i) => (
              <li
                key={`${u}-${i}`}
                className="flex items-center gap-2 text-sm group"
              >
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <a
                  href={u}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline truncate flex-1"
                >
                  {u}
                </a>
                <button
                  onClick={() => removeUrl(i)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded"
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2 pt-2 border-t border-border/60">
          <input
            type="url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://..."
            onKeyDown={(e) => {
              if (e.key === "Enter") addUrl()
            }}
            className="flex-1 h-8 rounded-md border border-border/80 bg-background px-3 text-xs"
          />
          <Button size="sm" onClick={addUrl}>
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
      </div>
    </div>
  )
}

function ReferenceImagesCard({
  idea,
  onPersist,
}: {
  idea: ProductIdea
  onPersist: (patch: Partial<ProductIdea>) => Promise<void>
}) {
  const urls = idea.image_urls ?? []
  const [newUrl, setNewUrl] = useState("")

  const addUrl = async () => {
    const v = newUrl.trim()
    if (!v) return
    await onPersist({ image_urls: [...urls, v] })
    setNewUrl("")
  }

  const removeUrl = async (idx: number) => {
    const next = urls.filter((_, i) => i !== idx)
    await onPersist({ image_urls: next })
  }

  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
        Reference Images
      </div>
      <div className="p-5 space-y-3">
        {urls.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No reference images yet.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {urls.map((u, i) => (
              <div
                key={`${u}-${i}`}
                className="relative group aspect-square rounded-md overflow-hidden border border-border/80 bg-muted"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={u}
                  alt={`Reference ${i + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    ;(e.currentTarget as HTMLImageElement).style.display =
                      "none"
                  }}
                />
                <button
                  onClick={() => removeUrl(i)}
                  className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 pt-2 border-t border-border/60">
          <div className="relative flex-1">
            <ImageIcon className="h-3.5 w-3.5 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="Image URL..."
              onKeyDown={(e) => {
                if (e.key === "Enter") addUrl()
              }}
              className="w-full h-8 rounded-md border border-border/80 bg-background pl-7 pr-3 text-xs"
            />
          </div>
          <Button size="sm" onClick={addUrl}>
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
      </div>
    </div>
  )
}

function TagsCard({
  idea,
  onPersist,
}: {
  idea: ProductIdea
  onPersist: (patch: Partial<ProductIdea>) => Promise<void>
}) {
  const tags = idea.tags ?? []
  const [newTag, setNewTag] = useState("")

  const addTag = async () => {
    const v = newTag.trim()
    if (!v || tags.includes(v)) {
      setNewTag("")
      return
    }
    await onPersist({ tags: [...tags, v] })
    setNewTag("")
  }

  const removeTag = async (t: string) => {
    await onPersist({ tags: tags.filter((x) => x !== t) })
  }

  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
        Tags
      </div>
      <div className="p-5 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {tags.length === 0 && (
            <span className="text-xs text-muted-foreground italic">
              No tags
            </span>
          )}
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
            >
              {t}
              <button
                onClick={() => removeTag(t)}
                className="hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2 pt-2 border-t border-border/60">
          <input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Add tag..."
            onKeyDown={(e) => {
              if (e.key === "Enter") addTag()
            }}
            className="flex-1 h-8 rounded-md border border-border/80 bg-background px-3 text-xs"
          />
          <Button size="sm" onClick={addTag}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Small pieces                                                       */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  icon,
  children,
}: {
  label: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      {children}
    </div>
  )
}

function InfoRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value ?? "—"}</span>
    </div>
  )
}

function EditableRow({
  label,
  value,
  editMode,
  onSave,
  prefix,
}: {
  label: string
  value: string | null
  editMode: boolean
  onSave: (v: string) => void
  prefix?: string
}) {
  const [draft, setDraft] = useState(value ?? "")

  useEffect(() => {
    setDraft(value ?? "")
  }, [value])

  if (!editMode) {
    return (
      <InfoRow
        label={label}
        value={value ? `${prefix ?? ""}${value}` : "—"}
      />
    )
  }

  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onSave(draft)}
        className="h-7 rounded-md border border-border/80 bg-background px-2 text-sm text-right max-w-[60%]"
      />
    </div>
  )
}
