# Faire Ops Portal — Master Change Guide
## Full Audit · What to Add · Remove · Rename · Restructure

**Based on:** Built portal (screenshot) + FAIRE-OPS-OVERVIEW.md + full session context  
**Stack:** Next.js 16 · React 19 · Tailwind CSS 4 · Plus Jakarta Sans · shadcn/ui · Light theme

---

## 1. What's Already Built (Current State)

**Layout:** Narrow brand dock (far left) + horizontal top nav tabs + sub-tab bar per section  
**Theme:** Light — white cards, blue gradient hero on dashboard, blue primary actions  
**Font:** Plus Jakarta Sans (keep this — different from dark theme we explored)

**31 existing screens across:**
```
Dashboard | Orders | Scraper & Pipeline | Products | CRM & Outreach | Analytics | Tasks | More
```

**Team (6 people, assign to features below):**
- Lakshay — Founder (strategy, approvals, sourcing decisions)
- Aditya — Operations Manager (orders, fulfillment)
- Khushal — Fulfillment Lead (shipping, tracking)
- Bharti — CRM Specialist (retailers, outreach)
- Allen — Product Manager (catalog, pipeline, pricing)
- Harsh — Analytics Lead (reports, targets)

---

## 2. Navigation Restructure

### The Core Problem

"Scraper & Pipeline" is meaningless to anyone outside the team. "Pipeline" sounds like software infrastructure, not a product publishing workflow. "Products" and "Scraper & Pipeline" are two tabs that actually belong together — both are about catalog management.

### Rename Decision Table

| Current | Problem | Rename To | Reason |
|---|---|---|---|
| Scraper & Pipeline | Jargon. Two unrelated-sounding words. | **Catalog** | This tab is where all product work happens — sourcing, optimizing, publishing, managing active listings |
| Products | Redundant with above. "Products" is vague. | Merge into Catalog | Active listings, inventory, and pricing move under Catalog sub-tabs |
| CRM & Outreach | Accurate but heavy | **Retailers** | Direct. "Retailers" is who this section is about |
| Tasks | Fine — keep | **Tasks** | Keep |
| More | A dumping ground | **Workspace** | Better name for team tools, chat, settings |

### New Top Navigation

**All Brands (8 tabs):**
```
Dashboard | Orders | Catalog | Retailers | Analytics | Operations | Tasks | Workspace
```

**Single Brand (6 tabs):**
```
Dashboard | Orders | Catalog | Retailers | Analytics | Operations
```

### Why "Operations" is New

Currently "Tasks" is a standalone tab and "More" is a dumping ground. A lot of Faire-specific daily work (email campaign logs, targets, day close, daily reports, WhatsApp contact log) has no home. "Operations" becomes the team's daily work hub — tasks, reports, targets, end-of-day close.

---

## 3. Full Section Map (Before → After)

---

### SECTION: Dashboard
**Status: Keep + Upgrade**

Current: Hero banner, 4 stat cards, active orders list, alerts list  
Keep all of this.

**Add:**
- **Quick Actions strip** — "Accept All Pending", "View Late Shipments", "Open Outreach Queue" — one-click shortcuts below the hero
- **Daily snapshot widget** — Today's orders, today's outreach sent, today's listings added — Harsh's domain
- **Brand health row** — 6 brand pills, each showing late ship %, FD %, color-coded health. Currently just a table in the alert card — make it prominent
- **Faire Direct %** metric card — currently missing from dashboard, it's a critical KPI

**Remove:**
- Nothing to remove — the current dashboard screenshot looks solid

---

### SECTION: Orders
**Status: Keep + Extend**

Current sub-tabs: All Orders | Order Detail | Pending | Returns

**Keep all existing sub-tabs.**

**Add sub-tab: Fulfillment**
Dedicated view for Khushal — orders that have been accepted and need tracking added. Shows accepted + shipped orders, bulk tracking update form, fulfiller assignment (HQ Dropshipping / Charlie), carrier selection, estimated delivery.

**Add sub-tab: Supplier Quotes (PO Flow)**
When placing a new order with a supplier before accepting a Faire retailer order, team sometimes needs to check supplier pricing first. This is the internal quotation workflow:
1. Create quote request (link to Faire order, specify product, qty)
2. Log supplier response (price per unit, MOQ, lead time)
3. Approve → proceed to accept the Faire order
4. Track quote status: Draft → Sent → Received → Approved → Ordered

