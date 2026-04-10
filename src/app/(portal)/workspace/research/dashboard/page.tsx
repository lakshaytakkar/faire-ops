"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Telescope,
  Lightbulb,
  Target,
  TrendingUp,
  Sparkles,
  Plus,
  ExternalLink,
  Newspaper,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
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

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ProductIdea {
  id: string
  title: string
  status: string
  priority: string | null
  validation_score: number | null
}

interface Competitor {
  id: string
  name: string
  status: string
}

interface Trend {
  id: string
  trend_name: string
  status: string
  opportunity_score: number | null
}

interface Goal {
  id: string
  title: string
  status: string
  due_date: string | null
  current_value?: number | null
  target_value?: number | null
}

interface Report {
  id: string
  title: string
  category: string | null
  summary: string | null
  status: string | null
  created_at: string
  author_user_id: string | null
}

interface Note {
  id: string
  title: string
  content: string | null
  created_at: string
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const STATUS_ORDER: Array<{ key: string; label: string; color: string }> = [
  { key: "idea", label: "Idea", color: "bg-gray-400" },
  { key: "researching", label: "Researching", color: "bg-sky-500" },
  { key: "validating", label: "Validating", color: "bg-amber-500" },
  { key: "approved", label: "Approved", color: "bg-lime-500" },
  { key: "launched", label: "Launched", color: "bg-emerald-600" },
]

function timeAgo(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const sec = Math.max(1, Math.floor((now - then) / 1000))
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}d ago`
  const mo = Math.floor(day / 30)
  if (mo < 12) return `${mo}mo ago`
  return `${Math.floor(mo / 12)}y ago`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ResearchDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [ideas, setIdeas] = useState<ProductIdea[]>([])
  const [toolsCount, setToolsCount] = useState(0)
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [trends, setTrends] = useState<Trend[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [notes, setNotes] = useState<Note[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const [
        ideasRes,
        toolsRes,
        competitorsRes,
        trendsRes,
        reportsRes,
        goalsRes,
        notesRes,
      ] = await Promise.all([
        supabase.from("research_product_ideas").select("id,title,status,priority,validation_score"),
        supabase.from("research_tools").select("id", { count: "exact", head: true }),
        supabase.from("research_competitors").select("id,name,status").eq("status", "active"),
        supabase
          .from("research_trends")
          .select("id,trend_name,status,opportunity_score")
          .eq("status", "watching"),
        supabase
          .from("research_reports")
          .select("id,title,category,summary,status,created_at,author_user_id")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("research_goals")
          .select("id,title,status,due_date,current_value,target_value")
          .eq("status", "active")
          .limit(5),
        supabase
          .from("research_notes")
          .select("id,title,content,created_at")
          .order("created_at", { ascending: false })
          .limit(5),
      ])

      if (cancelled) return

      setIdeas((ideasRes.data as ProductIdea[]) ?? [])
      setToolsCount(toolsRes.count ?? 0)
      setCompetitors((competitorsRes.data as Competitor[]) ?? [])
      setTrends((trendsRes.data as Trend[]) ?? [])
      setReports((reportsRes.data as Report[]) ?? [])
      setGoals((goalsRes.data as Goal[]) ?? [])
      setNotes((notesRes.data as Note[]) ?? [])
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const activeIdeaCount = ideas.filter(
    (i) => i.status !== "launched" && i.status !== "rejected",
  ).length

  const funnel = STATUS_ORDER.map((s) => ({
    ...s,
    count: ideas.filter((i) => (i.status ?? "").toLowerCase() === s.key).length,
  }))
  const funnelMax = Math.max(1, ...funnel.map((f) => f.count))

  /* ------------------------------------------------------------------ */
  /*  Loading                                                            */
  /* ------------------------------------------------------------------ */

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <SubNav items={SUB_NAV_ITEMS} />
        <div>
          <h1 className="text-2xl font-bold">Research</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Discover, validate, and launch new opportunities
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-border/80 bg-card shadow-sm p-5 h-24 animate-pulse"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 rounded-lg border border-border/80 bg-card shadow-sm h-72 animate-pulse" />
          <div className="rounded-lg border border-border/80 bg-card shadow-sm h-72 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-lg border border-border/80 bg-card shadow-sm h-64 animate-pulse" />
          <div className="rounded-lg border border-border/80 bg-card shadow-sm h-64 animate-pulse" />
        </div>
      </div>
    )
  }

  /* ------------------------------------------------------------------ */
  /*  Page                                                               */
  /* ------------------------------------------------------------------ */

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <SubNav items={SUB_NAV_ITEMS} />
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Research</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Discover, validate, and launch new opportunities
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Lightbulb className="h-5 w-5 text-amber-600" />}
          label="Active Product Ideas"
          value={activeIdeaCount}
          tint="bg-amber-50"
        />
        <StatCard
          icon={<Telescope className="h-5 w-5 text-violet-600" />}
          label="Tools in Library"
          value={toolsCount}
          tint="bg-violet-50"
        />
        <StatCard
          icon={<Target className="h-5 w-5 text-rose-600" />}
          label="Competitors Tracked"
          value={competitors.length}
          tint="bg-rose-50"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
          label="Trends Watching"
          value={trends.length}
          tint="bg-emerald-50"
        />
      </div>

      {/* Funnel + Latest Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Pipeline Funnel */}
        <div className="lg:col-span-2 rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight flex items-center justify-between">
            <span>Pipeline Funnel</span>
            <span className="text-xs font-normal text-muted-foreground">
              {ideas.length} total ideas
            </span>
          </div>
          <div className="p-5 space-y-4">
            {funnel.map((row) => {
              const pct = (row.count / funnelMax) * 100
              return (
                <div key={row.key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium">{row.label}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {row.count}
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full ${row.color} transition-all`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Latest Reports */}
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
            Latest Reports
          </div>
          <div className="divide-y">
            {reports.length === 0 ? (
              <div className="p-5 text-sm text-muted-foreground flex flex-col items-center gap-2">
                <Newspaper className="h-8 w-8 text-muted-foreground/40" />
                <p>No reports yet</p>
              </div>
            ) : (
              reports.map((r) => (
                <Link
                  key={r.id}
                  href={`/workspace/research/reports/${r.id}`}
                  className="block px-5 py-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-medium line-clamp-1">{r.title}</h4>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    {r.category && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                        {r.category}
                      </span>
                    )}
                    <span>{formatDate(r.created_at)}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Goals + Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Active Goals */}
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
            Active Goals
          </div>
          <div className="divide-y">
            {goals.length === 0 ? (
              <div className="p-5 text-sm text-muted-foreground flex flex-col items-center gap-2">
                <Target className="h-8 w-8 text-muted-foreground/40" />
                <p>No active goals</p>
              </div>
            ) : (
              goals.map((g) => {
                const hasNumeric =
                  typeof g.current_value === "number" && typeof g.target_value === "number" && g.target_value! > 0
                const pct = hasNumeric
                  ? Math.min(100, Math.round((g.current_value! / g.target_value!) * 100))
                  : 0
                return (
                  <div key={g.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-medium line-clamp-1">{g.title}</h4>
                      {g.due_date && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          Due {formatDate(g.due_date)}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums w-12 text-right">
                        {hasNumeric ? `${pct}%` : "–"}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Recent Notes */}
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
            Recent Notes
          </div>
          <div className="divide-y">
            {notes.length === 0 ? (
              <div className="p-5 text-sm text-muted-foreground flex flex-col items-center gap-2">
                <Sparkles className="h-8 w-8 text-muted-foreground/40" />
                <p>No notes yet</p>
              </div>
            ) : (
              notes.map((n) => (
                <div key={n.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-medium line-clamp-1">{n.title}</h4>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {timeAgo(n.created_at)}
                    </span>
                  </div>
                  {n.content && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{n.content}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
          Quick Actions
        </div>
        <div className="p-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <QuickAction href="/workspace/research/products" label="Product Idea" />
          <QuickAction href="/workspace/research/tools" label="Tool" />
          <QuickAction href="/workspace/research/competitors" label="Competitor" />
          <QuickAction href="/workspace/research/trends" label="Trend" />
          <QuickAction href="/workspace/research/reports" label="Report" />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatCard({
  icon,
  label,
  value,
  tint,
}: {
  icon: React.ReactNode
  label: string
  value: number
  tint: string
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
        </div>
        <div className={`rounded-lg p-2 ${tint}`}>{icon}</div>
      </div>
    </div>
  )
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="w-full">
      <Button variant="outline" className="w-full justify-start gap-2">
        <Plus className="h-4 w-4" />
        {label}
      </Button>
    </Link>
  )
}
