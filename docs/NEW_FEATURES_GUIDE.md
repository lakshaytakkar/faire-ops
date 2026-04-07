# Claude Code Prompt — Faire Ops Portal
## New Features Guide · Operations · WhatsApp · Blogs · API Docs · Faire Direct · Targets

---

## FEATURE 1 — Operations Section (New Top-Level Tab)

**Route:** `/operations`  
**Who uses it:** Whole team, daily  
**Purpose:** Daily work hub — tasks, reports, targets, end-of-day close, email log

### Sub-tab: Tasks (moved from standalone `/tasks`)

Move existing Tasks page here. No rebuild needed — just move the component.

Keep: Kanban board (To Do | In Progress | Review | Done), My Tasks view  
Add: Brand tag on each task card (which brand store it's for), Assignee avatar shown on card

---

### Sub-tab: Daily Report

**Who fills it:** Aditya (orders), Allen (catalog), Bharti (outreach), Harsh (compiles)  
**When:** End of day, 5–6pm

**Layout:**

Top: "Daily Report — [Today's date]" + "Submit Report" button + status "Not submitted yet" / "Submitted at 5:42pm"

Form sections (one per area):

**Orders:**
- Orders received today: [number]
- Orders accepted: [number]
- Orders marked shipped: [number]
- Late orders actioned: [number]
- Notes: [textarea]
Assigned to: Aditya

**Catalog:**
- New listings added: [number] (which brands: checkboxes)
- Products moved to "Ready to List": [number]
- Products published to Faire: [number]
- Images processed in studio: [number]
- Notes: [textarea]
Assigned to: Allen

**Outreach:**
- WhatsApp messages sent: [number]
- Email campaigns sent: [number]
- New follow-ups created: [number]
- Faire Direct invites sent: [number]
- Notes: [textarea]
Assigned to: Bharti

**Submit → generates a read-only daily summary card that can be viewed in history**

History view: table of past daily reports (date | submitted by | key numbers) — click to expand full report

---

### Sub-tab: Targets

**Who sets them:** Lakshay (monthly)  
**Who tracks:** Harsh, whole team

**Layout:**

Month selector (top right): [April 2026 ▾]

For each brand (6 rows) + Portfolio total row:

| Metric | Target | Actual | Progress | Status |
|---|---|---|---|---|
| GMV ($) | $8,000 | $4,820 | 60% | On Track |
| New Retailers | 8 | 5 | 62% | On Track |
| Faire Direct % | 25% | 0% | 0% | Off Track |
| Listings Added | 50 | 23 | 46% | At Risk |
| Late Ship % | <15% | 51.6% | — | Critical |

Progress shown as colored bar (green / amber / red)

Edit targets: "Edit Targets" button (Lakshay only) — opens inline edit mode for all target fields

Top of page: "April Snapshot" card — portfolio total GMV progress + team performance score (avg of all metrics %)

---

### Sub-tab: Day Close

**Who runs it:** Aditya, daily  
**When:** 6pm or before end of shift

**Layout — checklist format:**

```
Day Close — [Date]
─────────────────────────────────────────────────
ORDERS
☐ All pending orders accepted or actioned
☐ All accepted orders have tracking added
☐ Returns queue reviewed
☐ Late shipment % checked for all brands

CATALOG
☐ New listings added (min target: 5/store active today)
☐ Publishing queue reviewed by Lakshay
☐ Image studio queue cleared

OUTREACH
☐ Daily WhatsApp log submitted
☐ Abandoned cart follow-ups sent
☐ Email campaign results logged

REPORTING
☐ Daily Report submitted
☐ Any issues flagged to Lakshay

─────────────────────────────────────────────────
[Mark Day as Closed]
```

On submit: shows "Day closed at 6:12pm by Aditya" with a green success state  
History: past closed days shown as a calendar (green = closed on time, red = missed or late)

---

### Sub-tab: Email Log

**Who fills it:** Bharti  
**Purpose:** Log of every campaign email sent — separate from Retailers > Campaigns (strategy view)

**This is the operational daily log** — what went out today, not the analytics view.

Table columns:
| Date | Brand | Campaign Name | Segment | Sent Count | Status | Filled by |
|---|---|---|---|---|---|---|
| Apr 1 | Buddha Ayurveda | New Arrivals - April | All Contacts | 394 | Sent | Bharti |

"Add Entry" button → quick form: date, brand, campaign name, segment, count, any notes

Bharti fills this manually after sending from Faire's built-in email tool (since we don't have API access to campaign sends yet).

