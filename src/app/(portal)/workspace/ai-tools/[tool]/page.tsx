"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import {
  ArrowLeft,
  Copy,
  Check,
  Loader2,
  Type,
  FileText,
  Image,
  Palette,
  Layout,
  DollarSign,
  Mail,
  Tag,
  ClipboardCheck,
  TrendingUp,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  generateListingTitle,
  generateProductDescription,
  suggestPricing,
  composeRetailerEmail,
  generateProductTags,
  auditListing,
  analyzeTrends,
  isGeminiConfigured,
} from "@/lib/gemini"

/* ------------------------------------------------------------------ */
/*  Tool metadata                                                      */
/* ------------------------------------------------------------------ */

interface ToolMeta {
  name: string
  description: string
  icon: React.ElementType
  iconBg: string
  iconColor: string
  redirect?: string
}

const TOOL_META: Record<string, ToolMeta> = {
  "title-optimizer": {
    name: "Title Optimizer",
    description: "Rewrite product titles for better SEO on Faire search",
    icon: Type,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  "description-generator": {
    name: "Description Generator",
    description: "Generate compelling B2B product descriptions for wholesale buyers",
    icon: FileText,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  "collection-thumbnail": {
    name: "Collection Thumbnail",
    description: "Create AI-generated thumbnails for product collections",
    icon: Image,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    redirect: "/catalog/image-studio?tab=collection",
  },
  "logo-generator": {
    name: "Logo Generator",
    description: "Design a unique store logo with AI image generation",
    icon: Palette,
    iconBg: "bg-pink-100",
    iconColor: "text-pink-600",
    redirect: "/catalog/image-studio?tab=logo",
  },
  "banner-creator": {
    name: "Banner Creator",
    description: "Generate promotional store banners for seasonal campaigns",
    icon: Layout,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    redirect: "/catalog/image-studio?tab=banner",
  },
  "pricing-recommender": {
    name: "Pricing Recommender",
    description: "Get wholesale and MSRP pricing suggestions based on COGS",
    icon: DollarSign,
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
  },
  "retailer-email": {
    name: "Retailer Email",
    description: "Compose personalized outreach emails for wholesale buyers",
    icon: Mail,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  "product-tags": {
    name: "Product Tags",
    description: "Generate SEO-optimized tags for better product discoverability",
    icon: Tag,
    iconBg: "bg-cyan-100",
    iconColor: "text-cyan-600",
  },
  "listing-audit": {
    name: "Listing Audit",
    description: "Score and audit your product listings for Faire best practices",
    icon: ClipboardCheck,
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
  },
  "trend-analyzer": {
    name: "Trend Analyzer",
    description: "Discover trending keywords and emerging products in your category",
    icon: TrendingUp,
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
  },
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AIToolPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.tool as string
  const meta = TOOL_META[slug]

  // Redirect for image-based tools
  useEffect(() => {
    if (meta?.redirect) {
      router.replace(meta.redirect)
    }
  }, [meta, router])

  // Form state
  const [fields, setFields] = useState<Record<string, string>>({})
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!meta) {
    return (
      <div className="space-y-6 max-w-[1440px] mx-auto w-full">
        <Link href="/workspace/ai-tools" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to AI Tools
        </Link>
        <div className="rounded-md border bg-card p-12 text-center">
          <p className="text-sm font-medium text-foreground">Tool not found</p>
          <p className="text-xs text-muted-foreground mt-1">The requested AI tool does not exist.</p>
        </div>
      </div>
    )
  }

  if (meta.redirect) {
    return (
      <div className="space-y-6 max-w-[1440px] mx-auto w-full">
        <div className="rounded-md border bg-card p-12 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Redirecting to Image Studio...</p>
        </div>
      </div>
    )
  }

  const Icon = meta.icon

  function updateField(key: string, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  async function handleGenerate() {
    setLoading(true)
    setResult(null)
    setCopied(false)

    try {
      let output = ""

      switch (slug) {
        case "title-optimizer":
          output = await generateListingTitle(
            fields.productName || "",
            fields.category || ""
          )
          break
        case "description-generator":
          output = await generateProductDescription(
            fields.productName || "",
            fields.category || "",
            parseFloat(fields.price || "0")
          )
          break
        case "pricing-recommender":
          output = await suggestPricing(
            fields.productName || "",
            parseFloat(fields.cogs || "0"),
            fields.category || ""
          )
          break
        case "retailer-email":
          output = await composeRetailerEmail(
            fields.retailerName || "",
            fields.storeName || "",
            fields.context || ""
          )
          break
        case "product-tags":
          output = await generateProductTags(
            fields.productName || "",
            fields.description || "",
            fields.category || ""
          )
          break
        case "listing-audit":
          output = await auditListing(
            fields.productName || "",
            fields.description || "",
            parseInt(fields.imageCount || "0", 10),
            parseFloat(fields.price || "0"),
            (fields.tags || "").split(",").map((t) => t.trim()).filter(Boolean)
          )
          break
        case "trend-analyzer":
          output = await analyzeTrends(fields.category || "")
          break
        default:
          output = "[Unknown tool]"
      }

      setResult(output)
    } catch {
      setResult("[Error generating content. Please try again.]")
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!result) return
    await navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-5 max-w-[1440px] mx-auto w-full">
      {/* Back link + header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/workspace/ai-tools"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${meta.iconBg}`}>
            <Icon className={`h-4.5 w-4.5 ${meta.iconColor}`} />
          </div>
          <div>
            <h1 className="text-lg font-bold font-heading text-foreground">{meta.name}</h1>
            <p className="text-xs text-muted-foreground">{meta.description}</p>
          </div>
        </div>
        {isGeminiConfigured() ? (
          <span className="text-xs text-emerald-600 flex items-center gap-1">
            <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            AI Connected
          </span>
        ) : (
          <span className="text-xs text-amber-600 flex items-center gap-1">
            <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86l-8.6 14.86A1 1 0 002.54 20h18.92a1 1 0 00.85-1.28l-8.6-14.86a1 1 0 00-1.72 0z" />
            </svg>
            API Key Missing
          </span>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Form */}
        <div className="rounded-md border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Input</h2>

          <ToolForm slug={slug} fields={fields} updateField={updateField} />

          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" data-icon="inline-start" />
                Generating...
              </>
            ) : (
              "Generate"
            )}
          </Button>
        </div>

        {/* Right: Result */}
        <div className="rounded-md border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Result</h2>
            {result && (
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" data-icon="inline-start" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" data-icon="inline-start" />
                    Copy
                  </>
                )}
              </Button>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              <div className="h-4 w-full rounded bg-muted animate-pulse" />
              <div className="h-4 w-5/6 rounded bg-muted animate-pulse" />
              <div className="h-4 w-4/6 rounded bg-muted animate-pulse" />
              <div className="h-4 w-full rounded bg-muted animate-pulse" />
              <div className="h-4 w-3/6 rounded bg-muted animate-pulse" />
            </div>
          ) : result ? (
            <div className="rounded-md border bg-muted/30 p-4">
              <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">
                {result}
              </pre>
            </div>
          ) : (
            <div className="rounded-md border border-dashed bg-muted/20 p-8 text-center">
              <p className="text-xs text-muted-foreground">
                Fill in the form and click Generate to see results here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Form fields per tool                                               */
/* ------------------------------------------------------------------ */

function ToolForm({
  slug,
  fields,
  updateField,
}: {
  slug: string
  fields: Record<string, string>
  updateField: (key: string, value: string) => void
}) {
  switch (slug) {
    case "title-optimizer":
      return (
        <>
          <FormField label="Product Name" required>
            <Input
              value={fields.productName ?? ""}
              onChange={(e) => updateField("productName", e.target.value)}
              placeholder="e.g. Hand-Poured Soy Candle"
            />
          </FormField>
          <FormField label="Category">
            <Input
              value={fields.category ?? ""}
              onChange={(e) => updateField("category", e.target.value)}
              placeholder="e.g. Home Decor, Candles"
            />
          </FormField>
        </>
      )

    case "description-generator":
      return (
        <>
          <FormField label="Product Name" required>
            <Input
              value={fields.productName ?? ""}
              onChange={(e) => updateField("productName", e.target.value)}
              placeholder="e.g. Organic Cotton Tote Bag"
            />
          </FormField>
          <FormField label="Category">
            <Input
              value={fields.category ?? ""}
              onChange={(e) => updateField("category", e.target.value)}
              placeholder="e.g. Accessories, Bags"
            />
          </FormField>
          <FormField label="Wholesale Price ($)">
            <Input
              type="number"
              value={fields.price ?? ""}
              onChange={(e) => updateField("price", e.target.value)}
              placeholder="12.00"
              min="0"
              step="0.01"
            />
          </FormField>
        </>
      )

    case "pricing-recommender":
      return (
        <>
          <FormField label="Product Name" required>
            <Input
              value={fields.productName ?? ""}
              onChange={(e) => updateField("productName", e.target.value)}
              placeholder="e.g. Ceramic Mug Set"
            />
          </FormField>
          <FormField label="COGS ($)" required>
            <Input
              type="number"
              value={fields.cogs ?? ""}
              onChange={(e) => updateField("cogs", e.target.value)}
              placeholder="4.50"
              min="0"
              step="0.01"
            />
          </FormField>
          <FormField label="Category">
            <Input
              value={fields.category ?? ""}
              onChange={(e) => updateField("category", e.target.value)}
              placeholder="e.g. Kitchen, Drinkware"
            />
          </FormField>
        </>
      )

    case "retailer-email":
      return (
        <>
          <FormField label="Retailer Name" required>
            <Input
              value={fields.retailerName ?? ""}
              onChange={(e) => updateField("retailerName", e.target.value)}
              placeholder="e.g. Sarah Johnson"
            />
          </FormField>
          <FormField label="Your Store Name" required>
            <Input
              value={fields.storeName ?? ""}
              onChange={(e) => updateField("storeName", e.target.value)}
              placeholder="e.g. Artisan Goods Co."
            />
          </FormField>
          <FormField label="Context">
            <textarea
              value={fields.context ?? ""}
              onChange={(e) => updateField("context", e.target.value)}
              placeholder="e.g. They own a boutique in Portland specializing in handmade goods. We want to introduce our new candle line."
              rows={3}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </FormField>
        </>
      )

    case "product-tags":
      return (
        <>
          <FormField label="Product Name" required>
            <Input
              value={fields.productName ?? ""}
              onChange={(e) => updateField("productName", e.target.value)}
              placeholder="e.g. Macrame Wall Hanging"
            />
          </FormField>
          <FormField label="Description">
            <textarea
              value={fields.description ?? ""}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Brief product description..."
              rows={3}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </FormField>
          <FormField label="Category">
            <Input
              value={fields.category ?? ""}
              onChange={(e) => updateField("category", e.target.value)}
              placeholder="e.g. Home Decor, Wall Art"
            />
          </FormField>
        </>
      )

    case "listing-audit":
      return (
        <>
          <FormField label="Product Name" required>
            <Input
              value={fields.productName ?? ""}
              onChange={(e) => updateField("productName", e.target.value)}
              placeholder="e.g. Bamboo Cutting Board"
            />
          </FormField>
          <FormField label="Description">
            <textarea
              value={fields.description ?? ""}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Current product description (or leave empty to flag as missing)"
              rows={3}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </FormField>
          <FormField label="Image Count">
            <Input
              type="number"
              value={fields.imageCount ?? ""}
              onChange={(e) => updateField("imageCount", e.target.value)}
              placeholder="4"
              min="0"
            />
          </FormField>
          <FormField label="Wholesale Price ($)">
            <Input
              type="number"
              value={fields.price ?? ""}
              onChange={(e) => updateField("price", e.target.value)}
              placeholder="18.00"
              min="0"
              step="0.01"
            />
          </FormField>
          <FormField label="Tags (comma-separated)">
            <Input
              value={fields.tags ?? ""}
              onChange={(e) => updateField("tags", e.target.value)}
              placeholder="e.g. kitchen, bamboo, eco-friendly, cutting board"
            />
          </FormField>
        </>
      )

    case "trend-analyzer":
      return (
        <FormField label="Category" required>
          <Input
            value={fields.category ?? ""}
            onChange={(e) => updateField("category", e.target.value)}
            placeholder="e.g. Home Decor, Jewelry, Bath & Body"
          />
        </FormField>
      )

    default:
      return <p className="text-xs text-muted-foreground">No form available for this tool.</p>
  }
}

/* ------------------------------------------------------------------ */
/*  Form field wrapper                                                 */
/* ------------------------------------------------------------------ */

function FormField({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  )
}
