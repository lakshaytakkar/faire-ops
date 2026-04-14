"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft, Phone, Mic, Award, AlertTriangle, Clock, Signal,
  PhoneIncoming, PhoneOutgoing, PhoneMissed, Sparkles,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

interface Rollup {
  employee_id: string
  employee_code: string
  employee_name: string
  employee_status: string
  device_last_seen: string | null
  has_active_device: boolean
  total_calls: number
  calls_30d: number
  with_recording: number
  scored_calls: number
  avg_score: number | null
  flagged_count: number
  positive_count: number
  negative_count: number
  escalated_count: number
  last_call_at: string | null
  s_greeting: number | null
  s_listening: number | null
  s_product: number | null
  s_energy: number | null
  s_sales: number | null
  s_language: number | null
  s_objection: number | null
  s_closing: number | null
  s_tone: number | null
}

interface DailyActivity {
  activity_date: string
  calls: number
  first_call_at: string | null
  last_call_at: string | null
  longest_gap_min: number
  gaps_over_60: number
}

interface Device {
  api_key: string
  device_model: string | null
  android_version: string | null
  last_seen_at: string | null
  is_active: boolean | null
}

interface CallListRow {
  id: string
  call_started_at: string | null
  call_type: string | null
  client_number: string | null
  client_name: string | null
  duration_seconds: number | null
  recording_storage_path: string | null
  call_transcriptions: {
    ai_quality_score: number | null
    ai_sentiment: string | null
    ai_flag_severity: string | null
  }[] | null
}

interface GapEvent {
  gap_start: string
  gap_end: string
  duration_min: number
  kind: string
}

function fmtDate(s: string | null): string {
  if (!s) return "—"
  return new Date(s).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
}

function fmtTime(s: string | null): string {
  if (!s) return "—"
  return new Date(s).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })
}

function fmtDuration(s: number | null): string {
  if (!s || s <= 0) return "—"
  const m = Math.floor(s / 60)
  const r = s % 60
  return m === 0 ? `${r}s` : `${m}m ${r}s`
}

function scoreColor(s: number | null): string {
  if (s == null) return "text-muted-foreground bg-muted"
  if (s >= 80) return "text-emerald-700 bg-emerald-50"
  if (s >= 60) return "text-blue-700 bg-blue-50"
  if (s >= 40) return "text-amber-700 bg-amber-50"
  return "text-red-700 bg-red-50"
}

