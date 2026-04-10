"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  CheckCircle2,
  Clock,
  TrendingUp,
  Award,
  PhoneIncoming,
  PhoneOutgoing,
  Mic,
  ChevronRight,
  AlertCircle,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CallRow {
  id: string
  call_type: string | null
  emp_name: string | null
  client_name: string | null
  client_number: string | null
  call_started_at: string | null
  duration_seconds: number | null
  user_id: string | null
}

interface TranscriptionRow {
  call_id: string
  ai_quality_score: number | null
  ai_sentiment: string | null
  ai_flag_severity: string | null
}

interface ReviewRow {
  id: string
  call_id: string
  reviewer_user_id: string | null
  overall_score: number | null
  passed: boolean | null
  feedback: string | null
  follow_up_required: boolean | null
  created_at: string
}

interface UserRow {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
}

type TabKey = "pending" | "completed"

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDuration(s: number | null): string {
  if (!s || s <= 0) return "—"
  const mins = Math.floor(s / 60)
  const secs = s % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function isOutgoing(callType: string | null): boolean {
  if (!callType) return false
  return callType.toLowerCase().includes("out")
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function QAReviewsPage() {
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabKey>("pending")

  const [calls, setCalls] = useState<CallRow[]>([])
  const [transcriptions, setTranscriptions] = useState<Record<string, TranscriptionRow>>({})
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [users, setUsers] = useState<Record<string, UserRow>>({})

  // Filters
  const [daysBack, setDaysBack] = useState<number>(30)
  const [scoreMin, setScoreMin] = useState<number>(0)
  const [scoreMax, setScoreMax] = useState<number>(100)
  const [reviewerFilter, setReviewerFilter] = useState<string>("all")
  const [passFilter, setPassFilter] = useState<"all" | "pass" | "fail">("all")

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const since = new Date()
      since.setDate(since.getDate() - daysBack)
      const sinceIso = since.toISOString()

      const [callsRes, reviewsRes, usersRes, transRes] = await Promise.all([
        supabase
          .from("calls")
          .select("id, call_type, emp_name, client_name, client_number, call_started_at, duration_seconds, user_id")
          .gte("call_started_at", sinceIso)
          .order("call_started_at", { ascending: false })
          .limit(500),
        supabase
          .from("call_qa_reviews")
          .select("id, call_id, reviewer_user_id, overall_score, passed, feedback, follow_up_required, created_at")
          .gte("created_at", sinceIso)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase.from("users").select("id, full_name, email, avatar_url"),
        supabase
          .from("call_transcriptions")
          .select("call_id, ai_quality_score, ai_sentiment, ai_flag_severity"),
      ])

      if (cancelled) return

      const allCalls = (callsRes.data ?? []) as CallRow[]
      const allReviews = (reviewsRes.data ?? []) as ReviewRow[]
      const allUsers = (usersRes.data ?? []) as UserRow[]
      const allTrans = (transRes.data ?? []) as TranscriptionRow[]

      const usersMap: Record<string, UserRow> = {}
      for (const u of allUsers) usersMap[u.id] = u

      const transMap: Record<string, TranscriptionRow> = {}
      for (const t of allTrans) transMap[t.call_id] = t

      setCalls(allCalls)
      setReviews(allReviews)
      setUsers(usersMap)
      setTranscriptions(transMap)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [daysBack])

  /* -------------------------------------------------------------- */
  /*  Derived data                                                  */
  /* -------------------------------------------------------------- */

  const reviewedCallIds = useMemo(() => {
    const s = new Set<string>()
    for (const r of reviews) s.add(r.call_id)
    return s
  }, [reviews])

  const pendingCalls = useMemo(
    () => calls.filter((c) => !reviewedCallIds.has(c.id)),
    [calls, reviewedCallIds]
  )

  const todayStart = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }, [])

  const completedToday = useMemo(
    () =>
      reviews.filter(
        (r) => r.created_at && new Date(r.created_at).getTime() >= todayStart
      ).length,
    [reviews, todayStart]
  )

  const passRate = useMemo(() => {
    const judged = reviews.filter((r) => r.passed !== null)
    if (judged.length === 0) return 0
    const passes = judged.filter((r) => r.passed === true).length
    return Math.round((passes / judged.length) * 100)
  }, [reviews])

  const avgScore = useMemo(() => {
    const scored = reviews.filter((r) => typeof r.overall_score === "number")
    if (scored.length === 0) return 0
    const sum = scored.reduce((s, r) => s + (r.overall_score ?? 0), 0)
    return Math.round(sum / scored.length)
  }, [reviews])

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      const score = r.overall_score ?? 0
      if (score < scoreMin || score > scoreMax) return false
      if (reviewerFilter !== "all" && r.reviewer_user_id !== reviewerFilter) return false
      if (passFilter === "pass" && r.passed !== true) return false
      if (passFilter === "fail" && r.passed !== false) return false
      return true
    })
  }, [reviews, scoreMin, scoreMax, reviewerFilter, passFilter])

  const reviewerOptions = useMemo(() => {
    const ids = new Set<string>()
    for (const r of reviews) {
      if (r.reviewer_user_id) ids.add(r.reviewer_user_id)
    }
    return Array.from(ids)
  }, [reviews])

  const callById = useMemo(() => {
    const m: Record<string, CallRow> = {}
    for (const c of calls) m[c.id] = c
    return m
  }, [calls])

  /* -------------------------------------------------------------- */
  /*  Render                                                        */
  /* -------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-[400px] rounded-lg bg-muted animate-pulse" />
      </div>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">QA Reviews</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Call quality review queue and completed review history
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pending Reviews"
          value={pendingCalls.length.toString()}
          icon={<Clock className="size-4" />}
          accent="text-amber-600"
        />
        <StatCard
          label="Completed Today"
          value={completedToday.toString()}
          icon={<CheckCircle2 className="size-4" />}
          accent="text-emerald-600"
        />
        <StatCard
          label="Pass Rate"
          value={`${passRate}%`}
          icon={<TrendingUp className="size-4" />}
          accent="text-blue-600"
        />
        <StatCard
          label="Avg Score"
          value={`${avgScore}`}
          icon={<Award className="size-4" />}
          accent="text-violet-600"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted/60 w-fit">
        <button
          onClick={() => setTab("pending")}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            tab === "pending"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Pending ({pendingCalls.length})
        </button>
        <button
          onClick={() => setTab("completed")}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            tab === "completed"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Completed ({reviews.length})
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
          Filters
        </div>
        <div className="px-5 py-4 flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Date range</label>
            <select
              value={daysBack}
              onChange={(e) => setDaysBack(Number(e.target.value))}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Score min</label>
            <input
              type="number"
              min={0}
              max={100}
              value={scoreMin}
              onChange={(e) => setScoreMin(Number(e.target.value))}
              className="h-9 w-24 rounded-md border border-border bg-background px-3 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Score max</label>
            <input
              type="number"
              min={0}
              max={100}
              value={scoreMax}
              onChange={(e) => setScoreMax(Number(e.target.value))}
              className="h-9 w-24 rounded-md border border-border bg-background px-3 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Reviewer</label>
            <select
              value={reviewerFilter}
              onChange={(e) => setReviewerFilter(e.target.value)}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="all">All reviewers</option>
              {reviewerOptions.map((id) => (
                <option key={id} value={id}>
                  {users[id]?.full_name ?? id.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Pass/Fail</label>
            <select
              value={passFilter}
              onChange={(e) => setPassFilter(e.target.value as "all" | "pass" | "fail")}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="all">All</option>
              <option value="pass">Pass only</option>
              <option value="fail">Fail only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tab content */}
      {tab === "pending" ? (
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
            Pending Review Queue
          </div>
          {pendingCalls.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">
              All calls in this range have been reviewed.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Dir</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Duration</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Rec</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">AI Score</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingCalls.slice(0, 100).map((c) => {
                    const trans = transcriptions[c.id]
                    const out = isOutgoing(c.call_type)
                    return (
                      <tr key={c.id} className="border-t hover:bg-muted/20">
                        <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(c.call_started_at)}</td>
                        <td className="px-4 py-3">
                          {out ? (
                            <PhoneOutgoing className="size-4 text-blue-600" />
                          ) : (
                            <PhoneIncoming className="size-4 text-emerald-600" />
                          )}
                        </td>
                        <td className="px-4 py-3">{c.emp_name ?? "—"}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{c.client_name ?? "Unknown"}</div>
                          <div className="text-xs text-muted-foreground">{c.client_number ?? ""}</div>
                        </td>
                        <td className="px-4 py-3">{formatDuration(c.duration_seconds)}</td>
                        <td className="px-4 py-3">
                          <Mic className="size-4 text-muted-foreground" />
                        </td>
                        <td className="px-4 py-3">
                          {typeof trans?.ai_quality_score === "number" ? (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-50 text-violet-700">
                              {trans.ai_quality_score}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/workspace/qa/calls/${c.id}`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            Review <ChevronRight className="size-3" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
            Completed Reviews
          </div>
          {filteredReviews.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">
              No reviews match the current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Call</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Reviewer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Score</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Result</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Follow-up</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReviews.slice(0, 200).map((r) => {
                    const c = callById[r.call_id]
                    const reviewer = r.reviewer_user_id ? users[r.reviewer_user_id] : null
                    const score = r.overall_score ?? 0
                    return (
                      <tr key={r.id} className="border-t hover:bg-muted/20 align-top">
                        <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(r.created_at)}</td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/workspace/qa/calls/${r.call_id}`}
                            className="text-primary hover:underline text-xs font-medium"
                          >
                            View call
                          </Link>
                        </td>
                        <td className="px-4 py-3">{c?.emp_name ?? "—"}</td>
                        <td className="px-4 py-3">{reviewer?.full_name ?? "—"}</td>
                        <td className="px-4 py-3 w-40">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-rose-500"
                                }`}
                                style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium w-8 text-right">{score}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {r.passed === true ? (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                              Pass
                            </span>
                          ) : r.passed === false ? (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-rose-50 text-rose-700">
                              Fail
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {r.follow_up_required ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                              <AlertCircle className="size-3" /> Yes
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">No</span>
                          )}
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <span className="text-xs text-muted-foreground line-clamp-2">
                            {r.feedback ?? "—"}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Stat card                                                          */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string
  value: string
  icon: React.ReactNode
  accent: string
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
      <div className="px-5 py-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </span>
          <span className={accent}>{icon}</span>
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
      </div>
    </div>
  )
}