---

## FEATURE 2 — WhatsApp Integration (Cross-Portal)

**Not a section — a feature added to multiple pages**

### How it works

Store phone number in retailer profile. Button generates `wa.me/` link with pre-filled message.

```ts
function getWhatsAppLink(phone: string, template: string, retailerName: string): string {
  const message = template.replace("[Name]", retailerName)
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}
```

### Where to add WhatsApp buttons

**Order Detail page:**
Next to retailer name/email section. Button: green WhatsApp icon + "Message on WhatsApp"  
Template options dropdown (before opening link):
1. "Following up on your order [#ID]"
2. "Your order has been shipped — tracking: [#]"
3. "Quick check-in on your recent order"

**Retailers > Directory table:**
Add WhatsApp icon button in the row actions (alongside existing actions)  
Same template dropdown

**Retailers > Follow-ups:**
Each follow-up row has a "Send via WhatsApp" action button

### WhatsApp Log sub-tab (Retailers section)

Simple table. Bharti fills manually.

| Date | Retailer | Brand | Message Type | Sent by | Follow-up Due |
|---|---|---|---|---|---|
| Apr 1 | Twilight House of Salem | Buddha Ayurveda | Order Follow-up | Bharti | Apr 5 |

"Log WhatsApp Message" button → quick form: retailer (select), brand, message type (dropdown), notes

Message types:
- Order Follow-up
- New Arrivals
- Faire Direct Invite
- Abandoned Cart
- Dormant Reactivation
- General Check-in

---

## FEATURE 3 — Faire Direct Tracker (Retailers section)

**Route:** `/retailers/faire-direct`  
**Who uses it:** Bharti (invitations), Lakshay (tracking progress)  
**Purpose:** Track and grow the Faire Direct channel — 0% commission vs 15% marketplace

### Layout

**Top cards (4):**
- FD Revenue this month: $XXX (% of total)
- FD Retailers Count: X retailers
- Commission Saved: $XXX (FD revenue × 0.15)
- FD Target: 30% of revenue

**Section 1 — Eligible Retailers (not yet on FD)**
Table: retailer name | brand | orders | total spent | FD eligible? | Invite sent? | Action

