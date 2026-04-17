import Link from "next/link"
import { Headphones, ShoppingCart, Package, FileText, ArrowRight } from "lucide-react"
import { supabaseChinaproducts } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { formatCurrency, relativeTime } from "@/lib/format"
import { intentLabel, intentTone } from "../_components/queue-labels"

export const dynamic = "force-dynamic"
export const metadata = { title: "Overview — chinaproducts.in | Suprans" }

interface QueueLite {
  id: string
  buyer_name: string
  buyer_company: string | null
  intent: string
  priority: string
  status: string
  potential_value_inr: number | string | null
  last_activity_at: string | null
}

async function fetchOverview() {
  const [productsCount, ordersCount, queueCount, scriptsCount, recentQueueRes] = await Promise.all([
    supabaseChinaproducts.from("products").select("id", { count: "exact", head: true }),
    supabaseChinaproducts.from("orders").select("id", { count: "exact", head: true }),
    supabaseChinaproducts.from("rep_queue").select("id", { count: "exact", head: true }),
    supabaseChinaproducts.from("call_scripts").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabaseChinaproducts
      .from("rep_queue")
      .select("id, buyer_name, buyer_company, intent, priority, status, potential_value_inr, last_activity_at")
      .order("last_activity_at", { ascending: false })
      .limit(6),
  ])
  return {
    totalProducts: productsCount.count ?? 0,
    totalOrders: ordersCount.count ?? 0,
    totalQueue: queueCount.count ?? 0,
    totalScripts: scriptsCount.count ?? 0,
    recentQueue: (recentQueueRes.data ?? []) as QueueLite[],
  }
}

export default async function ChinaproductsOverviewPage() {
  const { totalProducts, totalOrders, totalQueue, totalScripts, recentQueue } = await fetchOverview()

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="chinaproducts.in — Rep Portal"
        subtitle="Internal surface for the rep team. Queue drives daily work; scripts keep language consistent across reps."
      />

      <KPIGrid>
        <MetricCard label="Open queue" value={totalQueue}    icon={Headphones}    iconTone="red"    href="/chinaproducts/queue" />
        <MetricCard label="SKUs"       value={totalProducts} icon={Package}       iconTone="blue"   href="/chinaproducts/products" />
        <MetricCard label="Orders"     value={totalOrders}   icon={ShoppingCart}  iconTone="amber"  href="/chinaproducts/orders" />
        <MetricCard label="Scripts"    value={totalScripts}  icon={FileText}      iconTone="violet" href="/chinaproducts/scripts" />
      </KPIGrid>

      <DetailCard
        title="Recent queue activity"
        actions={
          <Link href="/chinaproducts/queue" className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1">
            View queue <ArrowRight className="size-3" />
          </Link>
        }
      >
        {recentQueue.length === 0 ? (
          <p className="text-sm text-muted-foreground">No queue activity yet. Intents will surface here as buyers signal.</p>
        ) : (
          <div className="divide-y">
            {recentQueue.map((r) => (
              <Link
                key={r.id}
                href={`/chinaproducts/queue/${r.id}`}
                className="flex items-center gap-4 py-3 hover:bg-muted/40 -mx-5 px-5 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{r.buyer_name}</div>
                  {r.buyer_company && <div className="text-sm text-muted-foreground">{r.buyer_company}</div>}
                </div>
                <StatusBadge tone={intentTone(r.intent)}>{intentLabel(r.intent)}</StatusBadge>
                <StatusBadge tone={toneForStatus(r.status)}>{r.status.replace("_", " ")}</StatusBadge>
                <span className="text-sm font-medium tabular-nums w-[120px] text-right">{formatCurrency(r.potential_value_inr)}</span>
                <span className="text-sm text-muted-foreground tabular-nums w-[80px] text-right">{relativeTime(r.last_activity_at)}</span>
              </Link>
            ))}
          </div>
        )}
      </DetailCard>
    </div>
  )
}
