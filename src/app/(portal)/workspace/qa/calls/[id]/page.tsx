"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  PhoneOff,
  Mic,
  FileText,
  Flag,
  Star,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { AudioPlayer } from "@/components/shared/audio-player"
import { supabase } from "@/lib/supabase"
import { matchContactByPhone, type MatchedContact } from "@/lib/contact-matcher"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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
}

interface Transcription {
  call_id: string
  transcript_text: string | null
  transcript_status: string | null
  ai_summary: string | null
  ai_key_points: string[] | null
  ai_sentiment: string | null
  ai_topics: string[] | null
  ai_flag_severity: string | null
  ai_flag_reasons: string[] | null
  ai_quality_score: number | null
  ai_action_items: string[] | null
}

interface CallFlag {
  id?: string
  call_id: string
  flagged_by_user_id: string | null
  flag_type: string
  severity: string
  description: string | null
  status: string | null
  created_at: string
}

interface QaReview {
  id?: string
  call_id: string
  reviewer_user_id: string | null
  overall_score: number | null
  greeting_score: number | null
  active_listening_score: number | null
  product_knowledge_score: number | null
  problem_resolution_score: number | null
  closing_score: number | null
  tone_professionalism_score: number | null
  passed: boolean | null
  feedback: string | null
  coaching_notes: string | null
  follow_up_required: boolean | null
  created_at: string
}

