"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  RichTextEditor,
  RichTextRenderer,
} from "@/components/shared/rich-text-editor"
import {
  ArrowLeft,
  FileText,
  Edit,
  X,
  Calendar,
} from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ReportStatus = "draft" | "published" | "archived"

interface ResearchReport {
  id: string
  title: string | null
  category: string | null
  summary: string | null
  content: string | null
  cover_image_url: string | null
  tags: string[] | null
  status: ReportStatus | null
  related_product_idea_id: string | null
  related_competitor_id: string | null
  author_user_id: string | null
  created_at: string
  updated_at: string | null
}

interface WorkspaceUser {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
}

interface ProductIdea {
  id: string
  title: string | null
  name?: string | null
}

interface Competitor {
  id: string
  name: string
}

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-slate-100", text: "text-slate-600", label: "Draft" },
  published: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Published" },
  archived: { bg: "bg-amber-50", text: "text-amber-700", label: "Archived" },
}

const CATEGORIES = [
  "Market Analysis",
  "Competitor Teardown",
  "Trend Report",
  "Product Deep Dive",
  "Customer Research",
  "Other",
]

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ReportDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const rawId = params?.id ?? ""

  const [report, setReport] = useState<ResearchReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState<WorkspaceUser[]>([])
  const [productIdeas, setProductIdeas] = useState<ProductIdea[]>([])
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [tagsInput, setTagsInput] = useState("")

  const loadRelated = useCallback(async () => {
    const [usersRes, ideasRes, compsRes] = await Promise.all([
      supabase.from("users").select("id, full_name, email, avatar_url"),
      supabase.from("research_product_ideas").select("id, title, name"),
      supabase.from("research_competitors").select("id, name"),
    ])
    setUsers((usersRes.data as WorkspaceUser[]) ?? [])
    setProductIdeas((ideasRes.data as ProductIdea[]) ?? [])
    setCompetitors((compsRes.data as Competitor[]) ?? [])
  }, [])

  const loadReport = useCallback(
    async (id: string) => {
      const { data } = await supabase
        .from("research_reports")
        .select("*")
        .eq("id", id)
        .single()
      if (data) {
        const r = data as ResearchReport
        setReport(r)
        setTagsInput((r.tags ?? []).join(", "))
      }
      setLoading(false)
    },
    []
  )

  // Handle new report creation or fetching existing
  useEffect(() => {
    void loadRelated()
  }, [loadRelated])

  useEffect(() => {
    if (!rawId) return
    if (rawId === "new") {
      setLoading(true)
      ;(async () => {
        const { data, error } = await supabase
          .from("research_reports")
          .insert({
            title: "Untitled Report",
            status: "draft",
          })
          .select("*")
          .single()
        if (error || !data) {
          setLoading(false)
          return
        }
        const r = data as ResearchReport
        setReport(r)
        setTagsInput((r.tags ?? []).join(", "))
        setEditing(true)
        setLoading(false)
        router.replace(`/workspace/research/reports/${r.id}`)
      })()
      return
    }
    setLoading(true)
    void loadReport(rawId)
  }, [rawId, loadReport, router])

  const author = useMemo(() => {
    if (!report?.author_user_id) return null
    return users.find((u) => u.id === report.author_user_id) ?? null
  }, [report, users])

  async function saveReport(updates: Partial<ResearchReport>) {
    if (!report) return
    setSaving(true)
    const payload: Partial<ResearchReport> & { updated_at: string } = {
      ...updates,
      updated_at: new Date().toISOString(),
    }
    const { data } = await supabase
      .from("research_reports")
      .update(payload)
      .eq("id", report.id)
      .select("*")
      .single()
    if (data) {
      setReport(data as ResearchReport)
    }
    setSaving(false)
  }

  async function handleSave() {
    if (!report) return
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
    await saveReport({
      title: report.title,
      category: report.category,
      summary: report.summary,
      content: report.content,
      cover_image_url: report.cover_image_url,
      related_product_idea_id: report.related_product_idea_id,
      related_competitor_id: report.related_competitor_id,
      tags,
    })
    setEditing(false)
  }

  async function handlePublish() {
    await saveReport({ status: "published" })
  }

  async function handleArchive() {
    await saveReport({ status: "archived" })
  }

  if (loading || !report) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-32 rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <Skeleton className="h-48 rounded-lg" />
            <Skeleton className="h-96 rounded-lg" />
          </div>
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </div>
    )
  }

  const badge = STATUS_BADGE[report.status ?? "draft"] ?? STATUS_BADGE.draft

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <Link
        href="/workspace/research/reports"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to Reports
      </Link>

      {/* Header Card */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b flex items-center justify-between">
          <span className="text-[0.9375rem] font-semibold tracking-tight">Report Details</span>
          <div className="flex items-center gap-2">
            {!editing ? (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Edit className="size-3.5 mr-1" /> Edit
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                  <X className="size-3.5 mr-1" /> Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </>
            )}
            {report.status !== "published" && (
              <Button variant="outline" size="sm" onClick={handlePublish} disabled={saving}>
                Publish
              </Button>
            )}
            {report.status !== "archived" && (
              <Button variant="outline" size="sm" onClick={handleArchive} disabled={saving}>
                Archive
              </Button>
            )}
          </div>
        </div>
        <div className="p-5 space-y-4">
          {editing ? (
            <Input
              value={report.title ?? ""}
              onChange={(e) =>
                setReport({ ...report, title: e.target.value })
              }
              className="!h-auto !text-2xl !font-bold !px-3 !py-2"
              placeholder="Report title"
            />
          ) : (
            <h1 className="text-2xl font-bold">{report.title ?? "Untitled"}</h1>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            {editing ? (
              <select
                value={report.category ?? ""}
                onChange={(e) => setReport({ ...report, category: e.target.value || null })}
                className="px-3 py-1.5 text-sm border rounded-md bg-background"
              >
                <option value="">Select category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            ) : (
              report.category && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {report.category}
                </span>
              )
            )}
            {editing ? (
              <select
                value={report.status ?? "draft"}
                onChange={(e) =>
                  setReport({ ...report, status: e.target.value as ReportStatus })
                }
                className="px-3 py-1.5 text-sm border rounded-md bg-background"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            ) : (
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}
              >
                {badge.label}
              </span>
            )}
            {author && (
              <div className="text-xs text-muted-foreground">
                By {author.full_name ?? author.email ?? "Unknown"}
              </div>
            )}
            <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Calendar className="size-3.5" />
              Created {formatDate(report.created_at)}
            </div>
            {report.updated_at && (
              <div className="text-xs text-muted-foreground">
                Updated {formatDate(report.updated_at)}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Cover Image */}
          <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
              Cover Image
            </div>
            <div className="p-5 space-y-3">
              {report.cover_image_url ? (
                <div className="h-48 rounded-md overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={report.cover_image_url}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-48 rounded-md bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                  <FileText className="size-10 text-muted-foreground/60" />
                </div>
              )}
              {editing && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Change cover URL
                  </label>
                  <Input
                    value={report.cover_image_url ?? ""}
                    onChange={(e) =>
                      setReport({ ...report, cover_image_url: e.target.value || null })
                    }
                    placeholder="https://..."
                  />
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
              Content
            </div>
            <div className="p-5">
              {editing ? (
                <div className="min-h-[400px]">
                  <RichTextEditor
                    value={report.content ?? ""}
                    onChange={(html) => setReport({ ...report, content: html })}
                    placeholder="Write your report..."
                    minHeight="400px"
                  />
                </div>
              ) : report.content ? (
                <RichTextRenderer content={report.content} />
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No content yet. Click Edit to add content.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
              Details
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Summary</label>
                {editing ? (
                  <textarea
                    value={report.summary ?? ""}
                    onChange={(e) =>
                      setReport({ ...report, summary: e.target.value || null })
                    }
                    rows={4}
                    className="w-full px-3 py-2 text-sm border rounded-md bg-background resize-none"
                    placeholder="Short summary..."
                  />
                ) : (
                  <p className="text-sm">
                    {report.summary ?? (
                      <span className="text-muted-foreground italic">No summary</span>
                    )}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Tags</label>
                {editing ? (
                  <Input
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="comma, separated, tags"
                  />
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {(report.tags ?? []).length === 0 && (
                      <span className="text-xs text-muted-foreground italic">No tags</span>
                    )}
                    {(report.tags ?? []).map((t, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Linked Product Idea
                </label>
                {editing ? (
                  <select
                    value={report.related_product_idea_id ?? ""}
                    onChange={(e) =>
                      setReport({
                        ...report,
                        related_product_idea_id: e.target.value || null,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                  >
                    <option value="">None</option>
                    {productIdeas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title ?? p.name ?? p.id}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm">
                    {report.related_product_idea_id
                      ? productIdeas.find((p) => p.id === report.related_product_idea_id)
                          ?.title ??
                        productIdeas.find((p) => p.id === report.related_product_idea_id)
                          ?.name ??
                        "—"
                      : (
                          <span className="text-muted-foreground italic">None</span>
                        )}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Linked Competitor
                </label>
                {editing ? (
                  <select
                    value={report.related_competitor_id ?? ""}
                    onChange={(e) =>
                      setReport({
                        ...report,
                        related_competitor_id: e.target.value || null,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                  >
                    <option value="">None</option>
                    {competitors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm">
                    {report.related_competitor_id
                      ? competitors.find((c) => c.id === report.related_competitor_id)
                          ?.name ?? "—"
                      : (
                          <span className="text-muted-foreground italic">None</span>
                        )}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
