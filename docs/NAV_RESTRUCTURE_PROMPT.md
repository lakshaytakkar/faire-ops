# Claude Code Prompt — Faire Ops Portal
## Navigation Restructure + Rename Pass

**Scope:** Rename tabs, restructure navigation, add new top-level sections. No UI redesign — only naming, routing, and structural changes. Portal is already built in Next.js 16 + React 19 + Tailwind + Plus Jakarta Sans.

---

## CHANGES OVERVIEW

### Tab Renames (top nav)
| Current | New | Route Change |
|---|---|---|
| Scraper & Pipeline | Catalog | `/scraper-pipeline` → `/catalog` |
| Products | *(merged into Catalog)* | `/products` → redirect to `/catalog/listings` |
| CRM & Outreach | Retailers | `/crm` → `/retailers` |
| Tasks | *(moved to Operations)* | `/tasks` → `/operations/tasks` |
| More | Workspace | `/more` → `/workspace` |
| *(new)* | Operations | `/operations` (new) |

### Sub-tab Renames
| Section | Current Sub-tab | New Sub-tab | Route |
|---|---|---|---|
| Catalog | Pipeline Kanban | Publishing Queue | `/catalog/publishing-queue` |
| Catalog | Product Scraper | Sourcing | `/catalog/sourcing` |
| Catalog | Catalog | Listings | `/catalog/listings` |
| Catalog | Inventory | Inventory | `/catalog/inventory` |
| Catalog | Pricing | Pricing | `/catalog/pricing` |
| Catalog | *(new)* | Image Studio | `/catalog/image-studio` |
| Orders | *(new)* | Fulfillment | `/orders/fulfillment` |
| Orders | *(new)* | Supplier Quotes | `/orders/quotes` |
| Retailers | Retailers | Directory | `/retailers/directory` |
| Retailers | Outreach | Campaigns | `/retailers/campaigns` |
| Retailers | Follow-ups | Follow-ups | `/retailers/follow-ups` |
| Retailers | *(new)* | WhatsApp Log | `/retailers/whatsapp` |
| Retailers | *(new)* | Faire Direct | `/retailers/faire-direct` |
| Analytics | *(new)* | Stores | `/analytics/stores` |
| Analytics | *(new)* | Products | `/analytics/products` |
| Operations | Tasks (moved) | Tasks | `/operations/tasks` |
| Operations | *(new)* | Daily Report | `/operations/daily-report` |
| Operations | *(new)* | Targets | `/operations/targets` |
| Operations | *(new)* | Day Close | `/operations/day-close` |
| Operations | *(new)* | Email Log | `/operations/email-log` |
| Workspace | More > Team | Team | `/workspace/team` |
| Workspace | More > Roles | Roles | `/workspace/roles` |
| Workspace | More > Inbox | Inbox | `/workspace/inbox` |
| Workspace | More > Chat | Chat | `/workspace/chat` |
| Workspace | More > Settings | Settings | `/workspace/settings` |
| Workspace | More > Account | Account | `/workspace/account` |
| Workspace | *(new)* | Blogs & Learning | `/workspace/blogs` |
| Workspace | *(new)* | Faire API Docs | `/workspace/api-docs` |
| Workspace | *(new)* | Active Stores | `/workspace/stores` |

---

## STEP 1 — UPDATE ROUTE STRUCTURE

### New folder structure under `src/app/(portal)/`:

