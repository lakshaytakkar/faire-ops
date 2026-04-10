"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Telescope,
  Plus,
  Heart,
  Star,
  ExternalLink,
  Search,
  Sparkles,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ResearchTool {
  id: string
  name: string
  category: string
  description: string | null
  url: string | null
  pricing: string | null
  pricing_details: string | null
  rating: number | null
  tags: string[] | null
  is_favorite: boolean | null
}

type Category =
  | "all"
  | "product-research"
  | "competitor"
  | "seo"
  | "trends"
  | "sourcing"
  | "ai"
  | "data"
  | "analytics"
  | "design"

const CATEGORIES: { key: Category; label: string }[] = [
  { key: "all", label: "All" },
  { key: "product-research", label: "Product Research" },
  { key: "competitor", label: "Competitor" },
  { key: "seo", label: "SEO" },
  { key: "trends", label: "Trends" },
  { key: "sourcing", label: "Sourcing" },
  { key: "ai", label: "AI" },
  { key: "data", label: "Data" },
  { key: "analytics", label: "Analytics" },
  { key: "design", label: "Design" },
]

const CATEGORY_BADGE: Record<string, string> = {
  "product-research": "bg-blue-50 text-blue-700",
  competitor: "bg-orange-50 text-orange-700",
  seo: "bg-emerald-50 text-emerald-700",
  trends: "bg-pink-50 text-pink-700",
  sourcing: "bg-amber-50 text-amber-700",
  ai: "bg-violet-50 text-violet-700",
  data: "bg-cyan-50 text-cyan-700",
  analytics: "bg-indigo-50 text-indigo-700",
  design: "bg-rose-50 text-rose-700",
}

const PRICING_BADGE: Record<string, string> = {
  free: "bg-emerald-50 text-emerald-700",
  freemium: "bg-blue-50 text-blue-700",
  paid: "bg-amber-50 text-amber-700",
}