**Upgrade: Order Detail page**
- Add product thumbnails next to line items (currently just text)
- Add Faire Direct indicator (0% commission vs 15%)
- Add WhatsApp button next to retailer info (opens wa.me link with pre-filled message)
- Add tracking update inline (no separate page needed)
- Add internal notes with team @mentions

**Upgrade: Returns sub-tab**
Current: Approval workflow and status tracking  
Add: Return reason tags, replacement order flow, credit note tracker

---

### SECTION: Catalog (was Scraper & Pipeline + Products)
**Status: Complete Restructure — Most Changed Section**

This is the biggest change. "Products" and "Scraper & Pipeline" are being merged into one logical section called "Catalog" because all product work happens here.

**New sub-tab structure:**

| Sub-tab | Was | What It Does |
|---|---|---|
| **Listings** | Products > Catalog | Active published products across all Faire stores. Full table with brand, category, WS price, MSRP, margin, stock, views, orders, optimization score, status |
| **Sourcing** | Scraper & Pipeline > Product Scraper | Trend scanning tool — Minea, AliExpress, ToyNetwork, Alibaba, Faire New Arrivals. Queue products into Publishing Queue |
| **Publishing Queue** | Scraper & Pipeline > Pipeline Kanban | 4-column board: Sourced → Draft → Approved → Live. "Pipeline" renamed to "Publishing Queue" — clear intent: products waiting to be published |
| **Image Studio** | NEW | AI-powered image optimization and creative generation for listings. Upload supplier images → remove background → normalize for Faire → generate lifestyle mockups |
| **Inventory** | Products > Inventory | Stock levels, low-stock alerts, out-of-stock flags |
| **Pricing** | Products > Pricing | WS vs MSRP analysis, margin brackets, Faire Direct pricing comparison |

**Why "Publishing Queue" not "Pipeline":**
"Publishing Queue" tells anyone instantly what this is: products in a queue, waiting to be published. "Pipeline" is a technical metaphor that requires explanation.

**Listings sub-tab — what to add beyond current:**
- Optimization score per listing (0–100) with color bar
- Top sellers flagged with crown icon
- "Needs attention" filter (low views, low orders, outdated images)
- Bulk actions: bulk price update, bulk unpublish, bulk re-optimize
- Per-product quick stats: views (30 days), orders (30 days), conversion rate
- Link to Faire listing (external link icon)
- Assigned store clearly shown with brand dot

**Publishing Queue — rename "Pipeline Kanban" to "Publishing Queue":**
- Column 1: **Sourced** (found by team or from Scraper)
- Column 2: **Drafting** (being written — title, description, images being prepared) — rename from "Pending Approval"
- Column 3: **Ready to List** (approved, store assigned, ready to publish) — rename from "Approved"
- Column 4: **Live on Faire** (published) — keep

**Image Studio — new sub-tab (major addition):**
This is where Allen and the team prepare product images before listing.

Features:
- Upload raw supplier images (JPEG, PNG, WebP)
- Background removal (AI)
- Faire listing normalization (1:1 ratio, white background, correct resolution)
- Bulk processing — process 10+ images at once
- Lifestyle mockup generation — place product in room/shelf context using AI
- Creative banner generator — brand-consistent banners with brand logo, product, price
- Image history — previously processed images stored per product
- Export as ZIP or direct-push to listing draft

---

### SECTION: Retailers (was CRM & Outreach)
**Status: Rename + Upgrade**

Rename "CRM & Outreach" to "Retailers" — cleaner, more direct.

**Keep existing sub-tabs:** Retailers list | Outreach campaigns | Follow-ups

**Add: WhatsApp column in Retailers table**
Each retailer row gets a WhatsApp icon button. Clicking opens `wa.me/{phone}?text=Hi [Name], following up on...` with a pre-filled message template selected from a dropdown. Phone number stored in retailer profile.

**Add: WhatsApp Log sub-tab**
Track all WhatsApp messages sent to retailers — date, retailer, message type, follow-up due. Bharti's daily log.

