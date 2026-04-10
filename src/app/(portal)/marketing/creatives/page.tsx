"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  Plus,
  Sparkles,
  Search,
  ImageIcon,
  Film,
  LayoutGrid,
  Palette,
  Copy,
  Archive,
  Edit3,
  Star,
  X,
  Bot,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabaseB2B } from "@/lib/supabase"
import {
  useCreatives,
  statusColor,
  CTA_TYPES,
  type MetaAdCreative,
} from "@/lib/use-marketing-data"

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />
}

const TYPE_TABS = ["All", "image", "video", "carousel"] as const
const STATUS_TABS = ["All", "draft", "approved", "active", "archived"] as const

function typeLabel(t: string) {
  return t === "image" ? "Image" : t === "video" ? "Video" : t === "carousel" ? "Carousel" : t
}

function typeIcon(t: string) {
  if (t === "video") return <Film className="size-3.5" />
  if (t === "carousel") return <LayoutGrid className="size-3.5" />
  return <ImageIcon className="size-3.5" />
}

/* ------------------------------------------------------------------ */
/*  Create Creative Modal                                               */
/* ------------------------------------------------------------------ */

function CreateModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: "",
    type: "image",
    headline: "",
    primary_text: "",
    description: "",
    cta_type: "LEARN_MORE",
    destination_url: "",
    image_url: "",
    tags: "",
  })

  function set(k: keyof typeof form, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    const { error } = await supabaseB2B.from("meta_ad_creatives").insert({
      name: form.name.trim(),
      type: form.type,
      status: "draft",
      headline: form.headline || null,
      primary_text: form.primary_text || null,
      description: form.description || null,
      cta_type: form.cta_type || null,
      destination_url: form.destination_url || null,
      image_url: form.image_url || null,
      tags: form.tags
        ? form.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [],
      ai_generated: false,
    })
    setSaving(false)
    if (!error) {
      onCreated()
      onClose()
      setForm({
        name: "",
        type: "image",
        headline: "",
        primary_text: "",
        description: "",
        cta_type: "LEARN_MORE",
        destination_url: "",
        image_url: "",
        tags: "",
      })
    }
  }

  if (!open) return null

  const labelCls = "text-xs font-semibold text-muted-foreground uppercase tracking-wider"
  const inputCls = "rounded-md border px-3 py-2 text-sm bg-background w-full"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card rounded-lg border border-border/80 shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-3.5 border-b flex items-center justify-between">
          <h2 className="text-[0.9375rem] font-semibold tracking-tight">New Creative</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className={labelCls}>Name *</label>
            <input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Creative name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Type</label>
              <select className={inputCls} value={form.type} onChange={(e) => set("type", e.target.value)}>
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="carousel">Carousel</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>CTA Type</label>
              <select className={inputCls} value={form.cta_type} onChange={(e) => set("cta_type", e.target.value)}>
                {CTA_TYPES.map((c) => (
                  <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Headline</label>
            <input className={inputCls} value={form.headline} onChange={(e) => set("headline", e.target.value)} placeholder="Ad headline" />
          </div>
          <div>
            <label className={labelCls}>Primary Text</label>
            <textarea className={`${inputCls} min-h-[60px]`} value={form.primary_text} onChange={(e) => set("primary_text", e.target.value)} placeholder="Main ad copy" />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <input className={inputCls} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Short description" />
          </div>
          <div>
            <label className={labelCls}>Destination URL</label>
            <input className={inputCls} value={form.destination_url} onChange={(e) => set("destination_url", e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <label className={labelCls}>Image URL</label>
            <input className={inputCls} value={form.image_url} onChange={(e) => set("image_url", e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <label className={labelCls}>Tags (comma-separated)</label>
            <input className={inputCls} value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="summer, sale, new" />
          </div>
        </div>
        <div className="px-5 py-3.5 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Create
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Creative Card                                                       */
/* ------------------------------------------------------------------ */

function CreativeCard({
  creative,
  onDuplicate,
  onArchive,
}: {
  creative: MetaAdCreative
  onDuplicate: (c: MetaAdCreative) => void
  onArchive: (c: MetaAdCreative) => void
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden group">
      {/* Thumbnail */}
      <div className="h-40 bg-muted flex items-center justify-center overflow-hidden relative">
        {creative.image_url ? (
          <img
            src={creative.image_url}
            alt={creative.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <ImageIcon className="size-10 text-muted-foreground/40" />
        )}
        {creative.ai_generated && (
          <span className="absolute top-2 right-2 flex items-center gap-1 text-[0.6875rem] font-medium px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700">
            <Bot className="size-3" /> AI
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground truncate">{creative.name}</h3>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="inline-flex items-center gap-1 text-[0.6875rem] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
              {typeIcon(creative.type)} {typeLabel(creative.type)}
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(creative.status)}`}>
              {creative.status}
            </span>
          </div>
        </div>

        {creative.headline && (
          <p className="text-xs text-muted-foreground line-clamp-2">{creative.headline}</p>
        )}

        {creative.performance_score != null && (
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`size-3 ${i < Math.round(creative.performance_score! / 2) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`}
              />
            ))}
            <span className="text-[0.6875rem] text-muted-foreground ml-1">
              {creative.performance_score}/10
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-border/50 flex items-center justify-between">
        <span className="text-[0.6875rem] text-muted-foreground">
          {new Date(creative.created_at).toLocaleDateString()}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onDuplicate(creative)}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            title="Duplicate"
          >
            <Copy className="size-3.5" />
          </button>
          <button
            onClick={() => onArchive(creative)}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            title="Archive"
          >
            <Archive className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function CreativeLibraryPage() {
  const { creatives, loading, refetch } = useCreatives()
  const [typeFilter, setTypeFilter] = useState<string>("All")
  const [statusFilter, setStatusFilter] = useState<string>("All")
  const [search, setSearch] = useState("")
  const [showCreate, setShowCreate] = useState(false)

  const filtered = useMemo(() => {
    let list = creatives
    if (typeFilter !== "All") list = list.filter((c) => c.type === typeFilter)
    if (statusFilter !== "All") list = list.filter((c) => c.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.headline?.toLowerCase().includes(q) ||
          c.tags.some((t) => t.toLowerCase().includes(q))
      )
    }
    return list
  }, [creatives, typeFilter, statusFilter, search])

  async function handleDuplicate(c: MetaAdCreative) {
    await supabaseB2B.from("meta_ad_creatives").insert({
      name: `${c.name} (copy)`,
      type: c.type,
      status: "draft",
      headline: c.headline,
      primary_text: c.primary_text,
      description: c.description,
      cta_type: c.cta_type,
      destination_url: c.destination_url,
      image_url: c.image_url,
      tags: c.tags,
      ai_generated: c.ai_generated,
      ai_prompt: c.ai_prompt,
    })
    refetch()
  }

  async function handleArchive(c: MetaAdCreative) {
    await supabaseB2B.from("meta_ad_creatives").update({ status: "archived" }).eq("id", c.id)
    refetch()
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Creative Library</h1>
        <div className="flex items-center gap-2">
          <Link href="/marketing/creatives/generate">
            <Button variant="outline">
              <Sparkles className="size-4" />
              AI Studio
            </Button>
          </Link>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="size-4" />
            New Creative
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b flex flex-wrap items-center gap-4">
          {/* Type tabs */}
          <div className="flex items-center gap-1">
            {TYPE_TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                  typeFilter === t
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {t === "All" ? "All Types" : typeLabel(t)}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-border" />

          {/* Status tabs */}
          <div className="flex items-center gap-1">
            {STATUS_TABS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors capitalize ${
                  statusFilter === s
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {s === "All" ? "All Statuses" : s}
              </button>
            ))}
          </div>

          <div className="ml-auto relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              className="rounded-md border px-3 py-1.5 pl-8 text-sm bg-background w-56"
              placeholder="Search creatives..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
              <Skeleton className="h-40 w-full rounded-none" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-12 flex flex-col items-center justify-center text-center">
          <div className="flex items-center justify-center size-14 rounded-full bg-muted mb-4">
            <Palette className="size-7 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">No creatives found</h3>
          <p className="text-xs text-muted-foreground max-w-xs mb-4">
            {creatives.length === 0
              ? "Create your first ad creative to get started, or use the AI Studio to generate copy."
              : "No creatives match your current filters. Try adjusting your search or filters."}
          </p>
          {creatives.length === 0 && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="size-4" />
              Create Creative
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <CreativeCard
              key={c.id}
              creative={c}
              onDuplicate={handleDuplicate}
              onArchive={handleArchive}
            />
          ))}
        </div>
      )}

      <CreateModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={refetch} />
    </div>
  )
}
