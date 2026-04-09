"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  FileText,
  ExternalLink,
  BookOpen,
  Calendar,
  Tag,
  Search,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { SubNav } from "@/components/shared/sub-nav"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SOP {
  id: string
  title: string
  description: string | null
  category: string
  version: string
  content: string | null
  created_at: string
  updated_at: string
}

const SOP_CATEGORY_BADGE: Record<string, string> = {
  Onboarding: "bg-blue-50 text-blue-700",
  Orders: "bg-emerald-50 text-emerald-700",
  Fulfillment: "bg-orange-50 text-orange-700",
  Catalog: "bg-purple-50 text-purple-700",
  CRM: "bg-amber-50 text-amber-700",
  Analytics: "bg-pink-50 text-pink-700",
  Finance: "bg-teal-50 text-teal-700",
  Marketing: "bg-rose-50 text-rose-700",
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SOPsPage() {
  const [sops, setSops] = useState<SOP[]>([])
  const [loadingSops, setLoadingSops] = useState(true)
  const [search, setSearch] = useState("")

  /* ---- Fetch SOPs ---- */
  const fetchSops = useCallback(async () => {
    setLoadingSops(true)
    const { data } = await supabase
      .from("sops")
      .select("*")
      .order("created_at", { ascending: false })
    setSops(data ?? [])
    setLoadingSops(false)
  }, [])

  useEffect(() => {
    fetchSops()
  }, [fetchSops])

  /* ---- Filter SOPs ---- */
  const filteredSops = useMemo(() => {
    if (!search.trim()) return sops
    const q = search.toLowerCase()
    return sops.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
    )
  }, [sops, search])

  /* ---- Stats ---- */
  const totalSops = sops.length
  const categoriesCount = new Set(sops.map((s) => s.category)).size

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5 px-6 pt-6">
      <SubNav
        items={[
          { title: "Training Videos", href: "/workspace/training/videos" },
          { title: "SOPs", href: "/workspace/training/sops" },
        ]}
      />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">
            Standard Operating Procedures
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Team SOPs and process documentation
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total SOPs</p>
            <p className="text-2xl font-bold font-heading mt-2">{totalSops}</p>
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-purple-500/10">
            <FileText className="h-4 w-4 text-purple-600" />
          </div>
        </div>
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Categories</p>
            <p className="text-2xl font-bold font-heading mt-2">{categoriesCount}</p>
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-blue-500/10">
            <BookOpen className="h-4 w-4 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search SOPs by title or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* SOP Grid */}
      {loadingSops ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading SOPs...</p>
      ) : filteredSops.length === 0 ? (
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-8 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            {search.trim() ? "No SOPs match your search" : "No SOPs available yet"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {search.trim()
              ? "Try adjusting your search terms."
              : "Standard operating procedures will appear here once added to the system."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSops.map((sop) => {
            const updatedDate = new Date(sop.updated_at || sop.created_at).toLocaleDateString(
              "en-US",
              { year: "numeric", month: "short", day: "numeric" }
            )
            return (
              <div
                key={sop.id}
                className="rounded-lg border border-border/80 bg-card shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-purple-500/10 shrink-0">
                    <FileText className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold truncate">{sop.title}</h3>
                    {sop.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {sop.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span
                    className={`border-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                      SOP_CATEGORY_BADGE[sop.category] ?? "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {sop.category}
                  </span>
                  {sop.version && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Tag className="h-3 w-3" />
                      v{sop.version}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {updatedDate}
                  </span>
                </div>

                <a
                  href={`/workspace/sops/${sop.id}`}
                  className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  View SOP
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
