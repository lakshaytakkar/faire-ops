"use client"

import { useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  DollarSign,
  Eye,
  MousePointerClick,
  BarChart3,
  Target,
  Users,
  MapPin,
  Monitor,
  Save,
  Loader2,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabaseB2B } from "@/lib/supabase"
import {
  useAdSet,
  useAds,
  useCampaigns,
  formatCents,
  formatCompact,
  statusColor,
  MetaAd,
} from "@/lib/use-marketing-data"

/* ------------------------------------------------------------------ */
/*  Placement icons                                                    */
/* ------------------------------------------------------------------ */

const PLACEMENT_ICONS: Record<string, React.ReactNode> = {
  "Facebook Feed": <Monitor className="size-4" />,
  "Instagram Feed": <Monitor className="size-4" />,
  "Instagram Stories": <Eye className="size-4" />,
  "Instagram Reels": <Eye className="size-4" />,
  "Audience Network": <Users className="size-4" />,
}

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */

function Skeleton() {
  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5 animate-pulse">
      <div className="h-4 w-20 bg-muted rounded" />
      <div className="h-7 w-72 bg-muted rounded" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-5 h-[100px]" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card h-48" />
        <div className="rounded-lg border bg-card h-48" />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdSetDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { adSet, loading } = useAdSet(params.id)
  const { ads, loading: adsLoading } = useAds(params.id)
  const { campaigns } = useCampaigns()

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [budgetCents, setBudgetCents] = useState(0)
  const [targeting, setTargeting] = useState({
    age_min: 18,
    age_max: 65,
    gender: "ALL",
    interests: "",
    locations: "",
  })

  const campaign = useMemo(
    () => campaigns.find((c) => c.id === adSet?.campaign_id),
    [campaigns, adSet],
  )

  // Initialize edit state when adSet loads
  function startEdit() {
    if (!adSet) return
    const t = adSet.targeting as Record<string, unknown>
    setBudgetCents(adSet.budget_cents)
    setTargeting({
      age_min: (t?.age_min as number) ?? 18,
      age_max: (t?.age_max as number) ?? 65,
      gender: (t?.gender as string) ?? "ALL",
      interests: Array.isArray(t?.interests) ? (t.interests as string[]).join(", ") : "",
      locations: Array.isArray(t?.locations) ? (t.locations as string[]).join(", ") : "",
    })
    setEditing(true)
  }

  async function handleSave() {
    if (!adSet) return
    setSaving(true)
    await supabaseB2B
      .from("meta_ad_sets")
      .update({
        budget_cents: budgetCents,
        targeting: {
          age_min: targeting.age_min,
          age_max: targeting.age_max,
          gender: targeting.gender,
          interests: targeting.interests.split(",").map((s) => s.trim()).filter(Boolean),
          locations: targeting.locations.split(",").map((s) => s.trim()).filter(Boolean),
        },
      })
      .eq("id", adSet.id)
    setSaving(false)
    setEditing(false)
    window.location.reload()
  }

  if (loading) return <Skeleton />
  if (!adSet) {
    return (
      <div className="max-w-[1440px] mx-auto w-full flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Ad set not found</p>
        <Link href="/marketing/ad-sets" className="text-sm text-primary mt-2 hover:underline">Back to Ad Sets</Link>
      </div>
    )
  }

  const t = adSet.targeting as Record<string, unknown>
  const interests = Array.isArray(t?.interests) ? (t.interests as string[]) : []
  const locations = Array.isArray(t?.locations) ? (t.locations as string[]) : []
  const cpc = adSet.clicks > 0 ? adSet.spend_cents / adSet.clicks : 0

  const stats = [
    { label: "Budget", value: `$${formatCents(adSet.budget_cents)}`, sub: adSet.budget_type, icon: <DollarSign className="h-4 w-4" />, bg: "rgba(59,130,246,0.1)", color: "#3B82F6" },
    { label: "Spend", value: `$${formatCents(adSet.spend_cents)}`, sub: `${adSet.budget_cents > 0 ? Math.round((adSet.spend_cents / adSet.budget_cents) * 100) : 0}% of budget`, icon: <BarChart3 className="h-4 w-4" />, bg: "rgba(16,185,129,0.1)", color: "#10B981" },
    { label: "Impressions", value: formatCompact(adSet.impressions), sub: "", icon: <Eye className="h-4 w-4" />, bg: "rgba(139,92,246,0.1)", color: "#8B5CF6" },
    { label: "Clicks", value: formatCompact(adSet.clicks), sub: "", icon: <MousePointerClick className="h-4 w-4" />, bg: "rgba(245,158,11,0.1)", color: "#F59E0B" },
    { label: "CTR", value: `${adSet.ctr.toFixed(2)}%`, sub: "", icon: <Target className="h-4 w-4" />, bg: "rgba(236,72,153,0.1)", color: "#EC4899" },
    { label: "CPC", value: `$${formatCents(Math.round(cpc))}`, sub: "", icon: <DollarSign className="h-4 w-4" />, bg: "rgba(99,102,241,0.1)", color: "#6366F1" },
  ]

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Back link */}
      <Link href="/marketing/ad-sets" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="size-3.5" /> Ad Sets
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold tracking-tight">{adSet.name}</h1>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(adSet.status)}`}>
          {adSet.status}
        </span>
        {campaign && (
          <Link href={`/marketing/campaigns/${campaign.id}`} className="text-sm text-muted-foreground hover:text-foreground">
            {campaign.name}
          </Link>
        )}
        <div className="flex-1" />
        {!editing && (
          <Button variant="outline" size="sm" onClick={startEdit}>
            Edit
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border/80 bg-card shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="rounded-md p-1.5" style={{ background: s.bg }}>
                <span style={{ color: s.color }}>{s.icon}</span>
              </div>
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-lg font-semibold tracking-tight">{s.value}</p>
            {s.sub && <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Targeting + Placements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Targeting */}
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" /> Targeting
          </div>
          <div className="p-5 space-y-4">
            {editing ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Age Min</label>
                    <input
                      type="number"
                      className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background"
                      value={targeting.age_min}
                      onChange={(e) => setTargeting((t) => ({ ...t, age_min: parseInt(e.target.value) || 18 }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Age Max</label>
                    <input
                      type="number"
                      className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background"
                      value={targeting.age_max}
                      onChange={(e) => setTargeting((t) => ({ ...t, age_max: parseInt(e.target.value) || 65 }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gender</label>
                    <select
                      className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background"
                      value={targeting.gender}
                      onChange={(e) => setTargeting((t) => ({ ...t, gender: e.target.value }))}
                    >
                      <option value="ALL">All</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Interests</label>
                  <input
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background"
                    value={targeting.interests}
                    onChange={(e) => setTargeting((t) => ({ ...t, interests: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Locations</label>
                  <input
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background"
                    value={targeting.locations}
                    onChange={(e) => setTargeting((t) => ({ ...t, locations: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Budget ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background"
                    value={budgetCents / 100}
                    onChange={(e) => setBudgetCents(Math.round((parseFloat(e.target.value) || 0) * 100))}
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <Save className="size-3.5 mr-1" />}
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Age Range</p>
                    <p className="mt-1 font-medium">{(t?.age_min as number) ?? 18} – {(t?.age_max as number) ?? 65}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Gender</p>
                    <p className="mt-1 font-medium">{(t?.gender as string) ?? "All"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Bid Strategy</p>
                    <p className="mt-1 font-medium">{adSet.bid_strategy.replace(/_/g, " ")}</p>
                  </div>
                </div>

                {interests.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1.5">Interests</p>
                    <div className="flex flex-wrap gap-1.5">
                      {interests.map((i) => (
                        <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded-full">{i}</span>
                      ))}
                    </div>
                  </div>
                )}

                {locations.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1.5">Locations</p>
                    <div className="flex flex-wrap gap-1.5">
                      {locations.map((l) => (
                        <span key={l} className="text-xs bg-muted px-2 py-0.5 rounded-full flex items-center gap-1">
                          <MapPin className="size-3" />{l}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {interests.length === 0 && locations.length === 0 && (
                  <p className="text-sm text-muted-foreground">No targeting details configured</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Placements */}
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight flex items-center gap-2">
            <Monitor className="size-4 text-muted-foreground" /> Placements
          </div>
          <div className="p-5">
            {adSet.placements.length > 0 ? (
              <div className="space-y-2">
                {adSet.placements.map((p) => (
                  <div key={p} className="flex items-center gap-3 text-sm p-2 rounded-md bg-muted/40">
                    <span className="text-muted-foreground">{PLACEMENT_ICONS[p] ?? <Monitor className="size-4" />}</span>
                    <span className="font-medium">{p}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No placements configured (automatic)</p>
            )}
          </div>
        </div>
      </div>

      {/* Ads Table */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
          Ads ({ads.length})
        </div>
        {adsLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading ads...</div>
        ) : ads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">No ads in this ad set</p>
            <Link href="/marketing/ads" className="text-sm text-primary mt-1 hover:underline">
              Create an ad
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Headline</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Spend</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Clicks</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">CTR</th>
              </tr>
            </thead>
            <tbody>
              {ads.map((ad) => (
                <tr
                  key={ad.id}
                  className="border-b hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={() => router.push(`/marketing/ads/${ad.id}`)}
                >
                  <td className="px-4 py-3 font-medium">{ad.name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(ad.status)}`}>
                      {ad.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{ad.headline ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-mono">${formatCents(ad.spend_cents)}</td>
                  <td className="px-4 py-3 text-right">{formatCompact(ad.clicks)}</td>
                  <td className="px-4 py-3 text-right">{ad.ctr.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
