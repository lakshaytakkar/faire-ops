import Link from "next/link"
import { Package, TrendingUp, Trophy, Layers, Plus } from "lucide-react"
import { supabaseUsdrop } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
import { ProductsClient, type ProductRow, type MetaRow } from "./products-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Product Explorer — USDrop | Suprans" }

type CategoryLite = { id: string; name: string | null }
type SupplierLite = { id: string; name: string | null }

async function fetchData() {
  const [productsRes, categoriesRes, suppliersRes, metadataRes, totalCountRes, trendingCountRes, winningCountRes] =
    await Promise.all([
      supabaseUsdrop
        .from("products")
        .select(
          "id, title, image, category_id, supplier_id, buy_price, sell_price, profit_per_order, in_stock, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(500),
      supabaseUsdrop.from("categories").select("id, name"),
      supabaseUsdrop.from("suppliers").select("id, name"),
      supabaseUsdrop
        .from("product_metadata")
        .select("id, is_winning, is_trending, profit_margin, pot_revenue, items_sold")
        .limit(2000),
      supabaseUsdrop
        .from("products")
        .select("id", { count: "exact", head: true }),
      supabaseUsdrop
        .from("product_metadata")
        .select("id", { count: "exact", head: true })
        .eq("is_trending", true),
      supabaseUsdrop
        .from("product_metadata")
        .select("id", { count: "exact", head: true })
        .eq("is_winning", true),
    ])

  if (productsRes.error) console.error("usdrop.products:", productsRes.error.message)
  if (categoriesRes.error) console.error("usdrop.categories:", categoriesRes.error.message)
  if (suppliersRes.error) console.error("usdrop.suppliers:", suppliersRes.error.message)
  if (metadataRes.error) console.error("usdrop.product_metadata:", metadataRes.error.message)

  return {
    rows: (productsRes.data ?? []) as ProductRow[],
    categories: (categoriesRes.data ?? []) as CategoryLite[],
    suppliers: (suppliersRes.data ?? []) as SupplierLite[],
    metadata: (metadataRes.data ?? []) as MetaRow[],
    totalProducts: totalCountRes.count ?? 0,
    trendingCount: trendingCountRes.count ?? 0,
    winningCount: winningCountRes.count ?? 0,
  }
}

export default async function UsdropProductsPage() {
  const { rows, categories, suppliers, metadata, totalProducts, trendingCount, winningCount } =
    await fetchData()

  const catMap: Record<string, string> = Object.fromEntries(
    categories.map((c) => [c.id, c.name ?? "—"]),
  )
  const supMap: Record<string, string> = Object.fromEntries(
    suppliers.map((s) => [s.id, s.name ?? "—"]),
  )
  const metaMap: Record<string, MetaRow> = Object.fromEntries(
    metadata.map((m) => [m.id, m]),
  )

  /* Category distribution for chart */
  const catCounts: Record<string, number> = {}
  for (const r of rows) {
    const name = r.category_id ? catMap[r.category_id] ?? "Other" : "Uncategorized"
    catCounts[name] = (catCounts[name] || 0) + 1
  }
  const catDistribution = Object.entries(catCounts)
    .sort(([, a], [, b]) => b - a)

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Product Explorer"
        subtitle={`${totalProducts.toLocaleString("en-IN")} products across ${categories.length} categories`}
        actions={
          <Link
            href="/usdrop/products/create"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="size-4" />
            Create Product
          </Link>
        }
      />

      <KPIGrid>
        <MetricCard
          label="Total Products"
          value={totalProducts.toLocaleString("en-IN")}
          icon={Package}
          iconTone="blue"
          hint={`showing newest ${rows.length}`}
        />
        <MetricCard
          label="Trending"
          value={trendingCount}
          icon={TrendingUp}
          iconTone="amber"
          hint="flagged by AI"
        />
        <MetricCard
          label="Winning"
          value={winningCount}
          icon={Trophy}
          iconTone="emerald"
          hint="high performers"
        />
        <MetricCard
          label="Categories"
          value={categories.length}
          icon={Layers}
          iconTone="violet"
          href="/usdrop/categories"
        />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Products surface here once the AI pipeline standardizes them."
        />
      ) : (
        <ProductsClient
          rows={rows}
          catMap={catMap}
          supMap={supMap}
          metaMap={metaMap}
          catDistribution={catDistribution}
          categories={categories.map((c) => ({ id: c.id, name: c.name ?? "Other" }))}
        />
      )}
    </div>
  )
}
