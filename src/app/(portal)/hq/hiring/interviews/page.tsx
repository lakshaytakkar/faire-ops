"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  Video,
  Plus,
  MoreHorizontal,
  CalendarCheck,
  CalendarClock,
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { FilterBar } from "@/components/shared/filter-bar"
import { DetailCard } from "@/components/shared/detail-views"
import {
  StatusBadge,
  toneForStatus,
  type StatusTone,
} from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { EditDrawer } from "@/components/shared/edit-drawer"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { supabaseHq } from "@/lib/supabase"
import { formatDateTime, formatInitials } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * Interviews list — ATS spec §2.13.
 * Client component because row actions mutate hq.interviews.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type InterviewStatus = "scheduled" | "completed" | "cancelled" | "no_show"
type InterviewFormat = "video_call" | "in_person" | "phone"
type Recommendation = "proceed" | "hold" | "reject"

interface InterviewRow {
  id: string
  candidate_id: string | null
  role_id: string | null
  interviewer: string | null
  scheduled_at: string | null
  format: string | null
  status: string | null
  feedback_score: number | null
  round_number: number | null
  round_label: string | null
  location: string | null
  recommendation: string | null
}

interface CandidateRef {
  id: string
  name: string | null
}

interface RoleRef {
  id: string
  title: string | null
}

type TabId =
  | "all"
  | "today"
  | "tomorrow"
  | "this_week"
  | "past"
  | "cancelled"

type FormatChip = "all" | InterviewFormat
type RoundChip = "all" | "R1" | "R2" | "R3plus"

/* ------------------------------------------------------------------ */
/*  Tone overrides                                                     */
/* ------------------------------------------------------------------ */

// Format tones — not in DEFAULT_MAP of status-badge, so define locally.
const FORMAT_TONE: Record<string, StatusTone> = {
  video_call: "violet",
  video: "violet",
  in_person: "emerald",
  phone: "blue",
}

const FORMAT_LABEL: Record<string, string> = {
  video_call: "Video",
  video: "Video",
  in_person: "In-Person",
  phone: "Phone",
}

// Status tones for interviews. scheduled→blue, completed→emerald,
// cancelled→slate (spec), no_show→red. Override StatusBadge defaults
// for "scheduled" (default slate) and "cancelled" (default red).
const INTERVIEW_STATUS_TONE: Record<string, StatusTone> = {
  scheduled: "blue",
  completed: "emerald",
  cancelled: "slate",
  no_show: "red",
}

const INTERVIEW_STATUS_LABEL: Record<string, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
}

// Recommendation tones — proceed→emerald, hold→amber, reject→red.
const RECOMMENDATION_TONE: Record<string, StatusTone> = {
  proceed: "emerald",
  hold: "amber",
  reject: "red",
}

function interviewStatusTone(s: string | null | undefined): StatusTone {
  if (!s) return "slate"
  return INTERVIEW_STATUS_TONE[s] ?? toneForStatus(s)
}

function formatTone(f: string | null | undefined): StatusTone {
  if (!f) return "slate"
  return FORMAT_TONE[f] ?? "slate"
}

function recommendationTone(r: string | null | undefined): StatusTone {
  if (!r) return "slate"
  return RECOMMENDATION_TONE[r] ?? "slate"
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const AVATAR_TONES = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-violet-100 text-violet-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
  "bg-slate-100 text-slate-700",
  "bg-indigo-100 text-indigo-700",
] as const

function avatarTone(name: string | null | undefined): string {
  const key = (name ?? "").trim() || "?"
  let h = 0
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) | 0
  }
  return AVATAR_TONES[Math.abs(h) % AVATAR_TONES.length]
}

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function roundLabel(r: InterviewRow): string {
  if (r.round_label && r.round_label.trim()) return r.round_label
  if (r.round_number) return `R${r.round_number}`
  return "—"
}

