"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  PhoneOff,
  Mic,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { matchContactsByPhone, normalizePhone, type MatchedContact } from "@/lib/contact-matcher"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CallTranscription {
  call_id: string
  transcript_status: string | null
  ai_summary: string | null
  ai_sentiment: string | null
  ai_flag_severity: string | null
  ai_quality_score: number | null
}

interface CallQaReview {
  call_id: string
}

interface CallRow {
  id: string
  callyzer_id: string | null
  user_id: string | null
  call_type: string | null
  emp_name: string | null
  client_name: string | null
  client_number: string | null
  call_date: string | null
  call_time: string | null
  call_started_at: string | null
  duration_seconds: number | null
  recording_url: string | null
  recording_storage_path: string | null
  note: string | null
  crm_status: string | null
  callyzer_lead_id: string | null
  emp_tags: string[] | null
  call_transcriptions: CallTranscription[] | CallTranscription | null
  call_qa_reviews: CallQaReview[] | null
}

type DatePreset = "today" | "7d" | "30d" | "90d"
type CallTypeFilter = "all" | "incoming" | "outgoing" | "missed" | "rejected"
type SentimentFilter = "all" | "positive" | "neutral" | "negative" | "escalated"
type FlagFilter = "all" | "none" | "low" | "medium" | "high" | "critical"

const PAGE_SIZE = 50

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds < 0) return "—"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}m ${s}s`
}

function formatDateTime(iso: string | null, fallbackDate: string | null, fallbackTime: string | null): string {
  if (iso) {
    const d = new Date(iso)
    if (!isNaN(d.getTime())) {
      return d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    }
  }
  if (fallbackDate || fallbackTime) {
    return `${fallbackDate ?? ""} ${fallbackTime ?? ""}`.trim() || "—"
  }
  return "—"
}

function getFirstTranscription(c: CallRow): CallTranscription | null {
  const t = c.call_transcriptions
  if (!t) return null
  if (Array.isArray(t)) return t[0] ?? null
  return t
}

function presetToDate(preset: DatePreset): Date {
  const now = new Date()
  const d = new Date(now)
  switch (preset) {
    case "today":
      d.setHours(0, 0, 0, 0)
      break
    case "7d":
      d.setDate(now.getDate() - 7)
      break
    case "30d":
      d.setDate(now.getDate() - 30)
      break
    case "90d":
      d.setDate(now.getDate() - 90)
      break
  }
  return d
}

function presetLabel(preset: DatePreset): string {
  switch (preset) {
    case "today":
      return "today"
    case "7d":
      return "last 7 days"
    case "30d":
      return "last 30 days"
    case "90d":
      return "last 90 days"
  }
}

/* ------------------------------------------------------------------ */
/*  Direction icon                                                     */
/* ------------------------------------------------------------------ */

function DirectionCell({ callType }: { callType: string | null }) {
  const type = (callType ?? "").toLowerCase()
  let Icon = Phone
  let color = "text-slate-500"
  let bg = "bg-slate-50"
  let label = callType || "Unknown"

  if (type.includes("incom") || type === "in") {
    Icon = PhoneIncoming
    color = "text-blue-600"
    bg = "bg-blue-50"
    label = "Incoming"
  } else if (type.includes("outgo") || type === "out") {
    Icon = PhoneOutgoing
    color = "text-emerald-600"
    bg = "bg-emerald-50"
    label = "Outgoing"
  } else if (type.includes("miss")) {
    Icon = PhoneMissed
    color = "text-red-600"
    bg = "bg-red-50"
    label = "Missed"
  } else if (type.includes("reject")) {
    Icon = PhoneOff
    color = "text-amber-600"
    bg = "bg-amber-50"
    label = "Rejected"
  }

  return (
    <div className="flex items-center gap-2">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center ${bg}`}>
        <Icon className={`size-3.5 ${color}`} />
      </div>
      <span className="text-xs font-medium text-foreground">{label}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Badges                                                             */
/* ------------------------------------------------------------------ */

function SentimentBadge({ sentiment }: { sentiment: string | null }) {
  if (!sentiment) {
    return <span className="text-xs text-muted-foreground">—</span>
  }
  const s = sentiment.toLowerCase()
  const map: Record<string, string> = {
    positive: "bg-emerald-50 text-emerald-700",
    neutral: "bg-slate-100 text-slate-600",
    negative: "bg-amber-50 text-amber-700",
    escalated: "bg-red-50 text-red-700",
  }
  const cls = map[s] ?? "bg-slate-100 text-slate-600"
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  )
}

