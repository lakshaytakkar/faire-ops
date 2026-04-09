"use client"

import { useState } from "react"
import {
  Search,
  ChevronDown,
  ChevronUp,
  HelpCircle,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { SubNav } from "@/components/shared/sub-nav"

/* ------------------------------------------------------------------ */
/*  FAQ Data (static)                                                  */
/* ------------------------------------------------------------------ */

interface FAQItem {
  id: string
  question: string
  answer: string
}

const FAQ_DATA: FAQItem[] = [
  { id: "f1", question: "How long do I have to ship an order after accepting it?", answer: "Faire expects orders to ship within your configured processing time, which defaults to 3 business days. You can adjust this in Store Settings. Consistently shipping late damages your store health score and search ranking. Set a realistic processing time you can reliably meet, and aim to ship earlier when possible." },
  { id: "f2", question: "What is Faire's return policy for retailers?", answer: "Faire offers retailers free returns on first orders within 60 days of delivery. This means if a new retailer is unhappy with their first purchase, they can return it at no cost. Repeat orders do not qualify for free returns unless you offer them. Returns are deducted from your future payouts. To minimize returns, ensure product photos accurately represent your items and descriptions are thorough." },
  { id: "f3", question: "How does Faire's commission structure work?", answer: "Faire charges 25% commission on first orders from new marketplace retailers, 15% on repeat orders from returning retailers, and 0% on Faire Direct orders (retailers you bring to the platform). There are no listing fees, monthly fees, or setup costs. Factor these rates into your wholesale pricing to maintain healthy margins." },
  { id: "f4", question: "When do I receive my payouts from Faire?", answer: "Faire processes payouts on Net 30 terms from the ship date. Once you mark an order as shipped and provide tracking, the 30-day clock starts. Payouts are deposited directly into your linked bank account. Plan your cash flow around this timeline, especially during high-volume periods when you may have significant capital tied up in shipped but unpaid orders." },
  { id: "f5", question: "How do I sync inventory across multiple sales channels?", answer: "If you sell on Faire and other platforms (Shopify, your website, etc.), use inventory management software that integrates with Faire's API. Options include tools like Inventory Planner, Cin7, or custom integrations. Manual tracking across channels leads to overselling and cancellations. At minimum, update Faire inventory counts whenever stock changes on any channel." },
  { id: "f6", question: "What should I do if a shipment is damaged in transit?", answer: "If a retailer reports damaged goods, respond within 24 hours through Faire messaging. Offer a replacement or credit without requiring the retailer to fight for resolution. File a claim with your shipping carrier if you purchased insurance. Document the issue with photos for your records. A well-handled damage claim often strengthens the retailer relationship more than a flawless delivery." },
  { id: "f7", question: "How can I improve my search ranking on Faire?", answer: "Faire's search algorithm considers title optimization (front-load keywords), product tag coverage, image count and quality, store health score, conversion rate, and fulfillment reliability. Focus on writing keyword-rich titles, using all available tags, uploading 4-8 images per listing, maintaining a healthy store score, and shipping on time. Consistent improvements across all factors yield the best results." },
  { id: "f8", question: "Can I set different processing times for different products?", answer: "Faire allows you to set a store-wide processing time in your Store Settings. For made-to-order or custom products that need longer lead times, you can use the backorder feature with custom lead time messaging. Communicate any extended processing times clearly in the product description so retailers know what to expect before ordering." },
  { id: "f9", question: "How does the Faire 60-day payment guarantee work?", answer: "Faire assumes credit risk on marketplace orders. If a retailer does not pay for their order, Faire still pays you in full. This guarantee is included in the commission you pay, effectively giving you risk-free accounts receivable. The guarantee applies to all marketplace and Faire Direct orders, removing the traditional wholesale risk of unpaid invoices." },
  { id: "f10", question: "What is the best way to handle seasonal inventory planning?", answer: "Retailers buy 3-6 months ahead of the retail season. Spring products should be listed by November-January, holiday products by May-July. Work backward from wholesale buying windows to plan production. Build inventory fully before each buying window starts. Use prior year sales data to forecast quantities. Running out of bestsellers during a peak buying window is lost revenue you cannot recover." },
  { id: "f11", question: "How do I convert marketplace retailers to Faire Direct?", answer: "After a retailer has reordered 2-3 times through the marketplace, invite them to use your Faire Direct link. Position it as a benefit for them: Net 60 payment terms and free returns. Share the link via Faire messaging, email, or on your invoices. Most retailers are happy to switch once they understand the advantages. This drops your commission from 15% to 0% on those orders." },
  { id: "f12", question: "What metrics should I review weekly?", answer: "Establish a weekly review covering: product views (search visibility), conversion rate (listing effectiveness), revenue trends (growth tracking), store health score (fulfillment reliability), late shipment rate, cancellation rate, and traffic sources. Compare week-over-week to catch trends early. Create action items for any declining metrics and track improvements over time." },
]

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function KnowledgeFaqPage() {
  const [search, setSearch] = useState("")
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null)

  /* ---- Filter FAQs ---- */
  const filteredFaqs = FAQ_DATA.filter((f) => {
    if (!search) return true
    const q = search.toLowerCase()
    return f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
  })

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5 px-6 pt-6">
      <SubNav items={[
        { title: "Articles", href: "/workspace/knowledge/articles" },
        { title: "FAQ", href: "/workspace/knowledge/faq" },
      ]} />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">Frequently Asked Questions</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Common questions about selling on Faire
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search FAQs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* FAQ List */}
      <div className="space-y-2">
        {filteredFaqs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No FAQs match your search</p>
        ) : (
          filteredFaqs.map((faq) => {
            const isOpen = expandedFaqId === faq.id
            return (
              <div
                key={faq.id}
                className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => setExpandedFaqId(isOpen ? null : faq.id)}
                  className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <HelpCircle className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm font-medium">{faq.question}</span>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-0">
                    <div className="pl-7 text-sm text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
