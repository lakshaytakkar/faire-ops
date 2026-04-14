"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { UserCircle, UserPlus, Upload, Star, ChevronDown } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { FilterBar } from "@/components/shared/filter-bar"
import { DetailCard } from "@/components/shared/detail-views"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { supabaseHq } from "@/lib/supabase"
import { formatInitials, relativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * Candidate list — ATS spec §2.11.
 * Client component because row-level stage mutations need optimistic UI.
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

const SOURCES = [
  "LinkedIn",
  "Referral",
  "Direct",
  "Instagram",
  "Internshala",
  "Other",
] as const
type Source = (typeof SOURCES)[number]

interface Role {
  id: string
  title: string
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
  last_activity_at: string | null
  next_action: string | null
}

function StarRating({ rating }: { rating: number | null }) {
  const r = rating ?? 0
  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`Rating ${r}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "size-3.5",
            i <= r ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30",
          )}
        />
      ))}
    </div>
  )
}

function AvatarInitials({ name }: { name: string }) {
  return (
    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
      {formatInitials(name)}
    </span>
  )
}

export default function HqCandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)

  const [q, setQ] = useState("")
  const [stageTab, setStageTab] = useState<Stage | "all">("all")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [sourceFilter, setSourceFilter] = useState<Source | "all">("all")
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const [candRes, roleRes] = await Promise.all([
        supabaseHq
          .from("candidates")
          .select(
            "id, role_id, name, email, phone, stage, source, skill_match, rating, last_activity_at, next_action",
          ),
        supabaseHq.from("job_roles").select("id, title").order("title"),
      ])
      if (cancelled) return
      if (candRes.error) {
        toast.error(`Failed to load candidates: ${candRes.error.message}`)
      } else {
        setCandidates((candRes.data ?? []) as Candidate[])
      }
      if (!roleRes.error) {
        setRoles((roleRes.data ?? []) as Role[])
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

  const counts = useMemo(() => {
    const inInterviews = candidates.filter(
      (c) => c.stage === "interview_1" || c.stage === "interview_2",
    ).length
    const byStage: Record<Stage, number> = {
      applied: 0,
      screened: 0,
      assessment: 0,
      interview_1: 0,
      interview_2: 0,
      offer: 0,
      hired: 0,
      rejected: 0,
    }
    for (const c of candidates) byStage[c.stage] = (byStage[c.stage] ?? 0) + 1
    return {
      applied: byStage.applied,
      screened: byStage.screened,
      inInterviews,
      offered: byStage.offer,
      byStage,
      total: candidates.length,
    }
  }, [candidates])

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return candidates
      .filter((c) => {
        if (stageTab !== "all" && c.stage !== stageTab) return false
        if (roleFilter !== "all" && c.role_id !== roleFilter) return false
        if (sourceFilter !== "all" && (c.source ?? "") !== sourceFilter) return false
        if (needle) {
          const hay = `${c.name} ${c.email ?? ""}`.toLowerCase()
          if (!hay.includes(needle)) return false
        }
        return true
      })
      .sort((a, b) => {
        const aa = a.last_activity_at ? new Date(a.last_activity_at).getTime() : 0
        const bb = b.last_activity_at ? new Date(b.last_activity_at).getTime() : 0
        return bb - aa
      })
  }, [candidates, q, stageTab, roleFilter, sourceFilter])

  async function moveStage(candidate: Candidate, next: Stage) {
    if (next === candidate.stage) return
    const original = candidates
    setUpdatingId(candidate.id)
    const now = new Date().toISOString()
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === candidate.id
          ? { ...c, stage: next, last_activity_at: now }
          : c,
      ),
    )

    const upd = await supabaseHq
      .from("candidates")
      .update({ stage: next, last_activity_at: now })
      .eq("id", candidate.id)

    if (upd.error) {
      setCandidates(original)
      setUpdatingId(null)
      toast.error(`Could not move stage: ${upd.error.message}`)
      return
    }

    const log = await supabaseHq.from("candidate_stages").insert({
      candidate_id: candidate.id,
      from_stage: candidate.stage,
      to_stage: next,
      changed_at: now,
      changed_by: "admin@suprans",
      note: null,
    })

    setUpdatingId(null)
    if (log.error) {
      toast.warning(
        `Stage moved but history log failed: ${log.error.message}`,
      )
      return
    }
    toast.success(`Moved to ${STAGE_LABEL[next]}`)
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Candidates"
        subtitle="All candidates across open roles. Move stage inline or open a profile for the full timeline."
        actions={
          <>
            <Button variant="outline" disabled>
              <Upload className="size-3.5" />
              Import CSV
            </Button>
            <Button disabled>
              <UserPlus className="size-3.5" />
              Add Candidate
            </Button>
          </>
        }
      />

      <KPIGrid>
        <MetricCard
          label="Applied"
          value={counts.applied}
          icon={UserCircle}
          iconTone="blue"
        />
        <MetricCard
          label="Screened"
          value={counts.screened}
          icon={UserCircle}
          iconTone="violet"
        />
        <MetricCard
          label="In interviews"
          value={counts.inInterviews}
          icon={UserCircle}
          iconTone="amber"
        />
        <MetricCard
          label="Offered"
          value={counts.offered}
          icon={UserCircle}
          iconTone="emerald"
        />
      </KPIGrid>

      <FilterBar
        search={{
          value: q,
          onChange: setQ,
          placeholder: "Search name or email...",
        }}
        tabs={[
          { id: "all", label: "All", count: counts.total },
          ...STAGES.map((s) => ({
            id: s,
            label: STAGE_LABEL[s],
            count: counts.byStage[s],
          })),
        ]}
        activeTab={stageTab}
        onTabChange={(id) => setStageTab(id as Stage | "all")}
        right={
          <>
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
            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => setSourceFilter("all")}
                className={cn(
                  "h-7 px-2.5 text-xs font-medium rounded-md transition-colors",
                  sourceFilter === "all"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                All sources
              </button>
              {SOURCES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSourceFilter(s)}
                  className={cn(
                    "h-7 px-2.5 text-xs font-medium rounded-md transition-colors",
                    sourceFilter === s
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        }
      />

      <DetailCard title="All candidates">
        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Loading candidates…
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={UserCircle}
            title="No candidates"
            description={
              candidates.length === 0
                ? "No candidates have applied yet."
                : "No candidates match your current filters."
            }
          />
        ) : (
          <div className="overflow-x-auto -mx-5 -my-5">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border/80">
                <tr className="text-left">
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Name
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Role
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Source
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Stage
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                    Skill match
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Rating
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    Last activity
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Next action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {visible.map((c) => {
                  const role = c.role_id ? roleById.get(c.role_id) : undefined
                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-muted/20 transition-colors align-middle"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <AvatarInitials name={c.name} />
                          <div className="min-w-0">
                            <Link
                              href={`/hq/people/ats/candidates/${c.id}`}
                              className="font-medium text-foreground hover:underline"
                            >
                              {c.name}
                            </Link>
                            {c.email && (
                              <div className="text-xs text-muted-foreground truncate max-w-[18rem]">
                                {c.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-foreground whitespace-nowrap">
                        {role?.title ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                        {c.source ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        <div className="inline-flex items-center gap-1.5 relative">
                          <StatusBadge tone={toneForStatus(c.stage)}>
                            {STAGE_LABEL[c.stage]}
                          </StatusBadge>
                          <div className="relative">
                            <select
                              aria-label="Move stage"
                              disabled={updatingId === c.id}
                              value={c.stage}
                              onChange={(e) =>
                                moveStage(c, e.target.value as Stage)
                              }
                              className="h-6 pl-1.5 pr-5 text-[11px] rounded-md border border-input bg-transparent appearance-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {STAGES.map((s) => (
                                <option key={s} value={s}>
                                  {STAGE_LABEL[s]}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums font-medium text-foreground whitespace-nowrap">
                        {c.skill_match !== null ? `${c.skill_match}%` : "—"}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <StarRating rating={c.rating} />
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">
                        {relativeTime(c.last_activity_at)}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground max-w-[18rem] truncate">
                        {c.next_action ?? "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </DetailCard>
    </div>
  )
}
