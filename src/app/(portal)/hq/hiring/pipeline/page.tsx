"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Star, Workflow } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { supabaseHq } from "@/lib/supabase"
import { formatInitials, relativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * Pipeline kanban — ATS spec §2.12.
 * One column per stage (rejected excluded). Drag-and-drop via HTML5
 * drag API (no new deps). Drop triggers optimistic stage move plus
 * candidate_stages insert; revert on error.
 */

type Stage =
  | "applied"
  | "screened"
  | "assessment"
  | "interview_1"
  | "interview_2"
  | "offer"
  | "hired"
  | "rejected"

const BOARD_STAGES: Stage[] = [
  "applied",
  "screened",
  "assessment",
  "interview_1",
  "interview_2",
  "offer",
  "hired",
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

const STAGE_ACCENT: Record<Stage, string> = {
  applied: "border-t-blue-400",
  screened: "border-t-violet-400",
  assessment: "border-t-amber-400",
  interview_1: "border-t-amber-500",
  interview_2: "border-t-amber-600",
  offer: "border-t-emerald-400",
  hired: "border-t-emerald-600",
  rejected: "border-t-red-400",
}

interface Role {
  id: string
  title: string
}

interface Candidate {
  id: string
  role_id: string | null
  name: string
  stage: Stage
  rating: number | null
  last_activity_at: string | null
  created_at: string | null
}

interface StageLog {
  candidate_id: string
  to_stage: string
  changed_at: string
}

function StarRow({ rating }: { rating: number | null }) {
  const r = rating ?? 0
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "size-3",
            i <= r ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30",
          )}
        />
      ))}
    </span>
  )
}

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime()
  return Math.max(0, Math.floor(ms / 86_400_000))
}

