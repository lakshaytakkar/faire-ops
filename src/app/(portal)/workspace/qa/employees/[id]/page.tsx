"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  Phone,
  Mail,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
  Mic,
  Award,
  Flag,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  ChevronRight,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface UserRow {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  phone: string | null
}

interface PhoneRow {
  id: string
  user_id: string
  phone: string | null
  country_code: string | null
  label: string | null
}

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
  overall_score: number | null
  passed: boolean | null
  created_at: string
}

interface FlagRow {
  id: string
  call_id: string
  flag_type: string | null
  severity: string | null
  description: string | null
  status: string | null
  created_at: string
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function initials(name: string | null): string {
  if (!name) return "?"
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

function formatDuration(s: number | null): string {
  if (!s || s <= 0) return "—"
  const mins = Math.floor(s / 60)
  const secs = s % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

function formatDateShort(iso: string | null): string {
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

function isMissed(c: CallRow): boolean {
  return (c.duration_seconds ?? 0) === 0
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ""

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<UserRow | null>(null)
  const [phones, setPhones] = useState<PhoneRow[]>([])
  const [calls, setCalls] = useState<CallRow[]>([])
  const [transcriptions, setTranscriptions] = useState<Record<string, TranscriptionRow>>({})
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [flags, setFlags] = useState<FlagRow[]>([])

  useEffect(() => {
    if (!id) return
    let cancelled = false

    async function load() {
      setLoading(true)
      const since = new Date()
      since.setDate(since.getDate() - 30)
      const sinceIso = since.toISOString()

      const [userRes, phonesRes, callsRes] = await Promise.all([
        supabase
          .from("users")
          .select("id, full_name, email, avatar_url, phone")
          .eq("id", id)
          .single(),
        supabase
          .from("user_phone_numbers")
          .select("id, user_id, phone, country_code, label")
          .eq("user_id", id),
        supabase
          .from("calls")
          .select("id, call_type, emp_name, client_name, client_number, call_started_at, duration_seconds, user_id")
          .eq("user_id", id)
          .gte("call_started_at", sinceIso)
          .order("call_started_at", { ascending: false })
          .limit(1000),
      ])

      if (cancelled) return

      const userData = (userRes.data as UserRow | null) ?? null
      const phoneData = (phonesRes.data ?? []) as PhoneRow[]
      const callData = (callsRes.data ?? []) as CallRow[]

      const callIds = callData.map((c) => c.id)

      const [transRes, reviewsRes, flagsRes] = await Promise.all([
        callIds.length > 0
          ? supabase
              .from("call_transcriptions")
              .select("call_id, ai_quality_score, ai_sentiment, ai_flag_severity")
              .in("call_id", callIds)
          : Promise.resolve({ data: [] }),
        callIds.length > 0
          ? supabase
              .from("call_qa_reviews")
              .select("id, call_id, overall_score, passed, created_at")
              .in("call_id", callIds)
          : Promise.resolve({ data: [] }),
        callIds.length > 0
          ? supabase
              .from("call_flags")
              .select("id, call_id, flag_type, severity, description, status, created_at")
              .in("call_id", callIds)
              .in("status", ["open", "investigating"])
          : Promise.resolve({ data: [] }),
      ])

      if (cancelled) return

      const transMap: Record<string, TranscriptionRow> = {}
      for (const t of (transRes.data ?? []) as TranscriptionRow[]) transMap[t.call_id] = t

      setUser(userData)
      setPhones(phoneData)
      setCalls(callData)
      setTranscriptions(transMap)
      setReviews((reviewsRes.data ?? []) as ReviewRow[])
      setFlags((flagsRes.data ?? []) as FlagRow[])
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [id])

  /* -------------------------------------------------------------- */
  /*  Derived                                                       */
  /* -------------------------------------------------------------- */

  const totalCalls = calls.length
  const connected = calls.filter((c) => (c.duration_seconds ?? 0) > 0).length
  const missed = calls.filter(isMissed).length
  const avgDuration = useMemo(() => {
    const d = calls.filter((c) => (c.duration_seconds ?? 0) > 0).map((c) => c.duration_seconds ?? 0)
    if (d.length === 0) return 0
    return Math.round(d.reduce((a, b) => a + b, 0) / d.length)
  }, [calls])
  const connectRate = totalCalls > 0 ? Math.round((connected / totalCalls) * 100) : 0

  const avgQAScore = useMemo(() => {
    const scores = reviews.filter((r) => typeof r.overall_score === "number").map((r) => r.overall_score!)
    if (scores.length === 0) return 0
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  }, [reviews])

  // Daily call volume last 30 days
  const dailyVolume = useMemo(() => {
    const map = new Map<string, number>()
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - i)
      map.set(d.toISOString().slice(0, 10), 0)
    }
    for (const c of calls) {
      if (!c.call_started_at) continue
      const key = c.call_started_at.slice(0, 10)
      if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1)
    }
    return Array.from(map.entries()).map(([date, count]) => ({ date, count }))
  }, [calls])

  // Hourly bar 0-23
  const hourlyCounts = useMemo(() => {
    const arr = new Array(24).fill(0)
    for (const c of calls) {
      if (!c.call_started_at) continue
      const h = new Date(c.call_started_at).getHours()
      arr[h] += 1
    }
    return arr as number[]
  }, [calls])

  // QA score trend daily avg
  const qaDaily = useMemo(() => {
    const map = new Map<string, { sum: number; n: number }>()
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - i)
      map.set(d.toISOString().slice(0, 10), { sum: 0, n: 0 })
    }
    for (const r of reviews) {
      if (typeof r.overall_score !== "number" || !r.created_at) continue
      const key = r.created_at.slice(0, 10)
      const entry = map.get(key)
      if (entry) {
        entry.sum += r.overall_score
        entry.n += 1
      }
    }
    return Array.from(map.entries()).map(([date, v]) => ({
      date,
      avg: v.n > 0 ? v.sum / v.n : 0,
    }))
  }, [reviews])

  const recentCalls = calls.slice(0, 20)
  const reviewByCall = useMemo(() => {
    const m: Record<string, ReviewRow> = {}
    for (const r of reviews) m[r.call_id] = r
    return m
  }, [reviews])

  /* -------------------------------------------------------------- */
  /*  Render                                                        */
  /* -------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <div className="h-6 w-32 rounded bg-muted animate-pulse" />
        <div className="h-28 rounded-lg bg-muted animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-72 rounded-lg bg-muted animate-pulse" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <Link
          href="/workspace/qa/employees"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="size-4" />
          Back to employees
        </Link>
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden px-5 py-12 text-center text-sm text-muted-foreground">
          Employee not found.
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Back */}
      <Link
        href="/workspace/qa/employees"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to employees
      </Link>

