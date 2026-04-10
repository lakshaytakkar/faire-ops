"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Plus,
  Image as ImageIcon,
  DollarSign,
  MousePointerClick,
  BarChart3,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabaseB2B } from "@/lib/supabase"
import {
  useAds,
  useAdSets,
  formatCents,
  formatCompact,
  statusColor,
  CTA_TYPES,
  MetaAd,
} from "@/lib/use-marketing-data"

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

type FilterTab = "all" | "ACTIVE" | "PAUSED"
type SortKey = "name" | "spend" | "clicks" | "ctr" | "roas"
type SortDir = "asc" | "desc"

const PAGE_SIZE = 10

const CTA_LABELS: Record<string, string> = {
  SHOP_NOW: "Shop Now",
  LEARN_MORE: "Learn More",
  SIGN_UP: "Sign Up",
  SUBSCRIBE: "Subscribe",
  CONTACT_US: "Contact Us",
  GET_OFFER: "Get Offer",
  ORDER_NOW: "Order Now",
  BOOK_NOW: "Book Now",
  DOWNLOAD: "Download",
  GET_QUOTE: "Get Quote",
}

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */

function Skeleton() {
  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-24 rounded bg-muted" />
        <div className="h-9 w-32 rounded bg-muted" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border/80 bg-card shadow-sm p-5 h-[100px]" />
        ))}
      </div>
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
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
/*  Ad Preview Card (for the Create modal)                             */
/* ------------------------------------------------------------------ */

