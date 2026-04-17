import { notFound } from "next/navigation"

import { supabaseEts } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import {
  DEFAULT_FX_INR_PER_CNY,
} from "@/lib/pricing/ets-pricing"
import { EMPTY_CHECKLIST, type PublishChecklist } from "@/lib/bhagwati/types"

import { PublishChecklistRail } from "./_components/publish-checklist-rail"
import { ClientPreviewCard } from "./_components/client-preview-card"
import { StudioCanvas } from "./_components/studio-canvas"
import type { StudioCategory, StudioProduct, StudioVariant } from "./_components/types"

export const dynamic = "force-dynamic"

/**
 * Bhagwati Studio — per-product publish-readiness workspace.
 *
 * Server component. Loads the product by slug (`product_code`), its variants,
 * and the full category list, and hands them to client components for editing.
 */

const PRODUCT_SELECT = [
  "id",
  "product_code",
  "name_cn",
  "name_en",
  "name_en_raw",
  "name_quality",
  "description",
  "material",
  "tags",
  "image_url",
  "image_raw_url",
  "image_polish_status",
  "unit_price",
  "currency",
  "cost_price_cny",
  "cost_price_inr",
  "selling_price_inr",
  "fx_rate_inr_cny",
  "margin_pct",
  "moq",
  "carton_qty",
  "box_qty",
  "category_id",
  "category_confidence",
  "source",
  "source_file",
  "is_published",
  "listing_status",
  "publish_checklist",
  "created_at",
  "updated_at",
].join(", ")

async function loadProduct(slug: string): Promise<StudioProduct | null> {
  const decoded = decodeURIComponent(slug)
  const bySlug = await supabaseEts
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("product_code", decoded)
    .maybeSingle()
  if (bySlug.data) return bySlug.data as unknown as StudioProduct
  const byId = await supabaseEts
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("id", decoded)
    .maybeSingle()
  return (byId.data as unknown as StudioProduct) ?? null
}

async function loadVariants(productId: string): Promise<StudioVariant[]> {
  const { data, error } = await supabaseEts
    .from("product_variants")
    .select(
      "id, product_id, sku, variant_name, attributes, cost_price_cny, cost_price_inr, selling_price_inr, stock_qty, image_url, sort_order, is_active",
    )
    .eq("product_id", productId)
    .order("sort_order", { ascending: true })
  if (error) {
    // Table may not exist yet in some envs — degrade gracefully.
    return []
  }
  return (data ?? []) as unknown as StudioVariant[]
}

async function loadCategories(): Promise<StudioCategory[]> {
  const { data, error } = await supabaseEts
    .from("categories")
    .select("id, name, parent_id, level")
    .order("level", { ascending: true })
    .order("name", { ascending: true })
  if (error) return []
  return (data ?? []) as unknown as StudioCategory[]
}

function readyToPublish(checklist: PublishChecklist): boolean {
  return (
    checklist.image_polished &&
    checklist.name_normalized &&
    checklist.variants_modeled &&
    checklist.prices_inr &&
    checklist.categorized &&
    checklist.source_tagged
  )
}

export default async function ProductStudioPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const product = await loadProduct(slug)
  if (!product) notFound()

  const [variants, categories] = await Promise.all([
    loadVariants(product.id),
    loadCategories(),
  ])

  const checklist: PublishChecklist = {
    ...EMPTY_CHECKLIST,
    ...(product.publish_checklist ?? {}),
  }
  const ready = readyToPublish(checklist)
  const fxRate = product.fx_rate_inr_cny ?? DEFAULT_FX_INR_PER_CNY
  const title = product.name_en || product.name_cn || product.product_code || "Studio"

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title={`Studio: ${title}`}
        subtitle={
          product.source_file
            ? `Sourced from ${product.source_file}`
            : product.source ?? undefined
        }
        breadcrumbs={[
          { label: "ETS", href: "/ets/overview" },
          { label: "Catalog", href: "/ets/catalog/products" },
          { label: "Bhagwati Studio", href: "/ets/catalog/studio" },
          { label: product.product_code ?? slug },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge tone={toneForStatus(product.listing_status ?? "draft")}>
              {product.listing_status ?? "draft"}
            </StatusBadge>
            <a
              href={`#publish`}
              className={
                ready
                  ? "inline-flex h-9 items-center rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700"
                  : "inline-flex h-9 items-center rounded-lg bg-muted px-4 text-sm font-medium text-muted-foreground cursor-not-allowed pointer-events-none"
              }
              aria-disabled={!ready}
              title={ready ? "Publish this product" : "Complete the checklist first"}
            >
              {ready ? "Publish" : "Not ready"}
            </a>
          </div>
        }
      />

      <div className="grid grid-cols-12 gap-5">
        <aside className="col-span-12 lg:col-span-3">
          <div className="lg:sticky lg:top-4">
            <PublishChecklistRail
              productId={product.id}
              checklist={checklist}
              listingStatus={product.listing_status ?? "draft"}
            />
          </div>
        </aside>

        <main className="col-span-12 lg:col-span-6">
          <StudioCanvas
            product={product}
            variants={variants}
            categories={categories}
            fxRate={fxRate}
          />
        </main>

        <aside className="col-span-12 lg:col-span-3">
          <div className="lg:sticky lg:top-4">
            <ClientPreviewCard product={product} />
          </div>
        </aside>
      </div>
    </div>
  )
}
