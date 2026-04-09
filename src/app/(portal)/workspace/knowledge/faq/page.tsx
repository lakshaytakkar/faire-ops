"use client"

import { useState } from "react"
import {
  Search,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Truck,
  CreditCard,
  ShoppingCart,
  BarChart3,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { SubNav } from "@/components/shared/sub-nav"

/* ------------------------------------------------------------------ */
/*  FAQ Data grouped by category                                       */
/* ------------------------------------------------------------------ */

interface FAQItem {
  id: string
  question: string
  answer: string
  category: string
}

const FAQ_DATA: FAQItem[] = [
  // Shipping & Fulfillment
  { id: "f1", category: "Shipping & Fulfillment", question: "How long do I have to ship an order after accepting it?", answer: "Faire expects orders to ship within your configured processing time, which defaults to 3 business days. You can adjust this in Store Settings. Consistently shipping late damages your store health score and search ranking. Set a realistic processing time you can reliably meet, and aim to ship earlier when possible." },
  { id: "f6", category: "Shipping & Fulfillment", question: "What should I do if a shipment is damaged in transit?", answer: "If a retailer reports damaged goods, respond within 24 hours through Faire messaging. Offer a replacement or credit without requiring the retailer to fight for resolution. File a claim with your shipping carrier if you purchased insurance. Document the issue with photos for your records." },
  { id: "f8", category: "Shipping & Fulfillment", question: "Can I set different processing times for different products?", answer: "Faire allows you to set a store-wide processing time in your Store Settings. For made-to-order or custom products that need longer lead times, you can use the backorder feature with custom lead time messaging. Communicate any extended processing times clearly in the product description." },

  // Payments & Commission
  { id: "f3", category: "Payments & Commission", question: "How does Faire's commission structure work?", answer: "Faire charges 25% commission on first orders from new marketplace retailers, 15% on repeat orders from returning retailers, and 0% on Faire Direct orders (retailers you bring to the platform). There are no listing fees, monthly fees, or setup costs. Factor these rates into your wholesale pricing to maintain healthy margins." },
  { id: "f4", category: "Payments & Commission", question: "When do I receive my payouts from Faire?", answer: "Faire processes payouts on Net 30 terms from the ship date. Once you mark an order as shipped and provide tracking, the 30-day clock starts. Payouts are deposited directly into your linked bank account. Plan your cash flow around this timeline, especially during high-volume periods." },
  { id: "f9", category: "Payments & Commission", question: "How does the Faire 60-day payment guarantee work?", answer: "Faire assumes credit risk on marketplace orders. If a retailer does not pay for their order, Faire still pays you in full. This guarantee is included in the commission you pay, effectively giving you risk-free accounts receivable. The guarantee applies to all marketplace and Faire Direct orders." },

  // Orders & Returns
  { id: "f2", category: "Orders & Returns", question: "What is Faire's return policy for retailers?", answer: "Faire offers retailers free returns on first orders within 60 days of delivery. If a new retailer is unhappy with their first purchase, they can return it at no cost. Repeat orders do not qualify for free returns unless you offer them. Returns are deducted from your future payouts. Ensure product photos accurately represent your items." },
  { id: "f5", category: "Orders & Returns", question: "How do I sync inventory across multiple sales channels?", answer: "If you sell on Faire and other platforms (Shopify, your website, etc.), use inventory management software that integrates with Faire's API. Options include tools like Inventory Planner, Cin7, or custom integrations. Manual tracking across channels leads to overselling and cancellations." },
  { id: "f10", category: "Orders & Returns", question: "What is the best way to handle seasonal inventory planning?", answer: "Retailers buy 3-6 months ahead of the retail season. Spring products should be listed by November-January, holiday products by May-July. Work backward from wholesale buying windows to plan production. Build inventory fully before each buying window starts." },

  // Growth & Strategy
  { id: "f7", category: "Growth & Strategy", question: "How can I improve my search ranking on Faire?", answer: "Faire's search algorithm considers title optimization (front-load keywords), product tag coverage, image count and quality, store health score, conversion rate, and fulfillment reliability. Focus on writing keyword-rich titles, using all available tags, uploading 4-8 images per listing, and shipping on time." },
  { id: "f11", category: "Growth & Strategy", question: "How do I convert marketplace retailers to Faire Direct?", answer: "After a retailer has reordered 2-3 times through the marketplace, invite them to use your Faire Direct link. Position it as a benefit: Net 60 payment terms and free returns. Share the link via Faire messaging, email, or on your invoices. This drops your commission from 15% to 0%." },
  { id: "f12", category: "Growth & Strategy", question: "What metrics should I review weekly?", answer: "Establish a weekly review covering: product views (search visibility), conversion rate (listing effectiveness), revenue trends (growth tracking), store health score (fulfillment reliability), late shipment rate, cancellation rate, and traffic sources. Compare week-over-week to catch trends early." },
]

const CATEGORY_META: Record<string, { icon: LucideIcon; color: string }> = {
  "Shipping & Fulfillment": { icon: Truck, color: "text-orange-600 bg-orange-50 border-orange-200" },
  "Payments & Commission": { icon: CreditCard, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  "Orders & Returns": { icon: ShoppingCart, color: "text-blue-600 bg-blue-50 border-blue-200" },
  "Growth & Strategy": { icon: BarChart3, color: "text-violet-600 bg-violet-50 border-violet-200" },
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function KnowledgeFaqPage() {
  const [search, setSearch] = useState("")
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  function toggleFaq(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Group by category, filter by search
  const categories = Object.keys(CATEGORY_META)
  const grouped = categories.map((cat) => {
    const items = FAQ_DATA.filter((f) => f.category === cat).filter((f) => {
      if (!search) return true
      const q = search.toLowerCase()
      return f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
    })
    return { category: cat, items }
  }).filter((g) => g.items.length > 0)

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <SubNav items={[
        { title: "Articles", href: "/workspace/knowledge/articles" },
        { title: "FAQ", href: "/workspace/knowledge/faq" },
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Frequently Asked Questions</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{FAQ_DATA.length} questions across {categories.length} categories</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search FAQs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Category cards — 2 per row */}
      {grouped.length === 0 ? (
        <div className="py-12 text-center">
          <HelpCircle className="size-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No FAQs match your search</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {grouped.map(({ category, items }) => {
            const meta = CATEGORY_META[category]
            const Icon = meta.icon
            return (
              <div key={category} className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
                {/* Category header */}
                <div className="px-5 py-3.5 border-b flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${meta.color}`}>
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-[0.9375rem] font-semibold tracking-tight">{category}</h2>
                    <p className="text-xs text-muted-foreground">{items.length} questions</p>
                  </div>
                </div>

                {/* Questions */}
                <div className="divide-y divide-border/50">
                  {items.map((faq) => {
                    const isOpen = expandedIds.has(faq.id)
                    return (
                      <div key={faq.id}>
                        <button
                          onClick={() => toggleFaq(faq.id)}
                          className="w-full flex items-start justify-between gap-3 px-5 py-3.5 text-left hover:bg-muted/30 transition-colors cursor-pointer"
                        >
                          <span className="text-sm font-medium text-foreground leading-snug">{faq.question}</span>
                          {isOpen ? (
                            <ChevronUp className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                          ) : (
                            <ChevronDown className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                          )}
                        </button>
                        {isOpen && (
                          <div className="px-5 pb-4 -mt-1">
                            <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
