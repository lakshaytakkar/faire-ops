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
/*  Seed Data                                                          */
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
    full_content: `Your late shipment rate is one of the most scrutinized metrics in Faire's store health evaluation. Faire uses this metric to determine your search ranking, eligibility for promotional features, and overall standing on the platform. A high late shipment rate can significantly reduce your visibility and sales.

**Faire's Shipping Expectations**
By default, Faire expects brands to ship orders within 3 business days of acceptance. This timeline can be adjusted in your store settings if your products require longer processing (custom, made-to-order, etc.). The key is setting realistic expectations and then consistently meeting them. It is far better to set a 5-7 day processing time and ship early than to promise 3 days and ship late.

**How Late Shipments Impact Your Store**
Faire tracks your late shipment rate as a rolling metric. When this rate exceeds acceptable thresholds, several negative consequences can follow: reduced visibility in search results, removal from curated collections and recommendations, warning notices on your store page visible to retailers, and in severe cases, account suspension. The algorithm favors reliable brands.

**Processing Time Settings**
Review and set your processing time honestly. Go to Store Settings and set a processing time that you can consistently meet, including during busy seasons. If you have a mix of ready-to-ship and made-to-order products, set your processing time for the longest lead time and pleasantly surprise retailers by shipping faster when possible.

**Tracking Number Requirements**
Always upload tracking numbers to Faire as soon as they are available. Untracked shipments are harder for Faire to verify as on-time, and some retailers may dispute untracked deliveries. Use carriers that provide tracking by default — USPS Priority, UPS, FedEx, or equivalent services.

**Proactive Communication**
If a delay is unavoidable due to supply chain issues, high volume, or other factors, communicate with the retailer through Faire's messaging system immediately. Most retailers are understanding about delays when brands communicate proactively. Silence followed by a late shipment is far worse than a heads-up message about a delay.

**Operational Systems**
Build systems to prevent late shipments. Check for new orders at least twice daily. Maintain a packing schedule that processes orders in FIFO (first in, first out) order. Keep packaging materials stocked and ready. During peak seasons, consider hiring temporary help or extending your processing time in advance.

**Monitoring Your Rate**
Check your late shipment rate weekly in Faire's analytics dashboard. If you notice it creeping up, immediately investigate the cause — whether it is inventory issues, processing bottlenecks, or carrier delays — and take corrective action before it impacts your store health score.`,
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
    full_content: `One of the biggest mistakes new wholesale brands make on Faire is following a direct-to-consumer seasonal calendar. Retailers buy products months before they need them on shelves, meaning your seasonal strategy must be significantly ahead of consumer timing.

**The Wholesale Calendar**
Retailers typically buy for four main seasons, and their buying windows open 3-6 months before the retail season. Spring products (March-May retail): Retailers buy October-January. Summer products (June-August retail): Retailers buy January-March. Fall products (September-November retail): Retailers buy April-July. Holiday products (November-December retail): Retailers buy May-August.

**Listing Timing**
Have your seasonal products fully listed, photographed, and optimized on Faire at the beginning of each buying window. If your spring candles are not on Faire until February, you have already missed most of the buying window. Early listers also benefit from less competition — the retailers shopping earliest are often the most serious buyers with the largest budgets.

**Inventory Planning**
Work backward from wholesale buying windows to plan your production schedule. If retailers need to order holiday products by August, and your production takes 6-8 weeks, you need to start production by June at the latest. Factor in photography, listing creation, and quality control time as well.

**Seasonal Collection Strategy**
Create dedicated collections on Faire for each season and prominently feature them on your store page. Update your store banner and featured products to match the current buying season. Retailers who visit your store should immediately see seasonally relevant products without scrolling.

**Faire Markets**
Faire hosts virtual market events aligned with the main buying seasons. These are essentially online trade shows where Faire promotes participating brands to retailers. Watch for market event announcements and apply to participate — they drive significant traffic and orders, especially during key seasonal transitions.

**Marketing Windows**
Align your retailer outreach, email campaigns, and Faire Direct pushes with the start of buying windows. Send targeted messages highlighting new seasonal offerings, any early-order discounts, and bestseller data from previous seasons. Retailers making buying decisions respond well to data that helps them choose confidently.

**Year-Round Products**
Even if your products are not explicitly seasonal, you can create seasonal relevance through your marketing and merchandising. A general-purpose product can be positioned as a "holiday gift" in summer buying windows or a "spring refresh" item in winter. Adapt your descriptions and photography to resonate with the current buying season.`,
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
    full_content: `On Faire, repeat orders from existing retailers are more profitable (15% vs 25% commission) and require less effort than acquiring new customers. Building strong retailer relationships is therefore one of the highest-ROI activities for your wholesale business.

**The First Order Follow-Up**
Within 24 hours of receiving a new order, send a personalized message through Faire's messaging system. Thank the retailer by name, acknowledge their store, and express genuine appreciation. This simple step sets you apart from the majority of brands that send no communication at all. Include a note about your typical shipping timeline and any care/display tips for the products they ordered.

**Post-Delivery Check-In**
Two to three weeks after the order is delivered, reach out to ask how the products are performing. This shows you care about their success, not just the initial sale. Ask about customer feedback, sell-through rate, and whether they need any display materials or marketing assets. This check-in often naturally leads to reorder conversations.

**Monthly Touchpoints**
Establish a regular communication cadence with your retailer base. Monthly updates work well — share new product launches, restocked bestsellers, seasonal collections, and any promotions. Keep messages concise and valuable. Retailers are busy; respect their time by providing actionable information, not lengthy newsletters.

**Personalization Strategy**
Segment your retailers by store type (boutique, gift shop, specialty, etc.), location, order history, and average order value. Tailor your outreach based on these segments. A coastal gift shop has different needs than an urban home goods boutique. Reference their specific store when reaching out — "I think our new beach-themed collection would be perfect for your Coastal Living store" lands much better than a generic blast.

**Faire Direct Conversion**
Your strongest retail relationships should be migrated to Faire Direct. After a retailer has reordered 2-3 times through the marketplace, invite them to use your Faire Direct link. Position it as a benefit for them (Net 60 terms, free returns) rather than a cost savings for you. Most retailers are happy to switch when they understand the benefits.

**Handling Issues**
When problems arise — damaged shipments, quality issues, late deliveries — respond quickly and generously. Offer replacements, credits, or refunds without making the retailer fight for resolution. A well-handled issue often strengthens a relationship more than a flawless transaction. Retailers remember brands that stand behind their products.

**Top Retailer Program**
Consider creating an informal top retailer program for your highest-volume accounts. Offer early access to new collections, exclusive colorways or products, priority shipping during busy seasons, or volume-based discounts. These incentives reward loyalty and create switching costs that keep retailers ordering from you.`,
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
    full_content: `Tags are Faire's secondary search mechanism after product titles. While titles carry the most weight, tags create additional discovery paths that can significantly increase your product's visibility to retailers browsing the platform.

**Tag Strategy Fundamentals**
Faire allows multiple tags per product listing. Use every available slot. Each tag creates an additional way for retailers to discover your product through search and filtered browsing. Think of tags as additional keywords that describe your product from different angles — material, style, use case, occasion, recipient, color, and more.

**Broad vs. Specific Tags**
Use a combination of broad and specific tags. Broad tags like "home decor," "candles," or "jewelry" cast a wide net and put your product in highly trafficked categories. Specific tags like "soy candle," "minimalist earrings," or "farmhouse sign" target retailers with specific buying intent who are more likely to convert. The combination of both maximizes your discovery potential.

**Category Selection**
Choosing the right product category is separate from tagging but equally important. Always select the most specific category available. If Faire offers "Jewelry > Earrings > Stud Earrings," choose that over just "Jewelry" or "Jewelry > Earrings." More specific categories mean less competition within your browse results and better matching with retailer intent.

**Competitive Tag Research**
Browse top-performing products in your category and note which tags they use. While you cannot directly see all tags, you can infer them from the categories and search results where those products appear. Search for terms you think retailers would use and see which products rank highest — their tags are likely optimized for those terms.

**Material and Attribute Tags**
Always include tags for materials (ceramic, cotton, sterling silver, soy wax), construction methods (hand-poured, handmade, machine-knit), and key attributes (organic, sustainable, vegan, hypoallergenic). Retailers often filter by these attributes, especially those with niche store concepts or customer bases with specific preferences.

**Seasonal and Occasion Tags**
Add seasonal and occasion-based tags when relevant. Tags like "holiday gift," "mother's day," "stocking stuffer," or "summer collection" help your products appear in seasonal search queries. Update these tags as seasons change — add holiday-related tags in May-June when retailers are buying for the holiday season.

**Tag Maintenance**
Review and update your tags quarterly. Remove underperforming or irrelevant tags and add new ones based on trending search terms you notice in Faire analytics. Tag optimization is an ongoing process, not a one-time setup. As Faire's search algorithm evolves and retail trends shift, your tag strategy should adapt accordingly.`,
  },
  {
    title: "Managing Inventory on Faire",
    source: "faire-knowledge",
    source_url: null,
    category: "inventory",
    tags: ["inventory", "stock", "management"],
    is_pinned: false,
    summary: "Effective inventory management on Faire prevents overselling, reduces cancellations, and maintains healthy store metrics. This guide covers stock settings, backorders, and inventory alerts.",
    bullet_points: [
      "Keep Faire inventory counts accurate and updated — overselling leads to cancellations that hurt your metrics",
      "Use the backorder feature for made-to-order products with clear lead time expectations",
      "Set up low-stock alerts to trigger restocking before items sell out completely",
      "Mark products as out-of-stock rather than deleting listings to preserve SEO and review history",
      "Sync inventory across all sales channels if you sell on multiple platforms",
      "Set Minimum Order Quantities (MOQ) that balance retailer accessibility with operational efficiency",
      "Review inventory velocity weekly to identify fast-movers and slow-movers",
    ],
    full_content: `Inventory management on Faire directly impacts your store health, customer satisfaction, and profitability. Poor inventory management leads to overselling, order cancellations, and negative retailer experiences — all of which Faire tracks and penalizes.

**Inventory Accuracy**
The most important inventory principle on Faire is accuracy. If your listing shows 50 units available, you need to have 50 units ready to ship. Overselling — accepting orders for products you do not have — results in cancellations that damage your store health score, frustrate retailers, and reduce your search visibility. Update inventory counts whenever stock changes, whether from Faire orders, other sales channels, or physical inventory adjustments.

**Multi-Channel Sync**
If you sell across multiple platforms (Faire, your own website, other wholesale channels, retail), implement inventory syncing. Manual tracking across channels is error-prone and eventually leads to overselling. Consider inventory management software that can push and pull stock levels across all your sales channels in real time.

**Backorder vs. Out of Stock**
Faire offers a backorder option for products that are temporarily unavailable but can be produced. Use backorder for made-to-order products with clear lead times. Use out-of-stock status for products where you have no timeline for restocking. Never leave a listing active with zero inventory if you cannot fulfill orders — this is a common source of cancellations.

**Low Stock Alerts**
Monitor your inventory levels proactively. Set internal alerts when products drop below a threshold (e.g., 20% of typical stock level). This gives you time to reorder materials, schedule production, and restock before items sell out completely. Running out of your bestsellers during a peak buying window is a costly missed opportunity.

**MOQ Strategy**
Minimum Order Quantities should balance two competing goals: making it easy for new retailers to try your products (lower MOQ) and maintaining operational efficiency (higher MOQ). A common approach is MOQ of 4-6 units per SKU for new retailer accessibility, with case-pack incentives for larger orders. For made-to-order items, MOQs may need to be higher to justify production runs.

**Inventory Velocity Analysis**
Review your inventory velocity weekly — how quickly each SKU sells relative to its stock level. Fast movers need proactive restocking and possibly larger production runs. Slow movers may need listing optimization, repositioning, price adjustments, or eventual discontinuation. This analysis should drive your production planning and purchasing decisions.

**Seasonal Inventory Planning**
Plan inventory builds around wholesale buying windows, not retail seasons. If retailers order holiday products in June-August, your inventory needs to be fully built by June. Factor in production lead times, material availability, and potential supply chain delays. Being understocked during a key buying window means lost revenue you cannot recapture.`,
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
    full_content: `Your Faire store page is your digital wholesale showroom. When retailers click through from search results or recommendations, your store branding determines whether they spend time browsing your full catalog or click back to continue searching. A polished, professional brand presence signals credibility and quality.

**Logo Requirements**
Upload a clean, high-resolution logo at minimum 400x400 pixels. Use a transparent PNG for the cleanest display across Faire's various backgrounds. Your logo should be legible at small sizes since it appears as a small icon in search results and retailer dashboards. Avoid overly complex logos with fine details that become illegible when scaled down.

**Banner Image**
Your store banner is the hero image of your Faire shop. Design it at 1600x400 pixels for optimal display. Use this space strategically — showcase your product range, communicate your brand aesthetic, or highlight seasonal collections. Avoid cluttering the banner with text (it may be hard to read on mobile) and instead let strong product photography and your brand colors do the talking.

**Brand Story**
Write a compelling brand story that helps retailers understand who you are and why they should carry your products. Include your founding story (why you started), your production approach (handmade, ethically sourced, etc.), your target retail customer, and what makes your products unique. Keep it under 300 words — concise, authentic, and focused on what matters to retailers.

**Visual Consistency**
Maintain a cohesive visual language across your entire Faire presence. This means consistent photography styles (same lighting, backgrounds, editing), consistent use of brand colors, and a unified aesthetic that makes your store feel curated rather than thrown together. When a retailer browses your catalog, every product should clearly feel like it belongs to the same brand.

**Store Organization**
Organize your products into logical collections that make browsing easy for retailers. Group by product type, collection theme, or season. Feature your bestsellers and newest products prominently. A well-organized store helps retailers find what they need quickly and discover products they might not have searched for specifically.

**Trust Signals**
Include any relevant certifications, awards, press features, or sustainability credentials in your brand profile. Retailers look for signals that a brand is legitimate, established, and aligned with their customers' values. If you are a certified B-Corp, use organic materials, or have been featured in notable publications, make that visible.

**Update Regularly**
Your store page should not be static. Update your banner seasonally, rotate featured products, refresh your brand story as your business evolves, and keep your collections current. An active, frequently updated store signals to retailers that your brand is thriving and engaged.`,
  },
  {
    title: "Order Processing Workflow",
    source: "faire-knowledge",
    source_url: null,
    category: "fulfillment",
    tags: ["orders", "processing", "workflow"],
    is_pinned: false,
    summary: "A streamlined order processing workflow ensures fast fulfillment, accurate shipments, and strong store health metrics on Faire. This guide covers the complete workflow from acceptance to delivery.",
    bullet_points: [
      "Check for new orders at least twice daily — morning and afternoon at minimum",
      "Accept orders promptly within a few hours of receiving them rather than letting them sit",
      "Verify inventory availability before accepting to avoid cancellations",
      "Use a consistent packing process with quality checks before sealing each shipment",
      "Upload tracking numbers to Faire within hours of carrier pickup for fastest metric credit",
      "Include a branded packing slip, thank-you note, or business card in each shipment",
      "Follow up with the retailer 2-3 weeks after delivery to ensure satisfaction",
    ],
    full_content: `A reliable, repeatable order processing workflow is the backbone of your Faire business. Consistent fulfillment builds your store health score, earns positive retailer reviews, and keeps your products visible in Faire's search algorithm.

**Step 1: Order Receipt and Review**
Check your Faire dashboard for new orders at least twice daily. When a new order arrives, review it carefully: verify the products ordered, check quantities against your available inventory, and note any special instructions from the retailer. If everything looks good, move to acceptance. If there are issues (inventory shortages, discontinued items), message the retailer immediately to discuss alternatives.

**Step 2: Order Acceptance**
Accept orders promptly — ideally within a few hours of receipt. Delayed acceptance pushes back your entire fulfillment timeline and starts the clock on retailer expectations. When you accept, Faire notifies the retailer that their order is being processed. This notification sets expectations, so accept only when you are committed to fulfilling the order within your stated processing time.

**Step 3: Picking and Packing**
Process orders in FIFO (first in, first out) order to ensure the oldest orders ship first. Create a pick list for each order and pull products from inventory. Before packing, perform a quality check — inspect each item for defects, damage, or incorrect variants. Pack products securely using appropriate materials for the product type. Fragile items need extra protection. Include inner packaging that reflects your brand quality.

**Step 4: Branded Extras**
Include a branded packing slip with the order details, a thank-you note (handwritten if volume allows), your business card or branded insert with reorder information, and any relevant care instructions or display suggestions. These small touches differentiate you from brands that ship products in plain brown boxes with no personal touch.

**Step 5: Shipping and Tracking**
Choose a carrier and service level appropriate for the order value and contents. Generate a shipping label, apply it to the package, and schedule a carrier pickup or drop-off. Upload the tracking number to Faire immediately — do not wait until the end of the day. Faire's fulfillment metrics start tracking from the moment the order is marked as shipped with tracking.

**Step 6: Post-Ship Communication**
Once the order ships, send a brief message through Faire letting the retailer know their order is on its way. Include the estimated delivery date and a note that you are available if they have any questions. This proactive communication builds trust and reduces "where is my order" inquiries.

**Step 7: Delivery Follow-Up**
Two to three weeks after the tracking shows delivery, follow up with the retailer. Ask if everything arrived in good condition, if they have questions about displaying the products, and if there is anything else you can help with. This touchpoint often leads naturally to reorder conversations and strengthens the retailer relationship.

**Building Systems**
As your order volume grows, systematize each step. Create checklists, designate packing stations, batch similar orders together, and establish cut-off times for same-day shipping. The brands that scale successfully on Faire are those that build repeatable operational systems early.`,
  },
  {
    title: "Analyzing Faire Analytics",
    source: "faire-knowledge",
    source_url: null,
    category: "analytics",
    tags: ["analytics", "metrics", "performance"],
    is_pinned: false,
    summary: "Faire provides analytics that reveal how retailers discover, evaluate, and purchase your products. Understanding these metrics helps you optimize listings and grow revenue strategically.",
    bullet_points: [
      "Monitor product views as a leading indicator of search visibility and listing discoverability",
      "Track conversion rate (views to orders) to identify listings that attract attention but fail to close",
      "Review revenue trends weekly to spot patterns, seasonal shifts, and growth opportunities",
      "Check your store health score regularly — it impacts search ranking and feature eligibility",
      "Compare performance across product categories to identify your strongest and weakest lines",
      "Use traffic source data to understand whether retailers find you through search, browse, or direct",
      "Set up a weekly analytics review routine to catch trends early and respond proactively",
    ],
    full_content: `Faire provides a suite of analytics tools that reveal how your brand performs on the platform. These metrics are not just vanity numbers — they are actionable signals that should inform your listing optimization, pricing decisions, inventory planning, and marketing strategy.

**Product Views**
Views represent the number of times retailers have seen your product listing. This is your top-of-funnel metric — high views indicate strong search visibility and effective titles/images. Low views suggest your products are not appearing in search results, meaning you need to optimize titles, tags, and categories. Track views at both the store and individual product level.

**Conversion Rate**
Conversion rate measures the percentage of product views that result in an order. This is the most actionable metric in your arsenal. A product with high views but low conversion has a visibility problem it has already solved — the issue is in the listing itself (price, description, images, or MOQ). A product with low views but high conversion is underexposed — invest in improving its search optimization to get more eyes on it.

**Revenue Trends**
Review revenue data weekly to identify trends. Look for weekly patterns (certain days of the week may be stronger), monthly trends (buying cycles), and seasonal patterns (holiday rushes, post-holiday lulls). Compare year-over-year data when available to measure real growth. Revenue spikes often correlate with Faire market events, email features, or seasonal buying windows.

**Store Health Score**
Faire calculates a store health score based on several factors: late shipment rate, cancellation rate, response time to messages, and return rate. This score directly impacts your search ranking and eligibility for featured placements. Monitor it regularly and address any declining metrics immediately. A green/healthy score should be maintained at all costs.

**Traffic Sources**
Understanding where your traffic comes from helps you allocate effort appropriately. Faire typically breaks down traffic into search (retailers finding you through Faire search), browse (retailers browsing categories or collections), direct (retailers who know your brand and navigate directly), and external (traffic from Faire Direct links or other outside sources). If search drives most of your traffic, invest in SEO optimization. If direct traffic is high, your brand awareness is strong.

**Product-Level Analysis**
Do not just look at store-level aggregates. Analyze performance at the individual product level. Identify your top performers (high views, high conversion, high revenue) and understand what makes them successful. Apply those lessons to underperforming listings. Also identify products with declining metrics — they may need refreshed images, updated descriptions, or pricing adjustments.

**Competitive Context**
While Faire does not provide direct competitor analytics, you can infer competitive dynamics from your own data. If views suddenly drop for a category, new competitors may have entered. If conversion drops despite stable views, competitors may have improved their offerings or lowered prices. Use your analytics as a window into the broader competitive landscape.

**Weekly Review Routine**
Establish a weekly analytics review session. Check views, conversions, revenue, store health, and traffic sources. Note any significant changes from the previous week. Create action items for any metrics that need attention. Consistent monitoring prevents small issues from becoming big problems and helps you catch opportunities early.`,
  },
  {
    title: "New Brand Application Tips",
    source: "faire-knowledge",
    source_url: null,
    category: "onboarding",
    tags: ["application", "new-brand", "setup"],
    is_pinned: false,
    summary: "Getting accepted to Faire requires a polished application that demonstrates product quality, brand readiness, and wholesale viability. This guide covers what Faire evaluates and how to maximize your approval chances.",
    bullet_points: [
      "Apply with a professional branded email address — free email providers reduce credibility",
      "Have at least 10-15 products fully photographed and ready to list before applying",
      "Include a professional website or social media presence that demonstrates your brand quality",
      "Write a clear brand story that communicates your mission, target market, and unique value",
      "Demonstrate wholesale readiness with clear pricing, packaging, and fulfillment capabilities",
      "Highlight any existing retail accounts, press features, or notable achievements",
      "Be patient — Faire reviews applications manually and the process can take 1-3 weeks",
    ],
    full_content: `Faire reviews every brand application to maintain marketplace quality. Understanding what the review team looks for helps you present the strongest possible application and increase your chances of approval.

**Application Basics**
Apply using a professional email address associated with your brand domain (you@yourbrand.com), not a free provider like Gmail or Yahoo. This immediately signals professionalism and legitimacy. If you do not have a branded email, set one up before applying — it is worth the small investment.

**Product Readiness**
Before applying, have at least 10-15 products fully ready to list. This means professional photography, written descriptions, set prices, and available inventory. Faire wants to see that you can populate a credible store page from day one. Applying with "I plan to have products ready soon" significantly reduces your approval chances.

**Professional Online Presence**
Faire's review team will check your website, social media accounts, and overall online presence. Ensure your website is professional, functional, and showcases your products well. Active social media accounts with real engagement demonstrate brand traction. If your Instagram has 50 followers and no product photos, invest time in building it up before applying.

**Brand Story and Positioning**
Your application should clearly articulate who you are, what you make, who your target retail customer is, and what makes your products unique. Faire is looking for brands that fill a niche or offer something distinctive. Generic products without a clear brand story or point of differentiation face higher rejection rates.

**Wholesale Readiness**
Demonstrate that you understand wholesale business fundamentals. Have wholesale pricing established (not just retail prices divided by two), minimum order quantities set, packaging suitable for wholesale shipment, and the operational capacity to fulfill orders reliably. Faire wants brands that can handle wholesale volume and deliver a professional experience to retailers.

**Existing Traction**
If you already sell to retail stores, mention it. Include the number of current retail accounts, any notable store names, and your wholesale revenue if impressive. If you have press features, awards, or notable achievements, highlight them. Existing traction signals that retailers already validate your products.

**Product Photography Quality**
This cannot be overstated — your product images are likely the most scrutinized element of your application. Faire's review team sees thousands of applications and can immediately distinguish between professional photography and phone snapshots. Invest in quality images before applying. White background hero shots, lifestyle images, and detail close-ups demonstrate product quality and brand professionalism.

**Application Tips**
Be thorough but concise in your application responses. Answer every question completely. Upload your best product images. Double-check all links to ensure they work. If you are rejected, you can typically reapply after improving the areas identified as weaknesses. Use the feedback constructively — many successful Faire brands were not accepted on their first application.

**Post-Acceptance Setup**
If approved, prioritize completing your store setup quickly. Upload all products, optimize titles and descriptions, set up your brand page, and configure shipping settings. Faire may feature new brands, so having a complete, polished store when you launch maximizes the benefit of any initial visibility boost.`,
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

  /* ---- Filter ---- */
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

  /* ---- Stats ---- */
  const totalArticles = articles.length
  const categoryCount = new Set(articles.map((a) => a.category)).size
  const pinnedCount = articles.filter((a) => a.is_pinned).length

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Knowledge Base</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Faire seller guides, best practices, and insights
          </p>
        </div>
        <Button size="lg" onClick={() => setShowDialog(true)}>
          <Plus className="size-4" />
          Add Article
        </Button>
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
          placeholder="Search articles by title, summary, or tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

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
