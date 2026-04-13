"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Store,
  Users,
  Package,
  Truck,
  ShoppingCart,
  Target,
  type LucideIcon,
} from "lucide-react"
import { supabaseEts } from "@/lib/supabase"

interface Counts {
  stores: number
  activeClients: number
  products: number
  categories: number
  vendors: number
  pendingOrders: number
  loading: boolean
}

export default function EtsDashboard() {
  const [counts, setCounts] = useState<Counts>({
    stores: 0,
    activeClients: 0,
    products: 0,
    categories: 0,
    vendors: 0,
    pendingOrders: 0,
    loading: true,
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [stores, clients, products, categories, vendors, orders] = await Promise.all([
        supabaseEts.from("stores").select("id", { count: "exact", head: true }),
        supabaseEts
          .from("clients")
          .select("id", { count: "exact", head: true })
          .eq("is_lost", false),
        supabaseEts.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabaseEts.from("categories").select("id", { count: "exact", head: true }),
        supabaseEts.from("vendors").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabaseEts.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ])
      if (cancelled) return
      setCounts({
        stores: stores.count ?? 0,
        activeClients: clients.count ?? 0,
        products: products.count ?? 0,
        categories: categories.count ?? 0,
        vendors: vendors.count ?? 0,
        pendingOrders: orders.count ?? 0,
        loading: false,
      })
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">EazyToSell Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Store Launch Program — client pipeline, products, vendors, ops.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard label="Stores" value={counts.stores} icon={Store} loading={counts.loading} />
        <StatCard
          label="Active clients"
          value={counts.activeClients}
          icon={Users}
          loading={counts.loading}
        />
        <StatCard
          label="Products"
          value={counts.products}
          icon={Package}
          loading={counts.loading}
        />
        <StatCard
          label="Categories"
          value={counts.categories}
          icon={Target}
          loading={counts.loading}
        />
        <StatCard
          label="Active vendors"
          value={counts.vendors}
          icon={Truck}
          loading={counts.loading}
        />
        <StatCard
          label="Pending orders"
          value={counts.pendingOrders}
          icon={ShoppingCart}
          loading={counts.loading}
        />
      </div>

      {/* Quick links */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
          Quick access
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 p-5">
          <QuickLink href="/ets/catalog/products" label="Product catalog" sub="599 SKUs" />
          <QuickLink href="/ets/catalog/categories" label="Categories" sub="78 taxonomy nodes" />
          <QuickLink href="/ets/sales/clients" label="Client pipeline" sub="27 formation clients" />
          <QuickLink href="/ets/stores" label="Live stores" sub="1 store tracked" />
          <QuickLink href="/ets/vendors" label="Vendor roster" sub="5 suppliers" />
          <QuickLink
            href="/ets/supply/launches"
            label="Supply chain"
            sub="launches, China batches, dispatch"
          />
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  loading,
}: {
  label: string
  value: number
  icon: LucideIcon
  loading: boolean
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        <span className="inline-flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
      </div>
      {loading ? (
        <div className="mt-3 h-8 w-20 animate-pulse rounded bg-muted" />
      ) : (
        <div className="mt-2 text-2xl font-bold tracking-tight">
          {value.toLocaleString()}
        </div>
      )}
    </div>
  )
}

function QuickLink({
  href,
  label,
  sub,
}: {
  href: string
  label: string
  sub: string
}) {
  return (
    <Link
      href={href}
      className="group rounded-md border border-border/80 p-3 hover:bg-muted/40 transition-colors"
    >
      <div className="text-sm font-semibold">{label}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
    </Link>
  )
}
