import { FolderTree, GitBranch, Package, TrendingUp } from "lucide-react"
import { supabaseUsdrop } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
import { CategoriesClient, type CategoryRow } from "./categories-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Categories — USDrop | Suprans" }

async function fetchCategories() {
  const { data, error } = await supabaseUsdrop
    .from("categories")
    .select(
      "id, name, slug, parent_category_id, trending, product_count, avg_profit_margin, growth_percentage",
    )
    .order("name", { ascending: true })
    .limit(300)
  if (error) console.error("usdrop.categories:", error.message)
  return (data ?? []) as CategoryRow[]
}

export default async function CategoriesPage() {
  const rows = await fetchCategories()
  const nameMap: Record<string, string> = Object.fromEntries(
    rows.map((r) => [r.id, r.name ?? "—"]),
  )

  const total = rows.length
  const parents = rows.filter((r) => !r.parent_category_id).length
  const withProducts = rows.filter((r) => (r.product_count ?? 0) > 0).length
  const trending = rows.filter((r) => r.trending).length

  return (
    <div className="space-y-5">
      <PageHeader
        title="Categories"
        subtitle={`${total.toLocaleString("en-IN")} categories across the client catalog`}
      />

      <KPIGrid>
        <MetricCard label="Total" value={total.toLocaleString("en-IN")} icon={FolderTree} iconTone="slate" />
        <MetricCard label="Parent-level" value={parents.toLocaleString("en-IN")} icon={GitBranch} iconTone="blue" />
        <MetricCard
          label="With products"
          value={withProducts.toLocaleString("en-IN")}
          icon={Package}
          iconTone="emerald"
          hint={`${total - withProducts} empty`}
        />
        <MetricCard label="Trending" value={trending.toLocaleString("en-IN")} icon={TrendingUp} iconTone="violet" />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="No categories yet"
          description="The taxonomy that powers the USDrop product catalog lives here. Add a category to start routing products."
        />
      ) : (
        <CategoriesClient rows={rows} nameMap={nameMap} />
      )}
    </div>
  )
}
