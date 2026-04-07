"use client"

import { useRouter } from "next/navigation"
import {
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
import { isGeminiConfigured } from "@/lib/gemini"

/* ------------------------------------------------------------------ */
/*  Tool definitions                                                   */
/* ------------------------------------------------------------------ */

interface Tool {
  slug: string
  name: string
  description: string
  icon: React.ElementType
  iconBg: string
  iconColor: string
  category: string
  categoryColor: string
}

const TOOLS: Tool[] = [
  {
    slug: "title-optimizer",
    name: "Title Optimizer",
    description: "Rewrite product titles for better SEO on Faire search",
    icon: Type,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    category: "Copywriting",
    categoryColor: "bg-blue-50 text-blue-700",
  },
  {
    slug: "description-generator",
    name: "Description Generator",
    description: "Generate compelling B2B product descriptions for wholesale buyers",
    icon: FileText,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    category: "Copywriting",
    categoryColor: "bg-blue-50 text-blue-700",
  },
  {
    slug: "collection-thumbnail",
    name: "Collection Thumbnail",
    description: "Create AI-generated thumbnails for product collections",
    icon: Image,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    category: "Visual",
    categoryColor: "bg-purple-50 text-purple-700",
  },
  {
    slug: "logo-generator",
    name: "Logo Generator",
    description: "Design a unique store logo with AI image generation",
    icon: Palette,
    iconBg: "bg-pink-100",
    iconColor: "text-pink-600",
    category: "Visual",
    categoryColor: "bg-pink-50 text-pink-700",
  },
  {
    slug: "banner-creator",
    name: "Banner Creator",
    description: "Generate promotional store banners for seasonal campaigns",
    icon: Layout,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    category: "Visual",
    categoryColor: "bg-amber-50 text-amber-700",
  },
  {
    slug: "pricing-recommender",
    name: "Pricing Recommender",
    description: "Get wholesale and MSRP pricing suggestions based on COGS",
    icon: DollarSign,
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    category: "Strategy",
    categoryColor: "bg-green-50 text-green-700",
  },
  {
    slug: "retailer-email",
    name: "Retailer Email",
    description: "Compose personalized outreach emails for wholesale buyers",
    icon: Mail,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    category: "Outreach",
    categoryColor: "bg-emerald-50 text-emerald-700",
  },
  {
    slug: "product-tags",
    name: "Product Tags",
    description: "Generate SEO-optimized tags for better product discoverability",
    icon: Tag,
    iconBg: "bg-cyan-100",
    iconColor: "text-cyan-600",
    category: "SEO",
    categoryColor: "bg-cyan-50 text-cyan-700",
  },
  {
    slug: "listing-audit",
    name: "Listing Audit",
    description: "Score and audit your product listings for Faire best practices",
    icon: ClipboardCheck,
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    category: "Optimization",
    categoryColor: "bg-red-50 text-red-700",
  },
  {
    slug: "trend-analyzer",
    name: "Trend Analyzer",
    description: "Discover trending keywords and emerging products in your category",
    icon: TrendingUp,
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
    category: "Research",
    categoryColor: "bg-violet-50 text-violet-700",
  },
]

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AIToolsPage() {
  const router = useRouter()

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">
            AI Tools
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            AI-powered tools for product optimization and marketing
          </p>
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

      {/* Tool cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TOOLS.map((tool) => {
          const Icon = tool.icon
          return (
            <div
              key={tool.slug}
              onClick={() => router.push(`/workspace/ai-tools/${tool.slug}`)}
              className="rounded-md border bg-card p-5 hover:shadow-sm transition-shadow cursor-pointer"
            >
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${tool.iconBg}`}>
                <Icon className={`h-5 w-5 ${tool.iconColor}`} />
              </div>
              <h3 className="text-sm font-semibold mt-3 text-foreground">
                {tool.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {tool.description}
              </p>
              <div className="mt-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tool.categoryColor}`}>
                  {tool.category}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
