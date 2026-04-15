"use client"

import { useMemo, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  FileText,
  Link as LinkIcon,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Sparkles,
  Star,
  Upload,
  XCircle,
} from "lucide-react"

import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { FilterBar } from "@/components/shared/filter-bar"
import { EmptyState } from "@/components/shared/empty-state"
import { HeroCard } from "@/components/shared/hero-card"
import { StatusBadge, toneForStatus, type StatusTone } from "@/components/shared/status-badge"
import { EditDrawer } from "@/components/shared/edit-drawer"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { supabase, supabaseHq } from "@/lib/supabase"
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatInitials,
  relativeTime,
} from "@/lib/format"
import { cn } from "@/lib/utils"
import type {
  CandidateRow,
  CandidateCallRow,
  InterviewRow,
  JobRoleRow,
  OfferRow,
  OnboardingTaskRow,
  ResumeRow,
  StageLogRow,
} from "./page"

/* ------------------------------------------------------------------ */
/*  Constants + helpers                                                */
/* ------------------------------------------------------------------ */

const STAGES = [
  "applied",
  "screened",
  "assessment",
  "interview_1",
  "interview_2",
  "offer",
  "hired",
  "rejected",
] as const
type Stage = (typeof STAGES)[number]

const STAGE_LABEL: Record<string, string> = {
  applied: "Applied",
  screened: "Screened",
  assessment: "Assessment",
  interview_1: "Interview 1",
  interview_2: "Interview 2",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
}

const CALL_STATUS_OPTIONS = ["Connected", "Not Connected", "Voicemail"] as const
const CALL_RESPONSE_OPTIONS = [
  "Interested",
  "Interview Scheduled",
  "Not Interested",
  "Maybe",
] as const

function toneForCallStatus(v: string | null): StatusTone {
  if (!v) return "slate"
  const k = v.toLowerCase()
  if (k === "connected") return "emerald"
  if (k === "voicemail") return "amber"
  return "slate"
}

function toneForCallResponse(v: string | null): StatusTone {
  if (!v) return "slate"
  const k = v.toLowerCase()
  if (k === "interested") return "blue"
  if (k === "interview scheduled") return "violet"
  if (k === "not interested") return "red"
  if (k === "maybe") return "amber"
  return "slate"
}

// Deterministic 8-tone palette. Same hash is reused across
// HeroCard avatar, Activity timeline dots, Onboarding assignees.
const AVATAR_TONES = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-violet-100 text-violet-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
  "bg-indigo-100 text-indigo-700",
  "bg-teal-100 text-teal-700",
] as const

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function initialsAvatar(
  name: string,
  size: "sm" | "md" | "lg" = "md",
): ReactNode {
  const tone = AVATAR_TONES[hashString(name || "?") % AVATAR_TONES.length]
  const sizeClass =
    size === "sm"
      ? "h-7 w-7 text-[0.8125rem]"
      : size === "lg"
        ? "h-12 w-12 text-base"
        : "h-11 w-11 text-sm"
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md font-semibold shrink-0",
        sizeClass,
        tone,
      )}
      aria-hidden="true"
    >
      {formatInitials(name)}
    </span>
  )
}

function StarRating({ rating }: { rating: number | null }) {
  const r = rating ?? 0
  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`Rating ${r}/5`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "size-3.5",
            i <= r ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30",
          )}
        />
      ))}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export interface CandidateDetailTabsProps {
  candidate: CandidateRow
  role: JobRoleRow | null
  calls: CandidateCallRow[]
  interviews: InterviewRow[]
  offers: OfferRow[]
  stages: StageLogRow[]
  resume: ResumeRow | null
  onboarding: OnboardingTaskRow[]
  counts: { calls: number; interviews: number; assignments: number }
}

type TabId =
  | "overview"
  | "resume"
  | "calls"
  | "interviews"
  | "offer"
  | "onboarding"
  | "activity"