function MetricBar({ label, value }: { label: string; value: number | null }) {
  const v = value ?? 0
  const pct = (v / 10) * 100
  const tone = v >= 8 ? "bg-emerald-500" : v >= 6 ? "bg-blue-500" : v >= 4 ? "bg-amber-500" : "bg-red-500"
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold tabular-nums">{value != null ? value.toFixed(1) : "—"}<span className="text-muted-foreground">/10</span></span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

const DIR_ICON: Record<string, any> = {
  INCOMING: PhoneIncoming, OUTGOING: PhoneOutgoing, MISSED: PhoneMissed,
}

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const [rollup, setRollup] = useState<Rollup | null>(null)
  const [daily, setDaily] = useState<DailyActivity[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [calls, setCalls] = useState<CallListRow[]>([])
  const [gaps, setGaps] = useState<GapEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const [rollupRes, dailyRes, devRes, callsRes, gapsRes] = await Promise.all([
        supabase.from("v_employee_qa_rollup").select("*").eq("employee_id", id).maybeSingle(),
        supabase.from("v_rep_daily_activity").select("*").eq("employee_id", id).order("activity_date", { ascending: false }),
        supabase.from("v_callsync_devices").select("api_key, device_model, android_version, last_seen_at, is_active")
          .eq("employee_id", id).order("last_seen_at", { ascending: false }),
        supabase.from("calls").select("id, call_started_at, call_type, client_number, client_name, duration_seconds, recording_storage_path, call_transcriptions(ai_quality_score, ai_sentiment, ai_flag_severity)")
          .eq("employee_id", id).order("call_started_at", { ascending: false }).limit(50),
        supabase.rpc("rep_gap_events", { p_employee_id: id }),
      ])
      if (cancelled) return
      setRollup((rollupRes.data as Rollup) ?? null)
      setDaily(((dailyRes.data ?? []) as DailyActivity[]))
      setDevices(((devRes.data ?? []) as Device[]))
      setCalls(((callsRes.data ?? []) as CallListRow[]))
      setGaps(((gapsRes.data ?? []) as GapEvent[]))
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [id])

  const todayActivity = daily.find((d) => d.activity_date === new Date().toISOString().slice(0, 10))

  const flaggedCalls = useMemo(() =>
    calls.filter((c) => {
      const t = Array.isArray(c.call_transcriptions) ? c.call_transcriptions[0] : c.call_transcriptions
      return t && t.ai_flag_severity && t.ai_flag_severity !== "none"
    }).slice(0, 5),
    [calls],
  )

  if (loading) return <div className="p-6 text-muted-foreground">Loading…</div>
  if (!rollup) return <div className="p-6 text-muted-foreground">Employee not found.</div>

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <Link href="/hq/calls/employees" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to employees
      </Link>

      {/* Header */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">{rollup.employee_name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {rollup.employee_code}
              {" · "}
              <span className={rollup.has_active_device ? "text-emerald-700" : ""}>
                {rollup.has_active_device ? (
                  <><Signal className="size-3 inline mr-1" />Device active {devices[0]?.device_model ? `(${devices[0].device_model})` : ""}</>
                ) : "No active device"}
              </span>
            </p>
          </div>
          {rollup.avg_score != null && (
            <div className="flex items-center gap-3">
              <div className={`size-14 rounded-full flex items-center justify-center text-lg font-bold ${scoreColor(rollup.avg_score)}`}>
                {rollup.avg_score}
              </div>
              <div className="text-xs text-muted-foreground">
                Avg quality score<br />
                <span className="font-medium text-foreground">{rollup.scored_calls} calls scored</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Tile label="Calls today" value={todayActivity?.calls ?? 0} icon={Phone} />
        <Tile label="30-day calls" value={rollup.calls_30d} sub={`${rollup.with_recording} with recording`} icon={Mic} tone="blue" />
        <Tile label="Flagged" value={rollup.flagged_count} sub="medium or higher" icon={AlertTriangle} tone={rollup.flagged_count > 0 ? "red" : "default"} />
        <Tile label="Longest gap today" value={todayActivity?.longest_gap_min ? `${todayActivity.longest_gap_min}m` : "—"} sub="in 09:30–18:30" icon={Clock} tone={(todayActivity?.longest_gap_min ?? 0) >= 60 ? "amber" : "default"} />
      </div>

      {/* Per-metric scores */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight flex items-center gap-2">
            <Sparkles className="size-4 text-muted-foreground" /> Skill breakdown
            <span className="ml-auto text-xs font-normal text-muted-foreground">averaged across {rollup.scored_calls} scored calls</span>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MetricBar label="Greeting" value={rollup.s_greeting} />
            <MetricBar label="Active listening" value={rollup.s_listening} />
            <MetricBar label="Product knowledge" value={rollup.s_product} />
            <MetricBar label="Energy" value={rollup.s_energy} />
            <MetricBar label="Sales skill" value={rollup.s_sales} />
            <MetricBar label="Language fluency" value={rollup.s_language} />
            <MetricBar label="Objection handling" value={rollup.s_objection} />
            <MetricBar label="Closing" value={rollup.s_closing} />
            <MetricBar label="Tone / professionalism" value={rollup.s_tone} />
          </div>
        </div>

        {/* Today's gaps */}
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" /> Today's idle windows
          </div>
          <div className="divide-y divide-border/60">
            {gaps.length === 0 ? (
              <div className="px-5 py-6 text-xs text-muted-foreground text-center">No gaps ≥ 60 min today.</div>
            ) : gaps.map((g, i) => (
              <div key={i} className="px-5 py-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="font-medium">{fmtTime(g.gap_start)} — {fmtTime(g.gap_end)}</span>
                  <span className="text-amber-700 font-medium">{g.duration_min}m</span>
                </div>
                <div className="text-muted-foreground">
                  {g.kind === "morning_idle" ? "No calls before this" :
                   g.kind === "end_idle" ? "No calls since" :
                   "Mid-day gap"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 14-day activity */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">14-day activity</div>
        <div className="p-5">
          <div className="flex items-end gap-1 h-24">
            {daily.slice().reverse().map((d) => {
              const max = Math.max(1, ...daily.map((x) => x.calls))
              const h = (d.calls / max) * 100
              const isWeekend = new Date(d.activity_date).getDay() === 0
              return (
                <div key={d.activity_date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className={`w-full rounded-t ${d.longest_gap_min >= 60 ? "bg-amber-400" : isWeekend ? "bg-slate-300" : "bg-primary"}`}
                      style={{ height: `${h}%`, minHeight: d.calls > 0 ? "2px" : 0 }}
                      title={`${d.activity_date}: ${d.calls} calls${d.longest_gap_min >= 60 ? `, ${d.longest_gap_min}m longest gap` : ""}`}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
            <span>{daily[daily.length - 1]?.activity_date}</span>
            <span>{daily[0]?.activity_date}</span>
          </div>
        </div>
      </div>

      {/* Recent calls */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight flex items-center gap-2">
          <Award className="size-4 text-muted-foreground" /> Recent calls
          <span className="ml-auto text-xs font-normal text-muted-foreground">{calls.length} of last 50</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60">
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide w-10"></th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">When (IST)</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Client</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Duration</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Score</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Flag</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {calls.slice(0, 25).map((c) => {
                const Icon = DIR_ICON[c.call_type?.toUpperCase() ?? ""] ?? Phone
                const t = Array.isArray(c.call_transcriptions) ? c.call_transcriptions[0] : c.call_transcriptions
                return (
                  <tr key={c.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2"><Icon className="size-4 text-muted-foreground" /></td>
                    <td className="px-4 py-2 whitespace-nowrap">{fmtDate(c.call_started_at)}</td>
                    <td className="px-4 py-2 whitespace-nowrap font-mono text-xs">{c.client_number ?? "—"}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-right">{fmtDuration(c.duration_seconds)}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {t?.ai_quality_score != null ? (
                        <span className={`inline-flex items-center justify-center h-6 px-2 rounded-full text-xs font-bold ${scoreColor(t.ai_quality_score)}`}>
                          {t.ai_quality_score}
                        </span>
                      ) : c.recording_storage_path ? (
                        <span className="text-xs text-muted-foreground">pending</span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {t?.ai_flag_severity && t.ai_flag_severity !== "none" ? (
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                          t.ai_flag_severity === "medium" ? "bg-amber-50 text-amber-700"
                          : t.ai_flag_severity === "high" ? "bg-orange-50 text-orange-700"
                          : t.ai_flag_severity === "critical" ? "bg-rose-50 text-rose-700"
                          : "bg-blue-50 text-blue-700"
                        }`}>{t.ai_flag_severity}</span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-right">
                      <Link href={`/hq/calls/calls/${c.id}`} className="text-xs font-medium text-primary hover:underline">Open</Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Tile({
  label, value, sub, icon: Icon, tone = "default",
}: { label: string; value: string | number; sub?: string; icon: any; tone?: string }) {
  const toneMap: Record<string, string> = {
    default: "text-primary bg-primary/10",
    emerald: "text-emerald-700 bg-emerald-50",
    amber: "text-amber-700 bg-amber-50",
    red: "text-red-700 bg-red-50",
    blue: "text-blue-700 bg-blue-50",
  }
  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <span className={`inline-flex size-7 items-center justify-center rounded ${toneMap[tone]}`}>
          <Icon className="size-3.5" />
        </span>
      </div>
      <div className="mt-2 text-xl font-bold tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  )
}
