"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowRight,
  Calendar,
  FileText,
  MessageSquare,
  NotebookPen,
  Star,
  UserCircle,
  XCircle,
} from "lucide-react"

import { BackLink } from "@/components/shared/back-link"
import { HeroCard } from "@/components/shared/hero-card"
import {
  DetailCard,
  InfoRow,
} from "@/components/shared/detail-views"
import { FilterBar } from "@/components/shared/filter-bar"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { supabaseHq } from "@/lib/supabase"
import { formatDate, formatInitials, relativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"

/** Candidate detail — ATS spec §2.11 (7-tab profile). */

type Stage =
  | "applied"
  | "screened"
  | "assessment"
  | "interview_1"
  | "interview_2"
  | "offer"
  | "hired"
  | "rejected"

const STAGES: Stage[] = [
  "applied",
  "screened",
  "assessment",
  "interview_1",
  "interview_2",
  "offer",
  "hired",
  "rejected",
]

const STAGE_LABEL: Record<Stage, string> = {
  applied: "Applied",
  screened: "Screened",
  assessment: "Assessment",
  interview_1: "Interview 1",
  interview_2: "Interview 2",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
}

interface Candidate {
  id: string
  role_id: string | null
  name: string
  email: string | null
  phone: string | null
  stage: Stage
  source: string | null
  skill_match: number | null
  rating: number | null
  resume_url: string | null
  last_activity_at: string | null
  next_action: string | null
  internal_notes: string | null
}

interface Role {
  id: string
  title: string
  department: string | null
}

interface StageLog {
  candidate_id: string
  from_stage: string | null
  to_stage: string
  changed_at: string
  changed_by: string | null
  note: string | null
}

interface Interview {
  id: string
  candidate_id: string
  role_id: string | null
  interviewer: string | null
  scheduled_at: string | null
  format: string | null
  status: string | null
  feedback_score: number | null
}

interface InterviewFeedback {
  interview_id: string
  interviewer: string | null
  scores: Record<string, unknown> | null
  notes: string | null
  recommendation: string | null
}

type Tab =
  | "profile"
  | "stage_history"
  | "interview_notes"
  | "assessment"
  | "communication"
  | "documents"
  | "internal_notes"

function StarRating({ rating }: { rating: number | null }) {
  const r = rating ?? 0
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "size-4",
            i <= r ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30",
          )}
        />
      ))}
    </span>
  )
}

function AvatarBlock({ name }: { name: string }) {
  return (
    <div className="h-11 w-11 rounded-md border flex items-center justify-center bg-slate-50 text-slate-700 border-slate-200">
      <span className="text-sm font-semibold">{formatInitials(name)}</span>
    </div>
  )
}