function FlagBadge({ severity }: { severity: string | null }) {
  const s = (severity ?? "none").toLowerCase()
  if (s === "none" || !severity) {
    return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">None</span>
  }
  const map: Record<string, string> = {
    low: "bg-blue-50 text-blue-700",
    medium: "bg-amber-50 text-amber-700",
    high: "bg-orange-50 text-orange-700",
    critical: "bg-red-50 text-red-700",
  }
  const cls = map[s] ?? "bg-slate-100 text-slate-600"
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls} inline-flex items-center gap-1`}>
      <AlertTriangle className="size-3" />
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  )
}

function QaStatusBadge({ reviewed }: { reviewed: boolean }) {
  return reviewed ? (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Reviewed</span>
  ) : (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">Pending</span>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CallsListPage() {
  const [calls, setCalls] = useState<CallRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [preset, setPreset] = useState<DatePreset>("7d")
  const [search, setSearch] = useState("")
  const [callType, setCallType] = useState<CallTypeFilter>("all")
  const [hasRecording, setHasRecording] = useState(false)
  const [sentiment, setSentiment] = useState<SentimentFilter>("all")
  const [flag, setFlag] = useState<FlagFilter>("all")
  const [page, setPage] = useState(1)
  const [contactMap, setContactMap] = useState<Map<string, MatchedContact>>(new Map())

  useEffect(() => {
    setPage(1)
  }, [preset, search, callType, hasRecording, sentiment, flag])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const sinceDate = presetToDate(preset).toISOString()
        const { data, error: dbError } = await supabase
          .from("calls")
          .select(
            `
            id, callyzer_id, user_id, call_type, emp_name, client_name, client_number,
            call_date, call_time, call_started_at, duration_seconds, recording_url,
            recording_storage_path, note, crm_status, callyzer_lead_id, emp_tags,
            call_transcriptions(call_id, transcript_status, ai_summary, ai_sentiment, ai_flag_severity, ai_quality_score),
            call_qa_reviews(call_id)
          `
          )
          .gte("call_started_at", sinceDate)
          .order("call_started_at", { ascending: false })
          .limit(1000)

        if (cancelled) return
        if (dbError) {
          setError(dbError.message)
          setCalls([])
          setContactMap(new Map())
        } else {
          const rows = (data ?? []) as unknown as CallRow[]
          setCalls(rows)
          // Fetch contact matches for all client numbers in parallel
          const phones = rows.map((r) => r.client_number).filter(Boolean) as string[]
          if (phones.length > 0) {
            const map = await matchContactsByPhone(phones)
            if (!cancelled) setContactMap(map)
          } else {
            setContactMap(new Map())
          }
        }
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : "Failed to load calls")
        setCalls([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [preset])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return calls.filter((c) => {
      // Search
      if (q) {
        const hay = `${c.client_name ?? ""} ${c.client_number ?? ""}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      // Call type
      if (callType !== "all") {
        const t = (c.call_type ?? "").toLowerCase()
        if (!t.includes(callType)) return false
      }
      // Has recording
      if (hasRecording && !c.recording_url && !c.recording_storage_path) return false
      // Sentiment
      const tr = getFirstTranscription(c)
      if (sentiment !== "all") {
        const sv = (tr?.ai_sentiment ?? "").toLowerCase()
        if (sv !== sentiment) return false
      }
      // Flag
      if (flag !== "all") {
        const fv = (tr?.ai_flag_severity ?? "none").toLowerCase()
        if (fv !== flag) return false
      }
      return true
    })
  }, [calls, search, callType, hasRecording, sentiment, flag])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageClamped = Math.min(page, totalPages)
  const pageStart = (pageClamped - 1) * PAGE_SIZE
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE)

  const presetOptions: { key: DatePreset; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "7d", label: "7 Days" },
    { key: "30d", label: "30 Days" },
    { key: "90d", label: "90 Days" },
  ]

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calls</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? "Loading…" : `${filtered.length} ${filtered.length === 1 ? "call" : "calls"} in ${presetLabel(preset)}`}
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date presets */}
          <div className="inline-flex rounded-md border border-border/80 overflow-hidden">
            {presetOptions.map((p) => (
              <button
                key={p.key}
                onClick={() => setPreset(p.key)}
                className={`px-3 h-8 text-xs font-medium transition-colors cursor-pointer ${
                  preset === p.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search client name or number…"
              className="w-full h-9 pl-8 pr-3 rounded-md border border-border/80 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Call type */}
          <div className="flex items-center gap-1.5">
            <Filter className="size-3.5 text-muted-foreground" />
            <select
              value={callType}
              onChange={(e) => setCallType(e.target.value as CallTypeFilter)}
              className="h-9 px-2 rounded-md border border-border/80 bg-background text-sm"
            >
              <option value="all">All types</option>
              <option value="incoming">Incoming</option>
              <option value="outgoing">Outgoing</option>
              <option value="missed">Missed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Sentiment */}
          <select
            value={sentiment}
            onChange={(e) => setSentiment(e.target.value as SentimentFilter)}
            className="h-9 px-2 rounded-md border border-border/80 bg-background text-sm"
          >
            <option value="all">All sentiment</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative</option>
            <option value="escalated">Escalated</option>
          </select>

          {/* Flag */}
          <select
            value={flag}
            onChange={(e) => setFlag(e.target.value as FlagFilter)}
            className="h-9 px-2 rounded-md border border-border/80 bg-background text-sm"
          >
            <option value="all">All flags</option>
            <option value="none">None</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>

          {/* Has recording */}
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={hasRecording}
              onChange={(e) => setHasRecording(e.target.checked)}
              className="accent-primary"
            />
            <span>Has recording</span>
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight flex items-center justify-between">
          <span>Calls</span>
          {!loading && filtered.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground">
              Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
          )}
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 rounded bg-muted animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <AlertTriangle className="size-10 mx-auto text-red-500 mb-3" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <Phone className="size-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-base font-medium text-foreground">No calls found</p>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or date range.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Direction</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Rec</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Sentiment</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Flag</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">QA</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide" />
                </tr>
              </thead>
              <tbody>
                {pageRows.map((c) => {
                  const tr = getFirstTranscription(c)
                  const hasRec = !!(c.recording_url || c.recording_storage_path)
                  const reviewCount = Array.isArray(c.call_qa_reviews) ? c.call_qa_reviews.length : 0
                  return (
                    <tr
                      key={c.id}
                      className="border-b last:border-0 hover:bg-muted/40 transition-colors cursor-pointer"
                      onClick={() => {
                        window.location.href = `/workspace/qa/calls/${c.id}`
                      }}
                    >
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(c.call_started_at, c.call_date, c.call_time)}
                      </td>
                      <td className="px-4 py-3">
                        <DirectionCell callType={c.call_type} />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-foreground whitespace-nowrap">
                        {c.emp_name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const matched = c.client_number ? contactMap.get(normalizePhone(c.client_number)) : null
                          if (matched) {
                            return (
                              <div className="leading-tight">
                                <Link
                                  href={matched.link}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-sm font-medium text-foreground hover:text-primary hover:underline inline-flex items-center gap-1.5"
                                >
                                  {matched.name}
                                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${matched.badgeClass}`}>
                                    {matched.type}
                                  </span>
                                </Link>
                                <div className="text-xs text-muted-foreground font-mono">{c.client_number ?? ""}</div>
                              </div>
                            )
                          }
                          return (
                            <>
                              <div className="text-sm text-foreground leading-tight">{c.client_name ?? "Unknown"}</div>
                              <div className="text-xs text-muted-foreground font-mono">{c.client_number ?? ""}</div>
                            </>
                          )
                        })()}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                        {formatDuration(c.duration_seconds)}
                      </td>
                      <td className="px-4 py-3">
                        <Mic className={`size-4 ${hasRec ? "text-emerald-600" : "text-muted-foreground/40"}`} />
                      </td>
                      <td className="px-4 py-3">
                        <SentimentBadge sentiment={tr?.ai_sentiment ?? null} />
                      </td>
                      <td className="px-4 py-3">
                        <FlagBadge severity={tr?.ai_flag_severity ?? null} />
                      </td>
                      <td className="px-4 py-3">
                        <QaStatusBadge reviewed={reviewCount > 0} />
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/workspace/qa/calls/${c.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filtered.length > PAGE_SIZE && (
          <div className="px-5 py-3 border-t flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Page {pageClamped} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pageClamped <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pageClamped >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
