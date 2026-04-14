import { notFound } from "next/navigation"
import { ExternalLink } from "lucide-react"
import { supabaseUsdrop } from "@/lib/supabase"
import { FullPageDetail } from "@/components/shared/detail-views"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import {
  StoreDetailTabs,
  type StoreFull,
  type OwnerFull,
  type ProductRow,
  type OrderRow,
} from "./store-detail-tabs"

export const dynamic = "force-dynamic"

type Params = { id: string }

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { id } = await params
  return { title: `Store ${id.slice(0, 8)} — USDrop | Suprans` }
}

async function fetchStore(id: string) {
  const storeRes = await supabaseUsdrop
    .from("shopify_stores")
    .select(
      "id, user_id, shop_domain, store_name, store_email, plan, is_active, last_synced_at, currency, country, products_count, orders_count, token_expires_at, scopes, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle()
  if (!storeRes.data) return null

  const store = storeRes.data as StoreFull
  const [owner, products, orders] = await Promise.all([
    store.user_id
      ? supabaseUsdrop
          .from("profiles")
          .select("id, full_name, email, avatar_url")
          .eq("id", store.user_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabaseUsdrop
      .from("shopify_store_products")
      .select(
        "id, title, product_type, vendor, status, total_inventory, created_at",
      )
      .eq("store_id", id)
      .order("created_at", { ascending: false })
      .limit(200),
    supabaseUsdrop
      .from("shopify_store_orders")
      .select(
        "id, order_number, email, financial_status, fulfillment_status, total_price, currency, shopify_created_at",
      )
      .eq("store_id", id)
      .order("shopify_created_at", { ascending: false, nullsFirst: false })
      .limit(100),
  ])

  return {
    store,
    owner: (owner.data ?? null) as OwnerFull,
    products: (products.data ?? []) as ProductRow[],
    orders: (orders.data ?? []) as OrderRow[],
  }
}

function formatDate(v: string | null) {
  if (!v) return "—"
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
}

export default async function StoreDetailPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params
  const data = await fetchStore(id)
  if (!data) notFound()
  const { store, owner, products, orders } = data

  const title = store.store_name ?? store.shop_domain ?? "Untitled store"
  const badges = [
    {
      label: store.is_active ? "Active" : "Inactive",
      className: store.is_active
        ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
        : "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200",
    },
    ...(store.plan
      ? [{ label: store.plan, className: "bg-muted text-muted-foreground ring-1 ring-inset ring-border" }]
      : []),
    ...(store.currency
      ? [{ label: store.currency, className: "bg-muted text-muted-foreground ring-1 ring-inset ring-border" }]
      : []),
  ]

  return (
    <FullPageDetail
      backLink={{ href: "/usdrop/stores", label: "All stores" }}
      title={title}
      subtitle={store.shop_domain ?? undefined}
      badges={badges}
      actions={
        store.shop_domain ? (
          <a
            href={`https://${store.shop_domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border bg-card text-sm hover:bg-muted/40"
          >
            <ExternalLink className="size-4" /> Open shop
          </a>
        ) : undefined
      }
    >
      <KPIGrid>
        <MetricCard label="Plan" value={store.plan ?? "—"} />
        <MetricCard
          label="Products"
          value={(store.products_count ?? products.length).toLocaleString()}
        />
        <MetricCard
          label="Orders"
          value={(store.orders_count ?? orders.length).toLocaleString()}
        />
        <MetricCard label="Last synced" value={formatDate(store.last_synced_at)} />
      </KPIGrid>

      <StoreDetailTabs store={store} owner={owner} products={products} orders={orders} />
    </FullPageDetail>
  )
}
