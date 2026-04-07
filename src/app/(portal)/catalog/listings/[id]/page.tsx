"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Package, ExternalLink, Tag, ImageIcon, RefreshCw, Share2, ChevronLeft, ChevronRight, Sparkles, Wand2, Check, X, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { FaireProduct } from "@/lib/supabase"
import { useBrandFilter } from "@/lib/brand-filter-context"
import { generateText, isGeminiConfigured } from "@/lib/gemini"
import { Button } from "@/components/ui/button"

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function calcMargin(wsCents: number, retailCents: number): number {
  if (retailCents === 0) return 0
  return Math.round(((retailCents - wsCents) / retailCents) * 100)
}

type LifecycleState = "PUBLISHED" | "DRAFT" | "UNPUBLISHED" | "DELETED"

const STATUS_BADGE: Record<LifecycleState, string> = {
  PUBLISHED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  DRAFT: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  UNPUBLISHED: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  DELETED: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
}

const STATUS_LABEL: Record<LifecycleState, string> = {
  PUBLISHED: "Published",
  DRAFT: "Draft",
  UNPUBLISHED: "Unpublished",
  DELETED: "Deleted",
}

const SALE_STATE_BADGE: Record<string, string> = {
  FOR_SALE: "bg-emerald-50 text-emerald-700",
  NOT_FOR_SALE: "bg-zinc-100 text-zinc-600",
  DISCONTINUED: "bg-red-50 text-red-700",
}

/* ------------------------------------------------------------------ */
/*  Types for raw_data                                                 */
/* ------------------------------------------------------------------ */

interface RawImage {
  url: string
  width?: number
  height?: number
}

interface RawVariant {
  id?: string
  name?: string
  sku?: string
  wholesale_price_cents?: number
  retail_price_cents?: number
  available_quantity?: number
  active?: boolean
  sale_state?: string
  options?: { name: string; value: string }[]
}

const VARIANTS_PAGE_SIZE = 10

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */

function LoadingSkeleton() {
  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-4 animate-pulse">
      <div className="h-4 w-20 bg-muted rounded" />
      <div className="h-7 w-72 bg-muted rounded" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-80 bg-muted rounded-md" />
          <div className="h-40 bg-muted rounded-md" />
          <div className="h-56 bg-muted rounded-md" />
        </div>
        <div className="space-y-4">
          <div className="h-36 bg-muted rounded-md" />
          <div className="h-28 bg-muted rounded-md" />
          <div className="h-28 bg-muted rounded-md" />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>()
  const { stores } = useBrandFilter()
  const [product, setProduct] = useState<FaireProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activeImageIdx, setActiveImageIdx] = useState(0)
  const [variantPage, setVariantPage] = useState(1)
  const [adjacentIds, setAdjacentIds] = useState<{prev: string | null, next: string | null}>({prev: null, next: null})
  const [sortKey, setSortKey] = useState("price")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir(prev => prev === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("desc") }
  }

  function SortIcon({ col }: { col: string }) {
    if (sortKey !== col) return <ArrowUpDown className="size-3 opacity-30 ml-1" />
    return sortDir === "asc" ? <ArrowUp className="size-3 text-primary ml-1" /> : <ArrowDown className="size-3 text-primary ml-1" />
  }
  const [titleRewrite, setTitleRewrite] = useState<{mode: "idle" | "suggest" | "loading" | "result", suggestions: string, result: string}>({mode: "idle", suggestions: "", result: ""})
  const [descRewrite, setDescRewrite] = useState<{mode: "idle" | "suggest" | "loading" | "result", suggestions: string, result: string}>({mode: "idle", suggestions: "", result: ""})

  useEffect(() => {
    supabase
      .from("faire_products")
      .select("*")
      .eq("faire_product_id", params.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true)
        } else {
          setProduct(data)
        }
        setLoading(false)
      })
  }, [params.id])

  useEffect(() => {
    if (!product) return
    supabase
      .from("faire_products")
      .select("faire_product_id")
      .order("faire_updated_at", { ascending: false })
      .range(0, 4999)
      .then(({ data }) => {
        if (!data) return
        const idx = data.findIndex(o => o.faire_product_id === params.id)
        setAdjacentIds({
          prev: idx > 0 ? data[idx - 1].faire_product_id : null,
          next: idx < data.length - 1 ? data[idx + 1].faire_product_id : null,
        })
      })
  }, [product, params.id])

  async function rewriteTitle() {
    setTitleRewrite(prev => ({...prev, mode: "loading"}))
    const category = (() => { try { return JSON.parse(product?.category ?? "")?.name ?? "" } catch { return product?.category ?? "" } })()
    const prompt = `Rewrite this wholesale product title for Faire marketplace.

Current title: ${product?.name}
Category: ${category}
User suggestions: ${titleRewrite.suggestions}

Requirements:
- Max 60 characters
- Use | as separator between key terms
- B2B wholesale tone — clear for retail buyers
- Include product type, key material/feature, and size/quantity if relevant
- Professional naming pattern suitable for retailers
- SEO optimized for Faire search

Return ONLY the new title, nothing else.`
    const result = await generateText(prompt)
    setTitleRewrite({mode: "result", suggestions: titleRewrite.suggestions, result: result.trim()})
  }

  async function rewriteDescription() {
    setDescRewrite(prev => ({...prev, mode: "loading"}))
    const category = (() => { try { return JSON.parse(product?.category ?? "")?.name ?? "" } catch { return product?.category ?? "" } })()
    const wsPrice = (product?.wholesale_price_cents ?? 0) / 100
    const prompt = `Rewrite this wholesale product description for Faire marketplace.

Product: ${product?.name}
Category: ${category}
Wholesale Price: $${wsPrice.toFixed(2)}
Current description: ${(product?.raw_data as any)?.description ?? (product?.description ?? "No description")}
User suggestions: ${descRewrite.suggestions}

Requirements:
- 3-4 sentences max
- B2B wholesale tone for retail buyers
- Highlight retailer benefits: margin opportunity, customer appeal, display potential
- Include materials, dimensions, or key features if inferable
- SEO optimized keywords for Faire search
- Professional, not salesy or clickbait
- No emojis

Return ONLY the new description.`
    const result = await generateText(prompt)
    setDescRewrite({mode: "result", suggestions: descRewrite.suggestions, result: result.trim()})
  }

  if (loading) return <LoadingSkeleton />

  if (notFound || !product) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-lg font-medium">Product not found</p>
          <Link href="/catalog/listings" className="text-sm text-primary hover:underline mt-2 inline-block">
            &larr; Back to Catalog
          </Link>
        </div>
      </div>
    )
  }

  const raw = product.raw_data as Record<string, unknown> | null
  const images: RawImage[] = (raw?.images as RawImage[]) || []
  const variants: RawVariant[] = (raw?.variants as RawVariant[]) || []
  const description = (raw?.description as string) || product.description || ""
  const store = stores.find((s) => s.id === product.store_id)
  const lifecycleState = product.lifecycle_state as LifecycleState
  const margin = calcMargin(product.wholesale_price_cents, product.retail_price_cents)
  const activeImage = images[activeImageIdx] || null

  // Variant pagination
  const totalVariantPages = Math.max(1, Math.ceil(variants.length / VARIANTS_PAGE_SIZE))
  const paginatedVariants = variants.slice((variantPage - 1) * VARIANTS_PAGE_SIZE, variantPage * VARIANTS_PAGE_SIZE)

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-4">
      {/* ---- A. Header with actions ---- */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/catalog/listings" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
            <ArrowLeft className="size-3" /> Catalog
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold font-heading leading-tight">{product.name}</h1>
          </div>
          {/* AI Title Rewrite */}
          {isGeminiConfigured() && (
            <div className="mt-1.5">
              {titleRewrite.mode === "idle" && (
                <button onClick={() => setTitleRewrite({...titleRewrite, mode: "suggest"})} className="flex items-center gap-1.5 text-xs text-primary hover:underline"><Sparkles className="size-3" /> Rewrite title with AI</button>
              )}
              {titleRewrite.mode === "suggest" && (
                <div className="mt-1.5 rounded-md border bg-card p-3 space-y-2 max-w-lg">
                  <p className="text-xs font-medium text-muted-foreground">Suggestions for the AI? (optional)</p>
                  <input value={titleRewrite.suggestions} onChange={(e) => setTitleRewrite({...titleRewrite, suggestions: e.target.value})} placeholder="e.g., emphasize eco-friendly, mention quantity..." className="h-8 w-full rounded-md border px-3 text-sm" />
                  <div className="flex gap-2">
                    <button onClick={rewriteTitle} className="h-7 px-3 rounded-md bg-primary text-white text-xs font-medium flex items-center gap-1"><Wand2 className="size-3" /> Generate</button>
                    <button onClick={() => setTitleRewrite({mode: "idle", suggestions: "", result: ""})} className="h-7 px-3 rounded-md border text-xs">Cancel</button>
                  </div>
                </div>
              )}
              {titleRewrite.mode === "loading" && (<div className="mt-1.5 h-10 rounded-md bg-muted animate-pulse flex items-center justify-center max-w-lg"><Loader2 className="size-4 text-muted-foreground animate-spin" /></div>)}
              {titleRewrite.mode === "result" && (
                <div className="mt-1.5 rounded-md border bg-emerald-50 p-3 space-y-2 max-w-lg">
                  <p className="text-xs font-medium text-emerald-700">AI Suggestion ({titleRewrite.result.length}/60 chars)</p>
                  <p className="text-sm font-medium">{titleRewrite.result}</p>
                  <div className="flex gap-2">
                    <button onClick={() => setTitleRewrite({mode: "suggest", suggestions: titleRewrite.suggestions, result: ""})} className="h-7 px-3 rounded-md border text-xs flex items-center gap-1"><Wand2 className="size-3" /> Regenerate</button>
                    <button onClick={() => navigator.clipboard.writeText(titleRewrite.result)} className="h-7 px-3 rounded-md bg-primary text-white text-xs font-medium">Copy</button>
                    <button onClick={() => setTitleRewrite({mode: "idle", suggestions: "", result: ""})} className="h-7 px-3 rounded-md border text-xs">Dismiss</button>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className={`border-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[lifecycleState] ?? STATUS_BADGE.DRAFT}`}>
              {STATUS_LABEL[lifecycleState] ?? product.lifecycle_state}
            </span>
            {product.sale_state && (
              <span className={`border-0 text-xs font-medium px-2 py-0.5 rounded-full ${SALE_STATE_BADGE[product.sale_state] ?? "bg-zinc-100 text-zinc-600"}`}>
                {product.sale_state.replace(/_/g, " ")}
              </span>
            )}
            {store && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: store.color }} />
                {store.name}
              </span>
            )}
          </div>
          {(product.category || product.made_in_country) && (
            <div className="flex items-center gap-2 mt-1">
              {product.category && (
                <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {(() => { try { const p = JSON.parse(product.category); return p?.name ?? product.category } catch { return product.category } })()}
                </span>
              )}
              {product.made_in_country && (
                <span className="text-xs text-muted-foreground">Made in {product.made_in_country}</span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 mr-2">
            <Link
              href={adjacentIds.prev ? `/catalog/listings/${adjacentIds.prev}` : "#"}
              className={`h-8 w-8 flex items-center justify-center rounded-md border transition-colors ${adjacentIds.prev ? "hover:bg-muted" : "opacity-30 pointer-events-none"}`}
              title="Previous product"
            >
              <ChevronLeft className="size-4" />
            </Link>
            <Link
              href={adjacentIds.next ? `/catalog/listings/${adjacentIds.next}` : "#"}
              className={`h-8 w-8 flex items-center justify-center rounded-md border transition-colors ${adjacentIds.next ? "hover:bg-muted" : "opacity-30 pointer-events-none"}`}
              title="Next product"
            >
              <ChevronRight className="size-4" />
            </Link>
          </div>
          <a
            href={`https://www.faire.com/product/${product.faire_product_id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm" className="h-8 text-xs">
              <ExternalLink className="size-3 mr-1.5" />
              View on Faire
            </Button>
          </a>
          <Link href="/catalog/image-studio">
            <Button variant="outline" size="sm" className="h-8 text-xs">
              <ImageIcon className="size-3 mr-1.5" />
              Edit in Image Studio
            </Button>
          </Link>
          <Button size="sm" className="h-8 text-xs">
            <RefreshCw className="size-3 mr-1.5" />
            Sync Product
          </Button>
        </div>
      </div>

      {/* ---- Main grid ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-4">
          {/* B. Image Gallery Card */}
          <div className="rounded-md border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center gap-2">
              <ImageIcon className="size-3.5 text-muted-foreground" />
              <span className="text-sm font-semibold">Images ({images.length})</span>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-center">
                {activeImage ? (
                  <img
                    src={activeImage.url}
                    alt={product.name}
                    className="max-h-[320px] w-auto mx-auto rounded-md object-contain bg-muted"
                  />
                ) : product.primary_image_url ? (
                  <img
                    src={product.primary_image_url}
                    alt={product.name}
                    className="max-h-[320px] w-auto mx-auto rounded-md object-contain bg-muted"
                  />
                ) : (
                  <div className="w-full max-h-[320px] aspect-square rounded-md bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                    <Package className="size-12 text-muted-foreground/40" />
                  </div>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImageIdx(i)}
                      className={`shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors ${i === activeImageIdx ? "border-primary" : "border-transparent hover:border-muted-foreground/30"}`}
                    >
                      <img src={img.url} alt={`${product.name} ${i + 1}`} className="w-full h-full object-cover bg-muted" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* C. Description Card */}
          {description && (
            <div className="rounded-md border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <span className="text-sm font-semibold">Description</span>
                {isGeminiConfigured() && descRewrite.mode === "idle" && (
                  <button onClick={() => setDescRewrite({...descRewrite, mode: "suggest"})} className="flex items-center gap-1.5 text-xs text-primary hover:underline"><Sparkles className="size-3" /> Rewrite</button>
                )}
              </div>
              <div className="p-4">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{description}</p>
                {descRewrite.mode === "suggest" && (
                  <div className="mt-3 rounded-md border p-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Suggestions for the AI?</p>
                    <input value={descRewrite.suggestions} onChange={(e) => setDescRewrite({...descRewrite, suggestions: e.target.value})} placeholder="e.g., focus on home decor appeal..." className="h-8 w-full rounded-md border px-3 text-sm" />
                    <div className="flex gap-2">
                      <button onClick={rewriteDescription} className="h-7 px-3 rounded-md bg-primary text-white text-xs font-medium flex items-center gap-1"><Wand2 className="size-3" /> Generate</button>
                      <button onClick={() => setDescRewrite({mode: "idle", suggestions: "", result: ""})} className="h-7 px-3 rounded-md border text-xs">Cancel</button>
                    </div>
                  </div>
                )}
                {descRewrite.mode === "loading" && (<div className="mt-3 h-20 rounded-md bg-muted animate-pulse flex items-center justify-center"><Loader2 className="size-4 text-muted-foreground animate-spin" /></div>)}
                {descRewrite.mode === "result" && (
                  <div className="mt-3 rounded-md border bg-emerald-50 p-3 space-y-2">
                    <p className="text-xs font-medium text-emerald-700">AI Suggestion</p>
                    <p className="text-sm">{descRewrite.result}</p>
                    <div className="flex gap-2">
                      <button onClick={() => setDescRewrite({mode: "suggest", suggestions: descRewrite.suggestions, result: ""})} className="h-7 px-3 rounded-md border text-xs flex items-center gap-1"><Wand2 className="size-3" /> Regenerate</button>
                      <button onClick={() => navigator.clipboard.writeText(descRewrite.result)} className="h-7 px-3 rounded-md bg-primary text-white text-xs font-medium">Copy</button>
                      <button onClick={() => setDescRewrite({mode: "idle", suggestions: "", result: ""})} className="h-7 px-3 rounded-md border text-xs">Dismiss</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* D. Variants Table Card */}
          {variants.length > 0 && (
            <div className="rounded-md border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b">
                <span className="text-sm font-semibold">Variants ({variants.length})</span>
              </div>
              <div className="overflow-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-4 py-3.5 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Variant</th>
                      <th className="px-4 py-3.5 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">SKU</th>
                      <th className="px-4 py-3.5 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right cursor-pointer select-none" onClick={() => toggleSort("price")}><span className="flex items-center justify-end">WS Price <SortIcon col="price" /></span></th>
                      <th className="px-4 py-3.5 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right">Retail</th>
                      <th className="px-4 py-3.5 text-xs font-medium text-muted-foreground tracking-wide uppercase text-center cursor-pointer select-none" onClick={() => toggleSort("inventory")}><span className="flex items-center justify-center">Inventory <SortIcon col="inventory" /></span></th>
                      <th className="px-4 py-3.5 text-xs font-medium text-muted-foreground tracking-wide uppercase text-center">State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...paginatedVariants].sort((a, b) => {
                      const dir = sortDir === "asc" ? 1 : -1
                      if (sortKey === "price") return ((a.wholesale_price_cents ?? 0) - (b.wholesale_price_cents ?? 0)) * dir
                      if (sortKey === "inventory") return ((a.available_quantity ?? 0) - (b.available_quantity ?? 0)) * dir
                      return 0
                    }).map((v, i) => {
                      const vWs = v.wholesale_price_cents ? v.wholesale_price_cents / 100 : null
                      const vRetail = v.retail_price_cents ? v.retail_price_cents / 100 : null
                      const optionsStr = v.options?.map((o) => `${o.name}: ${o.value}`).join(", ") || ""
                      const variantState = v.sale_state || (v.active === false ? "INACTIVE" : "ACTIVE")
                      const stateClass = variantState === "FOR_SALE" || variantState === "ACTIVE"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-zinc-100 text-zinc-600"
                      const realIdx = (variantPage - 1) * VARIANTS_PAGE_SIZE + i

                      return (
                        <tr key={v.id || realIdx} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3.5 text-sm">
                            <span className="font-medium">{v.name || `Variant ${realIdx + 1}`}</span>
                            {optionsStr && <p className="text-xs text-muted-foreground mt-0.5">{optionsStr}</p>}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-muted-foreground text-xs">{v.sku || "\u2014"}</td>
                          <td className="px-4 py-3.5 text-sm text-right font-medium">{vWs !== null ? `$${vWs.toFixed(2)}` : "\u2014"}</td>
                          <td className="px-4 py-3.5 text-sm text-right text-muted-foreground">{vRetail !== null ? `$${vRetail.toFixed(2)}` : "\u2014"}</td>
                          <td className="px-4 py-3.5 text-sm text-center">
                            <span className={`font-medium ${v.available_quantity === 0 ? "text-red-600" : ""}`}>
                              {v.available_quantity ?? "\u2014"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-center">
                            <span className={`border-0 text-xs font-medium px-2 py-0.5 rounded-full ${stateClass}`}>
                              {variantState.replace(/_/g, " ")}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {/* Variants pagination footer */}
              {variants.length > VARIANTS_PAGE_SIZE && (
                <div className="border-t px-4 py-3 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Showing {(variantPage - 1) * VARIANTS_PAGE_SIZE + 1}&ndash;{Math.min(variantPage * VARIANTS_PAGE_SIZE, variants.length)} of {variants.length} variants
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setVariantPage(Math.max(1, variantPage - 1))}
                      disabled={variantPage <= 1}
                      className="h-7 w-7 flex items-center justify-center rounded-md border text-sm disabled:opacity-30 hover:bg-muted transition-colors"
                    >
                      <ArrowLeft className="size-3.5" />
                    </button>
                    {Array.from({ length: totalVariantPages }).map((_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => setVariantPage(i + 1)}
                        className={`h-7 w-7 flex items-center justify-center rounded-md text-xs font-medium transition-colors ${
                          variantPage === i + 1 ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setVariantPage(Math.min(totalVariantPages, variantPage + 1))}
                      disabled={variantPage >= totalVariantPages}
                      className="h-7 w-7 flex items-center justify-center rounded-md border text-sm disabled:opacity-30 hover:bg-muted transition-colors"
                    >
                      <ArrowLeft className="size-3.5 rotate-180" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4">
          {/* E. Pricing Card */}
          <div className="rounded-md border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b"><span className="text-sm font-semibold">Pricing</span></div>
            <div className="p-4 space-y-0">
              <div className="py-1.5 flex justify-between">
                <span className="text-sm text-muted-foreground">WS Price</span>
                <span className="text-sm font-medium">${formatCents(product.wholesale_price_cents)}</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-sm text-muted-foreground">Retail Price</span>
                <span className="text-sm font-medium">${formatCents(product.retail_price_cents)}</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-sm text-muted-foreground">Margin</span>
                <span className={`text-sm font-medium ${margin >= 50 ? "text-emerald-600" : margin >= 40 ? "text-foreground" : "text-amber-600"}`}>
                  {margin}%
                </span>
              </div>
              {product.minimum_order_quantity > 0 && (
                <div className="py-1.5 flex justify-between">
                  <span className="text-sm text-muted-foreground">MOQ</span>
                  <span className="text-sm font-medium">{product.minimum_order_quantity}</span>
                </div>
              )}
            </div>
          </div>

          {/* F. Inventory Card */}
          <div className="rounded-md border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b"><span className="text-sm font-semibold">Inventory</span></div>
            <div className="p-4 space-y-0">
              <div className="py-1.5 flex justify-between">
                <span className="text-sm text-muted-foreground">Total Inventory</span>
                <span className={`text-sm font-medium ${product.total_inventory === 0 ? "text-red-600" : ""}`}>
                  {product.total_inventory}
                </span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-sm text-muted-foreground">Variants</span>
                <span className="text-sm font-medium">{product.variant_count}</span>
              </div>
              {variants.length > 0 && (
                <>
                  <div className="border-t my-1.5" />
                  <p className="text-xs font-medium text-muted-foreground py-1">Per variant</p>
                  {variants.map((v, i) => (
                    <div key={v.id || i} className="py-1 flex justify-between">
                      <span className="text-xs text-muted-foreground truncate max-w-[60%]">{v.name || v.sku || `Variant ${i + 1}`}</span>
                      <span className={`text-xs font-medium ${v.available_quantity === 0 ? "text-red-600" : ""}`}>
                        {v.available_quantity ?? "\u2014"}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* G. Store Card */}
          <div className="rounded-md border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b"><span className="text-sm font-semibold">Brand</span></div>
            <div className="p-4 space-y-2">
              {store ? (
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: store.color }}>
                    {store.short}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{store.name}</p>
                    <p className="text-xs text-muted-foreground">{store.category}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{"\u2014"}</p>
              )}
              <div className="py-1.5 flex justify-between">
                <span className="text-xs text-muted-foreground">Product ID</span>
                <span className="text-xs text-muted-foreground truncate max-w-[60%]" title={product.faire_product_id}>
                  {product.faire_product_id.length > 20
                    ? product.faire_product_id.slice(0, 20) + "\u2026"
                    : product.faire_product_id}
                </span>
              </div>
            </div>
          </div>

          {/* H. Tags Card */}
          {product.tags && product.tags.length > 0 && (
            <div className="rounded-md border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center gap-2">
                <Tag className="size-3.5 text-muted-foreground" />
                <span className="text-sm font-semibold">Tags</span>
              </div>
              <div className="p-4 flex flex-wrap gap-1.5">
                {product.tags.map((tag) => (
                  <span key={tag} className="border-0 text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating action buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-40">
        <button className="h-10 w-10 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:bg-primary/90" title="Sync">
          <RefreshCw className="size-4" />
        </button>
        <button className="h-10 w-10 rounded-full bg-card border shadow-lg flex items-center justify-center hover:bg-muted" title="Share">
          <Share2 className="size-4" />
        </button>
      </div>
    </div>
  )
}
