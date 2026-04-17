/**
 * Pure server-side helpers for the Bhagwati-China product listing pipeline.
 *
 * These functions are intentionally framework-agnostic — they take plain
 * arguments, return plain JSON-serialisable results, and never touch the
 * Next.js Request/Response objects. That way both the per-product API
 * routes AND the bulk-automate route AND offline scripts can share them.
 *
 * Vendor lock: Gemini only. Schema: ets.* via service-role client.
 */

import { createClient } from "@supabase/supabase-js"

// Use a loose alias since `createClient({ db: { schema } })` narrows the
// generic and we don't need the typed-table layer here — every call site
// uses untyped `from(...)` access.
type SupabaseClient = ReturnType<typeof createClient>
type EtsSupabaseClient = ReturnType<typeof getEtsServiceClient>
import { GoogleGenerativeAI } from "@google/generative-ai"
import {
  computePricing,
  DEFAULT_FX_INR_PER_CNY,
  DEFAULT_MARGIN_PCT,
} from "@/lib/pricing/ets-pricing"
import { polishAndUpload } from "@/lib/bhagwati/gemini-polish"
import { EMPTY_CHECKLIST, type PolishResult, type PublishChecklist } from "@/lib/bhagwati/types"

/* ------------------------------------------------------------------ */
/*  Supabase service-role clients                                      */
/* ------------------------------------------------------------------ */

/**
 * Service-role client bound to the `ets` schema for reads/writes against
 * ets.products, ets.product_variants, ets.categories, etc.
 */
export function getEtsServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ""
  return createClient(url, key, {
    auth: { persistSession: false },
    db: { schema: "ets" },
  })
}

/**
 * Service-role client bound to the default (public) schema — used for
 * Storage operations which are schema-agnostic.
 */
export function getStorageServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ""
  return createClient(url, key, { auth: { persistSession: false } })
}

/* ------------------------------------------------------------------ */
/*  Gemini text helper (JSON-mode)                                     */
/* ------------------------------------------------------------------ */

const API_KEY =
  process.env.GEMINI_API_KEY ?? process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? ""
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null

/**
 * Calls Gemini Flash with `responseMimeType: application/json` so the
 * model returns a parseable JSON string. Falls back to manual fence
 * stripping if the SDK ignores the hint.
 */
async function generateJson<T>(prompt: string): Promise<T> {
  if (!genAI) throw new Error("gemini_not_configured")
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
    } as Record<string, unknown>,
  })
  const result = await model.generateContent(prompt)
  let text = result.response.text().trim()
  text = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`gemini_invalid_json:${text.slice(0, 200)}`)
  }
}

/* ------------------------------------------------------------------ */
/*  Common: fetch a product row                                         */
/* ------------------------------------------------------------------ */

export interface EtsProductRow {
  id: string
  product_code: string | null
  name: string | null
  name_en_raw: string | null
  description: string | null
  cost_price_cny: number | null
  cost_price_inr: number | null
  selling_price_inr: number | null
  fx_rate_inr_cny: number | null
  margin_pct: number | null
  listing_status: string | null
  publish_checklist: PublishChecklist | null
  image_polish_status: string | null
  image_polish_reason: string | null
  image_raw_url: string | null
  image_url: string | null
  carton_qty: number | null
  box_qty: number | null
  category_id: string | null
  category_confidence: number | null
  name_quality: string | null
  is_published: boolean | null
  tags: Record<string, unknown> | null
}

export async function fetchProduct(
  productId: string,
  sb?: EtsSupabaseClient,
): Promise<EtsProductRow> {
  const client = sb ?? getEtsServiceClient()
  const { data, error } = await client
    .from("products")
    .select("*")
    .eq("id", productId)
    .maybeSingle()
  if (error) throw new Error(`fetch_product_failed:${error.message}`)
  if (!data) throw new Error("product_not_found")
  return data as EtsProductRow
}

function mergeChecklist(
  current: PublishChecklist | null,
  patch: Partial<PublishChecklist>,
): PublishChecklist {
  return { ...EMPTY_CHECKLIST, ...(current ?? {}), ...patch }
}

