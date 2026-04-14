import { notFound } from "next/navigation"
import { FolderTree, Package, TrendingUp, Layers } from "lucide-react"
import { supabaseUsdrop } from "@/lib/supabase"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { formatDate } from "@/lib/format"
import { BackLink } from "@/components/shared/back-link"
import { HeroCard } from "@/components/shared/hero-card"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import {
  CategoryDetailTabs,
  type CategoryDetail,
  type CategoryProduct,
  type Subcategory,
} from "./category-detail-tabs"

export const dynamic = "force-dynamic"

type Params = { id: string }

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { id } = await params
  return { title: `Category ${id.slice(0, 8)} — USDrop | Suprans` }
}

async function fetchCategory(id: string) {
  const [category, products, subcategories, parents] = await Promise.all([
    supabaseUsdrop
      .from("categories")
      .select(
        "id, name, slug, description, parent_category_id, icon, image_url, trending, product_count, avg_profit_margin, growth_percentage, display_order, is_active, created_at, updated_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabaseUsdrop
      .from("products")
      .select(
        "id, title, image, buy_price, sell_price, profit_per_order, rating, in_stock, created_at",
      )
      .eq("category_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabaseUsdrop
      .from("categories")
      .select("id, name, slug, product_count, trending, is_active")
      .eq("parent_category_id", id)
      .order("name", { ascending: true }),
    supabaseUsdrop.from("categories").select("id, name"),
  ])
  if (!category.data) return null
  return {
    category: category.data as CategoryDetail,
    products: (products.data ?? []) as CategoryProduct[],
    subcategories: (subcategories.data ?? []) as Subcategory[],
    parents: (parents.data ?? []) as Array<{ id: string; name: string | null }>,
  }
}

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params
  const data = await fetchCategory(id)
  if (!data) notFound()
  const { category, products, subcategories, parents } = data
  const parent = parents.find((p) => p.id === category.parent_category_id)

  const marginValue =
    category.avg_profit_margin !== null && category.avg_profit_margin !== undefined
      ? `${Number(category.avg_profit_margin).toFixed(1)}%`
      : "—"

  const growthValue =
    category.growth_percentage !== null && category.growth_percentage !== undefined
      ? `${Number(category.growth_percentage).toFixed(1)}%`
      : "—"

  const avatarNode = category.image_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={category.image_url}
      alt=""
      className="size-11 rounded-md object-cover bg-muted border border-border"
    />
  ) : undefined

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <BackLink href="/usdrop/categories" label="All categories" />

      <HeroCard
        title={category.name ?? "Untitled category"}
        subtitle={category.slug ?? undefined}
        icon={avatarNode ? undefined : FolderTree}
        avatar={avatarNode}
        tone="violet"
        meta={
          <>
            <StatusBadge tone={toneForStatus(category.is_active ? "active" : "inactive")}>
              {category.is_active ? "Active" : "Inactive"}
            </StatusBadge>
            {category.trending && <StatusBadge tone="violet">Trending</StatusBadge>}
            {parent && (
              <StatusBadge tone="slate">Parent: {parent.name ?? "—"}</StatusBadge>
            )}
          </>
        }
      />

      <KPIGrid>
        <MetricCard
          label="Products"
          value={(category.product_count ?? products.length).toLocaleString()}
          icon={Package}
          iconTone="blue"
          hint={formatDate(category.created_at)}
        />
        <MetricCard
          label="Avg margin"
          value={marginValue}
          icon={TrendingUp}
          iconTone="emerald"
        />
        <MetricCard
          label="Growth"
          value={growthValue}
          icon={TrendingUp}
          iconTone="amber"
        />
        <MetricCard
          label="Subcategories"
          value={subcategories.length}
          icon={Layers}
          iconTone="slate"
        />
      </KPIGrid>

      <CategoryDetailTabs
        category={category}
        parentName={parent?.name ?? null}
        products={products}
        subcategories={subcategories}
      />
    </div>
  )
}
