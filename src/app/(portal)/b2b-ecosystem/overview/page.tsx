"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Store,
  ShoppingBag,
  Package,
  Users,
  type LucideIcon,
} from "lucide-react"
import { supabaseB2BEcosystem } from "@/lib/supabase"

interface Counts {
  brands: number
  orders: number
  products: number
  retailers: number
  loading: boolean
}

interface BrandRow {
  id: string
  name: string | null
  category: string | null
  short_code: string | null
  is_active: boolean | null
}

export default function B2BEcosystemOverview() {
  const [counts, setCounts] = useState<Counts>({
    brands: 0,
    orders: 0,
    products: 0,
    retailers: 0,
    loading: true,
  })
  const [brands, setBrands] = useState<BrandRow[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [stores, orders, products, retailers, brandRows] =
        await Promise.all([
          supabaseB2BEcosystem
            .from("faire_stores")
            .select("id", { count: "exact", head: true }),
          supabaseB2BEcosystem
            .from("faire_orders")
            .select("id", { count: "exact", head: true }),
          supabaseB2BEcosystem
            .from("faire_products")
            .select("id", { count: "exact", head: true }),
          supabaseB2BEcosystem
            .from("faire_retailers")
            .select("id", { count: "exact", head: true }),
          supabaseB2BEcosystem
            .from("faire_stores")
            .select("id, name, category, short_code, is_active")
            .order("name"),
        ])
      if (cancelled) return
      setCounts({
        brands: stores.count ?? 0,
        orders: orders.count ?? 0,
        products: products.count ?? 0,
        retailers: retailers.count ?? 0,
        loading: false,
      })
      setBrands((brandRows.data as BrandRow[]) ?? [])
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Hero gradient banner */}
      <div
        className="relative rounded-2xl overflow-hidden px-8 py-10"
        style={{
          background: "linear-gradient(135deg, hsl(200,50%,12%) 0%, hsl(195,60%,30%) 100%)",
        }}
      >
        <div className="relative z-10">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-sky-300/80 mb-2">
            B2B Ecosystem
          </span>
          <h1 className="text-2xl font-bold font-heading text-white">
            D2C Operations Hub
          </h1>
          <p className="mt-1 text-sm text-white/70">
            Independent brand operations &mdash; Toyarina &amp; Gullee
          </p>

          <div className="mt-6 grid grid-cols-3 gap-6 max-w-md">
            <div>
              <div className="text-2xl font-bold text-white tabular-nums">
                {counts.loading ? "\u2014" : counts.brands.toLocaleString()}
              </div>
              <div className="text-xs text-white/60 mt-0.5">Brands</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white tabular-nums">
                {counts.loading ? "\u2014" : counts.orders.toLocaleString()}
              </div>
              <div className="text-xs text-white/60 mt-0.5">Orders</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white tabular-nums">
                {counts.loading ? "\u2014" : counts.products.toLocaleString()}
              </div>
              <div className="text-xs text-white/60 mt-0.5">Products</div>
            </div>
          </div>
        </div>

        {/* Decorative circles */}
        <div className="absolute -top-16 -right-16 size-64 rounded-full bg-white/5" />
        <div className="absolute -bottom-20 -left-20 size-48 rounded-full bg-white/5" />
      </div>

      {/* KPI stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Brands"
          value={counts.brands}
          icon={Store}
          loading={counts.loading}
        />
        <StatCard
          label="Orders"
          value={counts.orders}
          icon={ShoppingBag}
          loading={counts.loading}
        />
        <StatCard
          label="Products"
          value={counts.products}
          icon={Package}
          loading={counts.loading}
        />
        <StatCard
          label="Retailers"
          value={counts.retailers}
          icon={Users}
          loading={counts.loading}
        />
      </div>

      {/* Quick-nav cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <NavCard
          href="/b2b-ecosystem/orders"
          icon={ShoppingBag}
          title="Orders"
          description="View and manage Faire orders across brands"
        />
        <NavCard
          href="/b2b-ecosystem/catalog"
          icon={Package}
          title="Catalog"
          description="Product listings, pricing, and inventory"
        />
        <NavCard
          href="/b2b-ecosystem/retailers"
          icon={Users}
          title="Retailers"
          description="Retail partners and wholesale accounts"
        />
      </div>

      {/* Brands section */}
      <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
          Brands
        </div>
        {brands.length === 0 && !counts.loading ? (
          <div className="p-5 text-sm text-muted-foreground">
            No brands registered yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
            {brands.map((b) => (
              <div
                key={b.id}
                className="rounded-lg border border-border p-4 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{b.name}</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      b.is_active
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {b.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                {b.category && (
                  <p className="text-sm text-muted-foreground">{b.category}</p>
                )}
                {b.short_code && (
                  <p className="text-sm text-muted-foreground">
                    Code: {b.short_code}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
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
    <div className="rounded-lg border border-border bg-card shadow-sm p-5">
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
        <div className="mt-2 text-2xl font-bold tracking-tight tabular-nums">
          {value.toLocaleString()}
        </div>
      )}
    </div>
  )
}

function NavCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow cursor-pointer block"
    >
      <div className="flex items-center gap-3 mb-2">
        <span className="inline-flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <span className="text-[0.9375rem] font-semibold tracking-tight">
          {title}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
  )
}