function AdPreviewCard({
  headline,
  primaryText,
  description,
  ctaType,
  imageUrl,
}: {
  headline: string
  primaryText: string
  description: string
  ctaType: string
  imageUrl: string
}) {
  return (
    <div className="rounded-lg border bg-background overflow-hidden max-w-[320px]">
      {/* Header */}
      <div className="px-3 py-2 flex items-center gap-2">
        <div className="size-8 rounded-full bg-muted" />
        <div>
          <p className="text-xs font-semibold">Your Brand</p>
          <p className="text-[10px] text-muted-foreground">Sponsored</p>
        </div>
      </div>

      {/* Primary text */}
      {primaryText && (
        <p className="px-3 pb-2 text-xs text-muted-foreground line-clamp-2">{primaryText}</p>
      )}

      {/* Image */}
      <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt="Ad preview" className="w-full h-full object-cover" />
        ) : (
          <ImageIcon className="size-8 text-muted-foreground/40" />
        )}
      </div>

      {/* Bottom */}
      <div className="px-3 py-2 border-t flex items-center justify-between gap-2">
        <div className="min-w-0">
          {headline && <p className="text-xs font-semibold truncate">{headline}</p>}
          {description && <p className="text-[10px] text-muted-foreground truncate">{description}</p>}
        </div>
        {ctaType && (
          <span className="shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded border bg-primary text-primary-foreground">
            {CTA_LABELS[ctaType] ?? ctaType}
          </span>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Create Modal                                                       */
/* ------------------------------------------------------------------ */

function CreateAdModal({
  adSets,
  onClose,
  onCreated,
}: {
  adSets: { id: string; name: string }[]
  onClose: () => void
  onCreated: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: "",
    ad_set_id: adSets[0]?.id ?? "",
    headline: "",
    primary_text: "",
    description: "",
    cta_type: "SHOP_NOW",
    destination_url: "",
    image_url: "",
  })

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.ad_set_id) return
    setSaving(true)

    await supabaseB2B.from("meta_ads").insert({
      name: form.name,
      ad_set_id: form.ad_set_id,
      headline: form.headline || null,
      primary_text: form.primary_text || null,
      description: form.description || null,
      cta_type: form.cta_type,
      destination_url: form.destination_url || null,
      image_url: form.image_url || null,
      status: "PAUSED",
      spend_cents: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      ctr: 0,
      cpc_cents: 0,
      roas: 0,
    })

    setSaving(false)
    onCreated()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card border rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-3.5 border-b flex items-center justify-between">
          <h2 className="text-[0.9375rem] font-semibold tracking-tight">Create Ad</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form fields */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</label>
                <input
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ad Set</label>
                <select
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background"
                  value={form.ad_set_id}
                  onChange={(e) => set("ad_set_id", e.target.value)}
                  required
                >
                  {adSets.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Headline</label>
                <input
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background"
                  value={form.headline}
                  onChange={(e) => set("headline", e.target.value)}
                  placeholder="Catchy headline..."
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Primary Text</label>
                <textarea
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background resize-none"
                  rows={3}
                  value={form.primary_text}
                  onChange={(e) => set("primary_text", e.target.value)}
                  placeholder="Main ad copy..."
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
                <input
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Short description..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">CTA Type</label>
                  <select
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background"
                    value={form.cta_type}
                    onChange={(e) => set("cta_type", e.target.value)}
                  >
                    {CTA_TYPES.map((c) => (
                      <option key={c} value={c}>{CTA_LABELS[c] ?? c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Destination URL</label>
                  <input
                    type="url"
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background"
                    value={form.destination_url}
                    onChange={(e) => set("destination_url", e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Image URL</label>
                <input
                  type="url"
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background"
                  value={form.image_url}
                  onChange={(e) => set("image_url", e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>

            {/* Preview */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Preview</p>
              <AdPreviewCard
                headline={form.headline}
                primaryText={form.primary_text}
                description={form.description}
                ctaType={form.cta_type}
                imageUrl={form.image_url}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4 mt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving || !form.name}>
              {saving ? "Creating..." : "Create Ad"}
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

export default function AdsPage() {
  const router = useRouter()
  const { ads, loading, refetch } = useAds()
  const { adSets, loading: adSetsLoading } = useAdSets()

  const [search, setSearch] = useState("")
  const [tab, setTab] = useState<FilterTab>("all")
  const [adSetFilter, setAdSetFilter] = useState("")
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey>("name")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [showCreate, setShowCreate] = useState(false)
  const [menuId, setMenuId] = useState<string | null>(null)

  const adSetMap = useMemo(() => {
    const m: Record<string, string> = {}
    adSets.forEach((a) => { m[a.id] = a.name })
    return m
  }, [adSets])

  const filtered = useMemo(() => {
    let list = ads
    if (tab !== "all") list = list.filter((a) => a.status === tab)
    if (adSetFilter) list = list.filter((a) => a.ad_set_id === adSetFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.headline ?? "").toLowerCase().includes(q) ||
          (adSetMap[a.ad_set_id] ?? "").toLowerCase().includes(q),
      )
    }
    return list
  }, [ads, tab, adSetFilter, search, adSetMap])

  const sorted = useMemo(() => {
    const list = [...filtered]
    list.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "name": cmp = a.name.localeCompare(b.name); break
        case "spend": cmp = a.spend_cents - b.spend_cents; break
        case "clicks": cmp = a.clicks - b.clicks; break
        case "ctr": cmp = a.ctr - b.ctr; break
        case "roas": cmp = a.roas - b.roas; break
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
    if (!confirm("Delete this ad?")) return
    await supabaseB2B.from("meta_ads").delete().eq("id", id)
    setMenuId(null)
    refetch()
  }

  if (loading || adSetsLoading) return <Skeleton />

  // Stats
  const totalSpend = ads.reduce((s, a) => s + a.spend_cents, 0)
  const totalClicks = ads.reduce((s, a) => s + a.clicks, 0)
  const totalImpressions = ads.reduce((s, a) => s + a.impressions, 0)
  const avgRoas = ads.length > 0 ? ads.reduce((s, a) => s + a.roas, 0) / ads.length : 0

  const stats = [
    { label: "Ads", value: String(ads.length), icon: <ImageIcon className="h-4 w-4" />, bg: "rgba(59,130,246,0.1)", color: "#3B82F6" },
    { label: "Total Spend", value: `$${formatCents(totalSpend)}`, icon: <DollarSign className="h-4 w-4" />, bg: "rgba(16,185,129,0.1)", color: "#10B981" },
    { label: "Total Clicks", value: formatCompact(totalClicks), icon: <MousePointerClick className="h-4 w-4" />, bg: "rgba(139,92,246,0.1)", color: "#8B5CF6" },
    { label: "Avg ROAS", value: `${avgRoas.toFixed(2)}x`, icon: <BarChart3 className="h-4 w-4" />, bg: "rgba(245,158,11,0.1)", color: "#F59E0B" },
  ]

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: `All (${ads.length})` },
    { key: "ACTIVE", label: `Active (${ads.filter((a) => a.status === "ACTIVE").length})` },
    { key: "PAUSED", label: `Paused (${ads.filter((a) => a.status === "PAUSED").length})` },
  ]

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ads</h1>
        <Button onClick={() => setShowCreate(true)} size="sm">
          <Plus className="size-4 mr-1.5" />
          Create Ad
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

      {/* Filters + Table */}
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

          {/* Ad set filter */}
          <select
            className="rounded-md border px-3 py-1.5 text-sm bg-background"
            value={adSetFilter}
            onChange={(e) => { setAdSetFilter(e.target.value); setPage(1) }}
          >
            <option value="">All ad sets</option>
            {adSets.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              className="rounded-md border px-3 py-1.5 pl-8 text-sm bg-background w-56"
              placeholder="Search ads..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
        </div>

        {/* Table */}
        {paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ImageIcon className="size-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No ads found</p>
            <p className="text-xs text-muted-foreground mt-1">Create your first ad to get started</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide cursor-pointer" onClick={() => handleSort("name")}>
                    Name <SortIcon col="name" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Ad Set</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Headline</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide cursor-pointer" onClick={() => handleSort("spend")}>
                    Spend <SortIcon col="spend" />
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide cursor-pointer" onClick={() => handleSort("clicks")}>
                    Clicks <SortIcon col="clicks" />
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide cursor-pointer" onClick={() => handleSort("ctr")}>
                    CTR <SortIcon col="ctr" />
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide cursor-pointer" onClick={() => handleSort("roas")}>
                    ROAS <SortIcon col="roas" />
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((ad) => (
                  <tr
                    key={ad.id}
                    className="border-b hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => router.push(`/marketing/ads/${ad.id}`)}
                  >
                    <td className="px-4 py-3 font-medium">{ad.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{adSetMap[ad.ad_set_id] ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(ad.status)}`}>
                        {ad.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[180px] truncate">{ad.headline ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-mono">${formatCents(ad.spend_cents)}</td>
                    <td className="px-4 py-3 text-right">{formatCompact(ad.clicks)}</td>
                    <td className="px-4 py-3 text-right">{ad.ctr.toFixed(2)}%</td>
                    <td className="px-4 py-3 text-right">{ad.roas.toFixed(2)}x</td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="relative inline-block">
                        <button
                          onClick={() => setMenuId(menuId === ad.id ? null : ad.id)}
                          className="p-1 rounded hover:bg-muted"
                        >
                          <MoreHorizontal className="size-4" />
                        </button>
                        {menuId === ad.id && (
                          <div className="absolute right-0 top-full mt-1 z-20 bg-card border rounded-md shadow-lg py-1 w-36">
                            <button
                              className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex items-center gap-2"
                              onClick={() => { router.push(`/marketing/ads/${ad.id}`); setMenuId(null) }}
                            >
                              <Pencil className="size-3.5" /> Edit
                            </button>
                            <button
                              className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex items-center gap-2 text-red-600"
                              onClick={() => handleDelete(ad.id)}
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
        <CreateAdModal
          adSets={adSets}
          onClose={() => setShowCreate(false)}
          onCreated={refetch}
        />
      )}
    </div>
  )
}
