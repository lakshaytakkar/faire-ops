import Link from "next/link"
import { Package, TrendingUp, Sparkles, Layers } from "lucide-react"
import { supabaseChinaproducts } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { formatCurrency } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Products — chinaproducts.in | Suprans" }

interface ProductRow {
  id: string
  sku: string
  name: string
  category: string
  factory_price_100: number | string
  factory_price_500: number | string
  factory_price_1000: number | string
  min_moq: number
  status: string
  is_trending: boolean | null
  is_new_arrival: boolean | null
  primary_image_url: string | null
}

async function fetchProducts() {
  const { data, error } = await supabaseChinaproducts
    .from("products")
    .select(
      "id, sku, name, category, factory_price_100, factory_price_500, factory_price_1000, min_moq, status, is_trending, is_new_arrival, primary_image_url",
    )
    .order("updated_at", { ascending: false })
    .limit(500)
  if (error) console.error("chinaproducts.products:", error.message)
  return (data ?? []) as ProductRow[]
}

export default async function ChinaproductsProductsPage() {
  const rows = await fetchProducts()

  const trendingCount = rows.filter((r) => r.is_trending).length
  const newCount = rows.filter((r) => r.is_new_arrival).length
  const categories = new Set(rows.map((r) => r.category))

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Wholesale catalog"
        subtitle={`${rows.length.toLocaleString("en-IN")} SKUs across ${categories.size} categories — factory-direct, tier pricing baked in.`}
      />

      <KPIGrid>
        <MetricCard label="Total SKUs"    value={rows.length}    icon={Package}   iconTone="blue" />
        <MetricCard label="Trending"      value={trendingCount}  icon={TrendingUp} iconTone="amber"   hint="flagged for reps" />
        <MetricCard label="New arrivals"  value={newCount}       icon={Sparkles}   iconTone="violet" />
        <MetricCard label="Categories"    value={categories.size} icon={Layers}    iconTone="slate" />
      </KPIGrid>

      <DetailCard title={`SKUs · ${rows.length}`}>
        {rows.length === 0 ? (
          <EmptyState icon={Package} title="No products yet" description="SKUs sync in from the catalog import pipeline." />
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/30 border-y">
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5 min-w-[320px]">Product</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Category</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-5 py-2.5">100 units</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-5 py-2.5">500 units</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-5 py-2.5">1000 units</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-5 py-2.5">MOQ</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b last:border-b-0 hover:bg-muted/40 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/chinaproducts/products/${p.id}`} className="flex items-center gap-3 hover:text-primary">
                        {p.primary_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.primary_image_url} alt="" className="size-10 rounded-md object-cover bg-muted border border-border/60 shrink-0" loading="lazy" />
                        ) : (
                          <span className="size-10 rounded-md bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                            <Package className="size-4" />
                          </span>
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">{p.name}</div>
                          <div className="text-xs font-mono text-muted-foreground">{p.sku}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-3"><StatusBadge tone="slate">{p.category}</StatusBadge></td>
                    <td className="px-5 py-3 text-right text-sm tabular-nums">{formatCurrency(p.factory_price_100)}</td>
                    <td className="px-5 py-3 text-right text-sm tabular-nums">{formatCurrency(p.factory_price_500)}</td>
                    <td className="px-5 py-3 text-right text-sm font-medium tabular-nums">{formatCurrency(p.factory_price_1000)}</td>
                    <td className="px-5 py-3 text-right text-sm tabular-nums">{p.min_moq}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge tone={toneForStatus(p.status)}>{p.status.replace("_", " ")}</StatusBadge>
                        {p.is_trending && <StatusBadge tone="amber">Trending</StatusBadge>}
                        {p.is_new_arrival && <StatusBadge tone="violet">New</StatusBadge>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DetailCard>
    </div>
  )
}
