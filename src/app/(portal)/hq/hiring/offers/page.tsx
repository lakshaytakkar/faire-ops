"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  FileCheck,
  FileText,
  Send,
  CheckCircle2,
  XCircle,
  Plus,
  MoreHorizontal,
  Clock,
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
import { formatDate, formatCurrency, formatInitials } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * Offers list — ATS spec §2.14.
 * Client component because row actions mutate hq.offers.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type OfferStatus = "draft" | "sent" | "accepted" | "declined" | "expired"

interface OfferRow {
  id: string
  candidate_id: string | null
  role_id: string | null
  offer_date: string | null
  ctc_offered: number | string | null
  currency: string | null
  joining_date: string | null
  deadline: string | null
  status: string | null
  response_date: string | null
  notes: string | null
}

interface CandidateRef {
  id: string
  name: string | null
}

interface RoleRef {
  id: string
  title: string | null
  vertical: string | null
}

type TabId = "all" | OfferStatus
type VerticalChip = string // "all" or vertical slug

/* ------------------------------------------------------------------ */
/*  Tone overrides                                                     */
/* ------------------------------------------------------------------ */

// StatusBadge defaults: cancelled/expired→red, accepted→emerald (via paid/approved? no).
// Spec requires: draft=slate, sent=blue, accepted=emerald, declined=red, expired=slate.
const OFFER_STATUS_TONE: Record<string, StatusTone> = {
  draft: "slate",
  sent: "blue",
  accepted: "emerald",
  declined: "red",
  expired: "slate",
}

const OFFER_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
}

