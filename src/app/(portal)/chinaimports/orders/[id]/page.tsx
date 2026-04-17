import { notFound } from "next/navigation"
import { Truck } from "lucide-react"
import { supabaseChinaimports, supabaseShared } from "@/lib/supabase"
import { BackLink } from "@/components/shared/back-link"
import { HeroCard } from "@/components/shared/hero-card"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { StatusBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { formatCurrency, formatDate } from "@/lib/format"
import { StageTracker, type StageRow } from "../../_components/stage-tracker"
import { stageLabel, stageTone } from "../../_components/stage-labels"

export const dynamic = "force-dynamic"

interface OrderDetail {
  id: string
  order_number: string
  rfq_id: string | null
  buyer_company: string
  product_title: string
  quantity: number
  unit_price_inr: number | string
  subtotal_inr: number | string
  shipping_mode: string | null
  cbm_total: number | string | null
  freight_inr: number | string | null
  duty_inr: number | string | null
  gst_inr: number | string | null
  total_inr: number | string
  advance_paid_inr: number | string
  advance_paid_at: string | null
  balance_paid_inr: number | string
  balance_paid_at: string | null
  current_stage: string
  container_no: string | null
  vessel_name: string | null
  port_of_loading: string | null
  port_of_arrival: string | null
  eta_port: string | null
  eta_delivery: string | null
  factory_id: string | null
}

interface DocumentRow {
  id: string
  kind: string
  display_name: string
  storage_path: string
  created_at: string | null
}

export default async function ChinaimportsOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data, error } = await supabaseChinaimports
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle<OrderDetail>()

  if (error) console.error("chinaimports.orders detail:", error.message)
  if (!data) notFound()

  const [stagesRes, docsRes, factoryRes] = await Promise.all([
    supabaseChinaimports
      .from("order_stages")
      .select("stage_key, stage_index, status, completed_at")
      .or(`order_id.eq.${id}${data.rfq_id ? `,rfq_id.eq.${data.rfq_id}` : ""}`)
      .order("stage_index", { ascending: true }),
    supabaseShared
      .from("documents")
      .select("id, kind, display_name, storage_path, created_at")
      .eq("portal_slug", "chinaimports")
      .eq("order_ref_id", id)
      .order("created_at", { ascending: false }),
    data.factory_id
      ? supabaseShared
          .from("factories")
          .select("name, city")
          .eq("id", data.factory_id)
          .maybeSingle<{ name: string; city: string }>()
      : Promise.resolve({ data: null }),
  ])

  const stages = (stagesRes.data ?? []) as StageRow[]
  const docs = (docsRes.data ?? []) as DocumentRow[]
  const factory = (factoryRes.data as { name: string; city: string } | null) ?? null

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <BackLink href="/chinaimports/orders" label="All orders" />

      <HeroCard
        title={data.order_number}
        subtitle={`${data.buyer_company} · ${data.product_title}`}
        icon={Truck}
        tone="blue"
        meta={
          <>
            <StatusBadge tone={stageTone(data.current_stage)}>{stageLabel(data.current_stage)}</StatusBadge>
            {data.shipping_mode && <StatusBadge tone="slate">{data.shipping_mode}</StatusBadge>}
            <span className="text-sm text-muted-foreground tabular-nums">
              ETA {formatDate(data.eta_delivery)}
            </span>
            <span className="text-sm text-muted-foreground tabular-nums">
              Total {formatCurrency(data.total_inr)}
            </span>
          </>
        }
      />

      <StageTracker stages={stages} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <DetailCard title="Order terms">
            <InfoRow label="Quantity"     value={`${data.quantity.toLocaleString("en-IN")} units`} />
            <InfoRow label="Unit price"   value={formatCurrency(data.unit_price_inr)} />
            <InfoRow label="Subtotal"     value={formatCurrency(data.subtotal_inr)} />
            <InfoRow label="Freight"      value={data.freight_inr ? formatCurrency(data.freight_inr) : "—"} />
            <InfoRow label="Duty"         value={data.duty_inr ? formatCurrency(data.duty_inr) : "—"} />
            <InfoRow label="GST"          value={data.gst_inr ? formatCurrency(data.gst_inr) : "—"} />
            <InfoRow label="CBM total"    value={data.cbm_total ? `${data.cbm_total} m³` : "—"} />
            <div className="border-t mt-2 pt-2">
              <InfoRow label="Total" value={<span className="text-base font-bold">{formatCurrency(data.total_inr)}</span>} />
            </div>
          </DetailCard>

          <DetailCard title="Payments">
            <InfoRow label="Advance (40%)"   value={formatCurrency(data.advance_paid_inr)} />
            <InfoRow label="Advance paid at" value={formatDate(data.advance_paid_at)} />
            <InfoRow label="Balance (60%)"   value={formatCurrency(data.balance_paid_inr)} />
            <InfoRow label="Balance paid at" value={formatDate(data.balance_paid_at)} />
          </DetailCard>

          <DetailCard title="Shipping documents">
            {docs.length === 0 ? (
              <EmptyState
                title="No documents uploaded yet"
                description="PO, commercial invoice, packing list, BL, CoO, QC report, and final GST invoice upload here as each stage completes."
              />
            ) : (
              <div className="divide-y">
                {docs.map((d) => (
                  <div key={d.id} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{d.display_name}</p>
                      <p className="text-xs text-muted-foreground">{d.kind.replace(/_/g, " ")}</p>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">{formatDate(d.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </DetailCard>
        </div>

        <div className="space-y-5">
          <DetailCard title="Factory">
            <InfoRow label="Name" value={factory?.name ?? "—"} />
            <InfoRow label="City" value={factory?.city ?? "—"} />
          </DetailCard>

          <DetailCard title="Shipment">
            <InfoRow label="Container"   value={data.container_no ?? "—"} mono={!!data.container_no} />
            <InfoRow label="Vessel"      value={data.vessel_name ?? "—"} />
            <InfoRow label="Port of loading" value={data.port_of_loading ?? "—"} />
            <InfoRow label="Port of arrival" value={data.port_of_arrival ?? "—"} />
            <InfoRow label="ETA port"    value={formatDate(data.eta_port)} />
            <InfoRow label="ETA delivery" value={formatDate(data.eta_delivery)} />
          </DetailCard>
        </div>
      </div>
    </div>
  )
}
