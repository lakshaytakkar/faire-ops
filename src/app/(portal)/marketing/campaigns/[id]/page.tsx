"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Eye,
  MousePointerClick,
  Percent,
  ShoppingCart,
  TrendingUp,
  Pencil,
  Copy,
  Archive,
  Play,
  Pause,
  Save,
  X,
  Layers,
  Settings,
  LineChart,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabaseB2B } from "@/lib/supabase"
import {
  useCampaign,
  useCampaigns,
  useAdSets,
  useAdReports,
  formatCents,
  formatCompact,
  statusColor,
  OBJECTIVES,
  OBJECTIVE_LABELS,
  type MetaCampaign,
  type MetaAdReport,
} from "@/lib/use-marketing-data"

/* ------------------------------------------------------------------ */
/*  Skeleton                                                            */
/* ------------------------------------------------------------------ */

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />
}

function StatCardSkeleton() {
  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 space-y-3">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-7 w-28" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Stat card                                                           */
/* ------------------------------------------------------------------ */

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center justify-center size-7 rounded-md bg-primary/10 text-primary">
          <Icon className="size-3.5" />
        </div>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Dual-line performance chart                                         */
/* ------------------------------------------------------------------ */

function PerformanceChart({ reports }: { reports: MetaAdReport[] }) {
  const days = useMemo(() => {
    const map = new Map<string, { spend: number; conversions: number }>()
    const now = new Date()
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      map.set(d.toISOString().split("T")[0], { spend: 0, conversions: 0 })
    }
    for (const r of reports) {
      const entry = map.get(r.report_date)
      if (entry) {
        entry.spend += r.spend_cents
        entry.conversions += r.conversions
      }
    }
    return Array.from(map.entries()).map(([date, v]) => ({ date, ...v }))
  }, [reports])

  const maxSpend = Math.max(...days.map((d) => d.spend), 1)
  const maxConv = Math.max(...days.map((d) => d.conversions), 1)

  const w = 600
  const h = 200
  const padX = 45
  const padY = 20
  const plotW = w - padX * 2
  const plotH = h - padY * 2

  function toPoints(
    data: typeof days,
    getValue: (d: (typeof days)[0]) => number,
    maxVal: number
  ) {
    return data.map((d, i) => ({
      x: padX + (i / (data.length - 1)) * plotW,
      y: padY + plotH - (getValue(d) / maxVal) * plotH,
    }))
  }

  const spendPts = toPoints(days, (d) => d.spend, maxSpend)
  const convPts = toPoints(days, (d) => d.conversions, maxConv)

  const spendLine = spendPts.map((p) => `${p.x},${p.y}`).join(" ")
  const convLine = convPts.map((p) => `${p.x},${p.y}`).join(" ")

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
        const y = padY + plotH - pct * plotH
        return (
          <line
            key={i}
            x1={padX}
            y1={y}
            x2={w - padX}
            y2={y}
            stroke="currentColor"
            className="text-border"
            strokeWidth={0.5}
          />
        )
      })}
      {/* Spend line */}
      <polyline
        points={spendLine}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* Conversions line */}
      <polyline
        points={convLine}
        fill="none"
        stroke="#f59e0b"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeDasharray="4 2"
      />
      {/* Legend */}
      <circle cx={padX} cy={h - 4} r={4} fill="hsl(var(--primary))" />
      <text x={padX + 8} y={h} className="fill-muted-foreground" fontSize={9}>
        Spend
      </text>
      <circle cx={padX + 60} cy={h - 4} r={4} fill="#f59e0b" />
      <text
        x={padX + 68}
        y={h}
        className="fill-muted-foreground"
        fontSize={9}
      >
        Conversions
      </text>
      {/* X labels */}
      {days
        .filter((_, i) => i % 7 === 0)
        .map((d, i) => {
          const x = padX + ((days.indexOf(d)) / (days.length - 1)) * plotW
          return (
            <text
              key={i}
              x={x}
              y={h - 12}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize={8}
            >
              {new Date(d.date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </text>
          )
        })}
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Editable settings card                                              */
/* ------------------------------------------------------------------ */

function SettingsCard({
  campaign,
  onSave,
}: {
  campaign: MetaCampaign
  onSave: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    budget_cents: String(campaign.budget_cents / 100),
    budget_type: campaign.budget_type,
    objective: campaign.objective,
    start_date: campaign.start_date ?? "",
    end_date: campaign.end_date ?? "",
    notes: campaign.notes ?? "",
  })
  const [saving, setSaving] = useState(false)

  function set<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  async function handleSave() {
    setSaving(true)
    await supabaseB2B
      .from("meta_campaigns")
      .update({
        budget_cents: Math.round(parseFloat(form.budget_cents || "0") * 100),
        budget_type: form.budget_type,
        objective: form.objective,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        notes: form.notes.trim() || null,
      })
      .eq("id", campaign.id)
    setSaving(false)
    setEditing(false)
    onSave()
  }

  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="size-4 text-muted-foreground" />
          <span className="text-[0.9375rem] font-semibold tracking-tight">
            Settings
          </span>
        </div>
        {!editing ? (
          <Button variant="outline" size="xs" onClick={() => setEditing(true)}>
            <Pencil className="size-3" /> Edit
          </Button>
        ) : (
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="xs"
              onClick={() => setEditing(false)}
            >
              <X className="size-3" /> Cancel
            </Button>
            <Button size="xs" onClick={handleSave} disabled={saving}>
              <Save className="size-3" /> {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </div>
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Budget */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
            Budget
          </label>
          {editing ? (
            <div className="flex gap-2">
              <select
                value={form.budget_type}
                onChange={(e) => set("budget_type", e.target.value)}
                className="rounded-md border px-3 py-2 text-sm bg-background w-28"
              >
                <option value="daily">Daily</option>
                <option value="lifetime">Lifetime</option>
              </select>
              <input
                type="number"
                step="0.01"
                value={form.budget_cents}
                onChange={(e) => set("budget_cents", e.target.value)}
                className="rounded-md border px-3 py-2 text-sm bg-background flex-1"
              />
            </div>
          ) : (
            <p className="text-sm font-semibold text-foreground">
              ${formatCents(campaign.budget_cents)}{" "}
              <span className="text-xs text-muted-foreground font-normal">
                ({campaign.budget_type})
              </span>
            </p>
          )}
        </div>

        {/* Objective */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
            Objective
          </label>
          {editing ? (
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
          ) : (
            <p className="text-sm font-semibold text-foreground">
              {OBJECTIVE_LABELS[campaign.objective] ?? campaign.objective}
            </p>
          )}
        </div>

        {/* Schedule */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
            Start Date
          </label>
          {editing ? (
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => set("start_date", e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm bg-background"
            />
          ) : (
            <p className="text-sm font-semibold text-foreground">
              {campaign.start_date
                ? new Date(campaign.start_date).toLocaleDateString()
                : "Not set"}
            </p>
          )}
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
            End Date
          </label>
          {editing ? (
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => set("end_date", e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm bg-background"
            />
          ) : (
            <p className="text-sm font-semibold text-foreground">
              {campaign.end_date
                ? new Date(campaign.end_date).toLocaleDateString()
                : "Not set"}
            </p>
          )}
        </div>

        {/* Notes */}
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
            Notes
          </label>
          {editing ? (
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              className="w-full rounded-md border px-3 py-2 text-sm bg-background resize-none"
            />
          ) : (
            <p className="text-sm text-foreground">
              {campaign.notes || (
                <span className="text-muted-foreground italic">No notes</span>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main page                                                           */
/* ------------------------------------------------------------------ */

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { campaign, loading: campaignLoading } = useCampaign(id)
  const { campaigns } = useCampaigns()
  const { adSets, loading: adSetsLoading } = useAdSets(id)
  const { reports, loading: reportsLoading } = useAdReports("campaign", id, 30)

  const [localCampaign, setLocalCampaign] = useState<MetaCampaign | null>(null)

  useEffect(() => {
    if (campaign) setLocalCampaign(campaign)
  }, [campaign])

  const loading = campaignLoading || !localCampaign

  /* Prev / Next navigation */
  const currentIndex = campaigns.findIndex((c) => c.id === id)
  const prevId = currentIndex > 0 ? campaigns[currentIndex - 1].id : null
  const nextId =
    currentIndex >= 0 && currentIndex < campaigns.length - 1
      ? campaigns[currentIndex + 1].id
      : null

  /* Aggregate stats from reports */
  const stats = useMemo(() => {
    const s = {
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      revenue: 0,
    }
    for (const r of reports) {
      s.spend += r.spend_cents
      s.impressions += r.impressions
      s.clicks += r.clicks
      s.conversions += r.conversions
      s.revenue += r.revenue_cents
    }
    return {
      ...s,
      ctr: s.impressions > 0 ? (s.clicks / s.impressions) * 100 : 0,
      roas: s.spend > 0 ? s.revenue / s.spend : 0,
    }
  }, [reports])

  /* Refetch campaign */
  const refetchCampaign = useCallback(async () => {
    const { data } = await supabaseB2B
      .from("meta_campaigns")
      .select("*")
      .eq("id", id)
      .single()
    if (data) setLocalCampaign(data as MetaCampaign)
  }, [id])

  /* Status toggle */
  async function toggleStatus() {
    if (!localCampaign) return
    const newStatus = localCampaign.status === "ACTIVE" ? "PAUSED" : "ACTIVE"
    await supabaseB2B
      .from("meta_campaigns")
      .update({ status: newStatus })
      .eq("id", localCampaign.id)
    refetchCampaign()
  }

  /* Duplicate */
  async function handleDuplicate() {
    if (!localCampaign) return
    const { id: _id, created_at, updated_at, ...rest } = localCampaign
    const { data } = await supabaseB2B
      .from("meta_campaigns")
      .insert({
        ...rest,
        name: `${localCampaign.name} (Copy)`,
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
      .select("id")
      .single()
    if (data) router.push(`/marketing/campaigns/${data.id}`)
  }

  /* Archive */
  async function handleArchive() {
    if (!localCampaign) return
    await supabaseB2B
      .from("meta_campaigns")
      .update({ status: "ARCHIVED" })
      .eq("id", localCampaign.id)
    router.push("/marketing/campaigns")
  }

  /* Loading state */
  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <Skeleton className="h-5 w-32" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-16" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    )
  }

  const c = localCampaign!

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Back link */}
      <Link
        href="/marketing/campaigns"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-3.5" /> Back to Campaigns
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold">{c.name}</h1>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
            {OBJECTIVE_LABELS[c.objective] ?? c.objective}
          </span>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(c.status)}`}
          >
            {c.status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={toggleStatus}>
            {c.status === "ACTIVE" ? (
              <><Pause className="size-3.5" /> Pause</>
            ) : (
              <><Play className="size-3.5" /> Activate</>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDuplicate}>
            <Copy className="size-3.5" /> Duplicate
          </Button>
          <Button variant="outline" size="sm" onClick={handleArchive}>
            <Archive className="size-3.5" /> Archive
          </Button>
        </div>
      </div>

      {/* Prev / Next */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="xs"
          disabled={!prevId}
          onClick={() => prevId && router.push(`/marketing/campaigns/${prevId}`)}
        >
          <ChevronLeft className="size-3.5" /> Prev
        </Button>
        <Button
          variant="outline"
          size="xs"
          disabled={!nextId}
          onClick={() => nextId && router.push(`/marketing/campaigns/${nextId}`)}
        >
          Next <ChevronRight className="size-3.5" />
        </Button>
      </div>

      {/* Stat cards - 2 rows of 3 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={DollarSign}
          label="Spend"
          value={`$${formatCents(stats.spend)}`}
        />
        <StatCard
          icon={Eye}
          label="Impressions"
          value={formatCompact(stats.impressions)}
        />
        <StatCard
          icon={MousePointerClick}
          label="Clicks"
          value={formatCompact(stats.clicks)}
        />
        <StatCard
          icon={Percent}
          label="CTR"
          value={`${stats.ctr.toFixed(2)}%`}
        />
        <StatCard
          icon={ShoppingCart}
          label="Conversions"
          value={formatCompact(stats.conversions)}
        />
        <StatCard
          icon={TrendingUp}
          label="ROAS"
          value={`${stats.roas.toFixed(2)}x`}
        />
      </div>

      {/* Performance chart */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b flex items-center gap-2">
          <LineChart className="size-4 text-muted-foreground" />
          <span className="text-[0.9375rem] font-semibold tracking-tight">
            Performance (30 days)
          </span>
        </div>
        <div className="p-5">
          {reportsLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex items-center justify-center size-10 rounded-full bg-muted mb-3">
                <LineChart className="size-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No report data available yet for this campaign.
              </p>
            </div>
          ) : (
            <PerformanceChart reports={reports} />
          )}
        </div>
      </div>

      {/* Ad Sets table */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b flex items-center gap-2">
          <Layers className="size-4 text-muted-foreground" />
          <span className="text-[0.9375rem] font-semibold tracking-tight">
            Ad Sets
          </span>
          <span className="ml-auto text-xs text-muted-foreground">
            {adSets.length} ad set{adSets.length !== 1 ? "s" : ""}
          </span>
        </div>
        {adSetsLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : adSets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex items-center justify-center size-10 rounded-full bg-muted mb-3">
              <Layers className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">
              No ad sets
            </p>
            <p className="text-xs text-muted-foreground">
              Ad sets linked to this campaign will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Budget
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Spend
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Clicks
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide" />
                </tr>
              </thead>
              <tbody>
                {adSets.map((as) => (
                  <tr
                    key={as.id}
                    className="border-b border-border/40 hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate">
                      {as.name}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(as.status)}`}
                      >
                        {as.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                      ${formatCents(as.budget_cents)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                      ${formatCents(as.spend_cents)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                      {formatCompact(as.clicks)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/marketing/ad-sets/${as.id}`}
                        className="text-xs text-primary hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Settings card */}
      <SettingsCard campaign={c} onSave={refetchCampaign} />
    </div>
  )
}