function offerStatusTone(s: string | null | undefined): StatusTone {
  if (!s) return "slate"
  return OFFER_STATUS_TONE[s] ?? toneForStatus(s)
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

function currencySymbol(code: string | null | undefined): string {
  if (!code) return "₹"
  if (code.toUpperCase() === "USD") return "$"
  if (code.toUpperCase() === "INR") return "₹"
  if (code.toUpperCase() === "EUR") return "€"
  if (code.toUpperCase() === "GBP") return "£"
  return code + " "
}

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const d = startOfDay(new Date(dateStr))
  const today = startOfDay(new Date())
  const ms = d.getTime() - today.getTime()
  return Math.round(ms / (24 * 60 * 60 * 1000))
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function HqOffersPage() {
  const [rows, setRows] = useState<OfferRow[]>([])
  const [candidates, setCandidates] = useState<Record<string, CandidateRef>>({})
  const [roles, setRoles] = useState<Record<string, RoleRef>>({})
  const [loading, setLoading] = useState(true)

  const [tab, setTab] = useState<TabId>("all")
  const [verticalChip, setVerticalChip] = useState<VerticalChip>("all")

  // Row-action modals
  const [reviseTarget, setReviseTarget] = useState<OfferRow | null>(null)
  const [declineTarget, setDeclineTarget] = useState<OfferRow | null>(null)
  const [acceptTarget, setAcceptTarget] = useState<OfferRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [declineReason, setDeclineReason] = useState("")

  /* --------------------------- load --------------------------- */
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const offRes = await supabaseHq
        .from("offers")
        .select(
          "id, candidate_id, role_id, offer_date, ctc_offered, currency, joining_date, deadline, status, response_date, notes",
        )
        .order("offer_date", { ascending: false })

      if (cancelled) return
      if (offRes.error) {
        toast.error(`Failed to load offers: ${offRes.error.message}`)
        setLoading(false)
        return
      }
      const list = (offRes.data ?? []) as OfferRow[]
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
              .select("id, title, vertical")
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
  const kpi = useMemo(() => {
    let drafts = 0
    let sent = 0
    let accepted30 = 0
    let declined = 0
    const now = new Date()
    const thirty = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    for (const r of rows) {
      if (r.status === "draft") drafts++
      if (r.status === "sent") sent++
      if (r.status === "declined") declined++
      if (r.status === "accepted" && r.response_date) {
        const d = new Date(r.response_date)
        if (d.getTime() >= thirty.getTime()) accepted30++
      }
    }
    return { drafts, sent, accepted30, declined }
  }, [rows])

  /* --------------------------- filters --------------------------- */
  const tabs = useMemo(() => {
    const count = {
      all: rows.length,
      draft: 0,
      sent: 0,
      accepted: 0,
      declined: 0,
      expired: 0,
    }
    for (const r of rows) {
      if (r.status && r.status in count) {
        // @ts-expect-error dynamic key check
        count[r.status]++
      }
    }
    return [
      { id: "all" as const, label: "All", count: count.all },
      { id: "draft" as const, label: "Draft", count: count.draft },
      { id: "sent" as const, label: "Sent", count: count.sent },
      { id: "accepted" as const, label: "Accepted", count: count.accepted },
      { id: "declined" as const, label: "Declined", count: count.declined },
      { id: "expired" as const, label: "Expired", count: count.expired },
    ]
  }, [rows])

  const verticals = useMemo(() => {
    const set = new Set<string>()
    for (const id of Object.keys(roles)) {
      const v = roles[id].vertical
      if (v) set.add(v)
    }
    return Array.from(set).sort()
  }, [roles])

  const visible = useMemo(() => {
    return rows.filter((r) => {
      if (tab !== "all" && r.status !== tab) return false
      if (verticalChip !== "all") {
        const role = r.role_id ? roles[r.role_id] : undefined
        if (!role || role.vertical !== verticalChip) return false
      }
      return true
    })
  }, [rows, tab, verticalChip, roles])

  /* --------------------------- mutations --------------------------- */

  async function updateOffer(
    id: string,
    patch: Partial<OfferRow>,
    successMsg: string,
  ) {
    const original = rows
    setSaving(true)
    const nowIso = new Date().toISOString()
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    )
    const { error } = await supabaseHq
      .from("offers")
      .update({ ...patch, updated_at: nowIso })
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
        title="Offers"
        subtitle="All offers issued across open roles. Track status, deadlines and responses."
        actions={
          <Button size="sm" render={<Link href="/hq/hiring/candidates" />}>
            <Plus className="size-3.5" />
            New offer
          </Button>
        }
      />

      <KPIGrid>
        <MetricCard
          label="Drafts"
          value={kpi.drafts}
          icon={FileText}
          iconTone="slate"
        />
        <MetricCard
          label="Sent"
          value={kpi.sent}
          icon={Send}
          iconTone="blue"
        />
        <MetricCard
          label="Accepted (last 30d)"
          value={kpi.accepted30}
          icon={CheckCircle2}
          iconTone="emerald"
        />
        <MetricCard
          label="Declined"
          value={kpi.declined}
          icon={XCircle}
          iconTone="red"
        />
      </KPIGrid>

      <FilterBar
        tabs={tabs}
        activeTab={tab}
        onTabChange={(id) => setTab(id as TabId)}
        right={
          verticals.length > 0 ? (
            <ChipGroup
              label="Vertical"
              value={verticalChip}
              options={[
                { id: "all", label: "All" },
                ...verticals.map((v) => ({ id: v, label: v })),
              ]}
              onChange={(v) => setVerticalChip(v)}
            />
          ) : null
        }
      />

      <DetailCard title="All offers">
        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Loading offers…
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={FileCheck}
            title="No offers"
            description={
              rows.length === 0
                ? "Offers will appear here once they're drafted or sent."
                : "No offers match your current filters."
            }
          />
        ) : (
          <div className="overflow-x-auto -mx-5 -my-5">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border/80">
                <tr className="text-left">
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Candidate
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Role
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    Offer date
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                    CTC
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    Joining date
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    Deadline
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    Response date
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
                  const name = cand?.name ?? "Candidate"
                  const daysLeft = daysUntil(r.deadline)
                  const deadlineTone =
                    daysLeft === null
                      ? "text-muted-foreground"
                      : daysLeft < 0
                      ? "text-red-700 font-semibold"
                      : daysLeft <= 7
                      ? "text-amber-700 font-semibold"
                      : "text-foreground"
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-muted/20 transition-colors align-middle"
                    >
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
                              href={`/hq/hiring/candidates/${r.candidate_id}?tab=offer`}
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
                      <td className="px-5 py-3 text-foreground whitespace-nowrap tabular-nums">
                        {formatDate(r.offer_date)}
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap tabular-nums font-semibold text-foreground">
                        {r.ctc_offered !== null && r.ctc_offered !== undefined
                          ? formatCurrency(
                              r.ctc_offered,
                              currencySymbol(r.currency),
                            )
                          : "—"}
                      </td>
                      <td className="px-5 py-3 text-foreground whitespace-nowrap tabular-nums">
                        {formatDate(r.joining_date)}
                      </td>
                      <td
                        className={cn(
                          "px-5 py-3 whitespace-nowrap tabular-nums",
                          deadlineTone,
                        )}
                      >
                        {formatDate(r.deadline)}
                        {daysLeft !== null && (
                          <span className="ml-1.5 text-xs">
                            {daysLeft < 0
                              ? `(${Math.abs(daysLeft)}d ago)`
                              : daysLeft === 0
                              ? "(today)"
                              : `(${daysLeft}d)`}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        {r.status ? (
                          <StatusBadge tone={offerStatusTone(r.status)}>
                            {OFFER_STATUS_LABEL[r.status] ?? r.status}
                          </StatusBadge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap tabular-nums">
                        {formatDate(r.response_date)}
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
                              onClick={() =>
                                toast.info(
                                  "Offer letter PDF generation will be wired in the next phase.",
                                )
                              }
                            >
                              Generate offer letter
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={async () => {
                                await updateOffer(
                                  r.id,
                                  { status: "sent" },
                                  "Offer marked as sent",
                                )
                              }}
                            >
                              Send
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setAcceptTarget(r)}
                            >
                              Mark accepted
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => {
                                setDeclineReason("")
                                setDeclineTarget(r)
                              }}
                            >
                              Mark declined
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setReviseTarget(r)}
                            >
                              Revise
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

      {/* Revise drawer */}
      {reviseTarget && (
        <ReviseDrawer
          row={reviseTarget}
          saving={saving}
          onClose={() => setReviseTarget(null)}
          onSave={async (patch) => {
            const ok = await updateOffer(reviseTarget.id, patch, "Offer revised")
            if (ok) setReviseTarget(null)
          }}
        />
      )}

      {/* Accept confirm */}
      <ConfirmDialog
        open={!!acceptTarget}
        title="Mark offer as accepted?"
        description="Sets status to accepted and stamps today as the response date."
        confirmLabel="Mark accepted"
        busy={saving}
        onCancel={() => setAcceptTarget(null)}
        onConfirm={async () => {
          if (!acceptTarget) return
          const today = new Date().toISOString().slice(0, 10)
          const ok = await updateOffer(
            acceptTarget.id,
            { status: "accepted", response_date: today },
            "Offer accepted",
          )
          if (ok) setAcceptTarget(null)
        }}
      />

      {/* Decline drawer — needs a reason input so use EditDrawer */}
      {declineTarget && (
        <EditDrawer
          open
          onClose={() => setDeclineTarget(null)}
          title="Mark offer as declined"
          subtitle="Capture the reason so we can learn from it."
          size="md"
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeclineTarget(null)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={saving}
                onClick={async () => {
                  if (!declineTarget) return
                  const today = new Date().toISOString().slice(0, 10)
                  const ok = await updateOffer(
                    declineTarget.id,
                    {
                      status: "declined",
                      response_date: today,
                      notes: declineReason.trim()
                        ? [declineTarget.notes, `Declined: ${declineReason.trim()}`]
                            .filter(Boolean)
                            .join("\n")
                        : declineTarget.notes,
                    },
                    "Offer marked declined",
                  )
                  if (ok) setDeclineTarget(null)
                }}
              >
                {saving ? "Saving…" : "Mark declined"}
              </Button>
            </>
          }
        >
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Reason
            </label>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={5}
              placeholder="Why was the offer declined? Comp, timing, counter-offer…"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </EditDrawer>
      )}
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
                "h-7 px-2.5 text-xs font-medium rounded-md transition-colors capitalize",
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
/*  ReviseDrawer                                                         */
/* ------------------------------------------------------------------ */

function ReviseDrawer({
  row,
  saving,
  onClose,
  onSave,
}: {
  row: OfferRow
  saving: boolean
  onClose: () => void
  onSave: (patch: Partial<OfferRow>) => void | Promise<void>
}) {
  const [ctc, setCtc] = useState<string>(
    row.ctc_offered !== null && row.ctc_offered !== undefined
      ? String(row.ctc_offered)
      : "",
  )
  const [joining, setJoining] = useState<string>(row.joining_date ?? "")
  const [deadline, setDeadline] = useState<string>(row.deadline ?? "")

  return (
    <EditDrawer
      open
      onClose={onClose}
      title="Revise offer"
      subtitle="Update CTC, joining date, or deadline."
      size="md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={saving}
            onClick={() => {
              const patch: Partial<OfferRow> = {}
              if (ctc.trim()) {
                const n = Number(ctc)
                if (!isNaN(n)) patch.ctc_offered = n
              }
              if (joining) patch.joining_date = joining
              if (deadline) patch.deadline = deadline
              onSave(patch)
            }}
          >
            {saving ? "Saving…" : "Save revision"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            CTC ({row.currency ?? "INR"})
          </label>
          <input
            type="number"
            inputMode="decimal"
            value={ctc}
            onChange={(e) => setCtc(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Joining date
          </label>
          <input
            type="date"
            value={joining}
            onChange={(e) => setJoining(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground inline-flex items-center gap-1.5">
            <Clock className="size-3.5" />
            Response deadline
          </label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>
    </EditDrawer>
  )
}
