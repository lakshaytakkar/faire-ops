"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  FileText,
  Pencil,
  CheckCircle,
  Archive,
  Trash2,
  RotateCcw,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
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

const TEAM_MEMBERS = ["Lakshay", "Aditya", "Khushal", "Bharti", "Allen", "Harsh"]

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SOPDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [sop, setSOP] = useState<SOP | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [adjacentIds, setAdjacentIds] = useState<{prev: string | null, next: string | null}>({prev: null, next: null})

  // Edit form state
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editContent, setEditContent] = useState("")
  const [editCategory, setEditCategory] = useState("")
  const [editOwner, setEditOwner] = useState("")

  /* ---- Fetch ---- */
  const fetchSOP = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from("sops")
      .select("*")
      .eq("id", id)
      .single()
    if (data) {
      setSOP(data)
      setEditTitle(data.title)
      setEditDescription(data.description ?? "")
      setEditContent(data.content ?? "")
      setEditCategory(data.category)
      setEditOwner(data.owner ?? "")
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    fetchSOP()
  }, [fetchSOP])

  useEffect(() => {
    if (!sop) return
    supabase
      .from("sops")
      .select("id")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!data) return
        const idx = data.findIndex(o => o.id === id)
        setAdjacentIds({
          prev: idx > 0 ? data[idx - 1].id : null,
          next: idx < data.length - 1 ? data[idx + 1].id : null,
        })
      })
  }, [sop, id])

  /* ---- Save edits ---- */
  const saveEdits = async () => {
    if (!sop) return
    setSaving(true)
    await supabase
      .from("sops")
      .update({
        title: editTitle,
        description: editDescription || null,
        content: editContent || null,
        category: editCategory,
        owner: editOwner || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sop.id)
    setSaving(false)
    setEditing(false)
    fetchSOP()
  }

  /* ---- Status transitions ---- */
  const updateStatus = async (newStatus: SOP["status"]) => {
    if (!sop) return
    const updates: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }
    // Bump version on publish
    if (newStatus === "published") {
      updates.version = sop.version + 1
      updates.last_reviewed_at = new Date().toISOString()
    }
    await supabase.from("sops").update(updates).eq("id", sop.id)
    fetchSOP()
  }

  /* ---- Delete ---- */
  const deleteSOP = async () => {
    if (!sop) return
    await supabase.from("sops").delete().eq("id", sop.id)
    router.push("/workspace/sops")
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-[1440px] mx-auto w-full">
        <p className="text-sm text-muted-foreground py-12 text-center">Loading...</p>
      </div>
    )
  }

  if (!sop) {
    return (
      <div className="space-y-6 max-w-[1440px] mx-auto w-full">
        <p className="text-sm text-muted-foreground py-12 text-center">SOP not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto w-full">
      {/* Back link */}
      <button
        onClick={() => router.push("/workspace/sops")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Back to SOPs
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {editing ? (
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="text-2xl font-bold font-heading h-auto py-1 px-2"
            />
          ) : (
            <h1 className="text-2xl font-bold font-heading text-foreground">
              {sop.title}
            </h1>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`border-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[sop.status]}`}
            >
              {sop.status}
            </span>
            <span className="border-0 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              v{sop.version}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 mr-2">
            <Link
              href={adjacentIds.prev ? `/workspace/sops/${adjacentIds.prev}` : "#"}
              className={`h-8 w-8 flex items-center justify-center rounded-md border transition-colors ${adjacentIds.prev ? "hover:bg-muted" : "opacity-30 pointer-events-none"}`}
              title="Previous SOP"
            >
              <ChevronLeft className="size-4" />
            </Link>
            <Link
              href={adjacentIds.next ? `/workspace/sops/${adjacentIds.next}` : "#"}
              className={`h-8 w-8 flex items-center justify-center rounded-md border transition-colors ${adjacentIds.next ? "hover:bg-muted" : "opacity-30 pointer-events-none"}`}
              title="Next SOP"
            >
              <ChevronRight className="size-4" />
            </Link>
          </div>
          {editing ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(false)
                  setEditTitle(sop.title)
                  setEditDescription(sop.description ?? "")
                  setEditContent(sop.content ?? "")
                  setEditCategory(sop.category)
                  setEditOwner(sop.owner ?? "")
                }}
              >
                <X className="size-4" />
                Cancel
              </Button>
              <Button onClick={saveEdits} disabled={saving}>
                <Save className="size-4" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="size-4" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Content (span 2) */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5">
            <h2 className="text-[0.9375rem] font-semibold tracking-tight mb-3">Content</h2>
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Description
                  </label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={2}
                    className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none"
                    placeholder="Brief description..."
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Content
                  </label>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={20}
                    className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-y"
                    placeholder="SOP content..."
                  />
                </div>
              </div>
            ) : (
              <div>
                {sop.description && (
                  <p className="text-sm text-muted-foreground mb-4">
                    {sop.description}
                  </p>
                )}
                {sop.content ? (
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">
                    {sop.content}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No content yet. Click Edit to add content.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Info + Actions */}
        <div className="space-y-5">
          {/* Info Card */}
          <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5">
            <h2 className="text-[0.9375rem] font-semibold tracking-tight mb-3">Details</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Owner</p>
                {editing ? (
                  <select
                    value={editOwner}
                    onChange={(e) => setEditOwner(e.target.value)}
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 mt-1"
                  >
                    <option value="">Unassigned</option>
                    {TEAM_MEMBERS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm mt-0.5">{sop.owner ?? "Unassigned"}</p>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Category</p>
                {editing ? (
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 mt-1"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm mt-0.5">
                    <span className="border-0 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                      {sop.category}
                    </span>
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Version</p>
                <p className="text-sm mt-0.5">{sop.version}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Created</p>
                <p className="text-sm mt-0.5">
                  {new Date(sop.created_at).toLocaleDateString()}
                </p>
              </div>
              {sop.updated_at && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Updated</p>
                  <p className="text-sm mt-0.5">
                    {new Date(sop.updated_at).toLocaleDateString()}
                  </p>
                </div>
              )}
              {sop.last_reviewed_at && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Last Reviewed
                  </p>
                  <p className="text-sm mt-0.5">
                    {new Date(sop.last_reviewed_at).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Actions Card */}
          <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5">
            <h2 className="text-[0.9375rem] font-semibold tracking-tight mb-3">Actions</h2>
            <div className="space-y-2">
              {/* Draft -> Published */}
              {sop.status === "draft" && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => updateStatus("published")}
                >
                  <CheckCircle className="size-4 text-emerald-600" />
                  Publish
                </Button>
              )}

              {/* Published -> Archived */}
              {sop.status === "published" && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => updateStatus("archived")}
                >
                  <Archive className="size-4 text-slate-500" />
                  Archive
                </Button>
              )}

              {/* Any non-draft -> Draft */}
              {sop.status !== "draft" && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => updateStatus("draft")}
                >
                  <RotateCcw className="size-4 text-amber-600" />
                  Revert to Draft
                </Button>
              )}

              {/* Delete */}
              <Button
                variant="destructive"
                className="w-full justify-start"
                onClick={deleteSOP}
              >
                <Trash2 className="size-4" />
                Delete SOP
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
