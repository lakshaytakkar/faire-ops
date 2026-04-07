"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import {
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  Save,
  X,
  Pencil,
  Globe,
  Mail,
  Phone,
  AtSign,
  Truck,
  Clock,
  DollarSign,
  Copy,
  Check,
  Store,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

interface StoreProfile {
  id: string
  faire_store_id: string
  name: string
  color: string
  short: string
  category: string
  total_orders: number
  total_products: number
  last_synced_at: string | null
  logo_url: string | null
  description: string | null
  faire_url: string | null
  website_url: string | null
  instagram: string | null
  contact_email: string | null
  contact_phone: string | null
  return_policy: string | null
  min_order_amount_cents: number
  lead_time_days: number
  ships_from: string | null
  brand_primary_color: string | null
  brand_accent_color: string | null
  brand_font: string | null
  brand_style: string | null
  brand_tagline: string | null
  brand_guidelines: string | null
  banner_url: string | null
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never"
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Never"
  return new Date(dateStr).toLocaleString()
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value || "—"}</span>
    </div>
  )
}

export default function StoreDetailPage() {
  const params = useParams()
  const router = useRouter()
  const storeId = params.id as string

  const [store, setStore] = useState<StoreProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [adjacentIds, setAdjacentIds] = useState<{prev: string | null, next: string | null}>({prev: null, next: null})

  const [form, setForm] = useState({
    description: "",
    category: "",
    brand_primary_color: "",
    brand_accent_color: "",
    brand_font: "Plus Jakarta Sans",
    brand_style: "modern",
    brand_tagline: "",
    brand_guidelines: "",
    website_url: "",
    contact_email: "",
    contact_phone: "",
    instagram: "",
    ships_from: "United States",
    lead_time_days: 3,
    min_order_amount_cents: 0,
    return_policy: "",
  })

  function fetchStore() {
    supabase
      .from("faire_stores")
      .select("*")
      .eq("id", storeId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true)
          setLoading(false)
          return
        }
        const s = data as StoreProfile
        setStore(s)
        setForm({
          description: s.description ?? "",
          category: s.category ?? "",
          brand_primary_color: s.brand_primary_color ?? "",
          brand_accent_color: s.brand_accent_color ?? "",
          brand_font: s.brand_font ?? "Plus Jakarta Sans",
          brand_style: s.brand_style ?? "modern",
          brand_tagline: s.brand_tagline ?? "",
          brand_guidelines: s.brand_guidelines ?? "",
          website_url: s.website_url ?? "",
          contact_email: s.contact_email ?? "",
          contact_phone: s.contact_phone ?? "",
          instagram: s.instagram ?? "",
          ships_from: s.ships_from ?? "United States",
          lead_time_days: s.lead_time_days ?? 3,
          min_order_amount_cents: s.min_order_amount_cents ?? 0,
          return_policy: s.return_policy ?? "",
        })
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchStore()
  }, [storeId])

  useEffect(() => {
    if (!store) return
    supabase
      .from("faire_stores")
      .select("id")
      .eq("active", true)
      .order("name")
      .then(({ data }) => {
        if (!data) return
        const idx = data.findIndex(o => o.id === storeId)
        setAdjacentIds({
          prev: idx > 0 ? data[idx - 1].id : null,
          next: idx < data.length - 1 ? data[idx + 1].id : null,
        })
      })
  }, [store, storeId])

  async function handleSave() {
    if (!store) return
    setSaving(true)
    await supabase.from("faire_stores").update(form).eq("id", store.id)
    setSaving(false)
    setEditing(false)
    fetchStore()
  }

  async function handleSync() {
    setSyncing(true)
    try {
      await fetch("/api/faire/sync", { method: "POST" })
      fetchStore()
    } finally {
      setSyncing(false)
    }
  }

  function handleCopyId() {
    if (!store) return
    navigator.clipboard.writeText(store.faire_store_id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="space-y-5 max-w-[1440px] mx-auto w-full">
        <div className="h-5 w-24 rounded bg-muted animate-pulse" />
        <div className="h-8 w-64 rounded bg-muted animate-pulse" />
        <div className="h-1 w-full rounded bg-muted animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[200px] rounded-md bg-muted animate-pulse" />
            ))}
          </div>
          <div className="space-y-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[150px] rounded-md bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (notFound || !store) {
    return (
      <div className="space-y-5 max-w-[1440px] mx-auto w-full">
        <Link href="/workspace/stores" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Stores
        </Link>
        <div className="rounded-md border bg-card p-12 text-center">
          <Store className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium">Store not found</p>
          <p className="text-xs text-muted-foreground mt-1">This store may have been removed or the ID is invalid.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push("/workspace/stores")}>
            Back to Stores
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-[1440px] mx-auto w-full">
      {/* Header */}
      <div className="space-y-3">
        <Link href="/workspace/stores" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Stores
        </Link>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold font-heading text-foreground">{store.name}</h1>
            <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {store.category}
            </span>
            <span className="border-0 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
              Active
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 mr-2">
              <Link
                href={adjacentIds.prev ? `/workspace/stores/${adjacentIds.prev}` : "#"}
                className={`h-8 w-8 flex items-center justify-center rounded-md border transition-colors ${adjacentIds.prev ? "hover:bg-muted" : "opacity-30 pointer-events-none"}`}
                title="Previous store"
              >
                <ChevronLeft className="size-4" />
              </Link>
              <Link
                href={adjacentIds.next ? `/workspace/stores/${adjacentIds.next}` : "#"}
                className={`h-8 w-8 flex items-center justify-center rounded-md border transition-colors ${adjacentIds.next ? "hover:bg-muted" : "opacity-30 pointer-events-none"}`}
                title="Next store"
              >
                <ChevronRight className="size-4" />
              </Link>
            </div>
            {editing ? (
              <>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  <X className="size-4 mr-1" /> Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  <Save className="size-4 mr-1" /> {saving ? "Saving..." : "Save"}
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="size-4 mr-1" /> Edit
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing}>
              <RefreshCw className={`size-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing..." : "Sync Store"}
            </Button>
            {store.faire_url && (
              <a href={store.faire_url} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline">
                  <ExternalLink className="size-4 mr-1" /> Open in Faire
                </Button>
              </a>
            )}
          </div>
        </div>

        {/* Color bar */}
        <div className="h-1 w-full rounded" style={{ backgroundColor: store.color }} />
      </div>

      {/* Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Card 1: Store Overview */}
          <div className="rounded-md border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b text-sm font-semibold">Store Overview</div>
            <div className="p-5">
              {editing ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className="w-16 h-16 rounded-lg flex items-center justify-center text-white text-lg font-bold shrink-0"
                      style={{ backgroundColor: store.color }}
                    >
                      {store.logo_url ? (
                        <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        store.short
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{store.name}</p>
                      <p className="text-xs text-muted-foreground">{store.faire_store_id}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</label>
                    <Input
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="mt-1 h-8 text-sm"
                      placeholder="e.g. Home & Living"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="mt-1 w-full rounded-md border p-2.5 text-sm min-h-[80px] resize-none"
                      placeholder="Store description..."
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-4">
                  <div
                    className="w-16 h-16 rounded-lg flex items-center justify-center text-white text-lg font-bold shrink-0"
                    style={{ backgroundColor: store.color }}
                  >
                    {store.logo_url ? (
                      <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      store.short
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{store.name}</p>
                    <p className="text-xs text-muted-foreground">{store.category}</p>
                    <p className="text-xs text-muted-foreground">ID: {store.faire_store_id}</p>
                    {store.description && (
                      <p className="text-sm text-muted-foreground mt-2">{store.description}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Brand Kit */}
          <div className="rounded-md border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b text-sm font-semibold">Brand Kit</div>
            <div className="p-5">
              {editing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Primary Color</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="color"
                          value={form.brand_primary_color || store.color}
                          onChange={(e) => setForm({ ...form, brand_primary_color: e.target.value })}
                          className="w-8 h-8 rounded border cursor-pointer"
                        />
                        <Input
                          value={form.brand_primary_color}
                          onChange={(e) => setForm({ ...form, brand_primary_color: e.target.value })}
                          className="h-8 text-xs w-28"
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Accent Color</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="color"
                          value={form.brand_accent_color || store.color}
                          onChange={(e) => setForm({ ...form, brand_accent_color: e.target.value })}
                          className="w-8 h-8 rounded border cursor-pointer"
                        />
                        <Input
                          value={form.brand_accent_color}
                          onChange={(e) => setForm({ ...form, brand_accent_color: e.target.value })}
                          className="h-8 text-xs w-28"
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Brand Font</label>
                      <select
                        value={form.brand_font}
                        onChange={(e) => setForm({ ...form, brand_font: e.target.value })}
                        className="mt-1 h-8 w-full rounded-md border px-2.5 text-sm"
                      >
                        <option>Plus Jakarta Sans</option>
                        <option>Inter</option>
                        <option>Poppins</option>
                        <option>Montserrat</option>
                        <option>Playfair Display</option>
                        <option>Lora</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Brand Style</label>
                      <select
                        value={form.brand_style}
                        onChange={(e) => setForm({ ...form, brand_style: e.target.value })}
                        className="mt-1 h-8 w-full rounded-md border px-2.5 text-sm"
                      >
                        <option value="modern">Modern</option>
                        <option value="vintage">Vintage</option>
                        <option value="playful">Playful</option>
                        <option value="minimal">Minimal</option>
                        <option value="luxury">Luxury</option>
                        <option value="handcrafted">Handcrafted</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Brand Tagline</label>
                    <Input
                      value={form.brand_tagline}
                      onChange={(e) => setForm({ ...form, brand_tagline: e.target.value })}
                      className="mt-1 h-8 text-sm"
                      placeholder="Your brand's one-liner..."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Brand Guidelines</label>
                    <textarea
                      value={form.brand_guidelines}
                      onChange={(e) => setForm({ ...form, brand_guidelines: e.target.value })}
                      className="mt-1 w-full rounded-md border p-2.5 text-sm min-h-[60px] resize-none"
                      placeholder="Usage guidelines, do's and don'ts..."
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Color swatches */}
                  <div className="flex items-center gap-6">
                    {store.brand_primary_color ? (
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-8 h-8 rounded border" style={{ backgroundColor: store.brand_primary_color }} />
                        <span className="text-xs text-muted-foreground">{store.brand_primary_color}</span>
                        <span className="text-xs text-muted-foreground">Primary</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-8 h-8 rounded border bg-muted" />
                        <span className="text-xs text-muted-foreground">Not set</span>
                        <span className="text-xs text-muted-foreground">Primary</span>
                      </div>
                    )}
                    {store.brand_accent_color ? (
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-8 h-8 rounded border" style={{ backgroundColor: store.brand_accent_color }} />
                        <span className="text-xs text-muted-foreground">{store.brand_accent_color}</span>
                        <span className="text-xs text-muted-foreground">Accent</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-8 h-8 rounded border bg-muted" />
                        <span className="text-xs text-muted-foreground">Not set</span>
                        <span className="text-xs text-muted-foreground">Accent</span>
                      </div>
                    )}
                  </div>

                  {/* Font & Style */}
                  <div className="flex items-center gap-4">
                    {store.brand_font && (
                      <div>
                        <span className="text-xs text-muted-foreground">Font:</span>{" "}
                        <span className="text-sm font-medium">{store.brand_font}</span>
                      </div>
                    )}
                    {store.brand_style && (
                      <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                        {store.brand_style}
                      </span>
                    )}
                  </div>

                  {/* Tagline */}
                  {store.brand_tagline && (
                    <p className="text-sm text-muted-foreground italic">&quot;{store.brand_tagline}&quot;</p>
                  )}

                  {/* Guidelines */}
                  {store.brand_guidelines && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Guidelines</p>
                      <p className="text-sm text-muted-foreground">{store.brand_guidelines}</p>
                    </div>
                  )}

                  {!store.brand_primary_color && !store.brand_accent_color && !store.brand_font && !store.brand_style && !store.brand_tagline && !store.brand_guidelines && (
                    <p className="text-sm text-muted-foreground">No brand kit configured. Click Edit to set up your brand identity.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Contact & Operations */}
          <div className="rounded-md border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b text-sm font-semibold">Contact & Operations</div>
            <div className="p-5">
              {editing ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Website</label>
                    <Input
                      value={form.website_url}
                      onChange={(e) => setForm({ ...form, website_url: e.target.value })}
                      className="mt-1 h-8 text-xs"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</label>
                    <Input
                      value={form.contact_email}
                      onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                      className="mt-1 h-8 text-xs"
                      placeholder="email@..."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone</label>
                    <Input
                      value={form.contact_phone}
                      onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                      className="mt-1 h-8 text-xs"
                      placeholder="+1..."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Instagram</label>
                    <Input
                      value={form.instagram}
                      onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                      className="mt-1 h-8 text-xs"
                      placeholder="@handle"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ships From</label>
                    <Input
                      value={form.ships_from}
                      onChange={(e) => setForm({ ...form, ships_from: e.target.value })}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Lead Time (days)</label>
                    <Input
                      type="number"
                      value={form.lead_time_days}
                      onChange={(e) => setForm({ ...form, lead_time_days: parseInt(e.target.value) || 0 })}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Min Order ($)</label>
                    <Input
                      type="number"
                      value={form.min_order_amount_cents / 100}
                      onChange={(e) => setForm({ ...form, min_order_amount_cents: Math.round(parseFloat(e.target.value) * 100) || 0 })}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Return Policy</label>
                    <textarea
                      value={form.return_policy}
                      onChange={(e) => setForm({ ...form, return_policy: e.target.value })}
                      className="mt-1 w-full rounded-md border p-2.5 text-sm min-h-[50px] resize-none"
                      placeholder="Return policy details..."
                    />
                  </div>
                </div>
              ) : (
                <div className="divide-y">
                  <InfoRow
                    label="Website"
                    value={
                      store.website_url ? (
                        <a href={store.website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                          {store.website_url.replace(/^https?:\/\//, "")} <ExternalLink className="size-3" />
                        </a>
                      ) : null
                    }
                  />
                  <InfoRow
                    label="Email"
                    value={
                      store.contact_email ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Mail className="size-3 text-muted-foreground" />
                          {store.contact_email}
                        </span>
                      ) : null
                    }
                  />
                  <InfoRow
                    label="Phone"
                    value={
                      store.contact_phone ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="size-3 text-muted-foreground" />
                          {store.contact_phone}
                        </span>
                      ) : null
                    }
                  />
                  <InfoRow
                    label="Instagram"
                    value={
                      store.instagram ? (
                        <span className="inline-flex items-center gap-1.5">
                          <AtSign className="size-3 text-muted-foreground" />
                          {store.instagram}
                        </span>
                      ) : null
                    }
                  />
                  <InfoRow
                    label="Ships From"
                    value={
                      store.ships_from ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Truck className="size-3 text-muted-foreground" />
                          {store.ships_from}
                        </span>
                      ) : null
                    }
                  />
                  <InfoRow
                    label="Lead Time"
                    value={
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="size-3 text-muted-foreground" />
                        {store.lead_time_days}d
                      </span>
                    }
                  />
                  <InfoRow
                    label="Min Order"
                    value={
                      <span className="inline-flex items-center gap-1.5">
                        <DollarSign className="size-3 text-muted-foreground" />
                        ${(store.min_order_amount_cents / 100).toFixed(0)}
                      </span>
                    }
                  />
                  <InfoRow
                    label="Return Policy"
                    value={store.return_policy ? <span className="text-right max-w-[300px] truncate">{store.return_policy}</span> : null}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Card 4: Sync Status */}
          <div className="rounded-md border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b text-sm font-semibold">Sync Status</div>
            <div className="p-5 space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Last Synced</p>
                <p className="text-sm font-medium mt-0.5">{timeAgo(store.last_synced_at)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{formatDate(store.last_synced_at)}</p>
              </div>
              <Button className="w-full" onClick={handleSync} disabled={syncing}>
                <RefreshCw className={`size-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing..." : "Sync Now"}
              </Button>
            </div>
          </div>

          {/* Card 5: Quick Stats */}
          <div className="rounded-md border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b text-sm font-semibold">Statistics</div>
            <div className="p-5 divide-y">
              <InfoRow label="Total Orders" value={store.total_orders.toLocaleString()} />
              <InfoRow label="Total Products" value={store.total_products.toLocaleString()} />
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Faire Store ID</span>
                <button
                  onClick={handleCopyId}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  <span className="truncate max-w-[120px]">{store.faire_store_id.slice(0, 12)}...</span>
                  {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                </button>
              </div>
            </div>
          </div>

          {/* Card 6: Store Links */}
          <div className="rounded-md border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b text-sm font-semibold">Links</div>
            <div className="p-5 space-y-2">
              {store.faire_url && (
                <a
                  href={store.faire_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="size-3" /> Faire Portal
                </a>
              )}
              {store.website_url && (
                <a
                  href={store.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Globe className="size-3" /> Website
                </a>
              )}
              {store.instagram && (
                <a
                  href={`https://instagram.com/${store.instagram.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <AtSign className="size-3" /> {store.instagram}
                </a>
              )}
              {!store.faire_url && !store.website_url && !store.instagram && (
                <p className="text-sm text-muted-foreground">No links configured</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
