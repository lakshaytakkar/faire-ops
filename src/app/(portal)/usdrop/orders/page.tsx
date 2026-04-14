import { ShoppingCart, CheckCircle2, Truck, Undo2, Clock } from "lucide-react"
import { supabaseUsdrop } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
import { OrdersClient, type OrderRow, type StoreLite } from "./orders-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Orders — USDrop | Suprans" }

type ShopifyOrder = {
  id: string
  store_id: string | null
  order_number: string | null
  email: string | null
  financial_status: string | null
  fulfillment_status: string | null
  total_price: number | null
  currency: string | null
  shopify_created_at: string | null
  created_at: string | null
}

async function fetchOrders() {
  const { data, error } = await supabaseUsdrop
    .from("shopify_store_orders")
    .select(
      "id, store_id, order_number, email, financial_status, fulfillment_status, total_price, currency, shopify_created_at, created_at",
    )
    .order("shopify_created_at", { ascending: false, nullsFirst: false })
    .limit(200)
  if (error) console.error("usdrop.shopify_store_orders:", error.message)
  const rows = (data ?? []) as ShopifyOrder[]
  const storeIds = Array.from(new Set(rows.map((r) => r.store_id).filter(Boolean) as string[]))
  let stores: StoreLite[] = []
  if (storeIds.length > 0) {
    const { data: sdata } = await supabaseUsdrop
      .from("shopify_stores")
      .select("id, store_name, shop_domain")
      .in("id", storeIds)
    stores = (sdata ?? []) as StoreLite[]
  }
  return { rows, stores }
}

export default async function OrdersPage() {
  const { rows, stores } = await fetchOrders()

  const orderRows: OrderRow[] = rows.map((o) => ({
    id: o.id,
    store_id: o.store_id,
    order_number: o.order_number,
    email: o.email,
    financial_status: o.financial_status,
    fulfillment_status: o.fulfillment_status,
    total_price: o.total_price,
    currency: o.currency,
    shopify_created_at: o.shopify_created_at,
    created_at: o.created_at,
  }))

  const paidCount = rows.filter((r) => r.financial_status === "paid").length
  const fulfilledCount = rows.filter((r) => r.fulfillment_status === "fulfilled").length
  const refundedCount = rows.filter(
    (r) => r.financial_status === "refunded" || r.financial_status === "partially_refunded",
  ).length
  const pendingCount = rows.filter(
    (r) => r.financial_status === "pending" || r.fulfillment_status === null || r.fulfillment_status === "pending",
  ).length

  return (
    <div className="space-y-5">
      <PageHeader
        title="Orders"
        subtitle={`${rows.length.toLocaleString("en-IN")} Shopify orders (newest 200)`}
      />

      <KPIGrid>
        <MetricCard
          label="Paid"
          value={paidCount}
          icon={CheckCircle2}
          iconTone="emerald"
          hint={`${rows.length} total`}
        />
        <MetricCard
          label="Fulfilled"
          value={fulfilledCount}
          icon={Truck}
          iconTone="blue"
          hint="shipped out"
        />
        <MetricCard
          label="Refunded"
          value={refundedCount}
          icon={Undo2}
          iconTone={refundedCount > 0 ? "red" : "slate"}
          hint="full or partial"
        />
        <MetricCard
          label="Pending"
          value={pendingCount}
          icon={Clock}
          iconTone="amber"
          hint="payment or fulfillment"
        />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="No orders yet"
          description="Orders from connected Shopify stores land here once a store completes its first sync."
        />
      ) : (
        <OrdersClient rows={orderRows} stores={stores} />
      )}
    </div>
  )
}
