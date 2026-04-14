import { Sparkles, CheckCircle2, Clock } from "lucide-react"
import { supabaseUsdrop } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
import {
  PipelineClient,
  type SourceRow,
  type ProductLite,
  type MetadataLite,
} from "./pipeline-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "AI Pipeline — USDrop | Suprans" }

async function fetchQueue() {
  const { data: pending, error } = await supabaseUsdrop
    .from("product_source")
    .select("product_id, source_type, source_id, standardized_at, standardized_by, tradelle_id")
    .is("standardized_at", null)
    .order("created_at", { ascending: false })
    .limit(100)
  if (error) console.error("usdrop.product_source:", error.message)
  const rows = (pending ?? []) as SourceRow[]
  const productIds = rows.map((r) => r.product_id).filter(Boolean)
  let products: ProductLite[] = []
  let meta: MetadataLite[] = []
  if (productIds.length > 0) {
    const [p, m] = await Promise.all([
      supabaseUsdrop
        .from("products")
        .select("id, title, image, buy_price, sell_price")
        .in("id", productIds),
      supabaseUsdrop
        .from("product_metadata")
        .select("product_id, is_winning, is_trending, profit_margin, scrape_depth, found_date")
        .in("product_id", productIds),
    ])
    products = (p.data ?? []) as ProductLite[]
    meta = (m.data ?? []) as MetadataLite[]
  }
  return { rows, products, meta }
}

async function fetchApprovedCount(): Promise<number> {
  const { count } = await supabaseUsdrop
    .from("product_source")
    .select("product_id", { count: "exact", head: true })
    .not("standardized_at", "is", null)
  return count ?? 0
}

export default async function PipelinePage() {
  const [{ rows, products, meta }, approvedCount] = await Promise.all([
    fetchQueue(),
    fetchApprovedCount(),
  ])

  const winningCount = meta.filter((m) => m.is_winning).length
  const trendingCount = meta.filter((m) => m.is_trending).length

  return (
    <div className="space-y-5">
      <PageHeader
        title="AI pipeline"
        subtitle={`${rows.length.toLocaleString("en-IN")} items pending review (newest 100)`}
      />

      <KPIGrid>
        <MetricCard
          label="Pending review"
          value={rows.length}
          icon={Clock}
          iconTone={rows.length > 0 ? "amber" : "emerald"}
          hint="awaiting QC"
        />
        <MetricCard
          label="Approved"
          value={approvedCount.toLocaleString("en-IN")}
          icon={CheckCircle2}
          iconTone="emerald"
          hint="standardized all-time"
        />
        <MetricCard
          label="Winning flags"
          value={winningCount}
          icon={Sparkles}
          iconTone="emerald"
          hint="in queue"
        />
        <MetricCard
          label="Trending flags"
          value={trendingCount}
          icon={Sparkles}
          iconTone="blue"
          hint="in queue"
        />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Pipeline is clear"
          description="Every AI-generated listing has been reviewed. New items from the scraper and Tradelle feed queue up here for QC."
        />
      ) : (
        <PipelineClient rows={rows} products={products} meta={meta} />
      )}
    </div>
  )
}
