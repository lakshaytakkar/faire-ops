/**
 * Local row shapes for the per-product Studio.
 *
 * Kept narrow on purpose — the Studio only consumes the columns it touches,
 * and we re-cast `unknown` JSONB into the typed `PublishChecklist`.
 */

import type {
  ImagePolishStatus,
  ListingStatus,
  NameQuality,
  PublishChecklist,
} from "@/lib/bhagwati/types"

export interface StudioProduct {
  id: string
  product_code: string | null
  name_cn: string | null
  name_en: string | null
  name_en_raw: string | null
  name_quality: NameQuality | null
  description: string | null
  material: string | null
  tags: Record<string, unknown> | null

  /* image */
  image_url: string | null
  image_raw_url: string | null
  image_polish_status: ImagePolishStatus | null

  /* pricing */
  unit_price: number | null
  currency: string | null
  cost_price_cny: number | null
  cost_price_inr: number | null
  selling_price_inr: number | null
  fx_rate_inr_cny: number | null
  margin_pct: number | null

  /* logistics */
  moq: number | null
  carton_qty: number | null
  box_qty: number | null

  /* category */
  category_id: string | null
  category_confidence: number | null

  /* lifecycle */
  source: string | null
  source_file: string | null
  is_published: boolean
  listing_status: ListingStatus | null
  publish_checklist: PublishChecklist | null

  created_at: string | null
  updated_at: string | null
}

export interface StudioVariant {
  id: string
  product_id: string
  sku: string | null
  variant_name: string | null
  attributes: Record<string, unknown> | null
  cost_price_cny: number | null
  cost_price_inr: number | null
  selling_price_inr: number | null
  stock_qty: number | null
  image_url: string | null
  sort_order: number | null
  is_active: boolean | null
}

export interface StudioCategory {
  id: string
  name: string
  parent_id: string | null
  level: number | null
}
