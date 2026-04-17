/**
 * Studio AI endpoint client stubs.
 *
 * Concrete `/api/ets/products/[id]/...` route handlers are implemented by a
 * separate agent. These are typed thin fetch wrappers so the Studio UI compiles
 * and works against the eventual API surface.
 *
 * Until the routes exist they will 404 at runtime — the UI handles errors and
 * surfaces them via toast/inline messaging.
 */

/* ──────────────────────────────────────────────────────────────────────────
 * Request / response shapes
 * ──────────────────────────────────────────────────────────────────────── */

export interface NormalizeNameRequest {
  productId: string
  name?: string | null
  description?: string | null
}

export interface NormalizeNameResponse {
  name_en: string
  description: string | null
  /** Any product/SKU codes the AI lifted out of the raw text. */
  extracted_codes: string[]
}

export interface PolishImageRequest {
  productId: string
  /** Force regeneration even if the source image is already good. */
  force?: boolean
}

export interface PolishImageResponse {
  status: "done" | "skipped" | "failed"
  image_url?: string
  reason?: string
}

export interface SuggestCategoryRequest {
  productId: string
}

export interface CategorySuggestion {
  /** Hierarchical breadcrumb labels from L1 → L3. */
  path: string[]
  categoryId: string
  /** 0..1 confidence score. */
  confidence: number
}

export interface SuggestCategoryResponse {
  suggestions: CategorySuggestion[]
}

export interface SuggestVariantsRequest {
  productId: string
}

export interface VariantSuggestion {
  variant_name: string
  attributes: Record<string, string | number | boolean>
}

export interface SuggestVariantsResponse {
  variants: VariantSuggestion[]
}

export interface RecomputePricingRequest {
  productId: string
  fxRate: number
  marginPct: number
}

export interface RecomputePricingResponse {
  cost_price_inr: number
  selling_price_inr: number
}

export interface PublishProductRequest {
  productId: string
  notes?: string
}

export interface PublishProductResponse {
  ok: boolean
  listing_status: "published"
}

export type BulkAction =
  | "auto-polish"
  | "auto-categorize"
  | "auto-normalize"
  | "publish-ready"

export interface BulkAutomateRequest {
  action: BulkAction
  productIds: string[]
}

export interface BulkAutomateResponse {
  jobId: string
  queued: number
}

/* ──────────────────────────────────────────────────────────────────────────
 * Internal fetch helper
 * ──────────────────────────────────────────────────────────────────────── */

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body == null ? undefined : JSON.stringify(body),
  })
  if (!res.ok) {
    let detail = ""
    try {
      const j = await res.json()
      detail = (j?.error as string) ?? (j?.message as string) ?? ""
    } catch {
      try {
        detail = await res.text()
      } catch {
        /* ignore */
      }
    }
    throw new Error(
      `${res.status} ${res.statusText}${detail ? ` — ${detail}` : ""}`,
    )
  }
  return (await res.json()) as T
}

/* ──────────────────────────────────────────────────────────────────────────
 * Public client functions
 * ──────────────────────────────────────────────────────────────────────── */

export async function normalizeName(
  req: NormalizeNameRequest,
): Promise<NormalizeNameResponse> {
  return postJson(`/api/ets/products/${encodeURIComponent(req.productId)}/normalize-name`, {
    name: req.name,
    description: req.description,
  })
}

export async function polishImage(
  req: PolishImageRequest,
): Promise<PolishImageResponse> {
  const qs = req.force ? "?force=true" : ""
  return postJson(
    `/api/ets/products/${encodeURIComponent(req.productId)}/polish-image${qs}`,
  )
}

export async function suggestCategory(
  req: SuggestCategoryRequest,
): Promise<SuggestCategoryResponse> {
  return postJson(
    `/api/ets/products/${encodeURIComponent(req.productId)}/suggest-category`,
  )
}

export async function suggestVariants(
  req: SuggestVariantsRequest,
): Promise<SuggestVariantsResponse> {
  return postJson(
    `/api/ets/products/${encodeURIComponent(req.productId)}/suggest-variants`,
  )
}

export async function bulkCreateVariants(
  productId: string,
  variants: VariantSuggestion[],
): Promise<{ created: number }> {
  return postJson(
    `/api/ets/products/${encodeURIComponent(productId)}/variants/bulk-create`,
    { variants },
  )
}

export async function recomputePricing(
  req: RecomputePricingRequest,
): Promise<RecomputePricingResponse> {
  return postJson(
    `/api/ets/products/${encodeURIComponent(req.productId)}/recompute-pricing`,
    { fxRate: req.fxRate, marginPct: req.marginPct },
  )
}

export async function publishProduct(
  req: PublishProductRequest,
): Promise<PublishProductResponse> {
  return postJson(
    `/api/ets/products/${encodeURIComponent(req.productId)}/publish`,
    { notes: req.notes },
  )
}

export async function bulkAutomate(
  req: BulkAutomateRequest,
): Promise<BulkAutomateResponse> {
  return postJson(`/api/ets/bhagwati/bulk-automate`, req)
}