function roundBucket(r: InterviewRow): RoundChip {
  const n = r.round_number ?? 0
  if (n === 1) return "R1"
  if (n === 2) return "R2"
  if (n >= 3) return "R3plus"
  return "R1"
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function HqInterviewsPage() {
  const [rows, setRows] = useState<InterviewRow[]>([])
  const [candidates, setCandidates] = useState<Record<string, CandidateRef>>({})
  const [roles, setRoles] = useState<Record<string, RoleRef>>({})
  const [loading, setLoading] = useState(true)

  const [tab, setTab] = useState<TabId>("all")
  const [formatChip, setFormatChip] = useState<FormatChip>("all")
  const [roundChip, setRoundChip] = useState<RoundChip>("all")

  // Row-action modals
  const [feedbackTarget, setFeedbackTarget] = useState<InterviewRow | null>(
    null,
  )
  const [rescheduleTarget, setRescheduleTarget] = useState<InterviewRow | null>(
    null,
  )
  const [cancelTarget, setCancelTarget] = useState<InterviewRow | null>(null)
  const [noShowTarget, setNoShowTarget] = useState<InterviewRow | null>(null)
  const [saving, setSaving] = useState(false)

  /* --------------------------- load --------------------------- */
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const intvRes = await supabaseHq
        .from("interviews")
        .select(
          "id, candidate_id, role_id, interviewer, scheduled_at, format, status, feedback_score, round_number, round_label, location, recommendation",
        )
        .order("scheduled_at", { ascending: false })

      if (cancelled) return
      if (intvRes.error) {
        toast.error(`Failed to load interviews: ${intvRes.error.message}`)
        setLoading(false)
        return
      }
      const list = (intvRes.data ?? []) as InterviewRow[]
      setRows(list)

      const candidateIds = Array.from(
        new Set(
          list.map((r) => r.candidate_id).filter((x): x is string => !!x),
        ),
      )
      const roleIds = Array.from(
        new Set(list.map((r) => r.role_id).filter((x): x is string => !!x)),
      )

      const [candRes, roleRes] = await Promise.all([
        candidateIds.length
          ? supabaseHq
              .from("candidates")
              .select("id, name")
              .in("id", candidateIds)
          : Promise.resolve({ data: [], error: null }),
        roleIds.length
          ? supabaseHq
              .from("job_roles")
              .select("id, title")
              .in("id", roleIds)
          : Promise.resolve({ data: [], error: null }),
      ])
      if (cancelled) return
      setCandidates(
        Object.fromEntries(
          ((candRes.data ?? []) as CandidateRef[]).map((c) => [c.id, c]),
        ),
      )
      setRoles(
        Object.fromEntries(
          ((roleRes.data ?? []) as RoleRef[]).map((r) => [r.id, r]),
        ),
      )
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  /* --------------------------- KPIs --------------------------- */
  const now = new Date()
  const today = startOfDay(now)
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

  const kpi = useMemo(() => {
    let scheduledToday = 0
    let scheduledTomorrow = 0
    let awaitingFeedback = 0
    let completedWeek = 0
    for (const r of rows) {
      if (!r.scheduled_at) continue
      const d = new Date(r.scheduled_at)
      if (r.status === "scheduled") {
        if (isSameDay(d, today)) scheduledToday++
        if (isSameDay(d, tomorrow)) scheduledTomorrow++
      }
      if (r.status === "completed" && r.feedback_score === null) {
        awaitingFeedback++
      }
      if (
        r.status === "completed" &&
        d.getTime() >= weekAgo.getTime() &&
        d.getTime() <= now.getTime()
      ) {
        completedWeek++
      }
    }
    return { scheduledToday, scheduledTomorrow, awaitingFeedback, completedWeek }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows])

  /* --------------------------- filters --------------------------- */
  const tabs = useMemo(() => {
    const count = {
      all: rows.length,
      today: 0,
      tomorrow: 0,
      this_week: 0,
      past: 0,
      cancelled: 0,
    }
    for (const r of rows) {
      if (r.status === "cancelled") count.cancelled++
      if (!r.scheduled_at) continue
      const d = new Date(r.scheduled_at)
      if (isSameDay(d, today)) count.today++
      if (isSameDay(d, tomorrow)) count.tomorrow++
      if (d.getTime() >= today.getTime() && d.getTime() <= weekFromNow.getTime()) {
        count.this_week++
      }
      if (d.getTime() < today.getTime()) count.past++
    }
    return [
      { id: "all" as const, label: "All", count: count.all },
      { id: "today" as const, label: "Today", count: count.today },
      { id: "tomorrow" as const, label: "Tomorrow", count: count.tomorrow },
      { id: "this_week" as const, label: "This week", count: count.this_week },
      { id: "past" as const, label: "Past", count: count.past },
      { id: "cancelled" as const, label: "Cancelled", count: count.cancelled },
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows])

  const visible = useMemo(() => {
    return rows.filter((r) => {
      // tab
      if (tab === "cancelled") {
        if (r.status !== "cancelled") return false
      } else if (tab !== "all") {
        if (!r.scheduled_at) return false
        const d = new Date(r.scheduled_at)
        if (tab === "today" && !isSameDay(d, today)) return false
        if (tab === "tomorrow" && !isSameDay(d, tomorrow)) return false
        if (
          tab === "this_week" &&
          (d.getTime() < today.getTime() || d.getTime() > weekFromNow.getTime())
        ) {
          return false
        }
        if (tab === "past" && d.getTime() >= today.getTime()) return false
      }
      // format chip
      if (formatChip !== "all" && r.format !== formatChip) {
        // also allow legacy "video" to match "video_call" chip
        if (!(formatChip === "video_call" && r.format === "video")) return false
      }
      // round chip
      if (roundChip !== "all" && roundBucket(r) !== roundChip) return false
      return true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, tab, formatChip, roundChip])

  /* --------------------------- mutations --------------------------- */

  async function updateInterview(
    id: string,
    patch: Partial<InterviewRow>,
    successMsg: string,
  ) {
    const original = rows
    setSaving(true)
    const now = new Date().toISOString()
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    )
    const { error } = await supabaseHq
      .from("interviews")
      .update({ ...patch, updated_at: now })
      .eq("id", id)
    setSaving(false)
    if (error) {
      setRows(original)
      toast.error(`Update failed: ${error.message}`)
      return false
    }
    toast.success(successMsg)
    return true
  }

  /* --------------------------- render --------------------------- */

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Interviews"
        subtitle="All scheduled, completed and cancelled interviews across open roles."
        actions={
          <Button size="sm" render={<Link href="/hq/hiring/candidates" />}>
            <Plus className="size-3.5" />
            Schedule
          </Button>
        }
      />

      <KPIGrid>
        <MetricCard
          label="Scheduled today"
          value={kpi.scheduledToday}
          icon={CalendarCheck}
          iconTone="blue"
        />
        <MetricCard
          label="Scheduled tomorrow"
          value={kpi.scheduledTomorrow}
          icon={CalendarClock}
          iconTone="violet"
        />
        <MetricCard
          label="Awaiting feedback"
          value={kpi.awaitingFeedback}
          icon={ClipboardCheck}
          iconTone="amber"
        />
        <MetricCard
          label="Completed this week"
          value={kpi.completedWeek}
          icon={CheckCircle2}
          iconTone="emerald"
        />
      </KPIGrid>

      <FilterBar
        tabs={tabs}
        activeTab={tab}
        onTabChange={(id) => setTab(id as TabId)}
        right={
          <>
            <ChipGroup
              label="Format"
              value={formatChip}
              options={[
                { id: "all", label: "All" },
                { id: "video_call", label: "Video" },
                { id: "in_person", label: "In-Person" },
                { id: "phone", label: "Phone" },
              ]}
              onChange={(v) => setFormatChip(v as FormatChip)}
            />
            <ChipGroup
              label="Round"
              value={roundChip}
              options={[
                { id: "all", label: "All" },
                { id: "R1", label: "R1" },
                { id: "R2", label: "R2" },
                { id: "R3plus", label: "R3+" },
              ]}
              onChange={(v) => setRoundChip(v as RoundChip)}
            />
          </>
        }
      />

      <DetailCard title="All interviews">
        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Loading interviews…
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Video}
            title="No interviews"
            description={
              rows.length === 0
                ? "Interviews will appear here once scheduled."
                : "No interviews match your current filters."
            }
          />
        ) : (
          <div className="overflow-x-auto -mx-5 -my-5">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border/80">
                <tr className="text-left">
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    Date &amp; time
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Candidate
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Role
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Interviewer
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Round
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Format
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Recommendation
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                    Feedback
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {visible.map((r) => {
                  const cand = r.candidate_id
                    ? candidates[r.candidate_id]
                    : undefined
                  const role = r.role_id ? roles[r.role_id] : undefined
                  const isToday = r.scheduled_at
                    ? isSameDay(new Date(r.scheduled_at), today)
                    : false
                  const name = cand?.name ?? "Candidate"
                  return (
                    <tr
                      key={r.id}
                      className={cn(
                        "hover:bg-muted/20 transition-colors align-middle",
                        isToday && "bg-amber-50/50",
                      )}
                    >
                      <td className="px-5 py-3 whitespace-nowrap tabular-nums text-foreground">
                        {formatDateTime(r.scheduled_at)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                              avatarTone(name),
                            )}
                          >
                            {formatInitials(name)}
                          </span>
                          {r.candidate_id ? (
                            <Link
                              href={`/hq/hiring/candidates/${r.candidate_id}?tab=interviews`}
                              className="font-medium text-foreground hover:underline"
                            >
                              {name}
                            </Link>
                          ) : (
                            <span className="font-medium text-foreground">
                              {name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-foreground whitespace-nowrap">
                        {role?.title ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-foreground whitespace-nowrap">
                        {r.interviewer ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-foreground whitespace-nowrap tabular-nums">
                        {roundLabel(r)}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        {r.format ? (
                          <StatusBadge tone={formatTone(r.format)}>
                            {FORMAT_LABEL[r.format] ?? r.format}
                          </StatusBadge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        {r.status ? (
                          <StatusBadge tone={interviewStatusTone(r.status)}>
                            {INTERVIEW_STATUS_LABEL[r.status] ?? r.status}
                          </StatusBadge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        {r.recommendation ? (
                          <StatusBadge tone={recommendationTone(r.recommendation)}>
                            {r.recommendation}
                          </StatusBadge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums font-medium text-foreground whitespace-nowrap">
                        {r.feedback_score !== null &&
                        r.feedback_score !== undefined
                          ? `${Number(r.feedback_score).toFixed(1)}/10`
                          : "—"}
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Row actions"
                              />
                            }
                          >
                            <MoreHorizontal className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setFeedbackTarget(r)}
                            >
                              Add feedback
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setRescheduleTarget(r)}
                            >
                              Reschedule
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setNoShowTarget(r)}
                            >
                              Mark no-show
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setCancelTarget(r)}
                            >
                              Cancel
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </DetailCard>

      {/* Feedback drawer */}
      {feedbackTarget && (
        <FeedbackDrawer
          row={feedbackTarget}
          saving={saving}
          onClose={() => setFeedbackTarget(null)}
          onSave={async (patch) => {
            const ok = await updateInterview(
              feedbackTarget.id,
              { ...patch, status: "completed" },
              "Feedback saved",
            )
            if (ok) setFeedbackTarget(null)
          }}
        />
      )}

      {/* Reschedule drawer */}
      {rescheduleTarget && (
        <RescheduleDrawer
          row={rescheduleTarget}
          saving={saving}
          onClose={() => setRescheduleTarget(null)}
          onSave={async (newIso) => {
            const ok = await updateInterview(
              rescheduleTarget.id,
              { scheduled_at: newIso, status: "scheduled" },
              "Interview rescheduled",
            )
            if (ok) setRescheduleTarget(null)
          }}
        />
      )}

      {/* Cancel confirm */}
      <ConfirmDialog
        open={!!cancelTarget}
        title="Cancel interview?"
        description="This sets the status to cancelled. You can re-schedule later."
        tone="destructive"
        confirmLabel="Cancel interview"
        cancelLabel="Keep"
        busy={saving}
        onCancel={() => setCancelTarget(null)}
        onConfirm={async () => {
          if (!cancelTarget) return
          const ok = await updateInterview(
            cancelTarget.id,
            { status: "cancelled" },
            "Interview cancelled",
          )
          if (ok) setCancelTarget(null)
        }}
      />

      {/* No-show confirm */}
      <ConfirmDialog
        open={!!noShowTarget}
        title="Mark as no-show?"
        description="Flags this interview as no_show."
        tone="destructive"
        confirmLabel="Mark no-show"
        cancelLabel="Keep"
        busy={saving}
        onCancel={() => setNoShowTarget(null)}
        onConfirm={async () => {
          if (!noShowTarget) return
          const ok = await updateInterview(
            noShowTarget.id,
            { status: "no_show" },
            "Marked as no-show",
          )
          if (ok) setNoShowTarget(null)
        }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  ChipGroup — local chip-toggle group (no <select>)                   */
/* ------------------------------------------------------------------ */

function ChipGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { id: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}:</span>
      <div className="flex items-center gap-1 flex-wrap">
        {options.map((o) => {
          const active = value === o.id
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              className={cn(
                "h-7 px-2.5 text-xs font-medium rounded-md transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  FeedbackDrawer                                                       */
/* ------------------------------------------------------------------ */

function FeedbackDrawer({
  row,
  saving,
  onClose,
  onSave,
}: {
  row: InterviewRow
  saving: boolean
  onClose: () => void
  onSave: (patch: Partial<InterviewRow>) => void | Promise<void>
}) {
  const [score, setScore] = useState<number>(
    row.feedback_score !== null && row.feedback_score !== undefined
      ? Number(row.feedback_score)
      : 5,
  )
  const [recommendation, setRecommendation] = useState<Recommendation | "">(
    (row.recommendation as Recommendation) ?? "",
  )
  const [notes, setNotes] = useState<string>("")

  return (
    <EditDrawer
      open
      onClose={onClose}
      title="Add feedback"
      subtitle="Capture a score and recommendation from this interview."
      size="md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={saving || !recommendation}
            onClick={() =>
              onSave({
                feedback_score: score,
                recommendation: recommendation || null,
              })
            }
          >
            {saving ? "Saving…" : "Save feedback"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">Score</label>
            <span className="text-sm font-semibold tabular-nums">
              {score.toFixed(1)} / 10
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={0.5}
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Recommendation
          </label>
          <div className="flex items-center gap-2">
            {(["proceed", "hold", "reject"] as Recommendation[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setRecommendation(v)}
                className={cn(
                  "h-8 px-3 rounded-md text-sm font-medium ring-1 ring-inset transition-colors capitalize",
                  recommendation === v
                    ? "bg-primary text-primary-foreground ring-primary"
                    : "bg-background text-foreground ring-border hover:bg-muted",
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            placeholder="What stood out? Strengths, concerns, next steps…"
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p className="text-xs text-muted-foreground">
            Notes are captured locally for now; the notes column will land when
            the interviews feedback log table ships.
          </p>
        </div>
      </div>
    </EditDrawer>
  )
}

/* ------------------------------------------------------------------ */
/*  RescheduleDrawer                                                     */
/* ------------------------------------------------------------------ */

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function RescheduleDrawer({
  row,
  saving,
  onClose,
  onSave,
}: {
  row: InterviewRow
  saving: boolean
  onClose: () => void
  onSave: (iso: string) => void | Promise<void>
}) {
  const [value, setValue] = useState<string>(toLocalInput(row.scheduled_at))
  const [error, setError] = useState<string | null>(null)

  return (
    <EditDrawer
      open
      onClose={onClose}
      title="Reschedule interview"
      subtitle="Pick a new date and time for this interview."
      size="md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={saving || !value}
            onClick={() => {
              const d = new Date(value)
              if (isNaN(d.getTime())) {
                setError("Invalid date")
                return
              }
              onSave(d.toISOString())
            }}
          >
            {saving ? "Saving…" : "Reschedule"}
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          New date &amp; time
        </label>
        <input
          type="datetime-local"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError(null)
          }}
          className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {error && (
          <p className="text-xs text-red-600 inline-flex items-center gap-1">
            <AlertTriangle className="size-3" /> {error}
          </p>
        )}
      </div>
    </EditDrawer>
  )
}