/* ------------------------------------------------------------------ */
/*  1. Normalize name (preview + apply)                                 */
/* ------------------------------------------------------------------ */

export interface NormalizeNameSuggestion {
  name_en: string
  description: string
  extracted_codes: string[]
}

export async function normalizeNameForProduct(
  productId: string,
  override?: { name?: string; description?: string; language_hint?: "cn" | "en" | "mixed" },
): Promise<NormalizeNameSuggestion> {
  const product = await fetchProduct(productId)
  const rawName = override?.name ?? product.name ?? product.name_en_raw ?? ""
  const rawDesc = override?.description ?? product.description ?? ""
  const lang = override?.language_hint ?? "mixed"

  const prompt = `You are normalising raw supplier product names for an Indian e-commerce catalog.

Source language hint: ${lang}
Raw name: ${JSON.stringify(rawName)}
Raw description: ${JSON.stringify(rawDesc)}

Take this raw supplier product name (often Chinese with embedded model codes / measurements). Return a single JSON object with this exact shape:

{
  "name_en": "<consumer English title, Title Case, max 60 chars, no model numbers, no Chinese, no SKU prefixes>",
  "description_md": "<markdown description that incorporates the original details plus an 'Specs' section listing extracted codes/measurements>",
  "extracted_codes": ["<model number 1>", "<measurement 1>", "..."]
}

Rules:
- name_en MUST be in simple consumer English, Title Case, max 60 characters
- Move all model numbers, SKU prefixes, and dimension strings into extracted_codes
- description_md must be valid markdown with a "## Specs" section listing extracted_codes as bullet points
- Do not invent details that aren't in the source
- Reply with ONLY the JSON object, no prose, no fences`

  const parsed = await generateJson<{
    name_en: string
    description_md: string
    extracted_codes?: string[]
  }>(prompt)

  return {
    name_en: (parsed.name_en ?? "").slice(0, 60).trim(),
    description: parsed.description_md ?? "",
    extracted_codes: Array.isArray(parsed.extracted_codes) ? parsed.extracted_codes : [],
  }
}

export async function applyNormalizedNameForProduct(
  productId: string,
  payload: { name_en: string; description: string },
): Promise<EtsProductRow> {
  const sb = getEtsServiceClient()
  const product = await fetchProduct(productId, sb)
  const checklist = mergeChecklist(product.publish_checklist, {
    name_normalized: true,
  })
  const patch: Record<string, unknown> = {
    name: payload.name_en,
    description: payload.description,
    name_quality: "ai_cleaned",
    publish_checklist: checklist,
  }
  if (!product.name_en_raw && product.name) {
    patch.name_en_raw = product.name
  }
  const { data, error } = await sb
    .from("products")
    .update(patch)
    .eq("id", productId)
    .select("*")
    .maybeSingle()
  if (error) throw new Error(`apply_name_failed:${error.message}`)
  return data as EtsProductRow
}

/* ------------------------------------------------------------------ */
/*  2. Polish image                                                     */
/* ------------------------------------------------------------------ */

export interface PolishImageOutcome {
  result: PolishResult
  imageUrl: string | null
}