export default function HqPipelinePage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [lastStageBy, setLastStageBy] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<Stage | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const [candRes, roleRes, stageRes] = await Promise.all([
        supabaseHq
          .from("candidates")
          .select(
            "id, role_id, name, stage, rating, last_activity_at, created_at",
          ),
        supabaseHq.from("job_roles").select("id, title").order("title"),
        supabaseHq
          .from("candidate_stages")
          .select("candidate_id, to_stage, changed_at"),
      ])
      if (cancelled) return
      if (candRes.error) {
        toast.error(`Failed to load pipeline: ${candRes.error.message}`)
      } else {
        setCandidates((candRes.data ?? []) as Candidate[])
      }
      if (!roleRes.error) setRoles((roleRes.data ?? []) as Role[])

      if (!stageRes.error) {
        const latest: Record<string, string> = {}
        for (const row of (stageRes.data ?? []) as StageLog[]) {
          const existing = latest[row.candidate_id]
          if (!existing || existing < row.changed_at) {
            latest[row.candidate_id] = row.changed_at
          }
        }
        setLastStageBy(latest)
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const roleById = useMemo(() => {
    const m = new Map<string, Role>()
    for (const r of roles) m.set(r.id, r)
    return m
  }, [roles])

  const visible = useMemo(() => {
    return candidates.filter((c) => {
      if (c.stage === "rejected") return false
      if (roleFilter !== "all" && c.role_id !== roleFilter) return false
      return true
    })
  }, [candidates, roleFilter])

  const byStage = useMemo(() => {
    const groups: Record<Stage, Candidate[]> = {
      applied: [],
      screened: [],
      assessment: [],
      interview_1: [],
      interview_2: [],
      offer: [],
      hired: [],
      rejected: [],
    }
    for (const c of visible) groups[c.stage].push(c)
    for (const s of BOARD_STAGES) {
      groups[s].sort((a, b) => {
        const aa = a.last_activity_at ? new Date(a.last_activity_at).getTime() : 0
        const bb = b.last_activity_at ? new Date(b.last_activity_at).getTime() : 0
        return bb - aa
      })
    }
    return groups
  }, [visible])

  function daysInStage(c: Candidate): number {
    const stamp =
      lastStageBy[c.id] ?? c.last_activity_at ?? c.created_at ?? null
    if (!stamp) return 0
    const from = new Date(stamp)
    if (Number.isNaN(from.getTime())) return 0
    return daysBetween(from, new Date())
  }

  async function handleDrop(targetStage: Stage, candidateId: string) {
    setDragOverStage(null)
    setDragId(null)
    const cand = candidates.find((c) => c.id === candidateId)
    if (!cand || cand.stage === targetStage) return

    const original = candidates
    const originalStageStamps = lastStageBy
    const now = new Date().toISOString()
    setUpdatingId(candidateId)
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === candidateId
          ? { ...c, stage: targetStage, last_activity_at: now }
          : c,
      ),
    )
    setLastStageBy((prev) => ({ ...prev, [candidateId]: now }))

    const upd = await supabaseHq
      .from("candidates")
      .update({ stage: targetStage, last_activity_at: now })
      .eq("id", candidateId)

    if (upd.error) {
      setCandidates(original)
      setLastStageBy(originalStageStamps)
      setUpdatingId(null)
      toast.error(`Could not move card: ${upd.error.message}`)
      return
    }

    const logRes = await supabaseHq.from("candidate_stages").insert({
      candidate_id: candidateId,
      from_stage: cand.stage,
      to_stage: targetStage,
      changed_at: now,
      changed_by: "admin@suprans",
      note: null,
    })
    setUpdatingId(null)
    if (logRes.error) {
      toast.warning(`Moved but log failed: ${logRes.error.message}`)
      return
    }
    toast.success(`Moved to ${STAGE_LABEL[targetStage]}`)
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Pipeline"
        subtitle="Drag candidates across stages. Rejected candidates are hidden from the board."
        actions={
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-8 rounded-md border border-input bg-transparent px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">All roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
        }
      />

      {loading ? (
        <div className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">
          Loading pipeline…
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Workflow}
          title="Pipeline is empty"
          description={
            candidates.length === 0
              ? "No candidates yet. Add one from the Candidates page."
              : "No candidates match the current role filter."
          }
        />
      ) : (
        <div className="overflow-x-auto -mx-4 px-4 pb-2">
          <div className="flex gap-3 min-w-max">
            {BOARD_STAGES.map((stage) => {
              const cards = byStage[stage]
              const isOver = dragOverStage === stage
              return (
                <div
                  key={stage}
                  onDragOver={(e) => {
                    if (!dragId) return
                    e.preventDefault()
                    e.dataTransfer.dropEffect = "move"
                    if (dragOverStage !== stage) setDragOverStage(stage)
                  }}
                  onDragLeave={(e) => {
                    // Only clear if we left the column entirely
                    const related = e.relatedTarget as Node | null
                    if (
                      related &&
                      e.currentTarget.contains(related)
                    ) {
                      return
                    }
                    if (dragOverStage === stage) setDragOverStage(null)
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    const id = e.dataTransfer.getData("text/candidate-id")
                    if (id) handleDrop(stage, id)
                  }}
                  className={cn(
                    "w-72 shrink-0 rounded-lg border bg-muted/30 border-t-4 flex flex-col transition-colors",
                    STAGE_ACCENT[stage],
                    isOver ? "bg-primary/5 ring-2 ring-primary/40" : "",
                  )}
                >
                  <div className="px-3 py-2.5 flex items-center justify-between border-b border-border/80">
                    <span className="text-sm font-semibold">
                      {STAGE_LABEL[stage]}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground tabular-nums">
                      {cards.length}
                    </span>
                  </div>
                  <div className="p-2 space-y-2 min-h-[6rem] flex-1">
                    {cards.length === 0 ? (
                      <div className="text-xs text-muted-foreground text-center py-6">
                        No candidates
                      </div>
                    ) : (
                      cards.map((c) => {
                        const role = c.role_id ? roleById.get(c.role_id) : null
                        const days = daysInStage(c)
                        const isDragging = dragId === c.id
                        const isUpdating = updatingId === c.id
                        return (
                          <div
                            key={c.id}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.effectAllowed = "move"
                              e.dataTransfer.setData(
                                "text/candidate-id",
                                c.id,
                              )
                              setDragId(c.id)
                            }}
                            onDragEnd={() => {
                              setDragId(null)
                              setDragOverStage(null)
                            }}
                            className={cn(
                              "rounded-md border border-border/80 bg-card p-3 shadow-sm cursor-grab active:cursor-grabbing transition-all",
                              isDragging && "opacity-50",
                              isUpdating && "opacity-60",
                              "hover:shadow-md",
                            )}
                          >
                            <div className="flex items-start gap-2">
                              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                                {formatInitials(c.name)}
                              </span>
                              <div className="min-w-0 flex-1">
                                <Link
                                  href={`/hq/hiring/candidates/${c.id}`}
                                  className="block text-sm font-medium text-foreground hover:underline truncate"
                                  onClick={(e) => {
                                    if (dragId) e.preventDefault()
                                  }}
                                >
                                  {c.name}
                                </Link>
                                {role?.title && (
                                  <div className="text-xs text-muted-foreground truncate">
                                    {role.title}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <StarRow rating={c.rating} />
                              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground tabular-nums">
                                {days}d in stage
                              </span>
                            </div>
                            <div className="mt-1 text-[11px] text-muted-foreground">
                              {relativeTime(c.last_activity_at)}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