**Add sub-tab: Campaigns**
Rename "Outreach" to "Campaigns" — email campaign daily log:
- Campaign name, date sent, brand, segment, open rate, click rate, revenue attributed
- Daily log view (filter by today, this week, this month)
- Template library (same 6 templates we designed)

**Add sub-tab: Faire Direct**
Dedicated sub-tab for Faire Direct tracking — the highest-margin channel (0% vs 15% commission):
- Retailers eligible for FD invitation
- Retailers already on FD (with FD revenue %)
- FD invite history (sent/accepted/declined)
- FD revenue vs marketplace revenue per brand
- Target: 30% of revenue via FD

---

### SECTION: Analytics
**Status: Keep + Upgrade**

Current sub-tabs: Revenue | Traffic | Brands

**Keep all three.**

**Add sub-tab: Stores**
Store-level performance — active listings per store, late shipment %, Faire Direct %, review count, ranking health. Currently this is partially in Dashboard but needs its own Analytics page with historical charts.

**Add sub-tab: Products**
Top performing products by orders, views, conversion. Bottom performers (low views despite being listed). Missing data flags (products with no views = possible listing issue).

**Upgrade: Revenue sub-tab**
- Add commission savings tracker (FD orders saved X in commission)
- Add payout history table (matches current Payout Tracker in Excel)
- Add net margin per brand (after Faire commission + shipping)

---

### SECTION: Operations (NEW — replaces standalone Tasks)
**Status: New section, combines Tasks + new daily ops tools**

This is the team's daily work hub. Things that don't belong in any product or retailer section but are essential daily actions.

**Sub-tabs:**