export function CandidateDetailTabs({
  candidate: initialCandidate,
  role,
  calls: initialCalls,
  interviews: initialInterviews,
  offers: initialOffers,
  stages: initialStages,
  resume: initialResume,
  onboarding: initialOnboarding,
  counts,
}: CandidateDetailTabsProps) {
  const router = useRouter()

  const [candidate, setCandidate] = useState<CandidateRow>(initialCandidate)
  const [calls, setCalls] = useState<CandidateCallRow[]>(initialCalls)
  const [interviews, setInterviews] =
    useState<InterviewRow[]>(initialInterviews)
  const [offers, setOffers] = useState<OfferRow[]>(initialOffers)
  const [stages, setStages] = useState<StageLogRow[]>(initialStages)
  const [resume, setResume] = useState<ResumeRow | null>(initialResume)
  const [onboarding, setOnboarding] =
    useState<OnboardingTaskRow[]>(initialOnboarding)

  const [tab, setTab] = useState<TabId>("overview")

  // Drawers / dialogs
  const [stagePopoverOpen, setStagePopoverOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [offerOpen, setOfferOpen] = useState(false)
  const [logCallOpen, setLogCallOpen] = useState(false)
  const [uploadResumeOpen, setUploadResumeOpen] = useState(false)
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false)
  const [promoteConfirmOpen, setPromoteConfirmOpen] = useState(false)
  const [promoting, setPromoting] = useState(false)

  // Notes autosave draft
  const [notesDraft, setNotesDraft] = useState(candidate.internal_notes ?? "")

  /* -------------------------------------------------------------- */
  /*  Mutations                                                     */
  /* -------------------------------------------------------------- */

  async function moveStage(next: string) {
    if (next === candidate.stage) {
      setStagePopoverOpen(false)
      return
    }
    const now = new Date().toISOString()
    const previous = candidate
    setCandidate({ ...candidate, stage: next, last_activity_at: now })
    setStagePopoverOpen(false)

    const upd = await supabaseHq
      .from("candidates")
      .update({ stage: next, last_activity_at: now })
      .eq("id", candidate.id)

    if (upd.error) {
      setCandidate(previous)
      toast.error(`Could not move stage: ${upd.error.message}`)
      return
    }

    const logRow: StageLogRow = {
      candidate_id: candidate.id,
      from_stage: previous.stage,
      to_stage: next,
      changed_at: now,
      changed_by: "admin@suprans",
      note: null,
    }
    const logRes = await supabaseHq.from("candidate_stages").insert(logRow)
    if (logRes.error) {
      toast.warning(`Stage moved but log failed: ${logRes.error.message}`)
    } else {
      setStages((prev) => [logRow, ...prev])
      toast.success(`Moved to ${STAGE_LABEL[next] ?? next}`)
    }
  }

  async function saveNotes() {
    const trimmed = notesDraft
    if (trimmed === (candidate.internal_notes ?? "")) return
    const previous = candidate
    setCandidate({ ...candidate, internal_notes: trimmed })

    const { error } = await supabaseHq
      .from("candidates")
      .update({ internal_notes: trimmed })
      .eq("id", candidate.id)

    if (error) {
      setCandidate(previous)
      toast.error(`Could not save notes: ${error.message}`)
      return
    }
    toast.success("Notes saved")
  }

  async function confirmReject() {
    await moveStage("rejected")
    setRejectConfirmOpen(false)
  }

  async function confirmPromote(joinDate: string) {
    setPromoting(true)
    const { error } = await supabase.rpc("hq_promote_candidate", {
      candidate_id: candidate.id,
      join_date: joinDate,
    })
    setPromoting(false)

    if (error) {
      toast.error(`Could not promote: ${error.message}`)
      return
    }
    toast.success("Candidate promoted to employee")
    setPromoteConfirmOpen(false)
    router.refresh()
  }

  /* -------------------------------------------------------------- */
  /*  Derived                                                        */
  /* -------------------------------------------------------------- */

  const tabs = useMemo(
    () => [
      { id: "overview", label: "Overview" },
      { id: "resume", label: "Resume + AI" },
      { id: "calls", label: "Calls", count: counts.calls },
      { id: "interviews", label: "Interviews", count: counts.interviews },
      { id: "offer", label: "Offer", count: offers.length },
      { id: "onboarding", label: "Onboarding", count: onboarding.length },
      { id: "activity", label: "Activity" },
    ],
    [counts.calls, counts.interviews, offers.length, onboarding.length],
  )

  const latestOffer = offers[0] ?? null
  const nextRoundNumber =
    interviews.reduce((max, iv) => Math.max(max, iv.round_number ?? 0), 0) + 1

  const heroSubtitle = [
    role?.title ?? candidate.applied_for ?? "—",
    candidate.source ?? "—",
    `Applied ${relativeTime(candidate.created_at)}`,
  ].join(" · ")

  const canPromote =
    candidate.stage === "offer" || candidate.stage === "hired"

  /* -------------------------------------------------------------- */
  /*  Render                                                         */
  /* -------------------------------------------------------------- */

  return (
    <>
      <HeroCard
        title={candidate.name}
        subtitle={heroSubtitle}
        avatar={initialsAvatar(candidate.name, "lg")}
        meta={
          <>
            <StatusBadge tone={toneForStatus(candidate.stage)}>
              {STAGE_LABEL[candidate.stage] ?? candidate.stage}
            </StatusBadge>
            {candidate.source && (
              <StatusBadge tone={toneForStatus(candidate.source)}>
                {candidate.source}
              </StatusBadge>
            )}
            {resume?.ai_match_score != null && (
              <StatusBadge tone="blue">
                <Sparkles className="size-3" />
                AI match{" "}
                <span className="tabular-nums">
                  {resume.ai_match_score}%
                </span>
              </StatusBadge>
            )}
            {candidate.location && (
              <StatusBadge tone="slate">
                <MapPin className="size-3" />
                {candidate.location}
              </StatusBadge>
            )}
          </>
        }
        actions={
          <>
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStagePopoverOpen((v) => !v)}
              >
                Move stage
              </Button>
              {stagePopoverOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setStagePopoverOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-md border border-border bg-card shadow-lg overflow-hidden">
                    {STAGES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => moveStage(s)}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center justify-between",
                          s === candidate.stage && "bg-muted/60 font-semibold",
                        )}
                      >
                        <span>{STAGE_LABEL[s]}</span>
                        {s === candidate.stage && (
                          <CheckCircle2 className="size-3.5 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setScheduleOpen(true)}
            >
              <Calendar className="size-3.5" />
              Schedule interview
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOfferOpen(true)}
            >
              Make offer
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectConfirmOpen(true)}
              disabled={candidate.stage === "rejected"}
            >
              <XCircle className="size-3.5" />
              Reject
            </Button>
            {canPromote && (
              <Button size="sm" onClick={() => setPromoteConfirmOpen(true)}>
                Promote to employee
              </Button>
            )}
          </>
        }
      />

      <FilterBar
        tabs={tabs}
        activeTab={tab}
        onTabChange={(id) => setTab(id as TabId)}
      />

      {tab === "overview" && (
        <OverviewTab
          candidate={candidate}
          role={role}
          notesDraft={notesDraft}
          onNotesChange={setNotesDraft}
          onNotesBlur={saveNotes}
        />
      )}

      {tab === "resume" && (
        <ResumeTab
          resume={resume}
          onUploadClick={() => setUploadResumeOpen(true)}
        />
      )}

      {tab === "calls" && (
        <CallsTab
          calls={calls}
          onLogCallClick={() => setLogCallOpen(true)}
        />
      )}

      {tab === "interviews" && (
        <InterviewsTab
          interviews={interviews}
          onScheduleClick={() => setScheduleOpen(true)}
        />
      )}

      {tab === "offer" && (
        <OfferTab
          latestOffer={latestOffer}
          onMakeOfferClick={() => setOfferOpen(true)}
          onMarkAccepted={async () => {
            if (!latestOffer) return
            const previous = offers
            const now = new Date().toISOString()
            setOffers((prev) =>
              prev.map((o, i) =>
                i === 0 ? { ...o, status: "accepted", response_date: now } : o,
              ),
            )
            const { error } = await supabaseHq
              .from("offers")
              .update({ status: "accepted", response_date: now })
              .eq("id", latestOffer.id)
            if (error) {
              setOffers(previous)
              toast.error(`Could not update offer: ${error.message}`)
              return
            }
            toast.success("Offer marked as accepted")
          }}
          onMarkDeclined={async () => {
            if (!latestOffer) return
            const previous = offers
            const now = new Date().toISOString()
            setOffers((prev) =>
              prev.map((o, i) =>
                i === 0 ? { ...o, status: "declined", response_date: now } : o,
              ),
            )
            const { error } = await supabaseHq
              .from("offers")
              .update({ status: "declined", response_date: now })
              .eq("id", latestOffer.id)
            if (error) {
              setOffers(previous)
              toast.error(`Could not update offer: ${error.message}`)
              return
            }
            toast.success("Offer marked as declined")
          }}
        />
      )}

      {tab === "onboarding" && (
        <OnboardingTab
          tasks={onboarding}
          canPromote={canPromote}
          onPromoteClick={() => setPromoteConfirmOpen(true)}
          onToggleDone={async (task) => {
            const previous = onboarding
            const now = new Date().toISOString()
            const nextStatus = task.status === "done" ? "pending" : "done"
            setOnboarding((prev) =>
              prev.map((t) =>
                t.id === task.id
                  ? {
                      ...t,
                      status: nextStatus,
                      done_at: nextStatus === "done" ? now : null,
                    }
                  : t,
              ),
            )
            const { error } = await supabaseHq
              .from("onboarding_tasks")
              .update({
                status: nextStatus,
                done_at: nextStatus === "done" ? now : null,
              })
              .eq("id", task.id)
            if (error) {
              setOnboarding(previous)
              toast.error(`Could not update task: ${error.message}`)
              return
            }
          }}
        />
      )}

      {tab === "activity" && (
        <ActivityTab candidate={candidate} stages={stages} />
      )}

      {/* ---- Drawers & dialogs ------------------------------------ */}

      <LogCallDrawer
        open={logCallOpen}
        onClose={() => setLogCallOpen(false)}
        onSubmit={async (payload) => {
          const tempId = `temp-${Date.now()}`
          const optimistic: CandidateCallRow = {
            id: tempId,
            candidate_id: candidate.id,
            ...payload,
          }
          setCalls((prev) => [optimistic, ...prev])
          setLogCallOpen(false)

          const { data, error } = await supabaseHq
            .from("candidate_calls")
            .insert({
              candidate_id: candidate.id,
              ...payload,
            })
            .select(
              "id, candidate_id, called_at, call_status, call_response, call_notes, called_by",
            )
            .single()

          if (error) {
            setCalls((prev) => prev.filter((c) => c.id !== tempId))
            toast.error(`Could not log call: ${error.message}`)
            return
          }
          setCalls((prev) =>
            prev.map((c) => (c.id === tempId ? (data as CandidateCallRow) : c)),
          )
          toast.success("Call logged")
        }}
      />

      <ScheduleInterviewDrawer
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        nextRound={nextRoundNumber}
        onSubmit={async (payload) => {
          const { data, error } = await supabaseHq
            .from("interviews")
            .insert({
              candidate_id: candidate.id,
              role_id: candidate.role_id,
              ...payload,
            })
            .select(
              "id, candidate_id, role_id, interviewer, scheduled_at, format, status, feedback_score, round_number, round_label, location, panel, recommendation",
            )
            .single()

          if (error) {
            toast.error(`Could not schedule: ${error.message}`)
            return
          }
          setInterviews((prev) => [...prev, data as InterviewRow])
          setScheduleOpen(false)
          toast.success("Interview scheduled")
        }}
      />

      <OfferDrawer
        open={offerOpen}
        onClose={() => setOfferOpen(false)}
        onSubmit={async (payload) => {
          const { data, error } = await supabaseHq
            .from("offers")
            .insert({
              candidate_id: candidate.id,
              role_id: candidate.role_id,
              ...payload,
            })
            .select(
              "id, candidate_id, role_id, offer_date, ctc_offered, currency, joining_date, deadline, status, response_date, notes",
            )
            .single()

          if (error) {
            toast.error(`Could not create offer: ${error.message}`)
            return
          }
          setOffers((prev) => [data as OfferRow, ...prev])
          setOfferOpen(false)
          toast.success("Offer created")
        }}
      />

      <UploadResumeDrawer
        open={uploadResumeOpen}
        onClose={() => setUploadResumeOpen(false)}
        onSubmit={async (payload) => {
          const { data, error } = await supabaseHq
            .from("candidate_resumes")
            .insert({ candidate_id: candidate.id, ...payload })
            .select(
              "id, candidate_id, file_name, storage_path, external_url, raw_text, ai_summary, ai_skills, ai_strengths, ai_concerns, ai_match_score, ai_processed_at",
            )
            .single()

          if (error) {
            toast.error(`Could not save resume: ${error.message}`)
            return
          }
          setResume(data as ResumeRow)
          setUploadResumeOpen(false)
          toast.success("Resume saved")
        }}
      />

      <ConfirmDialog
        open={rejectConfirmOpen}
        onCancel={() => setRejectConfirmOpen(false)}
        onConfirm={confirmReject}
        title="Reject candidate?"
        description={`This will move ${candidate.name} to the Rejected stage. You can still restore them later.`}
        tone="destructive"
        confirmLabel="Reject candidate"
      />

      <PromoteDialog
        open={promoteConfirmOpen}
        busy={promoting}
        onCancel={() => setPromoteConfirmOpen(false)}
        onConfirm={(date) => confirmPromote(date)}
      />
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab: Overview                                                      */
/* ------------------------------------------------------------------ */

