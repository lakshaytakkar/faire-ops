import { notFound } from "next/navigation"
import { Ship, MessageCircle } from "lucide-react"
import { supabaseChinaimports, supabaseShared } from "@/lib/supabase"
import { BackLink } from "@/components/shared/back-link"
import { HeroCard } from "@/components/shared/hero-card"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { StatusBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { TimelineList, type TimelineItem } from "@/components/shared/timeline-list"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format"
import { StageTracker, type StageRow } from "../../_components/stage-tracker"
import { priorityTone, stageLabel, stageTone } from "../../_components/stage-labels"

export const dynamic = "force-dynamic"

interface RFQDetail {
  id: string
  rfq_number: string
  buyer_name: string
  buyer_company: string
  buyer_email: string
  buyer_phone: string
  buyer_gstin: string | null
  business_type: string | null
  product_name: string
  product_description: string | null
  reference_urls: string[] | null
  quantity_value: number | string
  quantity_unit: string
  target_landed_price_inr: number | string | null
  customization_flags: string[] | null
  quality_requirements: string | null
  timeline_kind: string
  specific_target_date: string | null
  shipping_mode_preference: string | null
  delivery_city: string
  delivery_address: string
  delivery_pincode: string | null
  is_recurring: string | null
  source: string | null
  notes: string | null
  assigned_ops_id: string | null
  assigned_agent_key: string | null
  whatsapp_group_name: string | null
  stage: string
  bis_flag: boolean
  small_order_flag: boolean
  priority: string
  created_at: string | null
  updated_at: string | null
}

interface QuoteOption {
  id: string
  factory_id: string | null
  factory_name: string
  factory_city: string | null
  unit_price_inr: number | string
  moq: number
  lead_time_days: number
  certifications: string[] | null
  sample_cost_inr: number | string | null
  is_recommended: boolean
  is_approved_by_client: boolean
  notes: string | null
}

export default async function ChinaimportsQueueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data: rfq, error } = await supabaseChinaimports
    .from("rfqs")
    .select("*")
    .eq("id", id)
    .maybeSingle<RFQDetail>()

  if (error) console.error("chinaimports.rfqs detail:", error.message)
  if (!rfq) notFound()

  const [stagesRes, quotesRes] = await Promise.all([
    supabaseChinaimports
      .from("order_stages")
      .select("stage_key, stage_index, status, completed_at, started_at, notes")
      .eq("rfq_id", id)
      .order("stage_index", { ascending: true }),
    supabaseChinaimports
      .from("quote_options")
      .select("id, factory_id, factory_name, factory_city, unit_price_inr, moq, lead_time_days, certifications, sample_cost_inr, is_recommended, is_approved_by_client, notes")
      .eq("rfq_id", id)
      .order("sort_order", { ascending: true }),
  ])

  const stages = (stagesRes.data ?? []) as (StageRow & { started_at: string | null; notes: string | null })[]
  const quotes = (quotesRes.data ?? []) as QuoteOption[]

  // Hydrate factory shortlist from shared.factories if we have more context.
  const factoryIds = quotes.map((q) => q.factory_id).filter((v): v is string => !!v)
  let factoryMap = new Map<string, { prior_orders_count: number; certifications: string[] | null }>()
  if (factoryIds.length > 0) {
    const { data } = await supabaseShared
      .from("factories")
      .select("id, prior_orders_count, certifications")
      .in("id", factoryIds)
    factoryMap = new Map((data ?? []).map((f) => [f.id as string, { prior_orders_count: Number(f.prior_orders_count) || 0, certifications: (f.certifications as string[] | null) ?? null }]))
  }

  const timelineItems: TimelineItem[] = stages
    .filter((s) => s.completed_at || s.started_at)
    .map((s) => ({
      id: `${s.stage_key}-${s.stage_index}`,
      date: s.completed_at ?? s.started_at ?? new Date().toISOString(),
      title: stageLabel(s.stage_key),
      body: s.notes ?? (s.status === "active" ? "Currently active" : s.status === "completed" ? "Completed" : null),
      badge: { label: s.status, tone: s.status === "completed" ? "emerald" : s.status === "active" ? "amber" : "slate" },
    }))

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <BackLink href="/chinaimports/queue" label="Sourcing queue" />

      <HeroCard
        title={rfq.rfq_number}
        subtitle={`${rfq.buyer_company} · ${rfq.product_name}`}
        icon={Ship}
        tone="blue"
        meta={
          <>
            <StatusBadge tone={stageTone(rfq.stage)}>{stageLabel(rfq.stage)}</StatusBadge>
            <StatusBadge tone={priorityTone(rfq.priority)}>{rfq.priority} priority</StatusBadge>
            <StatusBadge tone="slate">{rfq.timeline_kind}</StatusBadge>
            {rfq.bis_flag && <StatusBadge tone="amber">BIS required</StatusBadge>}
            {rfq.small_order_flag && <StatusBadge tone="violet">Small order</StatusBadge>}
          </>
        }
        actions={
          <>
            <button type="button" className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border text-sm font-medium hover:bg-muted/40 transition-colors">
              <MessageCircle className="size-3.5" />
              Open WhatsApp group
            </button>
            <button type="button" className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border text-sm font-medium hover:bg-muted/40 transition-colors">
              Mark stage complete
            </button>
            <button type="button" className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors">
              Escalate
            </button>
          </>
        }
      />

      <StageTracker stages={stages} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <DetailCard title="Client info">
            <InfoRow label="Company"       value={rfq.buyer_company} />
            <InfoRow label="Contact"       value={rfq.buyer_name} />
            <InfoRow label="Phone"         value={rfq.buyer_phone} />
            <InfoRow label="Email"         value={rfq.buyer_email} />
            <InfoRow label="GSTIN"         value={rfq.buyer_gstin ?? "—"} mono={!!rfq.buyer_gstin} />
            <InfoRow label="Business type" value={rfq.business_type ?? "—"} />
            <InfoRow label="Source"        value={rfq.source ?? "—"} />
            <InfoRow label="Recurring"     value={rfq.is_recurring ?? "—"} />
          </DetailCard>

          <DetailCard title="RFQ spec">
            <InfoRow label="Product"               value={rfq.product_name} />
            <InfoRow label="Quantity"              value={`${Number(rfq.quantity_value).toLocaleString("en-IN")} ${rfq.quantity_unit}`} />
            <InfoRow label="Target landed price"   value={rfq.target_landed_price_inr ? formatCurrency(rfq.target_landed_price_inr) : "—"} />
            <InfoRow label="Quality requirements"  value={rfq.quality_requirements ?? "—"} />
            <InfoRow label="Timeline"              value={rfq.timeline_kind} />
            <InfoRow label="Target date"           value={rfq.specific_target_date ? formatDate(rfq.specific_target_date) : "—"} />
            <InfoRow label="Shipping mode pref"    value={rfq.shipping_mode_preference ?? "recommend"} />
            <InfoRow label="Delivery"              value={`${rfq.delivery_city}${rfq.delivery_pincode ? " · " + rfq.delivery_pincode : ""}`} />
            {rfq.customization_flags && rfq.customization_flags.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Customization
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {rfq.customization_flags.map((f) => (
                    <StatusBadge key={f} tone="violet">{f}</StatusBadge>
                  ))}
                </div>
              </div>
            )}
            {rfq.product_description && (
              <div className="mt-3 rounded-md bg-muted/40 p-3 text-sm text-foreground/90">
                {rfq.product_description}
              </div>
            )}
          </DetailCard>

          <DetailCard
            title="Sourcing workspace"
            actions={
              <button type="button" className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-[#1E3A5F] text-white text-xs font-medium hover:opacity-90 transition-opacity">
                Send comparison quote
              </button>
            }
          >
            {quotes.length === 0 ? (
              <EmptyState
                title="No factory shortlist yet"
                description="Jason or the ops lead will add 3 factory options here once sourcing kicks off."
              />
            ) : (
              <div className="-mx-5 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/30 border-y">
                      <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Factory</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">City</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-5 py-2.5">Unit price</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-5 py-2.5">MOQ</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-5 py-2.5">Lead</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-5 py-2.5">Prior orders</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Certifications</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map((q) => {
                      const factory = q.factory_id ? factoryMap.get(q.factory_id) : null
                      const certs = q.certifications ?? factory?.certifications ?? []
                      return (
                        <tr key={q.id} className="border-b last:border-b-0">
                          <td className="px-5 py-3 text-sm font-semibold">{q.factory_name}</td>
                          <td className="px-5 py-3 text-sm">{q.factory_city ?? "—"}</td>
                          <td className="px-5 py-3 text-right text-sm font-medium tabular-nums">{formatCurrency(q.unit_price_inr)}</td>
                          <td className="px-5 py-3 text-right text-sm tabular-nums">{q.moq}</td>
                          <td className="px-5 py-3 text-right text-sm tabular-nums">{q.lead_time_days}d</td>
                          <td className="px-5 py-3 text-right text-sm tabular-nums">{factory?.prior_orders_count ?? 0}</td>
                          <td className="px-5 py-3">
                            <div className="flex flex-wrap gap-1">
                              {certs.length === 0 ? <span className="text-sm text-muted-foreground">—</span> : certs.map((c) => (
                                <StatusBadge key={c} tone="slate">{c}</StatusBadge>
                              ))}
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex flex-wrap gap-1">
                              {q.is_recommended && <StatusBadge tone="emerald">Recommended</StatusBadge>}
                              {q.is_approved_by_client && <StatusBadge tone="emerald">Client approved</StatusBadge>}
                              {!q.is_recommended && !q.is_approved_by_client && <StatusBadge tone="slate">Shortlist</StatusBadge>}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </DetailCard>
        </div>

        <div className="space-y-5">
          <DetailCard title="Assigned team">
            <InfoRow label="Ops owner"       value={rfq.assigned_ops_id ? rfq.assigned_ops_id.slice(0, 8) + "…" : "Unassigned"} mono={!!rfq.assigned_ops_id} />
            <InfoRow label="Buying agent"    value={rfq.assigned_agent_key ?? "Unassigned"} />
            <InfoRow label="WhatsApp group"  value={rfq.whatsapp_group_name ?? "Not created"} />
            <InfoRow label="Opened"          value={formatDateTime(rfq.created_at)} />
            <InfoRow label="Last update"     value={formatDateTime(rfq.updated_at)} />
          </DetailCard>

          <DetailCard title="Activity log">
            {timelineItems.length === 0 ? (
              <EmptyState title="No stage activity yet" description="Milestones appear here as the RFQ progresses through the 9 stages." />
            ) : (
              <TimelineList items={timelineItems} />
            )}
          </DetailCard>

          {rfq.notes && (
            <DetailCard title="Internal notes">
              <p className="text-sm text-foreground/90">{rfq.notes}</p>
            </DetailCard>
          )}
        </div>
      </div>
    </div>
  )
}
