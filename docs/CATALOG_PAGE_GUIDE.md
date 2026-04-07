# Claude Code Prompt — Faire Ops Portal
## Catalog Page · Full Build Guide

**Route:** `/catalog`  
**Replaces:** `/scraper-pipeline` (Scraper + Pipeline Kanban) + `/products` (Catalog + Inventory + Pricing)  
**Sub-tabs:** Listings | Sourcing | Publishing Queue | Image Studio | Inventory | Pricing

The Catalog section is everything product-related. Sourcing finds new products, the Publishing Queue manages them through approval, Listings shows what's live, Image Studio prepares product visuals, Inventory tracks stock, Pricing tracks margins.

---

## Sub-tab: Listings (was Products > Catalog)

**Who uses it:** Allen (daily — catalog health), Harsh (performance tracking)  
**Purpose:** Master view of all published and unpublished products across all 6 stores

### What to keep from existing Products > Catalog
- Product table with: brand, category, WS price, MSRP, stock, status
- Brand filter from dock filters this table automatically

### What to add / upgrade

**Table — new columns:**

| Column | Data | Notes |
|---|---|---|
| Opt Score | 0–100 score bar | Color: green ≥80, amber ≥60, red <60. Click opens optimization panel |
| Views (30d) | integer | From Faire analytics |
| Orders (30d) | integer | From Faire store data |
| Conversion | orders/views % | Calculated |
| Faire Direct? | Y/N chip | Whether listed on FD or only marketplace |
| Listing Link | ↗ icon | Opens faire.com listing in new tab |

**Filters toolbar (above table):**
- Brand select (or inherits from dock)
- Status: All / Published / Unpublished / Draft / Needs Attention
- Sort: Opt Score | Views | Orders | Margin | Newest | Oldest
- Search: product name or ID
- "Needs Attention" filter: shows only products with score <60, or 0 orders in 30d, or out of stock

**Row-level actions (on hover, far right):**
- Optimize → opens right panel (see Optimization Panel below)
- Edit → opens edit drawer
- Unpublish / Publish toggle
- View on Faire → opens external link
- Duplicate → copies listing to a new draft
- Move to store → reassign listing to different brand store

**Bulk actions (when rows selected):**
- Bulk price update
- Bulk unpublish
- Bulk assign to store
- Bulk add tags
- Export selected as CSV

**Optimization Panel (right side, slides in):**
Same panel from previous Orders design — shows per-field scores:
- Title (keyword coverage)
- Description (B2B language, word count)
- Images (count, has white bg, has lifestyle)
- Tags (seasonal, category tags)
- MOQ (zero MOQ set?)
- Price (above $2 minimum?)
- Auto-optimize with AI button (stub)

**Top-of-page summary row (4 metric cards):**
- Total Listings (published count)
- Needs Attention (score <60 or 0 orders)
- Total Views (30d across all)
- Avg Opt Score

---

## Sub-tab: Sourcing (was Product Scraper)

**Who uses it:** Lakshay (product decisions), Allen (sourcing daily)  
**Purpose:** Scan external sources for trending products, queue into Publishing Queue

### What to keep from existing Scraper
- Run Scrape button + progress bar animation
- Results table with: product name, source, trend signal, COGS, WS price, MSRP, margin, signal chip, queue button
- Category and source filters
- Queued state (✓ green, added to Publishing Queue)

### What to add

**Source config (visible in toolbar):**
Currently hardcoded. Show as a collapsible "Sources" section:
- Monday: ToyNetwork
- Tuesday: UtopiaBedding
- Wednesday: WonATrading
- Thursday: AliExpress / Alibaba
- Friday: Minea
- Saturday: Seasonal Research (manual)
- Sunday: Backfill (manual)
Highlight today's scheduled source with a blue dot. Show "Today: ToyNetwork" next to the Run Scrape button.

**Add "Add Manually" button:**
Not everything is found by scraping. Team also finds products manually via WhatsApp groups, supplier catalogues, trade shows. Manual add form:
- Product name
- Source (free text)
- Source URL (optional)
- COGS estimate
- Tags
- Target store

Submitting this adds to Publishing Queue > Sourced stage directly.

**Add "Saved Products" tab inside Sourcing:**
Products that were found but not yet queued. Team can save interesting products to review later. Shows a simple saved list with queue button.

---

## Sub-tab: Publishing Queue (was Pipeline Kanban)

**Who uses it:** Allen (daily — moving products through stages), Lakshay (approvals)  
**Purpose:** Visual workflow board for products moving from discovery to live listing

### What to keep from existing Pipeline Kanban
- 4-column kanban board
- Card with: name, source badge, tags, COGS/WS/Margin stats grid
- Brand selector dropdown in "Drafting" stage
- Action buttons per stage

### What to rename
- Column 1: "Sourced" → **"Sourced"** (keep)
- Column 2: "Pending Approval" → **"Drafting"** (team is writing the listing — title, description, preparing images)
- Column 3: "Approved" → **"Ready to List"** (listing is complete and approved by Lakshay, ready to publish)
- Column 4: "Live on Faire" → **"Live"** (keep — shorter)

### What to add to cards

**Drafting stage card additions:**
- "Open in Image Studio" button — links to Image Studio with this product pre-loaded
- Listing quality checklist inline on card:
  - ☐ Title written
  - ☐ Description (B2B)
  - ☐ Images processed (min 4)
  - ☐ Tags added
  - ☐ Store assigned
- Cannot move to "Ready to List" unless checklist ≥ 4/5 items checked

**Ready to List stage card additions:**
- "Push to Faire" button (was "Push to Faire Store")
- Show assigned store clearly: ● Buddha Ayurveda
- Show listing type: Marketplace / Faire Direct / Both
- Estimated payout preview: "~$12.29 net per unit"

