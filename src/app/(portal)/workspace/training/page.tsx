"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  PlayCircle,
  Video,
  Clock,
  CheckCircle,
  Plus,
  X,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TrainingVideo {
  id: string
  title: string
  description: string | null
  video_url: string
  thumbnail_url: string | null
  category: string
  duration_minutes: number
  assigned_to: string[] | null
  is_required: boolean
  sort_order: number
  created_at: string
}

const CATEGORIES = ["All", "Onboarding", "Orders", "Catalog", "CRM", "Analytics"]

const CATEGORY_BADGE: Record<string, string> = {
  Onboarding: "bg-blue-50 text-blue-700",
  Orders: "bg-emerald-50 text-emerald-700",
  Catalog: "bg-purple-50 text-purple-700",
  CRM: "bg-amber-50 text-amber-700",
  Analytics: "bg-pink-50 text-pink-700",
}

const GRADIENTS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
  "linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)",
  "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)",
]

const SEED_VIDEOS = [
  { title: "Faire Dashboard", description: "Complete walkthrough of the Faire dashboard, navigation, and key features for new team members.", video_url: "https://example.com/faire-dashboard", category: "Onboarding", duration_minutes: 15, is_required: true, sort_order: 1 },
  { title: "Accept Orders", description: "How to review, accept, and process incoming Faire orders efficiently.", video_url: "https://example.com/accept-orders", category: "Orders", duration_minutes: 8, is_required: true, sort_order: 2 },
  { title: "Listing Optimization", description: "Best practices for product titles, descriptions, images, and tags to maximize visibility.", video_url: "https://example.com/listing-optimization", category: "Catalog", duration_minutes: 12, is_required: false, sort_order: 3 },
  { title: "Scraper Tool", description: "Using the internal scraper tool to audit competitor listings and market trends.", video_url: "https://example.com/scraper-tool", category: "Catalog", duration_minutes: 10, is_required: false, sort_order: 4 },
  { title: "Retailer Outreach", description: "CRM workflows for contacting retailers, following up, and building long-term relationships.", video_url: "https://example.com/retailer-outreach", category: "CRM", duration_minutes: 20, is_required: true, sort_order: 5 },
  { title: "Faire Analytics", description: "Understanding Faire analytics, sales reports, and performance metrics.", video_url: "https://example.com/faire-analytics", category: "Analytics", duration_minutes: 15, is_required: false, sort_order: 6 },
]

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function TrainingPage() {
  const [videos, setVideos] = useState<TrainingVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState("All")
  const [showDialog, setShowDialog] = useState(false)
  const seeded = useRef(false)

  /* ---- Fetch ---- */
  const fetchVideos = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from("training_videos")
      .select("*")
      .order("sort_order", { ascending: true })
    setVideos(data ?? [])
    setLoading(false)
    return data ?? []
  }, [])

  /* ---- Seed if empty ---- */
  useEffect(() => {
    if (seeded.current) return
    seeded.current = true
    ;(async () => {
      const data = await fetchVideos()
      if (data.length === 0) {
        await supabase.from("training_videos").insert(SEED_VIDEOS)
        fetchVideos()
      }
    })()
  }, [fetchVideos])

  /* ---- Delete ---- */
  const deleteVideo = async (id: string) => {
    await supabase.from("training_videos").delete().eq("id", id)
    fetchVideos()
  }

  /* ---- Filter ---- */
  const filtered =
    activeCategory === "All"
      ? videos
      : videos.filter((v) => v.category === activeCategory)

  /* ---- Stats ---- */
  const totalVideos = videos.length
  const requiredCount = videos.filter((v) => v.is_required).length
  const totalMinutes = videos.reduce((sum, v) => sum + v.duration_minutes, 0)
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Training</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Team training and onboarding
          </p>
        </div>
        <Button size="lg" onClick={() => setShowDialog(true)}>
          <Plus className="size-4" />
          Add Video
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total Videos</p>
            <p className="text-2xl font-bold font-heading mt-2">{totalVideos}</p>
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-primary/10">
            <Video className="h-4 w-4 text-primary" />
          </div>
        </div>
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Required</p>
            <p className="text-2xl font-bold font-heading mt-2 text-amber-600">
              {requiredCount}
            </p>
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-amber-500/10">
            <CheckCircle className="h-4 w-4 text-amber-600" />
          </div>
        </div>
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total Duration</p>
            <p className="text-2xl font-bold font-heading mt-2">{durationStr}</p>
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-blue-500/10">
            <Clock className="h-4 w-4 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1 border-b">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeCategory === cat
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Video Grid */}
      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No videos found</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((video, index) => (
            <div
              key={video.id}
              className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden hover:shadow-sm transition-shadow group relative cursor-pointer"
              onClick={() => window.open(video.video_url, "_blank")}
            >
              {/* Thumbnail */}
              <div
                className="h-36 flex items-center justify-center"
                style={{ background: GRADIENTS[index % GRADIENTS.length] }}
              >
                <PlayCircle className="size-12 text-white/25 group-hover:text-white/40 transition-colors" />
              </div>

              {/* Delete button (hover) */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  deleteVideo(video.id)
                }}
                className="absolute top-2 right-2 h-7 w-7 rounded-md bg-card/80 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10"
              >
                <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
              </button>

              {/* Body */}
              <div className="p-4">
                <h3 className="text-sm font-semibold truncate">{video.title}</h3>
                {video.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {video.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span
                    className={`border-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                      CATEGORY_BADGE[video.category] ?? "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {video.category}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {video.duration_minutes} min
                  </span>
                  {video.is_required && (
                    <span className="border-0 text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700">
                      Required
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Video Dialog */}
      {showDialog && (
        <AddVideoDialog
          onClose={() => setShowDialog(false)}
          onSaved={() => {
            setShowDialog(false)
            fetchVideos()
          }}
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Add Video Dialog                                                   */
/* ------------------------------------------------------------------ */

function AddVideoDialog({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: "",
    description: "",
    video_url: "",
    category: "Onboarding",
    duration_minutes: "",
    is_required: false,
  })

  const update = (field: string, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.video_url) return
    setSaving(true)
    await supabase.from("training_videos").insert({
      title: form.title,
      description: form.description || null,
      video_url: form.video_url,
      category: form.category,
      duration_minutes: parseInt(form.duration_minutes) || 0,
      is_required: form.is_required,
      sort_order: 99,
    })
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="rounded-lg border border-border/80 bg-card shadow-sm p-6 w-full max-w-lg shadow-lg">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold font-heading">Add Video</h2>
          <Button variant="ghost" size="icon-xs" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Title
            </label>
            <Input
              placeholder="Video title"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Description
            </label>
            <textarea
              placeholder="Video description"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={2}
              className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Video URL
            </label>
            <Input
              type="url"
              placeholder="https://..."
              value={form.video_url}
              onChange={(e) => update("video_url", e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {CATEGORIES.filter((c) => c !== "All").map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Duration (minutes)
              </label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={form.duration_minutes}
                onChange={(e) => update("duration_minutes", e.target.value)}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_required}
              onChange={(e) => update("is_required", e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <span className="text-sm">Is Required</span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Add Video"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
