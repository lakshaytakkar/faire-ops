"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Phone, Clock, Mic, Sparkles, Award, AlertTriangle,
  TrendingUp, Signal, ArrowRight, MessageCircle,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { SubNav } from "@/components/shared/sub-nav"
import { CALLS_SUB_NAV } from "../_nav"

interface TeamRollup {
  active_employees: number | null
  total_employees: number | null
  total_calls: number | null
  calls_today: number | null
  calls_7d: number | null
  with_recording: number | null
  scored_calls: number | null
  pending_ai: number | null
  failed_ai: number | null
  avg_score: number | null
  flagged_count: number | null
  positive_count: number | null
  neutral_count: number | null
  negative_count: number | null
  escalated_count: number | null
}

interface CoachingCall {
  call_id: string
  call_started_at: string | null
  emp_name: string | null
  emp_code: string | null
  client_number: string | null
  client_name: string | null
  ai_quality_score: number | null
  ai_sentiment: string | null
  ai_flag_severity: string | null
  ai_summary: string | null
}

interface DeviceRow {
  api_key: string
  employee_code: string | null
  employee_name: string | null
  device_model: string | null
  last_seen_at: string | null
  total_calls: number | null
  total_recordings: number | null
  is_active: boolean | null
}

interface TodayActivityRow {
  employee_id: string
  employee_code: string
  employee_name: string
  activity_date: string
  calls: number
  first_call_at: string | null
  last_call_at: string | null
  longest_gap_min: number
  gaps_over_60: number
}

