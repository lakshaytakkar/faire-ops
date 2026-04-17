import Link from "next/link"
import { Package, Users, ShoppingCart, ClipboardList, Layers, TrendingUp } from "lucide-react"
import { supabaseGullee } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"

export const dynamic = "force-dynamic"
export const metadata = { title: "Overview — Gullee | Suprans" }

interface OrderRow {
  id: string
  order_number: string
  status: string
  total: number
  item_count: number
  placed_at: string
  retailers?: { business_name: string; state: string | null } | null
}

interface ApplicationRow {
  id: string
  business_name: string
  contact_name: string | null
  email: string
  country: string | null
  status: string
  applied_at: string
}

async function fetchDashboard() {
  const [productsCount, activeProducts, collectionsCount, retailersCount, pendingApplications, ordersCount, mtdRevenue, recentOrders, recentApplications] = await Promise.all([
    supabaseGullee.from("products").select("id", { count: "exact", head: true }),
    supabaseGullee.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabaseGullee.from("collections").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabaseGullee.from("retailers").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabaseGullee.from("wholesale_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabaseGullee.from("orders").select("id", { count: "exact", head: true }),
    supabaseGullee.from("orders").select("total").gte("placed_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    supabaseGullee.from("orders").select("id, order_number, status, total, item_count, placed_at, retailers(business_name, state)").order("placed_at", { ascending: false }).limit(8),
    supabaseGullee.from("wholesale_applications").select("id, business_name, contact_name, email, country, status, applied_at").order("applied_at", { ascending: false }).limit(6),
  ])

  const mtdTotal = (mtdRevenue.data ?? []).reduce((s: number, o: { total: number | string }) => s + Number(o.total ?? 0), 0)

  return {
    products: productsCount.count ?? 0,
    activeProducts: activeProducts.count ?? 0,
    collections: collectionsCount.count ?? 0,
    retailers: retailersCount.count ?? 0,
    pendingApps: pendingApplications.count ?? 0,
    orders: ordersCount.count ?? 0,
    mtdRevenue: mtdTotal,
    recentOrders: (recentOrders.data ?? []) as unknown as OrderRow[],
    recentApplications: (recentApplications.data ?? []) as unknown as ApplicationRow[],
  }
}

export default async function GulleeOverviewPage() {
  const d = await fetchDashboard()

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Gullee Admin"
        subtitle="B2B pet wholesale — US market. Storefronts: gullee.com + toyarina.com."
      />

      <KPIGrid>
        <MetricCard label="Active products" value={d.activeProducts} icon={Package} iconTone="emerald" hint={`${d.products} total · ${d.collections} collections`} />
        <MetricCard label="Active retailers" value={d.retailers} icon={Users} iconTone="blue" hint={`${d.pendingApps} pending apps`} />
        <MetricCard label="Total orders" value={d.orders} icon={ShoppingCart} iconTone="amber" hint="All time" />
        <MetricCard label="Revenue (MTD)" value={`$${d.mtdRevenue.toLocaleString()}`} icon={TrendingUp} iconTone="emerald" hint="This month" />
      </KPIGrid>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <h2 className="text-[0.9375rem] font-semibold tracking-tight flex items-center gap-2">
              <ShoppingCart className="size-4 text-muted-foreground" />
              Recent orders
            </h2>
            <Link href="/gullee/orders" className="text-sm text-muted-foreground hover:text-foreground">View all →</Link>
          </div>
          <div className="divide-y">
            {d.recentOrders.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">No orders yet</div>
            ) : d.recentOrders.map((o) => (
              <div key={o.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{o.order_number} · {o.retailers?.business_name ?? "—"}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {o.retailers?.state ?? "—"} · {o.item_count} items · {new Date(o.placed_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-semibold tabular-nums">${Number(o.total).toLocaleString()}</span>
                  <StatusBadge tone={toneForStatus(o.status)}>{o.status}</StatusBadge>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <h2 className="text-[0.9375rem] font-semibold tracking-tight flex items-center gap-2">
              <ClipboardList className="size-4 text-muted-foreground" />
              Pending applications
            </h2>
            <Link href="/gullee/applications" className="text-sm text-muted-foreground hover:text-foreground">Review →</Link>
          </div>
          <div className="divide-y">
            {d.recentApplications.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">No applications yet</div>
            ) : d.recentApplications.map((a) => (
              <div key={a.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{a.business_name}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {a.contact_name ?? "—"} · {a.email} · {a.country ?? "—"}
                  </div>
                </div>
                <StatusBadge tone={toneForStatus(a.status)}>{a.status}</StatusBadge>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { href: "/gullee/products", label: "Products", icon: Package },
          { href: "/gullee/collections", label: "Collections", icon: Layers },
          { href: "/gullee/retailers", label: "Retailers", icon: Users },
          { href: "/gullee/orders", label: "Orders", icon: ShoppingCart },
          { href: "/gullee/applications", label: "Applications", icon: ClipboardList },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-lg border border-border/80 bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all flex items-center gap-3"
          >
            <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center text-primary">
              <link.icon className="size-4" />
            </div>
            <span className="text-sm font-medium">{link.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