**Live stage card additions:**
- "View on Faire" external link button
- Live since: date
- Orders since going live: count
- Quick reorder: "Add to Sourcing Queue again" (for bestsellers)

**Column header additions:**
- Each column: count badge + "avg margin: X%" in muted text below label

---

## Sub-tab: Image Studio (NEW)

**Who uses it:** Allen (listing preparation), anyone doing product photography prep  
**Purpose:** Process supplier images into Faire-ready listing images

### Concept
Raw supplier images are often: white bg with text overlays, wrong aspect ratio, low resolution, multiple products in frame. Faire requires: square 1:1, white/clean background, product-focused, min 800×800px.

Image Studio is the internal tool to go from supplier JPEG → Faire-ready listing image, without using external tools like Canva or Photoshop.

### Layout

Left panel (upload + queue):
- Drag and drop zone: "Drop supplier images here"
- Uploaded images shown as thumbnails in a vertical list
- Each thumbnail: filename, size, status badge (Queued / Processing / Done / Failed)
- "Process All" button

Right panel (editor — opens when image is selected):
- Original image preview (left)
- Processed result preview (right, live-updating)
- Processing options (checkboxes):
  - ☑ Remove background
  - ☑ Normalize to 1:1 (white fill or crop)
  - ☑ Resize to 1200×1200px
  - ☐ Enhance brightness/contrast
  - ☐ Generate lifestyle mockup
- "Apply" button
- "Download" button
- "Save to Product" dropdown (select which product in the system to attach this to)

Bottom section: processed image library
- Grid of all processed images
- Filter by: product, brand, date
- Bulk download as ZIP
- Bulk attach to product

### Creative Generator (secondary feature in Image Studio)
After processing images, optionally generate:
- **Brand banner** — landscape banner with brand logo, product image, short tagline
- **Product card** — square card with product image, name, WS price, brand logo (for email campaigns)

Template selector (dropdown): choose brand → template pre-fills brand colors and logo  
Output: PNG, ready to use in campaigns or Faire brand page

For MVP: show UI only. Mark as "AI generation coming soon" — stub the generation action.

---

## Sub-tab: Inventory (from Products > Inventory)

**Who uses it:** Allen, Khushal  
**Purpose:** Stock level monitoring across all 6 stores

### What to keep from existing
- Product list with stock levels
- Low-stock and out-of-stock indicators

### What to add
- **Restock alert threshold** per product: set min quantity, get flagged when below
- **Bulk stock update** (import via CSV — paste supplier stock update)
- **Inventory by store** toggle: see stock per brand vs aggregated
- **Velocity indicator**: at current sales rate, stock lasts X days
- **Low stock summary card** at top: "14 products below minimum threshold"

---

## Sub-tab: Pricing (from Products > Pricing)

**Who uses it:** Lakshay, Allen  
**Purpose:** Margin analysis, pricing decisions across the catalog

### What to keep from existing
- WS vs MSRP breakdown
- Margin distribution view

### What to add
- **Faire Direct pricing column**: same product — what's the net payout at 0% vs 15% commission
- **Price health flags**: highlight products where WS < $2 (poor quality signal), or margin < 40% (below threshold)
- **Bulk price update tool**: select products → set new WS price → preview margin change → apply
- **Pricing rule assistant**: stub — "Set all Home Decor products to 65% margin target" — calculates required WS prices

---

## Data Layer Additions for Catalog

Add to `src/lib/data.ts`:

```ts
// Listing optimization scores and metadata
export interface ListingHealth {
  productId: string
  optScore: number          // 0–100
  views30d: number
  orders30d: number
  conversionRate: number    // orders/views
  isFaireDirectListed: boolean
  lastUpdated: string
  issues: string[]          // e.g. ["Missing B2B description", "Only 2 images"]
}

// Publishing Queue item stages renamed
export type PublishingStage = "sourced" | "drafting" | "ready" | "live"
// Update PipelineItem to use PublishingStage instead of PipelineStage

// Image Studio item
export interface StudioItem {
  id: string
  filename: string
  originalUrl: string        // blob URL or file path
  processedUrl?: string
  status: "queued" | "processing" | "done" | "failed"
  attachedProductId?: string
  createdAt: string
  options: {
    removeBackground: boolean
    normalize: boolean
    resize: boolean
    enhance: boolean
  }
}

// Inventory health
export interface InventoryAlert {
  productId: string
  productName: string
  brand: BrandId
  currentStock: number
  minThreshold: number
  daysRemaining: number    // at current velocity
  status: "out_of_stock" | "low_stock" | "healthy"
}
```

---

## Checklist for Catalog Build

- [ ] `/catalog` redirects to `/catalog/listings`
- [ ] Sub-tab bar shows all 6 items: Listings | Sourcing | Publishing Queue | Image Studio | Inventory | Pricing
- [ ] "Publishing Queue" used everywhere — "Pipeline" or "Pipeline Kanban" never appears in UI text
- [ ] "Sourcing" label used — "Product Scraper" never appears in UI text
- [ ] Listings table includes Opt Score bar column
- [ ] Listings table includes Views (30d) and Orders (30d) columns
- [ ] Listings "Needs Attention" filter works
- [ ] Publishing Queue columns labeled: Sourced | Drafting | Ready to List | Live
- [ ] Publishing Queue Drafting cards show quality checklist
- [ ] Sourcing shows "Today's source: X" next to Run Scrape
- [ ] Sourcing has "Add Manually" button
- [ ] Image Studio sub-tab loads (stub with upload zone visible)
- [ ] Inventory shows restock threshold per product
- [ ] Pricing shows Faire Direct vs marketplace net payout comparison
