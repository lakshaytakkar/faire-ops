# TeamSync AI — Module Audit & Roadmap

**Date:** 2026-04-10
**Author:** Lakshay (with Claude)
**Status:** Living document — update as modules ship

This document is the comprehensive audit of every module and page currently built in TeamSync AI, plus a prioritized list of major modules still needed to make this a complete business operating system.

---

## 📊 Current Stats (Stable v1+)

| Metric | Count |
|---|---|
| Total pages built | **167+** |
| Database tables | **75+** |
| API routes | **100+** |
| External integrations | **8** (Faire, Gemini, Resend, Twilio, Wise, 17Track, Callyzer, Gmail) |
| Daily cron jobs | **8** |
| Storage buckets | **6** |
| Modules in top nav | **11** |
| Modules in right dock | **19** |

---

## 🔝 TOP NAVIGATION (Universal Modules — 11 main + 51 sub-pages)

### 1. Dashboard — `/dashboard`
Single page command center for the active brand/store.

### 2. Orders — `/orders`
| Sub-page | Route |
|---|---|
| All Orders | `/orders/all` |
| Pending | `/orders/pending` |
| Fulfillment | `/orders/fulfillment` |
| Shipments | `/orders/shipments` |
| Disputes | `/orders/refunds` |
| Quotes | `/orders/quotes` |
| Detail page | `/orders/[id]` |

### 3. Products / Catalog — `/catalog`
| Sub-page | Route |
|---|---|
| Listings | `/catalog/listings` |
| Collections | `/catalog/collections` |
| Inventory | `/catalog/inventory` |
| Pricing | `/catalog/pricing` |
| Sourcing | `/catalog/sourcing` |
| Sourcing Review | `/catalog/sourcing/review` |
| Publishing Queue | `/catalog/publishing-queue` |
| Image Studio | `/catalog/image-studio` |
| Listing Detail | `/catalog/listings/[id]` |
| Collection Detail | `/catalog/collections/[id]` |

### 4. Retailers — `/retailers`
| Sub-page | Route |
|---|---|
| Directory | `/retailers/directory` |
| Campaigns | `/retailers/campaigns` |
| Follow-ups | `/retailers/follow-ups` |
| WhatsApp | `/retailers/whatsapp` |
| Faire Direct | `/retailers/faire-direct` |
| Retailer Detail | `/retailers/directory/[id]` |

### 5. Analytics — `/analytics`
| Sub-page | Route |
|---|---|
| Revenue | `/analytics/revenue` |
| Stores | `/analytics/stores` |
| Products | `/analytics/products` |
| Traffic | `/analytics/traffic` |
| Geography | `/analytics/geography` |

### 6. Comms — `/workspace/emails`
| Sub-page | Route |
|---|---|
| Email Dashboard | `/workspace/emails/dashboard` |
| Compose | `/workspace/emails/compose` |
| Email Templates | `/workspace/emails/templates` |
| Email Logs | `/workspace/emails/logs` |
| SMS | `/workspace/messaging/sms` |
| WhatsApp | `/workspace/messaging/whatsapp` |
| MSG Templates | `/workspace/messaging/templates` |
| MSG Logs | `/workspace/messaging/logs` |

### 7. Finance — `/finance`
| Sub-page | Route |
|---|---|
| Banking Overview | `/finance/banking` |
| Transactions | `/finance/banking/transactions` |
| Reconcile | `/finance/banking/reconciliation` |
| Ledger | `/workspace/ledger` |

### 8. Stores — `/workspace/stores`
| Sub-page | Route |
|---|---|
| All Stores | `/workspace/stores/all` |
| Applications | `/workspace/applications` |
| Store Detail | `/workspace/stores/[id]` |
| Application Detail | `/workspace/applications/[id]` |

### 9. QA — `/workspace/qa`
| Sub-page | Route |
|---|---|
| Dashboard | `/workspace/qa/dashboard` |
| Calls | `/workspace/qa/calls` |
| Reviews | `/workspace/qa/reviews` |
| Flags | `/workspace/qa/flags` |
| Employees | `/workspace/qa/employees` |
| Sync | `/workspace/qa/sync` |
| Call Detail | `/workspace/qa/calls/[id]` |
| Employee Detail | `/workspace/qa/employees/[id]` |