| Sub-tab | What It Does |
|---|---|
| **Tasks** | Kanban board (from existing Tasks tab) — moved here. Assign tasks to team members with priority, due date, brand tag |
| **Daily Report** | End-of-day summary form. Team fills in: orders actioned, listings added, outreach sent, issues flagged. Auto-generates a daily ops summary. Harsh's reporting home base |
| **Targets** | Monthly targets vs actuals per brand — GMV, new retailers, FD%, listings added, late ship%. Lakshay sets targets, team tracks actuals. Visual progress bars |
| **Day Close** | End-of-day checklist. Aditya runs this. Items: all pending orders actioned ✓, tracking updated ✓, outreach logged ✓, pipeline reviewed ✓. Marks day as closed |
| **Email Log** | Daily email campaign log — separate from Retailers > Campaigns (that's strategy). This is the operational log: what got sent today, by whom, to which segment, any bounces |

---

### SECTION: Tasks
**Status: Move into Operations**

Currently a top-level tab. Move it to Operations > Tasks sub-tab. This frees up a top-nav slot.

---

### SECTION: Workspace (was More)
**Status: Rename + Minor Restructure**

"More" is a dumping ground. "Workspace" is more intentional — it's the team's internal tools.

**Keep all existing pages:** Team | Roles | Inbox | Chat | Settings | Account

**Add page: Blogs & Learning**
Scraped content from Faire's public blog (faire.com/blog) — seller-relevant articles only. Not for public, just for internal team education. Shows: article title, date, category, read time, summary. Filter by topic (Marketing, Fulfillment, Product Listing, Faire Updates). Link opens full article in new tab.

**Add page: Faire API Docs**
Internal reference for the team (especially for future backend work). Three schema reference panels:
- **Products Schema** — fields from Faire API product endpoint
- **Orders Schema** — fields from Faire API order endpoint
- **Retailers Schema** — fields from Faire API customer/retailer endpoint
Each shown as a clean read-only table: field name | type | description | example value. Pulled from faire.com/api docs.

**Add page: Active Stores**
Brand identity management — each of the 6 stores gets a profile card showing:
- Store logo (upload/manage)
- Brand color
- Store URL on Faire
- Current listing count, review count, late ship %
- Store-level settings (commission threshold, auto-accept rules)
- Creatives section: brand banner, product card template

---

## 4. Features to Add Across Portal (Cross-Cutting)

### WhatsApp Integration
- Add WhatsApp button on: Order Detail page (next to retailer name), Retailer detail drawer, Retailers table rows
- Pre-filled message templates selectable from dropdown
- `wa.me/` link format — no API needed, just opens WhatsApp with pre-filled text
- Store phone number in retailer profile

### Supplier Quote / PO Flow
New workflow for supplier orders (separate from Faire retailer orders):
- Create a quote request linked to an incoming Faire order
- Log supplier response: price/unit, MOQ, lead time, shipping cost
- Accept quote → marks Faire order as ready to accept
- Track: Draft → Awaiting Response → Quote Received → Approved → PO Placed

### AI Image Studio
(Detailed in Catalog section above)
Key: this is NOT an external tool — it lives inside the portal as a sub-tab of Catalog.

### Tracking Update Flow (Fulfillment)
- Khushal's daily task: update tracking for shipped orders
- Dedicated view: all accepted orders with no tracking number
- Bulk tracking entry (paste multiple tracking numbers, map to order IDs)
- Auto-format tracking for Faire API submission
- Fulfiller preset: HQ Dropshipping (Charlie) as default

### Daily Report / Day Close
(Detailed in Operations section above)

### Faire Direct Tracker
(Detailed in Retailers section above)
Key metric across all sections — FD% should appear in: Dashboard, Analytics, Retailers, and Catalog (per-listing FD indicator)

---

## 5. What to Remove

| Item | Why |
|---|---|
| "Scraper & Pipeline" as a tab name | Confusing jargon — replaced by "Catalog" |
| "Products" as a separate top-level tab | Merged into "Catalog" — redundant split |
| "More" tab name | Replaced by "Workspace" |
| "Tasks" as standalone top-level tab | Moved into "Operations" to free nav space |
| "CRM & Outreach" tab name | Renamed "Retailers" — cleaner |
| "Pipeline Kanban" sub-tab name | Renamed "Publishing Queue" |
| "Pipeline" as a concept name anywhere | Always say "Publishing Queue" — never "pipeline" in UI |

---

## 6. Final Navigation Summary

```
ALL BRANDS VIEW (8 tabs):
Dashboard | Orders | Catalog | Retailers | Analytics | Operations | Workspace

SINGLE BRAND VIEW (6 tabs):
Dashboard | Orders | Catalog | Retailers | Analytics | Operations
```

### Sub-tabs per section:

**Orders:**
All Orders | Pending | Fulfillment | Returns | Supplier Quotes

**Catalog:**
Listings | Sourcing | Publishing Queue | Image Studio | Inventory | Pricing

**Retailers:**
Directory | WhatsApp Log | Campaigns | Faire Direct | Follow-ups

**Analytics:**
Revenue | Stores | Products | Traffic | Brands

**Operations:**
Tasks | Daily Report | Targets | Day Close | Email Log

**Workspace (All Brands only):**
Team | Roles | Inbox | Chat | Blogs & Learning | Faire API Docs | Active Stores | Settings | Account

---

## 7. Priority Order for Implementation

| Priority | Change | Effort | Impact |
|---|---|---|---|
| P0 | Rename "Scraper & Pipeline" → "Catalog", merge Products sub-tabs | Low | High — daily confusion fix |
| P0 | Rename "Pipeline Kanban" → "Publishing Queue" | Low | High |
| P0 | Rename "CRM & Outreach" → "Retailers" | Low | Medium |
| P1 | Add Image Studio sub-tab (upload + background removal + normalize) | High | Very High — daily need |
| P1 | Add Fulfillment sub-tab in Orders | Medium | High — Khushal's daily view |
| P1 | Add WhatsApp buttons across Order Detail + Retailer rows | Low | High — Bharti's daily need |
| P1 | Add Operations section (Tasks + Daily Report + Targets + Day Close) | Medium | High |
| P2 | Add Faire Direct sub-tab in Retailers | Medium | High — margin lever |
| P2 | Add Supplier Quotes sub-tab in Orders | Medium | Medium |
| P2 | Add Blogs & Learning + Faire API Docs in Workspace | Low | Medium |
| P2 | Add WhatsApp Log sub-tab in Retailers | Low | Medium |
| P3 | Add Active Stores page in Workspace | Medium | Medium |
| P3 | Add Products + Stores sub-tabs in Analytics | Medium | Medium |
| P3 | Upgrade Order Detail (thumbnails, Faire Direct indicator, @mentions) | Medium | Medium |
