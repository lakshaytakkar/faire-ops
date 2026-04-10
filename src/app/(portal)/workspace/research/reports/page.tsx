"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { FileText, Plus, ChevronRight } from "lucide-react"

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

const STATUS_TABS: { value: "all" | ReportStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
]

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-slate-100", text: "text-slate-600", label: "Draft" },
  published: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Published" },
  archived: { bg: "bg-amber-50", text: "text-amber-700", label: "Archived" },
}

const GRADIENTS = [
  "from-blue-500/20 to-purple-500/20",
  "from-emerald-500/20 to-teal-500/20",
  "from-amber-500/20 to-orange-500/20",
  "from-rose-500/20 to-pink-500/20",
  "from-indigo-500/20 to-cyan-500/20",
]

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function ReportsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<ResearchReport[]>([])
  const [users, setUsers] = useState<WorkspaceUser[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [reportsRes, usersRes] = await Promise.all([
      supabase.from("research_reports").select("*").order("updated_at", { ascending: false }),
      supabase.from("users").select("id, full_name, email, avatar_url"),
    ])
    setReports((reportsRes.data as ResearchReport[]) ?? [])
    setUsers((usersRes.data as WorkspaceUser[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const usersById = useMemo(() => {
    const map = new Map<string, WorkspaceUser>()
    users.forEach((u) => map.set(u.id, u))
    return map
  }, [users])

  const categories = useMemo(() => {
    const set = new Set<string>()
    reports.forEach((r) => r.category && set.add(r.category))
    return Array.from(set).sort()
  }, [reports])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return reports.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false
      if (categoryFilter !== "all" && r.category !== categoryFilter) return false
      if (q) {
        const hay = [r.title ?? "", r.summary ?? "", r.category ?? ""].join(" ").toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [reports, statusFilter, categoryFilter, search])

  async function handleNewReport() {
    setCreating(true)
    const { data, error } = await supabase
      .from("research_reports")
      .insert({
        title: "Untitled Report",
        status: "draft",
      })
      .select("id")
      .single()
    setCreating(false)
    if (error || !data) {
      router.push("/workspace/research/reports/new")
      return
    }
    router.push(`/workspace/research/reports/${data.id}`)
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="size-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Research Reports</h1>
          <span className="text-sm text-muted-foreground">({filtered.length})</span>
        </div>
        <Button onClick={handleNewReport} disabled={creating}>
          <Plus className="size-4 mr-1" /> New Report
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
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
        <div className="w-64">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reports..."
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-16 text-center">
          <FileText className="size-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium mb-1">No reports yet</p>
          <p className="text-xs text-muted-foreground mb-4">
            Create your first research report to document findings.
          </p>
          <Button onClick={handleNewReport} disabled={creating}>
            <Plus className="size-4 mr-1" /> New Report
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r, i) => {
            const author = r.author_user_id ? usersById.get(r.author_user_id) : null
            const badge = STATUS_BADGE[r.status ?? "draft"] ?? STATUS_BADGE.draft
            const gradient = GRADIENTS[i % GRADIENTS.length]
            return (
              <Link
                key={r.id}
                href={`/workspace/research/reports/${r.id}`}
                className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col group"
              >
                <div className="h-32 relative overflow-hidden">
                  {r.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.cover_image_url}
                      alt={r.title ?? "Report cover"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}
                    >
                      <FileText className="size-10 text-muted-foreground/60" />
                    </div>
                  )}
                </div>
                <div className="px-5 py-4 space-y-2 flex-1 flex flex-col">
                  <h3 className="font-semibold text-base line-clamp-1">
                    {r.title ?? "Untitled"}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    {r.category && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {r.category}
                      </span>
                    )}
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  {r.summary && (
                    <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
                      {r.summary}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t mt-auto">
                    <div className="text-xs text-muted-foreground truncate">
                      {author?.full_name ?? author?.email ?? "Unknown"} ·{" "}
                      {formatDate(r.updated_at ?? r.created_at)}
                    </div>
                    <div className="text-xs font-medium text-primary inline-flex items-center gap-0.5 group-hover:gap-1 transition-all">
                      Read <ChevronRight className="size-3" />
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