export async function polishImageForProduct(
  productId: string,
  opts: { force?: boolean } = {},
): Promise<PolishImageOutcome> {
  const sb = getEtsServiceClient()
  const storage = getStorageServiceClient()
  const product = await fetchProduct(productId, sb)
  const sourceUrl = product.image_raw_url || product.image_url
  if (!sourceUrl) {
    const reason = "no_source_image"
    await sb
      .from("products")
      .update({
        image_polish_status: "failed",
        image_polish_reason: reason,
      })
      .eq("id", productId)
    return { result: { status: "failed", reason }, imageUrl: null }
  }

  // Download source image
  let imageBuffer: Buffer
  let mimeType: string
  try {
    const resp = await fetch(sourceUrl)
    if (!resp.ok) throw new Error(`source_fetch_${resp.status}`)
    const arr = await resp.arrayBuffer()
    imageBuffer = Buffer.from(arr)
    mimeType =
      resp.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg"
  } catch (err) {
    const reason = `download_failed:${(err as Error).message}`
    await sb
      .from("products")
      .update({
        image_polish_status: "failed",
        image_polish_reason: reason,
      })
      .eq("id", productId)
    return { result: { status: "failed", reason }, imageUrl: null }
  }

  const result = await polishAndUpload({
    imageBuffer,
    mimeType,
    storagePath: `products/${productId}.webp`,
    bucket: "product-images",
    supabase: storage as unknown as Parameters<typeof polishAndUpload>[0]["supabase"],
    forceRegen: !!opts.force,
  })

  const checklistBase = product.publish_checklist
  let updatedImageUrl: string | null = product.image_url

  if (result.status === "done") {
    const checklist = mergeChecklist(checklistBase, { image_polished: true })
    updatedImageUrl = result.publicUrl ?? product.image_url
    await sb
      .from("products")
      .update({
        image_url: updatedImageUrl,
        image_polish_status: "done",
        image_polish_reason: null,
        publish_checklist: checklist,
      })
      .eq("id", productId)
  } else if (result.status === "skipped") {
    const reason = result.reason ?? "skipped"
    const alreadyGood = reason.startsWith("already_good:")
    const checklist = mergeChecklist(checklistBase, alreadyGood ? { image_polished: true } : {})
    await sb
      .from("products")
      .update({
        image_polish_status: "skipped",
        image_polish_reason: reason,
        publish_checklist: checklist,
      })
      .eq("id", productId)
  } else {
    await sb
      .from("products")
      .update({
        image_polish_status: "failed",
        image_polish_reason: result.reason ?? "unknown_failure",
      })
      .eq("id", productId)
  }

  return { result, imageUrl: updatedImageUrl }
}

/* ------------------------------------------------------------------ */
/*  3. Suggest category                                                 */
/* ------------------------------------------------------------------ */

export interface CategorySuggestion {
  path: string[]
  categoryId: string
  confidence: number
}

interface CategoryRow {
  id: string
  name: string
  parent_id: string | null
  level: number
}

interface CategoryNode {
  id: string
  name: string
  level: number
  path: string[]
  children: CategoryNode[]
}