Faire Direct eligibility criteria (based on Faire's rules):
- Ordered at least once from this brand
- Email confirmed
- Good standing (no disputes)

"Send FD Invite" button per row → logs invite in table, updates status

**Section 2 — Active FD Retailers**
Retailers already on Faire Direct.  
Table: retailer | brand | FD join date | FD orders | FD revenue | FD vs marketplace revenue split

**Section 3 — FD Invite History**
Log of all invitations: date | retailer | brand | status (Sent / Accepted / Declined / No response)

---

## FEATURE 4 — Blogs & Learning (Workspace section)

**Route:** `/workspace/blogs`  
**Who uses it:** Whole team, self-service  
**Purpose:** Keep team updated on Faire platform changes, selling strategies, seasonal tips

### Data source
Faire's public blog: faire.com/blog — specifically the "Selling on Faire" and "Brand News" categories  
Content is scraped and stored. Not real-time — manual update by Harsh monthly.

### Layout

**Filter bar:**
- Category: All | Selling Tips | Platform Updates | Seasonal | Marketing
- Read / Unread toggle
- Search

**Article grid (3 columns):**
Each card:
- Title (14px 700)
- Category chip
- Date + read time estimate ("5 min read")
- 2-line excerpt
- "Read Article →" link (opens faire.com/blog/... in new tab)
- "Mark as Read" button

**Mock articles to seed (from faire.com/blog):**
1. "How to Optimize Your Faire Listing for Discovery" — Selling Tips
2. "New Faire Analytics Dashboard: What's Changed" — Platform Updates
3. "Holiday Season Prep: Timeline for Wholesale Brands" — Seasonal
4. "How Faire Direct Works and Why It Matters" — Selling Tips
5. "Photography Guide for Wholesale Product Listings" — Selling Tips
6. "Understanding Your Faire Analytics: Impressions vs Orders" — Selling Tips

### Add to data:

```ts
export interface BlogArticle {
  id: string
  title: string
  category: "Selling Tips" | "Platform Updates" | "Seasonal" | "Marketing"
  date: string
  readTime: number  // minutes
  excerpt: string
  url: string       // faire.com URL
  isRead: boolean
}

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    id: "b1",
    title: "How to Optimize Your Faire Listing for Discovery",
    category: "Selling Tips",
    date: "Mar 15, 2026",
    readTime: 5,
    excerpt: "Faire's search algorithm prioritizes listings with complete information, strong images, and retailer-friendly policies. Here's how to optimize each element.",
    url: "https://faire.com/blog/selling/listing-optimization",
    isRead: false,
  },
  // ... add 5 more
]
```

---

## FEATURE 5 — Faire API Docs Reference (Workspace section)

**Route:** `/workspace/api-docs`  
**Who uses it:** Lakshay, future dev team  
**Purpose:** Internal reference for Faire API fields — for when we connect the backend

### Layout

Three tabs: Products Schema | Orders Schema | Retailers Schema

Each tab shows a clean reference table:

| Field Name | Type | Description | Example |
|---|---|---|---|
| id | string | Unique product identifier | "ABC123XY" |
| name | string | Product display name | "Macrame Wall Hanging" |
| wholesale_price | object | Price in minor units | { amount_minor: 1299, currency: "USD" } |
| ... | | | |

### Product schema fields to include:
id, name, description, wholesale_price, retail_price, brand_id, category_ids, tags, images, available_inventory, status (published/unpublished/draft), created_at, updated_at, option_sets (variants)

### Order schema fields:
id, brand_id, retailer_id, status (new/processing/shipped/complete/cancelled), line_items (array: product_id, quantity, unit_price), subtotal, shipping_cost, commission, net_payout, shipping_address, tracking_number, carrier, created_at, accepted_at, shipped_at, fulfilled_at

### Retailer schema fields:
id, company_name, email, phone, address (city, state, zip, country), status (active/inactive), faire_direct (boolean), total_orders, total_spent, created_at, last_order_at, notes

Add note at top: "Fields are based on Faire API v2 as of Q1 2026. Some fields may require specific API scopes. See developers.faire.com for full documentation."

---

## FEATURE 6 — Active Stores (Workspace section)

**Route:** `/workspace/stores`  
**Who uses it:** Lakshay, Allen  
**Purpose:** Manage each brand's Faire store profile, credentials, and creative assets

### Layout

6 store cards (one per brand), each showing:

```
[Brand Logo placeholder]

● Buddha Ayurveda
Home Decor

faire.com/brand/buddha-ayurveda  ↗

Status: Active
Listings: 428 published · 127 unpublished
Late Ship: 51.6% ⚠
Reviews: ★ 4.2 (8 reviews)

[Edit Store]  [Manage Creatives]
```

**Edit Store drawer:**
- Store name
- Category
- Logo upload
- Brand color (color picker)
- Faire store URL
- API key (masked, reveal button)
- Default lead time setting
- Auto-accept orders: toggle

**Manage Creatives drawer:**
- Logo (current + upload new)
- Brand banner (1200×400px recommended)
- Product card template (square, shows brand logo + product)
- "Generate with AI" button (stub for now)
- Download all assets as ZIP

---

## FEATURE 7 — Order Upgrades (Additions to Existing Orders)

### Order Detail — Additions

**Add to line items section:**
- Product thumbnail (40×40px square image)
- "View product in Catalog" link per line item

**Add Faire Direct indicator:**
Below the commission line in financials:
- If FD order: "Faire Direct — 0% commission" in green, commission shows $0.00
- If marketplace: "Marketplace — 15% commission" in muted text

**Add WhatsApp button:**
Next to retailer name/email: green WhatsApp icon button  
Opens template selector → wa.me link

**Add internal notes:**
Below the timeline section: "Internal Notes" with textarea  
"@mention" a team member — shows their name from team list  
Notes saved with timestamp + author name

### New Sub-tab: Fulfillment

**Who uses it:** Khushal (daily)  
**Purpose:** Focus view on accepted orders needing tracking

Table shows only orders with status = "accepted" + no tracking number added yet

Columns: Order ID | Retailer | Brand | Items | Date Accepted | Days Since Accepted | Fulfiller | [Add Tracking]

"Add Tracking" opens inline row form:
- Tracking number (text input)
- Carrier (dropdown: UPS / FedEx / USPS / DHL)
- Estimated delivery (date picker)
- Fulfiller: defaults to "HQ Dropshipping (Charlie)"
- Save → marks order as Shipped, closes inline form

**Bulk tracking entry:**
"Bulk Update" button → opens modal  
Paste multiple lines: `ORDER_ID, TRACKING_NUMBER, CARRIER`  
Preview table → confirm → updates all

### New Sub-tab: Supplier Quotes

**Who uses it:** Lakshay, Aditya  
**Purpose:** Before accepting some Faire orders, we check supplier pricing

Quote request table + form:

| Quote # | Linked Order | Product | Qty | Status | Supplier | Action |
|---|---|---|---|---|---|---|
| Q-001 | VXTKE5DRYW | Butterfly Lights | 2 | Quote Received | AliExpress | View |

Status flow: Draft → Awaiting Response → Quote Received → Approved → Ordered

"New Quote Request" button → form:
- Link to Faire Order (select from pending orders)
- Product name / description
- Quantity needed
- Target COGS (optional)
- Supplier name or URL
- Notes

When quote is received → log: price/unit, MOQ, lead time, shipping cost, total  
Approve → accept the linked Faire order

---

## Summary: New Files to Create

```
src/app/(portal)/
├── operations/
│   ├── page.tsx
│   ├── tasks/page.tsx        ← move from /tasks
│   ├── daily-report/page.tsx
│   ├── targets/page.tsx
│   ├── day-close/page.tsx
│   └── email-log/page.tsx
├── orders/
│   ├── fulfillment/page.tsx
│   └── quotes/page.tsx
├── retailers/
│   ├── whatsapp/page.tsx
│   └── faire-direct/page.tsx
└── workspace/
    ├── blogs/page.tsx
    ├── api-docs/page.tsx
    └── stores/page.tsx

src/components/
├── operations/
│   ├── daily-report-form.tsx
│   ├── targets-table.tsx
│   ├── day-close-checklist.tsx
│   └── email-log-table.tsx
├── retailers/
│   ├── whatsapp-button.tsx
│   ├── whatsapp-log-table.tsx
│   └── faire-direct-tracker.tsx
└── workspace/
    ├── blog-article-card.tsx
    ├── api-schema-table.tsx
    └── store-profile-card.tsx

src/lib/data.ts additions:
- BlogArticle type + BLOG_ARTICLES data
- QuoteRequest type + QUOTE_REQUESTS data
- InventoryAlert type
- DailyReport type
- Target type + MONTHLY_TARGETS data
```
