"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Search,
  Plus,
  Layers,
  DollarSign,
  MousePointerClick,
  BarChart3,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Target,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import {
  useAdSets,
  useCampaigns,
  formatCents,
  formatCompact,
  statusColor,
  MetaAdSet,
} from "@/lib/use-marketing-data"

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

type FilterTab = "all" | "ACTIVE" | "PAUSED"
type SortKey = "name" | "budget" | "spend" | "clicks" | "ctr"
type SortDir = "asc" | "desc"

const PAGE_SIZE = 10

const OPTIMIZATION_GOALS = [
  "LINK_CLICKS",
  "CONVERSIONS",
  "IMPRESSIONS",
  "REACH",
] as const

const PLACEMENT_OPTIONS = [
  "Facebook Feed",
  "Instagram Feed",
  "Instagram Stories",
  "Instagram Reels",
  "Audience Network",
] as const

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */

function Skeleton() {
  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 rounded bg-muted" />
        <div className="h-9 w-36 rounded bg-muted" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-5 h-[100px]" />
        ))}
      </div>
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b h-14" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="px-4 py-4 border-b">
            <div className="h-4 w-full rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Create Modal                                                       */
/* ------------------------------------------------------------------ */

function CreateAdSetModal({
  campaigns,
  onClose,
  onCreated,
}: {
  campaigns: { id: string; name: string }[]
  onClose: () => void
  onCreated: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: "",
    campaign_id: campaigns[0]?.id ?? "",
    budget_type: "DAILY",
    budget_cents: 0,
    optimization_goal: "LINK_CLICKS" as string,
    bid_strategy: "LOWEST_COST",
    age_min: 18,
    age_max: 65,
    gender: "ALL" as string,
    interests: "",
    locations: "",
    placements: ["Facebook Feed", "Instagram Feed"] as string[],
  })

  function set(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function togglePlacement(p: string) {
    setForm((f) => ({
      ...f,
      placements: f.placements.includes(p)
        ? f.placements.filter((x) => x !== p)
        : [...f.placements, p],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.campaign_id) return
    setSaving(true)

    const targeting: Record<string, unknown> = {
      age_min: form.age_min,
      age_max: form.age_max,
      gender: form.gender,
      interests: form.interests
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      locations: form.locations
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    }

    await supabase.from("meta_ad_sets").insert({
      name: form.name,
      campaign_id: form.campaign_id,
      budget_type: form.budget_type,
      budget_cents: Math.round(form.budget_cents * 100),
      optimization_goal: form.optimization_goal,
      bid_strategy: form.bid_strategy,
      targeting,
      placements: form.placements,
      status: "PAUSED",
      spend_cents: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      ctr: 0,
      cpc_cents: 0,
      schedule: {},
    })

    setSaving(false)
    onCreated()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card border rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-3.5 border-b flex items-center justify-between">
          <h2 className="text-[0.9375rem] font-semibold tracking-tight">Create Ad Set</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
          </div>

          {/* Campaign */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Campaign</label>
            <select
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background"
              value={form.campaign_id}
              onChange={(e) => set("campaign_id", e.target.value)}
              required
            >
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Budget row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Budget Type</label>
              <select
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background"
                value={form.budget_type}
                onChange={(e) => set("budget_type", e.target.value)}
              >
                <option value="DAILY">Daily</option>
                <option value="LIFETIME">Lifetime</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Budget ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background"
                value={form.budget_cents}
                onChange={(e) => set("budget_cents", parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Optimization + Bid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Optimization Goal</label>
              <select
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background"
                value={form.optimization_goal}
                onChange={(e) => set("optimization_goal", e.target.value)}
              >
                {OPTIMIZATION_GOALS.map((g) => (
                  <option key={g} value={g}>{g.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bid Strategy</label>
              <select
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background"
                value={form.bid_strategy}
                onChange={(e) => set("bid_strategy", e.target.value)}
              >
                <option value="LOWEST_COST">Lowest Cost</option>
                <option value="BID_CAP">Bid Cap</option>
                <option value="COST_CAP">Cost Cap</option>
              </select>
            </div>
          </div>

          {/* Targeting */}
          <div className="border-t pt-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Targeting</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Age Min</label>
                <input
                  type="number"
                  min="13"
                  max="65"
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background"
                  value={form.age_min}
                  onChange={(e) => set("age_min", parseInt(e.target.value) || 18)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Age Max</label>
                <input
                  type="number"
                  min="13"
                  max="65"
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background"
                  value={form.age_max}
                  onChange={(e) => set("age_max", parseInt(e.target.value) || 65)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gender</label>
                <select
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background"
                  value={form.gender}
                  onChange={(e) => set("gender", e.target.value)}
                >
                  <option value="ALL">All</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>
            </div>

            <div className="mt-3">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Interests (comma-separated)</label>
              <input
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background"
                placeholder="fashion, home decor, gifts"
                value={form.interests}
                onChange={(e) => set("interests", e.target.value)}
              />
            </div>

            <div className="mt-3">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Locations (comma-separated)</label>
              <input
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background"
                placeholder="United States, Canada"
                value={form.locations}
                onChange={(e) => set("locations", e.target.value)}
              />
            </div>
          </div>

          {/* Placements */}
          <div className="border-t pt-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Placements</h3>
            <div className="space-y-2">
              {PLACEMENT_OPTIONS.map((p) => (
                <label key={p} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.placements.includes(p)}
                    onChange={() => togglePlacement(p)}
                    className="rounded border"
                  />
                  {p}
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving || !form.name}>
              {saving ? "Creating..." : "Create Ad Set"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdSetsPage() {
  const router = useRouter()
  const { adSets, loading, refetch } = useAdSets()
  const { campaigns, loading: camLoading } = useCampaigns()

  const [search, setSearch] = useState("")
  const [tab, setTab] = useState<FilterTab>("all")
  const [campaignFilter, setCampaignFilter] = useState("")
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey>("name")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [showCreate, setShowCreate] = useState(false)
  const [menuId, setMenuId] = useState<string | null>(null)

  const campaignMap = useMemo(() => {
    const m: Record<string, string> = {}
    campaigns.forEach((c) => { m[c.id] = c.name })
    return m
  }, [campaigns])

  const filtered = useMemo(() => {
    let list = adSets
    if (tab !== "all") list = list.filter((a) => a.status === tab)
    if (campaignFilter) list = list.filter((a) => a.campaign_id === campaignFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (campaignMap[a.campaign_id] ?? "").toLowerCase().includes(q),
      )
    }
    return list
  }, [adSets, tab, campaignFilter, search, campaignMap])

  const sorted = useMemo(() => {
    const list = [...filtered]
    list.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "name": cmp = a.name.localeCompare(b.name); break
        case "budget": cmp = a.budget_cents - b.budget_cents; break
        case "spend": cmp = a.spend_cents - b.spend_cents; break
        case "clicks": cmp = a.clicks - b.clicks; break
        case "ctr": cmp = a.ctr - b.ctr; break
      }
      return sortDir === "asc" ? cmp : -cmp
    })
    return list
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortKey(key); setSortDir("asc") }
    setPage(1)
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return null
    return sortDir === "asc" ? <ArrowUp className="size-3 inline ml-1" /> : <ArrowDown className="size-3 inline ml-1" />
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this ad set?")) return
    await supabase.from("meta_ad_sets").delete().eq("id", id)
    setMenuId(null)
    refetch()
  }

  if (loading || camLoading) return <Skeleton />

  // Stats
  const totalBudget = adSets.reduce((s, a) => s + a.budget_cents, 0)
  const totalSpend = adSets.reduce((s, a) => s + a.spend_cents, 0)
  const totalClicks = adSets.reduce((s, a) => s + a.clicks, 0)
  const avgCtr = adSets.length > 0 ? adSets.reduce((s, a) => s + a.ctr, 0) / adSets.length : 0

  const stats = [
    { label: "Ad Sets", value: String(adSets.length), icon: <Layers className="h-4 w-4" />, bg: "rgba(59,130,246,0.1)", color: "#3B82F6" },
    { label: "Total Budget", value: `$${formatCents(totalBudget)}`, icon: <DollarSign className="h-4 w-4" />, bg: "rgba(16,185,129,0.1)", color: "#10B981" },
    { label: "Total Spend", value: `$${formatCents(totalSpend)}`, icon: <BarChart3 className="h-4 w-4" />, bg: "rgba(139,92,246,0.1)", color: "#8B5CF6" },
    { label: "Total Clicks", value: formatCompact(totalClicks), icon: <MousePointerClick className="h-4 w-4" />, bg: "rgba(245,158,11,0.1)", color: "#F59E0B" },
  ]

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: `All (${adSets.length})` },
    { key: "ACTIVE", label: `Active (${adSets.filter((a) => a.status === "ACTIVE").length})` },
    { key: "PAUSED", label: `Paused (${adSets.filter((a) => a.status === "PAUSED").length})` },
  ]

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Ad Sets</h1>
        <Button onClick={() => setShowCreate(true)} size="sm">
          <Plus className="size-4 mr-1.5" />
          Create Ad Set
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border/80 bg-card shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-md p-2" style={{ background: s.bg }}>
                <span style={{ color: s.color }}>{s.icon}</span>
              </div>
              <div>
                <p className="text-lg font-semibold tracking-tight">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Tabs */}
          <div className="flex gap-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setPage(1) }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  tab === t.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Campaign filter */}
          <select
            className="rounded-md border px-3 py-1.5 text-sm bg-background"
            value={campaignFilter}
            onChange={(e) => { setCampaignFilter(e.target.value); setPage(1) }}
          >
            <option value="">All campaigns</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              className="rounded-md border px-3 py-1.5 pl-8 text-sm bg-background w-56"
              placeholder="Search ad sets..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
        </div>

        {/* Table */}
        {paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Layers className="size-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No ad sets found</p>
            <p className="text-xs text-muted-foreground mt-1">Create your first ad set to get started</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide cursor-pointer" onClick={() => handleSort("name")}>
                    Name <SortIcon col="name" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Campaign</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide cursor-pointer" onClick={() => handleSort("budget")}>
                    Budget <SortIcon col="budget" />
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide cursor-pointer" onClick={() => handleSort("spend")}>
                    Spend <SortIcon col="spend" />
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide cursor-pointer" onClick={() => handleSort("clicks")}>
                    Clicks <SortIcon col="clicks" />
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide cursor-pointer" onClick={() => handleSort("ctr")}>
                    CTR <SortIcon col="ctr" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Goal</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => router.push(`/marketing/ad-sets/${a.id}`)}
                  >
                    <td className="px-4 py-3 font-medium">{a.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{campaignMap[a.campaign_id] ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(a.status)}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">${formatCents(a.budget_cents)}</td>
                    <td className="px-4 py-3 text-right font-mono">${formatCents(a.spend_cents)}</td>
                    <td className="px-4 py-3 text-right">{formatCompact(a.clicks)}</td>
                    <td className="px-4 py-3 text-right">{a.ctr.toFixed(2)}%</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {a.optimization_goal?.replace(/_/g, " ") ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="relative inline-block">
                        <button
                          onClick={() => setMenuId(menuId === a.id ? null : a.id)}
                          className="p-1 rounded hover:bg-muted"
                        >
                          <MoreHorizontal className="size-4" />
                        </button>
                        {menuId === a.id && (
                          <div className="absolute right-0 top-full mt-1 z-20 bg-card border rounded-md shadow-lg py-1 w-36">
                            <button
                              className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex items-center gap-2"
                              onClick={() => { router.push(`/marketing/ad-sets/${a.id}`); setMenuId(null) }}
                            >
                              <Pencil className="size-3.5" /> Edit
                            </button>
                            <button
                              className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex items-center gap-2 text-red-600"
                              onClick={() => handleDelete(a.id)}
                            >
                              <Trash2 className="size-3.5" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="px-4 py-3 flex items-center justify-between text-xs text-muted-foreground border-t">
              <span>
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1 rounded hover:bg-muted disabled:opacity-40"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="px-2">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1 rounded hover:bg-muted disabled:opacity-40"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <CreateAdSetModal
          campaigns={campaigns}
          onClose={() => setShowCreate(false)}
          onCreated={refetch}
        />
      )}
    </div>
  )
}
