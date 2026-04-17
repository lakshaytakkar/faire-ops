import { notFound } from "next/navigation"
import { FileText } from "lucide-react"
import { supabaseChinaimports } from "@/lib/supabase"
import { BackLink } from "@/components/shared/back-link"
import { HeroCard } from "@/components/shared/hero-card"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { StatusBadge } from "@/components/shared/status-badge"
import { formatCurrency, formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"

interface QuoteDetail {
  id: string
  rfq_id: string
  factory_name: string
  factory_city: string | null
  unit_price_inr: number | string
  moq: number
  lead_time_days: number
  certifications: string[] | null
  sample_cost_inr: number | string | null
  sample_lead_time_days: number | null
  notes: string | null
  is_recommended: boolean
  is_approved_by_client: boolean
  sort_order: number
  created_at: string | null
}

interface RFQLite {
  id: string
  rfq_number: string
  buyer_company: string
  product_name: string
}

export default async function ChinaimportsQuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data, error } = await supabaseChinaimports
    .from("quote_options")
    .select("*")
    .eq("id", id)
    .maybeSingle<QuoteDetail>()

  if (error) console.error("chinaimports.quote_options detail:", error.message)
  if (!data) notFound()

  const { data: rfq } = await supabaseChinaimports
    .from("rfqs")
    .select("id, rfq_number, buyer_company, product_name")
    .eq("id", data.rfq_id)
    .maybeSingle<RFQLite>()

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <BackLink href="/chinaimports/quotes" label="All quotes" />

      <HeroCard
        title={data.factory_name}
        subtitle={rfq ? `${rfq.rfq_number} · ${rfq.buyer_company} · ${rfq.product_name}` : "Quote option"}
        icon={FileText}
        tone="blue"
        meta={
          <>
            {data.is_recommended && <StatusBadge tone="amber">Recommended</StatusBadge>}
            {data.is_approved_by_client && <StatusBadge tone="emerald">Client approved</StatusBadge>}
            {data.factory_city && <StatusBadge tone="slate">{data.factory_city}</StatusBadge>}
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <DetailCard title="Bulk terms">
          <InfoRow label="Unit price"    value={formatCurrency(data.unit_price_inr)} />
          <InfoRow label="MOQ"           value={`${data.moq.toLocaleString("en-IN")} units`} />
          <InfoRow label="Lead time"     value={`${data.lead_time_days} days`} />
          <InfoRow label="Certifications" value={
            data.certifications && data.certifications.length > 0
              ? (<div className="flex flex-wrap gap-1 justify-end">{data.certifications.map((c) => <StatusBadge key={c} tone="slate">{c}</StatusBadge>)}</div>)
              : "—"
          } />
        </DetailCard>

        <DetailCard title="Sample terms">
          <InfoRow label="Sample cost"       value={data.sample_cost_inr ? formatCurrency(data.sample_cost_inr) : "—"} />
          <InfoRow label="Sample lead time"  value={data.sample_lead_time_days ? `${data.sample_lead_time_days} days` : "—"} />
          <InfoRow label="Added"             value={formatDate(data.created_at)} />
          <InfoRow label="Sort order"        value={data.sort_order} />
        </DetailCard>

        {data.notes && (
          <DetailCard title="Notes" className="lg:col-span-2">
            <p className="text-sm leading-relaxed text-foreground/90">{data.notes}</p>
          </DetailCard>
        )}
      </div>
    </div>
  )
}
