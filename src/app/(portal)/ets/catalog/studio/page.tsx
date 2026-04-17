import {
  ImageOff,
  ListChecks,
  Package,
  Rocket,
  Sparkles,
  TagsIcon,
} from "lucide-react"

import { supabaseEts } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
import {
  BHAGWATI_SOURCE,
  EMPTY_CHECKLIST,
  type PublishChecklist,
} from "@/lib/bhagwati/types"

import { StudioQueueClient } from "./_components/studio-queue-client"
import type { StudioQueueRow } from "./_components/studio-queue-client"

export const dynamic = "force-dynamic"

const SELECT = [
  "id",
  "product_code",
  "name_cn",
  "name_en",
  "name_en_raw",
  "image_url",
  "image_polish_status",
  "selling_price_inr",
  "cost_price_inr",
  "source",
  "source_file",
  "listing_status",
  "publish_checklist",
  "created_at",
].join(", ")

async function loadDrafts(): Promise<StudioQueueRow[]> {
  const { data, error } = await supabaseEts
    .from("products")
    .select(SELECT)
    .eq("source", BHAGWATI_SOURCE)
    .eq("listing_status", "draft")
    .order("created_at", { ascending: false })
    .limit(500)
  if (error) {
    console.error("[studio] loadDrafts error:", error.message)
    return []
  }
  return ((data ?? []) as unknown as StudioQueueRow[]).map((r) => ({
    ...r,
    publish_checklist: { ...EMPTY_CHECKLIST, ...(r.publish_checklist ?? {}) },
  }))
}

function checklistMissing(c: PublishChecklist) {
  return {
    image: !c.image_polished,
    name: !c.name_normalized,
    variants: !c.variants_modeled,
    prices: !c.prices_inr,
    category: !c.categorized,
    source: !c.source_tagged,
  }
}

function isReady(c: PublishChecklist) {
  return (
    c.image_polished &&
    c.name_normalized &&
    c.variants_modeled &&
    c.prices_inr &&
    c.categorized &&
    c.source_tagged
  )
}

export default async function StudioQueuePage() {
  const rows = await loadDrafts()

  const total = rows.length
  const ready = rows.filter((r) => isReady(r.publish_checklist as PublishChecklist)).length
  let missingImage = 0
  let missingCategory = 0
  let missingVariants = 0
  let missingName = 0
  for (const r of rows) {
    const m = checklistMissing(r.publish_checklist as PublishChecklist)
    if (m.image) missingImage++
    if (m.category) missingCategory++
    if (m.variants) missingVariants++
    if (m.name) missingName++
  }

  const sourceFiles = Array.from(
    new Set(rows.map((r) => r.source_file).filter((s): s is string => !!s)),
  ).sort()

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Bhagwati Studio Queue"
        subtitle={`${total.toLocaleString()} draft products from ${BHAGWATI_SOURCE}`}
        breadcrumbs={[
          { label: "ETS", href: "/ets/overview" },
          { label: "Catalog", href: "/ets/catalog/products" },
          { label: "Studio" },
        ]}
      />

      <KPIGrid className="lg:grid-cols-6">
        <MetricCard label="Total drafts" value={total} icon={Package} iconTone="slate" />
        <MetricCard
          label="Ready to publish"
          value={ready}
          icon={Rocket}
          iconTone="emerald"
        />
        <MetricCard
          label="Need image polish"
          value={missingImage}
          icon={ImageOff}
          iconTone="amber"
        />
        <MetricCard
          label="Need category"
          value={missingCategory}
          icon={TagsIcon}
          iconTone="blue"
        />
        <MetricCard
          label="Need variants"
          value={missingVariants}
          icon={ListChecks}
          iconTone="violet"
        />
        <MetricCard
          label="Need name fix"
          value={missingName}
          icon={Sparkles}
          iconTone="red"
        />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No drafts"
          description={`No products with source="${BHAGWATI_SOURCE}" and listing_status="draft". Run the importer to seed the queue.`}
        />
      ) : (
        <StudioQueueClient rows={rows} sourceFiles={sourceFiles} />
      )}
    </div>
  )
}
