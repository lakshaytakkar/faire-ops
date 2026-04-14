"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Search, Award, Signal, AlertTriangle, Mic, Phone, Clock, ChevronRight } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { SubNav } from "@/components/shared/sub-nav"
import { CALLS_SUB_NAV } from "../_nav"

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
}

interface TodayActivity {
  employee_id: string
  activity_date: string
  calls: number
  first_call_at: string | null
  last_call_at: string | null
  longest_gap_min: number
  gaps_over_60: number
}

function timeAgo(s: string | null): string {
  if (!s) return "—"
  const m = Math.floor((Date.now() - new Date(s).getTime()) / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function scoreColor(s: number | null): string {
  if (s == null) return "text-muted-foreground bg-muted"
  if (s >= 80) return "text-emerald-700 bg-emerald-50"
  if (s >= 60) return "text-blue-700 bg-blue-50"
  if (s >= 40) return "text-amber-700 bg-amber-50"
  return "text-red-700 bg-red-50"
}

export default function EmployeesListPage() {
  const [rows, setRows] = useState<Rollup[]>([])
  const [today, setToday] = useState<Record<string, TodayActivity>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const [rollupRes, todayRes] = await Promise.all([
        supabase.from("v_employee_qa_rollup").select("*").order("employee_code"),
        supabase.from("v_rep_daily_activity").select("*").gte("activity_date", new Date().toISOString().slice(0, 10)),
      ])
      if (cancelled) return
      setRows((rollupRes.data ?? []) as Rollup[])
      const tMap: Record<string, TodayActivity> = {}
      for (const t of (todayRes.data ?? []) as TodayActivity[]) tMap[t.employee_id] = t
      setToday(tMap)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    if (!search) return rows
    const s = search.toLowerCase()
    return rows.filter((r) => `${r.employee_code} ${r.employee_name}`.toLowerCase().includes(s))
  }, [rows, search])

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <SubNav items={CALLS_SUB_NAV} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sales reps</h1>
          <p className="mt-1 text-sm text-muted-foreground">AI-scored performance rollups. Working hours 09:30–18:30 IST.</p>
        </div>
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee code or name"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-border bg-card"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Device</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Today</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">30d calls</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Avg score</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Flags</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Last call</th>
                <th className="px-4 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">No employees found.</td></tr>
              ) : (
                filtered.map((r) => {
                  const t = today[r.employee_id]
                  const hasGap = t && t.longest_gap_min >= 60
                  return (
                    <tr key={r.employee_id} className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link href={`/hq/calls/employees/${r.employee_id}`} className="font-medium hover:underline">
                          {r.employee_name}
                        </Link>
                        <div className="text-xs text-muted-foreground">{r.employee_code}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.has_active_device ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                            <Signal className="size-3.5" /> Active
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">No device</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right tabular-nums">
                        <div className="font-medium">{t?.calls ?? 0}</div>
                        {hasGap && (
                          <div className="text-xs text-amber-700 inline-flex items-center gap-1 justify-end">
                            <Clock className="size-3" /> {t?.longest_gap_min}m gap
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right tabular-nums">
                        {r.calls_30d}
                        {r.with_recording > 0 && <span className="text-xs text-muted-foreground"> · {r.with_recording}🎙</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        {r.avg_score != null ? (
                          <span className={`inline-flex items-center justify-center size-10 rounded-full text-sm font-bold ${scoreColor(r.avg_score)}`}>
                            {r.avg_score}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.flagged_count > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="size-3" /> {r.flagged_count}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                        {timeAgo(r.last_call_at)}
                      </td>
                      <td className="px-4 py-3 w-8 text-right text-muted-foreground">
                        <ChevronRight className="size-4" />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