function buildCategoryTree(rows: CategoryRow[]): CategoryNode[] {
  const byId = new Map<string, CategoryNode>()
  for (const r of rows) {
    byId.set(r.id, { id: r.id, name: r.name, level: r.level, path: [], children: [] })
  }
  const roots: CategoryNode[] = []
  for (const r of rows) {
    const node = byId.get(r.id)!
    if (r.parent_id && byId.has(r.parent_id)) {
      byId.get(r.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  function walk(node: CategoryNode, parentPath: string[]): void {
    node.path = [...parentPath, node.name]
    for (const c of node.children) walk(c, node.path)
  }
  for (const r of roots) walk(r, [])
  return roots
}

function flattenCategoryTreeForPrompt(roots: CategoryNode[]): string {
  const lines: string[] = []
  function walk(node: CategoryNode, indent: number): void {
    lines.push(`${"  ".repeat(indent)}- ${node.name} [id=${node.id}]`)
    for (const c of node.children) walk(c, indent + 1)
  }
  for (const r of roots) walk(r, 0)
  return lines.join("\n")
}

export async function suggestCategoryForProduct(
  productId: string,
): Promise<{ suggestions: CategorySuggestion[] }> {
  const sb = getEtsServiceClient()
  const product = await fetchProduct(productId, sb)
  const { data: catRows, error } = await sb
    .from("categories")
    .select("id, name, parent_id, level")
    .order("level", { ascending: true })
  if (error) throw new Error(`fetch_categories_failed:${error.message}`)
  const tree = buildCategoryTree((catRows ?? []) as CategoryRow[])
  const treeText = flattenCategoryTreeForPrompt(tree)

  const prompt = `You are a product taxonomy classifier for an Indian e-commerce catalog.

Product:
  name: ${JSON.stringify(product.name)}
  description: ${JSON.stringify(product.description ?? "")}
  image_url: ${JSON.stringify(product.image_url ?? product.image_raw_url ?? "")}

Category tree (indented; each line ends with the UUID):
${treeText || "(empty)"}

Pick the TOP 3 best-fit categories for this product. Reply with ONLY a JSON object of this shape:

{
  "suggestions": [
    { "path": ["Root", "Sub", "Leaf"], "categoryId": "<uuid>", "confidence": 0.92 },
    ...
  ]
}

Rules:
- categoryId MUST be one of the UUIDs in the tree above
- path MUST be the human-readable breadcrumb of names from root to leaf
- confidence is a float in [0, 1]
- Return at most 3 suggestions, ordered most-confident first
- If no categories fit, return { "suggestions": [] }`

  const parsed = await generateJson<{ suggestions?: CategorySuggestion[] }>(prompt)
  const list = Array.isArray(parsed.suggestions) ? parsed.suggestions : []
  return {
    suggestions: list
      .filter((s) => s && typeof s.categoryId === "string")
      .slice(0, 3)
      .map((s) => ({
        path: Array.isArray(s.path) ? s.path : [],
        categoryId: s.categoryId,
        confidence: typeof s.confidence === "number" ? s.confidence : 0,
      })),
  }
}

export async function applyCategoryForProduct(
  productId: string,
  payload: { categoryId: string; confidence: number },
): Promise<EtsProductRow> {
  const sb = getEtsServiceClient()
  const product = await fetchProduct(productId, sb)
  const checklist = mergeChecklist(product.publish_checklist, { categorized: true })
  const { data, error } = await sb
    .from("products")
    .update({
      category_id: payload.categoryId,
      category_confidence: payload.confidence,
      publish_checklist: checklist,
    })
    .eq("id", productId)
    .select("*")
    .maybeSingle()
  if (error) throw new Error(`apply_category_failed:${error.message}`)
  return data as EtsProductRow
}

/* ------------------------------------------------------------------ */
/*  4. Suggest variants                                                 */
/* ------------------------------------------------------------------ */

export interface VariantSuggestion {
  variant_name: string
  attributes: Record<string, string>
}

export interface VariantSuggestionResult {
  has_variants: boolean
  variants: VariantSuggestion[]
}

export async function suggestVariantsForProduct(
  productId: string,
): Promise<VariantSuggestionResult> {
  const product = await fetchProduct(productId)
  const prompt = `You are an e-commerce catalog editor.

Product name: ${JSON.stringify(product.name ?? "")}
Product description: ${JSON.stringify(product.description ?? "")}

Decide whether this product naturally splits into VARIANTS along axes such as
color, size, material, capacity, pattern. Reply with ONLY a JSON object:

{
  "has_variants": true|false,
  "variants": [
    { "variant_name": "Red / Small", "attributes": { "color": "Red", "size": "S" } },
    ...
  ]
}

Rules:
- If the product is a single SKU with no real variant axes, return { "has_variants": false, "variants": [] }
- Otherwise list every concrete combination you can infer from the description
- variant_name is a short human-readable label (combine attribute values with " / ")
- attributes is a flat string→string map
- Do not invent attribute values that aren't supported by the description`

  const parsed = await generateJson<VariantSuggestionResult>(prompt)
  return {
    has_variants: !!parsed.has_variants,
    variants: Array.isArray(parsed.variants)
      ? parsed.variants
          .filter((v) => v && typeof v.variant_name === "string")
          .map((v) => ({
            variant_name: v.variant_name,
            attributes: v.attributes && typeof v.attributes === "object" ? v.attributes : {},
          }))
      : [],
  }
}

/* ------------------------------------------------------------------ */
/*  5. Bulk-create variants                                             */
/* ------------------------------------------------------------------ */

export interface BulkVariantInput {
  variant_name: string
  attributes: Record<string, string>
  cost_price_cny?: number
  stock_qty?: number
  image_url?: string
}

export async function bulkCreateVariantsForProduct(
  productId: string,
  variants: BulkVariantInput[],
): Promise<{ inserted: Array<Record<string, unknown>> }> {
  if (!Array.isArray(variants) || variants.length === 0) {
    return { inserted: [] }
  }
  const sb = getEtsServiceClient()
  const product = await fetchProduct(productId, sb)
  const fxRate = product.fx_rate_inr_cny ?? DEFAULT_FX_INR_PER_CNY
  const marginPct = product.margin_pct ?? DEFAULT_MARGIN_PCT
  const baseSku = product.product_code ?? productId.slice(0, 8)

  const rows = variants.map((v, idx) => {
    const cny = v.cost_price_cny ?? product.cost_price_cny ?? 0
    const pricing = computePricing({
      costPriceCny: cny,
      fxRate,
      marginPct,
    })
    return {
      product_id: productId,
      sku: `${baseSku}-${idx + 1}`,
      variant_name: v.variant_name,
      attributes: v.attributes ?? {},
      cost_price_cny: pricing.costPriceCny,
      cost_price_inr: pricing.costPriceInr,
      selling_price_inr: pricing.sellingPriceInr,
      stock_qty: v.stock_qty ?? 0,
      image_url: v.image_url ?? null,
      sort_order: idx,
      is_active: true,
    }
  })

  const { data, error } = await sb.from("product_variants").insert(rows).select("*")
  if (error) throw new Error(`insert_variants_failed:${error.message}`)

  const checklist = mergeChecklist(product.publish_checklist, { variants_modeled: true })
  await sb
    .from("products")
    .update({ publish_checklist: checklist })
    .eq("id", productId)

  return { inserted: (data ?? []) as Array<Record<string, unknown>> }
}

/* ------------------------------------------------------------------ */
/*  6. Recompute pricing                                                */
/* ------------------------------------------------------------------ */

export interface RecomputePricingOpts {
  fxRate?: number
  marginPct?: number
  applyToVariants?: boolean
}

export async function recomputePricingForProduct(
  productId: string,
  opts: RecomputePricingOpts = {},
): Promise<{
  product: EtsProductRow
  variants: Array<Record<string, unknown>>
}> {
  const sb = getEtsServiceClient()
  const product = await fetchProduct(productId, sb)
  const fxRate =
    opts.fxRate ?? product.fx_rate_inr_cny ?? DEFAULT_FX_INR_PER_CNY
  const marginPct =
    opts.marginPct ?? product.margin_pct ?? DEFAULT_MARGIN_PCT
  const cny = product.cost_price_cny ?? 0
  const pricing = computePricing({
    costPriceCny: cny,
    fxRate,
    marginPct,
  })
  const checklist = mergeChecklist(product.publish_checklist, { prices_inr: true })

  const { data: updated, error } = await sb
    .from("products")
    .update({
      fx_rate_inr_cny: fxRate,
      margin_pct: marginPct,
      cost_price_inr: pricing.costPriceInr,
      selling_price_inr: pricing.sellingPriceInr,
      publish_checklist: checklist,
    })
    .eq("id", productId)
    .select("*")
    .maybeSingle()
  if (error) throw new Error(`update_pricing_failed:${error.message}`)

  let variants: Array<Record<string, unknown>> = []
  if (opts.applyToVariants) {
    const { data: vrows, error: vErr } = await sb
      .from("product_variants")
      .select("id, cost_price_cny")
      .eq("product_id", productId)
    if (vErr) throw new Error(`fetch_variants_failed:${vErr.message}`)
    const updates: Array<Record<string, unknown>> = []
    for (const v of (vrows ?? []) as Array<{ id: string; cost_price_cny: number | null }>) {
      const vp = computePricing({
        costPriceCny: v.cost_price_cny ?? 0,
        fxRate,
        marginPct,
      })
      const { data: vu, error: vue } = await sb
        .from("product_variants")
        .update({
          cost_price_inr: vp.costPriceInr,
          selling_price_inr: vp.sellingPriceInr,
        })
        .eq("id", v.id)
        .select("*")
        .maybeSingle()
      if (vue) throw new Error(`update_variant_failed:${vue.message}`)
      if (vu) updates.push(vu as Record<string, unknown>)
    }
    variants = updates
  }

  return { product: updated as EtsProductRow, variants }
}

/* ------------------------------------------------------------------ */
/*  7. Publish                                                          */
/* ------------------------------------------------------------------ */

export interface PublishReadinessRow {
  id: string
  ready_to_publish: boolean
  image_polished?: boolean
  name_normalized?: boolean
  variants_modeled?: boolean
  prices_inr?: boolean
  categorized?: boolean
  source_tagged?: boolean
}

export async function getPublishReadiness(
  productId: string,
): Promise<PublishReadinessRow | null> {
  const sb = getEtsServiceClient()
  const { data, error } = await sb
    .from("v_product_publish_readiness")
    .select("*")
    .eq("id", productId)
    .maybeSingle()
  if (error) throw new Error(`fetch_readiness_failed:${error.message}`)
  return (data as PublishReadinessRow | null) ?? null
}

export async function publishProduct(
  productId: string,
  opts: { notes?: string } = {},
): Promise<
  | { ok: true; product: EtsProductRow }
  | { ok: false; error: "checklist_incomplete"; missing: string[] }
> {
  const readiness = await getPublishReadiness(productId)
  if (!readiness || !readiness.ready_to_publish) {
    const checklistKeys: Array<keyof PublishChecklist> = [
      "image_polished",
      "name_normalized",
      "variants_modeled",
      "prices_inr",
      "categorized",
      "source_tagged",
    ]
    const missing = checklistKeys.filter((k) => {
      const v = (readiness as unknown as Record<string, unknown>)?.[k]
      return v === false || v == null
    })
    return { ok: false, error: "checklist_incomplete", missing }
  }
  const sb = getEtsServiceClient()
  const product = await fetchProduct(productId, sb)
  const patch: Record<string, unknown> = {
    listing_status: "published",
    is_published: true,
  }
  if (opts.notes) {
    const tags = (product.tags && typeof product.tags === "object" ? product.tags : {}) as Record<string, unknown>
    patch.tags = { ...tags, publish_notes: opts.notes }
  }
  const { data, error } = await sb
    .from("products")
    .update(patch)
    .eq("id", productId)
    .select("*")
    .maybeSingle()
  if (error) throw new Error(`publish_failed:${error.message}`)
  return { ok: true, product: data as EtsProductRow }
}

/* ------------------------------------------------------------------ */
/*  8. Bulk automation                                                  */
/* ------------------------------------------------------------------ */

export type BulkAction =
  | "polish-image"
  | "suggest-category"
  | "normalize-name"
  | "recompute-pricing"
  | "publish-ready"

export interface BulkResultItem {
  productId: string
  status: "ok" | "skipped" | "error"
  error?: string
  data?: unknown
}

export interface BulkRunResult {
  processed: number
  succeeded: number
  failed: number
  results: BulkResultItem[]
}

export const BULK_AUTOMATE_LIMIT = 50

export async function runBulkAutomate(
  action: BulkAction,
  productIds: string[],
): Promise<BulkRunResult> {
  const out: BulkResultItem[] = []
  let succeeded = 0
  let failed = 0

  for (const id of productIds) {
    try {
      let data: unknown = null
      let status: BulkResultItem["status"] = "ok"
      switch (action) {
        case "polish-image": {
          data = await polishImageForProduct(id)
          break
        }
        case "suggest-category": {
          data = await suggestCategoryForProduct(id)
          break
        }
        case "normalize-name": {
          data = await normalizeNameForProduct(id)
          break
        }
        case "recompute-pricing": {
          data = await recomputePricingForProduct(id)
          break
        }
        case "publish-ready": {
          const readiness = await getPublishReadiness(id)
          if (!readiness || !readiness.ready_to_publish) {
            status = "skipped"
            data = { reason: "not_ready" }
          } else {
            const result = await publishProduct(id)
            if (!result.ok) {
              status = "skipped"
              data = { reason: result.error, missing: result.missing }
            } else {
              data = { product: result.product }
            }
          }
          break
        }
        default: {
          throw new Error(`unknown_action:${action}`)
        }
      }
      out.push({ productId: id, status, data })
      if (status === "ok") succeeded++
    } catch (err) {
      failed++
      out.push({
        productId: id,
        status: "error",
        error: (err as Error).message,
      })
    }
  }

  return {
    processed: productIds.length,
    succeeded,
    failed,
    results: out,
  }
}
