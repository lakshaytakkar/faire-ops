import { notFound } from "next/navigation"
import { Package, DollarSign, TrendingUp, Star } from "lucide-react"
import { supabaseUsdrop } from "@/lib/supabase"
import { formatCurrency, formatDate } from "@/lib/format"
import { BackLink } from "@/components/shared/back-link"
import { HeroCard } from "@/components/shared/hero-card"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { Badge } from "@/components/ui/badge"
import { ProductDetailShell } from "./ProductDetailShell"

export const dynamic = "force-dynamic"

type Params = { id: string }

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { id } = await params
  return { title: `Product ${id.slice(0, 8)} — USDrop | Suprans` }
}

async function fetchProduct(id: string) {
  const [p, m, s, r, cats, sups] = await Promise.all([
    supabaseUsdrop
      .from("products")
      .select(
        "id, title, title_original, description, image, category_id, subcategory_id, supplier_id, buy_price, sell_price, profit_per_order, rating, reviews_count, in_stock, created_at, updated_at, display_order",
      )
      .eq("id", id)
      .maybeSingle(),
    supabaseUsdrop
      .from("product_metadata")
      .select(
        "is_winning, is_trending, is_locked, unlock_price, profit_margin, pot_revenue, revenue_growth_rate, items_sold, avg_unit_price, found_date, scrape_depth",
      )
      .eq("product_id", id)
      .maybeSingle(),
    supabaseUsdrop
      .from("product_source")
      .select("source_type, source_id, standardized_at, standardized_by, tradelle_id")
      .eq("product_id", id)
      .maybeSingle(),
    supabaseUsdrop
      .from("product_research")
      .select("seasonal_demand, supplier_notes, research_date")
      .eq("product_id", id)
      .maybeSingle(),
    supabaseUsdrop.from("categories").select("id, name"),
    supabaseUsdrop.from("suppliers").select("id, name"),
  ])
  return {
    product: p.data,
    metadata: m.data,
    source: s.data,
    research: r.data,
    categories: (cats.data ?? []) as Array<{ id: string; name: string | null }>,
    suppliers: (sups.data ?? []) as Array<{ id: string; name: string | null }>,
  }
}

export default async function UsdropProductDetailPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params
  const { product, metadata, source, research, categories, suppliers } = await fetchProduct(id)
  if (!product) notFound()

  const category = categories.find((c) => c.id === product.category_id)
  const supplier = suppliers.find((s) => s.id === product.supplier_id)

  const margin =
    metadata?.profit_margin !== null && metadata?.profit_margin !== undefined
      ? `${Number(metadata.profit_margin).toFixed(1)}%`
      : "—"

  const revenueGrowth =
    metadata?.revenue_growth_rate !== null && metadata?.revenue_growth_rate !== undefined
      ? `${Number(metadata.revenue_growth_rate).toFixed(1)}%`
      : "—"

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <BackLink href="/usdrop/products" label="All products" />

      <HeroCard
        title={product.title ?? "Untitled product"}
        subtitle={product.title_original ?? undefined}
        icon={Package}
        tone="blue"
        actions={
          <ProductDetailShell
            product={{
              id: product.id,
              title: product.title,
              description: product.description,
              image: product.image,
              buy_price: product.buy_price,
              sell_price: product.sell_price,
              profit_per_order: product.profit_per_order,
              category_id: product.category_id,
              supplier_id: product.supplier_id,
              in_stock: product.in_stock,
            }}
            categories={categories}
            suppliers={suppliers}
          />
        }
        meta={
          <>
            <StatusBadge tone={toneForStatus(product.in_stock ? "active" : "inactive")}>
              {product.in_stock ? "In stock" : "Out of stock"}
            </StatusBadge>
            {metadata?.is_winning && <Badge>Winning</Badge>}
            {metadata?.is_trending && <Badge variant="secondary">Trending</Badge>}
            {metadata?.is_locked && <Badge variant="outline">Locked</Badge>}
          </>
        }
      />

      <KPIGrid>
        <MetricCard
          label="Buy price"
          value={formatCurrency(product.buy_price, "$")}
          icon={DollarSign}
          iconTone="slate"
        />
        <MetricCard
          label="Sell price"
          value={formatCurrency(product.sell_price, "$")}
          icon={DollarSign}
          iconTone="emerald"
        />
        <MetricCard
          label="Profit / order"
          value={formatCurrency(product.profit_per_order, "$")}
          icon={TrendingUp}
          iconTone="emerald"
          hint={margin !== "—" ? `${margin} margin` : undefined}
        />
        <MetricCard
          label="Rating"
          value={
            product.rating !== null && product.rating !== undefined
              ? Number(product.rating).toFixed(1)
              : "—"
          }
          icon={Star}
          iconTone="amber"
          hint={product.reviews_count ? `${product.reviews_count} reviews` : undefined}
        />
      </KPIGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <DetailCard title="Summary">
            <div className="flex items-start gap-4">
              {product.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.image}
                  alt=""
                  className="size-16 rounded-lg object-cover bg-muted shrink-0 border border-border/80"
                />
              ) : (
                <div className="size-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Package className="size-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="divide-y divide-border/80">
                  <InfoRow label="Category" value={category?.name ?? "—"} />
                  <InfoRow label="Supplier" value={supplier?.name ?? "—"} />
                  <InfoRow label="Created" value={formatDate(product.created_at)} />
                  <InfoRow label="Updated" value={formatDate(product.updated_at)} />
                </div>
              </div>
            </div>
          </DetailCard>

          <DetailCard title="Description">
            {product.description ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {product.description}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No description.</p>
            )}
          </DetailCard>

          <DetailCard title="Research">
            {research ? (
              <div className="space-y-3">
                <div className="divide-y divide-border/80">
                  <InfoRow label="Seasonal demand" value={research.seasonal_demand ?? "—"} />
                  <InfoRow label="Research date" value={formatDate(research.research_date)} />
                </div>
                {research.supplier_notes && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      Supplier notes
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{research.supplier_notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No research row.</p>
            )}
          </DetailCard>
        </div>

        <div className="space-y-5">
          <DetailCard title="Metadata">
            {metadata ? (
              <div className="divide-y divide-border/80">
                <InfoRow label="Unlock price" value={formatCurrency(metadata.unlock_price, "$")} />
                <InfoRow label="Margin" value={margin} />
                <InfoRow label="Revenue growth" value={revenueGrowth} />
                <InfoRow label="Pot revenue" value={formatCurrency(metadata.pot_revenue, "$")} />
                <InfoRow
                  label="Items sold"
                  value={metadata.items_sold?.toLocaleString() ?? "—"}
                />
                <InfoRow
                  label="Avg unit price"
                  value={formatCurrency(metadata.avg_unit_price, "$")}
                />
                <InfoRow label="Scrape depth" value={metadata.scrape_depth ?? "—"} />
                <InfoRow label="Found" value={formatDate(metadata.found_date)} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No metadata row.</p>
            )}
          </DetailCard>

          <DetailCard title="Source">
            {source ? (
              <div className="divide-y divide-border/80">
                <InfoRow label="Source type" value={source.source_type ?? "—"} />
                <InfoRow label="Source ID" value={source.source_id ?? "—"} />
                <InfoRow label="Tradelle ID" value={source.tradelle_id ?? "—"} />
                <InfoRow
                  label="Standardized"
                  value={
                    source.standardized_at
                      ? `${formatDate(source.standardized_at)} · ${source.standardized_by ?? "—"}`
                      : "Not yet"
                  }
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No source row.</p>
            )}
          </DetailCard>
        </div>
      </div>
    </div>
  )
}
