"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  BookOpen,
  FolderOpen,
  Pin,
  Plus,
  X,
  Search,
  Star,
  Copy,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Check,
  Image,
  DollarSign,
  Lightbulb,
  Megaphone,
  Truck,
  Users,
  Package,
  Palette,
  BarChart3,
  Rocket,
  Printer,
  HelpCircle,
  ShoppingCart,
  CreditCard,
  Settings,
  RefreshCw,
  FileText,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface KnowledgeArticle {
  id: string
  title: string
  source_url: string | null
  source: string
  full_content: string
  summary: string
  bullet_points: string[]
  category: string
  tags: string[]
  is_pinned: boolean
  created_at: string
}

const CATEGORIES = [
  "All",
  "listings",
  "images",
  "pricing",
  "finance",
  "marketing",
  "fulfillment",
  "crm",
  "inventory",
  "branding",
  "analytics",
  "onboarding",
]

const CATEGORY_LABELS: Record<string, string> = {
  listings: "Listings",
  images: "Images",
  pricing: "Pricing",
  finance: "Finance",
  marketing: "Marketing",
  fulfillment: "Fulfillment",
  crm: "CRM",
  inventory: "Inventory",
  branding: "Branding",
  analytics: "Analytics",
  onboarding: "Onboarding",
}

const CATEGORY_BADGE: Record<string, string> = {
  listings: "bg-blue-50 text-blue-700",
  images: "bg-purple-50 text-purple-700",
  pricing: "bg-emerald-50 text-emerald-700",
  finance: "bg-amber-50 text-amber-700",
  marketing: "bg-pink-50 text-pink-700",
  fulfillment: "bg-orange-50 text-orange-700",
  crm: "bg-cyan-50 text-cyan-700",
  inventory: "bg-lime-50 text-lime-700",
  branding: "bg-indigo-50 text-indigo-700",
  analytics: "bg-rose-50 text-rose-700",
  onboarding: "bg-teal-50 text-teal-700",
}

const THUMBNAIL_PATTERNS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
  "linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)",
  "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)",
  "linear-gradient(135deg, #f5576c 0%, #ff9a9e 100%)",
  "linear-gradient(135deg, #667eea 0%, #00f2fe 100%)",
]

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  listings: BookOpen,
  images: Image,
  pricing: DollarSign,
  finance: Lightbulb,
  marketing: Megaphone,
  fulfillment: Truck,
  crm: Users,
  inventory: Package,
  branding: Palette,
  analytics: BarChart3,
  onboarding: Rocket,
}

/* ------------------------------------------------------------------ */
/*  Help Articles (static data)                                        */
/* ------------------------------------------------------------------ */

interface HelpArticle {
  id: string
  title: string
  description: string
  category: string
  link: string
}

const HELP_CATEGORY_ICONS: Record<string, LucideIcon> = {
  "Getting Started": Rocket,
  Orders: ShoppingCart,
  Products: Package,
  Shipping: Truck,
  Payments: CreditCard,
  Account: Settings,
}

const HELP_CATEGORY_BADGE: Record<string, string> = {
  "Getting Started": "bg-teal-50 text-teal-700",
  Orders: "bg-blue-50 text-blue-700",
  Products: "bg-purple-50 text-purple-700",
  Shipping: "bg-orange-50 text-orange-700",
  Payments: "bg-emerald-50 text-emerald-700",
  Account: "bg-amber-50 text-amber-700",
}

const HELP_ARTICLES: HelpArticle[] = [
  { id: "h1", title: "Setting Up Your Faire Store", description: "Step-by-step guide to creating your brand profile, uploading your logo, and configuring store settings for the first time.", category: "Getting Started", link: "#" },
  { id: "h2", title: "Your First Product Listing", description: "How to create your first product listing with optimized titles, descriptions, images, and pricing for maximum visibility.", category: "Getting Started", link: "#" },
  { id: "h3", title: "Accepting and Processing Orders", description: "Learn the complete order lifecycle from receiving a new order notification to accepting, packing, and marking it shipped.", category: "Orders", link: "#" },
  { id: "h4", title: "Handling Order Cancellations", description: "How to properly cancel orders, communicate with retailers, and minimize the impact on your store health metrics.", category: "Orders", link: "#" },
  { id: "h5", title: "Bulk Product Upload Guide", description: "Use Faire's CSV template to upload hundreds of products at once, including variants, pricing, and inventory counts.", category: "Products", link: "#" },
  { id: "h6", title: "Optimizing Product Images", description: "Image requirements, recommended dimensions, and photography tips to make your products stand out in search results.", category: "Products", link: "#" },
  { id: "h7", title: "Shipping Label Generation", description: "How to generate prepaid shipping labels through Faire, choose carriers, and set up shipping profiles for different product types.", category: "Shipping", link: "#" },
  { id: "h8", title: "International Shipping Setup", description: "Configure international shipping rates, understand customs requirements, and manage cross-border order fulfillment.", category: "Shipping", link: "#" },
  { id: "h9", title: "Understanding Your Payouts", description: "How Faire calculates payouts, Net 30 payment terms, commission deductions, and how to read your payout statements.", category: "Payments", link: "#" },
  { id: "h10", title: "Faire Direct: Zero Commission", description: "Set up Faire Direct links to bring your own retailers and pay 0% commission on all orders from those accounts.", category: "Payments", link: "#" },
  { id: "h11", title: "Managing Team Members", description: "Add team members to your Faire brand account, set permissions, and manage access levels for different roles.", category: "Account", link: "#" },
  { id: "h12", title: "Store Health Score Explained", description: "Understand the metrics that affect your store health score and actionable steps to keep it in the green zone.", category: "Account", link: "#" },
]

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
/*  Seed Data (Knowledge Articles from Supabase)                       */
/* ------------------------------------------------------------------ */