```
(portal)/
├── dashboard/
├── orders/
│   ├── page.tsx              ← All Orders (existing, keep)
│   ├── [id]/page.tsx         ← Order Detail (existing, keep)
│   ├── pending/page.tsx      ← Pending (existing, keep)
│   ├── returns/page.tsx      ← Returns (existing, keep)
│   ├── fulfillment/page.tsx  ← NEW — stub
│   └── quotes/page.tsx       ← NEW — stub
│
├── catalog/                  ← NEW top-level (was /scraper-pipeline + /products)
│   ├── page.tsx              ← redirects to /catalog/listings
│   ├── listings/page.tsx     ← was /products/catalog
│   ├── sourcing/page.tsx     ← was /scraper-pipeline (scraper tab)
│   ├── publishing-queue/page.tsx ← was /scraper-pipeline (kanban tab)
│   ├── image-studio/page.tsx ← NEW — stub
│   ├── inventory/page.tsx    ← was /products/inventory
│   └── pricing/page.tsx      ← was /products/pricing
│
├── retailers/                ← was /crm
│   ├── page.tsx              ← redirects to /retailers/directory
│   ├── directory/page.tsx    ← was /crm/retailers
│   ├── campaigns/page.tsx    ← was /crm/outreach
│   ├── follow-ups/page.tsx   ← was /crm/follow-ups
│   ├── whatsapp/page.tsx     ← NEW — stub
│   └── faire-direct/page.tsx ← NEW — stub
│
├── analytics/
│   ├── revenue/page.tsx      ← existing
│   ├── traffic/page.tsx      ← existing
│   ├── brands/page.tsx       ← existing
│   ├── stores/page.tsx       ← NEW — stub
│   └── products/page.tsx     ← NEW — stub
│
├── operations/               ← NEW top-level section
│   ├── page.tsx              ← redirects to /operations/tasks
│   ├── tasks/page.tsx        ← was /tasks (move content here)
│   ├── daily-report/page.tsx ← NEW — stub
│   ├── targets/page.tsx      ← NEW — stub
│   ├── day-close/page.tsx    ← NEW — stub
│   └── email-log/page.tsx    ← NEW — stub
│
└── workspace/                ← was /more
    ├── page.tsx              ← redirects to /workspace/team
    ├── team/page.tsx         ← was /more/team
    ├── roles/page.tsx        ← was /more/roles
    ├── inbox/page.tsx        ← was /more/inbox
    ├── chat/page.tsx         ← was /more/chat
    ├── settings/page.tsx     ← was /more/settings
    ├── account/page.tsx      ← was /more/account
    ├── blogs/page.tsx        ← NEW — stub
    ├── api-docs/page.tsx     ← NEW — stub
    └── stores/page.tsx       ← NEW — stub (Active Stores)
```

For every route that changed, add a redirect:
```ts
// src/app/(portal)/scraper-pipeline/page.tsx
import { redirect } from "next/navigation"
export default function() { redirect("/catalog/listings") }

// src/app/(portal)/products/page.tsx
import { redirect } from "next/navigation"
export default function() { redirect("/catalog/listings") }

// src/app/(portal)/crm/page.tsx
import { redirect } from "next/navigation"
export default function() { redirect("/retailers/directory") }

// src/app/(portal)/tasks/page.tsx
import { redirect } from "next/navigation"
export default function() { redirect("/operations/tasks") }

// src/app/(portal)/more/page.tsx
import { redirect } from "next/navigation"
export default function() { redirect("/workspace/team") }
```

---

## STEP 2 — UPDATE TOP NAVIGATION CONFIG

Find the nav config file (likely in `src/components/layout/` or `src/config/nav.ts`).

Replace the navigation items array with:

