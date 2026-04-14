import Link from "next/link"
import {
  ArrowRight,
  Package,
  Users,
  Store,
  GraduationCap,
  ShoppingCart,
  Sparkles,
  Ticket,
  type LucideIcon,
} from "lucide-react"
import { supabaseUsdrop } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"

export const dynamic = "force-dynamic"
export const metadata = { title: "Overview — USDrop | Suprans" }

async function fetchCounts() {
  try {
    const [profiles, products, categories, courses, stores, suppliers, tickets, orders] = await Promise.all([
      supabaseUsdrop.from("profiles").select("id", { count: "exact", head: true }),
      supabaseUsdrop.from("products").select("id", { count: "exact", head: true }),
      supabaseUsdrop.from("categories").select("id", { count: "exact", head: true }),
      supabaseUsdrop.from("courses").select("id", { count: "exact", head: true }),
      supabaseUsdrop.from("shopify_stores").select("id", { count: "exact", head: true }),
      supabaseUsdrop.from("suppliers").select("id", { count: "exact", head: true }),
      supabaseUsdrop.from("support_tickets").select("id", { count: "exact", head: true }),
      supabaseUsdrop.from("shopify_store_orders").select("id", { count: "exact", head: true }),
    ])
    return {
      profiles: profiles.count ?? 0,
      products: products.count ?? 0,
      categories: categories.count ?? 0,
      courses: courses.count ?? 0,
      stores: stores.count ?? 0,
      suppliers: suppliers.count ?? 0,
      tickets: tickets.count ?? 0,
      orders: orders.count ?? 0,
    }
  } catch {
    return { profiles: 0, products: 0, categories: 0, courses: 0, stores: 0, suppliers: 0, tickets: 0, orders: 0 }
  }
}

const QUICK_LINKS: Array<{ href: string; title: string; body: string; icon: LucideIcon }> = [
  { href: "/usdrop/products", title: "Product catalog", body: "Every SKU in the USDrop catalog with pricing, metadata, and source lineage.", icon: Package },
  { href: "/usdrop/users", title: "Users", body: "Every registered client and internal team member, with plan and onboarding state.", icon: Users },
  { href: "/usdrop/stores", title: "Shopify stores", body: "Connected client stores with sync status, product counts, and resync controls.", icon: Store },
  { href: "/usdrop/orders", title: "Orders", body: "Shopify orders from connected stores with financial and fulfillment state.", icon: ShoppingCart },
  { href: "/usdrop/tickets", title: "Support tickets", body: "Queue of open and resolved tickets filed by clients from the app.", icon: Ticket },
  { href: "/usdrop/pipeline", title: "AI pipeline", body: "Review queue for AI-generated listings before they ship to the client catalog.", icon: Sparkles },
]

export default async function UsdropOverviewPage() {
  const c = await fetchCounts()
  return (
    <div className="space-y-5">
      <PageHeader
        title="USDrop"
        subtitle="Back-office for the USDrop AI client app — catalog, users, stores, orders, tickets, and the AI pipeline that feeds them."
      />

      <KPIGrid>
        <MetricCard label="Users" value={c.profiles.toLocaleString("en-IN")} icon={Users} iconTone="blue" href="/usdrop/users" />
        <MetricCard label="Products" value={c.products.toLocaleString("en-IN")} icon={Package} iconTone="violet" href="/usdrop/products" />
        <MetricCard label="Stores" value={c.stores.toLocaleString("en-IN")} icon={Store} iconTone="emerald" href="/usdrop/stores" />
        <MetricCard label="Suppliers" value={c.suppliers.toLocaleString("en-IN")} icon={Sparkles} iconTone="amber" href="/usdrop/suppliers" />
      </KPIGrid>

      <KPIGrid>
        <MetricCard label="Orders" value={c.orders.toLocaleString("en-IN")} icon={ShoppingCart} iconTone="blue" href="/usdrop/orders" hint="Shopify pulled" />
        <MetricCard label="Open tickets" value={c.tickets.toLocaleString("en-IN")} icon={Ticket} iconTone="red" href="/usdrop/tickets" />
        <MetricCard label="Categories" value={c.categories.toLocaleString("en-IN")} icon={Package} iconTone="slate" href="/usdrop/categories" />
        <MetricCard label="Courses" value={c.courses.toLocaleString("en-IN")} icon={GraduationCap} iconTone="violet" href="/usdrop/courses" />
      </KPIGrid>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {QUICK_LINKS.map((q) => (
          <Link key={q.href} href={q.href} className="block group">
            <div className="rounded-lg border border-border/80 bg-card shadow-sm p-4 h-full transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="size-9 rounded-md bg-primary/10 flex items-center justify-center">
                  <q.icon className="size-4 text-primary" />
                </span>
                <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
              <h3 className="text-sm font-semibold mb-1 group-hover:text-primary">{q.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{q.body}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