const SEED_ARTICLES = [
  {
    title: "Optimizing Product Titles for Faire Search",
    source: "faire-knowledge",
    source_url: null,
    category: "listings",
    tags: ["seo", "titles", "search"],
    is_pinned: true,
    summary: "Learn how to craft product titles that rank higher in Faire search results and attract more retailer clicks. Proper title formatting is one of the most impactful changes you can make to improve listing visibility.",
    bullet_points: [
      "Keep titles under 80 characters for full visibility in search results and mobile views",
      "Place primary keywords at the front of the title before any brand name or decorative text",
      "Use pipe separators (|) to break up attributes like size, material, and color",
      "Include the product type within the first 3-4 words so Faire's algorithm can categorize it",
      "Avoid ALL CAPS, excessive punctuation, or promotional language like 'Best Seller' in titles",
      "Mirror the language retailers use when searching — think 'Soy Candle' not 'Artisanal Wax Creation'",
      "Test title variations by monitoring view-to-order conversion rates in Faire analytics",
    ],
    full_content: `Product titles are the single most important factor for search visibility on Faire. The platform's search algorithm heavily weighs title text when deciding which products to show retailers, making title optimization a high-leverage activity for any brand.

**Character Limits and Structure**
Faire displays approximately 80 characters of a product title in search results on desktop and even fewer on mobile. Anything beyond that gets truncated, so front-load the most important information. A strong structure follows this pattern: [Product Type] | [Key Attribute] | [Material/Style] | [Size/Variant]. For example: "Soy Candle | Lavender Fields | Hand-Poured | 8oz Jar" is far more effective than "Beautiful Hand-Poured Artisanal Lavender Fields Soy Candle in 8oz Jar."

**Keyword Placement Strategy**
Faire's search algorithm gives the most weight to words that appear early in the title. Start with the primary product type — the word a retailer would actually type into the search bar. If you sell earrings, the word "Earrings" should be in the first few words, not buried after your brand name. Research what terms retailers use by browsing top-performing competitor listings and noting their title patterns.

**Separator Best Practices**
Use pipe characters (|) or dashes (-) to separate distinct attributes. This improves scannability for retailers who are quickly browsing search results. Each segment between separators should convey a distinct piece of information: product type, material, scent/flavor, size, or collection name.

**Common Mistakes to Avoid**
Never use ALL CAPS or excessive punctuation — it looks unprofessional and some platforms penalize it. Avoid promotional phrases like "Best Seller," "Hot Item," or "Sale" in titles. Do not stuff keywords unnaturally. Faire's algorithm is sophisticated enough to detect keyword stuffing and may penalize listings that do it.

**Testing and Iteration**
Use Faire's analytics to monitor how title changes impact your performance. Track impressions, click-through rate, and conversion rate before and after changes. Make one change at a time and wait at least 2 weeks before drawing conclusions. The most successful brands treat title optimization as an ongoing process, not a one-time task.

**Brand Name Placement**
While brand recognition matters, leading with your brand name wastes valuable title real estate unless your brand is already well-known on the platform. Instead, place your brand name at the end of the title or omit it entirely from the title since it already appears elsewhere on your listing.`,
  },
  {
    title: "Product Photography Best Practices",
    source: "faire-knowledge",
    source_url: null,
    category: "images",
    tags: ["photography", "images", "listing"],
    is_pinned: true,
    summary: "High-quality product photography is essential for converting retailer interest into wholesale orders on Faire. This guide covers lighting, backgrounds, angles, and image count requirements.",
    bullet_points: [
      "Use a clean white or light gray background for your primary product image",
      "Upload a minimum of 4 images per listing — Faire rewards listings with more images in search rankings",
      "Include at least one lifestyle or styled shot showing the product in a retail context",
      "Shoot at a minimum resolution of 1500x1500 pixels for sharp zoom-in capability",
      "Show scale by including a common reference object or a model wearing/holding the product",
      "Photograph packaging and display options since retailers care about shelf presentation",
      "Maintain consistent lighting and color temperature across all product images for a cohesive store",
    ],
    full_content: `Product photography on Faire directly impacts your conversion rate. Retailers are making wholesale buying decisions based primarily on your images, since they cannot touch or see products in person. Investing in quality photography consistently yields the highest ROI of any listing improvement.

**White Background Standards**
Your primary (hero) image should feature the product on a clean white or very light background. This is industry standard for wholesale platforms and ensures your product looks professional in search results alongside competitors. Use seamless white paper or fabric as a backdrop, and ensure even lighting eliminates shadows and color casts.

**Lighting Setup**
Natural light near a large north-facing window works well for small products. For consistent results, invest in a basic two-light softbox setup. Position one light at 45 degrees to the left and another at 45 degrees to the right, with a reflector opposite to fill shadows. Avoid harsh direct flash, which creates unflattering highlights and hard shadows.

**Image Count and Types**
Faire's algorithm favors listings with more images, and retailers want to see products from every angle before committing to a wholesale order. Upload at minimum 4 images per listing. Aim for 6-8 if possible. Include these shot types: hero image (white background, front-facing), detail close-up (texture, material, label), scale/size reference, lifestyle/styled shot, packaging/display shot, and back/alternate angle.

**Lifestyle Photography**
At least one image per listing should show the product in a styled, retail-like environment. This helps retailers visualize how the product will look in their store. A candle on a styled shelf, jewelry on a model, or a mug in a kitchen setting all help retailers imagine the product in their retail space.

**Technical Requirements**
Upload images at a minimum resolution of 1500x1500 pixels. Faire supports zoom, and retailers will zoom in to inspect details like stitching, labels, and material quality. Save images as JPEG with 80-90% quality for the best balance of file size and clarity. Ensure color accuracy — products that look different in person than in photos lead to returns and negative reviews.

**Consistency Across Your Catalog**
Maintain the same lighting style, background, and editing approach across all product listings. A cohesive visual presentation makes your brand look professional and helps retailers quickly browse your catalog. Use the same white balance settings and editing presets for every shoot.

**Packaging and Display**
Retailers want to know how products arrive and how they can be displayed. Photograph your packaging, any included display materials, and point-of-sale assets. If your product comes in gift-ready packaging, showcase that — it is a selling point for retailers whose customers buy gifts.`,
  },
  {
    title: "Wholesale Pricing Strategy on Faire",
    source: "faire-knowledge",
    source_url: null,
    category: "pricing",
    tags: ["pricing", "margins", "wholesale"],
    is_pinned: true,
    summary: "A solid wholesale pricing strategy ensures profitability while remaining competitive on Faire. This guide covers cost analysis, margin targets, MSRP setting, and minimum order quantity strategy.",
    bullet_points: [
      "Calculate your true COGS including materials, labor, packaging, and shipping before setting prices",
      "Target a 50-60% gross margin on wholesale pricing to account for Faire commissions and overhead",
      "Set MSRP at 2x-2.5x your wholesale price to give retailers healthy retail margins",
      "Use Minimum Order Quantities (MOQ) strategically — lower MOQs attract more first-time buyers",
      "Factor in Faire's 25% first-order and 15% repeat-order commission when calculating margins",
      "Offer tiered pricing or volume discounts to encourage larger orders",
      "Review and adjust pricing quarterly based on COGS changes and competitor analysis",
    ],
    full_content: `Pricing is one of the most critical decisions for wholesale success on Faire. Price too high and retailers scroll past. Price too low and you erode margins, especially after Faire's commission. The goal is finding the sweet spot that attracts retailers while maintaining healthy profitability.

**Cost of Goods Sold (COGS) Analysis**
Before setting any price, calculate your true COGS per unit. Include raw materials, direct labor (or your time valued at a fair hourly rate), packaging materials, labels/tags, and inbound shipping for materials. Many brands underestimate COGS by forgetting to include their own labor, packaging costs, or waste/defect rates. A thorough COGS calculation is the foundation of sustainable pricing.

**Wholesale Margin Targets**
For Faire specifically, target a gross margin of 50-60% on your wholesale price (meaning COGS should be 40-50% of your wholesale price). This accounts for Faire's commission structure (25% on first orders from new retailers, 15% on repeat orders), your operational overhead, and still leaves profit. If your margins are below 40% after commission, you likely need to reduce COGS or raise prices.

**MSRP and Retailer Margins**
Set your Manufacturer's Suggested Retail Price (MSRP) at 2x to 2.5x your wholesale price. This is the standard retailers expect — they need to at least double the wholesale price to cover their own costs and profit. If your MSRP is too close to wholesale, retailers cannot make money selling your product. Display MSRP clearly on your Faire listing, as it signals the retailer's potential margin.

**Minimum Order Quantities**
MOQ strategy directly impacts your order volume on Faire. Lower MOQs (4-6 units per SKU) attract more first-time buyers who want to test your product without a large commitment. Higher MOQs reduce your per-order operational cost but limit your addressable market. Consider a lower MOQ for initial orders and offering incentives for larger reorders.

**Commission-Adjusted Profitability**
Always model your unit economics including Faire's commission. On a first order: Wholesale Price minus COGS minus 25% Faire Commission equals your actual profit. On repeat orders: Wholesale Price minus COGS minus 15% Faire Commission. For Faire Direct orders: Wholesale Price minus COGS minus 0% commission. Understanding these three scenarios helps you set realistic financial targets.

**Competitive Analysis**
Browse Faire for comparable products in your category and note their wholesale prices, MSRPs, and MOQs. You do not need to be the cheapest, but you need to be within the expected range for your product category and quality level. Premium products can command higher prices but need photography and descriptions that justify the premium.

**Volume Discounts**
Consider offering tiered pricing or volume discounts on Faire. A 5-10% discount on orders above a certain threshold encourages retailers to order more per transaction, improving your average order value and reducing your per-order shipping and handling costs.`,
  },
  {
    title: "Writing B2B Product Descriptions",
    source: "faire-knowledge",
    source_url: null,
    category: "listings",
    tags: ["descriptions", "copywriting", "b2b"],
    is_pinned: true,
    summary: "Effective B2B product descriptions on Faire speak directly to retailers, highlighting sellability, materials, and display potential rather than end-consumer benefits.",
    bullet_points: [
      "Write for the retailer audience — focus on sellability, margins, and display appeal",
      "Lead with the product's retail appeal and what makes it sell well in stores",
      "Always include materials, dimensions, weight, and care instructions",
      "Add display and merchandising suggestions to help retailers visualize shelf placement",
      "Keep descriptions between 150-300 words with clear paragraph breaks",
      "Mention any certifications, eco-friendly materials, or unique sourcing stories",
      "Include seasonal relevance and gifting potential when applicable",
    ],
    full_content: `Writing product descriptions for Faire requires a fundamentally different approach than writing for direct-to-consumer platforms. Your audience is retail buyers — professionals who evaluate products based on sellability, margin potential, and fit with their store's aesthetic. Every word should help them envision your product succeeding in their retail space.

**Retailer-Focused Language**
Shift your language from consumer benefits to retailer benefits. Instead of "This candle will transform your evening routine," write "This candle is a proven best-seller in boutiques, with eye-catching packaging that drives impulse purchases at checkout." Retailers think in terms of turns, margins, and display appeal. Speak their language.

**Essential Product Details**
Every description should include: materials and composition (retailers need this for customer questions), exact dimensions and weight (for shipping and display planning), care instructions, country of origin, and packaging details. Missing information creates friction — retailers will skip listings that leave questions unanswered rather than reaching out to ask.

**Structure and Formatting**
Organize descriptions with a clear hierarchy. Lead with a 1-2 sentence hook about the product's retail appeal. Follow with a paragraph on materials and craftsmanship. Then cover specifications in a scannable format. End with display suggestions or selling tips. Use short paragraphs — buyers scanning dozens of products will not read dense blocks of text.

**Display and Merchandising Suggestions**
One of the most valuable things you can include in a description is how retailers can display and merchandise your product. Mention counter displays, shelf arrangements, cross-selling opportunities, or seasonal positioning. For example: "Ships in a branded counter display that holds 12 units. Perfect for placement near the register for impulse add-on purchases."

**Brand Story Elements**
Briefly weave in your brand story where relevant — handmade, small-batch, woman-owned, sustainable sourcing. These details resonate with retailers whose customers value authenticity and story-driven products. Keep it concise: one or two sentences, not a full brand biography.

**Seasonal and Gifting Angles**
If your product has seasonal relevance or gifting potential, mention it explicitly. "A top performer during holiday gifting season" or "Perfect for Mother's Day endcap displays" helps retailers plan their buying around retail calendar events.

**SEO Within Descriptions**
While titles carry the most search weight on Faire, descriptions also contribute to search relevance. Naturally include key product terms, material types, and use cases. Do not keyword stuff, but ensure the words a retailer might search for appear naturally in your text.`,
  },
  {
    title: "Understanding Faire's Commission Structure",
    source: "faire-knowledge",
    source_url: null,
    category: "finance",
    tags: ["commission", "fees", "payout"],
    is_pinned: true,
    summary: "Faire charges different commission rates depending on the order source and retailer relationship. Understanding these rates is essential for accurate financial planning and margin management.",
    bullet_points: [
      "First orders from new retailers via Faire marketplace carry a 25% commission rate",
      "Repeat orders from returning retailers carry a reduced 15% commission rate",
      "Faire Direct orders (retailers you bring to the platform) carry 0% commission",
      "Payouts are processed on Net 30 terms from the ship date of each order",
      "Faire offers a 60-day payment guarantee protecting brands against retailer non-payment",
      "Factor commission into your pricing from the start — do not set prices and then realize margins are too thin",
      "Build a Faire Direct strategy to progressively move your retailer base toward 0% commission orders",
    ],
    full_content: `Faire's commission structure is one of the most important financial factors for any brand on the platform. The rates are straightforward but have significant implications for your pricing, profitability, and growth strategy.

**Commission Rates Explained**
Faire operates on a tiered commission model. When a brand-new retailer discovers your products through Faire's marketplace (search, recommendations, collections, or Faire markets) and places their first order, Faire takes a 25% commission on the order total. This rate reflects the value Faire provides in customer acquisition — they brought you a new wholesale customer you did not have before.

On subsequent orders from that same retailer, the commission drops to 15%. This repeat rate applies to all future orders placed through the Faire marketplace by that retailer for your brand.

The most favorable rate is through Faire Direct, where you bring your own retailers to the platform. For these orders, Faire charges 0% commission. This program is designed to incentivize brands to migrate their existing wholesale relationships onto Faire's infrastructure while keeping their hard-earned relationships commission-free.

**Payout Timing**
Faire processes payouts on Net 30 terms, calculated from the date you ship each order (not the date you receive it). Once you mark an order as shipped and upload tracking information, the 30-day clock starts. Payouts are deposited directly into your linked bank account. Plan your cash flow accordingly — there is always a 30+ day gap between shipping product and receiving payment.

**60-Day Payment Guarantee**
One of Faire's most valuable features is the payment guarantee. Faire assumes the credit risk on orders, meaning if a retailer does not pay, Faire still pays you. This eliminates the accounts receivable risk that traditionally plagues wholesale businesses. This guarantee is included in the commission — you are effectively paying for risk-free receivables.

**Impact on Unit Economics**
Always model three commission scenarios when planning finances. Scenario A (New Marketplace): Revenue minus 25% commission minus COGS equals profit. Scenario B (Repeat Marketplace): Revenue minus 15% commission minus COGS equals profit. Scenario C (Faire Direct): Revenue minus 0% commission minus COGS equals profit. Over time, as you convert marketplace retailers to repeat customers and bring your own retailers via Faire Direct, your blended commission rate should trend downward.

**Strategic Implications**
The commission structure creates a clear strategic imperative: convert first-time buyers into repeat customers (dropping from 25% to 15%) and build a Faire Direct pipeline (dropping to 0%). Every retailer relationship that moves from marketplace discovery to direct relationship significantly improves your margins. This should inform your CRM, follow-up, and outreach strategies.

**Additional Fees**
Beyond commission, be aware that Faire does not charge listing fees, monthly subscription fees, or setup costs. The commission on orders is the primary cost. However, factor in shipping costs (which you typically absorb on Faire), packaging materials, and the cost of free returns during Faire's return window.`,
  },
  {
    title: "Faire Direct Program Guide",
    source: "faire-knowledge",
    source_url: null,
    category: "marketing",
    tags: ["faire-direct", "commission", "growth"],
    is_pinned: false,
    summary: "Faire Direct allows brands to bring their own retailers to Faire and pay 0% commission on those orders. This guide covers how to qualify, set up, and maximize the program.",
    bullet_points: [
      "Faire Direct lets you invite your existing retailers and pay 0% commission on their orders",
      "Generate unique Faire Direct links from your brand portal to share with retailers",
      "Retailers get Net 60 payment terms and free returns when ordering through Faire Direct",
      "Use Faire Direct links in your email signatures, invoices, and outreach campaigns",
      "Track which retailers have signed up through your Faire Direct dashboard",
      "Combine Faire Direct with your CRM follow-up workflow for maximum conversion",
    ],
    full_content: `Faire Direct is one of the most powerful features available to brands on Faire, yet many sellers underutilize it. The program allows you to bring your own retailer relationships to the platform and pay zero commission on those orders — a massive improvement over the standard 25%/15% marketplace rates.

**How Faire Direct Works**
When you generate a Faire Direct link (available in your brand portal), it creates a unique URL tied to your brand. When a retailer clicks that link and creates a Faire account (or logs into their existing one), they are permanently tagged as a "direct" retailer for your brand. All future orders from that retailer to your brand carry 0% commission.

**Benefits for Retailers**
Faire Direct is compelling for retailers too. When retailers order through your Faire Direct link, they receive Net 60 payment terms (instead of paying upfront), free returns on first orders, and the ability to manage all their wholesale orders in one platform. These benefits make it easy to pitch to your existing accounts.

**Generating and Sharing Links**
Access your Faire Direct link from your brand dashboard under the "Faire Direct" section. You can generate a general link for your brand or retailer-specific links for tracking. Share these links in your email signature, on invoices, in newsletters, on your wholesale website, and during trade shows. The more places your link appears, the more retailers you convert.

**Qualification and Setup**
Most active brands on Faire have access to Faire Direct. If you do not see the option in your dashboard, ensure your account is in good standing with timely order fulfillment and no policy violations. Faire may require a minimum track record on the platform before enabling the feature.

**Maximizing Faire Direct**
Build Faire Direct into your standard outreach workflow. When following up with retailers after a trade show, include your Faire Direct link. When sending reorder reminders, use Faire Direct. When onboarding new wholesale accounts, start them on Faire Direct from day one. The goal is to make Faire Direct your default wholesale ordering channel.

**Tracking Performance**
Monitor your Faire Direct performance in your dashboard. Track how many retailers have signed up through your link, their order frequency, and total revenue. Compare Faire Direct revenue against marketplace revenue to understand your commission savings. Over time, increasing the proportion of Faire Direct orders should be a key strategic goal.`,
  },
  {
    title: "Reducing Late Shipment Rate",
    source: "faire-knowledge",
    source_url: null,
    category: "fulfillment",
    tags: ["shipping", "late-ship", "metrics"],
    is_pinned: false,
    summary: "Late shipment rate is a critical store health metric on Faire. Consistently shipping late can reduce search visibility and impact your brand's standing on the platform.",
    bullet_points: [
      "Faire expects orders to ship within 3 business days of acceptance unless a longer lead time is set",
      "Late shipment rate directly impacts your search ranking and store health score",
      "Set realistic processing times in your store settings rather than defaulting to the shortest option",
      "Upload tracking numbers promptly — untracked shipments may count against your metrics",
      "Use inventory management to avoid accepting orders you cannot fulfill on time",
      "Communicate proactively with retailers if a delay is unavoidable",
      "Monitor your late shipment rate weekly in the Faire analytics dashboard",
    ],
    full_content: "Late shipment rate is a critical store health metric. Faire expects brands to ship within their configured processing time. Set realistic expectations, upload tracking promptly, and monitor your rate weekly.",
  },
  {
    title: "Seasonal Planning for Wholesale",
    source: "faire-knowledge",
    source_url: null,
    category: "marketing",
    tags: ["seasonal", "planning", "calendar"],
    is_pinned: false,
    summary: "Wholesale operates on a fundamentally different calendar than direct-to-consumer retail. Understanding retail buying cycles and lead times is essential for maximizing seasonal revenue on Faire.",
    bullet_points: [
      "Retailers buy seasonal products 3-6 months in advance of the retail selling season",
      "Spring/Summer lines should be listed on Faire by November-January for the buying season",
      "Fall/Holiday products should be available by May-July for retailer purchasing windows",
      "Update your featured collections and hero images to match the upcoming buying season",
      "Plan inventory production around wholesale lead times, not direct-to-consumer timing",
      "Participate in Faire Markets (virtual trade shows) aligned with seasonal buying windows",
      "Create seasonal marketing campaigns targeting retailers at the start of each buying window",
    ],
    full_content: "Wholesale operates on a different calendar. Retailers buy 3-6 months ahead of the retail season. Plan your inventory and listings around wholesale buying windows, not consumer timing.",
  },
  {
    title: "Building Retailer Relationships",
    source: "faire-knowledge",
    source_url: null,
    category: "crm",
    tags: ["retailers", "outreach", "relationships"],
    is_pinned: false,
    summary: "Long-term retailer relationships drive repeat orders and lower commission rates on Faire. This guide covers follow-up cadences, personalization, and converting marketplace buyers to Faire Direct.",
    bullet_points: [
      "Send a personalized thank-you message within 24 hours of a new retailer's first order",
      "Follow up 2-3 weeks after delivery to check on sell-through and offer reorder support",
      "Share new product launches and seasonal updates with existing retailers monthly",
      "Invite your best repeat customers to Faire Direct for 0% commission and stronger loyalty",
      "Personalize outreach based on the retailer's store type, location, and past order history",
      "Offer exclusive early access to new collections for your top-performing retailers",
    ],
    full_content: "Building strong retailer relationships drives repeat orders at lower commission rates. Follow up after orders, communicate regularly, and convert your best accounts to Faire Direct.",
  },
  {
    title: "Product Tags and SEO on Faire",
    source: "faire-knowledge",
    source_url: null,
    category: "listings",
    tags: ["tags", "seo", "discovery"],
    is_pinned: false,
    summary: "Product tags and category selection play a crucial role in how Faire's search algorithm surfaces your products to retailers. Strategic tagging significantly improves discoverability.",
    bullet_points: [
      "Use all available tag slots — Faire allows multiple tags per product and more tags means more discovery paths",
      "Include a mix of broad category tags and specific descriptive tags for each product",
      "Select the most specific product category available rather than a general parent category",
      "Research tags used by top-performing competitors in your product category",
      "Include material tags, use-case tags, and occasion tags for maximum coverage",
      "Update tags periodically based on trending search terms and seasonal relevance",
      "Avoid irrelevant or misleading tags — they may trigger Faire policy violations",
    ],
    full_content: "Tags are Faire's secondary search mechanism. Use all available slots with a mix of broad and specific tags. Update them periodically based on trends.",
  },
  {
    title: "Managing Inventory on Faire",
    source: "faire-knowledge",
    source_url: null,
    category: "inventory",
    tags: ["inventory", "stock", "management"],
    is_pinned: false,
    summary: "Effective inventory management on Faire prevents overselling, reduces cancellations, and maintains healthy store metrics.",
    bullet_points: [
      "Keep Faire inventory counts accurate and updated — overselling leads to cancellations that hurt your metrics",
      "Use the backorder feature for made-to-order products with clear lead time expectations",
      "Set up low-stock alerts to trigger restocking before items sell out completely",
      "Mark products as out-of-stock rather than deleting listings to preserve SEO and review history",
      "Sync inventory across all sales channels if you sell on multiple platforms",
      "Set Minimum Order Quantities (MOQ) that balance retailer accessibility with operational efficiency",
      "Review inventory velocity weekly to identify fast-movers and slow-movers",
    ],
    full_content: "Keep inventory accurate across channels. Use backorder for made-to-order items. Set low-stock alerts and review velocity weekly.",
  },
  {
    title: "Faire Store Branding Guide",
    source: "faire-knowledge",
    source_url: null,
    category: "branding",
    tags: ["branding", "logo", "banner"],
    is_pinned: false,
    summary: "Your Faire store is often a retailer's first impression of your brand. A cohesive, professional brand presence builds trust and differentiates you from competitors.",
    bullet_points: [
      "Upload a high-resolution logo (minimum 400x400px) with transparent background for clean display",
      "Design a banner image (recommended 1600x400px) that showcases your brand aesthetic and product range",
      "Write a compelling brand story that communicates your mission, values, and what makes you unique",
      "Maintain visual consistency across all images, colors, and typography in your store",
      "Feature your bestsellers and seasonal highlights prominently on your store landing page",
      "Include your origin story, production process, or sustainability commitment to build retailer trust",
    ],
    full_content: "Your Faire store is your digital showroom. Invest in a professional logo, banner, and brand story. Maintain visual consistency across all listings.",
  },
  {
    title: "Order Processing Workflow",
    source: "faire-knowledge",
    source_url: null,
    category: "fulfillment",
    tags: ["orders", "processing", "workflow"],
    is_pinned: false,
    summary: "A streamlined order processing workflow ensures fast fulfillment, accurate shipments, and strong store health metrics on Faire.",
    bullet_points: [
      "Check for new orders at least twice daily — morning and afternoon at minimum",
      "Accept orders promptly within a few hours of receiving them rather than letting them sit",
      "Verify inventory availability before accepting to avoid cancellations",
      "Use a consistent packing process with quality checks before sealing each shipment",
      "Upload tracking numbers to Faire within hours of carrier pickup for fastest metric credit",
      "Include a branded packing slip, thank-you note, or business card in each shipment",
      "Follow up with the retailer 2-3 weeks after delivery to ensure satisfaction",
    ],
    full_content: "Build a repeatable order processing workflow: check orders twice daily, accept promptly, pack with quality checks, upload tracking immediately, and follow up after delivery.",
  },
  {
    title: "Analyzing Faire Analytics",
    source: "faire-knowledge",
    source_url: null,
    category: "analytics",
    tags: ["analytics", "metrics", "performance"],
    is_pinned: false,
    summary: "Faire provides analytics that reveal how retailers discover, evaluate, and purchase your products.",
    bullet_points: [
      "Monitor product views as a leading indicator of search visibility and listing discoverability",
      "Track conversion rate (views to orders) to identify listings that attract attention but fail to close",
      "Review revenue trends weekly to spot patterns, seasonal shifts, and growth opportunities",
      "Check your store health score regularly — it impacts search ranking and feature eligibility",
      "Compare performance across product categories to identify your strongest and weakest lines",
      "Use traffic source data to understand whether retailers find you through search, browse, or direct",
      "Set up a weekly analytics review routine to catch trends early and respond proactively",
    ],
    full_content: "Use Faire analytics to track views, conversion rate, revenue trends, and store health. Establish a weekly review routine to catch trends early.",
  },
  {
    title: "New Brand Application Tips",
    source: "faire-knowledge",
    source_url: null,
    category: "onboarding",
    tags: ["application", "new-brand", "setup"],
    is_pinned: false,
    summary: "Getting accepted to Faire requires a polished application that demonstrates product quality, brand readiness, and wholesale viability.",
    bullet_points: [
      "Apply with a professional branded email address — free email providers reduce credibility",
      "Have at least 10-15 products fully photographed and ready to list before applying",
      "Include a professional website or social media presence that demonstrates your brand quality",
      "Write a clear brand story that communicates your mission, target market, and unique value",
      "Demonstrate wholesale readiness with clear pricing, packaging, and fulfillment capabilities",
      "Highlight any existing retail accounts, press features, or notable achievements",
      "Be patient — Faire reviews applications manually and the process can take 1-3 weeks",
    ],
    full_content: "Apply with a professional email, 10-15 ready products, quality photography, and a clear brand story. Demonstrate wholesale readiness and highlight existing traction.",
  },
]

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function KnowledgePage() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState("All")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"articles" | "help" | "faq">("articles")
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null)
  const seeded = useRef(false)

  /* ---- Fetch ---- */
  const fetchArticles = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from("knowledge_articles")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
    setArticles(data ?? [])
    setLoading(false)
    return data ?? []
  }, [])

  /* ---- Seed if empty ---- */
  useEffect(() => {
    if (seeded.current) return
    seeded.current = true
    ;(async () => {
      const data = await fetchArticles()
      if (data.length === 0) {
        await supabase.from("knowledge_articles").insert(SEED_ARTICLES)
        fetchArticles()
      }
    })()
  }, [fetchArticles])

  /* ---- Toggle pin ---- */
  const togglePin = async (id: string, current: boolean) => {
    await supabase.from("knowledge_articles").update({ is_pinned: !current }).eq("id", id)
    fetchArticles()
  }

  /* ---- Copy summary ---- */
  const copySummary = (id: string, summary: string) => {
    navigator.clipboard.writeText(summary)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  /* ---- Filter knowledge articles ---- */
  const filtered = articles.filter((a) => {
    const matchCategory = activeCategory === "All" || a.category === activeCategory
    if (!matchCategory) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      a.title.toLowerCase().includes(q) ||
      a.summary.toLowerCase().includes(q) ||
      a.tags.some((t) => t.toLowerCase().includes(q))
    )
  })

  /* ---- Filter help articles ---- */
  const filteredHelp = HELP_ARTICLES.filter((a) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      a.title.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q)
    )
  })

  /* ---- Filter FAQs ---- */
  const filteredFaqs = FAQ_DATA.filter((f) => {
    if (!search) return true
    const q = search.toLowerCase()
    return f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
  })

  /* ---- Stats ---- */
  const totalArticles = articles.length
  const categoryCount = new Set(articles.map((a) => a.category)).size
  const pinnedCount = articles.filter((a) => a.is_pinned).length

  /* ---- Group help articles by category ---- */
  const helpByCategory = filteredHelp.reduce<Record<string, HelpArticle[]>>((acc, a) => {
    if (!acc[a.category]) acc[a.category] = []
    acc[a.category].push(a)
    return acc
  }, {})

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Knowledge Base</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Faire seller guides, best practices, help articles, and FAQs
          </p>
        </div>
        {activeTab === "articles" && (
          <Button size="lg" onClick={() => setShowDialog(true)}>
            <Plus className="size-4" />
            Add Article
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total Articles</p>
            <p className="text-2xl font-bold font-heading mt-2">{totalArticles}</p>
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-primary/10">
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
        </div>
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Categories</p>
            <p className="text-2xl font-bold font-heading mt-2">{categoryCount}</p>
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-blue-500/10">
            <FolderOpen className="h-4 w-4 text-blue-600" />
          </div>
        </div>
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Pinned</p>
            <p className="text-2xl font-bold font-heading mt-2 text-amber-600">{pinnedCount}</p>
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-amber-500/10">
            <Pin className="h-4 w-4 text-amber-600" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search articles, help docs, and FAQs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Section Tabs */}
      <div className="flex items-center gap-1 border-b">
        {([
          { key: "articles" as const, label: "Knowledge Articles" },
          { key: "help" as const, label: "Help Articles" },
          { key: "faq" as const, label: "FAQ" },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              activeTab === tab.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ============================================================ */}
      {/*  TAB: Knowledge Articles (original)                           */}
      {/* ============================================================ */}
      {activeTab === "articles" && (
        <>
          {/* Category Tabs */}
          <div className="flex items-center gap-1 border-b overflow-x-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                  activeCategory === cat
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat === "All" ? "All" : CATEGORY_LABELS[cat] ?? cat}
              </button>
            ))}
          </div>

          {/* Article List */}
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No articles found</p>
          ) : (
            <div className="space-y-3">
              {filtered.map((article, index) => {
                const isExpanded = expandedId === article.id
                const ThumbnailIcon = CATEGORY_ICONS[article.category] ?? BookOpen
                return (
                  <div key={article.id}>
                    {/* Card */}
                    <div
                      className={`rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden cursor-pointer ${
                        isExpanded ? "border-primary/30" : ""
                      }`}
                      onClick={() => setExpandedId(isExpanded ? null : article.id)}
                    >
                      <div className="flex">
                      {/* Left square thumbnail */}
                      <div
                        className="w-20 shrink-0 flex items-center justify-center"
                        style={{ background: THUMBNAIL_PATTERNS[index % THUMBNAIL_PATTERNS.length] }}
                      >
                        <ThumbnailIcon className="size-7 text-white/40" />
                      </div>
                      <div className="flex-1 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold truncate">{article.title}</h3>
                            {article.is_pinned && (
                              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {article.summary}
                          </p>
                          <div className="flex items-center gap-2 mt-3 flex-wrap">
                            <span
                              className={`border-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                                CATEGORY_BADGE[article.category] ?? "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {CATEGORY_LABELS[article.category] ?? article.category}
                            </span>
                            {article.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-xs bg-muted rounded-full px-2 py-0.5 text-muted-foreground"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="shrink-0">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      </div>
                      </div>
                    </div>

                    {/* Expanded Content — Modal */}
                    {isExpanded && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={(e) => { e.stopPropagation(); setExpandedId(null) }}>
                        <div className="bg-card border rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                          {/* Modal header */}
                          <div className="flex items-center justify-between border-b px-6 py-4 sticky top-0 bg-card z-10">
                            <h2 className="text-lg font-semibold truncate">{article.title}</h2>
                            <div className="flex items-center gap-2 shrink-0">
                              <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border hover:bg-muted">
                                <Printer className="size-3" />
                                Print
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setExpandedId(null) }} className="p-1 rounded hover:bg-muted">
                                <X className="size-4" />
                              </button>
                            </div>
                          </div>
                          {/* Modal body */}
                          <div className="px-6 py-5 space-y-4">
                        <div className="text-sm whitespace-pre-wrap text-foreground leading-relaxed">
                          {article.full_content}
                        </div>

                        {article.bullet_points && article.bullet_points.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2">Key Takeaways</h4>
                            <ul className="space-y-1.5">
                              {article.bullet_points.map((bp, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                                  {bp}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {article.source_url && (
                          <a
                            href={article.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Source
                          </a>
                        )}

                        <div className="flex items-center gap-2 pt-2 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              copySummary(article.id, article.summary)
                            }}
                          >
                            {copiedId === article.id ? (
                              <Check className="size-3.5" />
                            ) : (
                              <Copy className="size-3.5" />
                            )}
                            {copiedId === article.id ? "Copied" : "Copy Summary"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              togglePin(article.id, article.is_pinned)
                            }}
                          >
                            <Star
                              className={`size-3.5 ${
                                article.is_pinned ? "text-amber-500 fill-amber-500" : ""
                              }`}
                            />
                            {article.is_pinned ? "Unpin" : "Pin"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setExpandedId(null)
                            }}
                          >
                            Close
                          </Button>
                        </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ============================================================ */}
      {/*  TAB: Help Articles                                           */}
      {/* ============================================================ */}
      {activeTab === "help" && (
        <div className="space-y-8">
          {Object.keys(helpByCategory).length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No help articles match your search</p>
          ) : (
            Object.entries(helpByCategory).map(([category, items]) => {
              const Icon = HELP_CATEGORY_ICONS[category] ?? HelpCircle
              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${HELP_CATEGORY_BADGE[category] ?? "bg-slate-100 text-slate-600"}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <h2 className="text-lg font-semibold">{category}</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((article) => {
                      const CatIcon = HELP_CATEGORY_ICONS[article.category] ?? HelpCircle
                      return (
                        <div
                          key={article.id}
                          className="rounded-lg border border-border/80 bg-card shadow-sm p-5 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${HELP_CATEGORY_BADGE[article.category] ?? "bg-slate-100 text-slate-600"}`}>
                              <CatIcon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-semibold">{article.title}</h3>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {article.description}
                              </p>
                              <span className={`inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full ${HELP_CATEGORY_BADGE[article.category] ?? "bg-slate-100 text-slate-600"}`}>
                                {article.category}
                              </span>
                            </div>
                          </div>
                          <a
                            href={article.link}
                            className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-primary hover:underline"
                          >
                            Read more
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/*  TAB: FAQ                                                     */}
      {/* ============================================================ */}
      {activeTab === "faq" && (
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
      )}

      {/* Add Article Dialog */}
      {showDialog && (
        <AddArticleDialog
          onClose={() => setShowDialog(false)}
          onSaved={() => {
            setShowDialog(false)
            fetchArticles()
          }}
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Add Article Dialog                                                 */
/* ------------------------------------------------------------------ */

function AddArticleDialog({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: "",
    category: "listings",
    summary: "",
    full_content: "",
    tags: "",
    source_url: "",
    is_pinned: false,
  })

  const update = (field: string, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.summary || !form.full_content) return
    setSaving(true)
    const tags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
    await supabase.from("knowledge_articles").insert({
      title: form.title,
      source: "faire-knowledge",
      source_url: form.source_url || null,
      category: form.category,
      summary: form.summary,
      full_content: form.full_content,
      bullet_points: [],
      tags,
      is_pinned: form.is_pinned,
    })
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="rounded-lg border border-border/80 bg-card shadow-sm p-6 w-full max-w-2xl shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold font-heading">Add Article</h2>
          <Button variant="ghost" size="icon-xs" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Title</label>
            <Input
              placeholder="Article title"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
            <select
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {CATEGORIES.filter((c) => c !== "All").map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c] ?? c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Summary</label>
            <textarea
              placeholder="2-3 sentence summary of the article"
              value={form.summary}
              onChange={(e) => update("summary", e.target.value)}
              rows={3}
              className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none"
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Full Content
            </label>
            <textarea
              placeholder="Full article content (300-500 words recommended)"
              value={form.full_content}
              onChange={(e) => update("full_content", e.target.value)}
              rows={10}
              className="w-full min-w-0 min-h-[200px] rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-y"
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Tags (comma separated)
            </label>
            <Input
              placeholder="seo, titles, search"
              value={form.tags}
              onChange={(e) => update("tags", e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Source URL (optional)
            </label>
            <Input
              type="url"
              placeholder="https://..."
              value={form.source_url}
              onChange={(e) => update("source_url", e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_pinned}
              onChange={(e) => update("is_pinned", e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <span className="text-sm">Pin this article</span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Add Article"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
