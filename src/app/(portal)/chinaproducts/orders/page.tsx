import Link from "next/link"
import { ShoppingCart, CheckCircle2, Factory, Truck, Clock } from "lucide-react"
import { supabaseChinaproducts } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { formatCurrency, formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Orders — chinaproducts.in | Suprans" }

interface OrderRow {
  id: string
  order_number: string
  buyer_name: string
  buyer_company: string | null
  buyer_city: string | null
  shipping_city: string | null
  shipping_mode: string
  quantity_tier: number
  total_inr: number | string
  status: string
  payment_status: string
  created_at: string | null
}

async function fetchOrders() {
  const { data, error } = await supabaseChinaproducts
    .from("orders")
    .select(
      "id, order_number, buyer_name, buyer_company, shipping_city, shipping_mode, quantity_tier, total_inr, status, payment_status, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200)
  if (error) console.error("chinaproducts.orders:", error.message)
  return (data ?? []) as OrderRow[]
}

export default async function ChinaproductsOrdersPage() {
  const rows = await fetchOrders()

  const confirmedCount = rows.filter((r) => r.status === "confirmed").length
  const inProductionCount = rows.filter((r) => r.status === "in_production" || r.status === "qc").length
  const dispatchedCount = rows.filter((r) => r.status === "dispatched" || r.status === "in_customs").length
  const deliveredCount = rows.filter((r) => r.status === "delivered").length

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Orders"
        subtitle={`${rows.length.toLocaleString("en-IN")} wholesale orders across all chinaproducts.in buyers.`}
      />

      <KPIGrid>
        <MetricCard label="Confirmed"       value={confirmedCount}    icon={CheckCircle2} iconTone="blue"    hint="awaiting production" />
        <MetricCard label="In production"   value={inProductionCount} icon={Factory}      iconTone="amber"   hint="factory floor + QC" />
        <MetricCard label="Dispatched"      value={dispatchedCount}   icon={Truck}        iconTone="violet"  hint="in transit or customs" />
        <MetricCard label="Delivered"       value={deliveredCount}    icon={Clock}        iconTone="emerald" hint="lifetime" />
      </KPIGrid>

      <DetailCard title={`Orders · ${rows.length}`}>
        {rows.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="No orders yet"
            description="Orders placed on chinaproducts.in land here once buyers complete checkout."
          />
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/30 border-y">
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Order</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Buyer</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Ship to</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Mode</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-5 py-2.5">Tier</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-5 py-2.5">Total</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Status</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Payment</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Placed</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-b-0 hover:bg-muted/40 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/chinaproducts/orders/${r.id}`} className="text-sm font-semibold hover:text-primary">
                        {r.order_number}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <div className="text-sm font-medium">{r.buyer_name}</div>
                      {r.buyer_company && <div className="text-sm text-muted-foreground">{r.buyer_company}</div>}
                    </td>
                    <td className="px-5 py-3 text-sm">{r.shipping_city ?? "—"}</td>
                    <td className="px-5 py-3"><StatusBadge tone="slate">{r.shipping_mode}</StatusBadge></td>
                    <td className="px-5 py-3 text-right text-sm tabular-nums">{r.quantity_tier}</td>
                    <td className="px-5 py-3 text-right text-sm font-medium tabular-nums">{formatCurrency(r.total_inr)}</td>
                    <td className="px-5 py-3"><StatusBadge tone={toneForStatus(r.status)}>{r.status.replace("_", " ")}</StatusBadge></td>
                    <td className="px-5 py-3"><StatusBadge tone={toneForStatus(r.payment_status)}>{r.payment_status}</StatusBadge></td>
                    <td className="px-5 py-3 text-sm text-muted-foreground tabular-nums">{formatDate(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DetailCard>
    </div>
  )
}
