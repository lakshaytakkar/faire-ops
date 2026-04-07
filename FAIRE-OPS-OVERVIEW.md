# Faire Ops - Internal Operations Portal

**Suprans Wholesale | 6 Brand Stores on Faire**

---

## What Is This?

Faire Ops is the internal command center for managing our 6 wholesale brand stores on the Faire marketplace. It gives the team a single place to manage orders, products, retailers, analytics, and day-to-day operations across all brands — or drill into any one brand at a time.

Think of it as our custom-built Shopify backend, but purpose-built for wholesale operations on Faire.

---

## The 6 Brands

| Brand | Category | Color |
|-------|----------|-------|
| Buddha Ayurveda | Home Decor | Red |
| Lunar Gifts Co. | Gifts & Novelty | Blue |
| Toy Nest | Toys & Games | Green |
| Bloom Decor | Home & Garden | Amber |
| Spark Novelty | Party & Events | Purple |
| Cozy Bedding Co. | Bedding & Bath | Pink |

---

## How It Works

### Brand Dock (Left Sidebar)

A narrow icon strip on the far left lets you switch between brands instantly:

- **"All Brands"** — See aggregated data across all 6 stores. Central tools (Tasks, Team, Chat, Inbox) are also available.
- **Individual brand** — Everything filters to that brand only. The navigation simplifies to show only brand-relevant pages.

### Top Navigation

A horizontal bar across the top with equally-spaced tabs. The tabs change based on your brand selection:

**When viewing All Brands (8 tabs):**
Dashboard | Orders | Scraper & Pipeline | Products | CRM & Outreach | Analytics | Tasks | More

**When viewing a specific brand (6 tabs):**
Dashboard | Orders | Scraper & Pipeline | Products | CRM & Outreach | Analytics

Each tab has sub-pages accessible via a secondary tab bar below.

---

## Portal Sections

### 1. Dashboard
The home screen. Shows a hero banner with key portfolio metrics, stat cards, active orders, alerts (brands needing attention), brand performance table, and quick action shortcuts.

### 2. Orders
Full order lifecycle management.

| Sub-page | What It Does |
|----------|-------------|
| All Orders | Master table of all orders with search, status filters, and click-through to detail |
| Order Detail | Full drilldown for any order — fulfillment timeline, line items with thumbnails, financials (subtotal, shipping, commission, net payout), shipping address, retailer info, tracking, and action buttons |
| Pending | Focus view on orders awaiting acceptance, with urgency indicators |
| Returns | Return request management with approval workflow and status tracking |

**Order statuses:** Pending > Accepted > Shipped > Fulfilled

### 3. Scraper & Pipeline
Product discovery and sourcing workflow.

| Sub-page | What It Does |
|----------|-------------|
| Pipeline Kanban | 4-column board (Sourced > Pending Approval > Approved > Live on Faire) showing product cards with cost, wholesale price, and margin |
| Product Scraper | Trend scanning tool that finds products from sources like Minea, AliExpress, Alibaba. Shows signal strength and lets you queue products into the pipeline |

### 4. Products
Catalog and inventory management.

| Sub-page | What It Does |
|----------|-------------|
| Catalog | Full product listing with brand, category, pricing, stock levels, and status |
| Inventory | Stock level monitoring with low-stock and out-of-stock alerts |
| Pricing | Wholesale vs MSRP analysis with margin brackets and distribution |

### 5. CRM & Outreach
Retailer relationship management.

| Sub-page | What It Does |
|----------|-------------|
| Retailers | Master list of all retail buyers with order history, revenue, and status (Active, New, VIP, Inactive) |
| Outreach | Email campaign tracking — sent counts, open rates, reply rates |
| Follow-ups | Task list for pending retailer follow-ups with priority and due dates |

### 6. Analytics
Performance tracking and reporting.

| Sub-page | What It Does |
|----------|-------------|
| Revenue | Total revenue, month-over-month growth, average order value, commission tracking, and 6-month trend chart |
| Traffic | Traffic source analysis with visitor counts, page views, and conversion rates |
| Brands | Brand comparison — GMV distribution, head-to-head performance metrics |

### 7. Tasks (Central - All Brands only)
Internal task management for the team.

| Sub-page | What It Does |
|----------|-------------|
| Board | Kanban-style task board with 4 columns (To Do, In Progress, Review, Done). Each card shows priority, assignee, and due date |
| My Tasks | Personal view filtered to your assigned tasks |

### 8. More (Central - All Brands only)
Accessed via the "More" tab, containing:

| Page | What It Does |
|------|-------------|
| **Team** | Team member directory (6 people) with roles, departments, status, and contact info |
| **Roles** | Permission matrix showing what each role (Admin, Manager, Operator, Viewer) can access |
| **Inbox** | Notification center — order alerts, system messages, mentions. Filterable by type |
| **Chat** | Internal messaging with team members and retailer contacts. Conversation threads with send functionality |
| **Settings** | Business configuration — commission rates, thresholds, brand management |
| **Account** | Personal profile, security (password, 2FA, sessions), and display preferences |

---

## Key Concepts

### Brand Filtering
When you select a brand in the left dock, every data table, stat card, and metric automatically filters to show only that brand's data. Switch back to "All Brands" to see the full picture.

### Order Workflow
Orders flow through 4 stages: **Pending** (new order received) > **Accepted** (confirmed, ready to fulfill) > **Shipped** (tracking added, in transit) > **Fulfilled** (delivered to retailer). Each transition is a single button click.

### Product Pipeline
New products are discovered via the Scraper, then move through the Pipeline: **Sourced** (found) > **Pending Approval** (under review) > **Approved** (ready to list) > **Live on Faire** (published to marketplace).

### Financials
Every order shows a clear financial breakdown:
- **Subtotal** — Total product value
- **Shipping** — Fulfillment cost
- **Commission** — 15% Faire marketplace fee
- **Net Payout** — What we actually receive

---

## Team

| Person | Role | Focus Area |
|--------|------|------------|
| Lakshay | Founder & CEO | Strategy, oversight |
| Aditya | Operations Manager | Order fulfillment, logistics |
| Khushal | Fulfillment Lead | Shipping, tracking, warehouse |
| Bharti | CRM Specialist | Retailer relationships, outreach |
| Allen | Product Manager | Catalog, pricing, pipeline |
| Harsh | Analytics Lead | Reporting, performance tracking |

---

## Page Count

The portal has **31 screens** across all sections, built with a consistent design system — same typography, colors, card layouts, table styles, and badge patterns throughout.

---

## Tech Stack (for reference)

- **Framework:** Next.js 16 with React 19
- **Styling:** Tailwind CSS 4 with a custom blue-primary theme
- **Font:** Plus Jakarta Sans
- **Components:** shadcn/ui component library
- **Data:** Mock data (frontend only, no database connected yet)

The frontend is fully built and ready for backend integration when the time comes.
