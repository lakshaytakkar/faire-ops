"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  Search,
  Users,
  Phone,
  PhoneCall,
  Mail,
  Flag,
  Clock,
  Award,
  ChevronRight,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { SubNav } from "@/components/shared/sub-nav"

const SUB_NAV_ITEMS = [
  { title: "Dashboard", href: "/workspace/qa/dashboard" },
  { title: "Calls", href: "/workspace/qa/calls" },
  { title: "Flags", href: "/workspace/qa/flags" },
  { title: "Reviews", href: "/workspace/qa/reviews" },
  { title: "Employees", href: "/workspace/qa/employees" },
  { title: "Sync", href: "/workspace/qa/sync" },
]

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
  callyzer_emp_code: string | null
}

interface CallRow {
  id: string
  user_id: string | null
  call_started_at: string | null
  duration_seconds: number | null
  call_type: string | null
}

interface ReviewRow {
  id: string
  call_id: string
  overall_score: number | null
}

interface FlagRow {
  id: string
  call_id: string
  status: string | null
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function initials(name: string | null): string {
  if (!name) return "?"
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function formatDurationShort(s: number): string {
  if (s <= 0) return "0s"
  const mins = Math.floor(s / 60)
  const secs = Math.round(s % 60)
  if (mins === 0) return `${secs}s`
  return `${mins}m ${secs}s`
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function QAEmployeesPage() {
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserRow[]>([])
  const [phones, setPhones] = useState<PhoneRow[]>([])
  const [calls, setCalls] = useState<CallRow[]>([])
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [flags, setFlags] = useState<FlagRow[]>([])
  const [search, setSearch] = useState("")

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const since7 = new Date()
      since7.setDate(since7.getDate() - 7)
      const since7Iso = since7.toISOString()

      const [usersRes, phonesRes, callsRes, reviewsRes, flagsRes] = await Promise.all([
        supabase.from("users").select("id, full_name, email, avatar_url, phone"),
        supabase
          .from("user_phone_numbers")
          .select("id, user_id, phone, country_code, label, callyzer_emp_code"),
        supabase
          .from("calls")
          .select("id, user_id, call_started_at, duration_seconds, call_type")
          .gte("call_started_at", since7Iso)
          .limit(5000),
        supabase
          .from("call_qa_reviews")
          .select("id, call_id, overall_score")
          .limit(2000),
        supabase
          .from("call_flags")
          .select("id, call_id, status")
          .in("status", ["open", "investigating"])
          .limit(2000),
      ])

      if (cancelled) return

      setUsers((usersRes.data ?? []) as UserRow[])
      setPhones((phonesRes.data ?? []) as PhoneRow[])
      setCalls((callsRes.data ?? []) as CallRow[])
      setReviews((reviewsRes.data ?? []) as ReviewRow[])
      setFlags((flagsRes.data ?? []) as FlagRow[])
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  /* -------------------------------------------------------------- */
  /*  Derived                                                       */
  /* -------------------------------------------------------------- */

  const phonesByUser = useMemo(() => {
    const m: Record<string, PhoneRow[]> = {}
    for (const p of phones) {
      if (!p.user_id) continue
      if (!m[p.user_id]) m[p.user_id] = []
      m[p.user_id].push(p)
    }
    return m
  }, [phones])

  const usersWithPhones = useMemo(
    () => users.filter((u) => (phonesByUser[u.id] ?? []).length > 0),
    [users, phonesByUser]
  )

  const callsByUser = useMemo(() => {
    const m: Record<string, CallRow[]> = {}
    for (const c of calls) {
      if (!c.user_id) continue
      if (!m[c.user_id]) m[c.user_id] = []
      m[c.user_id].push(c)
    }
    return m
  }, [calls])

  const reviewsByCall = useMemo(() => {
    const m: Record<string, ReviewRow[]> = {}
    for (const r of reviews) {
      if (!m[r.call_id]) m[r.call_id] = []
      m[r.call_id].push(r)
    }
    return m
  }, [reviews])

  const openFlagsByCall = useMemo(() => {
    const m: Record<string, number> = {}
    for (const f of flags) {
      m[f.call_id] = (m[f.call_id] ?? 0) + 1
    }
    return m
  }, [flags])

  const todayStart = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }, [])

  // Page-level stat totals
  const totalEmployees = usersWithPhones.length
  const activeToday = useMemo(() => {
    const s = new Set<string>()
    for (const c of calls) {
      if (c.user_id && c.call_started_at && new Date(c.call_started_at).getTime() >= todayStart) {
        s.add(c.user_id)
      }
    }
    return s.size
  }, [calls, todayStart])

  const totalCalls7d = calls.length

  const avgQAScore = useMemo(() => {
    const scores: number[] = []
    for (const r of reviews) if (typeof r.overall_score === "number") scores.push(r.overall_score)
    if (scores.length === 0) return 0
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  }, [reviews])

  // Per-employee stats
  function getStats(userId: string) {
    const userCalls = callsByUser[userId] ?? []
    const count = userCalls.length
    const connected = userCalls.filter((c) => (c.duration_seconds ?? 0) > 0)
    const durations = connected.map((c) => c.duration_seconds ?? 0)
    const avgDuration = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0
    const connectRate = count > 0 ? Math.round((connected.length / count) * 100) : 0

    const callIds = userCalls.map((c) => c.id)
    const userReviewScores: number[] = []
    let openFlagCount = 0
    for (const id of callIds) {
      const rs = reviewsByCall[id]
      if (rs) for (const r of rs) if (typeof r.overall_score === "number") userReviewScores.push(r.overall_score)
      openFlagCount += openFlagsByCall[id] ?? 0
    }
    const qaScore = userReviewScores.length > 0
      ? Math.round(userReviewScores.reduce((a, b) => a + b, 0) / userReviewScores.length)
      : 0

    return { count, avgDuration, connectRate, qaScore, openFlagCount }
  }

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return usersWithPhones
    return usersWithPhones.filter(
      (u) =>
        (u.full_name ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q)
    )
  }, [usersWithPhones, search])

  /* -------------------------------------------------------------- */
  /*  Render                                                        */
  /* -------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <SubNav items={SUB_NAV_ITEMS} />
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-72 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <SubNav items={SUB_NAV_ITEMS} />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Employee Scorecards</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Per-employee call performance and QA metrics
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Employees"
          value={totalEmployees.toString()}
          icon={<Users className="size-4" />}
          accent="text-blue-600"
        />
        <StatCard
          label="Active Today"
          value={activeToday.toString()}
          icon={<PhoneCall className="size-4" />}
          accent="text-emerald-600"
        />
        <StatCard
          label="Total Calls (7d)"
          value={totalCalls7d.toString()}
          icon={<Phone className="size-4" />}
          accent="text-violet-600"
        />
        <StatCard
          label="Avg QA Score"
          value={avgQAScore.toString()}
          icon={<Award className="size-4" />}
          accent="text-amber-600"
        />
      </div>

      {/* Search */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employees by name or email..."
              className="w-full h-9 pl-9 pr-3 rounded-md border border-border bg-background text-sm"
            />
          </div>
        </div>
      </div>

      {/* Employee grid */}
      {filteredUsers.length === 0 ? (
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden px-5 py-12 text-center text-sm text-muted-foreground">
          No employees match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((u) => {
            const empPhones = phonesByUser[u.id] ?? []
            const stats = getStats(u.id)
            return (
              <div
                key={u.id}
                className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden"
              >
                <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight flex items-center gap-3">
                  {u.avatar_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={u.avatar_url}
                      alt={u.full_name ?? ""}
                      className="size-12 rounded-full object-cover border border-border"
                    />
                  ) : (
                    <div className="size-12 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-violet-600 text-white text-sm font-bold">
                      {initials(u.full_name)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{u.full_name ?? "Unnamed"}</div>
                    <div className="text-xs font-normal text-muted-foreground truncate">
                      {u.email ?? ""}
                    </div>
                  </div>
                </div>

                <div className="px-5 py-4 space-y-4">
                  {/* Phone numbers */}
                  {empPhones.length > 0 && (
                    <div className="space-y-1">
                      {empPhones.slice(0, 3).map((p) => (
                        <div key={p.id} className="flex items-center gap-2 text-xs">
                          <Phone className="size-3 text-muted-foreground" />
                          <span className="font-mono">
                            {p.country_code ?? ""}
                            {p.phone ?? "—"}
                          </span>
                          {p.label && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                              {p.label}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-3 pt-2 border-t">
                    <StatMini label="Calls 7d" value={stats.count.toString()} />
                    <StatMini label="Avg Dur" value={formatDurationShort(stats.avgDuration)} />
                    <StatMini label="Connect" value={`${stats.connectRate}%`} />
                  </div>

                  {/* Circle QA + flags */}
                  <div className="flex items-center gap-4 pt-2 border-t">
                    <ScoreCircle score={stats.qaScore} />
                    <div className="flex-1 text-xs">
                      <div className="text-muted-foreground">Avg QA Score</div>
                      <div className="text-lg font-bold">{stats.qaScore}</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-rose-600 text-sm font-bold justify-center">
                        <Flag className="size-3" />
                        {stats.openFlagCount}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                        Open flags
                      </div>
                    </div>
                  </div>

                  {/* View link */}
                  <Link
                    href={`/workspace/qa/employees/${u.id}`}
                    className="inline-flex items-center justify-center gap-1 w-full h-9 rounded-md border border-border bg-background hover:bg-muted text-sm font-medium transition-colors"
                  >
                    View Profile
                    <ChevronRight className="size-4" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
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

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-sm font-bold">{value}</div>
    </div>
  )
}

function ScoreCircle({ score }: { score: number }) {
  const radius = 22
  const stroke = 4
  const normRadius = radius - stroke / 2
  const circumference = 2 * Math.PI * normRadius
  const clamped = Math.max(0, Math.min(100, score))
  const offset = circumference - (clamped / 100) * circumference
  const color = clamped >= 80 ? "#10b981" : clamped >= 60 ? "#f59e0b" : "#e11d48"
  return (
    <svg width={radius * 2} height={radius * 2} className="shrink-0">
      <circle
        cx={radius}
        cy={radius}
        r={normRadius}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth={stroke}
      />
      <circle
        cx={radius}
        cy={radius}
        r={normRadius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${radius} ${radius})`}
      />
      <text
        x={radius}
        y={radius}
        textAnchor="middle"
        dominantBaseline="central"
        className="text-[10px] font-bold fill-foreground"
      >
        {clamped}
      </text>
    </svg>
  )
}
