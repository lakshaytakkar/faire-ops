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
  Telescope,
  Plus,
  X,
  Globe,
  Building2,
  Camera as Instagram,
  AlertCircle,
  Edit,
} from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ResearchCompetitor {
  id: string
  name: string
  category: string | null
  website_url: string | null
  faire_url: string | null
  instagram_url: string | null
  description: string | null
  why_competing: string | null
  estimated_revenue: string | null
  product_count_estimate: number | null
  strengths: string[] | null
  weaknesses: string[] | null
  monitoring_notes: string | null
  status: string | null
  last_checked_at: string | null
  tags: string[] | null
  created_at: string
}

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
] as const

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Active" },
  archived: { bg: "bg-slate-100", text: "text-slate-600", label: "Archived" },
  watching: { bg: "bg-blue-50", text: "text-blue-700", label: "Watching" },
}

function formatDaysAgo(dateStr: string | null): string {
  if (!dateStr) return "Never checked"
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return "Checked today"
  if (days === 1) return "1 day ago"
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? "1 month ago" : `${months} months ago`
}

/* ------------------------------------------------------------------ */
/*  Add Competitor Modal                                               */
/* ------------------------------------------------------------------ */

function AddCompetitorModal({
  onClose,
  onCreated,
  editing,
}: {
  onClose: () => void
  onCreated: () => void
  editing?: ResearchCompetitor | null
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: editing?.name ?? "",
    category: editing?.category ?? "",
    website_url: editing?.website_url ?? "",
    faire_url: editing?.faire_url ?? "",
    instagram_url: editing?.instagram_url ?? "",
    description: editing?.description ?? "",
    why_competing: editing?.why_competing ?? "",
    estimated_revenue: editing?.estimated_revenue ?? "",
    product_count_estimate: editing?.product_count_estimate?.toString() ?? "",
    strengths: (editing?.strengths ?? []).join(", "),
    weaknesses: (editing?.weaknesses ?? []).join(", "),
    monitoring_notes: editing?.monitoring_notes ?? "",
  })

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((p) => ({ ...p, [key]: value }))
  }

  async function handleSubmit() {
    if (!form.name.trim()) return
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      category: form.category.trim() || null,
      website_url: form.website_url.trim() || null,
      faire_url: form.faire_url.trim() || null,
      instagram_url: form.instagram_url.trim() || null,
      description: form.description.trim() || null,
      why_competing: form.why_competing.trim() || null,
      estimated_revenue: form.estimated_revenue.trim() || null,
      product_count_estimate: form.product_count_estimate
        ? parseInt(form.product_count_estimate, 10)
        : null,
      strengths: form.strengths
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      weaknesses: form.weaknesses
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      monitoring_notes: form.monitoring_notes.trim() || null,
      status: editing?.status ?? "active",
    }
    if (editing) {
      await supabase.from("research_competitors").update(payload).eq("id", editing.id)
    } else {
      await supabase.from("research_competitors").insert(payload)
    }
    setSaving(false)
    onCreated()
    onClose()
  }

  return (
    <LargeModal
      title={editing ? "Edit Competitor" : "Add Competitor"}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !form.name.trim()}>
            {saving ? "Saving..." : editing ? "Save Changes" : "Add Competitor"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name" required>
            <input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md bg-background"
            />
          </Field>
          <Field label="Category">
            <input
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md bg-background"
              placeholder="e.g. Home Decor"
            />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Website URL">
            <input
              value={form.website_url}
              onChange={(e) => update("website_url", e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md bg-background"
              placeholder="https://"
            />
          </Field>
          <Field label="Faire URL">
            <input
              value={form.faire_url}
              onChange={(e) => update("faire_url", e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md bg-background"
              placeholder="https://faire.com/"
            />
          </Field>
          <Field label="Instagram URL">
            <input
              value={form.instagram_url}
              onChange={(e) => update("instagram_url", e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md bg-background"
              placeholder="https://instagram.com/"
            />
          </Field>
        </div>
        <Field label="Description">
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            rows={2}
            className="w-full px-3 py-2 text-sm border rounded-md bg-background resize-none"
          />
        </Field>
        <Field label="Why Competing">
          <textarea
            value={form.why_competing}
            onChange={(e) => update("why_competing", e.target.value)}
            rows={2}
            className="w-full px-3 py-2 text-sm border rounded-md bg-background resize-none"
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Estimated Revenue">
            <input
              value={form.estimated_revenue}
              onChange={(e) => update("estimated_revenue", e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md bg-background"
              placeholder="e.g. $1M / year"
            />
          </Field>
          <Field label="Product Count Estimate">
            <input
              type="number"
              value={form.product_count_estimate}
              onChange={(e) => update("product_count_estimate", e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md bg-background"
            />
          </Field>
        </div>
        <Field label="Strengths (comma-separated)">
          <textarea
            value={form.strengths}
            onChange={(e) => update("strengths", e.target.value)}
            rows={2}
            className="w-full px-3 py-2 text-sm border rounded-md bg-background resize-none"
            placeholder="Strong brand, great packaging, wide distribution"
          />
        </Field>
        <Field label="Weaknesses (comma-separated)">
          <textarea
            value={form.weaknesses}
            onChange={(e) => update("weaknesses", e.target.value)}
            rows={2}
            className="w-full px-3 py-2 text-sm border rounded-md bg-background resize-none"
            placeholder="High prices, limited variety"
          />
        </Field>
        <Field label="Monitoring Notes">
          <textarea
            value={form.monitoring_notes}
            onChange={(e) => update("monitoring_notes", e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-sm border rounded-md bg-background resize-none"
          />
        </Field>
      </div>
    </LargeModal>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Detail Drawer                                                      */
/* ------------------------------------------------------------------ */

function CompetitorDetail({
  competitor,
  onClose,
  onEdit,
}: {
  competitor: ResearchCompetitor
  onClose: () => void
  onEdit: () => void
}) {
  const badge = STATUS_BADGE[competitor.status ?? "active"] ?? STATUS_BADGE.active
  return (
    <LargeModal
      title={competitor.name}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onEdit}>
            <Edit className="size-4 mr-1" /> Edit
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-2 flex-wrap">
          {competitor.category && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {competitor.category}
            </span>
          )}
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}
          >
            {badge.label}
          </span>
        </div>

        {competitor.description && (
          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">
              Description
            </h4>
            <p className="text-sm">{competitor.description}</p>
          </div>
        )}

        {competitor.why_competing && (
          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">
              Why Competing
            </h4>
            <p className="text-sm italic text-muted-foreground">
              {competitor.why_competing}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Estimated Revenue</div>
            <div className="text-sm font-semibold mt-0.5">
              {competitor.estimated_revenue ?? "—"}
            </div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs text-muted-foreground">Product Count</div>
            <div className="text-sm font-semibold mt-0.5">
              {competitor.product_count_estimate ?? "—"}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
              Strengths
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {(competitor.strengths ?? []).length === 0 && (
                <span className="text-xs text-muted-foreground">None listed</span>
              )}
              {(competitor.strengths ?? []).map((s, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
              Weaknesses
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {(competitor.weaknesses ?? []).length === 0 && (
                <span className="text-xs text-muted-foreground">None listed</span>
              )}
              {(competitor.weaknesses ?? []).map((w, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700"
                >
                  {w}
                </span>
              ))}
            </div>
          </div>
        </div>

        {competitor.monitoring_notes && (
          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">
              Monitoring Notes
            </h4>
            <p className="text-sm whitespace-pre-wrap">{competitor.monitoring_notes}</p>
          </div>
        )}

        <div className="flex items-center gap-3 text-sm pt-2 border-t">
          {competitor.website_url && (
            <a
              href={competitor.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <Globe className="size-4" /> Website
            </a>
          )}
          {competitor.faire_url && (
            <a
              href={competitor.faire_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <Building2 className="size-4" /> Faire
            </a>
          )}
          {competitor.instagram_url && (
            <a
              href={competitor.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <Instagram className="size-4" /> Instagram
            </a>
          )}
        </div>
      </div>
    </LargeModal>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CompetitorsPage() {
  const [loading, setLoading] = useState(true)
  const [competitors, setCompetitors] = useState<ResearchCompetitor[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<ResearchCompetitor | null>(null)
  const [selected, setSelected] = useState<ResearchCompetitor | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from("research_competitors")
      .select("*")
      .order("created_at", { ascending: false })
    setCompetitors((data as ResearchCompetitor[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const categories = useMemo(() => {
    const set = new Set<string>()
    competitors.forEach((c) => c.category && set.add(c.category))
    return Array.from(set).sort()
  }, [competitors])

  const filtered = useMemo(() => {
    return competitors.filter((c) => {
      if (statusFilter !== "all" && (c.status ?? "active") !== statusFilter) return false
      if (categoryFilter !== "all" && c.category !== categoryFilter) return false
      return true
    })
  }, [competitors, statusFilter, categoryFilter])

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <SubNav items={SUB_NAV_ITEMS} />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Telescope className="size-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Competitors</h1>
          <span className="text-sm text-muted-foreground">({filtered.length})</span>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="size-4 mr-1" /> Add Competitor
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 border rounded-lg p-1 bg-card">
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
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border rounded-md bg-card"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-12 text-center">
          <Telescope className="size-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">No competitors yet. Add one to start tracking.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => {
            const badge = STATUS_BADGE[c.status ?? "active"] ?? STATUS_BADGE.active
            const strengths = c.strengths ?? []
            const weaknesses = c.weaknesses ?? []
            return (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden text-left hover:shadow-md transition-shadow cursor-pointer flex flex-col"
              >
                <div className="px-5 py-4 space-y-3 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-base">{c.name}</h3>
                      {c.category && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground mt-1 inline-block">
                          {c.category}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  {c.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {c.description}
                    </p>
                  )}
                  {c.why_competing && (
                    <p className="text-xs italic text-muted-foreground line-clamp-2">
                      “{c.why_competing}”
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="rounded-md bg-muted/40 p-2">
                      <div className="text-[10px] text-muted-foreground uppercase">Revenue</div>
                      <div className="text-xs font-semibold truncate">
                        {c.estimated_revenue ?? "—"}
                      </div>
                    </div>
                    <div className="rounded-md bg-muted/40 p-2">
                      <div className="text-[10px] text-muted-foreground uppercase">Products</div>
                      <div className="text-xs font-semibold">
                        {c.product_count_estimate ?? "—"}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap gap-1">
                      {strengths.slice(0, 3).map((s, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700"
                        >
                          {s}
                        </span>
                      ))}
                      {strengths.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{strengths.length - 3} more
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {weaknesses.slice(0, 3).map((w, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700"
                        >
                          {w}
                        </span>
                      ))}
                      {weaknesses.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{weaknesses.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="px-5 py-3 border-t flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {c.website_url && (
                      <span title="Website">
                        <Globe className="size-3.5" />
                      </span>
                    )}
                    {c.faire_url && (
                      <span title="Faire">
                        <Building2 className="size-3.5" />
                      </span>
                    )}
                    {c.instagram_url && (
                      <span title="Instagram">
                        <Instagram className="size-3.5" />
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                    {!c.last_checked_at && <AlertCircle className="size-3 text-amber-500" />}
                    {formatDaysAgo(c.last_checked_at)}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Modals */}
      {showAdd && (
        <AddCompetitorModal
          onClose={() => setShowAdd(false)}
          onCreated={load}
        />
      )}
      {editing && (
        <AddCompetitorModal
          editing={editing}
          onClose={() => setEditing(null)}
          onCreated={load}
        />
      )}
      {selected && !editing && (
        <CompetitorDetail
          competitor={selected}
          onClose={() => setSelected(null)}
          onEdit={() => {
            setEditing(selected)
            setSelected(null)
          }}
        />
      )}
    </div>
  )
}
