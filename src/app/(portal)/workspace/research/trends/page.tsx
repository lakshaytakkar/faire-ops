"use client"

import { useState, useEffect, useMemo, useCallback, Fragment } from "react"
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
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  ExternalLink,
  ChevronRight,
  Telescope,
} from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type GrowthSignal = "rising" | "stable" | "declining"
type TrendStatus = "watching" | "acted-on" | "passed"

interface ResearchTrend {
  id: string
  trend_name: string
  category: string | null
  description: string | null
  trend_type: string | null
  source: string | null
  growth_signal: GrowthSignal | null
  opportunity_score: number | null
  notes: string | null
  reference_urls: string[] | null
  tags: string[] | null
  status: TrendStatus | null
  created_at: string
}

const STATUS_TABS: { value: "all" | TrendStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "watching", label: "Watching" },
  { value: "acted-on", label: "Acted On" },
  { value: "passed", label: "Passed" },
]

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  watching: { bg: "bg-blue-50", text: "text-blue-700", label: "Watching" },
  "acted-on": { bg: "bg-emerald-50", text: "text-emerald-700", label: "Acted On" },
  passed: { bg: "bg-slate-100", text: "text-slate-600", label: "Passed" },
}

const TREND_TYPES = ["product", "category", "keyword", "aesthetic", "season"] as const
const SOURCES = ["google-trends", "tiktok", "pinterest", "faire", "manual"] as const

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function scoreColor(score: number): string {
  if (score >= 75) return "bg-emerald-500"
  if (score >= 50) return "bg-blue-500"
  if (score >= 25) return "bg-amber-500"
  return "bg-red-500"
}

