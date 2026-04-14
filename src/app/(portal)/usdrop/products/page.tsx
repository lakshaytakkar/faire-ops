import { Package, CheckCircle2, PackageX, AlertTriangle } from "lucide-react"
import { supabaseUsdrop } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
import { ProductsClient, type ProductRow } from "./products-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Products — USDrop | Suprans" }

type CategoryLite = { id: string; name: string | null }
type SupplierLite = { id: string; name: string | null }

async function fetchData() {
  const [p, c, s] = await Promise.all([
    supabaseUsdrop
      .from("products")
      .select(
        "id, title, image, category_id, supplier_id, buy_price, sell_price, profit_per_order, in_stock, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200),
    supabaseUsdrop.from("categories").select("id, name"),
    supabaseUsdrop.from("suppliers").select("id, name"),
  ])
  if (p.error) console.error("usdrop.products:", p.error.message)
  if (c.error) console.error("usdrop.categories:", c.error.message)
  if (s.error) console.error("usdrop.suppliers:", s.error.message)
  return {
    rows: (p.data ?? []) as ProductRow[],
    categories: (c.data ?? []) as CategoryLite[],
    suppliers: (s.data ?? []) as SupplierLite[],
  }
}

export default async function UsdropProductsPage() {
  const { rows, categories, suppliers } = await fetchData()

  const catMap: Record<string, string> = Object.fromEntries(
    categories.map((c) => [c.id, c.name ?? "—"]),
  )
  const supMap: Record<string, string> = Object.fromEntries(
    suppliers.map((s) => [s.id, s.name ?? "—"]),
  )

  const totalSkus = rows.length
  const published = rows.filter((r) => r.in_stock).length
  const drafts = rows.filter((r) => !r.title || r.buy_price === null || r.sell_price === null).length
  const lowStock = rows.filter((r) => !r.in_stock).length

  return (
    <div className="space-y-5">
      <PageHeader
        title="Products"
        subtitle={`${totalSkus.toLocaleString("en-IN")} products (newest 200)`}
      />

      <KPIGrid>
        <MetricCard label="Total SKUs" value={totalSkus} icon={Package} iconTone="blue" hint="newest 200" />
        <MetricCard
          label="Published"
          value={published}
          icon={CheckCircle2}
          iconTone="emerald"
          hint="in stock"
        />
        <MetricCard
          label="Drafts"
          value={drafts}
          icon={AlertTriangle}
          iconTone="amber"
          hint="missing fields"
        />
        <MetricCard
          label="Out of stock"
          value={lowStock}
          icon={PackageX}
          iconTone={lowStock > 0 ? "red" : "slate"}
          hint="needs restock"
        />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Products surface here once the AI pipeline standardizes them or an admin adds them manually."
        />
      ) : (
        <ProductsClient rows={rows} catMap={catMap} supMap={supMap} />
      )}
    </div>
  )
}