```ts
// src/config/nav.ts

import {
  LayoutDashboard, ShoppingCart, BookOpen, Users,
  BarChart2, Wrench, Building2
} from "lucide-react"

export type NavItem = {
  label: string
  href: string
  icon: React.ComponentType
  badge?: number
  allBrandsOnly?: boolean
}

export const NAV_ALL_BRANDS: NavItem[] = [
  { label: "Dashboard",   href: "/dashboard",   icon: LayoutDashboard },
  { label: "Orders",      href: "/orders",       icon: ShoppingCart,   badge: 0 },
  { label: "Catalog",     href: "/catalog",      icon: BookOpen,       badge: 0 },
  { label: "Retailers",   href: "/retailers",    icon: Users },
  { label: "Analytics",   href: "/analytics",    icon: BarChart2 },
  { label: "Operations",  href: "/operations",   icon: Wrench },
  { label: "Workspace",   href: "/workspace",    icon: Building2,      allBrandsOnly: true },
]

export const NAV_SINGLE_BRAND: NavItem[] = NAV_ALL_BRANDS.filter(i => !i.allBrandsOnly)

// Sub-navigation per section
export const SUBNAV: Record<string, { label: string; href: string }[]> = {
  "/orders": [
    { label: "All Orders",      href: "/orders" },
    { label: "Pending",         href: "/orders/pending" },
    { label: "Fulfillment",     href: "/orders/fulfillment" },
    { label: "Returns",         href: "/orders/returns" },
    { label: "Supplier Quotes", href: "/orders/quotes" },
  ],
  "/catalog": [
    { label: "Listings",          href: "/catalog/listings" },
    { label: "Sourcing",          href: "/catalog/sourcing" },
    { label: "Publishing Queue",  href: "/catalog/publishing-queue" },
    { label: "Image Studio",      href: "/catalog/image-studio" },
    { label: "Inventory",         href: "/catalog/inventory" },
    { label: "Pricing",           href: "/catalog/pricing" },
  ],
  "/retailers": [
    { label: "Directory",     href: "/retailers/directory" },
    { label: "WhatsApp Log",  href: "/retailers/whatsapp" },
    { label: "Campaigns",     href: "/retailers/campaigns" },
    { label: "Faire Direct",  href: "/retailers/faire-direct" },
    { label: "Follow-ups",    href: "/retailers/follow-ups" },
  ],
  "/analytics": [
    { label: "Revenue",   href: "/analytics/revenue" },
    { label: "Stores",    href: "/analytics/stores" },
    { label: "Products",  href: "/analytics/products" },
    { label: "Traffic",   href: "/analytics/traffic" },
    { label: "Brands",    href: "/analytics/brands" },
  ],
  "/operations": [
    { label: "Tasks",         href: "/operations/tasks" },
    { label: "Daily Report",  href: "/operations/daily-report" },
    { label: "Targets",       href: "/operations/targets" },
    { label: "Day Close",     href: "/operations/day-close" },
    { label: "Email Log",     href: "/operations/email-log" },
  ],
  "/workspace": [
    { label: "Team",              href: "/workspace/team" },
    { label: "Roles",             href: "/workspace/roles" },
    { label: "Inbox",             href: "/workspace/inbox" },
    { label: "Chat",              href: "/workspace/chat" },
    { label: "Blogs & Learning",  href: "/workspace/blogs" },
    { label: "Faire API Docs",    href: "/workspace/api-docs" },
    { label: "Active Stores",     href: "/workspace/stores" },
    { label: "Settings",          href: "/workspace/settings" },
    { label: "Account",           href: "/workspace/account" },
  ],
}
```

---

## STEP 3 — UPDATE TOP NAV COMPONENT

In the top navigation component, update label rendering to match the new names. Key changes:
- Any text "Scraper & Pipeline" → "Catalog"
- Any text "CRM & Outreach" → "Retailers"
- Any text "More" → "Workspace"
- Any text "Tasks" (standalone nav item) → remove from top nav, appears under Operations
- Add "Operations" as new top nav item
- "Pipeline Kanban" anywhere in the UI → "Publishing Queue"
- "Product Scraper" anywhere → "Sourcing"

Search for and replace ALL instances of these strings in the codebase:
```bash
# Find all occurrences to update
grep -r "Scraper & Pipeline" src/
grep -r "Pipeline Kanban" src/
grep -r "Product Scraper" src/
grep -r "CRM & Outreach" src/
grep -r "/crm" src/
grep -r "/scraper-pipeline" src/
grep -r "/products" src/
grep -r "More" src/components/layout/  # only nav-related "More"
```

---

## STEP 4 — CREATE STUB PAGES

For every new route that doesn't have content yet, create a stub:

```tsx
// Template for all stub pages
// Replace PAGE_NAME, SECTION_NAME, DESCRIPTION accordingly

"use client"
export default function PageNamePage() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
      <p className="text-base font-semibold text-foreground">PAGE_NAME</p>
      <p className="text-sm text-muted-foreground max-w-sm">
        DESCRIPTION — coming soon
      </p>
    </div>
  )
}
```