function prettyCategory(cat: string): string {
  return CATEGORIES.find((c) => c.key === cat)?.label ?? cat
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ResearchToolsPage() {
  const [loading, setLoading] = useState(true)
  const [tools, setTools] = useState<ResearchTool[]>([])
  const [activeCategory, setActiveCategory] = useState<Category>("all")
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)

  /* Form state */
  const [form, setForm] = useState({
    name: "",
    category: "product-research",
    description: "",
    url: "",
    pricing: "free",
    pricing_details: "",
    rating: "5",
    tags: "",
  })
  const [submitting, setSubmitting] = useState(false)

  async function loadTools() {
    setLoading(true)
    const { data } = await supabase
      .from("research_tools")
      .select("id,name,category,description,url,pricing,pricing_details,rating,tags,is_favorite")
      .order("name", { ascending: true })
    setTools((data as ResearchTool[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadTools()
  }, [])

  const filtered = useMemo(() => {
    return tools.filter((t) => {
      if (activeCategory !== "all" && t.category !== activeCategory) return false
      if (search) {
        const q = search.toLowerCase()
        const hay = `${t.name} ${t.description ?? ""} ${(t.tags ?? []).join(" ")}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [tools, activeCategory, search])

  async function toggleFavorite(tool: ResearchTool) {
    const next = !tool.is_favorite
    setTools((prev) => prev.map((t) => (t.id === tool.id ? { ...t, is_favorite: next } : t)))
    await supabase.from("research_tools").update({ is_favorite: next }).eq("id", tool.id)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSubmitting(true)
    const tags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
    const payload = {
      name: form.name.trim(),
      category: form.category,
      description: form.description.trim() || null,
      url: form.url.trim() || null,
      pricing: form.pricing,
      pricing_details: form.pricing_details.trim() || null,
      rating: Number(form.rating),
      tags,
      is_favorite: false,
    }
    const { error } = await supabase.from("research_tools").insert(payload)
    setSubmitting(false)
    if (!error) {
      setModalOpen(false)
      setForm({
        name: "",
        category: "product-research",
        description: "",
        url: "",
        pricing: "free",
        pricing_details: "",
        rating: "5",
        tags: "",
      })
      loadTools()
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Research Tools</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {loading ? "Loading..." : `${tools.length} tools in library`}
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Tool
        </Button>
      </div>

      {/* Filter row */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="p-4 flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tools..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => {
              const isActive = activeCategory === c.key
              return (
                <button
                  key={c.key}
                  onClick={() => setActiveCategory(c.key)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:bg-muted"
                  }`}
                >
                  {c.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-border/80 bg-card shadow-sm h-56 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-12 flex flex-col items-center gap-3 text-center">
          <div className="rounded-full bg-muted p-4">
            <Telescope className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold">No tools found</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {tools.length === 0
              ? "Start building your research toolkit by adding your first tool."
              : "Try adjusting your filters or search."}
          </p>
          {tools.length === 0 && (
            <Button onClick={() => setModalOpen(true)} className="gap-2 mt-2">
              <Plus className="h-4 w-4" />
              Add Tool
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((tool) => (
            <ToolCard key={tool.id} tool={tool} onToggleFavorite={toggleFavorite} />
          ))}
        </div>
      )}

      {/* Add modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-lg border border-border shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-600" />
              Add Research Tool
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <Field label="Name *">
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Category">
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    {CATEGORIES.filter((c) => c.key !== "all").map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Pricing">
                  <select
                    value={form.pricing}
                    onChange={(e) => setForm({ ...form, pricing: e.target.value })}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="free">Free</option>
                    <option value="freemium">Freemium</option>
                    <option value="paid">Paid</option>
                  </select>
                </Field>
              </div>

              <Field label="Description">
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </Field>

              <Field label="URL">
                <input
                  type="url"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://"
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </Field>

              <Field label="Pricing Details">
                <input
                  type="text"
                  value={form.pricing_details}
                  onChange={(e) => setForm({ ...form, pricing_details: e.target.value })}
                  placeholder="e.g. $29/mo"
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Rating">
                  <select
                    value={form.rating}
                    onChange={(e) => setForm({ ...form, rating: e.target.value })}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n} Star{n > 1 ? "s" : ""}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Tags (comma-separated)">
                  <input
                    type="text"
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    placeholder="seo, keywords"
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </Field>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving..." : "Add Tool"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function ToolCard({
  tool,
  onToggleFavorite,
}: {
  tool: ResearchTool
  onToggleFavorite: (t: ResearchTool) => void
}) {
  const catBadge = CATEGORY_BADGE[tool.category] ?? "bg-gray-100 text-gray-700"
  const pricingBadge =
    tool.pricing && PRICING_BADGE[tool.pricing]
      ? PRICING_BADGE[tool.pricing]
      : "bg-gray-100 text-gray-700"
  const rating = tool.rating ?? 0

  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden flex flex-col">
      <div className="p-5 flex-1 flex flex-col">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold line-clamp-1">{tool.name}</h3>
          <button
            onClick={() => onToggleFavorite(tool)}
            className="shrink-0 p-1 -m-1 hover:bg-muted rounded transition-colors"
            aria-label="Toggle favorite"
          >
            <Heart
              className={`h-4 w-4 ${
                tool.is_favorite ? "fill-rose-500 text-rose-500" : "text-muted-foreground"
              }`}
            />
          </button>
        </div>

        {/* Badges */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${catBadge}`}>
            {prettyCategory(tool.category)}
          </span>
          {tool.pricing && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pricingBadge}`}>
              {tool.pricing}
              {tool.pricing_details ? ` · ${tool.pricing_details}` : ""}
            </span>
          )}
        </div>

        {/* Description */}
        <p className="mt-3 text-sm text-muted-foreground line-clamp-3 flex-1">
          {tool.description ?? "No description provided."}
        </p>

        {/* Rating */}
        <div className="mt-3 flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-3.5 w-3.5 ${
                i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
              }`}
            />
          ))}
          <span className="ml-1 text-xs text-muted-foreground tabular-nums">
            {rating > 0 ? rating.toFixed(1) : "–"}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t bg-muted/20 flex items-center justify-between gap-2">
        {tool.url ? (
          <a
            href={tool.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Visit <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">No URL</span>
        )}
        {tool.tags && tool.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-end">
            {tool.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[0.6875rem] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</span>
      {children}
    </label>
  )
}
