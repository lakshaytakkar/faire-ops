import { Truck, Factory, Ship, CheckCircle2 } from "lucide-react"
import { supabaseChinaimports } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
import { KanbanBoard, type KanbanColumn, type KanbanCard } from "@/components/shared/kanban-board"
import { formatCurrency, formatDate } from "@/lib/format"
import { stageLabel, stageTone } from "../_components/stage-labels"

export const dynamic = "force-dynamic"
export const metadata = { title: "Orders — chinaimports.in | Suprans" }

interface OrderRow {
  id: string
  order_number: string
  buyer_company: string
  product_title: string
  quantity: number
  total_inr: number | string
  current_stage: string
  eta_delivery: string | null
  eta_port: string | null
  shipping_mode: string | null
}

async function fetchOrders() {
  const { data, error } = await supabaseChinaimports
    .from("orders")
    .select("id, order_number, buyer_company, product_title, quantity, total_inr, current_stage, eta_delivery, eta_port, shipping_mode")
    .order("updated_at", { ascending: false })
    .limit(200)
  if (error) console.error("chinaimports.orders:", error.message)
  return (data ?? []) as OrderRow[]
}

const COLUMNS: KanbanColumn[] = [
  { key: "bulk_production", label: "Bulk production", tone: "amber" },
  { key: "pre_shipment_qc", label: "Pre-shipment QC", tone: "amber" },
  { key: "in_transit",      label: "In transit",      tone: "violet" },
  { key: "delivered",       label: "Delivered",       tone: "emerald" },
  { key: "cancelled",       label: "Cancelled",       tone: "red" },
]

export default async function ChinaimportsOrdersPage() {
  const rows = await fetchOrders()

  const inProduction = rows.filter((r) => r.current_stage === "bulk_production" || r.current_stage === "pre_shipment_qc").length
  const inTransit    = rows.filter((r) => r.current_stage === "in_transit").length
  const delivered    = rows.filter((r) => r.current_stage === "delivered").length
  const totalValue   = rows.reduce((s, r) => s + (Number(r.total_inr) || 0), 0)

  const cards: KanbanCard[] = rows.map((r) => ({
    id: r.id,
    columnKey: r.current_stage,
    title: r.buyer_company,
    subtitle: r.product_title,
    meta: (
      <div className="flex items-center justify-between text-xs">
        <span>{r.order_number}</span>
        <span>ETA {formatDate(r.eta_delivery)}</span>
      </div>
    ),
    badge: { label: stageLabel(r.current_stage), tone: stageTone(r.current_stage) },
    href: `/chinaimports/orders/${r.id}`,
  }))

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Orders"
        subtitle={`${rows.length} orders flowing through production, QC, shipping, and delivery.`}
      />

      <KPIGrid>
        <MetricCard label="In production" value={inProduction} icon={Factory}       iconTone="amber" />
        <MetricCard label="In transit"    value={inTransit}    icon={Ship}          iconTone="violet" />
        <MetricCard label="Delivered"     value={delivered}    icon={CheckCircle2}  iconTone="emerald" />
        <MetricCard label="Total value"   value={formatCurrency(totalValue)} icon={Truck} iconTone="blue" hint={`across ${rows.length} orders`} />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No orders yet"
          description="Orders get created once a quote is approved and the advance is paid."
        />
      ) : (
        <KanbanBoard columns={COLUMNS} cards={cards} emptyColumnMessage="—" />
      )}
    </div>
  )
}