### 10. Marketing — `/marketing`
| Sub-page | Route |
|---|---|
| Dashboard | `/marketing/dashboard` |
| Campaigns | `/marketing/campaigns` |
| Ad Sets | `/marketing/ad-sets` |
| Ads | `/marketing/ads` |
| Creatives | `/marketing/creatives` |
| AI Creative Studio | `/marketing/creatives/generate` |
| Reports | `/marketing/reports` |
| Campaign Detail | `/marketing/campaigns/[id]` |
| Ad Set Detail | `/marketing/ad-sets/[id]` |
| Ad Detail | `/marketing/ads/[id]` |
| Report Detail | `/marketing/reports/[id]` |

### 11. Reports — `/reports`
| Sub-page | Route |
|---|---|
| All Reports | `/reports/all` |
| Day Close | `/reports/day-close` |
| Report Detail | `/reports/[id]` |

---

## ➡️ RIGHT WORKSPACE DOCK (19 items)

### Group 1 — Daily Work
| Icon | Name | Route |
|---|---|---|
| 📅 | Calendar | `/workspace/calendar` |
| 📋 | Tasks | `/operations/tasks` |
| 👥 | Team | `/workspace/team` |
| 💬 | Chat | `/workspace/chat` |
| 📞 | Calls (QA) | `/workspace/qa/calls` |
| 🆘 | Tickets | `/workspace/tickets` |
| 🔔 | Inbox | `/workspace/inbox` |

### Group 2 — Knowledge & Resources
| Icon | Name | Route |
|---|---|---|
| 🔭 | Research | `/workspace/research` |
| 🎓 | Learning | `/workspace/training` |
| 📖 | Help / Knowledge | `/workspace/knowledge` |
| 🔗 | Links | `/workspace/links` |
| 📁 | Files | `/workspace/files` |

### Group 3 — Power Tools
| Icon | Name | Route |
|---|---|---|
| ⚡ | Automations | `/automations/overview` |
| 📊 | Analytics | `/analytics/revenue` |
| ✨ | AI Tools | `/workspace/ai-tools` |
| 👥 | Remote Team (AI) | `/workspace/ai-team` |
| ✉️ | Gmail | `/workspace/gmail` |
| ⚙️ | Settings | `/workspace/settings` |

---

## 📚 ADDITIONAL MODULES BUILT (Right-Dock Detail Pages)

### Tickets — `/workspace/tickets`
| Sub-page | Route |
|---|---|
| Dashboard | `/workspace/tickets/dashboard` |
| All Tickets | `/workspace/tickets/all` |
| Internal | `/workspace/tickets/internal` |
| Client | `/workspace/tickets/client` |
| Categories | `/workspace/tickets/categories` |
| Detail | `/workspace/tickets/[id]` |

### Research — `/workspace/research`
| Sub-page | Route |
|---|---|
| Dashboard | `/workspace/research/dashboard` |
| Tools Library | `/workspace/research/tools` |
| Product Ideas | `/workspace/research/products` |
| Competitors | `/workspace/research/competitors` |
| Trends | `/workspace/research/trends` |
| Goals | `/workspace/research/goals` |
| Reports | `/workspace/research/reports` |
| Sources | `/workspace/research/sources` |
| Product Idea Detail | `/workspace/research/products/[id]` |
| Report Detail | `/workspace/research/reports/[id]` |

### Knowledge — `/workspace/knowledge`
| Sub-page | Route |
|---|---|
| Articles | `/workspace/knowledge/articles` |
| FAQ | `/workspace/knowledge/faq` |

### Training — `/workspace/training`
| Sub-page | Route |
|---|---|
| Videos | `/workspace/training/videos` |
| SOPs | `/workspace/training/sops` |
| SOP Detail | `/workspace/sops/[id]` |

