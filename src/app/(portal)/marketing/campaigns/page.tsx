"use client"

import { useState, useMemo, useCallback } from "react"
import Link from "next/link"
import {
  Plus,
  Search,
  Target,
  MoreHorizontal,
  Eye,
  Pencil,
  Copy,
  Pause,
  Play,
  Archive,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import {
  useCampaigns,
  formatCents,
  formatCompact,
  statusColor,
  OBJECTIVES,
  OBJECTIVE_LABELS,
  type MetaCampaign,
} from "@/lib/use-marketing-data"

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 20

type Tab = "ALL" | "ACTIVE" | "PAUSED" | "ARCHIVED"

const TABS: { key: Tab; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "PAUSED", label: "Paused" },
  { key: "ARCHIVED", label: "Archived" },
]

type SortKey = "name" | "objective" | "status" | "budget_cents" | "spend_cents" | "roas" | "conversions"

/* ------------------------------------------------------------------ */
/*  Skeleton                                                            */
/* ------------------------------------------------------------------ */

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />
}

function TableRowSkeleton() {
  return (
    <tr className="border-b border-border/50">
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  )
}

/* ------------------------------------------------------------------ */
/*  Create Campaign Modal                                               */
/* ------------------------------------------------------------------ */

interface CreateForm {
  name: string
  objective: string
  budget_type: string
  budget_cents: string
  start_date: string
  end_date: string
  notes: string
}

const emptyForm: CreateForm = {
  name: "",
  objective: OBJECTIVES[0],
  budget_type: "daily",
  budget_cents: "",
  start_date: "",
  end_date: "",
  notes: "",
}

function CreateCampaignModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [form, setForm] = useState<CreateForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  function set<K extends keyof CreateForm>(key: K, val: CreateForm[K]) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError("Name is required")
      return
    }
    const budgetNum = Math.round(parseFloat(form.budget_cents || "0") * 100)
    if (budgetNum <= 0) {
      setError("Budget must be greater than 0")
      return
    }

    setSaving(true)
    setError("")

    const { error: dbErr } = await supabase.from("meta_campaigns").insert({
      name: form.name.trim(),
      objective: form.objective,
      budget_type: form.budget_type,
      budget_cents: budgetNum,
      status: "PAUSED",
      buying_type: "AUCTION",
      spend_cents: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      revenue_cents: 0,
      ctr: 0,
      cpc_cents: 0,
      roas: 0,
      tags: [],
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      notes: form.notes.trim() || null,
    })

    setSaving(false)

    if (dbErr) {
      setError(dbErr.message)
      return
    }

    setForm(emptyForm)
    onCreated()
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card rounded-lg border border-border/80 shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-5 py-3.5 border-b">
          <span className="text-[0.9375rem] font-semibold tracking-tight">
            Create Campaign
          </span>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Campaign Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Summer Sale 2026"
              className="w-full rounded-md border px-3 py-2 text-sm bg-background"
            />
          </div>

          {/* Objective */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Objective
            </label>
            <select
              value={form.objective}
              onChange={(e) => set("objective", e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm bg-background"
            >
              {OBJECTIVES.map((o) => (
                <option key={o} value={o}>
                  {OBJECTIVE_LABELS[o]}
                </option>
              ))}
            </select>
          </div>

          {/* Budget type + amount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Budget Type
              </label>
              <select
                value={form.budget_type}
                onChange={(e) => set("budget_type", e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm bg-background"
              >
                <option value="daily">Daily</option>
                <option value="lifetime">Lifetime</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Budget ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.budget_cents}
                onChange={(e) => set("budget_cents", e.target.value)}
                placeholder="100.00"
                className="w-full rounded-md border px-3 py-2 text-sm bg-background"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => set("start_date", e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm bg-background"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                End Date
              </label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => set("end_date", e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm bg-background"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              placeholder="Optional notes..."
              className="w-full rounded-md border px-3 py-2 text-sm bg-background resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create Campaign"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Actions dropdown                                                    */
/* ------------------------------------------------------------------ */

function ActionsDropdown({
  campaign,
  onAction,
}: {
  campaign: MetaCampaign
  onAction: (action: string, campaign: MetaCampaign) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-1 rounded hover:bg-muted transition-colors"
      >
        <MoreHorizontal className="size-4 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-50 w-44 rounded-lg border border-border/80 bg-card shadow-lg py-1">
            <Link
              href={`/marketing/campaigns/${campaign.id}`}
              className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted transition-colors w-full"
              onClick={() => setOpen(false)}
            >
              <Eye className="size-3.5" /> View
            </Link>
            <button
              onClick={() => { onAction("edit", campaign); setOpen(false) }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted transition-colors w-full text-left"
            >
              <Pencil className="size-3.5" /> Edit
            </button>
            <button
              onClick={() => { onAction("duplicate", campaign); setOpen(false) }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted transition-colors w-full text-left"
            >
              <Copy className="size-3.5" /> Duplicate
            </button>
            <button
              onClick={() => { onAction("toggle", campaign); setOpen(false) }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted transition-colors w-full text-left"
            >
              {campaign.status === "ACTIVE" ? (
                <><Pause className="size-3.5" /> Pause</>
              ) : (
                <><Play className="size-3.5" /> Activate</>
              )}
            </button>
            <button
              onClick={() => { onAction("archive", campaign); setOpen(false) }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left"
            >
              <Archive className="size-3.5" /> Archive
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                           */
/* ------------------------------------------------------------------ */

export default function CampaignsPage() {
  const { campaigns, loading, refetch } = useCampaigns()
  const [tab, setTab] = useState<Tab>("ALL")
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("spend_cents")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)

  /* Counts by status */
  const counts = useMemo(() => {
    const c = { ALL: campaigns.length, ACTIVE: 0, PAUSED: 0, ARCHIVED: 0 }
    for (const camp of campaigns) {
      if (camp.status === "ACTIVE") c.ACTIVE++
      else if (camp.status === "PAUSED") c.PAUSED++
      else if (camp.status === "ARCHIVED") c.ARCHIVED++
    }
    return c
  }, [campaigns])

  /* Filter + search */
  const filtered = useMemo(() => {
    let list = campaigns
    if (tab !== "ALL") list = list.filter((c) => c.status === tab)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (OBJECTIVE_LABELS[c.objective] ?? c.objective).toLowerCase().includes(q)
      )
    }
    return list
  }, [campaigns, tab, search])

  /* Sort */
  const sorted = useMemo(() => {
    const list = [...filtered]
    list.sort((a, b) => {
      let av: string | number = a[sortKey] as string | number
      let bv: string | number = b[sortKey] as string | number
      if (sortKey === "name") {
        av = (av as string).toLowerCase()
        bv = (bv as string).toLowerCase()
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1
      if (av > bv) return sortDir === "asc" ? 1 : -1
      return 0
    })
    return list
  }, [filtered, sortKey, sortDir])

  /* Paginate */
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else {
      setSortKey(key)
      setSortDir("desc")
    }
    setPage(0)
  }

  function SortHeader({ col, label, align = "left" }: { col: SortKey; label: string; align?: string }) {
    return (
      <th
        className={`px-4 py-3 text-${align} text-xs font-medium text-muted-foreground uppercase tracking-wide cursor-pointer select-none hover:text-foreground transition-colors`}
        onClick={() => toggleSort(col)}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          {sortKey === col && (
            <span className="text-primary">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>
          )}
        </span>
      </th>
    )
  }

  /* Actions handler */
  const handleAction = useCallback(
    async (action: string, campaign: MetaCampaign) => {
      if (action === "toggle") {
        const newStatus = campaign.status === "ACTIVE" ? "PAUSED" : "ACTIVE"
        await supabase
          .from("meta_campaigns")
          .update({ status: newStatus })
          .eq("id", campaign.id)
        refetch()
      } else if (action === "archive") {
        await supabase
          .from("meta_campaigns")
          .update({ status: "ARCHIVED" })
          .eq("id", campaign.id)
        refetch()
      } else if (action === "duplicate") {
        const { id, created_at, updated_at, ...rest } = campaign
        await supabase.from("meta_campaigns").insert({
          ...rest,
          name: `${campaign.name} (Copy)`,
          status: "PAUSED",
          spend_cents: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          revenue_cents: 0,
          ctr: 0,
          cpc_cents: 0,
          roas: 0,
        })
        refetch()
      }
    },
    [refetch]
  )

  /* Loading */
  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-36" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20" />
          ))}
        </div>
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="p-4 space-y-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <TableRowSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="size-4 mr-1.5" /> Create Campaign
        </Button>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setPage(0) }}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                tab === t.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {t.label}
              <span className="ml-1.5 text-xs opacity-70">{counts[t.key]}</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            className="w-full rounded-md border px-3 py-2 pl-9 text-sm bg-background"
          />
        </div>
      </div>

      {/* Table */}
      {paged.length === 0 ? (
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex items-center justify-center size-12 rounded-full bg-muted mb-4">
              <Target className="size-6 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">
              No campaigns found
            </h3>
            <p className="text-xs text-muted-foreground max-w-xs mb-4">
              {search ? "Try adjusting your search or filters." : "Create your first campaign to get started."}
            </p>
            {!search && (
              <Button onClick={() => setModalOpen(true)} size="sm">
                <Plus className="size-3.5 mr-1" /> Create Campaign
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60">
                  <SortHeader col="name" label="Name" />
                  <SortHeader col="objective" label="Objective" />
                  <SortHeader col="status" label="Status" />
                  <SortHeader col="budget_cents" label="Budget" align="right" />
                  <SortHeader col="spend_cents" label="Spend" align="right" />
                  <SortHeader col="roas" label="ROAS" align="right" />
                  <SortHeader col="conversions" label="Conv." align="right" />
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paged.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-border/40 hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/marketing/campaigns/${c.id}`}
                        className="font-medium text-foreground hover:text-primary transition-colors max-w-[200px] truncate block"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {OBJECTIVE_LABELS[c.objective] ?? c.objective}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(c.status)}`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                      ${formatCents(c.budget_cents)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                      ${formatCents(c.spend_cents)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                      {c.roas.toFixed(2)}x
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                      {formatCompact(c.conversions)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ActionsDropdown campaign={c} onAction={handleAction} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/60">
              <span className="text-xs text-muted-foreground">
                Showing {page * PAGE_SIZE + 1}
                {"\u2013"}
                {Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="xs"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <Button
                    key={i}
                    variant={i === page ? "default" : "outline"}
                    size="xs"
                    onClick={() => setPage(i)}
                  >
                    {i + 1}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="xs"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      <CreateCampaignModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={refetch}
      />
    </div>
  )
}
