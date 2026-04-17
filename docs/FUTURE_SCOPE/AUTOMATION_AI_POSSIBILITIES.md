# Future Scope: Automation & AI Possibilities

> Comprehensive blueprint covering every automation, AI tool, and intelligence layer across the entire Suprans HQ / TeamSync AI ecosystem. This document is a reference for future implementation — nothing here is live yet unless noted.

---

## Table of Contents

1. [Faire Wholesale Admin](#1-faire-wholesale-admin)
2. [Legal Nations Admin](#2-legal-nations-admin)
3. [EazyToSell Admin](#3-eazytosell-admin)
4. [USDrop AI Admin](#4-usdrop-ai-admin)
5. [Suprans HQ](#5-suprans-hq)
6. [GoyoTours Admin](#6-goyotours-admin)
7. [Life AI](#7-life-ai)
8. [Development](#8-development)
9. [JSBlueridge & B2B Ecosystem](#9-jsblueridge--b2b-ecosystem)
10. [Cross-Space Platform Intelligence](#10-cross-space-platform-intelligence)
11. [AI Tools Catalog](#11-ai-tools-catalog)
12. [Implementation Waves](#12-implementation-waves)
13. [Infrastructure Notes](#13-infrastructure-notes)

---

## 1. Faire Wholesale Admin

**Schema:** `b2b` | **Space slug:** `b2b-ecommerce` | **External APIs:** Faire v2, Wise, 17Track, Twilio

### 1.1 Automations

#### P0 — Critical

**Auto-Accept Orders with Inventory Guard**
- Trigger: New order arrives (event or 2h sync)
- Logic: Check `faire_products.total_inventory >= order item qty` for every line item. If all items in stock, call `POST /orders/{id}/processing` via Faire API automatically. If any item is short, flag order as "needs review" and notify ops.
- Human-in-loop: None when stock is sufficient. Alert-only when stock is insufficient.
- Data: `b2b.faire_orders` (state=NEW), `b2b.faire_products` (total_inventory, variant quantities)
- Why: Currently every order sits in NEW until someone manually clicks Accept. At scale (6 stores, 1800+ orders), this becomes the #1 bottleneck.

**Inventory Threshold Alerts**
- Trigger: `cron: 0 */4 * * *` (every 4 hours)
- Logic: For each active product across all stores, check if `total_inventory < configurable threshold` (default: 10 units). If below threshold, send Slack notification + email to ops team. Group alerts by store to avoid spam.
- Data: `b2b.faire_products` (total_inventory), threshold config (new table or product-level field)
- Channels: Slack webhook, email via Resend, in-app notification badge

**Auto-Import Tracking from 17Track**
- Trigger: `cron: 0 */2 * * *` (already running via pg_cron)
- Enhancement: When 17Track detects a shipment has been picked up by carrier, automatically update the corresponding Faire order with tracking code via `POST /orders/{id}/shipments`. Currently tracking is synced but not written back to Faire.
- Data: `b2b.shipment_tracking` (status, tracking_number, carrier), `b2b.faire_orders` (faire_order_id)

**Auto-Send Delivery WhatsApp Notification**
- Trigger: Event — 17Track reports status = "delivered"
- Logic: Look up retailer from order, send templated WhatsApp message via Twilio: "Your order #{display_id} has been delivered. Thank you for shopping with {store_name}!"
- Data: `b2b.faire_orders` (shipping_address), `b2b.faire_retailers` (phone)
- Already partially implemented in `/api/tracking/sync` — needs activation

#### P1 — High Value

**Smart Auto-Reconciliation (ML-Enhanced)**
- Current state: Fuzzy match by amount (order_total * 0.85 +/- $2). Accuracy ~60-70%.
- Enhancement: Train a lightweight classifier using historical matched pairs. Features: transaction date vs order delivery date (lag), amount ratio, description keywords, retailer name in memo, payer country. Use Gemini to analyze edge cases.
- Endpoint: Enhance `/api/finance/auto-reconcile` with scoring model
- Expected accuracy: 85-90% with ML, remaining 10% flagged for human review

**Payout Reconciliation (Faire -> Wise)**
- Problem: Faire batches multiple orders into single payouts deposited to Wise. No way to trace which orders are in which payout.
- Solution: On each Wise sync, check for new deposits categorized as "Faire payout". Match by date + approximate amount (sum of recently delivered orders). Create `payout_reconciliation` table linking payout_id -> [order_ids].
- Data: `b2b.bank_transactions_v2` (Wise deposits), `b2b.faire_orders` (delivered orders by date range)

**Retailer Churn Prediction + Re-Engagement**
- Trigger: `cron: weekly`
- Logic: For each retailer, calculate days_since_last_order, order_frequency_trend, avg_order_value_trend. Score churn risk (0-100). For high-risk retailers (score > 70, last_order > 60 days), auto-draft re-engagement email with personalized product recommendations.
- AI: Gemini generates personalized email body referencing their past purchases and new products
- Human-in-loop: Approve email before send

**Bulk Order Accept**
- Trigger: Manual button on Orders page
- Logic: Select all NEW orders where inventory is sufficient. Show confirmation dialog with count + total value. On confirm, batch-call Faire API to accept all.
- UI: Add "Accept All Ready" button to orders page header

**Auto-Send Order Confirmation WhatsApp**
- Trigger: Event — order state changes to PROCESSING
- Message: "Hi {retailer_name}, your order #{display_id} for ${total} has been confirmed. Expected ship date: {date}. Track at: {tracking_url}"

**Weekly Sales Digest**
- Trigger: `cron: Monday 9am IST`
- Content: By-store breakdown (orders, revenue, top products), retailer tier analysis (new vs returning), week-over-week comparison, inventory warnings
- Delivery: Chat message (DM channel) + email to stakeholders
- Enhancement over current daily report: adds WoW comparison, retailer cohort analysis, inventory alerts

**Duplicate Transaction Detection**
- Trigger: On every banking sync
- Logic: Check for transactions with same amount + same day + similar description. Flag as potential duplicates in UI. Don't auto-delete.

#### P2 — Strategic

**Product Pricing Optimization**
- Trigger: `cron: weekly`
- Logic: For each product, analyze: current margin (wholesale vs COGS), sales velocity (units/week), inventory turnover, category avg pricing. Gemini suggests price adjustments with reasoning.
- Output: Pricing suggestions table in catalog page, sortable by potential revenue uplift
- Human-in-loop: Review and apply suggestions

**Demand Forecasting**
- Trigger: `cron: weekly`
- Logic: Time-series analysis on order volume by product/category. Factor in seasonality (holiday spikes), day-of-week patterns, trend direction. Use last 6+ months of order data.
- Output: Dashboard widget showing predicted demand by product for next 4 weeks
- Model: Simple exponential smoothing or Prophet-style, run via Supabase Edge Function

**Dead Stock Detection + Markdown Suggestions**
- Trigger: `cron: monthly`
- Logic: Products with 0 orders in 90+ days and inventory > 0. Calculate holding cost. Suggest markdown percentage to clear stock within 30 days based on category velocity.

### 1.2 AI Tools for Faire

| Tool Name | Type | Where It Lives | What It Does |
|-----------|------|----------------|--------------|
| **Order Risk Scorer** | Inline widget | Order detail page | Scores orders on risk factors: first-time retailer, unusually high value, shipping to new region. Flags for manual review. |
| **Retailer Insights Generator** | One-off tool | Retailer detail page | Generates a profile brief: purchase pattern, preferred categories, predicted next order date, lifetime value estimate, churn risk. |
| **Smart Reply Composer** | Inline tool | Retailer communication | Drafts context-aware replies to retailer inquiries. Pulls order history, product catalog, and SLA info into the prompt. |
| **Margin Calculator** | Inline widget | Product detail page | Real-time margin calculation factoring COGS, Faire commission (25%), shipping estimate, and payment processing fees. |
| **Reorder Predictor** | Inline widget | Retailer detail page | Based on past order cadence, predicts when the retailer will likely reorder and suggests a proactive outreach date. |
| **Collection Builder** | One-off tool | Catalog section | AI-curated product collections for seasonal/thematic launches. Input: theme + target retailer segment. Output: product list + collection copy. |
| **Competitor Price Scanner** | One-off tool | Products page | Compare product pricing against similar listings on Faire (requires scraping or API if available). |
| **Return/Refund Analyzer** | Dashboard widget | Finance section | Pattern analysis on returns: by product (defect-prone?), by retailer (serial returner?), by season. |

---

## 2. Legal Nations Admin

**Schema:** `legal` | **Space slug:** `legal` | **External APIs:** None currently (opportunity: IRS e-file, state registries)

### 2.1 Automations

#### P0 — Critical

**Tax Filing Deadline Reminders**
- Trigger: `cron: daily at 9am IST`
- Logic: For each active tax filing, calculate days until due date (based on `date_of_formation` + state-specific rules). Send reminders at 90, 30, 14, 7, 3, 1 day(s) before deadline.
- Channels: Email to client, WhatsApp to client, in-app notification to ops team
- Data: `legal.tax_filings` (date_of_formation, filing_stage, state), client contact info
- Special: Different states have different annual report due dates. Need a state_deadlines reference table.

**Payment Overdue Alerts**
- Trigger: `cron: daily`
- Logic: Check `legal.clients` where `remaining_payment > 0` and `date_of_payment` is past due. Escalation: 1 day overdue -> gentle reminder, 7 days -> firm reminder, 30 days -> escalation to management.
- Channels: Email, WhatsApp, internal Slack alert

**Bank Statement Collection Reminder**
- Trigger: `cron: weekly during Jan-Apr (tax season)`
- Logic: For clients with active tax filings where `bank_statements_status = 'Pending'`, send weekly reminder to submit bank statements.
- Data: `legal.tax_filings` (bank_statements_status)

**Annual Report Filing Due Date Alerts**
- Trigger: `cron: daily`
- Logic: Check `legal.tax_filings` where `annual_report_filed = false` and `state_annual_report_due` is approaching.
- Alert thresholds: 60, 30, 14, 7 days

#### P1 — High Value

**Client Health Score Auto-Calculation**
- Trigger: `cron: daily`
- Logic: Composite score from: LLC delivery status (weight: 20%), payment completion (30%), document submission progress (20%), onboarding checklist completion (20%), responsiveness (10%).
- Output: Update `legal.clients.client_health` field automatically (Healthy, At Risk, Critical)
- Display: Color-coded badges on clients page

**Onboarding Phase Auto-Progression**
- Trigger: Event — all checklist items in a phase marked complete
- Logic: When all items in "Onboarding" phase are done, auto-advance to "LLC Formation". When all LLC items done, advance to "Post-Formation". Update client status accordingly.
- Data: `legal.onboarding_checklist` (phase, is_completed)

**Missing Document Reminders**
- Trigger: `cron: weekly`
- Logic: For each client in active onboarding, check which required documents are still missing (cross-reference checklist items with `legal.client_documents`). Generate personalized reminder listing exactly what's needed.
- Human-in-loop: Approve message template before bulk send

**Tax Filing Stage Auto-Advancement**
- Trigger: Event — required documents uploaded
- Logic: When client uploads all required documents for current filing stage, auto-advance `filing_stage` from "Document Collection" to "Preparation". When preparation is reviewed, advance to "Filing".
- Human-in-loop: Review at "Filing" stage before actual submission

**EIN Verification Status Checker**
- Trigger: `cron: daily`
- Logic: For clients with `ein_number IS NOT NULL` and `verified_ein_in_form = false`, attempt to verify EIN against IRS records (if API available) or flag for manual verification.

**Bulk Fax Status Tracking**
- Trigger: `cron: every 4 hours`
- Logic: For tax filings where `fax IS NOT NULL` and `fax_confirmation IS NULL`, check fax delivery status via fax API. Update `fax_confirmation` field.

**Monthly Client Status Report**
- Trigger: `cron: 1st of month`
- Content: Total clients by plan, by health status, by LLC status. Revenue collected vs outstanding. Filing progress breakdown. Onboarding funnel metrics.

#### P2 — Strategic

**LLC Status Auto-Check (State Registry)**
- Trigger: `cron: weekly`
- Logic: For each LLC, check formation state's online registry to verify LLC is in good standing. Update `llc_status` if changed. Alert if status degrades.
- Challenge: Requires web scraping per state (different formats)

**Compliance Risk Scoring**
- Trigger: `cron: weekly`
- Logic: AI analysis combining: days since last filing, missing documents count, payment status, state-specific compliance requirements, upcoming deadlines. Score 0-100 risk level.

**Client Onboarding Call Auto-Scheduling**
- Trigger: Event — payment received
- Logic: When `amount_received > 0` for a new client, auto-send Calendly link for onboarding call. Update `date_of_onboarding_call` when scheduled.

### 2.2 AI Tools for Legal Nations

| Tool Name | Type | Where It Lives | What It Does |
|-----------|------|----------------|--------------|
| **LLC Name Availability Checker** | Inline tool | Client onboarding form | Checks proposed LLC name against state registry for availability. Suggests alternatives if taken. |
| **Tax Form Pre-Filler** | One-off tool | Tax filing detail page | Pre-fills IRS Form 1120 and 5472 fields from client data in the database. Exports as PDF draft for review. |
| **Compliance Checklist Generator** | One-off tool | Client detail page | Generates state-specific compliance checklist based on LLC state, formation date, and business type. |
| **Client Communication Drafter** | Inline tool | Client detail page | Drafts professional emails/WhatsApp messages for common scenarios: document request, payment reminder, status update, onboarding welcome. |
| **Document Classifier** | Inline tool | Documents upload | Auto-classifies uploaded documents (EIN letter, articles of incorporation, bank statement, passport, etc.) using AI vision/text analysis. |
| **Filing Status Explainer** | Inline widget | Tax filing detail | Plain-English explanation of current filing stage, what's been done, what's pending, and estimated completion timeline. |
| **Annual Report Preparer** | One-off tool | Compliance section | Auto-generates annual report data from database fields. Fills in registered agent info, principal office, member details. |
| **Tax Deadline Calculator** | Inline widget | Dashboard | Calculates exact federal and state deadlines based on formation date, fiscal year, state rules. Shows countdown. |

---

## 3. EazyToSell Admin

**Schema:** `ets` | **Space slug:** `ets` / `eazysell` | **External APIs:** Faire (shared), Track17 (shared)

### 3.1 Automations

#### P0 — Critical

**Store Launch Checklist Auto-Sequencing**
- Trigger: Event — phase/step completion
- Logic: Multi-step launch pipeline: Onboarding -> Catalog Setup -> Pricing -> QC -> Branding -> Launch. When all items in a phase are complete, auto-unlock next phase. Block launch if any required step is incomplete.
- Data: `ets.projects` (checklist items), `ets.stores` (status)

**Product Name Normalization (AI)**
- Trigger: Event — bulk product upload or individual product creation
- Logic: Already has API route at `/api/ets/products/[id]/normalize-name`. Run Gemini to clean up raw supplier product names into marketplace-ready titles (proper casing, remove junk characters, standardize format).
- Human-in-loop: None (auto-apply, can be manually overridden)

**Auto-Category Assignment (AI)**
- Trigger: Event — product created without category
- Logic: Already has API route at `/api/ets/products/[id]/suggest-category`. Gemini analyzes product name + description to suggest the best category from the existing taxonomy.

**Incomplete Product Field Alerts**
- Trigger: `cron: daily`
- Logic: Scan all products where `is_active = true`. Flag products missing: description, images, pricing (COGS or wholesale), category. Group by store. Send digest to ops.

#### P1 — High Value

**QC Failure Notification + Remediation**
- Trigger: Event — QC status set to "failed"
- Logic: Notify store owner + ops team. Include: product name, failure reason, photos, suggested remediation steps (AI-generated based on failure type).
- Channels: Email, WhatsApp, in-app

**Vendor Payment Due Date Reminders**
- Trigger: `cron: daily`
- Logic: Check `ets.vendors` for upcoming payment due dates. Send reminders at 7, 3, 1 day(s) before.

**China Batch Arrival ETA Predictions**
- Trigger: `cron: daily`
- Logic: Based on historical dispatch-to-arrival times for similar shipments (route, carrier, season), predict ETA for in-transit China batches. Update UI with predicted arrival date.
- Data: `ets.supply_chain` (dispatch records), historical shipping times

**Client Churn Risk Scoring**
- Trigger: `cron: weekly`
- Logic: For each ETS client, score churn risk based on: days since last activity, store setup completion %, sales pipeline stage stagnation, payment status, support ticket frequency.
- Output: `is_lost` flag + churn_score field on clients table

**Supply Chain Bottleneck Alerts**
- Trigger: `cron: daily`
- Logic: Detect: QC backlogs (items waiting > 7 days), dispatch delays (items ready but not shipped > 3 days), warehouse receiving delays. Alert ops team.

**Store Setup Completion Tracking**
- Trigger: `cron: daily`
- Logic: For each store, calculate setup_completion_pct from checklist items. Identify stores stalled at < 50% for > 14 days. Alert assigned team member.

#### P2 — Strategic

**Sales Proposal Auto-Generation**
- Trigger: Event — client qualified in sales pipeline
- Logic: Gemini generates customized sales proposal using: client profile, recommended store package, pricing calculator results, success stories from similar stores.
- Human-in-loop: Review and customize before sending

**Dynamic Pricing Recommendations**
- Trigger: `cron: weekly`
- Logic: Analyze COGS, category benchmarks, competitor pricing, demand signals. Suggest wholesale and MSRP adjustments per product.

**Bulk Product Image Polishing**
- Trigger: Manual batch operation
- Logic: Run AI image enhancement on product photos: background removal, color correction, consistent sizing, shadow addition.
- Already has API route at `/api/ets/products/[id]/polish-image`

### 3.2 AI Tools for EazyToSell

| Tool Name | Type | Where It Lives | What It Does |
|-----------|------|----------------|--------------|
| **Store Readiness Scorer** | Dashboard widget | Store detail page | Composite score (0-100) for launch readiness based on: catalog completeness, pricing set, branding done, QC passed, staff assigned. |
| **Product Listing Polisher** | Inline tool | Product detail page | Rewrites product title + description + tags for marketplace optimization. Considers SEO, buyer psychology, category norms. |
| **Supplier Negotiation Brief** | One-off tool | Vendor detail page | Generates negotiation talking points from order history: volume trends, quality metrics, competitor pricing, suggested terms. |
| **BOQ Generator** | One-off tool | Store documents section | Auto-generates Bill of Quantities from store specification and product catalog. Outputs structured spreadsheet. |
| **Client Pitch Deck Generator** | One-off tool | Sales pipeline | Auto-generates pitch presentation from store template, pricing calculator, and success stories. |
| **Pricing Matrix Calculator** | Inline tool | Products page | Calculates tiered wholesale/MSRP from COGS with configurable margin targets. Shows breakeven analysis. |
| **QC Report Generator** | One-off tool | Supply chain section | Generates QC checklist + inspection report template from product specifications. |

---

## 4. USDrop AI Admin

**Schema:** `usdrop` | **Space slug:** `usdrop` | **External APIs:** Shopify, supplier feeds

### 4.1 Automations

#### P0 — Critical

**AI Product Pipeline Auto-Scoring**
- Trigger: Event — product submitted to pipeline
- Logic: Score each product on: estimated demand (search volume, trend direction), competition level (number of similar listings), margin potential (supplier cost vs market price), supplier reliability score. Products scoring > 8/10 auto-advance to "approved" queue.
- Human-in-loop: Approve final publish (or auto-publish for score > 9)

**Support Ticket Auto-Triage**
- Trigger: Event — ticket created
- Logic: AI classifies ticket by: category (billing, technical, product, shipping), urgency (critical, high, normal, low), sentiment (frustrated, neutral, satisfied). Auto-assign to appropriate team member based on category. For FAQ-type questions, suggest auto-response from knowledge base.
- Data: `usdrop.support_tickets`, knowledge base articles

**Shopify Store Sync Failure Alerts**
- Trigger: Event — sync error detected
- Logic: When Shopify store sync fails (auth expired, rate limited, store deactivated), immediately alert ops team with error details and suggested fix.
- Channels: Slack, email, in-app notification

#### P1 — High Value

**Auto-Publish High-Score Products**
- Trigger: Event — product scored > 8
- Logic: Products that pass AI scoring threshold automatically get published to the marketplace without manual review. Products scored 6-8 go to review queue. Products < 6 get rejected with feedback.

**Supplier Reliability Scoring**
- Trigger: `cron: weekly`
- Logic: Score each supplier on: order fulfillment rate, average shipping time, quality complaint rate, price stability, communication responsiveness. Flag suppliers with declining scores.
- Data: Historical order data, return rates, shipping times

**Support Ticket Auto-Response (FAQ)**
- Trigger: Event — ticket classified as FAQ-type
- Logic: Match ticket content against knowledge base articles. If confidence > 80%, auto-respond with the relevant article + "Did this solve your issue?" follow-up. If not resolved within 24h, escalate to human.
- Human-in-loop: None for FAQ. Human for non-FAQ.

**Client Inactivity Re-Engagement**
- Trigger: `cron: weekly`
- Logic: Identify users who haven't logged in for 14+ days or haven't created a store in 30+ days. Send personalized re-engagement email with: success stories, new features, exclusive offer.
- Human-in-loop: Approve campaign template (one-time), then auto-send

**Supplier Stock-Out Alerts**
- Trigger: `cron: daily`
- Logic: Check supplier product feeds for items that are now out of stock. Alert affected store owners. Suggest alternative suppliers for the same product.

**Payout Anomaly Detection**
- Trigger: Event — payout processed
- Logic: Flag payouts that deviate significantly from expected amounts (based on order history). Check for: duplicate payouts, missing orders, unusual refund patterns.

#### P2 — Strategic

**Dynamic Dropship Pricing Suggestions**
- Trigger: `cron: weekly`
- Logic: Analyze supplier cost, competitor pricing, demand trends, margin targets. Suggest optimal price point per product.

**Course Recommendation Engine**
- Trigger: Event — user reaches milestone (first store, first order, etc.)
- Logic: Based on user's current stage, skill gaps, and store performance, recommend the most relevant training course.

**Email/SMS Campaign A/B Optimization**
- Trigger: Event — campaign sent
- Logic: Track open rates, click rates, conversion by variant. Auto-promote winning variant. Suggest improvements for next campaign.

### 4.2 AI Tools for USDrop

| Tool Name | Type | Where It Lives | What It Does |
|-----------|------|----------------|--------------|
| **Product Viability Scorer** | Inline widget | Pipeline review page | Scores products on demand, competition, margin, supplier reliability. Visual scorecard. |
| **Listing Copy Generator** | Inline tool | Product detail page | Generates Shopify-optimized title, description, bullet points, and SEO tags from product data + images. |
| **Supplier Comparison Matrix** | One-off tool | Suppliers page | Side-by-side comparison of suppliers for the same product: price, lead time, quality score, MOQ, shipping options. |
| **Support Ticket Auto-Resolver** | Inline tool | Ticket detail page | Searches knowledge base and past resolved tickets to suggest resolution. Drafts response for agent review. |
| **Niche Finder** | One-off tool | Research section | Analyzes market trends, search volumes, and competition levels to identify underserved product niches. |
| **Ad Copy Generator** | One-off tool | Email/SMS campaigns | Generates multiple variants of campaign copy optimized for different segments and channels. |
| **Store Health Report** | One-off tool | Store detail page | Comprehensive health check: product count, listing quality, pricing competitiveness, traffic, conversion rate, review score. |

---

## 5. Suprans HQ

**Schema:** `hq` | **Space slug:** `hq` | **External APIs:** Gmail, Callyzer, Resend

### 5.1 Automations

#### P0 — Critical

**Monthly P&L Auto-Close + Variance Analysis**
- Trigger: `cron: 1st of month`
- Logic: Pull all revenue and expense data from `hq.revenue` and `hq.expenses` for the previous month. Calculate P&L by vertical. Compare to budget and previous month. Gemini generates narrative explaining variances.
- Output: Formatted report in `/reports` page + email to leadership
- Human-in-loop: Review before distribution

**Compliance Filing Deadline Alerts**
- Trigger: `cron: daily`
- Logic: Check `hq.compliance_filings` for upcoming deadlines across all entities. Alert at 90, 30, 14, 7, 3, 1 day(s).
- Covers: GST filings, TDS returns, annual returns, ROC filings, tax audits

**Contract Renewal Reminders**
- Trigger: `cron: daily`
- Logic: Check `hq.contracts` for renewal dates. Alert at 90, 60, 30, 14 days before expiry.
- Include: Contract value, vendor name, auto-renewal clause status

**Site Uptime Monitoring**
- Trigger: `cron: every 5 minutes`
- Logic: Ping all registered domains/sites. If response time > 5s or status != 200, send immediate alert. Track uptime percentage.
- Channels: Slack (immediate), email (digest)

#### P1 — High Value

**Candidate Auto-Scoring from Resume**
- Trigger: Event — candidate added to ATS
- Logic: AI analyzes resume against role requirements. Scores on: skill match, experience level, education, cultural fit indicators. Generates interview question suggestions.
- Human-in-loop: Score is advisory, human makes final call

**Job Description Auto-Generation**
- Trigger: Event — new role created
- Logic: Gemini generates JD from: role title, department, seniority level, required skills, team context. Follows company tone and format.
- Human-in-loop: Review and edit before posting

**Leave Approval Auto-Routing**
- Trigger: Event — leave request submitted
- Logic: Route to reporting manager. If manager doesn't respond in 24h, escalate. Auto-approve casual leave < 2 days if employee has sufficient balance.
- Human-in-loop: Manager approves (auto-approve for short casual leave)

**Headcount vs Budget Variance Alerts**
- Trigger: `cron: weekly`
- Logic: Compare actual headcount by department against budgeted headcount. Alert HR and finance if variance > 10%.

**Employee Anniversary/Birthday Reminders**
- Trigger: `cron: daily at 8am IST`
- Logic: Check for birthdays and work anniversaries. Send automated greeting to team Slack channel. Remind manager to acknowledge.

**Interview Feedback Synthesis**
- Trigger: Event — all interviews for a candidate completed
- Logic: Gemini synthesizes all interviewer scorecards into a single recommendation with strengths, concerns, and suggested next steps.
- Human-in-loop: Review synthesis, make hiring decision

**SEO Rank Change Alerts**
- Trigger: `cron: daily`
- Logic: Track keyword rankings for all Suprans properties. Alert on significant rank changes (> 5 positions up or down).
- Integration: Ahrefs API (already connected via MCP)

#### P2 — Strategic

**Social Media Caption Generation**
- Trigger: Event — social post scheduled
- Logic: Generate platform-specific captions (Instagram, LinkedIn, Twitter) from post brief/image. Suggest hashtags, optimal posting time.

**Social Post Auto-Scheduling**
- Trigger: Event — post drafted and approved
- Logic: Schedule post for optimal engagement time based on historical data per platform per audience.

**Call Quality Auto-Scoring**
- Trigger: Event — call recording synced from Callyzer
- Logic: Transcribe call, analyze for: professionalism, script adherence, customer satisfaction signals, resolution effectiveness. Score 1-10.

**Performance Review 360 Auto-Summary**
- Trigger: Event — review period closes
- Logic: Aggregate all peer, manager, and self-review inputs. Gemini synthesizes into structured summary with themes, strengths, improvement areas.

### 5.2 AI Tools for HQ

| Tool Name | Type | Where It Lives | What It Does |
|-----------|------|----------------|--------------|
| **P&L Narrator** | Inline widget | Finance overview | AI-generated narrative explaining financial performance: what drove revenue, where costs increased, margin trends. |
| **Resume Screener** | Inline tool | Candidates page | Auto-scores resumes against role requirements. Highlights matching skills, gaps, red flags. |
| **Interview Question Generator** | One-off tool | Hiring section | Generates role-specific interview questions across categories: technical, behavioral, cultural, situational. |
| **Performance Review Synthesizer** | One-off tool | People section | Synthesizes 360 feedback from multiple reviewers into a structured, actionable summary. |
| **Social Caption Generator** | Inline tool | Social posts page | Generates platform-optimized captions with hashtag suggestions and tone variations. |
| **Meeting Notes Summarizer** | One-off tool | Calendar section | Summarizes meeting recordings/notes into action items, decisions, and follow-ups. |
| **Org Chart Optimizer** | One-off analysis | People section | Analyzes reporting structure for: span of control issues, single points of failure, cross-functional gaps. |
| **Budget Variance Explainer** | Inline widget | Finance section | AI explanation of budget vs actual variances per line item. Identifies root causes and trends. |

---

## 6. GoyoTours Admin

**Schema:** `goyo` | **Space slug:** `goyo` | **External APIs:** None currently (opportunities: flight/hotel APIs, visa services)

### 6.1 Automations

#### P0 — Critical

**Visa Expiry Reminders**
- Trigger: `cron: daily`
- Logic: Check `goyo.visas` for upcoming expiry dates. Send reminders at 90, 60, 30, 14, 7 days before expiry.
- Include: Visa type, country, passport number, renewal requirements
- Channels: Email, WhatsApp, in-app

**Booking Confirmation Notifications**
- Trigger: Event — booking created
- Logic: Send confirmation email/WhatsApp to client with: tour details, dates, guide info, meeting point, what to bring, cancellation policy.
- Template: Pre-built per tour type

**Auto-Generate Itinerary from Tour Template**
- Trigger: Event — booking confirmed
- Logic: Gemini generates day-by-day itinerary from: tour template (destinations, activities, durations), client preferences (dietary, mobility, interests), season-specific adjustments.
- Human-in-loop: Review before sending to client

#### P1 — High Value

**Guide Auto-Assignment**
- Trigger: Event — booking confirmed
- Logic: Match guide based on: availability on tour dates, language match with client, destination expertise, previous client ratings, workload balance.
- Human-in-loop: Confirm suggested guide

**Payment Due Reminders**
- Trigger: `cron: daily`
- Logic: Check bookings with outstanding payments. Send reminders at 7, 3, 1 day(s) before due date.

**Post-Tour Feedback Request**
- Trigger: Event — tour end date passed
- Logic: Send feedback survey link 1 day after tour completion. Follow up after 3 days if not completed.

**Monthly Booking + Revenue Report**
- Trigger: `cron: 1st of month`
- Content: Bookings by tour type, revenue by destination, guide utilization, cancellation rate, avg booking value, customer satisfaction trends.

#### P2 — Strategic

**Tour Pricing Auto-Adjustment**
- Trigger: `cron: monthly`
- Logic: Analyze: booking velocity by tour type, seasonal demand patterns, competitor pricing, cost changes (fuel, hotels). Suggest price adjustments.

**Cancellation Risk Prediction**
- Trigger: `cron: weekly`
- Logic: Score upcoming bookings for cancellation risk based on: days until tour, payment completion, client communication pattern, weather forecast for destination.

**Hotel/Flight Availability Check**
- Trigger: Event — booking created
- Logic: Check availability via API for required hotels and flights on tour dates. Alert if availability is low or prices have changed significantly.

### 6.2 AI Tools for GoyoTours

| Tool Name | Type | Where It Lives | What It Does |
|-----------|------|----------------|--------------|
| **Itinerary Generator** | One-off tool | Bookings section | AI-generated day-by-day travel plan from destination + duration + client preferences. |
| **Visa Requirement Checker** | Inline tool | Visa page | Checks visa requirements by nationality + destination country. Lists documents needed, processing time, fees. |
| **Tour Description Writer** | Inline tool | Tour detail page | Generates marketing copy for tour packages with highlights, inclusions, and call-to-action. |
| **Client Preference Profiler** | Inline widget | Client detail page | Analyzes past bookings to build preference profile: preferred destinations, budget range, activity level, dietary needs. |
| **Dynamic Pricing Calculator** | Inline tool | Tours page | Suggests prices based on seasonality, demand, costs, competitor analysis. Shows revenue impact of price changes. |
| **Guide Matcher** | Inline tool | Booking detail | Recommends best available guide based on language, expertise, ratings, workload. Shows comparison. |

---

## 7. Life AI

**Schema:** `life` | **Space slug:** `life` | **External APIs:** OpenAI (Whisper, GPT)

### 7.1 Automations

#### P0 — Critical

**Weekly Insight Synthesis**
- Trigger: `cron: Sunday 8pm IST`
- Logic: Gemini analyzes the past week's data across all life dimensions: mood trends, spending patterns, habit streaks, goal progress, health metrics, journal themes. Generates a "Week in Review" narrative.
- Output: New journal entry + dashboard card

**Voice Capture Auto-Routing**
- Trigger: Event — capture saved
- Logic: Already partially implemented. Enhancement: After transcription + extraction, auto-suggest which table(s) the data should be inserted into (goals, issues, expenses, habits, etc.). Show preview for approval.
- Human-in-loop: Approve inserts (never auto-insert)

**Birthday/Milestone Reminders**
- Trigger: `cron: daily at 8am IST`
- Logic: Check `life.people` for upcoming birthdays and important dates. Send morning notification with: who, what, suggested action (call, message, gift).

#### P1 — High Value

**Habit Streak Prediction + Nudges**
- Trigger: `cron: daily at 7am IST`
- Logic: For each active habit, predict probability of completing today based on: streak length, day-of-week pattern, recent mood, schedule density. Send motivational nudge for habits at risk of breaking.

**Net Worth Forecast**
- Trigger: `cron: monthly`
- Logic: Project net worth 3, 6, 12 months forward based on: current assets, liabilities, income trend, expense trend, investment returns. Show optimistic/pessimistic scenarios.

**EMI/Loan Amortization Auto-Update**
- Trigger: `cron: monthly`
- Logic: Recalculate remaining balance, interest paid, principal paid for each active EMI/loan. Update dashboard with payoff timeline.

**Spending Anomaly Alerts**
- Trigger: Event — large transaction recorded
- Logic: Flag transactions > 2x average in same category. Send notification: "You spent X on {category}, which is significantly above your average of Y."

**Medical Appointment Reminders**
- Trigger: `cron: daily`
- Logic: Check upcoming medical appointments. Send reminders at 3 days and 1 day before. Include: doctor name, location, what to bring.

#### P2 — Strategic

**Book-to-Action Extraction**
- Trigger: Event — book status changed to "finished"
- Logic: If book has notes/highlights, Gemini extracts top 3-5 actionable takeaways. Suggests habits or goals to create from them.

**Journal Sentiment Trend Analysis**
- Trigger: `cron: weekly`
- Logic: Analyze journal entries for sentiment over time. Identify recurring themes, mood triggers, and life patterns. Display as trend chart.

**Health Correlator**
- Trigger: `cron: weekly`
- Logic: Find correlations between: sleep quality and mood, exercise and energy, supplements and health metrics. Display insights like "You tend to rate your mood 20% higher on days you exercise."

### 7.2 AI Tools for Life

| Tool Name | Type | Where It Lives | What It Does |
|-----------|------|----------------|--------------|
| **Life Dashboard Narrator** | Dashboard widget | Overview page | AI weekly narrative summarizing life metrics across all dimensions. |
| **Goal Decomposer** | Inline tool | Goals section | Breaks down a high-level goal into milestones, habits, and daily actions. |
| **Decision Framework** | One-off tool | Journal decisions | Structured pros/cons/risk analysis for important decisions. Considers past similar decisions. |
| **Investment Allocator** | One-off tool | Finance section | Suggests portfolio rebalancing based on risk profile, market conditions, and goal timeline. |
| **Health Correlator** | Dashboard widget | Health section | Finds and visualizes correlations between sleep, mood, exercise, and supplements. |
| **Relationship Reminder** | Inline tool | People section | Suggests who to reach out to based on interaction frequency decay. "You haven't spoken to X in 45 days." |

---

## 8. Development

**Schema:** `public` | **Space slug:** `development`

### 8.1 Automations

**Deployment Failure Auto-Triage (P0)**
- Trigger: Event — Vercel deploy webhook with status=failed
- Logic: Parse error log, classify error type (build, runtime, config, dependency). Gemini suggests fix. Show on deployments page.

**Domain/SSL Expiry Reminders (P0)**
- Trigger: `cron: daily`
- Logic: Check `public.domains` for SSL cert and domain expiry dates. Alert at 60, 30, 14, 7, 3, 1 day(s).

**Weekly Claude Work Summary (P1)**
- Trigger: `cron: Monday 9am IST`
- Logic: Aggregate `public.claude_work_log` entries from past week. Gemini generates executive summary of what was built, what's in progress, blockers.

**Project Checklist Stale-Item Alerts (P1)**
- Trigger: `cron: daily`
- Logic: Check `public.project_checklists` for items not updated in 7+ days on active projects. Alert project owner.

**Automation Failure Retry with Backoff (P1)**
- Trigger: Event — `automation_runs.status = 'failed'`
- Logic: Auto-retry failed automation with exponential backoff (1min, 5min, 30min). Max 3 retries. If still failing, alert ops.

**Dependency Vulnerability Scan (P1)**
- Trigger: `cron: daily`
- Logic: Run `npm audit` equivalent check against known vulnerability databases. Flag critical/high severity issues.

**Build Time Trend Monitoring (P2)**
- Trigger: `cron: weekly`
- Logic: Analyze build times from deployment logs. Alert if average build time increases > 20% week-over-week.

### 8.2 AI Tools for Development

| Tool Name | Type | Where It Lives | What It Does |
|-----------|------|----------------|--------------|
| **Error Explainer** | Inline tool | Deployments page | Explains build/runtime errors in plain English with suggested fixes. |
| **Migration Risk Analyzer** | One-off tool | Projects section | Analyzes SQL migrations for: breaking changes, data loss risk, performance impact, rollback safety. |
| **API Documentation Generator** | One-off tool | Integrations page | Auto-generates API docs from route handler files. OpenAPI spec format. |
| **Performance Profiler** | Dashboard widget | Health page | Identifies slow pages and queries from monitoring data. |
| **Code Change Summarizer** | Inline widget | Claude log page | Summarizes git diffs in business-friendly language for non-technical stakeholders. |

---

## 9. JSBlueridge & B2B Ecosystem

**Schemas:** `jsblueridge`, `b2b_ecosystem` | **Space slugs:** `jsblueridge`, `b2b-ecosystem`

These spaces share the same Faire-based architecture as Faire Wholesale Admin. All automations from Section 1 apply here with space-specific scoping:

**JSBlueridge-specific:**
- Toy category demand forecasting (seasonal: holiday, back-to-school, summer)
- Age-appropriate product compliance checking
- Toy safety certification tracking

**B2B Ecosystem (Toyarina + Gullee):**
- Multi-brand inventory coordination (prevent one brand cannibalizing another's stock)
- Cross-brand retailer analysis (retailers who buy from both brands = upsell opportunity)
- Brand-specific pricing strategies
- Shared supplier negotiation leverage

---

## 10. Cross-Space Platform Intelligence

These automations operate across all spaces and provide ecosystem-level intelligence.

| # | Automation | Description | Trigger |
|---|-----------|-------------|---------|
| 1 | **Unified Notification Center** | Single notification hub routing Slack, email, WhatsApp, in-app alerts from all spaces. Dedup and batch similar alerts. | Event-driven |
| 2 | **Cross-Space Anomaly Detection** | Monitor all spaces for unusual patterns: revenue drops, traffic spikes, churn surges, cost overruns. AI explains what changed. | `cron: daily` |
| 3 | **Nightly Data Quality Check** | Scan all schemas for: null required fields, stale data (not updated in expected timeframe), orphan records (FK violations), duplicate entries. | `cron: 2am daily` |
| 4 | **Cross-Vertical Revenue Dashboard Refresh** | Aggregate revenue from all ventures into HQ dashboard. Calculate: total revenue, by-vertical breakdown, MoM growth, forecast. | `cron: every 4h` |
| 5 | **Unified Search (Full-Text + Semantic)** | Search across all spaces: clients, orders, products, tickets, documents. Semantic search via embeddings for natural language queries. | On-demand |
| 6 | **Activity Digest Per Space** | Daily summary per space sent to space owner: key metrics, actions taken, alerts triggered, items needing attention. | `cron: 6pm daily` |
| 7 | **SLA Monitoring** | Track: ticket response time, order fulfillment time, client onboarding duration, deployment frequency. Alert when SLA is breached. | `cron: hourly` |
| 8 | **Automated Backup Verification** | Verify Supabase point-in-time recovery is working. Test restore to staging weekly. | `cron: weekly` |

---

## 11. AI Tools Catalog

### Summary by Space

| Space | Existing Tools | New Tools Proposed | Total |
|-------|---------------|-------------------|-------|
| Faire Wholesale | 10 (workspace/ai-tools) | 8 | 18 |
| Legal Nations | 0 | 8 | 8 |
| EazyToSell | 5 (API routes exist) | 7 | 12 |
| USDrop AI | 0 | 7 | 7 |
| Suprans HQ | 0 | 8 | 8 |
| GoyoTours | 0 | 6 | 6 |
| Life AI | 2 (voice capture + extraction) | 6 | 8 |
| Development | 0 | 5 | 5 |
| **Total** | **17** | **55** | **72** |

### Tool Categories

**Inline Widgets** (embedded in existing pages, always visible):
- Margin Calculator, Reorder Predictor, Client Health Score, Filing Status Explainer, Product Viability Scorer, P&L Narrator, Budget Variance Explainer, Health Correlator, Life Dashboard Narrator

**Inline Tools** (available via button/action on existing pages):
- Smart Reply Composer, Document Classifier, Listing Polisher, Support Ticket Resolver, Social Caption Generator, Guide Matcher, Visa Checker, Communication Drafter

**One-Off Tools** (standalone tools accessible from AI Tools page):
- Collection Builder, Tax Form Pre-Filler, Compliance Checklist Generator, Pitch Deck Generator, Niche Finder, Interview Question Generator, Itinerary Generator, Goal Decomposer, Error Explainer

**Dashboard Widgets** (KPI-level intelligence on overview pages):
- Order Risk Scorer, Store Readiness Scorer, Return/Refund Analyzer, Performance Profiler

---

## 12. Implementation Waves

### Wave 1 — Quick Wins (1-2 days each, 8 items)
Notification-based automations with no AI dependency. Just cron + database check + alert.

1. Tax filing deadline reminders (LN)
2. Inventory threshold alerts (Faire)
3. Visa expiry reminders (Goyo)
4. Domain/SSL expiry alerts (Dev)
5. Payment overdue alerts (LN)
6. Compliance filing deadline alerts (HQ)
7. Contract renewal reminders (HQ)
8. Birthday/milestone reminders (Life)

### Wave 2 — Core Automation (3-5 days each, 8 items)
Workflow automations that reduce manual steps.

1. Auto-accept orders with stock check (Faire)
2. Support ticket auto-triage (USDrop)
3. Store launch auto-sequencing (ETS)
4. Client health scoring (LN)
5. Monthly P&L auto-close (HQ)
6. Weekly insight synthesis (Life)
7. Product pipeline auto-scoring (USDrop)
8. Itinerary auto-generation (Goyo)

### Wave 3 — AI-Native Intelligence (1-2 weeks each, 6 items)
Features requiring AI model integration.

1. Smart auto-reconciliation with ML (Faire)
2. Retailer churn prediction + re-engagement (Faire)
3. Resume screening + candidate scoring (HQ)
4. Demand forecasting (Faire/ETS)
5. Dynamic pricing engine (Faire/ETS/Goyo)
6. Cross-space anomaly detection (All)

### Wave 4 — Platform Intelligence (2-4 weeks, 4 items)
Cross-space infrastructure.

1. Unified notification center
2. Unified semantic search
3. Activity digest per space
4. SLA monitoring framework

---

## 13. Infrastructure Notes

### Scheduling: Supabase pg_cron + pg_net
All scheduled automations should use Supabase's built-in `pg_cron` extension with `pg_net` for HTTP calls. This bypasses Vercel Hobby plan's daily-only cron limitation.

```sql
-- Pattern for adding a new automation
SELECT cron.schedule(
  'job-name',           -- unique identifier
  '0 */2 * * *',        -- cron expression
  $$
  SELECT net.http_post(
    url := 'https://faire-ops-flax.vercel.app/api/{endpoint}',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  )
  $$
);
```

### Automation Registration Pattern
Every new automation should:
1. Have an API route handler at `/api/{space}/{action}/route.ts`
2. Be registered in the `public.automations` table (name, type, cron_expression, config with endpoint)
3. Log runs to `public.automation_runs` table
4. Be visible and toggleable from `/automations/overview`

### AI Model Usage
- **Gemini 2.5 Flash**: Classification, categorization, short-form generation (emails, captions, tags)
- **Gemini 2.5 Pro**: Complex analysis, report generation, multi-step reasoning
- **Claude (via API)**: Deep analysis, code generation, document processing
- **OpenAI Whisper**: Voice transcription (Life AI captures)

### Notification Channels
- **Email**: Resend API (already integrated)
- **WhatsApp**: Twilio API (already integrated)
- **Slack**: Webhook (to be integrated)
- **In-app**: `public.notifications` table + real-time subscription
- **SMS**: Twilio API (already integrated)