      {/* Header */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-5 flex flex-wrap gap-4 items-center">
          {user.avatar_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={user.avatar_url}
              alt={user.full_name ?? ""}
              className="size-20 rounded-full object-cover border border-border"
            />
          ) : (
            <div className="size-20 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-violet-600 text-white text-2xl font-bold">
              {initials(user.full_name)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold">{user.full_name ?? "Unnamed"}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {user.email && (
                <span className="inline-flex items-center gap-1">
                  <Mail className="size-3.5" />
                  {user.email}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Award className="size-3.5" />
                QA Team
              </span>
            </div>
            {phones.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {phones.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200"
                  >
                    <Phone className="size-3" />
                    {p.country_code ?? ""}
                    {p.phone ?? ""}
                    {p.label && <span className="text-[10px] opacity-70">({p.label})</span>}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Calls 30d" value={totalCalls.toString()} icon={<Phone className="size-4" />} accent="text-blue-600" />
        <StatCard label="Connected" value={connected.toString()} icon={<CheckCircle2 className="size-4" />} accent="text-emerald-600" />
        <StatCard label="Missed" value={missed.toString()} icon={<PhoneMissed className="size-4" />} accent="text-rose-600" />
        <StatCard label="Avg Duration" value={formatDuration(avgDuration)} icon={<Clock className="size-4" />} accent="text-violet-600" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Connect Rate" value={`${connectRate}%`} icon={<TrendingUp className="size-4" />} accent="text-cyan-600" />
        <StatCard label="Avg QA Score" value={avgQAScore.toString()} icon={<Award className="size-4" />} accent="text-amber-600" />
        <StatCard label="Reviews" value={reviews.length.toString()} icon={<CheckCircle2 className="size-4" />} accent="text-emerald-600" />
        <StatCard label="Open Flags" value={flags.length.toString()} icon={<Flag className="size-4" />} accent="text-rose-600" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
            Daily Call Volume (30 days)
          </div>
          <div className="px-5 py-4">
            <LineChart
              points={dailyVolume.map((d) => d.count)}
              labels={dailyVolume.map((d) => d.date)}
              color="#3b82f6"
            />
          </div>
        </div>

        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
            Calls by Hour
          </div>
          <div className="px-5 py-4">
            <BarChart values={hourlyCounts} color="#8b5cf6" />
          </div>
        </div>
      </div>

      {/* QA trend */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
          QA Score Trend (30 days)
        </div>
        <div className="px-5 py-4">
          <LineChart
            points={qaDaily.map((d) => d.avg)}
            labels={qaDaily.map((d) => d.date)}
            color="#10b981"
            maxY={100}
          />
        </div>
      </div>

      {/* Recent calls table */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
          Recent Calls
        </div>
        {recentCalls.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            No calls in the last 30 days.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Dir</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Rec</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Sentiment</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">QA</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">View</th>
                </tr>
              </thead>
              <tbody>
                {recentCalls.map((c) => {
                  const out = isOutgoing(c.call_type)
                  const trans = transcriptions[c.id]
                  const review = reviewByCall[c.id]
                  return (
                    <tr key={c.id} className="border-t hover:bg-muted/20">
                      <td className="px-4 py-3 whitespace-nowrap">{formatDateShort(c.call_started_at)}</td>
                      <td className="px-4 py-3">
                        {out ? (
                          <PhoneOutgoing className="size-4 text-blue-600" />
                        ) : (
                          <PhoneIncoming className="size-4 text-emerald-600" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{c.client_name ?? "Unknown"}</div>
                        <div className="text-xs text-muted-foreground">{c.client_number ?? ""}</div>
                      </td>
                      <td className="px-4 py-3">{formatDuration(c.duration_seconds)}</td>
                      <td className="px-4 py-3">
                        <Mic className="size-4 text-muted-foreground" />
                      </td>
                      <td className="px-4 py-3">
                        {trans?.ai_sentiment ? (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            trans.ai_sentiment.toLowerCase().includes("pos")
                              ? "bg-emerald-50 text-emerald-700"
                              : trans.ai_sentiment.toLowerCase().includes("neg")
                              ? "bg-rose-50 text-rose-700"
                              : "bg-slate-100 text-slate-600"
                          }`}>
                            {trans.ai_sentiment}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {review ? (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            review.passed === true
                              ? "bg-emerald-50 text-emerald-700"
                              : review.passed === false
                              ? "bg-rose-50 text-rose-700"
                              : "bg-slate-100 text-slate-600"
                          }`}>
                            {review.overall_score ?? "?"}
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
                          View <ChevronRight className="size-3" />
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

      {/* Open flags */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
          Open Flags ({flags.length})
        </div>
        {flags.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            No open flags. Great work!
          </div>
        ) : (
          <div className="divide-y">
            {flags.map((f) => {
              const sev = (f.severity ?? "low").toLowerCase()
              const sevCls =
                sev === "critical"
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : sev === "high"
                  ? "bg-orange-50 text-orange-700 border-orange-200"
                  : sev === "medium"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-blue-50 text-blue-700 border-blue-200"
              return (
                <div key={f.id} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="size-4 text-rose-600 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border uppercase ${sevCls}`}>
                          {sev}
                        </span>
                        {f.flag_type && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-50 text-violet-700">
                            {f.flag_type}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">{formatDateShort(f.created_at)}</span>
                      </div>
                      <p className="text-sm">
                        {f.description ?? <span className="italic text-muted-foreground">No description</span>}
                      </p>
                    </div>
                    <Link
                      href={`/workspace/qa/calls/${f.call_id}`}
                      className="text-xs font-medium text-primary hover:underline shrink-0"
                    >
                      View call
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Components                                                         */
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

function LineChart({
  points,
  labels,
  color,
  maxY,
}: {
  points: number[]
  labels: string[]
  color: string
  maxY?: number
}) {
  const width = 640
  const height = 180
  const pad = { top: 10, right: 10, bottom: 24, left: 28 }
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const max = maxY ?? Math.max(1, ...points)

  if (points.length === 0) {
    return <div className="h-[180px] flex items-center justify-center text-xs text-muted-foreground">No data</div>
  }

  const step = points.length > 1 ? innerW / (points.length - 1) : innerW

  const coords = points.map((v, i) => {
    const x = pad.left + i * step
    const y = pad.top + innerH - (v / max) * innerH
    return [x, y] as const
  })

  const pathD = coords
    .map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`))
    .join(" ")

  const areaD = `${pathD} L ${coords[coords.length - 1][0]} ${pad.top + innerH} L ${coords[0][0]} ${pad.top + innerH} Z`

  const yTicks = 4
  const tickVals = Array.from({ length: yTicks + 1 }, (_, i) => (max / yTicks) * i)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {/* Grid */}
      {tickVals.map((v, i) => {
        const y = pad.top + innerH - (v / max) * innerH
        return (
          <g key={i}>
            <line
              x1={pad.left}
              x2={pad.left + innerW}
              y1={y}
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.08}
              strokeWidth={1}
            />
            <text x={pad.left - 4} y={y + 3} textAnchor="end" className="text-[9px] fill-muted-foreground">
              {Math.round(v)}
            </text>
          </g>
        )
      })}

      {/* Area */}
      <path d={areaD} fill={color} fillOpacity={0.1} />
      {/* Line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {/* Points */}
      {coords.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={2} fill={color} />
      ))}

      {/* X labels - first, middle, last */}
      {[0, Math.floor(points.length / 2), points.length - 1].map((i) => {
        if (!labels[i]) return null
        const x = pad.left + i * step
        const label = labels[i].slice(5) // MM-DD
        return (
          <text
            key={i}
            x={x}
            y={height - 6}
            textAnchor="middle"
            className="text-[9px] fill-muted-foreground"
          >
            {label}
          </text>
        )
      })}
    </svg>
  )
}

function BarChart({ values, color }: { values: number[]; color: string }) {
  const width = 640
  const height = 180
  const pad = { top: 10, right: 10, bottom: 24, left: 28 }
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const max = Math.max(1, ...values)
  const barW = innerW / values.length - 2

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {/* Y grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
        const y = pad.top + innerH - f * innerH
        return (
          <g key={i}>
            <line
              x1={pad.left}
              x2={pad.left + innerW}
              y1={y}
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.08}
              strokeWidth={1}
            />
            <text x={pad.left - 4} y={y + 3} textAnchor="end" className="text-[9px] fill-muted-foreground">
              {Math.round(max * f)}
            </text>
          </g>
        )
      })}
      {values.map((v, i) => {
        const h = (v / max) * innerH
        const x = pad.left + i * (innerW / values.length) + 1
        const y = pad.top + innerH - h
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barW}
            height={h}
            fill={color}
            fillOpacity={0.8}
            rx={2}
          />
        )
      })}
      {[0, 6, 12, 18, 23].map((h) => {
        const x = pad.left + h * (innerW / values.length) + innerW / values.length / 2
        return (
          <text key={h} x={x} y={height - 6} textAnchor="middle" className="text-[9px] fill-muted-foreground">
            {h}
          </text>
        )
      })}
    </svg>
  )
}
