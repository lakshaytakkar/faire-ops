"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  FileText,
  CheckCircle,
  PenLine,
  Clock,
  Plus,
  X,
  Search,
  ClipboardList,
  BookOpen,
  Workflow,
  ShieldCheck,
  Settings,
  Users,
  Landmark,
  FolderOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SOP {
  id: string
  title: string
  description: string | null
  content: string | null
  category: string
  status: "draft" | "published" | "archived"
  version: number
  owner: string | null
  last_reviewed_at: string | null
  created_at: string
  updated_at: string | null
}

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-amber-50 text-amber-700",
  published: "bg-emerald-50 text-emerald-700",
  archived: "bg-slate-100 text-slate-600",
}

const CATEGORY_OPTIONS = [
  "Operations",
  "Fulfillment",
  "CRM",
  "Catalog",
  "Finance",
  "HR",
  "General",
]

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

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Operations: Settings,
  Fulfillment: Workflow,
  CRM: Users,
  Catalog: BookOpen,
  Finance: Landmark,
  HR: ShieldCheck,
  General: FolderOpen,
}

const TEAM_MEMBERS = ["Lakshay", "Aditya", "Khushal", "Bharti", "Allen", "Harsh"]

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SOPsPage() {
  const router = useRouter()
  const [sops, setSOPs] = useState<SOP[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")

  // Dialog
  const [showDialog, setShowDialog] = useState(false)

  /* ---- Fetch ---- */
  const fetchSOPs = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from("sops")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(200)

    if (statusFilter !== "all") query = query.eq("status", statusFilter)
    if (categoryFilter !== "all") query = query.eq("category", categoryFilter)

    const { data } = await query
    setSOPs(data ?? [])
    setLoading(false)
  }, [statusFilter, categoryFilter])

  useEffect(() => {
    fetchSOPs()
  }, [fetchSOPs])

  /* ---- Filter by search ---- */
  const filtered = search
    ? sops.filter(
        (s) =>
          s.title.toLowerCase().includes(search.toLowerCase()) ||
          s.description?.toLowerCase().includes(search.toLowerCase())
      )
    : sops

  /* ---- Stats ---- */
  const totalCount = sops.length
  const publishedCount = sops.filter((s) => s.status === "published").length
  const draftCount = sops.filter((s) => s.status === "draft").length
  const lastUpdated = sops.length > 0 ? sops[0].updated_at ?? sops[0].created_at : null

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">SOPs</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Standard Operating Procedures
          </p>
        </div>
        <Button size="lg" onClick={() => setShowDialog(true)}>
          <Plus className="size-4" />
          New SOP
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total</p>
            <p className="text-2xl font-bold font-heading mt-2">{totalCount}</p>
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-primary/10">
            <FileText className="h-4 w-4 text-primary" />
          </div>
        </div>
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Published</p>
            <p className="text-2xl font-bold font-heading mt-2 text-emerald-600">
              {publishedCount}
            </p>
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-emerald-500/10">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </div>
        </div>
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Draft</p>
            <p className="text-2xl font-bold font-heading mt-2 text-amber-600">
              {draftCount}
            </p>
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-amber-500/10">
            <PenLine className="h-4 w-4 text-amber-600" />
          </div>
        </div>
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Last Updated</p>
            <p className="text-lg font-bold font-heading mt-2">
              {lastUpdated
                ? new Date(lastUpdated).toLocaleDateString()
                : "—"}
            </p>
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-blue-500/10">
            <Clock className="h-4 w-4 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search SOPs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="all">All Categories</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* SOP Cards */}
      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No SOPs found</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((sop, index) => {
            const CatIcon = CATEGORY_ICONS[sop.category] ?? ClipboardList
            return (
              <div
                key={sop.id}
                onClick={() => router.push(`/workspace/sops/${sop.id}`)}
                className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden hover:shadow-sm transition-shadow cursor-pointer"
              >
                {/* Gradient thumbnail */}
                <div
                  className="h-28 flex items-center justify-center"
                  style={{ background: GRADIENTS[index % GRADIENTS.length] }}
                >
                  <CatIcon className="size-10 text-white/25" />
                </div>

                <div className="p-4">
                  <h3 className="text-sm font-semibold">{sop.title}</h3>
                  {sop.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {sop.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <span
                      className={`border-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[sop.status]}`}
                    >
                      {sop.status}
                    </span>
                    <span className="border-0 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      v{sop.version}
                    </span>
                    <span className="border-0 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                      {sop.category}
                    </span>
                    {sop.owner && (
                      <span className="text-xs text-muted-foreground">
                        by {sop.owner}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(
                        sop.updated_at ?? sop.created_at
                      ).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* New SOP Dialog */}
      {showDialog && (
        <NewSOPDialog
          onClose={() => setShowDialog(false)}
          onSaved={(id: string) => {
            setShowDialog(false)
            router.push(`/workspace/sops/${id}`)
          }}
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  New SOP Dialog                                                     */
/* ------------------------------------------------------------------ */

function NewSOPDialog({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: (id: string) => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "General",
    owner: "",
    content: "",
  })

  const update = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title) return
    setSaving(true)
    const { data } = await supabase
      .from("sops")
      .insert({
        title: form.title,
        description: form.description || null,
        category: form.category,
        owner: form.owner || null,
        content: form.content || null,
        status: "draft",
        version: 1,
      })
      .select("id")
      .single()
    setSaving(false)
    if (data) onSaved(data.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="rounded-lg border border-border/80 bg-card shadow-sm p-6 w-full max-w-lg shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold font-heading">New SOP</h2>
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
              placeholder="SOP title"
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
              placeholder="Brief description"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={2}
              className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none"
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
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Owner
              </label>
              <select
                value={form.owner}
                onChange={(e) => update("owner", e.target.value)}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Unassigned</option>
                {TEAM_MEMBERS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Content
            </label>
            <textarea
              placeholder="SOP content..."
              value={form.content}
              onChange={(e) => update("content", e.target.value)}
              rows={6}
              className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-y"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create SOP"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