### Operations — `/operations`
| Sub-page | Route |
|---|---|
| Tasks Kanban | `/operations/tasks` |
| My Tasks | `/operations/my-tasks` |
| Daily Report | `/operations/daily-report` |
| Day Close | `/operations/day-close` |
| Email Log | `/operations/email-log` |
| Marketing Calendar | `/operations/marketing-calendar` |
| Targets | `/operations/targets` |

### AI Tools — `/workspace/ai-tools`
| Sub-page | Route |
|---|---|
| All Tools | `/workspace/ai-tools/all` |
| Title Optimizer | `/workspace/ai-tools/title-optimizer` |
| Description Generator | `/workspace/ai-tools/description-generator` |
| Product Tags | `/workspace/ai-tools/product-tags` |
| Listing Audit | `/workspace/ai-tools/listing-audit` |
| Pricing Recommender | `/workspace/ai-tools/pricing-recommender` |
| Retailer Email | `/workspace/ai-tools/retailer-email` |
| Trend Analyzer | `/workspace/ai-tools/trend-analyzer` |

### Other Workspace Pages
- `/workspace/blogs`
- `/workspace/calendar`
- `/workspace/api-docs`
- `/workspace/account` + `/preferences` + `/security`
- `/workspace/roles`
- `/workspace/vendors`

---

## 🔍 GAP ANALYSIS — What's Missing for a Real Business

Looking at this through the lens of a **complete operating system for a wholesale ecommerce business**, here's what's still missing, ranked by impact.

---

## 🔴 CRITICAL GAPS (Build First)

### 1. HR / People Operations ⭐⭐⭐⭐⭐
**Why critical:** You have employees but no HR system. As you grow, this becomes a major pain.

**Pages needed:**
- Employees directory (production version)
- Payroll
- Leave / PTO management
- Attendance
- Onboarding workflows
- Offboarding
- Org chart
- Performance reviews (you have ratings but no review cycles)
- Recruitment pipeline
- Job postings

**Closest existing:** `team_members`, `employee_profiles`, `employee_performance_ratings`
**Replaces:** BambooHR ($6/employee/mo), Zoho People — saves $50-200/mo + builds proprietary data

---

### 2. Documents / Contracts / Legal ⭐⭐⭐⭐⭐
**Why critical:** Wholesale business runs on contracts (vendor agreements, retailer terms, NDAs, invoices). You have nothing for this.

**Pages needed:**
- Document library
- Contract templates
- E-signatures
- Document sharing with retailers/vendors
- Version control
- Expiry alerts
- Renewal tracking

**Replaces:** DocuSign ($25/mo), PandaDoc, HelloSign

---

### 3. Customer Support / Help Center (External-Facing) ⭐⭐⭐⭐
**Why critical:** Tickets is internal. You need a public-facing help center where retailers can self-serve.

**Pages needed:**
- Public knowledge base
- Submit ticket form (no login required)
- Ticket status checker
- FAQ pages organized by category
- Search

**You have:** Internal knowledge base + tickets — just need a public skin

---

### 4. Inventory Forecasting & Demand Planning ⭐⭐⭐⭐⭐
**Why critical:** You sell physical products. Running out of bestsellers = lost revenue. Overordering = dead capital.

**Pages needed:**
- Demand forecast (per SKU per month)
- Reorder alerts
- Safety stock thresholds
- Lead time tracking
- Seasonality model
- Stockout history
- Purchase order management

**Closest:** `catalog/inventory` — but no forecasting layer

---

### 5. Vendor / Supplier Management (Real one) ⭐⭐⭐⭐
**Why critical:** You have `faire_vendors` table but no real vendor relationship management.

**Pages needed:**
- Vendor directory with contacts
- Purchase orders
- Receiving / intake
- Vendor performance scorecards (on-time %, defect rate)
- Payment terms
- Contracts
- RFQs (Request for Quotes)

**Closest:** `workspace/vendors` (currently minimal)

---

## 🟡 HIGH-VALUE GAPS

### 6. Wiki / Internal Documentation Hub
Beyond SOPs and Knowledge — a true internal wiki with org pages, project pages, decision logs, meeting notes.
**Replaces:** Notion ($10/user/mo)

