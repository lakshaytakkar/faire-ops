"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  DollarSign,
  Eye,
  MousePointerClick,
  BarChart3,
  Target,
  TrendingUp,
  Save,
  Loader2,
  ExternalLink,
  Image as ImageIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import {
  useAd,
  useAdReports,
  formatCents,
  formatCompact,
  statusColor,
  CTA_TYPES,
} from "@/lib/use-marketing-data"

/* ------------------------------------------------------------------ */
/*  CTA Labels                                                         */
/* ------------------------------------------------------------------ */

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
      <div className="h-4 w-20 bg-muted rounded" />
      <div className="h-7 w-60 bg-muted rounded" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 rounded-lg border bg-card h-[400px]" />
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border bg-card p-5 h-[100px]" />
            ))}
          </div>
          <div className="rounded-lg border bg-card h-60" />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Ad Preview (Meta-style feed card)                                  */
/* ------------------------------------------------------------------ */

function AdPreviewLarge({
  imageUrl,
  headline,
  primaryText,
  description,
  ctaType,
  destinationUrl,
}: {
  imageUrl: string | null
  headline: string | null
  primaryText: string | null
  description: string | null
  ctaType: string
  destinationUrl: string | null
}) {
  return (
    <div className="rounded-lg border bg-background overflow-hidden">
      {/* Sponsored header */}
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="size-10 rounded-full bg-muted flex items-center justify-center">
          <span className="text-xs font-bold text-muted-foreground">B</span>
        </div>
        <div>
          <p className="text-sm font-semibold">Your Brand</p>
          <p className="text-xs text-muted-foreground">Sponsored</p>
        </div>
      </div>

      {/* Primary text */}
      {primaryText && (
        <p className="px-4 pb-3 text-sm text-foreground leading-relaxed">{primaryText}</p>
      )}

      {/* Image area */}
      <div className="aspect-[1.91/1] bg-muted flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt="Ad creative" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground/40">
            <ImageIcon className="size-12" />
            <span className="text-xs">No image set</span>
          </div>
        )}
      </div>

      {/* Bottom section */}
      <div className="px-4 py-3 border-t bg-muted/20">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            {destinationUrl && (
              <p className="text-[11px] text-muted-foreground uppercase truncate">{
                (() => { try { return new URL(destinationUrl).hostname } catch { return destinationUrl } })()
              }</p>
            )}
            {headline && <p className="text-sm font-semibold truncate mt-0.5">{headline}</p>}
            {description && <p className="text-xs text-muted-foreground truncate">{description}</p>}
          </div>
          <span className="shrink-0 text-xs font-semibold px-4 py-2 rounded border bg-primary text-primary-foreground">
            {CTA_LABELS[ctaType] ?? ctaType.replace(/_/g, " ")}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdDetailPage() {
  const params = useParams<{ id: string }>()
  const { ad, loading } = useAd(params.id)
  const { reports, loading: reportsLoading } = useAdReports("ad", params.id)

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    headline: "",
    primary_text: "",
    description: "",
    cta_type: "SHOP_NOW",
    destination_url: "",
  })

  function startEdit() {
    if (!ad) return
    setForm({
      headline: ad.headline ?? "",
      primary_text: ad.primary_text ?? "",
      description: ad.description ?? "",
      cta_type: ad.cta_type,
      destination_url: ad.destination_url ?? "",
    })
    setEditing(true)
  }

  async function handleSave() {
    if (!ad) return
    setSaving(true)
    await supabase
      .from("meta_ads")
      .update({
        headline: form.headline || null,
        primary_text: form.primary_text || null,
        description: form.description || null,
        cta_type: form.cta_type,
        destination_url: form.destination_url || null,
      })
      .eq("id", ad.id)
    setSaving(false)
    setEditing(false)
    window.location.reload()
  }

  if (loading) return <Skeleton />
  if (!ad) {
    return (
      <div className="max-w-[1440px] mx-auto w-full flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Ad not found</p>
        <Link href="/marketing/ads" className="text-sm text-primary mt-2 hover:underline">Back to Ads</Link>
      </div>
    )
  }

  const stats = [
    { label: "Spend", value: `$${formatCents(ad.spend_cents)}`, icon: <DollarSign className="h-4 w-4" />, bg: "rgba(59,130,246,0.1)", color: "#3B82F6" },
    { label: "Impressions", value: formatCompact(ad.impressions), icon: <Eye className="h-4 w-4" />, bg: "rgba(16,185,129,0.1)", color: "#10B981" },
    { label: "Clicks", value: formatCompact(ad.clicks), icon: <MousePointerClick className="h-4 w-4" />, bg: "rgba(139,92,246,0.1)", color: "#8B5CF6" },
    { label: "CTR", value: `${ad.ctr.toFixed(2)}%`, icon: <Target className="h-4 w-4" />, bg: "rgba(245,158,11,0.1)", color: "#F59E0B" },
    { label: "Conversions", value: formatCompact(ad.conversions), icon: <TrendingUp className="h-4 w-4" />, bg: "rgba(236,72,153,0.1)", color: "#EC4899" },
    { label: "ROAS", value: `${ad.roas.toFixed(2)}x`, icon: <BarChart3 className="h-4 w-4" />, bg: "rgba(99,102,241,0.1)", color: "#6366F1" },
  ]

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Back link */}
      <Link href="/marketing/ads" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="size-3.5" /> Ads
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold tracking-tight">{ad.name}</h1>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(ad.status)}`}>
          {ad.status}
        </span>
        <div className="flex-1" />
        {!editing && (
          <Button variant="outline" size="sm" onClick={startEdit}>
            Edit Settings
          </Button>
        )}
      </div>

      {/* Layout: Preview left, Stats + Settings right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Ad Preview */}
        <div className="lg:col-span-1">
          <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
              Ad Preview
            </div>
            <div className="p-4">
              <AdPreviewLarge
                imageUrl={ad.image_url}
                headline={ad.headline}
                primaryText={ad.primary_text}
                description={ad.description}
                ctaType={ad.cta_type}
                destinationUrl={ad.destination_url}
              />
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-lg border border-border/80 bg-card shadow-sm p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="rounded-md p-1.5" style={{ background: s.bg }}>
                    <span style={{ color: s.color }}>{s.icon}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
                <p className="text-lg font-semibold tracking-tight">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Settings */}
          <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
              Ad Settings
            </div>
            <div className="p-5 space-y-4">
              {editing ? (
                <>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Headline</label>
                    <input
                      className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background"
                      value={form.headline}
                      onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Primary Text</label>
                    <textarea
                      className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background resize-none"
                      rows={3}
                      value={form.primary_text}
                      onChange={(e) => setForm((f) => ({ ...f, primary_text: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
                    <input
                      className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background"
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">CTA Type</label>
                      <select
                        className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background"
                        value={form.cta_type}
                        onChange={(e) => setForm((f) => ({ ...f, cta_type: e.target.value }))}
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
                        onChange={(e) => setForm((f) => ({ ...f, destination_url: e.target.value }))}
                      />
                    </div>
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
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Headline</p>
                      <p className="mt-1 text-sm font-medium">{ad.headline ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">CTA</p>
                      <p className="mt-1 text-sm font-medium">{CTA_LABELS[ad.cta_type] ?? ad.cta_type}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Primary Text</p>
                    <p className="mt-1 text-sm">{ad.primary_text ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Description</p>
                    <p className="mt-1 text-sm">{ad.description ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Destination URL</p>
                    {ad.destination_url ? (
                      <a
                        href={ad.destination_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 text-sm text-primary hover:underline inline-flex items-center gap-1"
                      >
                        {ad.destination_url}
                        <ExternalLink className="size-3" />
                      </a>
                    ) : (
                      <p className="mt-1 text-sm text-muted-foreground">—</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Performance over time */}
          <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
              Performance Over Time
            </div>
            {reportsLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading reports...</div>
            ) : reports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 className="size-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No daily reports available yet</p>
                <p className="text-xs text-muted-foreground mt-1">Performance data will appear here once the ad is running</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Spend</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Impressions</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Clicks</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">CTR</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">CPC</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Conversions</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((r) => (
                      <tr key={r.id} className="border-b hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">{r.report_date}</td>
                        <td className="px-4 py-3 text-right font-mono">${formatCents(r.spend_cents)}</td>
                        <td className="px-4 py-3 text-right">{formatCompact(r.impressions)}</td>
                        <td className="px-4 py-3 text-right">{formatCompact(r.clicks)}</td>
                        <td className="px-4 py-3 text-right">{r.ctr.toFixed(2)}%</td>
                        <td className="px-4 py-3 text-right font-mono">${formatCents(r.cpc_cents)}</td>
                        <td className="px-4 py-3 text-right">{r.conversions}</td>
                        <td className="px-4 py-3 text-right">{r.roas.toFixed(2)}x</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