function OverviewTab({
  candidate,
  role,
  notesDraft,
  onNotesChange,
  onNotesBlur,
}: {
  candidate: CandidateRow
  role: JobRoleRow | null
  notesDraft: string
  onNotesChange: (v: string) => void
  onNotesBlur: () => void
}) {
  const phoneValue = candidate.phone ? (
    <a
      href={`tel:${candidate.phone}`}
      className="text-primary hover:underline inline-flex items-center gap-1"
    >
      <Phone className="size-3.5" />
      {candidate.phone}
    </a>
  ) : (
    "—"
  )
  const emailValue = candidate.email ? (
    <a
      href={`mailto:${candidate.email}`}
      className="text-primary hover:underline"
    >
      {candidate.email}
    </a>
  ) : (
    "—"
  )
  const profileValue = candidate.profile_url ? (
    <a
      href={candidate.profile_url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline inline-flex items-center gap-1"
    >
      <LinkIcon className="size-3.5" />
      Open profile
    </a>
  ) : (
    "—"
  )
  const cvValue = candidate.cv_url ? (
    <a
      href={candidate.cv_url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline inline-flex items-center gap-1"
    >
      <FileText className="size-3.5" />
      Open CV
    </a>
  ) : (
    "—"
  )

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <DetailCard title="Contact">
          <div className="divide-y">
            <InfoRow label="Phone" value={phoneValue} />
            <InfoRow label="Email" value={emailValue} />
            <InfoRow label="Location" value={candidate.location ?? "—"} />
            <InfoRow label="Profile" value={profileValue} />
            <InfoRow label="CV / Resume" value={cvValue} />
          </div>
        </DetailCard>

        <DetailCard title="Hiring">
          <div className="divide-y">
            <InfoRow
              label="Applied for"
              value={candidate.applied_for ?? role?.title ?? "—"}
            />
            <InfoRow label="Source" value={candidate.source ?? "—"} />
            <InfoRow
              label="Next action"
              value={candidate.next_action ?? "—"}
            />
            <InfoRow
              label="Skill match"
              value={
                candidate.skill_match !== null ? (
                  <span className="tabular-nums">
                    {candidate.skill_match}%
                  </span>
                ) : (
                  "—"
                )
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
          </div>
        </DetailCard>
      </div>

      <DetailCard title="Internal notes">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Visible to hiring team only. Saves on blur.
            </p>
          </div>
          <textarea
            value={notesDraft}
            onChange={(e) => onNotesChange(e.target.value)}
            onBlur={onNotesBlur}
            rows={6}
            placeholder="Add internal notes about this candidate…"
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
          />
        </div>
      </DetailCard>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab: Resume + AI                                                   */
/* ------------------------------------------------------------------ */

function ResumeTab({
  resume,
  onUploadClick,
}: {
  resume: ResumeRow | null
  onUploadClick: () => void
}) {
  if (!resume) {
    return (
      <DetailCard title="Resume + AI">
        <EmptyState
          icon={FileText}
          title="No resume on file"
          description="Upload a resume file or paste a link to Google Drive / LinkedIn."
          action={
            <Button size="sm" onClick={onUploadClick}>
              <Plus className="size-3.5" />
              Upload resume
            </Button>
          }
        />
      </DetailCard>
    )
  }

  const resumeHref = resume.external_url ?? resume.storage_path ?? null

  return (
    <div className="space-y-5">
      <DetailCard title="Resume">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="inline-flex size-10 items-center justify-center rounded-md bg-slate-100 text-slate-700">
              <FileText className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">
                {resume.file_name ?? "Resume"}
              </p>
              {resume.ai_processed_at && (
                <p className="text-xs text-muted-foreground">
                  Processed {relativeTime(resume.ai_processed_at)}
                </p>
              )}
            </div>
          </div>
          {resumeHref && (
            <a
              href={resumeHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1 shrink-0"
            >
              <LinkIcon className="size-3.5" />
              View
            </a>
          )}
        </div>
      </DetailCard>

      {resume.ai_summary && (
        <DetailCard title="AI summary">
          <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 leading-relaxed">
            <div className="flex items-center gap-1.5 mb-2 text-blue-700 font-semibold">
              <Sparkles className="size-3.5" />
              AI analysis
            </div>
            <p className="whitespace-pre-wrap">{resume.ai_summary}</p>
          </div>
        </DetailCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <DetailCard title="Strengths">
          {resume.ai_strengths && resume.ai_strengths.length > 0 ? (
            <ul className="space-y-2">
              {resume.ai_strengths.map((s, i) => (
                <li
                  key={i}
                  className="text-sm text-foreground flex items-start gap-2"
                >
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No strengths noted.</p>
          )}
        </DetailCard>

        <DetailCard title="Concerns">
          {resume.ai_concerns && resume.ai_concerns.length > 0 ? (
            <ul className="space-y-2">
              {resume.ai_concerns.map((c, i) => (
                <li
                  key={i}
                  className="text-sm text-foreground flex items-start gap-2"
                >
                  <XCircle className="size-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No concerns noted.</p>
          )}
        </DetailCard>
      </div>

      {resume.ai_skills && resume.ai_skills.length > 0 && (
        <DetailCard title="Skills">
          <div className="flex flex-wrap gap-1.5">
            {resume.ai_skills.map((s, i) => (
              <StatusBadge key={i} tone="blue">
                {s}
              </StatusBadge>
            ))}
          </div>
        </DetailCard>
      )}

      {resume.ai_match_score != null && (
        <DetailCard title="AI match score">
          <p className="text-2xl font-bold font-heading tabular-nums">
            {resume.ai_match_score}
            <span className="text-base font-semibold text-muted-foreground">
              {" "}
              / 100
            </span>
          </p>
        </DetailCard>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab: Calls                                                         */
/* ------------------------------------------------------------------ */

function CallsTab({
  calls,
  onLogCallClick,
}: {
  calls: CandidateCallRow[]
  onLogCallClick: () => void
}) {
  return (
    <DetailCard
      title={`Calls (${calls.length})`}
      actions={
        <Button size="sm" onClick={onLogCallClick}>
          <Plus className="size-3.5" />
          Log call
        </Button>
      }
    >
      {calls.length === 0 ? (
        <EmptyState
          icon={Phone}
          title="No calls logged"
          description="Log a call to capture status and response."
        />
      ) : (
        <div className="overflow-x-auto -mx-5 -my-5">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border/80">
              <tr className="text-left">
                <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  Date
                </th>
                <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Response
                </th>
                <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Notes
                </th>
                <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  Recruiter
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/80">
              {calls.map((c, i) => (
                <tr
                  key={c.id ?? `${c.candidate_id}-${i}`}
                  className="hover:bg-muted/20 transition-colors align-top"
                >
                  <td className="px-5 py-3 whitespace-nowrap tabular-nums text-muted-foreground">
                    {formatDateTime(c.called_at)}
                  </td>
                  <td className="px-5 py-3">
                    {c.call_status ? (
                      <StatusBadge tone={toneForCallStatus(c.call_status)}>
                        {c.call_status}
                      </StatusBadge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {c.call_response ? (
                      <StatusBadge tone={toneForCallResponse(c.call_response)}>
                        {c.call_response}
                      </StatusBadge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 max-w-md">
                    <p className="line-clamp-3 text-foreground">
                      {c.call_notes ?? "—"}
                    </p>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">
                    {c.called_by ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DetailCard>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab: Interviews                                                    */
/* ------------------------------------------------------------------ */

function InterviewsTab({
  interviews,
  onScheduleClick,
}: {
  interviews: InterviewRow[]
  onScheduleClick: () => void
}) {
  return (
    <DetailCard
      title={`Interviews (${interviews.length})`}
      actions={
        <Button size="sm" onClick={onScheduleClick}>
          <Plus className="size-3.5" />
          Schedule next round
        </Button>
      }
    >
      {interviews.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No interviews yet"
          description="Schedule the first round to start tracking feedback."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {interviews.map((iv) => {
            const label =
              iv.round_label ??
              (iv.round_number != null
                ? `Round ${iv.round_number}`
                : "Interview")
            return (
              <div
                key={iv.id}
                className="rounded-md border border-border/80 bg-muted/10 p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[0.9375rem] font-semibold tracking-tight">
                      {label}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(iv.scheduled_at)}
                    </p>
                  </div>
                  {iv.status && (
                    <StatusBadge tone={toneForStatus(iv.status)}>
                      {iv.status}
                    </StatusBadge>
                  )}
                </div>
                <div className="divide-y">
                  <InfoRow
                    label="Interviewer"
                    value={iv.interviewer ?? "TBD"}
                  />
                  <InfoRow label="Format" value={iv.format ?? "—"} />
                  <InfoRow label="Location" value={iv.location ?? "—"} />
                  {iv.feedback_score !== null && (
                    <InfoRow
                      label="Score"
                      value={
                        <span className="tabular-nums">
                          {iv.feedback_score}
                        </span>
                      }
                    />
                  )}
                  {iv.recommendation && (
                    <InfoRow
                      label="Recommendation"
                      value={
                        <StatusBadge tone={toneForStatus(iv.recommendation)}>
                          {iv.recommendation}
                        </StatusBadge>
                      }
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </DetailCard>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab: Offer                                                         */
/* ------------------------------------------------------------------ */

function OfferTab({
  latestOffer,
  onMakeOfferClick,
  onMarkAccepted,
  onMarkDeclined,
}: {
  latestOffer: OfferRow | null
  onMakeOfferClick: () => void
  onMarkAccepted: () => void
  onMarkDeclined: () => void
}) {
  if (!latestOffer) {
    return (
      <DetailCard title="Offer">
        <EmptyState
          icon={FileText}
          title="No offer generated"
          description="Create an offer once the candidate clears all rounds."
          action={
            <Button size="sm" onClick={onMakeOfferClick}>
              <Plus className="size-3.5" />
              Generate offer
            </Button>
          }
        />
      </DetailCard>
    )
  }

  const sym = latestOffer.currency === "USD" ? "$" : "₹"

  return (
    <DetailCard
      title="Offer"
      actions={
        latestOffer.status && (
          <StatusBadge tone={toneForStatus(latestOffer.status)}>
            {latestOffer.status}
          </StatusBadge>
        )
      }
    >
      <div className="divide-y">
        <InfoRow label="Offer date" value={formatDate(latestOffer.offer_date)} />
        <InfoRow
          label="CTC offered"
          value={
            <span className="tabular-nums">
              {formatCurrency(latestOffer.ctc_offered, sym)}
            </span>
          }
        />
        <InfoRow label="Currency" value={latestOffer.currency ?? "—"} />
        <InfoRow
          label="Joining date"
          value={formatDate(latestOffer.joining_date)}
        />
        <InfoRow label="Deadline" value={formatDate(latestOffer.deadline)} />
        <InfoRow
          label="Response"
          value={
            latestOffer.response_date
              ? formatDateTime(latestOffer.response_date)
              : "Awaiting"
          }
        />
        {latestOffer.notes && (
          <InfoRow label="Notes" value={latestOffer.notes} />
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={onMarkAccepted}>
          <CheckCircle2 className="size-3.5" />
          Mark accepted
        </Button>
        <Button size="sm" variant="outline" onClick={onMarkDeclined}>
          <XCircle className="size-3.5" />
          Mark declined
        </Button>
        <Button size="sm" variant="outline" onClick={onMakeOfferClick}>
          Revise offer
        </Button>
      </div>
    </DetailCard>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab: Onboarding                                                    */
/* ------------------------------------------------------------------ */

function OnboardingTab({
  tasks,
  canPromote,
  onPromoteClick,
  onToggleDone,
}: {
  tasks: OnboardingTaskRow[]
  canPromote: boolean
  onPromoteClick: () => void
  onToggleDone: (task: OnboardingTaskRow) => void
}) {
  if (tasks.length === 0) {
    return (
      <DetailCard title="Onboarding">
        <EmptyState
          icon={CheckCircle2}
          title={
            canPromote
              ? "Ready to promote"
              : "Onboarding starts after promotion"
          }
          description={
            canPromote
              ? "Promoting the candidate will seed the standard 8-task onboarding checklist."
              : "Once the offer is accepted and the candidate is hired, onboarding tasks will appear here."
          }
          action={
            canPromote ? (
              <Button size="sm" onClick={onPromoteClick}>
                Promote to employee
              </Button>
            ) : undefined
          }
        />
      </DetailCard>
    )
  }

  return (
    <DetailCard title={`Onboarding (${tasks.length})`}>
      <ul className="space-y-2">
        {tasks.map((task) => {
          const done = task.status === "done"
          return (
            <li
              key={task.id}
              className={cn(
                "flex items-center justify-between gap-3 rounded-md border border-border/80 bg-card px-4 py-3",
                done && "bg-muted/30",
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                {initialsAvatar(task.task_name ?? "Task", "sm")}
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-sm font-semibold truncate",
                      done && "line-through text-muted-foreground",
                    )}
                  >
                    {task.task_name ?? "Task"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {task.category ?? "General"}
                    {task.due_date ? ` · Due ${formatDate(task.due_date)}` : ""}
                    {task.done_at
                      ? ` · Done ${relativeTime(task.done_at)}`
                      : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge tone={toneForStatus(task.status ?? "pending")}>
                  {task.status ?? "pending"}
                </StatusBadge>
                <Button
                  size="sm"
                  variant={done ? "outline" : "default"}
                  onClick={() => onToggleDone(task)}
                >
                  {done ? "Reopen" : "Mark done"}
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
    </DetailCard>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab: Activity                                                      */
/* ------------------------------------------------------------------ */

interface ActivityEvent {
  at: string
  title: ReactNode
  meta?: ReactNode
  by?: string | null
  tone: "slate" | "blue" | "emerald" | "amber" | "violet"
}

function ActivityTab({
  candidate,
  stages,
}: {
  candidate: CandidateRow
  stages: StageLogRow[]
}) {
  const events: ActivityEvent[] = []

  if (candidate.created_at) {
    events.push({
      at: candidate.created_at,
      title: "Candidate created",
      meta: candidate.source ? `Source: ${candidate.source}` : null,
      tone: "blue",
    })
  }

  for (const s of stages) {
    if (!s.changed_at) continue
    events.push({
      at: s.changed_at,
      by: s.changed_by,
      tone:
        s.to_stage === "hired"
          ? "emerald"
          : s.to_stage === "rejected"
            ? "amber"
            : "violet",
      title: (
        <span className="inline-flex flex-wrap items-center gap-2">
          {s.from_stage ? (
            <StatusBadge tone={toneForStatus(s.from_stage)}>
              {STAGE_LABEL[s.from_stage] ?? s.from_stage}
            </StatusBadge>
          ) : (
            <span className="text-sm text-muted-foreground">(new)</span>
          )}
          <ArrowRight className="size-3.5 text-muted-foreground" />
          <StatusBadge tone={toneForStatus(s.to_stage ?? "")}>
            {STAGE_LABEL[s.to_stage ?? ""] ?? s.to_stage}
          </StatusBadge>
        </span>
      ),
      meta: s.note ?? null,
    })
  }

  if (
    candidate.last_activity_at &&
    !events.some((e) => e.at === candidate.last_activity_at)
  ) {
    events.push({
      at: candidate.last_activity_at,
      title: "Last activity recorded",
      tone: "slate",
    })
  }

  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

  if (events.length === 0) {
    return (
      <DetailCard title="Activity">
        <EmptyState
          icon={Calendar}
          title="No activity recorded"
          description="Stage changes and system events will appear here."
        />
      </DetailCard>
    )
  }

  const toneDot: Record<ActivityEvent["tone"], string> = {
    slate: "bg-slate-400",
    blue: "bg-blue-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    violet: "bg-violet-500",
  }

  return (
    <DetailCard title="Activity">
      <ol className="relative space-y-4">
        <div
          className="absolute left-[7px] top-2 bottom-2 w-px bg-border"
          aria-hidden="true"
        />
        {events.map((ev, i) => (
          <li key={i} className="relative flex items-start gap-3 pl-1">
            <span
              className={cn(
                "relative z-10 mt-1.5 size-3.5 rounded-full border-2 border-card shrink-0",
                toneDot[ev.tone],
              )}
            />
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="text-sm text-foreground">{ev.title}</div>
                <div className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                  {relativeTime(ev.at)}
                </div>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatDateTime(ev.at)}
                {ev.by ? ` · by ${ev.by}` : ""}
              </p>
              {ev.meta && (
                <p className="mt-1 text-sm text-muted-foreground">{ev.meta}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </DetailCard>
  )
}

/* ------------------------------------------------------------------ */
/*  Drawers                                                            */
/* ------------------------------------------------------------------ */

const inputClass =
  "w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
const textareaClass =
  "w-full min-h-[96px] rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </label>
  )
}

function LogCallDrawer({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (payload: Omit<CandidateCallRow, "candidate_id" | "id">) => Promise<void>
}) {
  const [calledAt, setCalledAt] = useState(() =>
    new Date().toISOString().slice(0, 16),
  )
  const [status, setStatus] = useState<string>("Connected")
  const [response, setResponse] = useState<string>("Interested")
  const [notes, setNotes] = useState<string>("")
  const [recruiter, setRecruiter] = useState<string>("")
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    setSaving(true)
    await onSubmit({
      called_at: new Date(calledAt).toISOString(),
      call_status: status,
      call_response: response,
      call_notes: notes || null,
      called_by: recruiter || null,
    })
    setSaving(false)
  }

  return (
    <EditDrawer
      open={open}
      onClose={onClose}
      title="Log call"
      subtitle="Record the outcome and response"
      size="md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving…" : "Log call"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <FieldLabel>Called at</FieldLabel>
          <input
            type="datetime-local"
            value={calledAt}
            onChange={(e) => setCalledAt(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <FieldLabel>Status</FieldLabel>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={inputClass}
          >
            {CALL_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <FieldLabel>Response</FieldLabel>
          <select
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            className={inputClass}
          >
            {CALL_RESPONSE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <FieldLabel>Recruiter</FieldLabel>
          <input
            type="text"
            value={recruiter}
            onChange={(e) => setRecruiter(e.target.value)}
            placeholder="you@suprans"
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <FieldLabel>Notes</FieldLabel>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Call summary, next steps…"
            className={textareaClass}
          />
        </div>
      </div>
    </EditDrawer>
  )
}

function ScheduleInterviewDrawer({
  open,
  onClose,
  nextRound,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  nextRound: number
  onSubmit: (payload: {
    round_number: number
    round_label: string | null
    scheduled_at: string
    interviewer: string | null
    location: string | null
    format: string | null
    status: string
  }) => Promise<void>
}) {
  const [label, setLabel] = useState(`Round ${nextRound}`)
  const [scheduledAt, setScheduledAt] = useState(() =>
    new Date().toISOString().slice(0, 16),
  )
  const [interviewer, setInterviewer] = useState("")
  const [location, setLocation] = useState("")
  const [format, setFormat] = useState("Video")
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    setSaving(true)
    await onSubmit({
      round_number: nextRound,
      round_label: label || null,
      scheduled_at: new Date(scheduledAt).toISOString(),
      interviewer: interviewer || null,
      location: location || null,
      format: format || null,
      status: "scheduled",
    })
    setSaving(false)
  }

  return (
    <EditDrawer
      open={open}
      onClose={onClose}
      title="Schedule interview"
      subtitle={`Round ${nextRound}`}
      size="md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving…" : "Schedule"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <FieldLabel>Round label</FieldLabel>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <FieldLabel>Scheduled at</FieldLabel>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <FieldLabel>Interviewer</FieldLabel>
          <input
            type="text"
            value={interviewer}
            onChange={(e) => setInterviewer(e.target.value)}
            placeholder="e.g. Priya Sharma"
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <FieldLabel>Format</FieldLabel>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className={inputClass}
          >
            <option value="Video">Video</option>
            <option value="Phone">Phone</option>
            <option value="Onsite">Onsite</option>
            <option value="Assessment">Assessment</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <FieldLabel>Location / link</FieldLabel>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Meet link or office address"
            className={inputClass}
          />
        </div>
      </div>
    </EditDrawer>
  )
}

function OfferDrawer({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (payload: {
    offer_date: string
    ctc_offered: number | null
    currency: string
    joining_date: string | null
    deadline: string | null
    status: string
    notes: string | null
  }) => Promise<void>
}) {
  const [offerDate, setOfferDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  )
  const [ctc, setCtc] = useState("")
  const [currency, setCurrency] = useState("INR")
  const [joiningDate, setJoiningDate] = useState("")
  const [deadline, setDeadline] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    setSaving(true)
    await onSubmit({
      offer_date: offerDate,
      ctc_offered: ctc ? Number(ctc) : null,
      currency,
      joining_date: joiningDate || null,
      deadline: deadline || null,
      status: "pending",
      notes: notes || null,
    })
    setSaving(false)
  }

  return (
    <EditDrawer
      open={open}
      onClose={onClose}
      title="Generate offer"
      size="md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving…" : "Create offer"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <FieldLabel>Offer date</FieldLabel>
          <input
            type="date"
            value={offerDate}
            onChange={(e) => setOfferDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <FieldLabel>CTC offered</FieldLabel>
            <input
              type="number"
              value={ctc}
              onChange={(e) => setCtc(e.target.value)}
              placeholder="e.g. 1200000"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Currency</FieldLabel>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className={inputClass}
            >
              <option value="INR">INR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <FieldLabel>Joining date</FieldLabel>
            <input
              type="date"
              value={joiningDate}
              onChange={(e) => setJoiningDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Deadline</FieldLabel>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <FieldLabel>Notes</FieldLabel>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Benefits, bonuses, caveats…"
            className={textareaClass}
          />
        </div>
      </div>
    </EditDrawer>
  )
}

function UploadResumeDrawer({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (payload: {
    file_name: string
    external_url: string | null
  }) => Promise<void>
}) {
  const [fileName, setFileName] = useState("")
  const [externalUrl, setExternalUrl] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!fileName.trim()) {
      toast.error("File name is required")
      return
    }
    setSaving(true)
    await onSubmit({
      file_name: fileName.trim(),
      external_url: externalUrl.trim() || null,
    })
    setSaving(false)
  }

  return (
    <EditDrawer
      open={open}
      onClose={onClose}
      title="Upload resume"
      subtitle="Paste a shared link for now; storage upload coming soon"
      size="md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving…" : "Save resume"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <FieldLabel>File name</FieldLabel>
          <input
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="e.g. priya-sharma-resume.pdf"
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <FieldLabel>External URL</FieldLabel>
          <input
            type="url"
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            placeholder="https://drive.google.com/…"
            className={inputClass}
          />
        </div>
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <div className="flex items-center gap-1.5 font-semibold">
            <Upload className="size-3.5" />
            Direct upload coming soon
          </div>
          <p className="mt-1">
            For now, paste a link to Google Drive / Dropbox / LinkedIn. AI parsing
            runs after the file is stored.
          </p>
        </div>
      </div>
    </EditDrawer>
  )
}

function PromoteDialog({
  open,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean
  busy: boolean
  onCancel: () => void
  onConfirm: (joinDate: string) => void
}) {
  const [joinDate, setJoinDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  )

  return (
    <EditDrawer
      open={open}
      onClose={busy ? () => {} : onCancel}
      title="Promote to employee"
      subtitle="Creates an employees row and seeds 8 onboarding tasks"
      size="md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => onConfirm(joinDate)} disabled={busy}>
            {busy ? "Promoting…" : "Promote"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          <div className="flex items-center gap-1.5 font-semibold">
            <MessageCircle className="size-3.5" />
            What happens
          </div>
          <ul className="mt-1 list-disc pl-5 space-y-0.5">
            <li>Candidate stage moves to <strong>hired</strong></li>
            <li>A new row is inserted into <code>hq.employees</code></li>
            <li>8 standard onboarding tasks are seeded</li>
          </ul>
        </div>
        <div className="space-y-1.5">
          <FieldLabel>Joining date</FieldLabel>
          <input
            type="date"
            value={joinDate}
            onChange={(e) => setJoinDate(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
    </EditDrawer>
  )
}