interface UserRow {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds < 0) return "—"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}m ${s}s`
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function directionMeta(callType: string | null) {
  const type = (callType ?? "").toLowerCase()
  if (type.includes("incom") || type === "in") {
    return { Icon: PhoneIncoming, color: "text-blue-600", bg: "bg-blue-50", label: "Incoming" }
  }
  if (type.includes("outgo") || type === "out") {
    return { Icon: PhoneOutgoing, color: "text-emerald-600", bg: "bg-emerald-50", label: "Outgoing" }
  }
  if (type.includes("miss")) {
    return { Icon: PhoneMissed, color: "text-red-600", bg: "bg-red-50", label: "Missed" }
  }
  if (type.includes("reject")) {
    return { Icon: PhoneOff, color: "text-amber-600", bg: "bg-amber-50", label: "Rejected" }
  }
  return { Icon: Phone, color: "text-slate-500", bg: "bg-slate-50", label: callType || "Call" }
}

function sentimentBadgeClasses(s: string | null): string {
  const v = (s ?? "").toLowerCase()
  const map: Record<string, string> = {
    positive: "bg-emerald-50 text-emerald-700 border-emerald-200",
    neutral: "bg-slate-100 text-slate-600 border-slate-200",
    negative: "bg-amber-50 text-amber-700 border-amber-200",
    escalated: "bg-red-50 text-red-700 border-red-200",
  }
  return map[v] ?? "bg-slate-100 text-slate-600 border-slate-200"
}

function flagSeverityClasses(s: string | null): string {
  const v = (s ?? "none").toLowerCase()
  const map: Record<string, string> = {
    none: "bg-slate-100 text-slate-600",
    low: "bg-blue-50 text-blue-700",
    medium: "bg-amber-50 text-amber-700",
    high: "bg-orange-50 text-orange-700",
    critical: "bg-red-50 text-red-700",
  }
  return map[v] ?? "bg-slate-100 text-slate-600"
}

/* ------------------------------------------------------------------ */
/*  InfoRow                                                            */
/* ------------------------------------------------------------------ */

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b last:border-0">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-sm text-foreground text-right break-all">{value ?? "—"}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CallDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [call, setCall] = useState<CallRow | null>(null)
  const [transcription, setTranscription] = useState<Transcription | null>(null)
  const [flags, setFlags] = useState<CallFlag[]>([])
  const [reviews, setReviews] = useState<QaReview[]>([])
  const [users, setUsers] = useState<Record<string, UserRow>>({})
  const [matchedContact, setMatchedContact] = useState<MatchedContact | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Recording
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null)
  const [recordingLoading, setRecordingLoading] = useState(false)

  // Prev/next
  const [prevId, setPrevId] = useState<string | null>(null)
  const [nextId, setNextId] = useState<string | null>(null)

  // Transcribe state
  const [transcribing, setTranscribing] = useState(false)
  const pollRef = useRef<number | null>(null)

  // Modals
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [flagModalOpen, setFlagModalOpen] = useState(false)

  /* ----- Load call + related data ----- */
  const loadAll = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [callRes, trRes, flagsRes, reviewsRes] = await Promise.all([
        supabase.from("calls").select("*").eq("id", id).maybeSingle(),
        supabase.from("call_transcriptions").select("*").eq("call_id", id).maybeSingle(),
        supabase.from("call_flags").select("*").eq("call_id", id).order("created_at", { ascending: false }),
        supabase.from("call_qa_reviews").select("*").eq("call_id", id).order("created_at", { ascending: false }),
      ])

      if (callRes.error) throw callRes.error
      if (!callRes.data) {
        setError("Call not found")
        setCall(null)
        return
      }
      setCall(callRes.data as CallRow)
      setTranscription((trRes.data ?? null) as Transcription | null)
      setFlags((flagsRes.data ?? []) as CallFlag[])
      setReviews((reviewsRes.data ?? []) as QaReview[])

      // Auto-match client number to existing contact
      const callData = callRes.data as CallRow
      if (callData.client_number) {
        const matched = await matchContactByPhone(callData.client_number)
        setMatchedContact(matched)
      } else {
        setMatchedContact(null)
      }

      // Load user names
      const userIds = new Set<string>()
      for (const f of (flagsRes.data ?? []) as CallFlag[]) {
        if (f.flagged_by_user_id) userIds.add(f.flagged_by_user_id)
      }
      for (const r of (reviewsRes.data ?? []) as QaReview[]) {
        if (r.reviewer_user_id) userIds.add(r.reviewer_user_id)
      }
      if (userIds.size > 0) {
        const { data: userData } = await supabase
          .from("users")
          .select("id, full_name, email, avatar_url")
          .in("id", Array.from(userIds))
        if (userData) {
          const map: Record<string, UserRow> = {}
          for (const u of userData as UserRow[]) map[u.id] = u
          setUsers(map)
        }
      }

      // Prev/next navigation — use call_started_at
      const call_started_at = (callRes.data as CallRow).call_started_at
      if (call_started_at) {
        const [prevRes, nextRes] = await Promise.all([
          supabase
            .from("calls")
            .select("id")
            .lt("call_started_at", call_started_at)
            .order("call_started_at", { ascending: false })
            .limit(1),
          supabase
            .from("calls")
            .select("id")
            .gt("call_started_at", call_started_at)
            .order("call_started_at", { ascending: true })
            .limit(1),
        ])
        setPrevId(prevRes.data?.[0]?.id ?? null)
        setNextId(nextRes.data?.[0]?.id ?? null)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load call")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  /* ----- Load recording URL ----- */
  useEffect(() => {
    if (!id || !call) return
    if (!call.recording_url && !call.recording_storage_path) {
      setRecordingUrl(null)
      return
    }
    let cancelled = false
    setRecordingLoading(true)
    fetch(`/api/qa/calls/${id}/recording`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled) return
        setRecordingUrl(j?.url ?? null)
      })
      .catch(() => {
        if (!cancelled) setRecordingUrl(null)
      })
      .finally(() => {
        if (!cancelled) setRecordingLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, call])

  /* ----- Transcribe with polling ----- */
  const refetchTranscription = useCallback(async () => {
    const { data } = await supabase
      .from("call_transcriptions")
      .select("*")
      .eq("call_id", id)
      .maybeSingle()
    setTranscription((data ?? null) as Transcription | null)
    return (data ?? null) as Transcription | null
  }, [id])

  const handleTranscribe = useCallback(async () => {
    if (!id || transcribing) return
    setTranscribing(true)
    try {
      await fetch(`/api/qa/calls/${id}/transcribe`, { method: "POST" })
      // Poll every 3s until done/failed
      const poll = async () => {
        const tr = await refetchTranscription()
        const status = (tr?.transcript_status ?? "").toLowerCase()
        if (status === "completed" || status === "done" || status === "failed" || status === "error") {
          if (pollRef.current) {
            window.clearInterval(pollRef.current)
            pollRef.current = null
          }
          setTranscribing(false)
        }
      }
      await poll()
      pollRef.current = window.setInterval(poll, 3000)
    } catch {
      setTranscribing(false)
    }
  }, [id, transcribing, refetchTranscription])

  useEffect(() => {
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current)
    }
  }, [])

  /* ----- Derived ----- */
  const dirMeta = useMemo(() => directionMeta(call?.call_type ?? null), [call?.call_type])
  const hasRecording = !!(call?.recording_url || call?.recording_storage_path)

  /* ----- Render ----- */
  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <div className="h-6 w-40 bg-muted rounded animate-pulse" />
        <div className="h-16 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="h-32 bg-muted rounded animate-pulse" />
            <div className="h-64 bg-muted rounded animate-pulse" />
            <div className="h-96 bg-muted rounded animate-pulse" />
          </div>
          <div className="space-y-5">
            <div className="h-64 bg-muted rounded animate-pulse" />
            <div className="h-48 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !call) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <Link href="/workspace/qa/calls" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to calls
        </Link>
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-12 text-center">
          <AlertTriangle className="size-10 mx-auto text-red-500 mb-3" />
          <p className="text-base font-medium">{error ?? "Call not found"}</p>
        </div>
      </div>
    )
  }

  const DirIcon = dirMeta.Icon

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Back link */}
      <Link href="/workspace/qa/calls" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to calls
      </Link>

      {/* Header card */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="p-5 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${dirMeta.bg}`}>
              <DirIcon className={`size-6 ${dirMeta.color}`} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{dirMeta.label}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                <span className="font-medium text-foreground">{call.emp_name ?? "Unknown employee"}</span>
                {" • "}
                {matchedContact ? (
                  <Link href={matchedContact.link} className="font-medium text-primary hover:underline inline-flex items-center gap-1.5">
                    {matchedContact.name}
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${matchedContact.badgeClass}`}>
                      {matchedContact.type}
                    </span>
                  </Link>
                ) : (
                  <span>{call.client_name ?? "Unknown"}</span>
                )}
                {call.client_number && <span className="font-mono"> ({call.client_number})</span>}
                {" • "}
                <span>{formatDateTime(call.call_started_at)}</span>
                {" • "}
                <span>{formatDuration(call.duration_seconds)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {!transcription && hasRecording && (
              <Button onClick={handleTranscribe} disabled={transcribing} variant="outline" size="sm">
                {transcribing ? (
                  <>
                    <span className="inline-block size-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Transcribing…
                  </>
                ) : (
                  <>
                    <FileText className="size-4" />
                    Transcribe
                  </>
                )}
              </Button>
            )}
            <Button onClick={() => setFlagModalOpen(true)} variant="outline" size="sm">
              <Flag className="size-4" />
              Flag
            </Button>
            <Button onClick={() => setReviewModalOpen(true)} size="sm">
              <Star className="size-4" />
              Review
            </Button>

            <div className="inline-flex rounded-md border border-border/80 overflow-hidden ml-2">
              <button
                disabled={!prevId}
                onClick={() => prevId && router.push(`/workspace/qa/calls/${prevId}`)}
                className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Previous call"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                disabled={!nextId}
                onClick={() => nextId && router.push(`/workspace/qa/calls/${nextId}`)}
                className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer border-l"
                title="Next call"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-5">
          {/* Recording */}
          <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight flex items-center gap-2">
              <Mic className="size-4 text-muted-foreground" />
              Recording
            </div>
            <div className="p-5">
              {!hasRecording ? (
                <p className="text-sm text-muted-foreground text-center py-4">No recording available</p>
              ) : recordingLoading ? (
                <div className="h-16 bg-muted rounded animate-pulse" />
              ) : recordingUrl ? (
                <AudioPlayer src={recordingUrl} filename={`call-${call.id}.mp3`} />
              ) : (
                <p className="text-sm text-red-600 text-center py-4">Failed to load recording</p>
              )}
            </div>
          </div>

          {/* AI Summary */}
          <AiSummaryCard transcription={transcription} transcribing={transcribing} />

          {/* Transcript */}
          <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground" />
              Transcript
            </div>
            <div className="p-5">
              {transcription?.transcript_text ? (
                <div className="max-h-96 overflow-y-auto rounded-md bg-muted/30 p-4">
                  <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed text-foreground">
                    {transcription.transcript_text}
                  </pre>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">No transcript available</p>
              )}
            </div>
          </div>

          {/* Notes */}
          {call.note && (
            <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
                Notes (from Callyzer)
              </div>
              <div className="p-5">
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{call.note}</p>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-5">
          {/* Call Info */}
          <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">Call Info</div>
            <div className="px-5 py-2">
              <InfoRow label="Direction" value={dirMeta.label} />
              <InfoRow label="Duration" value={formatDuration(call.duration_seconds)} />
              <InfoRow label="Date" value={call.call_date ?? (call.call_started_at ? new Date(call.call_started_at).toLocaleDateString() : "—")} />
              <InfoRow label="Time" value={call.call_time ?? (call.call_started_at ? new Date(call.call_started_at).toLocaleTimeString() : "—")} />
              <InfoRow label="Employee" value={call.emp_name} />
              <InfoRow
                label="Contact"
                value={
                  matchedContact ? (
                    <Link href={matchedContact.link} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                      {matchedContact.name}
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${matchedContact.badgeClass}`}>
                        {matchedContact.type}
                      </span>
                    </Link>
                  ) : (
                    <span className="text-muted-foreground italic">Not in contacts</span>
                  )
                }
              />
              <InfoRow label="Client Number" value={call.client_number ? <span className="font-mono">{call.client_number}</span> : "—"} />
              <InfoRow label="CRM Status" value={call.crm_status} />
              <InfoRow label="Lead ID" value={call.callyzer_lead_id} />
            </div>
          </div>

          {/* Flags */}
          <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight flex items-center gap-2">
              <Flag className="size-4 text-muted-foreground" />
              Flags
              {flags.length > 0 && (
                <span className="ml-auto text-xs font-medium text-muted-foreground">{flags.length}</span>
              )}
            </div>
            <div className="p-5">
              {flags.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No flags</p>
              ) : (
                <ul className="space-y-4">
                  {flags.map((f, idx) => (
                    <li key={f.id ?? idx} className="pb-4 border-b last:border-0 last:pb-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${flagSeverityClasses(f.severity)}`}>
                          {f.severity}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {f.flag_type}
                        </span>
                        {f.status && (
                          <span className="ml-auto text-xs text-muted-foreground">{f.status}</span>
                        )}
                      </div>
                      {f.description && (
                        <p className="text-sm text-foreground leading-relaxed mb-1.5">{f.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {f.flagged_by_user_id && users[f.flagged_by_user_id]?.full_name
                          ? users[f.flagged_by_user_id].full_name
                          : "Unknown"}
                        {" • "}
                        {formatDateTime(f.created_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* QA Reviews */}
          <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight flex items-center gap-2">
              <Star className="size-4 text-muted-foreground" />
              QA Reviews
              {reviews.length > 0 && (
                <span className="ml-auto text-xs font-medium text-muted-foreground">{reviews.length}</span>
              )}
            </div>
            <div className="p-5">
              {reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No reviews yet</p>
              ) : (
                <ul className="space-y-4">
                  {reviews.map((r, idx) => (
                    <li key={r.id ?? idx} className="pb-4 border-b last:border-0 last:pb-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="text-3xl font-bold text-foreground leading-none">
                          {r.overall_score ?? "—"}
                        </div>
                        <div className="flex flex-col gap-1">
                          {r.passed !== null && (
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit ${
                                r.passed
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-red-50 text-red-700"
                              }`}
                            >
                              {r.passed ? "Passed" : "Failed"}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {r.reviewer_user_id && users[r.reviewer_user_id]?.full_name
                              ? users[r.reviewer_user_id].full_name
                              : "Reviewer"}
                          </span>
                        </div>
                      </div>
                      {r.feedback && (
                        <p className="text-sm text-foreground leading-relaxed line-clamp-3">{r.feedback}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1.5">{formatDateTime(r.created_at)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {reviewModalOpen && (
        <QaReviewModal
          callId={id}
          onClose={() => setReviewModalOpen(false)}
          onSubmitted={() => {
            setReviewModalOpen(false)
            void loadAll()
          }}
        />
      )}
      {flagModalOpen && (
        <FlagModal
          callId={id}
          onClose={() => setFlagModalOpen(false)}
          onSubmitted={() => {
            setFlagModalOpen(false)
            void loadAll()
          }}
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  AI Summary card                                                    */
/* ------------------------------------------------------------------ */

function AiSummaryCard({
  transcription,
  transcribing,
}: {
  transcription: Transcription | null
  transcribing: boolean
}) {
  const hasSummary =
    transcription &&
    (transcription.ai_summary ||
      (transcription.ai_key_points && transcription.ai_key_points.length > 0) ||
      transcription.ai_sentiment ||
      (transcription.ai_topics && transcription.ai_topics.length > 0) ||
      transcription.ai_quality_score !== null ||
      (transcription.ai_action_items && transcription.ai_action_items.length > 0))

  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight flex items-center gap-2">
        <FileText className="size-4 text-muted-foreground" />
        AI Summary
        {transcribing && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block size-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Analyzing…
          </span>
        )}
      </div>
      <div className="p-5">
        {!hasSummary ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {transcribing ? "Transcription in progress…" : "No AI summary available. Transcribe the call to generate one."}
          </p>
        ) : (
          <div className="space-y-5">
            {transcription?.ai_summary && (
              <div>
                <p className="text-sm leading-relaxed text-foreground">{transcription.ai_summary}</p>
              </div>
            )}

            {transcription?.ai_sentiment && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sentiment:</span>
                <span
                  className={`text-sm font-semibold px-3 py-1 rounded-full border ${sentimentBadgeClasses(
                    transcription.ai_sentiment
                  )}`}
                >
                  {transcription.ai_sentiment.charAt(0).toUpperCase() + transcription.ai_sentiment.slice(1)}
                </span>
              </div>
            )}

            {transcription?.ai_quality_score !== null && transcription?.ai_quality_score !== undefined && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Quality Score</span>
                  <span className="text-sm font-semibold text-foreground">
                    {transcription.ai_quality_score}/100
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{
                      width: `${Math.max(0, Math.min(100, transcription.ai_quality_score ?? 0))}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {transcription?.ai_key_points && transcription.ai_key_points.length > 0 && (
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Key Points</div>
                <ul className="space-y-1.5">
                  {transcription.ai_key_points.map((p, i) => (
                    <li key={i} className="text-sm text-foreground flex gap-2 leading-relaxed">
                      <span className="text-muted-foreground mt-0.5">•</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {transcription?.ai_topics && transcription.ai_topics.length > 0 && (
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Topics</div>
                <div className="flex flex-wrap gap-1.5">
                  {transcription.ai_topics.map((t, i) => (
                    <span
                      key={i}
                      className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {transcription?.ai_flag_severity && transcription.ai_flag_severity.toLowerCase() !== "none" && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <AlertTriangle className="size-4 text-red-600" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-red-700">
                    Flagged: {transcription.ai_flag_severity}
                  </span>
                </div>
                {transcription.ai_flag_reasons && transcription.ai_flag_reasons.length > 0 && (
                  <ul className="space-y-1 mt-2">
                    {transcription.ai_flag_reasons.map((r, i) => (
                      <li key={i} className="text-xs text-red-700 flex gap-1.5">
                        <span>•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {transcription?.ai_action_items && transcription.ai_action_items.length > 0 && (
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Action Items</div>
                <ul className="space-y-1.5">
                  {transcription.ai_action_items.map((a, i) => (
                    <li key={i} className="text-sm text-foreground flex items-start gap-2 leading-relaxed">
                      <input type="checkbox" className="mt-1 accent-primary" readOnly />
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  QA Review Modal                                                    */
/* ------------------------------------------------------------------ */

interface ScoreState {
  greeting_score: number
  active_listening_score: number
  product_knowledge_score: number
  problem_resolution_score: number
  closing_score: number
  tone_professionalism_score: number
}

function QaReviewModal({
  callId,
  onClose,
  onSubmitted,
}: {
  callId: string
  onClose: () => void
  onSubmitted: () => void
}) {
  const [scores, setScores] = useState<ScoreState>({
    greeting_score: 7,
    active_listening_score: 7,
    product_knowledge_score: 7,
    problem_resolution_score: 7,
    closing_score: 7,
    tone_professionalism_score: 7,
  })
  const [feedback, setFeedback] = useState("")
  const [coachingNotes, setCoachingNotes] = useState("")
  const [followUp, setFollowUp] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const avg = useMemo(() => {
    const values = Object.values(scores)
    const sum = values.reduce((a, b) => a + b, 0)
    return sum / values.length
  }, [scores])
  const overall = Math.round(avg * 10)
  const passed = overall >= 70

  const fields: { key: keyof ScoreState; label: string }[] = [
    { key: "greeting_score", label: "Greeting" },
    { key: "active_listening_score", label: "Active Listening" },
    { key: "product_knowledge_score", label: "Product Knowledge" },
    { key: "problem_resolution_score", label: "Problem Resolution" },
    { key: "closing_score", label: "Closing" },
    { key: "tone_professionalism_score", label: "Tone & Professionalism" },
  ]

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/qa/calls/${callId}/qa-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...scores,
          feedback,
          coaching_notes: coachingNotes,
          follow_up_required: followUp,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        throw new Error(j?.error ?? "Failed to submit review")
      }
      onSubmitted()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-lg border border-border/80 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight flex items-center justify-between">
          <span>QA Review</span>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Overall</span>
            <span className="text-2xl font-bold text-foreground">{overall}</span>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                passed ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
              }`}
            >
              {passed ? "Pass" : "Fail"}
            </span>
          </div>
        </div>
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map((f) => (
              <div key={f.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {f.label}
                  </label>
                  <span className="text-sm font-semibold text-foreground">{scores[f.key]}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  value={scores[f.key]}
                  onChange={(e) =>
                    setScores((prev) => ({ ...prev, [f.key]: parseInt(e.target.value, 10) }))
                  }
                  className="w-full accent-primary"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
              Feedback
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-border/80 bg-background text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="What went well, what could be improved…"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
              Coaching Notes
            </label>
            <textarea
              value={coachingNotes}
              onChange={(e) => setCoachingNotes(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-border/80 bg-background text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Specific coaching action items…"
            />
          </div>

          <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={followUp}
              onChange={(e) => setFollowUp(e.target.checked)}
              className="accent-primary"
            />
            <span>Follow-up required</span>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="px-5 py-3.5 border-t flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit Review"}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Flag Modal                                                         */
/* ------------------------------------------------------------------ */

function FlagModal({
  callId,
  onClose,
  onSubmitted,
}: {
  callId: string
  onClose: () => void
  onSubmitted: () => void
}) {
  const [flagType, setFlagType] = useState("compliance")
  const [severity, setSeverity] = useState("medium")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/qa/calls/${callId}/flag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flag_type: flagType, severity, description }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        throw new Error(j?.error ?? "Failed to submit flag")
      }
      onSubmitted()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-lg border border-border/80 shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight flex items-center gap-2">
          <Flag className="size-4 text-muted-foreground" />
          Flag Call
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
              Flag Type
            </label>
            <select
              value={flagType}
              onChange={(e) => setFlagType(e.target.value)}
              className="w-full h-9 px-2 rounded-md border border-border/80 bg-background text-sm"
            >
              <option value="compliance">Compliance</option>
              <option value="rudeness">Rudeness</option>
              <option value="escalation">Escalation</option>
              <option value="quality">Quality</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
              Severity
            </label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="w-full h-9 px-2 rounded-md border border-border/80 bg-background text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-border/80 bg-background text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Describe the issue…"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="px-5 py-3.5 border-t flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={submitting || !description.trim()}>
            {submitting ? "Submitting…" : "Submit Flag"}
          </Button>
        </div>
      </div>
    </div>
  )
}
