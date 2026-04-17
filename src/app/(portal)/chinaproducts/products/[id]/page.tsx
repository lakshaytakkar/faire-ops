import { notFound } from "next/navigation"
import { Package } from "lucide-react"
import { supabaseChinaproducts, supabaseShared } from "@/lib/supabase"
import { BackLink } from "@/components/shared/back-link"
import { HeroCard } from "@/components/shared/hero-card"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { formatCurrency, formatCbm } from "@/lib/format"

export const dynamic = "force-dynamic"

interface ProductDetail {
  id: string
  sku: string
  name: string
  category: string
  tagline: string | null
  description: string | null
  material: string | null
  finish: string | null
  dimensions_cm: string | null
  weight_kg: number | string
  pack_contents: string | null
  carton_qty: number
  carton_cbm: number | string
  factory_id: string | null
  factory_lead_time_days: number
  factory_price_100: number | string
  factory_price_500: number | string
  factory_price_1000: number | string
  min_moq: number
  private_label_moq: number
  hsn_code: string
  customs_duty_pct: number | string
  gst_pct: number | string
  anti_dumping_pct: number | string
  sea_freight_per_unit: number | string
  air_freight_per_unit: number | string
  service_margin_pct: number | string
  primary_image_url: string | null
  gallery_image_urls: string[] | null
  tags: string[] | null
  status: string
  is_trending: boolean | null
  is_new_arrival: boolean | null
  launch_discount_pct: number | string
}

interface FactoryLite {
  name: string
  city: string
}

export default async function ChinaproductsProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data, error } = await supabaseChinaproducts
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle<ProductDetail>()

  if (error) console.error("chinaproducts.products detail:", error.message)
  if (!data) notFound()

  let factory: FactoryLite | null = null
  if (data.factory_id) {
    const { data: f } = await supabaseShared
      .from("factories")
      .select("name, city")
      .eq("id", data.factory_id)
      .maybeSingle<FactoryLite>()
    factory = f ?? null
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <BackLink href="/chinaproducts/products" label="All products" />

      <HeroCard
        title={data.name}
        subtitle={data.tagline ?? data.sku}
        icon={Package}
        tone="red"
        meta={
          <>
            <StatusBadge tone={toneForStatus(data.status)}>{data.status.replace("_", " ")}</StatusBadge>
            <StatusBadge tone="slate">{data.category}</StatusBadge>
            {data.is_trending && <StatusBadge tone="amber">Trending</StatusBadge>}
            {data.is_new_arrival && <StatusBadge tone="violet">New</StatusBadge>}
            <span className="text-sm font-mono text-muted-foreground">{data.sku}</span>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <DetailCard title="Tier pricing">
            <InfoRow label="100 units"            value={formatCurrency(data.factory_price_100)} />
            <InfoRow label="500 units"            value={formatCurrency(data.factory_price_500)} />
            <InfoRow label="1000 units"           value={formatCurrency(data.factory_price_1000)} />
            <InfoRow label="Minimum order (MOQ)"  value={`${data.min_moq.toLocaleString("en-IN")} units`} />
            <InfoRow label="Private label MOQ"    value={`${data.private_label_moq.toLocaleString("en-IN")} units`} />
            <InfoRow label="Launch discount"      value={`${data.launch_discount_pct}%`} />
          </DetailCard>

          <DetailCard title="Landed cost inputs">
            <InfoRow label="HSN code"         value={data.hsn_code} mono />
            <InfoRow label="Customs duty"     value={`${data.customs_duty_pct}%`} />
            <InfoRow label="GST"              value={`${data.gst_pct}%`} />
            <InfoRow label="Anti-dumping"     value={`${data.anti_dumping_pct}%`} />
            <InfoRow label="Sea freight / u"  value={formatCurrency(data.sea_freight_per_unit)} />
            <InfoRow label="Air freight / u"  value={formatCurrency(data.air_freight_per_unit)} />
            <InfoRow label="Service margin"   value={`${data.service_margin_pct}%`} />
          </DetailCard>

          {data.description && (
            <DetailCard title="Description">
              <p className="text-sm leading-relaxed text-foreground/90">{data.description}</p>
            </DetailCard>
          )}
        </div>

        <div className="space-y-5">
          <DetailCard title="Specs">
            <InfoRow label="Material"        value={data.material ?? "—"} />
            <InfoRow label="Finish"          value={data.finish ?? "—"} />
            <InfoRow label="Dimensions"      value={data.dimensions_cm ?? "—"} />
            <InfoRow label="Weight"          value={`${data.weight_kg} kg`} />
            <InfoRow label="Pack contents"   value={data.pack_contents ?? "—"} />
            <InfoRow label="Carton qty"      value={`${data.carton_qty} units`} />
            <InfoRow label="Carton volume"   value={formatCbm(Number(data.carton_cbm))} />
          </DetailCard>

          <DetailCard title="Factory">
            <InfoRow label="Name"         value={factory?.name ?? "—"} />
            <InfoRow label="City"         value={factory?.city ?? "—"} />
            <InfoRow label="Lead time"    value={`${data.factory_lead_time_days} days`} />
          </DetailCard>

          {data.tags && data.tags.length > 0 && (
            <DetailCard title="Tags">
              <div className="flex flex-wrap gap-1.5">
                {data.tags.map((t) => (
                  <StatusBadge key={t} tone="slate">{t}</StatusBadge>
                ))}
              </div>
            </DetailCard>
          )}
        </div>
      </div>
    </div>
  )
}