export default function HqCandidateDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id as string

  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [stageLog, setStageLog] = useState<StageLog[]>([])
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [feedback, setFeedback] = useState<InterviewFeedback[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>("profile")
  const [notesDraft, setNotesDraft] = useState("")
  const [savingNotes, setSavingNotes] = useState(false)

  const loadAll = useCallback(async () => {
    if (!id) return
    setLoading(true)

    const candRes = await supabaseHq
      .from("candidates")
      .select(
        "id, role_id, name, email, phone, stage, source, skill_match, rating, resume_url, last_activity_at, next_action, internal_notes",
      )
      .eq("id", id)
      .maybeSingle()

    if (candRes.error) {
      toast.error(`Failed to load candidate: ${candRes.error.message}`)
      setLoading(false)
      return
    }
    const cand = (candRes.data ?? null) as Candidate | null
    setCandidate(cand)
    setNotesDraft(cand?.internal_notes ?? "")

    const [roleRes, stageRes, interviewRes] = await Promise.all([
      cand?.role_id
        ? supabaseHq
            .from("job_roles")
            .select("id, title, department")
            .eq("id", cand.role_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabaseHq
        .from("candidate_stages")
        .select("candidate_id, from_stage, to_stage, changed_at, changed_by, note")
        .eq("candidate_id", id),
      supabaseHq
        .from("interviews")
        .select(
          "id, candidate_id, role_id, interviewer, scheduled_at, format, status, feedback_score",
        )
        .eq("candidate_id", id),
    ])

    setRole((roleRes.data ?? null) as Role | null)
    const logs = ((stageRes.data ?? []) as StageLog[]).slice().sort(
      (a, b) =>
        new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime(),
    )
    setStageLog(logs)

    const ivs = ((interviewRes.data ?? []) as Interview[]).slice().sort(
      (a, b) => {
        const aa = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0
        const bb = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0
        return bb - aa
      },
    )
    setInterviews(ivs)

    if (ivs.length > 0) {
      const fbRes = await supabaseHq
        .from("interview_feedback")
        .select("interview_id, interviewer, scores, notes, recommendation")
        .in(
          "interview_id",
          ivs.map((i) => i.id),
        )
      setFeedback((fbRes.data ?? []) as InterviewFeedback[])
    } else {
      setFeedback([])
    }

    setLoading(false)
  }, [id])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const feedbackByInterview = useMemo(() => {
    const m = new Map<string, InterviewFeedback[]>()
    for (const f of feedback) {
      const arr = m.get(f.interview_id) ?? []
      arr.push(f)
      m.set(f.interview_id, arr)
    }
    return m
  }, [feedback])

  async function moveStage(next: Stage) {
    if (!candidate || next === candidate.stage) return
    const original = candidate
    const now = new Date().toISOString()
    setCandidate({ ...candidate, stage: next, last_activity_at: now })

    const upd = await supabaseHq
      .from("candidates")
      .update({ stage: next, last_activity_at: now })
      .eq("id", candidate.id)

    if (upd.error) {
      setCandidate(original)
      toast.error(`Could not move stage: ${upd.error.message}`)
      return
    }

    const log: StageLog = {
      candidate_id: candidate.id,
      from_stage: original.stage,
      to_stage: next,
      changed_at: now,
      changed_by: "admin@suprans",
      note: null,
    }
    const logRes = await supabaseHq.from("candidate_stages").insert(log)
    if (logRes.error) {
      toast.warning(`Stage moved but log failed: ${logRes.error.message}`)
    } else {
      setStageLog((prev) => [log, ...prev])
      toast.success(`Moved to ${STAGE_LABEL[next]}`)
    }
  }

  async function saveNotes() {
    if (!candidate) return
    if (notesDraft === (candidate.internal_notes ?? "")) return
    setSavingNotes(true)
    const { error } = await supabaseHq
      .from("candidates")
      .update({ internal_notes: notesDraft })
      .eq("id", candidate.id)
    setSavingNotes(false)
    if (error) {
      toast.error(`Could not save notes: ${error.message}`)
      return
    }
    setCandidate({ ...candidate, internal_notes: notesDraft })
    toast.success("Notes saved")
  }

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <BackLink href="/hq/people/ats/candidates" label="All candidates" />
        <div className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">
          Loading candidate…
        </div>
      </div>
    )
  }

  if (!candidate) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <BackLink href="/hq/people/ats/candidates" label="All candidates" />
        <EmptyState
          icon={UserCircle}
          title="Candidate not found"
          description={`No candidate with id ${id}.`}
        />
      </div>
    )
  }

  const subtitle = [role?.title, candidate.source ? `via ${candidate.source}` : null]
    .filter(Boolean)
    .join(" · ")

  const TABS: { id: Tab; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "stage_history", label: "Stage history" },
    { id: "interview_notes", label: "Interview notes" },
    { id: "assessment", label: "Assessment" },
    { id: "communication", label: "Communication" },
    { id: "documents", label: "Documents" },
    { id: "internal_notes", label: "Internal notes" },
  ]

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <BackLink href="/hq/people/ats/candidates" label="All candidates" />

      <HeroCard
        title={candidate.name}
        subtitle={subtitle || undefined}
        avatar={<AvatarBlock name={candidate.name} />}
        meta={
          <>
            <StatusBadge tone={toneForStatus(candidate.stage)}>
              {STAGE_LABEL[candidate.stage]}
            </StatusBadge>
            <StarRating rating={candidate.rating} />
            {candidate.skill_match !== null && (
              <span className="text-xs text-muted-foreground">
                Skill match{" "}
                <span className="font-semibold text-foreground tabular-nums">
                  {candidate.skill_match}%
                </span>
              </span>
            )}
          </>
        }
        actions={
          <>
            <div className="relative">
              <select
                aria-label="Move stage"
                value={candidate.stage}
                onChange={(e) => moveStage(e.target.value as Stage)}
                className="h-8 pl-2.5 pr-8 text-sm rounded-md border border-input bg-transparent appearance-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    Move to {STAGE_LABEL[s]}
                  </option>
                ))}
              </select>
              <ArrowRight className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            </div>
            <Button variant="outline" size="sm" disabled>
              <Calendar className="size-3.5" />
              Schedule interview
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => moveStage("rejected")}
              disabled={candidate.stage === "rejected"}
            >
              <XCircle className="size-3.5" />
              Reject
            </Button>
          </>
        }
      />

      <FilterBar
        tabs={TABS.map((t) => ({ id: t.id, label: t.label }))}
        activeTab={tab}
        onTabChange={(id) => setTab(id as Tab)}
      />

      {tab === "profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <DetailCard title="Contact">
              <InfoRow label="Email" value={candidate.email ?? "—"} />
              <InfoRow label="Phone" value={candidate.phone ?? "—"} />
              <InfoRow label="Source" value={candidate.source ?? "—"} />
              <InfoRow
                label="Resume"
                value={
                  candidate.resume_url ? (
                    <a
                      href={candidate.resume_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Open resume
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
            </DetailCard>
          </div>
          <div className="space-y-5">
            <DetailCard title="Hiring">
              <InfoRow label="Role" value={role?.title ?? "—"} />
              <InfoRow label="Department" value={role?.department ?? "—"} />
              <InfoRow
                label="Stage"
                value={
                  <StatusBadge tone={toneForStatus(candidate.stage)}>
                    {STAGE_LABEL[candidate.stage]}
                  </StatusBadge>
                }
              />
              <InfoRow
                label="Skill match"
                value={
                  candidate.skill_match !== null
                    ? `${candidate.skill_match}%`
                    : "—"
                }
              />
              <InfoRow
                label="Rating"
                value={<StarRating rating={candidate.rating} />}
              />
              <InfoRow
                label="Last activity"
                value={relativeTime(candidate.last_activity_at)}
              />
              <InfoRow
                label="Next action"
                value={candidate.next_action ?? "—"}
              />
            </DetailCard>
          </div>
        </div>
      )}

      {tab === "stage_history" && (
        <DetailCard title="Stage history">
          {stageLog.length === 0 ? (
            <EmptyState
              icon={ArrowRight}
              title="No stage changes logged"
              description="Stage movements will appear here once you move this candidate."
            />
          ) : (
            <ol className="space-y-3">
              {stageLog.map((s, i) => (
                <li
                  key={`${s.candidate_id}-${s.changed_at}-${i}`}
                  className="flex items-start gap-3"
                >
                  <span className="mt-1 size-2 rounded-full bg-primary/70 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center flex-wrap gap-2 text-sm">
                      {s.from_stage && (
                        <StatusBadge tone={toneForStatus(s.from_stage)}>
                          {STAGE_LABEL[s.from_stage as Stage] ?? s.from_stage}
                        </StatusBadge>
                      )}
                      <ArrowRight className="size-3.5 text-muted-foreground" />
                      <StatusBadge tone={toneForStatus(s.to_stage)}>
                        {STAGE_LABEL[s.to_stage as Stage] ?? s.to_stage}
                      </StatusBadge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(s.changed_at)} ·{" "}
                        {relativeTime(s.changed_at)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      by {s.changed_by ?? "system"}
                      {s.note ? ` — ${s.note}` : ""}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </DetailCard>
      )}

      {tab === "interview_notes" && (
        <DetailCard title="Interviews & feedback">
          {interviews.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No interviews scheduled"
              description="Schedule an interview from the hero actions to log feedback here."
            />
          ) : (
            <div className="space-y-4">
              {interviews.map((iv) => {
                const fbs = feedbackByInterview.get(iv.id) ?? []
                return (
                  <div
                    key={iv.id}
                    className="rounded-md border border-border/80 bg-muted/10 p-4"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <StatusBadge tone={toneForStatus(iv.status ?? "")}>
                          {iv.status ?? "scheduled"}
                        </StatusBadge>
                        <span className="text-sm font-medium">
                          {iv.interviewer ?? "Interviewer TBD"}
                        </span>
                        {iv.format && (
                          <span className="text-xs text-muted-foreground">
                            ({iv.format})
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(iv.scheduled_at)} ·{" "}
                        {relativeTime(iv.scheduled_at)}
                      </div>
                    </div>
                    {iv.feedback_score !== null && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Overall score:{" "}
                        <span className="font-semibold text-foreground tabular-nums">
                          {iv.feedback_score}
                        </span>
                      </div>
                    )}
                    {fbs.length > 0 && (
                      <div className="mt-3 space-y-3">
                        {fbs.map((f, i) => (
                          <div
                            key={`${iv.id}-fb-${i}`}
                            className="rounded border border-border/60 bg-card p-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium">
                                {f.interviewer ?? "Anonymous"}
                              </span>
                              {f.recommendation && (
                                <StatusBadge
                                  tone={toneForStatus(f.recommendation)}
                                >
                                  {f.recommendation}
                                </StatusBadge>
                              )}
                            </div>
                            {f.scores && (
                              <pre className="mt-2 text-xs whitespace-pre-wrap break-words text-muted-foreground font-mono">
                                {JSON.stringify(f.scores, null, 2)}
                              </pre>
                            )}
                            {f.notes && (
                              <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">
                                {f.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </DetailCard>
      )}

      {tab === "assessment" && (
        <DetailCard title="Assessment">
          <EmptyState
            icon={FileText}
            title="No assessment on file"
            description="Assessment results will appear here once the assessment table is wired."
          />
        </DetailCard>
      )}

      {tab === "communication" && (
        <DetailCard title="Communication">
          <EmptyState
            icon={MessageSquare}
            title="No messages yet"
            description="Email and chat history will surface here once the communication log is wired."
          />
        </DetailCard>
      )}

      {tab === "documents" && (
        <DetailCard title="Documents">
          <EmptyState
            icon={FileText}
            title="No documents uploaded"
            description="Resume, offer letter and other docs will appear here. The documents table is not yet wired."
          />
        </DetailCard>
      )}

      {tab === "internal_notes" && (
        <DetailCard title="Internal notes">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <NotebookPen className="size-3.5" />
              Visible to hiring team only. Saves on blur.
            </div>
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              onBlur={saveNotes}
              rows={10}
              placeholder="Add internal notes about this candidate…"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
            />
            <div className="text-xs text-muted-foreground text-right h-4">
              {savingNotes ? "Saving…" : ""}
            </div>
          </div>
        </DetailCard>
      )}
    </div>
  )
}
