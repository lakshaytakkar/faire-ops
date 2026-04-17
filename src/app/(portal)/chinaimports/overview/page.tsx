import Link from "next/link"
import { Inbox, Truck, FileText, Factory, ArrowRight } from "lucide-react"
import { supabaseChinaimports, supabaseShared } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { StatusBadge } from "@/components/shared/status-badge"
import { formatCurrency, formatDate, relativeTime } from "@/lib/format"
import { bucketLabel, bucketTone, stageLabel, stageTone } from "../_components/stage-labels"

export const dynamic = "force-dynamic"
export const metadata = { title: "Overview — chinaimports.in | Suprans" }

interface QueueLite {
  id: string
  rfq_id: string | null
  buyer_company: string
  product_summary: string
  bucket: string
  last_action_at: string | null
}

interface OrderLite {
  id: string
  order_number: string
  buyer_company: string
  product_title: string
  total_inr: number | string
  current_stage: string
  eta_delivery: string | null
}

async function fetchOverview() {
  const [rfqCount, queueRes, ordersRes, factoryCount] = await Promise.all([
    supabaseChinaimports.from("rfqs").select("id", { count: "exact", head: true }),
    supabaseChinaimports
      .from("ops_queue")
      .select("id, rfq_id, buyer_company, product_summary, bucket, last_action_at")
      .eq("is_active", true)
      .order("last_action_at", { ascending: false })
      .limit(6),
    supabaseChinaimports
      .from("orders")
      .select("id, order_number, buyer_company, product_title, total_inr, current_stage, eta_delivery")
      .order("updated_at", { ascending: false })
      .limit(6),
    supabaseShared.from("factories").select("id", { count: "exact", head: true }).eq("is_active", true),
  ])
  return {
    totalRFQs: rfqCount.count ?? 0,
    queue: (queueRes.data ?? []) as QueueLite[],
    orders: (ordersRes.data ?? []) as OrderLite[],
    totalFactories: factoryCount.count ?? 0,
  }
}

export default async function ChinaimportsOverviewPage() {
  const { totalRFQs, queue, orders, totalFactories } = await fetchOverview()

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="chinaimports.in — Ops Portal"
        subtitle="Internal surface for the sourcing ops team. Central work surface is the queue; orders track the 9 stages."
      />

      <KPIGrid>
        <MetricCard label="Open queue"    value={queue.length}     icon={Inbox}   iconTone="blue"     href="/chinaimports/queue" />
        <MetricCard label="RFQs"          value={totalRFQs}        icon={FileText} iconTone="violet"  href="/chinaimports/queue" />
        <MetricCard label="Active orders" value={orders.length}    icon={Truck}    iconTone="amber"   href="/chinaimports/orders" />
        <MetricCard label="Factories"     value={totalFactories}   icon={Factory}  iconTone="emerald" href="/chinaimports/factories" />
      </KPIGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <DetailCard
          title="Recent queue"
          actions={
            <Link href="/chinaimports/queue" className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1">
              View queue <ArrowRight className="size-3" />
            </Link>
          }
        >
          {queue.length === 0 ? (
            <p className="text-sm text-muted-foreground">Queue is quiet. New RFQs land here the moment they come in.</p>
          ) : (
            <div className="divide-y">
              {queue.map((r) => (
                <Link
                  key={r.id}
                  href={r.rfq_id ? `/chinaimports/queue/${r.rfq_id}` : "/chinaimports/queue"}
                  className="flex items-center gap-3 py-3 hover:bg-muted/40 -mx-5 px-5 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{r.buyer_company}</p>
                    <p className="text-sm text-muted-foreground truncate">{r.product_summary}</p>
                  </div>
                  <StatusBadge tone={bucketTone(r.bucket)}>{bucketLabel(r.bucket)}</StatusBadge>
                  <span className="text-xs text-muted-foreground tabular-nums w-[70px] text-right">{relativeTime(r.last_action_at)}</span>
                </Link>
              ))}
            </div>
          )}
        </DetailCard>

        <DetailCard
          title="Live orders"
          actions={
            <Link href="/chinaimports/orders" className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1">
              View orders <ArrowRight className="size-3" />
            </Link>
          }
        >
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active orders yet.</p>
          ) : (
            <div className="divide-y">
              {orders.map((o) => (
                <Link
                  key={o.id}
                  href={`/chinaimports/orders/${o.id}`}
                  className="flex items-center gap-3 py-3 hover:bg-muted/40 -mx-5 px-5 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{o.buyer_company}</p>
                    <p className="text-sm text-muted-foreground truncate">{o.product_title}</p>
                  </div>
                  <StatusBadge tone={stageTone(o.current_stage)}>{stageLabel(o.current_stage)}</StatusBadge>
                  <span className="text-sm font-medium tabular-nums w-[110px] text-right">{formatCurrency(o.total_inr)}</span>
                  <span className="text-xs text-muted-foreground tabular-nums w-[70px] text-right">{formatDate(o.eta_delivery)}</span>
                </Link>
              ))}
            </div>
          )}
        </DetailCard>
      </div>
    </div>
  )
}
