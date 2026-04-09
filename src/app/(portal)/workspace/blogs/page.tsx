"use client"

import { ArrowRight, BookOpen } from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const GRADIENTS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
  "linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)",
  "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)",
]

const BLOG_POSTS = [
  {
    id: 1,
    title: "Faire SEO Best Practices",
    category: "SEO",
    description: "Optimize your Faire store listings for maximum visibility. Learn keyword strategies, tag optimization, and how to rank higher in Faire search results.",
    categoryBadge: "bg-blue-50 text-blue-700",
    readingTime: "8 min read",
  },
  {
    id: 2,
    title: "Wholesale Pricing Strategy",
    category: "Pricing",
    description: "Master wholesale margin calculations, MAP pricing, and tiered pricing structures to maximize profit while staying competitive on the platform.",
    categoryBadge: "bg-emerald-50 text-emerald-700",
    readingTime: "12 min read",
  },
  {
    id: 3,
    title: "Product Photography Tips",
    category: "Creative",
    description: "Boost conversion rates with better product photos. Covers lighting setups, backgrounds, lifestyle shots, and Faire image requirements.",
    categoryBadge: "bg-purple-50 text-purple-700",
    readingTime: "6 min read",
  },
  {
    id: 4,
    title: "Retailer Outreach Templates",
    category: "Sales",
    description: "Ready-to-use email and WhatsApp templates for cold outreach, follow-ups, reorder reminders, and seasonal promotions to drive repeat purchases.",
    categoryBadge: "bg-amber-50 text-amber-700",
    readingTime: "5 min read",
  },
  {
    id: 5,
    title: "Faire Direct Guide",
    category: "Growth",
    description: "Everything you need to know about Faire Direct: 0% commission setup, retailer invitation workflows, link sharing, and tracking FD revenue.",
    categoryBadge: "bg-red-50 text-red-700",
    readingTime: "10 min read",
  },
  {
    id: 6,
    title: "Seasonal Planning 2026",
    category: "Strategy",
    description: "Plan your Q2-Q4 product launches, inventory levels, and promotional calendar. Includes key Faire marketplace dates and seasonal demand patterns.",
    categoryBadge: "bg-indigo-50 text-indigo-700",
    readingTime: "15 min read",
  },
]

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function BlogsPage() {
  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">Blogs & Learning</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Resources for the team</p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {BLOG_POSTS.map((post, index) => (
          <div key={post.id} className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden hover:shadow-sm transition-shadow">
            {/* Gradient thumbnail */}
            <div
              className="h-28 flex items-center justify-center"
              style={{ background: GRADIENTS[index % GRADIENTS.length] }}
            >
              <BookOpen className="size-10 text-white/25" />
            </div>

            <div className="p-5">
              {/* Title + Badge */}
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">{post.title}</h3>
                <span className={`border-0 text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${post.categoryBadge}`}>
                  {post.category}
                </span>
              </div>

              {/* Description */}
              <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{post.description}</p>

              {/* Footer */}
              <div className="mt-4 flex items-center justify-between">
                <button className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                  Read <ArrowRight className="h-3 w-3" />
                </button>
                <span className="text-xs text-muted-foreground">{post.readingTime}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
