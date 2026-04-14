export interface ProductRow {
  id: string
  legacy_id: number | null
  product_code: string | null
  barcode: string | null
  name_en: string | null
  name_cn: string | null
  category: string | null
  material: string | null
  description: string | null
  image_url: string | null
  image_quality: "ok" | "needs_review" | "regen_pending" | "regen_done" | null
  cost_price: number | null
  partner_price: number | null
  unit_price: number | null
  wholesale_price_inr: number | null
  suggested_mrp: number | null
  units_per_carton: number | null
  moq: number | null
  weight_kg: number | null
  box_length_cm: number | null
  box_width_cm: number | null
  box_height_cm: number | null
  hs_code: string | null
  source: string | null
  source_file: string | null
  vendor_id: string | null
  stock_quantity: number | null
  is_active: boolean
  is_published: boolean
  is_featured: boolean | null
  market_fit: string | null
  market_fit_reason: string | null
  compliance_status: string | null
  label_status: string | null
  bis_required: boolean | null
  bis_status: string | null
  sellability_score: number | null
  tags: string[] | null
  supply_meta: Record<string, unknown> | null
  created_at: string | null
  updated_at: string | null
}

export interface VendorMini {
  id: string
  name: string
}

export interface PriceSettingMini {
  key: string
  label: string
  value: number
  unit: string | null
}

export const IMAGE_QUALITY_OPTIONS: Array<{
  value: NonNullable<ProductRow["image_quality"]>
  label: string
  help: string
}> = [
  {
    value: "ok",
    label: "OK",
    help: "Image is good and client-ready.",
  },
  {
    value: "needs_review",
    label: "Needs review",
    help: "Flagged by ops — review before publishing.",
  },
  {
    value: "regen_pending",
    label: "Regen pending",
    help: "Queued for regeneration via the image pipeline.",
  },
  {
    value: "regen_done",
    label: "Regen done",
    help: "Regenerated — double-check and mark OK.",
  },
]

export const COMPLIANCE_STATUS_OPTIONS = [
  { value: "", label: "— not set —" },
  { value: "safe", label: "Safe" },
  { value: "restricted", label: "Restricted" },
  { value: "banned", label: "Banned" },
] as const

export const LABEL_STATUS_OPTIONS = [
  { value: "", label: "— not set —" },
  { value: "english", label: "English" },
  { value: "chinese", label: "Chinese" },
  { value: "needs_relabel", label: "Needs relabel" },
] as const

export const MARKET_FIT_OPTIONS = [
  { value: "", label: "— not set —" },
  { value: "strong", label: "Strong" },
  { value: "moderate", label: "Moderate" },
  { value: "weak", label: "Weak" },
  { value: "poor", label: "Poor" },
] as const
