import { notFound } from "next/navigation"
import { ShoppingCart } from "lucide-react"
import { supabaseChinaproducts } from "@/lib/supabase"
import { BackLink } from "@/components/shared/back-link"
import { HeroCard } from "@/components/shared/hero-card"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { formatCurrency, formatDateTime } from "@/lib/format"

export const dynamic = "force-dynamic"

interface OrderDetail {
  id: string
  order_number: string
  buyer_name: string
  buyer_company: string | null
  buyer_email: string
  buyer_phone: string
  buyer_gstin: string | null
  shipping_address: string
  shipping_city: string
  shipping_pincode: string | null
  shipping_mode: string
  quantity_tier: number
  subtotal_inr: number | string
  freight_inr: number | string
  duty_inr: number | string
  gst_inr: number | string
  margin_inr: number | string
  total_inr: number | string
  status: string
  payment_status: string
  estimated_delivery_range: string | null
  notes: string | null
  created_at: string | null
}

interface OrderItem {
  id: string
  sku: string
  product_name: string
  quantity: number
  factory_price_per_unit: number | string
  landed_per_unit: number | string
  line_total_inr: number | string
}

export default async function ChinaproductsOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data, error } = await supabaseChinaproducts
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle<OrderDetail>()

  if (error) console.error("chinaproducts.orders detail:", error.message)
  if (!data) notFound()

  const { data: items } = await supabaseChinaproducts
    .from("order_items")
    .select("id, sku, product_name, quantity, factory_price_per_unit, landed_per_unit, line_total_inr")
    .eq("order_id", id)
    .order("created_at", { ascending: true })

  const rows = (items ?? []) as OrderItem[]

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <BackLink href="/chinaproducts/orders" label="All orders" />

      <HeroCard
        title={data.order_number}
        subtitle={`${data.buyer_name}${data.buyer_company ? ` · ${data.buyer_company}` : ""}`}
        icon={ShoppingCart}
        tone="red"
        meta={
          <>
            <StatusBadge tone={toneForStatus(data.status)}>{data.status.replace("_", " ")}</StatusBadge>
            <StatusBadge tone={toneForStatus(data.payment_status)}>{data.payment_status}</StatusBadge>
            <StatusBadge tone="slate">{data.shipping_mode}</StatusBadge>
            <span className="text-sm text-muted-foreground tabular-nums">
              Total {formatCurrency(data.total_inr)}
            </span>
          </>
        }
        actions={
          <>
            <button type="button" className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border text-sm font-medium hover:bg-muted/40 transition-colors">
              Send invoice
            </button>
            <button type="button" className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              Advance stage
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <DetailCard title="Line items">
            {rows.length === 0 ? (
              <EmptyState title="No items on this order" />
            ) : (
              <div className="-mx-5 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/30 border-y">
                      <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">SKU</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Product</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-5 py-2.5">Qty</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-5 py-2.5">Factory</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-5 py-2.5">Landed</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-5 py-2.5">Line total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-b last:border-b-0">
                        <td className="px-5 py-3 text-sm font-mono">{r.sku}</td>
                        <td className="px-5 py-3 text-sm">{r.product_name}</td>
                        <td className="px-5 py-3 text-right text-sm tabular-nums">{r.quantity}</td>
                        <td className="px-5 py-3 text-right text-sm tabular-nums">{formatCurrency(r.factory_price_per_unit)}</td>
                        <td className="px-5 py-3 text-right text-sm tabular-nums">{formatCurrency(r.landed_per_unit)}</td>
                        <td className="px-5 py-3 text-right text-sm font-medium tabular-nums">{formatCurrency(r.line_total_inr)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DetailCard>

          <DetailCard title="Cost breakdown">
            <InfoRow label="Subtotal (factory)" value={formatCurrency(data.subtotal_inr)} />
            <InfoRow label="Freight"            value={formatCurrency(data.freight_inr)} />
            <InfoRow label="Duty"               value={formatCurrency(data.duty_inr)} />
            <InfoRow label="GST"                value={formatCurrency(data.gst_inr)} />
            <InfoRow label="Service margin"     value={formatCurrency(data.margin_inr)} />
            <div className="border-t mt-2 pt-2">
              <InfoRow label="Total"            value={<span className="text-base font-bold">{formatCurrency(data.total_inr)}</span>} />
            </div>
          </DetailCard>
        </div>

        <div className="space-y-5">
          <DetailCard title="Buyer">
            <InfoRow label="Name"    value={data.buyer_name} />
            <InfoRow label="Company" value={data.buyer_company ?? "—"} />
            <InfoRow label="Phone"   value={data.buyer_phone} />
            <InfoRow label="Email"   value={data.buyer_email} />
            <InfoRow label="GSTIN"   value={data.buyer_gstin ?? "—"} mono={!!data.buyer_gstin} />
          </DetailCard>

          <DetailCard title="Shipping">
            <InfoRow label="Address"  value={data.shipping_address} />
            <InfoRow label="City"     value={data.shipping_city} />
            <InfoRow label="Pincode"  value={data.shipping_pincode ?? "—"} mono={!!data.shipping_pincode} />
            <InfoRow label="Mode"     value={data.shipping_mode} />
            <InfoRow label="ETA"      value={data.estimated_delivery_range ?? "—"} />
            <InfoRow label="Placed"   value={formatDateTime(data.created_at)} />
          </DetailCard>

          {data.notes && (
            <DetailCard title="Internal notes">
              <p className="text-sm text-foreground/90">{data.notes}</p>
            </DetailCard>
          )}
        </div>
      </div>
    </div>
  )
}