### 7. Forms Builder / Surveys
Build custom forms for retailer onboarding, vendor applications, internal feedback, customer satisfaction surveys.
**Replaces:** Typeform ($25-83/mo), Google Forms

### 8. Project Management
You have tasks but no project hierarchy (Epic → Project → Task → Subtask).
**Pages:** Projects board, Project timeline (Gantt), Milestones, Deliverables, Project budgets vs actual
**Replaces:** Asana, Linear, ClickUp

### 9. Learning Management System (Full)
You have training videos but no courses, no quizzes, no certifications, no completion tracking.
**Pages:** Courses, Lessons, Quizzes, Certifications, Learning paths, Progress dashboards
**Replaces:** Trainual, TalentLMS

### 10. Brand / Asset Management (DAM)
Centralized media library beyond product images — brand guidelines, logos, fonts, social media templates, marketing collateral.
**Replaces:** Brandfolder, Canva Pro

---

## 🟢 NICE-TO-HAVE (Later Phases)

| # | Module | Why | Replaces |
|---|---|---|---|
| 11 | Affiliate / Referral Program | Track referrers, commissions, payouts, links | Refersion ($89/mo) |
| 12 | Subscriptions / Recurring Orders | Manage retailer subscription orders, recurring billing | Recharge ($99/mo) |
| 13 | Returns Management (RMA) | Formal RMA workflow with serial tracking, refurbishment, resale | Loop Returns ($29+/mo) |
| 14 | B2B Quotes & Proposals | Custom quote generation, approval workflows, conversion to orders | Proposify ($35/mo) |
| 15 | Compliance / Audit Center | GDPR, data privacy, security audits, compliance documents, breach reports | Vanta ($1500+/mo) |
| 16 | Integrations Marketplace / API Management | Centralized place to manage all external integrations, API keys, webhooks, monitoring | n8n / Make.com |
| 17 | Multi-language / Localization | Important if you sell internationally on Faire | Lokalise |
| 18 | Mobile App / PWA | Critical for fulfillment team to use on warehouse floor | ✅ PWA already shipped! |

---

## 🎯 RECOMMENDED NEXT 3 MODULES (Priority Order)

Based on **business impact × effort × moat-building**:

### 🥇 #1 — HR / People Operations
**Why first:** You're building an OS. Every business has people. This unlocks payroll, attendance, onboarding, and turns your platform from "ops tool" into "business OS." You already have the foundation (`users`, `team_members`, `employee_profiles`).

**What you'd build:**
- 📋 Employee directory (full CRUD with profiles, contacts, employment history)
- 🏖️ PTO / leave management (request flow, approvals, balance tracking)
- ⏰ Attendance (clock in/out, shift schedules, late tracking)
- 📥 Onboarding workflows (checklists per role, document collection)
- 📤 Offboarding (exit interviews, equipment return, access revocation)
- 🌳 Org chart (auto-generated from `reporting_to` field)
- ⭐ Performance reviews (quarterly cycles, 360 reviews, goal tracking)
- 🎯 Recruitment pipeline (open roles, candidates, interviews, offers)
- 💼 Job postings (public job board)

**Estimated value:** $50-200/mo saved + proprietary HR data

---

### 🥈 #2 — Inventory Forecasting & Purchase Orders
**Why second:** Your business is wholesale — you live or die by inventory. This directly drives revenue (avoid stockouts) and cash flow (avoid overstock). Differentiator vs generic ERPs.

**What you'd build:**
- 📈 Demand forecast per SKU (3/6/12 month outlook based on historical sales + seasonality)
- 🚨 Reorder alerts (when stock < safety threshold)
- 📦 Purchase order management (create POs, track receipts)
- 🏭 Vendor lead time tracking
- 📊 Stockout history report
- 💰 Inventory valuation
- 🔄 ABC classification (which SKUs deserve focus)

**Estimated value:** Prevents 5-15% revenue loss from stockouts

---

### 🥉 #3 — Documents / E-Signatures
**Why third:** Every contract, vendor agreement, retailer onboarding pack, and NDA you sign currently lives in Gmail. Centralizing this is high-value, low-effort, and creates lock-in.

