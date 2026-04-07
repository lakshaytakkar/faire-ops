"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useBrandFilter } from "@/lib/brand-filter-context"
import { useProducts } from "@/lib/use-faire-data"
import {
  uploadImage,
  saveProductImage,
  getProductImages,
  getStoreAssets,
  fileToBase64,
} from "@/lib/image-service"
import {
  analyzeProductImage,
  optimizeProductImagePrompt,
  generateCollectionThumbnailPrompt,
  generateLogoPrompt,
  generateBannerPrompt,
  generateImage,
  isGeminiConfigured,
} from "@/lib/gemini"

type TabId = "optimizer" | "collection" | "logo" | "banner"

const TABS: { id: TabId; label: string }[] = [
  { id: "optimizer", label: "Product Optimizer" },
  { id: "collection", label: "Collection Thumbnail" },
  { id: "logo", label: "Store Logo" },
  { id: "banner", label: "Store Banner" },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ImageStudioPage() {
  const { stores, activeBrand } = useBrandFilter()
  const [activeTab, setActiveTab] = useState<TabId>("optimizer")

  return (
    <div className="space-y-4 max-w-[1440px] mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-heading">Image Studio</h1>
        {isGeminiConfigured() ? (
          <span className="text-xs text-emerald-600 flex items-center gap-1">
            <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            AI Connected
          </span>
        ) : (
          <span className="text-xs text-amber-600 flex items-center gap-1">
            <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86l-8.6 14.86A1 1 0 002.54 20h18.92a1 1 0 00.85-1.28l-8.6-14.86a1 1 0 00-1.72 0z" /></svg>
            API Key Missing
          </span>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex items-center border-b mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-primary text-primary font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "optimizer" && <ProductOptimizerTab stores={stores} activeBrand={activeBrand} />}
      {activeTab === "collection" && <CollectionThumbnailTab stores={stores} activeBrand={activeBrand} />}
      {activeTab === "logo" && <LogoCreatorTab stores={stores} activeBrand={activeBrand} />}
      {activeTab === "banner" && <BannerCreatorTab stores={stores} activeBrand={activeBrand} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 1 — Product Image Optimizer
// ---------------------------------------------------------------------------

function ProductOptimizerTab({ stores, activeBrand }: { stores: any[]; activeBrand: string }) {
  const storeId = activeBrand !== "all" ? activeBrand : undefined
  const { products, loading: productsLoading } = useProducts(storeId, 5000)
  const displayProducts = products.slice(0, 100)

  const [selectedProductId, setSelectedProductId] = useState("")
  const [selectedImageIdx, setSelectedImageIdx] = useState<number | null>(null)
  const [optimizing, setOptimizing] = useState(false)
  const [optimizingAll, setOptimizingAll] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<{base64: string, mimeType: string} | null | undefined>(undefined)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const selectedProduct = products.find((p) => p.id === selectedProductId)

  const faireImages: string[] =
    selectedProduct?.raw_data?.images
      ? (selectedProduct.raw_data.images as any[]).map((img: any) => img.url ?? img)
      : []

  // reset when product changes
  useEffect(() => {
    setSelectedImageIdx(null)
    setResult(null)
    setGeneratedImage(undefined)
  }, [selectedProductId])

  const analyzeImage = useCallback(
    async (url: string, name: string, category: string) => {
      try {
        const resp = await fetch(url)
        const blob = await resp.blob()
        const file = new File([blob], "image.jpg", { type: blob.type })
        const base64 = await fileToBase64(file)
        const mime = blob.type || "image/jpeg"

        // Get optimization prompt first, then analyze actual image
        const promptResult = await optimizeProductImagePrompt(name, category)
        const analysisResult = await analyzeProductImage(base64, mime, name)
        return `--- Optimization Prompt ---\n${promptResult}\n\n--- Image Analysis ---\n${analysisResult}`
      } catch {
        return "[Error analyzing image]"
      }
    },
    []
  )

  const handleOptimizeSelected = useCallback(async () => {
    if (selectedImageIdx === null || !selectedProduct) return
    setOptimizing(true)
    setResult(null)
    const url = faireImages[selectedImageIdx]
    const res = await analyzeImage(url, selectedProduct.name, selectedProduct.category ?? "General")
    setResult(res)
    setOptimizing(false)
  }, [selectedImageIdx, selectedProduct, faireImages, analyzeImage])

  const handleOptimizeAll = useCallback(async () => {
    if (!selectedProduct || faireImages.length === 0) return
    setOptimizingAll(true)
    setResult(null)
    const results: string[] = []
    for (let i = 0; i < faireImages.length; i++) {
      results.push(`\n=== Image ${i + 1} ===`)
      const res = await analyzeImage(faireImages[i], selectedProduct.name, selectedProduct.category ?? "General")
      results.push(res)
    }
    setResult(results.join("\n"))
    setOptimizingAll(false)
  }, [selectedProduct, faireImages, analyzeImage])

  const handleUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || !selectedProduct) return
      setUploading(true)
      for (const file of Array.from(files)) {
        const res = await uploadImage(file, `products/${selectedProductId}`)
        if (res) {
          await saveProductImage({
            faireProductId: selectedProductId,
            storeId: selectedProduct.store_id,
            storagePath: res.path,
            publicUrl: res.publicUrl,
            imageType: "product",
            fileName: file.name,
            fileSizeBytes: file.size,
          })
        }
      }
      setUploading(false)
    },
    [selectedProductId, selectedProduct]
  )

  return (
    <div className="space-y-4">
      {/* Product selector */}
      <div className="rounded-md border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b text-sm font-semibold">Select Product</div>
        <div className="p-4">
          {productsLoading ? (
            <div className="h-10 rounded-md bg-muted animate-pulse" />
          ) : (
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Choose a product...</option>
              {displayProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Image grid */}
      {selectedProduct && faireImages.length > 0 && (
        <div className="rounded-md border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b text-sm font-semibold flex items-center justify-between">
            <span>Listing Images</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {faireImages.length}
            </span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {faireImages.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setSelectedImageIdx(i)
                    setResult(null)
                  }}
                  className={`rounded-md overflow-hidden aspect-square cursor-pointer transition-all ${
                    selectedImageIdx === i
                      ? "ring-2 ring-blue-500"
                      : "hover:ring-2 hover:ring-primary/50"
                  }`}
                >
                  <img
                    src={url}
                    alt={`Image ${i + 1}`}
                    loading="lazy"
                    className="w-full h-full rounded-md object-cover bg-muted"
                  />
                </button>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 mt-4">
              <button
                type="button"
                onClick={handleOptimizeSelected}
                disabled={selectedImageIdx === null || optimizing || !isGeminiConfigured()}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {optimizing ? "Analyzing..." : "Optimize Selected"}
              </button>
              <button
                type="button"
                onClick={handleOptimizeAll}
                disabled={optimizingAll || !isGeminiConfigured()}
                className="inline-flex items-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors"
              >
                {optimizingAll ? "Processing..." : "Optimize All"}
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors ml-auto"
              >
                {uploading ? "Uploading..." : "Upload New"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => {
                  handleUpload(e.target.files)
                  e.target.value = ""
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Loading shimmer */}
      {(optimizing || optimizingAll) && (
        <div className="rounded-md border bg-card p-4 space-y-2">
          <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
          <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
          <div className="h-4 w-5/6 rounded bg-muted animate-pulse" />
          <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
        </div>
      )}

      {/* Result */}
      {result && !optimizing && !optimizingAll && (
        <div className="rounded-md border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b text-sm font-semibold">AI Optimization Results</div>
          <div className="p-4 text-sm whitespace-pre-line text-foreground leading-relaxed">
            {result}
          </div>

          {/* Generate Optimized Image */}
          <div className="px-4 pb-4 space-y-3">
            {generatedImage === undefined && !generating && (
              <button
                type="button"
                onClick={async () => {
                  setGenerating(true)
                  setGeneratedImage(null)
                  const promptMatch = result.match(/--- Optimization Prompt ---\n([\s\S]*?)\n\n--- Image Analysis ---/)
                  const optimizationPrompt = promptMatch ? promptMatch[1].trim() : result
                  const img = await generateImage(optimizationPrompt)
                  setGeneratedImage(img)
                  setGenerating(false)
                }}
                disabled={!isGeminiConfigured()}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                Generate Optimized Image
              </button>
            )}

            {generating && (
              <div className="h-48 rounded-md bg-muted animate-pulse" />
            )}

            {!generating && generatedImage != null && (
              <div className="space-y-3">
                <img
                  src={"data:" + generatedImage.mimeType + ";base64," + generatedImage.base64}
                  className="w-full max-h-[300px] object-contain rounded-md border"
                  alt="AI generated optimized product image"
                />
                <button
                  type="button"
                  disabled={saving || !selectedProduct}
                  onClick={async () => {
                    if (!selectedProduct) return
                    setSaving(true)
                    try {
                      const byteString = atob(generatedImage.base64)
                      const ab = new ArrayBuffer(byteString.length)
                      const ia = new Uint8Array(ab)
                      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i)
                      const blob = new Blob([ab], { type: generatedImage.mimeType })
                      const ext = generatedImage.mimeType.split("/")[1] || "png"
                      const file = new File([blob], `optimized.${ext}`, { type: generatedImage.mimeType })
                      const res = await uploadImage(file, `products/${selectedProductId}`)
                      if (res) {
                        await saveProductImage({
                          faireProductId: selectedProductId,
                          storeId: selectedProduct.store_id,
                          storagePath: res.path,
                          publicUrl: res.publicUrl,
                          imageType: "product",
                          fileName: file.name,
                          fileSizeBytes: file.size,
                        })
                      }
                    } catch {
                      // upload failed silently
                    }
                    setSaving(false)
                  }}
                  className="inline-flex items-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors"
                >
                  {saving ? "Saving..." : "Save to Storage"}
                </button>
              </div>
            )}

            {!generating && generatedImage === null && (
              <p className="text-sm text-muted-foreground">Image generation not available — use the prompt above with Midjourney or DALL-E</p>
            )}
          </div>
        </div>
      )}

      {selectedProduct && faireImages.length === 0 && (
        <div className="rounded-md border bg-card p-6 text-center text-sm text-muted-foreground">
          No images found for this product.
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 2 — Collection Thumbnail Creator
// ---------------------------------------------------------------------------

function CollectionThumbnailTab({ stores, activeBrand }: { stores: any[]; activeBrand: string }) {
  const [storeId, setStoreId] = useState(activeBrand !== "all" ? activeBrand : stores[0]?.id ?? "")
  const [title, setTitle] = useState("")
  const [subject, setSubject] = useState("")
  const [background, setBackground] = useState("White")
  const [includeText, setIncludeText] = useState(true)
  const [style, setStyle] = useState("Clean & Modern")
  const [generating, setGenerating] = useState(false)
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [savedAssets, setSavedAssets] = useState<any[]>([])

  // auto-select store
  useEffect(() => {
    if (!storeId && stores.length > 0) setStoreId(stores[0].id)
  }, [stores, storeId])

  // load saved thumbnails
  useEffect(() => {
    if (!storeId) return
    getStoreAssets(storeId, "collection_thumb").then(setSavedAssets)
  }, [storeId])

  const handleGenerate = useCallback(async () => {
    if (!title.trim()) return
    setGenerating(true)
    setGeneratedPrompt(null)
    const prompt = await generateCollectionThumbnailPrompt({
      title,
      subject,
      background,
      includeText,
      style,
    })
    setGeneratedPrompt(prompt)
    setGenerating(false)
  }, [title, subject, background, includeText, style])

  const handleCopy = useCallback(() => {
    if (!generatedPrompt) return
    navigator.clipboard.writeText(generatedPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [generatedPrompt])

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b text-sm font-semibold">Create Collection Thumbnail</div>
        <div className="p-4 space-y-4">
          {/* Store */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Store</label>
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Spring Collection 2026"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Subject Description</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Colorful home decor items, vases, candles"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Background + Style row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Background</label>
              <select
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {["White", "Gradient", "Lifestyle Scene", "Solid Color", "Pattern"].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Style</label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {["Clean & Modern", "Warm & Cozy", "Bold & Vibrant", "Minimal"].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Include text */}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={includeText}
              onChange={(e) => setIncludeText(e.target.checked)}
              className="rounded border-border"
            />
            Include title text on thumbnail
          </label>

          {/* Generate button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!title.trim() || generating || !isGeminiConfigured()}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {generating ? "Generating..." : "Generate Thumbnail Concept"}
          </button>
        </div>
      </div>

      {/* Loading */}
      {generating && (
        <div className="rounded-md border bg-card p-4 space-y-2">
          <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
          <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
          <div className="h-4 w-5/6 rounded bg-muted animate-pulse" />
        </div>
      )}

      {/* Generated prompt */}
      {generatedPrompt && !generating && (
        <div className="rounded-md border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b text-sm font-semibold flex items-center justify-between">
            <span>Generated Prompt</span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-xs font-medium px-2 py-1 rounded-md border hover:bg-muted transition-colors"
            >
              {copied ? "Copied!" : "Copy Prompt"}
            </button>
          </div>
          <div className="p-4 text-sm whitespace-pre-line text-foreground leading-relaxed">
            {generatedPrompt}
          </div>
          <div className="px-4 py-3 border-t text-xs text-muted-foreground">
            Use this prompt with Midjourney, DALL-E, or any image generation tool to create your thumbnail.
          </div>
        </div>
      )}

      {/* Saved thumbnails */}
      {savedAssets.length > 0 && (
        <div className="rounded-md border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b text-sm font-semibold flex items-center justify-between">
            <span>Saved Thumbnails</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {savedAssets.length}
            </span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {savedAssets.map((a: any) => (
                <div key={a.id} className="rounded-md overflow-hidden aspect-square bg-muted">
                  <img src={a.public_url} alt={a.file_name} loading="lazy" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 3 — Store Logo Creator
// ---------------------------------------------------------------------------

const LOGO_TYPES = [
  { id: "text-only", label: "Text Only", desc: "Brand name styled" },
  { id: "icon-text", label: "Icon + Text", desc: "Symbol with name" },
  { id: "mascot", label: "Mascot", desc: "Character-based" },
  { id: "badge", label: "Badge/Emblem", desc: "Circular or shield" },
] as const

function LogoCreatorTab({ stores, activeBrand }: { stores: any[]; activeBrand: string }) {
  const [storeId, setStoreId] = useState(activeBrand !== "all" ? activeBrand : stores[0]?.id ?? "")
  const [logoType, setLogoType] = useState<string>("")
  const [brandName, setBrandName] = useState("")
  const [colorScheme, setColorScheme] = useState("")
  const [logoStyle, setLogoStyle] = useState("Modern")
  const [notes, setNotes] = useState("")
  const [generating, setGenerating] = useState(false)
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [savedAssets, setSavedAssets] = useState<any[]>([])

  const selectedStore = stores.find((s) => s.id === storeId)

  // auto-select store
  useEffect(() => {
    if (!storeId && stores.length > 0) setStoreId(stores[0].id)
  }, [stores, storeId])

  // pre-fill brand name from store
  useEffect(() => {
    if (selectedStore) {
      setBrandName(selectedStore.name ?? "")
      // use brand_primary_color if available
      const raw = selectedStore as any
      if (raw.brand_primary_color) setColorScheme(raw.brand_primary_color)
    }
  }, [selectedStore])

  // load saved logos
  useEffect(() => {
    if (!storeId) return
    getStoreAssets(storeId, "logo").then(setSavedAssets)
  }, [storeId])

  const handleGenerate = useCallback(async () => {
    if (!logoType || !brandName.trim()) return
    setGenerating(true)
    setGeneratedPrompt(null)
    const prompt = await generateLogoPrompt({
      brandName,
      logoType,
      colorScheme: colorScheme || "brand default",
      style: logoStyle,
      additionalNotes: notes || undefined,
    })
    setGeneratedPrompt(prompt)
    setGenerating(false)
  }, [logoType, brandName, colorScheme, logoStyle, notes])

  const handleCopy = useCallback(() => {
    if (!generatedPrompt) return
    navigator.clipboard.writeText(generatedPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [generatedPrompt])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left — form */}
      <div className="lg:col-span-2 space-y-4">
        {/* Store selector */}
        <div className="rounded-md border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b text-sm font-semibold">Store</div>
          <div className="p-4">
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Step 1 — Logo type */}
        <div className="rounded-md border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b text-sm font-semibold">Step 1 — Logo Type</div>
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {LOGO_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setLogoType(t.id)}
                  className={`rounded-md border p-3 text-left transition-all ${
                    logoType === t.id
                      ? "ring-2 ring-blue-500 border-blue-500 bg-blue-50 dark:bg-blue-950"
                      : "hover:border-primary/50"
                  }`}
                >
                  <div className="text-sm font-medium">{t.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Step 2 — Details (shown after type selected) */}
        {logoType && (
          <div className="rounded-md border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b text-sm font-semibold">Step 2 — Details</div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Brand Name</label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Color Scheme</label>
                  <input
                    type="text"
                    value={colorScheme}
                    onChange={(e) => setColorScheme(e.target.value)}
                    placeholder="#4F46E5 or 'Navy and Gold'"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Style</label>
                  <select
                    value={logoStyle}
                    onChange={(e) => setLogoStyle(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {["Modern", "Vintage", "Playful", "Minimal", "Luxury", "Handcrafted"].map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Additional Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Optional: any specific preferences..."
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>

              {/* Step 3 — Generate */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!brandName.trim() || generating || !isGeminiConfigured()}
                className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {generating ? "Generating..." : "Generate Logo Concept"}
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {generating && (
          <div className="rounded-md border bg-card p-4 space-y-2">
            <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
            <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
          </div>
        )}

        {/* Generated prompt */}
        {generatedPrompt && !generating && (
          <div className="rounded-md border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b text-sm font-semibold flex items-center justify-between">
              <span>Logo Concept</span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs font-medium px-2 py-1 rounded-md border hover:bg-muted transition-colors"
              >
                {copied ? "Copied!" : "Copy Prompt"}
              </button>
            </div>
            <div className="p-4 text-sm whitespace-pre-line text-foreground leading-relaxed">
              {generatedPrompt}
            </div>
            <div className="px-4 py-3 border-t text-xs text-muted-foreground">
              Use this prompt with Midjourney, DALL-E, or any image generation tool.
            </div>
          </div>
        )}
      </div>

      {/* Right — current logo + history */}
      <div className="space-y-4">
        {savedAssets.length > 0 && (
          <div className="rounded-md border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b text-sm font-semibold">Current Logo</div>
            <div className="p-4 flex flex-col items-center gap-3">
              <img
                src={savedAssets[0].public_url}
                alt="Store logo"
                loading="lazy"
                className="w-32 h-32 rounded-md object-cover bg-muted"
              />
              <span className="text-xs text-muted-foreground">{savedAssets[0].file_name}</span>
            </div>
          </div>
        )}

        {savedAssets.length > 1 && (
          <div className="rounded-md border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b text-sm font-semibold">Logo History</div>
            <div className="p-4">
              <div className="grid grid-cols-3 gap-2">
                {savedAssets.slice(1).map((a: any) => (
                  <div key={a.id} className="rounded-md overflow-hidden aspect-square bg-muted">
                    <img src={a.public_url} alt={a.file_name} loading="lazy" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {savedAssets.length === 0 && storeId && (
          <div className="rounded-md border bg-card p-6 text-center text-sm text-muted-foreground">
            No logos saved yet for this store.
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 4 — Store Banner Creator
// ---------------------------------------------------------------------------

function BannerCreatorTab({ stores, activeBrand }: { stores: any[]; activeBrand: string }) {
  const [storeId, setStoreId] = useState(activeBrand !== "all" ? activeBrand : stores[0]?.id ?? "")
  const storeIdForProducts = storeId || undefined
  const { products } = useProducts(storeIdForProducts, 5000)
  const displayProducts = products.slice(0, 20)

  const [message, setMessage] = useState("")
  const [occasion, setOccasion] = useState("None")
  const [bannerStyle, setBannerStyle] = useState("Clean & Bright")
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set())
  const [generating, setGenerating] = useState(false)
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [savedAssets, setSavedAssets] = useState<any[]>([])

  const selectedStore = stores.find((s) => s.id === storeId)

  // auto-select store
  useEffect(() => {
    if (!storeId && stores.length > 0) setStoreId(stores[0].id)
  }, [stores, storeId])

  // load saved banners
  useEffect(() => {
    if (!storeId) return
    getStoreAssets(storeId, "banner").then(setSavedAssets)
  }, [storeId])

  // reset product selection on store change
  useEffect(() => {
    setSelectedProductIds(new Set())
  }, [storeId])

  const toggleProduct = useCallback((id: string) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < 4) next.add(id)
      return next
    })
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!message.trim() || !selectedStore) return
    setGenerating(true)
    setGeneratedPrompt(null)
    const featuredNames = products
      .filter((p) => selectedProductIds.has(p.id))
      .map((p) => p.name)
    const prompt = await generateBannerPrompt({
      storeName: selectedStore.name,
      message,
      occasion,
      style: bannerStyle,
      productNames: featuredNames.length > 0 ? featuredNames : undefined,
    })
    setGeneratedPrompt(prompt)
    setGenerating(false)
  }, [message, selectedStore, occasion, bannerStyle, products, selectedProductIds])

  const handleCopy = useCallback(() => {
    if (!generatedPrompt) return
    navigator.clipboard.writeText(generatedPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [generatedPrompt])

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b text-sm font-semibold">Create Store Banner</div>
        <div className="p-4 space-y-4">
          {/* Store */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Store</label>
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Central Message / Tagline</label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Spring Sale -- 20% Off New Arrivals"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Occasion + Style row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Occasion / Event</label>
              <select
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {["None", "Spring Sale", "Summer Collection", "Halloween", "Christmas", "Easter", "New Year", "Custom"].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Style</label>
              <select
                value={bannerStyle}
                onChange={(e) => setBannerStyle(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {["Clean & Bright", "Dark & Bold", "Warm & Organic", "Festive", "Minimal"].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Featured products */}
          {displayProducts.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                Featured Products (select up to 4)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                {displayProducts.map((p) => (
                  <label
                    key={p.id}
                    className={`flex items-center gap-2 rounded-md border p-2 text-xs cursor-pointer transition-all ${
                      selectedProductIds.has(p.id)
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                        : "hover:border-primary/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedProductIds.has(p.id)}
                      onChange={() => toggleProduct(p.id)}
                      className="rounded border-border shrink-0"
                    />
                    <span className="truncate">{p.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Generate */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!message.trim() || generating || !isGeminiConfigured()}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {generating ? "Generating..." : "Generate Banner Concept"}
          </button>
        </div>
      </div>

      {/* Loading */}
      {generating && (
        <div className="rounded-md border bg-card p-4 space-y-2">
          <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
          <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
        </div>
      )}

      {/* Generated prompt */}
      {generatedPrompt && !generating && (
        <div className="rounded-md border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b text-sm font-semibold flex items-center justify-between">
            <span>Banner Concept</span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-xs font-medium px-2 py-1 rounded-md border hover:bg-muted transition-colors"
            >
              {copied ? "Copied!" : "Copy Prompt"}
            </button>
          </div>
          {/* Banner preview area */}
          <div className="p-4">
            <div className="aspect-[4/1] rounded-md border bg-muted flex items-center justify-center text-sm text-muted-foreground">
              Banner preview — use generated prompt below with an image tool
            </div>
          </div>
          <div className="px-4 pb-4 text-sm whitespace-pre-line text-foreground leading-relaxed">
            {generatedPrompt}
          </div>
          <div className="px-4 py-3 border-t text-xs text-muted-foreground">
            Use this prompt with Midjourney, DALL-E, or any image generation tool.
          </div>
        </div>
      )}

      {/* Saved banners */}
      {savedAssets.length > 0 && (
        <div className="rounded-md border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b text-sm font-semibold flex items-center justify-between">
            <span>Saved Banners</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {savedAssets.length}
            </span>
          </div>
          <div className="p-4 space-y-3">
            {savedAssets.map((a: any) => (
              <div key={a.id}>
                <img
                  src={a.public_url}
                  alt={a.file_name}
                  loading="lazy"
                  className="w-full aspect-[4/1] rounded-md object-cover bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">{a.file_name}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