function GrowthSignalIcon({ signal }: { signal: GrowthSignal | null }) {
  if (signal === "rising")
    return (
      <span className="inline-flex items-center gap-1 text-emerald-600">
        <TrendingUp className="size-4" /> Rising
      </span>
    )
  if (signal === "declining")
    return (
      <span className="inline-flex items-center gap-1 text-red-600">
        <TrendingDown className="size-4" /> Declining
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <Minus className="size-4" /> Stable
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Add Trend Modal                                                    */
/* ------------------------------------------------------------------ */

function AddTrendModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    trend_name: "",
    category: "",
    description: "",
    trend_type: "product" as (typeof TREND_TYPES)[number],
    source: "manual" as (typeof SOURCES)[number],
    growth_signal: "rising" as GrowthSignal,
    opportunity_score: 50,
    notes: "",
    status: "watching" as TrendStatus,
  })

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((p) => ({ ...p, [key]: value }))
  }

  async function handleSubmit() {
    if (!form.trend_name.trim()) return
    setSaving(true)
    await supabase.from("research_trends").insert({
      trend_name: form.trend_name.trim(),
      category: form.category.trim() || null,
      description: form.description.trim() || null,
      trend_type: form.trend_type,
      source: form.source,
      growth_signal: form.growth_signal,
      opportunity_score: form.opportunity_score,
      notes: form.notes.trim() || null,
      status: form.status,
    })
    setSaving(false)
    onCreated()
    onClose()
  }

  return (
    <LargeModal
      title="Add Trend"
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !form.trend_name.trim()}>
            {saving ? "Saving..." : "Add Trend"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Trend Name *</label>
            <input
              value={form.trend_name}
              onChange={(e) => update("trend_name", e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md bg-background"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Category</label>
            <input
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md bg-background"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-sm border rounded-md bg-background resize-none"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Type</label>
            <select
              value={form.trend_type}
              onChange={(e) => update("trend_type", e.target.value as (typeof TREND_TYPES)[number])}
              className="w-full px-3 py-2 text-sm border rounded-md bg-background"
            >
              {TREND_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Source</label>
            <select
              value={form.source}
              onChange={(e) => update("source", e.target.value as (typeof SOURCES)[number])}
              className="w-full px-3 py-2 text-sm border rounded-md bg-background"
            >
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Growth Signal</label>
            <select
              value={form.growth_signal}
              onChange={(e) => update("growth_signal", e.target.value as GrowthSignal)}
              className="w-full px-3 py-2 text-sm border rounded-md bg-background"
            >
              <option value="rising">Rising</option>
              <option value="stable">Stable</option>
              <option value="declining">Declining</option>
            </select>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Opportunity Score: {form.opportunity_score}
          </label>
          <input
            type="range"
            min={1}
            max={100}
            value={form.opportunity_score}
            onChange={(e) => update("opportunity_score", parseInt(e.target.value, 10))}
            className="w-full"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-sm border rounded-md bg-background resize-none"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Status</label>
          <select
            value={form.status}
            onChange={(e) => update("status", e.target.value as TrendStatus)}
            className="w-full px-3 py-2 text-sm border rounded-md bg-background"
          >
            <option value="watching">Watching</option>
            <option value="acted-on">Acted On</option>
            <option value="passed">Passed</option>
          </select>
        </div>
      </div>
    </LargeModal>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function TrendsPage() {
  const [loading, setLoading] = useState(true)
  const [trends, setTrends] = useState<ResearchTrend[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sourceFilter, setSourceFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [sortMode, setSortMode] = useState<"newest" | "score">("newest")
  const [showAdd, setShowAdd] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from("research_trends")
      .select("*")
      .order("created_at", { ascending: false })
    setTrends((data as ResearchTrend[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const stats = useMemo(() => {
    const watching = trends.filter((t) => t.status === "watching").length
    const actedOn = trends.filter((t) => t.status === "acted-on").length
    const passed = trends.filter((t) => t.status === "passed").length
    const scored = trends.filter((t) => t.opportunity_score != null)
    const avg =
      scored.length > 0
        ? Math.round(scored.reduce((sum, t) => sum + (t.opportunity_score ?? 0), 0) / scored.length)
        : 0
    return { watching, actedOn, passed, avg }
  }, [trends])

  const filtered = useMemo(() => {
    let result = trends.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false
      if (sourceFilter !== "all" && t.source !== sourceFilter) return false
      if (typeFilter !== "all" && t.trend_type !== typeFilter) return false
      return true
    })
    if (sortMode === "score") {
      result = [...result].sort((a, b) => (b.opportunity_score ?? 0) - (a.opportunity_score ?? 0))
    } else {
      result = [...result].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    }
    return result
  }, [trends, statusFilter, sourceFilter, typeFilter, sortMode])

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <SubNav items={SUB_NAV_ITEMS} />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="size-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Trends Watch</h1>
          <span className="text-sm text-muted-foreground">({filtered.length})</span>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="size-4 mr-1" /> Add Trend
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Watching" value={stats.watching} color="text-blue-600" />
        <StatCard label="Acted On" value={stats.actedOn} color="text-emerald-600" />
        <StatCard label="Passed" value={stats.passed} color="text-slate-500" />
        <StatCard label="Avg Opportunity Score" value={stats.avg} color="text-amber-600" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border rounded-md bg-card"
        >
          {STATUS_TABS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border rounded-md bg-card"
        >
          <option value="all">All Sources</option>
          {SOURCES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border rounded-md bg-card"
        >
          <option value="all">All Types</option>
          {TREND_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <div className="ml-auto">
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as "newest" | "score")}
            className="px-3 py-1.5 text-sm border rounded-md bg-card"
          >
            <option value="newest">Newest</option>
            <option value="score">Highest Score</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
          Tracked Trends
        </div>
        {loading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Telescope className="size-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No trends match your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground uppercase w-8"></th>
                  <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground uppercase">Trend</th>
                  <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground uppercase">Category</th>
                  <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground uppercase">Type</th>
                  <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground uppercase">Source</th>
                  <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground uppercase">Growth</th>
                  <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground uppercase">Opportunity</th>
                  <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground uppercase">Status</th>
                  <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground uppercase">Added</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const badge = STATUS_BADGE[t.status ?? "watching"] ?? STATUS_BADGE.watching
                  const score = t.opportunity_score ?? 0
                  const expanded = expandedId === t.id
                  return (
                    <Fragment key={t.id}>
                      <tr
                        onClick={() => setExpandedId(expanded ? null : t.id)}
                        className="border-b hover:bg-muted/30 cursor-pointer"
                      >
                        <td className="px-4 py-3">
                          <ChevronRight
                            className={`size-4 text-muted-foreground transition-transform ${
                              expanded ? "rotate-90" : ""
                            }`}
                          />
                        </td>
                        <td className="px-4 py-3 font-medium">{t.trend_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{t.category ?? "—"}</td>
                        <td className="px-4 py-3">
                          {t.trend_type && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              {t.trend_type}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{t.source ?? "—"}</td>
                        <td className="px-4 py-3">
                          <GrowthSignalIcon signal={t.growth_signal} />
                        </td>
                        <td className="px-4 py-3 w-40">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${scoreColor(score)}`}
                                style={{ width: `${score}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium">{score}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatDate(t.created_at)}
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="border-b bg-muted/20">
                          <td colSpan={9} className="px-6 py-4">
                            <div className="space-y-3">
                              {t.description && (
                                <div>
                                  <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                                    Description
                                  </div>
                                  <p className="text-sm">{t.description}</p>
                                </div>
                              )}
                              {t.notes && (
                                <div>
                                  <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                                    Notes
                                  </div>
                                  <p className="text-sm whitespace-pre-wrap">{t.notes}</p>
                                </div>
                              )}
                              {(t.reference_urls ?? []).length > 0 && (
                                <div>
                                  <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                                    References
                                  </div>
                                  <ul className="space-y-1">
                                    {(t.reference_urls ?? []).map((url, i) => (
                                      <li key={i}>
                                        <a
                                          href={url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                        >
                                          <ExternalLink className="size-3" /> {url}
                                        </a>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && <AddTrendModal onClose={() => setShowAdd(false)} onCreated={load} />}
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5">
      <div className="text-xs font-medium text-muted-foreground uppercase">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  )
}