**What you'd build:**
- 📄 Document library (organize by retailer/vendor/internal)
- ✏️ Contract templates with variables
- ✍️ E-signature flow (send, track, store signed copies)
- 🔔 Renewal/expiry alerts
- 📎 Attach documents to retailers/vendors/orders
- 🔐 Access permissions

**Estimated value:** Replaces DocuSign ($25/mo) + builds proprietary contract data

---

## 📦 ALREADY-SHIPPED HIGHLIGHTS (Stable v1+)

| ✅ Module | Pages |
|---|---|
| **Orders Management** | All, Pending, Fulfillment, Shipments, Disputes, Quotes |
| **Catalog** | Listings, Collections, Inventory, Pricing, Sourcing, Image Studio |
| **Retailers CRM** | Directory, Campaigns, Follow-ups, WhatsApp |
| **Analytics** | Revenue, Stores, Products, Traffic, Geography |
| **Marketing (Meta Ads)** | Campaigns, Ad Sets, Ads, Creatives, AI Studio, Reports |
| **QA / Calls** | Dashboard, Calls, Reviews, Flags, Employees, Sync |
| **Tickets** | Internal kanban, Client cards, Categories, Full audit trail |
| **Research** | Tools (35+), Products, Competitors, Trends, Goals, Reports, Sources (22+) |
| **Comms** | Email, SMS, WhatsApp, Templates, Logs |
| **Finance** | Banking (Wise), Transactions, Reconciliation, Ledger |
| **HR Lite** | Team directory, Employee CV, Performance ratings, Skills |
| **Knowledge** | Articles, FAQ, SOPs, Training Videos |
| **AI Suite** | 8 AI tools (titles, descriptions, audit, pricing, emails, trends) |
| **Automations** | Daily syncs, cron jobs, daily sales report |
| **Chat** | Channels, DMs, file uploads, rich text, reactions, threads, realtime |
| **PWA** | Installable as desktop app on Windows/Mac/Linux/iOS/Android |

---

## 🔢 Timeline Suggestion

| Quarter | Focus | Modules |
|---|---|---|
| **Q2 2026** (now) | Foundation | HR Operations |
| **Q3 2026** | Inventory | Forecasting + Purchase Orders + Vendor Mgmt |
| **Q4 2026** | Documents | Contracts + E-signatures + DAM |
| **Q1 2027** | Public-facing | External help center + Forms builder |
| **Q2 2027** | Polish | LMS + Project mgmt + Wiki |

---

## 💡 Strategic Notes

1. **You have a moat already.** No other tool combines wholesale ops + Meta ads + Callyzer + Gemini AI + Faire integration + retailer CRM + internal team chat in one place. That breadth is unique.

2. **HR is the biggest gap.** Every business has people, and once you add payroll/leave/attendance, this becomes a complete "business OS" rather than an "ops dashboard."

3. **Inventory forecasting is the biggest lever.** It's the one feature that directly prevents lost revenue. Even a 2% improvement in stockout rate pays for years of platform development.

4. **PWA is shipped.** This gives you the option to ship as a "desktop app" with no app store gatekeepers.

5. **Spaces architecture is in place.** When you're ready, you can fork this for non-wholesale verticals (agencies, restaurants, etc.) with minimal refactor — that's the SaaS path.

---

## 📈 Module Density Score

Compared to other "all-in-one" platforms:

| Platform | Modules | TeamSync AI Equivalent |
|---|---|---|
| Notion | Docs, DB, Wiki, Tasks | Knowledge + Tasks (you have these) |
| ClickUp | Tasks, Docs, Goals, Time | Tasks + Goals (Research) |
| Monday.com | Boards, CRM, Dev | Tasks + Retailers (you have these) |
| Zoho One | 45+ apps | You have ~20 modules, on the right path |
| Microsoft 365 | Office + Teams + SharePoint | You have Chat + Files (need full Office) |

**Your platform sits between ClickUp and Zoho One in module breadth, with deeper vertical-specific features (wholesale, Faire) that none of them have.**

---

*Living document — last updated 2026-04-10. Update after each major module ships.*