New stubs to create:
- `/orders/fulfillment` — "Fulfillment queue for Khushal — accepted orders needing tracking"
- `/orders/quotes` — "Supplier quote requests linked to incoming Faire orders"
- `/catalog/image-studio` — "AI-powered image optimization and creative generation for listings"
- `/retailers/whatsapp` — "Log of all WhatsApp messages sent to retailers"
- `/retailers/faire-direct` — "Faire Direct retailer tracking and invitation management"
- `/analytics/stores` — "Store-level performance metrics and health scores"
- `/analytics/products` — "Top performing and underperforming product analytics"
- `/operations` (+ all sub-pages) — see descriptions in master guide
- `/workspace/blogs` — "Faire seller blog articles scraped and filtered for the team"
- `/workspace/api-docs` — "Faire API schema reference — Products, Orders, Retailers"
- `/workspace/stores` — "Active store profiles, logos, and creative assets"

---

## STEP 5 — UPDATE BRAND DOCK

The brand dock on the far left currently shows brand initials (BA, LG, TN, BD, SN, CB) and an "All Brands" icon.

No visual changes needed. But update the "All Brands" tooltip/label if it says anything about the old sections. Ensure clicking "All Brands" shows the full 7-tab nav (including Workspace). Clicking a brand shows the 6-tab nav (Dashboard through Operations, no Workspace).

---

## STEP 6 — UPDATE PAGE TITLES

Every page has a title shown somewhere (topbar, breadcrumb, or hero). Update all instances:

| Old title | New title |
|---|---|
| "Scraper & Pipeline" | "Catalog" |
| "Pipeline Kanban" | "Publishing Queue" |
| "Product Scraper" | "Sourcing" |
| "CRM & Outreach" | "Retailers" |
| "Tasks" (standalone) | "Operations" |
| "More" | "Workspace" |
| "Products" | "Catalog — Listings" |

---

## STEP 7 — TASKS PAGE MIGRATION

The existing Tasks page (`/tasks`) has a Kanban board and My Tasks view. Do not rebuild it — just move it:

1. Copy the page component to `/operations/tasks/page.tsx`
2. Copy any sub-components to `/components/operations/tasks/`
3. Add redirect from old `/tasks` route
4. Update all internal links that pointed to `/tasks` to now point to `/operations/tasks`
5. The Operations section's default route (`/operations/page.tsx`) redirects to `/operations/tasks`

---

## STEP 8 — VERIFICATION CHECKLIST

- [ ] `/catalog` → redirects to `/catalog/listings`
- [ ] `/catalog/publishing-queue` — loads (stub or full)
- [ ] `/catalog/sourcing` — loads
- [ ] `/catalog/image-studio` — loads stub
- [ ] `/retailers/directory` — loads (was /crm/retailers)
- [ ] `/retailers/faire-direct` — loads stub
- [ ] `/operations` → redirects to `/operations/tasks`
- [ ] `/operations/tasks` — loads the existing Tasks kanban
- [ ] `/workspace` → redirects to `/workspace/team`
- [ ] `/workspace/blogs` — loads stub
- [ ] Old routes `/scraper-pipeline`, `/products`, `/crm`, `/tasks`, `/more` — all redirect correctly
- [ ] Top nav shows "Catalog" not "Scraper & Pipeline"
- [ ] Top nav shows "Retailers" not "CRM & Outreach"
- [ ] Top nav shows "Operations" and "Workspace" (when All Brands selected)
- [ ] No "Tasks" as standalone top-level tab anymore
- [ ] Sub-nav for Catalog shows 6 items including "Image Studio"
- [ ] Sub-nav for Retailers shows "WhatsApp Log" and "Faire Direct"
- [ ] Sub-nav for Operations shows all 5 items
- [ ] Sub-nav for Workspace shows all 9 items including new ones
- [ ] Brand dock: single brand view shows 6 tabs (no Workspace)
- [ ] Brand dock: All Brands shows 7 tabs (includes Workspace)
