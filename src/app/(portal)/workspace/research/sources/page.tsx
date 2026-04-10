"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Plus,
  Heart,
  Star,
  ExternalLink,
  Search,
  Newspaper,
  Globe,
  Headphones,
  Play as Youtube,
  MessageSquare,
  Sparkles,
  Bookmark,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ResearchSource {
  id: string
  name: string
  source_type: string
  url: string | null
  description: string | null
  category: string | null
  frequency: string | null
  is_paid: boolean | null
  rating: number | null
  is_favorite: boolean | null
}

type SourceType =
  | "all"
  | "newsletter"
  | "blog"
  | "podcast"
  | "youtube"
  | "reddit"
  | "discord"
  | "community"

const TYPES: { key: SourceType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "newsletter", label: "Newsletter" },
  { key: "blog", label: "Blog" },
  { key: "podcast", label: "Podcast" },
  { key: "youtube", label: "YouTube" },
  { key: "reddit", label: "Reddit" },
  { key: "discord", label: "Discord" },
  { key: "community", label: "Community" },
]

const TYPE_BADGE: Record<string, string> = {
  newsletter: "bg-blue-50 text-blue-700",
  blog: "bg-emerald-50 text-emerald-700",
  podcast: "bg-violet-50 text-violet-700",
  youtube: "bg-red-50 text-red-700",
  reddit: "bg-orange-50 text-orange-700",
  discord: "bg-indigo-50 text-indigo-700",
  community: "bg-pink-50 text-pink-700",
  book: "bg-amber-50 text-amber-700",
}

function typeIcon(type: string) {
  const cls = "h-5 w-5"
  switch (type) {
    case "newsletter":
      return <Newspaper className={cls} />
    case "blog":
      return <Globe className={cls} />
    case "podcast":
      return <Headphones className={cls} />
    case "youtube":
      return <Youtube className={cls} />
    case "reddit":
    case "discord":
    case "community":
      return <MessageSquare className={cls} />
    default:
      return <Bookmark className={cls} />
  }
}