function timeAgo(s: string | null): string {
  if (!s) return "—"
  const diffMs = Date.now() - new Date(s).getTime()
  const m = Math.floor(diffMs / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function scoreTone(s: number | null): string {
  if (s == null) return "text-muted-foreground"
  if (s >= 80) return "text-emerald-600"
  if (s >= 60) return "text-blue-600"
  if (s >= 40) return "text-amber-600"
  return "text-red-600"
}

function flagTone(f: string | null): string {
  if (!f || f === "none") return "bg-slate-100 text-slate-600"
  if (f === "low") return "bg-blue-50 text-blue-700"
  if (f === "medium") return "bg-amber-50 text-amber-700"
  if (f === "high") return "bg-orange-50 text-orange-700"
  return "bg-rose-50 text-rose-700"
}

function Tile({
  label, value, sub, icon: Icon, tone = "default",
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ComponentType<{ className?: string }>
  tone?: "default" | "emerald" | "amber" | "red" | "blue"
}) {
  const toneMap: Record<string, string> = {
    default: "text-primary bg-primary/10",
    emerald: "text-emerald-700 bg-emerald-50",
    amber: "text-amber-700 bg-amber-50",
    red: "text-red-700 bg-red-50",
    blue: "text-blue-700 bg-blue-50",
  }
  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <span className={`inline-flex size-8 items-center justify-center rounded-md ${toneMap[tone]}`}>
          <Icon className="size-4" />
        </span>
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  )
}

function SentimentBar({ p, n, x, esc }: { p: number; n: number; x: number; esc: number }) {
  const total = Math.max(1, p + n + x + esc)
  const pct = (v: number) => (v / total) * 100
  return (
    <div className="h-2.5 w-full rounded-full overflow-hidden bg-muted flex">
      <div style={{ width: `${pct(p)}%` }} className="bg-emerald-500" />
      <div style={{ width: `${pct(n)}%` }} className="bg-slate-400" />
      <div style={{ width: `${pct(x)}%` }} className="bg-amber-500" />
      <div style={{ width: `${pct(esc)}%` }} className="bg-rose-500" />
    </div>
  )
}

export default function CallsDashboard() {
  const [team, setTeam] = useState<TeamRollup | null>(null)
  const [coaching, setCoaching] = useState<CoachingCall[]>([])
  const [devices, setDevices] = useState<DeviceRow[]>([])
  const [todayActivity, setTodayActivity] = useState<TodayActivityRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const todayIst = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10)
      const [teamRes, coachingRes, devRes, todayRes] = await Promise.all([
        supabase.from("v_team_qa_rollup").select("*").maybeSingle(),
        supabase
          .from("call_transcriptions")
          .select("call_id, ai_quality_score, ai_sentiment, ai_flag_severity, ai_summary, calls!inner(id,call_started_at,emp_name,emp_code,client_number,client_name)")
          .eq("transcript_status", "completed")
          .or("ai_flag_severity.in.(medium,high,critical),ai_quality_score.lt.40")
          .order("ai_flag_severity", { ascending: false, nullsFirst: false })
          .limit(10),
        supabase
          .from("v_callsync_devices")
          .select("api_key, employee_code, employee_name, device_model, last_seen_at, total_calls, total_recordings, is_active")
          .eq("is_active", true)
          .order("last_seen_at", { ascending: false, nullsFirst: false })
          .limit(8),
        supabase
          .from("v_rep_daily_activity")
          .select("*")
          .eq("activity_date", todayIst),
      ])
      if (cancelled) return
      setTeam((teamRes.data as TeamRollup) ?? null)
      setCoaching(
        ((coachingRes.data ?? []) as any[]).map((r) => ({
          call_id: r.call_id,
          call_started_at: r.calls?.call_started_at ?? null,
          emp_name: r.calls?.emp_name ?? null,
          emp_code: r.calls?.emp_code ?? null,
          client_number: r.calls?.client_number ?? null,
          client_name: r.calls?.client_name ?? null,
          ai_quality_score: r.ai_quality_score,
          ai_sentiment: r.ai_sentiment,
          ai_flag_severity: r.ai_flag_severity,
          ai_summary: r.ai_summary,
        })),
      )
      setDevices((devRes.data ?? []) as DeviceRow[])
      setTodayActivity((todayRes.data ?? []) as TodayActivityRow[])
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  // Identify urgent situations
  const activeEmployeeIds = new Set(devices.map((d) => d.employee_code))
  const idleReps = todayActivity
    .filter((r) => activeEmployeeIds.has(r.employee_code))
    .filter((r) => r.longest_gap_min >= 60)
    .sort((a, b) => b.longest_gap_min - a.longest_gap_min)
  const noCallReps = todayActivity
    .filter((r) => activeEmployeeIds.has(r.employee_code))
    .filter((r) => r.calls === 0)
  const urgentFlags = coaching.filter((c) => c.ai_flag_severity && ["high", "critical"].includes(c.ai_flag_severity))
  const hasUrgent = idleReps.length > 0 || noCallReps.length > 0 || urgentFlags.length > 0

  const pendingAi = team?.pending_ai ?? 0
  const failedAi = team?.failed_ai ?? 0

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <SubNav items={CALLS_SUB_NAV} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Calls dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI-scored quality metrics across all sales reps. Auto-transcribed via Gemini 2.5 Flash.
          </p>
        </div>
        {(pendingAi > 0 || failedAi > 0) && (
          <div className="text-xs text-muted-foreground">
            AI queue: <span className="text-amber-700 font-medium">{pendingAi} pending</span>
            {failedAi > 0 && <> · <span className="text-red-700 font-medium">{failedAi} failed</span></>}
          </div>
        )}
      </div>

      {/* Urgent section */}
      {hasUrgent && (
        <div className="rounded-lg border border-amber-300 bg-amber-50/50 overflow-hidden">
          <div className="px-5 py-3 border-b border-amber-300 bg-amber-100/50 flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-700" />
            <span className="text-sm font-semibold text-amber-900">Urgent today</span>
            <span className="ml-auto text-xs text-amber-700">IST 09:30–18:30 working window</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-amber-200">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-amber-900 uppercase tracking-wide">Critical flags</span>
                <span className="text-xl font-bold text-amber-900">{urgentFlags.length}</span>
              </div>
              <div className="mt-2 space-y-1 min-h-[3rem]">
                {urgentFlags.slice(0, 3).map((c) => (
                  <Link key={c.call_id} href={`/hq/calls/calls/${c.call_id}`} className="block text-xs text-amber-900 hover:underline truncate">
                    {c.emp_code} → {c.client_number} — {c.ai_flag_severity}
                  </Link>
                ))}
                {urgentFlags.length === 0 && <div className="text-xs text-amber-700/60">None</div>}
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-amber-900 uppercase tracking-wide">Reps idle (&gt; 60m gap)</span>
                <span className="text-xl font-bold text-amber-900">{idleReps.length}</span>
              </div>
              <div className="mt-2 space-y-1 min-h-[3rem]">
                {idleReps.slice(0, 3).map((r) => (
                  <Link key={r.employee_id} href={`/hq/calls/employees/${r.employee_id}`} className="block text-xs text-amber-900 hover:underline truncate">
                    {r.employee_code} — {r.longest_gap_min}m gap ({r.calls} calls today)
                  </Link>
                ))}
                {idleReps.length === 0 && <div className="text-xs text-amber-700/60">None</div>}
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-amber-900 uppercase tracking-wide">Zero calls today</span>
                <span className="text-xl font-bold text-amber-900">{noCallReps.length}</span>
              </div>
              <div className="mt-2 space-y-1 min-h-[3rem]">
                {noCallReps.slice(0, 3).map((r) => (
                  <Link key={r.employee_id} href={`/hq/calls/employees/${r.employee_id}`} className="block text-xs text-amber-900 hover:underline truncate">
                    {r.employee_code} — {r.employee_name}
                  </Link>
                ))}
                {noCallReps.length === 0 && <div className="text-xs text-amber-700/60">None</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Tile label="Calls today" value={team?.calls_today ?? 0} sub={`${team?.calls_7d ?? 0} this week`} icon={Phone} />
        <Tile label="Avg AI score" value={team?.avg_score ?? "—"} sub={`${team?.scored_calls ?? 0} scored`} icon={Sparkles} tone={(team?.avg_score ?? 0) >= 70 ? "emerald" : (team?.avg_score ?? 0) >= 50 ? "blue" : "amber"} />
        <Tile label="Flagged" value={team?.flagged_count ?? 0} sub="medium / high / critical" icon={AlertTriangle} tone={(team?.flagged_count ?? 0) > 0 ? "red" : "default"} />
        <Tile label="Recordings" value={team?.with_recording ?? 0} sub={`of ${team?.total_calls ?? 0} calls`} icon={Mic} tone="blue" />
        <Tile label="Active devices" value={team?.active_employees ?? 0} sub={`of ${team?.total_employees ?? 0} reps`} icon={Signal} tone="emerald" />
      </div>

      {/* Sentiment + scoring breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight flex items-center gap-2">
            <Award className="size-4 text-muted-foreground" /> Coaching priorities
            <span className="ml-auto text-xs font-normal text-muted-foreground">flagged or score &lt; 40</span>
          </div>
          <div className="divide-y divide-border/60">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-5 py-3"><div className="h-4 w-3/4 bg-muted rounded animate-pulse" /></div>
              ))
            ) : coaching.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-muted-foreground">No coaching priorities right now — all calls scored ≥ 40 and unflagged.</div>
            ) : (
              coaching.map((c) => (
                <Link
                  key={c.call_id}
                  href={`/hq/calls/calls/${c.call_id}`}
                  className="flex items-start gap-3 px-5 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className={`font-bold text-lg ${scoreTone(c.ai_quality_score)} w-10 text-center`}>
                    {c.ai_quality_score ?? "—"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium truncate">{c.emp_code ?? c.emp_name ?? "Unknown"}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-mono text-xs">{c.client_number ?? "—"}</span>
                      {c.ai_flag_severity && c.ai_flag_severity !== "none" && (
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${flagTone(c.ai_flag_severity)}`}>
                          {c.ai_flag_severity}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
                        {timeAgo(c.call_started_at)}
                      </span>
                    </div>
                    {c.ai_summary && (
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{c.ai_summary}</div>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight flex items-center gap-2">
            <MessageCircle className="size-4 text-muted-foreground" /> Sentiment
          </div>
          <div className="p-5 space-y-4">
            {loading ? (
              <div className="h-20 bg-muted rounded animate-pulse" />
            ) : (
              <>
                <SentimentBar
                  p={team?.positive_count ?? 0}
                  n={team?.neutral_count ?? 0}
                  x={team?.negative_count ?? 0}
                  esc={team?.escalated_count ?? 0}
                />
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-emerald-500" /> Positive</div>
                    <div className="font-bold text-lg mt-1">{team?.positive_count ?? 0}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-slate-400" /> Neutral</div>
                    <div className="font-bold text-lg mt-1">{team?.neutral_count ?? 0}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-amber-500" /> Negative</div>
                    <div className="font-bold text-lg mt-1">{team?.negative_count ?? 0}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-rose-500" /> Escalated</div>
                    <div className="font-bold text-lg mt-1">{team?.escalated_count ?? 0}</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Device activity */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight flex items-center gap-2">
          <Signal className="size-4 text-muted-foreground" /> Device activity
          <Link href="/hq/calls/sync" className="ml-auto text-xs font-normal text-primary hover:underline inline-flex items-center gap-1">
            Manage devices <ArrowRight className="size-3" />
          </Link>
        </div>
        <div className="divide-y divide-border/60">
          {loading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="px-5 py-3"><div className="h-4 w-1/2 bg-muted rounded animate-pulse" /></div>
            ))
          ) : devices.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">No active devices.</div>
          ) : (
            devices.map((d) => (
              <div key={d.api_key} className="px-5 py-3 flex items-center gap-3 text-sm">
                <Signal className="size-4 text-emerald-600" />
                <span className="font-medium">{d.employee_code}</span>
                <span className="text-muted-foreground">{d.employee_name}</span>
                <span className="text-muted-foreground text-xs ml-2">{d.device_model}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {d.total_calls ?? 0} calls · {d.total_recordings ?? 0} recordings · {timeAgo(d.last_seen_at)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
