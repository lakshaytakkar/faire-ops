"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
  Store,
  ShoppingBag,
  Package,
  Users,
  RefreshCw,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react"
import { useJSBOrderStats, useJSBSync, useJSBStores } from "@/lib/use-jsblueridge-data"
import { StatusBadge } from "@/components/shared/status-badge"

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never"
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function isStale(dateStr: string | null): boolean {
  if (!dateStr) return true
  return Date.now() - new Date(dateStr).getTime() > 24 * 60 * 60 * 1000
}

export default function JSBlueridgeOverview() {
  const { stores, loading: storesLoading } = useJSBStores()
  const { stats, loading: statsLoading } = useJSBOrderStats()
  const { syncing, error: syncError, triggerSync } = useJSBSync()
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  // Extra counts via API proxy
  const [productCount, setProductCount] = useState(0)
  const [retailerCount, setRetailerCount] = useState(0)

  useEffect(() => {
    fetch("/api/jsblueridge/data?table=faire_products&count=true")
      .then((r) => r.json())
      .then((j) => setProductCount(j.count ?? 0))
    fetch("/api/jsblueridge/data?table=faire_retailers&count=true")
      .then((r) => r.json())
      .then((j) => setRetailerCount(j.count ?? 0))
  }, [])

  async function handleSync() {
    setSyncMsg(null)
    await triggerSync()
    // Refresh counts
    const [p, r] = await Promise.all([
      fetch("/api/jsblueridge/data?table=faire_products&count=true").then((x) => x.json()),
      fetch("/api/jsblueridge/data?table=faire_retailers&count=true").then((x) => x.json()),
    ])
    setProductCount(p.count ?? 0)
    setRetailerCount(r.count ?? 0)
    setSyncMsg("Sync completed — counts refreshed")
  }

  const loading = storesLoading || statsLoading
  const totalRevenue = stats.totalRevenueCents / 100
  const pendingCount = stats.newOrders + stats.processing
  const store = stores[0]

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  if (loading) {
    return (
      <div className="space-y-6 max-w-[1440px] mx-auto w-full">
        <div className="h-[200px] rounded-md bg-muted animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[120px] rounded-md bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto w-full">
      {/* Hero Banner */}
      <div
        className="rounded-md px-8 py-7 text-white"
        style={{ background: "linear-gradient(135deg, hsl(225,47%,15%) 0%, hsl(223,83%,35%) 100%)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium opacity-75">{greeting}</p>
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 h-8 px-3 rounded-md bg-white/10 text-sm font-medium text-white hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing…" : "Sync from Faire"}
          </button>
        </div>
        <h1 className="mt-1 text-3xl font-bold font-heading tracking-tight">
          JSBlueridge Operations
        </h1>
        <p className="mt-1 text-sm opacity-60">
          JSBlueRidge Toys &middot; Wholesale brand management
        </p>
        <div className="mt-5 flex items-center gap-8">
          <div>
            <p className="text-2xl font-bold">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
            <p className="text-xs opacity-50">Total Revenue</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs opacity-50">Total Orders</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{productCount.toLocaleString()}</p>
            <p className="text-xs opacity-50">Active Listings</p>
          </div>
        </div>
      </div>

      {/* Sync feedback */}
      {(syncError || syncMsg) && (
        <div className={`text-sm rounded-md px-4 py-2.5 ${
          syncError
            ? "bg-red-50 text-red-700 ring-1 ring-red-200"
            : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
        }`}>
          {syncError ?? syncMsg}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCardFull label="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} sub={`${stats.total} orders`} icon={DollarSign} color="#225aea" />
        <StatCardFull label="Pending Orders" value={String(pendingCount)} sub={`${stats.newOrders} new, ${stats.processing} processing`} icon={ShoppingBag} color="#ef4444" highlight={pendingCount > 0} />
        <StatCardFull label="Products" value={productCount.toLocaleString()} sub="Active listings" icon={Package} color="#10b981" />
        <StatCardFull label="Retailers" value={retailerCount.toLocaleString()} sub="Wholesale buyers" icon={Users} color="#f59e0b" />
      </div>

      {/* Store Status + Quick Access */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Store Status */}
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-3.5">
            <h2 className="text-sm font-semibold">Store Status</h2>
          </div>
          <div className="divide-y">
            {store ? (
              <div className="flex items-center gap-4 px-5 py-3.5">
                <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${store.color ?? "#3b82f6"}15` }}>
                  {isStale(store.last_synced_at) ? (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" style={{ color: store.color ?? "#3b82f6" }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{store.name}</p>
                    <StatusBadge tone={isStale(store.last_synced_at) ? "amber" : "emerald"}>
                      {isStale(store.last_synced_at) ? "Stale" : "Synced"}
                    </StatusBadge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Last synced {timeAgo(store.last_synced_at)} &middot; {store.total_orders ?? 0} orders &middot; {store.total_products ?? 0} products
                  </p>
                </div>
              </div>
            ) : (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">No store configured</div>
            )}
          </div>
        </div>

        {/* Quick Access */}
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b text-sm font-semibold">Quick Access</div>
          <div className="grid grid-cols-1 gap-0 divide-y">
            <QuickLink href="/jsblueridge/orders/all" icon={ShoppingBag} label="Orders" desc="View and manage wholesale orders" count={stats.total} />
            <QuickLink href="/jsblueridge/catalog/listings" icon={Package} label="Catalog" desc="Browse products and manage listings" count={productCount} />
            <QuickLink href="/jsblueridge/retailers/directory" icon={Users} label="Retailers" desc="Track wholesale buyer activity" count={retailerCount} />
          </div>
        </div>
      </div>

      {/* In Transit / Delivered */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStat label="In Transit" value={stats.inTransit} />
        <MiniStat label="Delivered" value={stats.delivered} />
        <MiniStat label="Canceled" value={stats.canceled} />
        <MiniStat label="New" value={stats.newOrders} />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatCardFull({ label, value, sub, icon: Icon, color, highlight }: {
  label: string; value: string; sub: string; icon: LucideIcon; color: string; highlight?: boolean
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold font-heading mt-2 ${highlight ? "text-red-600" : ""}`}>{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </div>
      <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}1a` }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
    </div>
  )
}

function QuickLink({ href, icon: Icon, label, desc, count }: {
  href: string; icon: LucideIcon; label: string; desc: string; count: number
}) {
  return (
    <Link href={href} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors">
      <span className="inline-flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
        <Icon className="size-4" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <span className="text-sm font-medium text-muted-foreground tabular-nums shrink-0">{count.toLocaleString()}</span>
    </Link>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-xl font-bold font-heading mt-1 tabular-nums">{value.toLocaleString()}</p>
    </div>
  )
}