function prettyType(t: string): string {
  return TYPES.find((x) => x.key === t)?.label ?? t
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ResearchSourcesPage() {
  const [loading, setLoading] = useState(true)
  const [sources, setSources] = useState<ResearchSource[]>([])
  const [activeType, setActiveType] = useState<SourceType>("all")
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)

  /* Form */
  const [form, setForm] = useState({
    name: "",
    source_type: "newsletter",
    url: "",
    description: "",
    category: "",
    frequency: "weekly",
    is_paid: false,
    rating: "5",
  })
  const [submitting, setSubmitting] = useState(false)

  async function loadSources() {
    setLoading(true)
    const { data } = await supabase
      .from("research_sources")
      .select(
        "id,name,source_type,url,description,category,frequency,is_paid,rating,is_favorite",
      )
      .order("name", { ascending: true })
    setSources((data as ResearchSource[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadSources()
  }, [])

  const filtered = useMemo(() => {
    return sources.filter((s) => {
      if (activeType !== "all" && s.source_type !== activeType) return false
      if (search) {
        const q = search.toLowerCase()
        const hay = `${s.name} ${s.description ?? ""} ${s.category ?? ""}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [sources, activeType, search])

  async function toggleFavorite(source: ResearchSource) {
    const next = !source.is_favorite
    setSources((prev) =>
      prev.map((s) => (s.id === source.id ? { ...s, is_favorite: next } : s)),
    )
    await supabase.from("research_sources").update({ is_favorite: next }).eq("id", source.id)
  }

  async function handleVisit(source: ResearchSource) {
    if (!source.url) return
    await supabase
      .from("research_sources")
      .update({ last_visited_at: new Date().toISOString() })
      .eq("id", source.id)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSubmitting(true)
    const payload = {
      name: form.name.trim(),
      source_type: form.source_type,
      url: form.url.trim() || null,
      description: form.description.trim() || null,
      category: form.category.trim() || null,
      frequency: form.frequency,
      is_paid: form.is_paid,
      rating: Number(form.rating),
      is_favorite: false,
    }
    const { error } = await supabase.from("research_sources").insert(payload)
    setSubmitting(false)
    if (!error) {
      setModalOpen(false)
      setForm({
        name: "",
        source_type: "newsletter",
        url: "",
        description: "",
        category: "",
        frequency: "weekly",
        is_paid: false,
        rating: "5",
      })
      loadSources()
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
          <h1 className="text-2xl font-bold">Research Sources</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {loading ? "Loading..." : `${sources.length} sources in library`}
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Source
        </Button>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="p-4 flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search sources..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TYPES.map((t) => {
              const isActive = activeType === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveType(t.key)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:bg-muted"
                  }`}
                >
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-border/80 bg-card shadow-sm h-40 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-12 flex flex-col items-center gap-3 text-center">
          <div className="rounded-full bg-muted p-4">
            <Bookmark className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold">No sources found</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {sources.length === 0
              ? "Build your knowledge library by adding newsletters, blogs, podcasts and more."
              : "Try adjusting your filters or search."}
          </p>
          {sources.length === 0 && (
            <Button onClick={() => setModalOpen(true)} className="gap-2 mt-2">
              <Plus className="h-4 w-4" />
              Add Source
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((source) => (
            <SourceCard
              key={source.id}
              source={source}
              onToggleFavorite={toggleFavorite}
              onVisit={handleVisit}
            />
          ))}
        </div>
      )}

      {/* Add modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-lg border border-border shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-600" />
              Add Research Source
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
                <Field label="Type">
                  <select
                    value={form.source_type}
                    onChange={(e) => setForm({ ...form, source_type: e.target.value })}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    {TYPES.filter((t) => t.key !== "all").map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                    <option value="book">Book</option>
                  </select>
                </Field>
                <Field label="Frequency">
                  <select
                    value={form.frequency}
                    onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="irregular">Irregular</option>
                  </select>
                </Field>
              </div>

              <Field label="URL">
                <input
                  type="url"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://"
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </Field>

              <Field label="Description">
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Category">
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="e.g. E-commerce"
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </Field>
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
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_paid}
                  onChange={(e) => setForm({ ...form, is_paid: e.target.checked })}
                  className="h-4 w-4 rounded border-input"
                />
                <span>Paid source</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving..." : "Add Source"}
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

function SourceCard({
  source,
  onToggleFavorite,
  onVisit,
}: {
  source: ResearchSource
  onToggleFavorite: (s: ResearchSource) => void
  onVisit: (s: ResearchSource) => void
}) {
  const typeBadge = TYPE_BADGE[source.source_type] ?? "bg-gray-100 text-gray-700"
  const rating = source.rating ?? 0

  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className={`shrink-0 rounded-lg p-2.5 ${typeBadge}`}>
            {typeIcon(source.source_type)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-base line-clamp-1">{source.name}</h3>
              <button
                onClick={() => onToggleFavorite(source)}
                className="shrink-0 p-1 -m-1 hover:bg-muted rounded transition-colors"
                aria-label="Toggle favorite"
              >
                <Heart
                  className={`h-4 w-4 ${
                    source.is_favorite ? "fill-rose-500 text-rose-500" : "text-muted-foreground"
                  }`}
                />
              </button>
            </div>

            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeBadge}`}>
                {prettyType(source.source_type)}
              </span>
              {source.frequency && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {source.frequency}
                </span>
              )}
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  source.is_paid
                    ? "bg-amber-50 text-amber-700"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {source.is_paid ? "Paid" : "Free"}
              </span>
              {source.category && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                  {source.category}
                </span>
              )}
            </div>

            {source.description && (
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                {source.description}
              </p>
            )}

            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3.5 w-3.5 ${
                      i < rating
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
              {source.url ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onVisit(source)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Visit Source <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="text-xs text-muted-foreground">No URL</span>
              )}
            </div>
          </div>
        </div>
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
