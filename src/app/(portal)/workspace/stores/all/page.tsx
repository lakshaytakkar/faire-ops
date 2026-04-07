"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import {
  Store,
  RefreshCw,
  ShoppingCart,
  Package,
  Clock,
  Globe,
  Mail,
  ExternalLink,
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

function hasBrandKit(store: StoreProfile): boolean {
  return !!(store.brand_primary_color || store.brand_accent_color || store.brand_style || store.brand_tagline)
}

export default function WorkspaceStoresPage() {
  const router = useRouter()
  const [stores, setStores] = useState<StoreProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [syncingAll, setSyncingAll] = useState(false)
  const [syncingStore, setSyncingStore] = useState<string | null>(null)

  function fetchStores() {
    supabase
      .from("faire_stores")
      .select("*")
      .eq("active", true)
      .order("name")
      .then(({ data }) => {
        setStores((data ?? []) as StoreProfile[])
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchStores()
  }, [])

  async function handleSyncAll() {
    setSyncingAll(true)
    try {
      await fetch("/api/faire/sync", { method: "POST" })
      fetchStores()
    } finally {
      setSyncingAll(false)
    }
  }

  async function handleSyncStore(e: React.MouseEvent, storeId: string) {
    e.stopPropagation()
    setSyncingStore(storeId)
    try {
      await fetch("/api/faire/sync", { method: "POST" })
      fetchStores()
    } finally {
      setSyncingStore(null)
    }
  }

  // Computed stats
  const totalOrders = stores.reduce((sum, s) => sum + s.total_orders, 0)
  const totalProducts = stores.reduce((sum, s) => sum + s.total_products, 0)
  const lastSynced = stores.reduce<string | null>((latest, s) => {
    if (!s.last_synced_at) return latest
    if (!latest) return s.last_synced_at
    return new Date(s.last_synced_at) > new Date(latest) ? s.last_synced_at : latest
  }, null)

  if (loading) {
    return (
      <div className="space-y-5 max-w-[1440px] mx-auto w-full">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-32 rounded bg-muted animate-pulse" />
            <div className="h-4 w-48 rounded bg-muted animate-pulse mt-2" />
          </div>
          <div className="h-9 w-24 rounded bg-muted animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[90px] rounded-md bg-muted animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[260px] rounded-md bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-[1440px] mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Stores</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {stores.length} active Faire stores
          </p>
        </div>
        <Button onClick={handleSyncAll} disabled={syncingAll}>
          <RefreshCw className={`size-4 mr-2 ${syncingAll ? "animate-spin" : ""}`} />
          {syncingAll ? "Syncing..." : "Sync All"}
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-md border bg-card p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Store className="size-4" />
            <span>Total Stores</span>
          </div>
          <p className="text-2xl font-bold font-heading mt-2">{stores.length}</p>
        </div>
        <div className="rounded-md border bg-card p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShoppingCart className="size-4" />
            <span>Total Orders</span>
          </div>
          <p className="text-2xl font-bold font-heading mt-2">{totalOrders.toLocaleString()}</p>
        </div>
        <div className="rounded-md border bg-card p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package className="size-4" />
            <span>Total Products</span>
          </div>
          <p className="text-2xl font-bold font-heading mt-2">{totalProducts.toLocaleString()}</p>
        </div>
        <div className="rounded-md border bg-card p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="size-4" />
            <span>Last Synced</span>
          </div>
          <p className="text-2xl font-bold font-heading mt-2">{timeAgo(lastSynced)}</p>
        </div>
      </div>

      {/* Store cards grid */}
      {stores.length === 0 ? (
        <div className="rounded-md border bg-card p-12 text-center">
          <Store className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium">No active stores found</p>
          <p className="text-xs text-muted-foreground mt-1">Connect a Faire store to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {stores.map((store) => (
            <div
              key={store.id}
              className="rounded-md border bg-card overflow-hidden cursor-pointer hover:shadow-sm transition-shadow"
              onClick={() => router.push(`/workspace/stores/${store.id}`)}
            >
              {/* Color bar */}
              <div className="h-1.5" style={{ backgroundColor: store.color }} />

              {/* Header row */}
              <div className="px-5 py-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ backgroundColor: store.color }}
                  >
                    {store.logo_url ? (
                      <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      store.short
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{store.name}</h3>
                    <p className="text-xs text-muted-foreground">{store.category}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[180px]">
                      ID: {store.faire_store_id.slice(0, 12)}...
                    </p>
                  </div>
                </div>
                <span className="border-0 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 shrink-0">
                  Active
                </span>
              </div>

              {/* Stats row */}
              <div className="px-5 pb-3 flex items-center gap-6">
                <div>
                  <p className="text-lg font-bold font-heading">{store.total_orders.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Orders</p>
                </div>
                <div>
                  <p className="text-lg font-bold font-heading">{store.total_products.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Products</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{timeAgo(store.last_synced_at)}</p>
                  <p className="text-xs text-muted-foreground">Last Sync</p>
                </div>
              </div>

              {/* Brand kit preview */}
              {hasBrandKit(store) && (
                <div className="px-5 pb-3 border-t pt-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    {store.brand_primary_color && (
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full border" style={{ backgroundColor: store.brand_primary_color }} />
                        <span className="text-xs text-muted-foreground">Primary</span>
                      </div>
                    )}
                    {store.brand_accent_color && (
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full border" style={{ backgroundColor: store.brand_accent_color }} />
                        <span className="text-xs text-muted-foreground">Accent</span>
                      </div>
                    )}
                    {store.brand_style && (
                      <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                        {store.brand_style}
                      </span>
                    )}
                  </div>
                  {store.brand_tagline && (
                    <p className="text-xs text-muted-foreground mt-1.5 italic truncate">&quot;{store.brand_tagline}&quot;</p>
                  )}
                </div>
              )}

              {/* Contact preview */}
              {(store.website_url || store.contact_email) && (
                <div className="px-5 pb-3 flex items-center gap-4">
                  {store.website_url && (
                    <div className="flex items-center gap-1.5">
                      <Globe className="size-3 text-muted-foreground" />
                      <span className="text-xs text-primary truncate max-w-[160px]">{store.website_url.replace(/^https?:\/\//, "")}</span>
                    </div>
                  )}
                  {store.contact_email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="size-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground truncate max-w-[160px]">{store.contact_email}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="px-5 py-3 border-t flex items-center justify-between">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/workspace/stores/${store.id}`)
                  }}
                >
                  <ExternalLink className="size-3 mr-1" />
                  View Details
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  disabled={syncingStore === store.id}
                  onClick={(e) => handleSyncStore(e, store.id)}
                >
                  <RefreshCw className={`size-3 mr-1 ${syncingStore === store.id ? "animate-spin" : ""}`} />
                  {syncingStore === store.id ? "Syncing..." : "Sync"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
