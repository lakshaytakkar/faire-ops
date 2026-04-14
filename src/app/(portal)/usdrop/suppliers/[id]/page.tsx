import { notFound } from "next/navigation"
import { Truck, ExternalLink, Mail } from "lucide-react"
import { supabaseUsdrop } from "@/lib/supabase"
import { FullPageDetail } from "@/components/shared/detail-views"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import {
  SupplierDetailTabs,
  type SupplierFull,
  type SupplierProductRow,
} from "./supplier-detail-tabs"

export const dynamic = "force-dynamic"

type Params = { id: string }

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { id } = await params
  return { title: `Supplier ${id.slice(0, 8)} — USDrop | Suprans` }
}

async function fetchSupplier(id: string) {
  const [supplier, products] = await Promise.all([
    supabaseUsdrop
      .from("suppliers")
      .select(
        "id, name, website, country, rating, verified, shipping_time, min_order_quantity, contact_email, contact_phone, description, logo_url, payment_terms, lead_time_days, created_at, updated_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabaseUsdrop
      .from("products")
      .select(
        "id, title, image, buy_price, sell_price, profit_per_order, in_stock, rating, created_at",
      )
      .eq("supplier_id", id)
      .order("created_at", { ascending: false })
      .limit(200),
  ])
  if (!supplier.data) return null
  return {
    supplier: supplier.data as SupplierFull,
    products: (products.data ?? []) as SupplierProductRow[],
  }
}

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params
  const data = await fetchSupplier(id)
  if (!data) notFound()
  const { supplier, products } = data

  const title = supplier.name ?? "Untitled supplier"
  const badges = [
    {
      label: supplier.verified ? "Verified" : "Pending",
      className: supplier.verified
        ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
        : "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
    },
    ...(supplier.rating !== null && supplier.rating !== undefined
      ? [
          {
            label: `${Number(supplier.rating).toFixed(1)} ★`,
            className: "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
          },
        ]
      : []),
  ]

  return (
    <FullPageDetail
      backLink={{ href: "/usdrop/suppliers", label: "All suppliers" }}
      title={title}
      subtitle={supplier.country ?? undefined}
      badges={badges}
      actions={
        <div className="flex items-center gap-2">
          {supplier.contact_email && (
            <a
              href={`mailto:${supplier.contact_email}`}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border bg-card text-sm hover:bg-muted/40"
            >
              <Mail className="size-4" /> Email
            </a>
          )}
          {supplier.website && (
            <a
              href={supplier.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border bg-card text-sm hover:bg-muted/40"
            >
              <ExternalLink className="size-4" /> Website
            </a>
          )}
        </div>
      }
    >
      <KPIGrid>
        <MetricCard
          label="Rating"
          value={
            supplier.rating !== null && supplier.rating !== undefined
              ? `${Number(supplier.rating).toFixed(1)} ★`
              : "—"
          }
          icon={Truck}
          iconTone="amber"
        />
        <MetricCard
          label="Shipping"
          value={supplier.shipping_time ?? "—"}
          iconTone="blue"
        />
        <MetricCard
          label="MOQ"
          value={supplier.min_order_quantity?.toLocaleString() ?? "—"}
          iconTone="violet"
        />
        <MetricCard
          label="Products"
          value={products.length.toLocaleString()}
          iconTone="emerald"
        />
      </KPIGrid>

      <SupplierDetailTabs supplier={supplier} products={products} />
    </FullPageDetail>
  )
}
