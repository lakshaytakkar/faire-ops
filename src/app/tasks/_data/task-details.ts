/**
 * Detail records for leaf nodes on /tasks.
 *
 * Keys are TaskNode `id`s. Each tab reads a subset of fields:
 *   tasks   → objective, acceptance, steps, blockers, estimate, priority, owner, space
 *   ideas   → problem, valueProp, hypothesis, successMetric, effort, impact
 *   bugs    → repro, expected, actual, severity, area, affectedPaths, suspectedCause, fixPlan
 *   plugins → plugin.{purpose, screens[], flows[], dataModel[], apis[], permissions[], widgets[]}
 */

export type Status = "planned" | "in_progress" | "blocked" | "done" | "idea"
export type Priority = "low" | "medium" | "high" | "urgent"
export type Severity = "low" | "med" | "high" | "critical"
export type Impact = "low" | "med" | "high"
export type Effort = "XS" | "S" | "M" | "L" | "XL"

export interface ScreenSpec {
  path: string
  name: string
  purpose: string
  subpages?: Array<{ path: string; name: string; purpose: string }>
}

export interface FlowSpec {
  name: string
  description: string
}

export interface PluginSpec {
  purpose?: string
  status?: "planned" | "built" | "stable"
  screens?: ScreenSpec[]
  flows?: FlowSpec[]
  dataModel?: string[]
  apis?: string[]
  integrations?: string[]
  permissions?: string[]
  widgets?: string[]
}

export interface TaskDetail {
  // shared
  summary?: string
  status?: Status
  priority?: Priority
  owner?: string
  space?: string
  tags?: string[]

  // TASK
  objective?: string
  acceptance?: string[]
  steps?: string[]
  blockers?: string[]
  estimate?: string
  dueDate?: string

  // IDEA
  problem?: string
  valueProp?: string
  hypothesis?: string
  successMetric?: string
  effort?: Effort
  impact?: Impact

  // BUG
  repro?: string[]
  expected?: string
  actual?: string
  severity?: Severity
  area?: string
  affectedPaths?: string[]
  suspectedCause?: string
  fixPlan?: string[]

  // PLUGIN
  plugin?: PluginSpec
}

/* ------------------------------------------------------------------ */
/*  TASK details                                                       */
/* ------------------------------------------------------------------ */

const TASKS: Record<string, TaskDetail> = {
  "canva-foshan": {
    objective: "Create a Canva post announcing the Foshan office opening for social distribution.",
    summary: "Branded announcement post for Suprans Foshan office.",
    priority: "medium",
    owner: "Meera (Marketing)",
    space: "HQ",
    acceptance: [
      "Canva design in Suprans brand kit (colors, fonts, logo placement)",
      "Square (IG) + landscape (LinkedIn) variants exported",
      "Posted on IG + LinkedIn with localized caption",
    ],
    steps: [
      "Pull latest brand kit from Canva team folder",
      "Draft headline + subheading (English + Mandarin)",
      "Export PNG + WebP; upload to marketing assets bucket",
      "Schedule via Buffer or manual post",
    ],
    estimate: "2h",
  },
  "ets-presentation": {
    objective: "Build ETS sales deck in Suprans visual style using Canva.",
    priority: "medium",
    owner: "Meera",
    space: "ETS",
    acceptance: [
      "20–25 slides, cover → services → process → pricing → case studies → CTA",
      "Matches Suprans brand kit + ETS accent palette",
      "PDF + editable Canva link in Drive",
    ],
    estimate: "1 day",
  },
  "marketing-pages": {
    objective: "Ship marketing pages + connectors across verticals, wire them into the main portal.",
    priority: "high",
    space: "HQ + verticals",
    acceptance: [
      "Each vertical has /marketing route with hero, features, pricing, FAQ",
      "Shared connectors: Stripe/Razorpay link generator, Calendly, Mailchimp",
      "SEO: title, description, OG image, sitemap entry",
    ],
  },
  "faire-process": {
    objective: "Design and build the Faire daily-message automation process.",
    priority: "high",
    owner: "Vikram + Priya",
    space: "Operations",
    acceptance: [
      "Template library with variables ({{retailer_name}}, {{last_order_days}}, {{suggested_products}})",
      "Cadence engine: first-contact, 7d follow-up, 30d reactivation",
      "Compliance: rate limits + do-not-contact list + per-store daily cap",
      "Audit log per message (sent_at, delivered, opened, replied)",
    ],
    steps: [
      "Map existing manual flow on whiteboard",
      "Define state machine (new → contacted → engaged → converted → dormant)",
      "Seed templates per state",
      "Schedule daily job on Vercel cron",
    ],
  },
  "faire-scrape": {
    objective: "Scrape retailer list via Claude browser / Playwright using env creds.",
    priority: "high",
    owner: "Vikram",
    space: "Operations",
    acceptance: [
      "Playwright script logs in with env creds",
      "Scrapes retailer list: name, store URL, city, categories, last_order",
      "Writes to public.faire_retailers with upsert on external_id",
    ],
    blockers: ["Faire ToS review", "Rate limit strategy"],
  },
  "find-retailers": {
    objective: "Identify USA retailers matching Suprans vertical (candles, wellness, lifestyle).",
    priority: "medium",
  },
  "product-selection-call": {
    objective: "Define the call-based product selection process for interior catalog clients.",
    priority: "medium",
    acceptance: [
      "Scripted call flow (needs → budget → style → category → curate)",
      "Live-share catalog link that filters as preferences are captured",
      "End-of-call summary PDF auto-emailed",
    ],
  },
  "team-expectations": {
    objective: "Document clear expectations from every team role — ownership, escalation, 'extra step' behavior.",
    priority: "high",
    owner: "Lakshay",
    space: "HQ",
    acceptance: [
      "Role-by-role expectations doc in /learning",
      "Weekly review cadence for ownership tickets",
      "Performance signals defined per role",
    ],
  },
  "legal-notice": {
    objective: "Send legal notice to SP Jangid.",
    priority: "urgent",
    owner: "Legal + Lakshay",
  },
  "sop-ln-ops": {
    objective: "Create SOPs for LegalNations day-to-day operations.",
    priority: "high",
    space: "LegalNations",
    acceptance: [
      "SOP: new-client onboarding (LLC → EIN → bank → filings)",
      "SOP: monthly bookkeeping close",
      "SOP: annual tax filing (1120/5472)",
      "SOP: state compliance cadence",
    ],
  },
  "hire-customer-calls": {
    objective: "Hire a customer calls & service manager.",
    priority: "high",
    owner: "Lakshay",
    space: "HQ",
  },
  "hire-sales-relation": {
    objective: "Hire a sales / relationship-building role (WhatsApp + tickets).",
    priority: "high",
  },
  "hire-overall-manager": {
    objective: "Hire an overall Operations Manager.",
    priority: "high",
  },
  "hire-female-rep": {
    objective: "Hire a female client-facing representative.",
    priority: "medium",
  },
  "website-migrate": {
    objective: "Migrate suprans.in marketing site into the main portal.",
    priority: "high",
    acceptance: [
      "Routes live under /marketing + /about + /careers",
      "SEO parity (redirects, canonicals, sitemap)",
      "CMS-backed pages via Supabase",
    ],
  },
  "toyarina-gullee": {
    objective: "Migrate Toyarina + Gullee Pets into the B2B ecommerce space.",
    priority: "high",
    owner: "Priya",
    space: "B2B Ecommerce",
  },
  "ln-migration": {
    objective: "Complete LegalNations data migration from remote Supabase (249 clients, 28 filings, ~1000 checklist items).",
    priority: "urgent",
    owner: "Vikram",
    space: "LegalNations",
    blockers: ["Schema diff reconciliation"],
  },
  "seed-ats": {
    objective: "Seed real candidate data into ATS tables.",
    priority: "medium",
  },
  "seed-hrms": {
    objective: "Seed real employee records into HRMS tables.",
    priority: "medium",
  },
  "seed-callsync": {
    objective: "Seed Callsync mobile app — on-demand + auto call sync.",
    priority: "medium",
  },
  "ets-complete": {
    objective: "Complete EazyToSell client portal and ready for launch.",
    priority: "urgent",
    owner: "Vikram",
    space: "ETS",
    acceptance: [
      "Client login works against ETS schema",
      "Dashboard, orders, catalog, support ticket flows functional",
      "Billing + invoice view",
      "Deployed to prod via Vercel, alias set",
    ],
  },
  "ets-1click-website": {
    objective: "One-click website launch from client brief.",
    priority: "high",
  },
  "ets-1click-brand": {
    objective: "One-click brand kit generator (logo, palette, typography).",
    priority: "high",
  },
  "ets-1click-catalog": {
    objective: "One-click catalog build from supplier feed.",
    priority: "high",
  },
  "ets-1click-creatives": {
    objective: "One-click ad creative generation (static + motion).",
    priority: "high",
  },
  "ets-1click-adrun": {
    objective: "One-click ad campaign launch to Meta + Google.",
    priority: "high",
  },
  "ets-3day-website": {
    objective: "3-day website build SLA — intake form → team assembles → delivered.",
    priority: "medium",
  },
  "jsblueridge": {
    objective: "Revive and stabilize JSBlueridge property.",
    priority: "medium",
  },
  "usdrop-client": {
    objective: "Ship USDrop client portal at stable quality.",
    priority: "urgent",
    owner: "Vikram",
    space: "USDrop",
  },
  "usdrop-admin": {
    objective: "Ship USDrop admin portal at stable quality.",
    priority: "urgent",
    owner: "Vikram",
    space: "USDrop",
  },
  "usdrop-rbac": {
    objective: "Build reusable RBAC + user management panels/plugins usable across all spaces.",
    priority: "high",
    acceptance: [
      "Roles + permissions stored in public.roles / public.role_permissions",
      "Drop-in <UserTable /> + <RoleEditor /> components",
      "Per-space scoping",
    ],
  },
  "docusign": {
    objective: "Integrate DocuSign for contract signing workflows.",
    priority: "medium",
  },
  "ideas-plugin": {
    objective: "Build an ideas plugin (this page is prior art).",
    priority: "medium",
  },
  "razorpay-sync": {
    objective: "Two-way Razorpay sync — payments, payouts, refunds.",
    priority: "high",
    owner: "Vikram",
    space: "HQ + verticals",
  },
  "wise-payments": {
    objective: "Integrate Wise for outbound payments (vendors, salaries).",
    priority: "medium",
  },
  "stack-page": {
    objective: "Improve /workspace/stack (broken logos, dead links, stale entries).",
    priority: "medium",
  },
  "folder-hygiene": {
    objective: "Create a 'folder/DB hygiene' skill that audits repo + schema for orphan files and tables.",
    priority: "low",
  },
  "task-mgmt-tree": {
    objective: "Keep this 3-level task tree model stable and migratable to Supabase.",
    priority: "medium",
  },
  "faire-new-account": {
    objective: "Open a new Faire account using a fresh gmail + domain, seed 5 branded candles.",
    priority: "high",
    steps: [
      "Buy domain + set up Gmail",
      "Design brand page assets",
      "Prepare 5 product listings (CSV)",
      "Apply via Faire browser UI",
      "Wait for approval; submit follow-up docs if requested",
    ],
  },
  "faire-us-suppliers": {
    objective: "Find US-based suppliers for Faire expansion; fix outreach approach.",
    priority: "medium",
  },
  "faire-products-flow-fix": {
    objective: "Fix the broken product management pipeline in Faire Ops.",
    priority: "urgent",
    owner: "Vikram",
  },
  "sales-page-hq": {
    objective: "Build the Suprans HQ Sales page + replicate into all vertical spaces.",
    priority: "high",
  },
  "enrich-dashboards": {
    objective: "Enrich every dashboard across every space — analytics, reports, KPIs.",
    priority: "medium",
    space: "All spaces",
  },
  "flows-crud-plan": {
    objective: "Add full FLOWS + CRUD coverage across every page/subpage — long-running agent task.",
    priority: "high",
    acceptance: [
      "Every list page has create / edit / delete",
      "Every detail page has edit + related actions",
      "Forms validate against DB schema",
    ],
  },
  "internal-linking": {
    objective: "Improve internal linking, microinteractions, feedback polish across all portal pages.",
    priority: "medium",
  },
}

/* ------------------------------------------------------------------ */
/*  IDEA details (includes Future Scope)                               */
/* ------------------------------------------------------------------ */

const IDEAS: Record<string, TaskDetail> = {
  "idea-faire-auto-accept": {
    problem: "Operators manually click 'accept' on every new Faire order even when inventory clearly covers it.",
    valueProp: "Auto-accept high-confidence orders reduces time-to-confirm from hours → seconds.",
    hypothesis: "80%+ of current orders pass the 'inventory >= qty' check and can be safely auto-accepted.",
    successMetric: "Median accept latency < 2 min; zero wrong-accepts/month.",
    impact: "high",
    effort: "S",
    space: "Operations",
  },
  "idea-faire-inv-alerts": {
    problem: "Stockouts are discovered only when an order can't ship.",
    valueProp: "Proactive Slack + email + in-app alert when SKU drops below threshold.",
    successMetric: "Zero stockout-related cancellations per quarter.",
    impact: "high",
    effort: "S",
  },
  "idea-faire-tracking-writeback": {
    problem: "Manual 17Track lookups and manual Faire API writes.",
    valueProp: "Auto-poll 17Track every N hours and write tracking to Faire via API.",
    successMetric: "< 1h delay between carrier scan and Faire record update.",
    impact: "med",
    effort: "M",
  },
  "idea-faire-smart-reconcile": {
    problem: "Transaction-to-order reconciliation is fragile; Gemini can disambiguate.",
    valueProp: "LLM matches bank txn memo ↔ order id with confidence score.",
    successMetric: "95%+ auto-match rate; humans review only < 0.8 conf.",
    impact: "med",
    effort: "M",
  },
  "idea-faire-payout-recon": {
    problem: "Faire payouts → Wise deposits have multi-day lag; no automated trace.",
    valueProp: "Reconcile payouts against Wise deposits with variance report.",
    impact: "med",
    effort: "M",
  },
  "idea-faire-churn": {
    problem: "Retailers churn silently.",
    valueProp: "Predict churn from order cadence; auto-trigger re-engagement email.",
    successMetric: "+15% reactivation on predicted-churn cohort.",
    impact: "high",
    effort: "M",
  },
  "idea-faire-bulk-accept": {
    problem: "Accepting 50+ new orders one-by-one is tedious.",
    valueProp: "Bulk accept with per-order inventory check + audit trail.",
    impact: "med",
    effort: "XS",
  },
  "idea-faire-demand-forecast": {
    problem: "No per-SKU demand prediction.",
    valueProp: "Time-series forecast (Prophet or Gemini) drives procurement.",
    impact: "med",
    effort: "L",
  },
  "idea-ln-tax-reminders": {
    problem: "Clients miss tax deadlines; we scramble at the last minute.",
    valueProp: "Automated 90/30/7-day reminders via email + WhatsApp per-client.",
    successMetric: "Zero missed deadlines in Q1.",
    impact: "high",
    effort: "S",
    space: "LegalNations",
  },
  "idea-ln-health-score": {
    problem: "No single signal for 'is this client healthy'.",
    valueProp: "Composite score = LLC + EIN + payments + doc completeness + activity.",
    impact: "high",
    effort: "M",
  },
  "idea-ets-launch-seq": {
    problem: "Store launches have many manual phase transitions.",
    valueProp: "Auto-sequence next-phase when checklist completes.",
    impact: "high",
    effort: "M",
    space: "ETS",
  },
  "idea-usdrop-pipeline-score": {
    problem: "Product pipeline review is manual and subjective.",
    valueProp: "AI scores each product (demand + competition + margin) 1–10.",
    impact: "high",
    effort: "M",
  },
  "idea-hq-pnl-close": {
    problem: "Monthly P&L close takes days.",
    valueProp: "Auto-close + AI narrative of month-over-month variance.",
    impact: "high",
    effort: "L",
  },
  "idea-hq-compliance-alerts": {
    problem: "GST, TDS, ROC deadlines creep up without a system.",
    valueProp: "Calendar-driven alerts per entity per filing type.",
    impact: "high",
    effort: "S",
  },
  "idea-goyo-visa-remind": {
    problem: "Visa expiry issues at immigration cause trip cancellations.",
    valueProp: "90/30/7 day reminders to travelers with doc update CTA.",
    impact: "high",
    effort: "S",
    space: "GoyoTours",
  },
  "idea-goyo-itinerary-ai": {
    problem: "Itinerary writing is slow and templated.",
    valueProp: "AI drafts itinerary from template + preferences → human polishes.",
    impact: "high",
    effort: "M",
  },
  "idea-cs-notif-hub": {
    problem: "Notifications fan out to Slack + email + WhatsApp + in-app with no unified view.",
    valueProp: "One notifications hub, user picks channel preference per category.",
    impact: "high",
    effort: "L",
  },
  "idea-cs-anomaly": {
    problem: "Revenue drops, churn spikes, cost overruns are noticed late.",
    valueProp: "Nightly anomaly detector flags outliers cross-space.",
    impact: "high",
    effort: "L",
  },
  "idea-toys-project": {
    problem: "Toy imports is an untapped vertical.",
    valueProp: "New space under Suprans — ideation, legal, omnichannel India.",
    impact: "high",
    effort: "XL",
  },
  "idea-china-imports": {
    problem: "No dedicated admin + client for China import flow.",
    valueProp: "Dedicated admin + chinaimports.in client portal.",
    impact: "high",
    effort: "XL",
  },
  "idea-omnichannel": {
    problem: "Single-channel (Faire) = single point of failure.",
    valueProp: "Expand to Shopify, Amazon, TikTok Shop, Etsy with unified inventory.",
    impact: "high",
    effort: "XL",
  },
  "idea-ai-order-risk": {
    problem: "High-value first-order retailers sometimes charge back.",
    valueProp: "Risk score flags risky orders; humans gate high-risk.",
    impact: "med",
    effort: "M",
  },
  "idea-ai-margin-calc": {
    problem: "Margin is a mental calculation at decision time.",
    valueProp: "Real-time margin per SKU with COGS + Faire fees + shipping.",
    impact: "med",
    effort: "S",
  },
  "idea-acc-separate-space": {
    problem: "Accounting is scattered between spreadsheets + mental model.",
    valueProp: "Dedicated CA + compliance space or mini-ledger in HQ.",
    impact: "high",
    effort: "L",
  },
  "idea-role-scoping": {
    problem: "Role-based access is ad-hoc.",
    valueProp: "Clone + scope a space per role with pros/cons/auth enumerated.",
    impact: "med",
    effort: "M",
  },
  "idea-portal-skins": {
    problem: "Every space has the same look — hard to differentiate.",
    valueProp: "1-click theme swap per portal with multiple pre-built skins.",
    impact: "med",
    effort: "M",
  },
  "idea-component-lib": {
    problem: "Shared primitives live inside the app; hard to reuse cross-repo.",
    valueProp: "Extract to a separate @suprans/ui package.",
    impact: "med",
    effort: "L",
  },
}

/* ------------------------------------------------------------------ */
/*  BUG details                                                        */
/* ------------------------------------------------------------------ */

const BUGS: Record<string, TaskDetail> = {
  "bug-dev-projects-500": {
    severity: "high",
    area: "API / RSC",
    affectedPaths: ["/development/projects"],
    repro: [
      "Navigate to /development/projects as any authenticated user",
      "Page returns HTTP 500 during RSC render",
    ],
    expected: "Page renders the project list.",
    actual: "500 error; server-side crash.",
    suspectedCause: "Likely null row / bad join against project_types; check server logs.",
    fixPlan: [
      "Reproduce locally with same auth",
      "Add null-safe guards in the Supabase select chain",
      "Add error boundary + retry",
    ],
  },
  "bug-projects-500": {
    severity: "high",
    area: "API / RSC",
    affectedPaths: ["/projects"],
    repro: ["Open /projects"],
    expected: "Projects list renders.",
    actual: "'This page couldn't load' error banner.",
    fixPlan: ["Check server logs", "Fix null/undefined guards", "Add sane fallback UI"],
  },
  "bug-qa-calls-404": {
    severity: "med",
    area: "Routing",
    affectedPaths: ["/workspace/qa/calls"],
    repro: [
      "Navigate to any /workspace page",
      "Inspect network — prefetch for /workspace/qa/calls returns 404",
    ],
    expected: "Either route exists or it is removed from sidebar nav.",
    actual: "404 on every workspace page due to prefetch.",
    fixPlan: [
      "Either stub the route with a placeholder page",
      "Or remove the nav link",
    ],
  },
  "bug-wallpaper-404": {
    severity: "low",
    area: "Asset",
    affectedPaths: ["/wallpaper-vestrahorn.jpg"],
    fixPlan: ["Re-upload image or remove reference in homepage CSS"],
  },
  "bug-sms-logs-400": {
    severity: "med",
    area: "DB / Supabase",
    affectedPaths: ["/workspace/comms/overview"],
    actual: "sms_logs query returns 400",
    suspectedCause: "Table missing or column renamed.",
    fixPlan: ["Check Supabase table state", "Align select query with actual schema"],
  },
  "bug-research-ideas-400": {
    severity: "med",
    area: "DB / Supabase",
    affectedPaths: ["/workspace/research/goals"],
    suspectedCause: "research_product_ideas lacks 'name' column; query must use the correct field.",
    fixPlan: ["Add migration or fix query to use existing column"],
  },
  "bug-marketing-dash-rsc": {
    severity: "med",
    area: "SSR / Hydration",
    affectedPaths: ["/marketing/dashboard"],
    actual: "Raw RSC payload leaks into <body>; flash of unhydrated content.",
    fixPlan: [
      "Audit layout chain for accidental Suspense misuse",
      "Verify no server-component in client boundary",
    ],
  },
  "bug-clearbit-dns": {
    severity: "low",
    area: "Integration",
    affectedPaths: ["/workspace/stack"],
    actual: "logo.clearbit.com DNS dead — 35+ broken logos.",
    fixPlan: [
      "Cache logos to Supabase storage once",
      "Fallback to first-letter-badge if asset missing",
    ],
  },
  "bug-pricing-css-mime": {
    severity: "med",
    area: "Deployment",
    affectedPaths: ["/catalog/pricing"],
    actual: "CSS chunk served as text/plain — styles not applied.",
    fixPlan: ["Check Vercel headers for /_next/static/*.css", "Redeploy; invalidate edge cache"],
  },
  "bug-aggressive-prefetch": {
    severity: "med",
    area: "Performance",
    fixPlan: [
      "Add prefetch={false} on sidebar links",
      "Lazy-mount sidebar nav items",
    ],
  },
  "bug-faire-products-flow": {
    severity: "high",
    area: "Data / Flow",
    actual: "Product management pipeline broken end-to-end.",
    fixPlan: [
      "Audit product create → variant → pricing → publish flow",
      "Write an integration test that walks the full pipeline",
    ],
  },
  "bug-ud-product-selection": {
    severity: "med",
    area: "UI / USDrop Client",
    actual: "Cannot tell which products are selected out of 100.",
    fixPlan: [
      "Add selection state + persistent 'Saved' filter chip",
      "Show count of selected in toolbar",
    ],
  },
  "bug-ud-session-duration": {
    severity: "low",
    area: "Data",
    suspectedCause: "My Session duration stored as string; may drift.",
    fixPlan: ["Migrate to interval/number; backfill data"],
  },
}

/* ------------------------------------------------------------------ */
/*  PLUGIN details (the big one)                                       */
/* ------------------------------------------------------------------ */

const P = (screens: ScreenSpec[], flows: FlowSpec[], rest: Partial<PluginSpec> = {}): TaskDetail => ({
  plugin: { screens, flows, ...rest },
})

const PLUGINS: Record<string, TaskDetail> = {
  /* ── Communication ── */
  "plug-inbox": P(
    [
      { path: "/inbox", name: "Inbox", purpose: "Unified feed of notifications across all spaces",
        subpages: [
          { path: "/inbox?filter=mentions", name: "Mentions", purpose: "Items where you were @-mentioned" },
          { path: "/inbox?filter=assigned", name: "Assigned", purpose: "Items routed to you" },
          { path: "/inbox/settings", name: "Settings", purpose: "Channel preferences per category" },
        ],
      },
    ],
    [
      { name: "Mark-as-read", description: "Single + bulk mark read/unread with keyboard shortcuts" },
      { name: "Snooze", description: "Snooze notification until a time/date" },
      { name: "Route-to-task", description: "Convert a notification into a Tasks item in one click" },
    ],
    { status: "stable", dataModel: ["notifications", "notification_preferences"], apis: ["GET /api/inbox", "PATCH /api/inbox/:id/read"] },
  ),
  "plug-chat": P(
    [
      { path: "/chat", name: "Chat", purpose: "Team chat with channels and threads",
        subpages: [
          { path: "/chat/channels/:id", name: "Channel view", purpose: "Messages, members, pinned, files" },
          { path: "/chat/dms/:id", name: "Direct message", purpose: "1:1 conversation" },
          { path: "/chat/search", name: "Search", purpose: "Full-text message search" },
        ],
      },
    ],
    [
      { name: "Send message", description: "Typing indicator, emoji, @-mentions, attachments" },
      { name: "Thread replies", description: "Collapsed threads with unread counts" },
      { name: "Channel CRUD", description: "Create/rename/archive/delete channel with member control" },
    ],
    { status: "stable", dataModel: ["chat_channels", "chat_messages", "chat_members"] },
  ),
  "plug-comms": P(
    [
      { path: "/comms", name: "Comms", purpose: "Email + SMS campaign builder and reporting",
        subpages: [
          { path: "/comms/templates", name: "Templates", purpose: "Email + SMS + WhatsApp templates" },
          { path: "/comms/campaigns", name: "Campaigns", purpose: "One-off + recurring campaigns" },
          { path: "/comms/audiences", name: "Audiences", purpose: "Saved segments of recipients" },
          { path: "/comms/reports", name: "Reports", purpose: "Delivery, opens, clicks, replies" },
        ],
      },
    ],
    [
      { name: "Template → campaign", description: "Select template, pick audience, preview, schedule" },
      { name: "A/B test", description: "Split test subject lines or content" },
      { name: "Reply capture", description: "Incoming replies flow back as notifications" },
    ],
    { status: "built", dataModel: ["email_templates", "sms_templates", "campaigns", "email_logs"] },
  ),
  "plug-gmail": P(
    [
      { path: "/gmail", name: "Gmail", purpose: "Native Gmail inbox inside the portal",
        subpages: [
          { path: "/gmail/inbox", name: "Inbox", purpose: "Threaded mail view with AI categorization" },
          { path: "/gmail/drafts", name: "Drafts", purpose: "Unsent drafts" },
          { path: "/gmail/sent", name: "Sent", purpose: "Sent mail archive" },
          { path: "/gmail/search", name: "Search", purpose: "Server-side Gmail search" },
        ],
      },
    ],
    [
      { name: "AI categorize", description: "Gemini labels mail: client / internal / marketing / spam" },
      { name: "Quick reply", description: "AI-drafted reply with tone control" },
      { name: "Convert to ticket", description: "Route an email into Tickets or Tasks" },
    ],
    { status: "built", integrations: ["Google OAuth", "Gmail API"] },
  ),
  "plug-unibox": P(
    [
      { path: "/unibox", name: "Unibox", purpose: "Unified inbox across email + WhatsApp + SMS + in-app",
        subpages: [
          { path: "/unibox/all", name: "All", purpose: "Merged stream" },
          { path: "/unibox/assigned", name: "Assigned", purpose: "Routed to me" },
          { path: "/unibox/channels/:channel", name: "Per-channel", purpose: "Filter by one channel" },
        ],
      },
    ],
    [
      { name: "Route-to-owner", description: "Rule-based routing by channel + keyword + sender" },
      { name: "Unified reply", description: "Reply in the original channel from one composer" },
    ],
    { status: "planned", integrations: ["Gmail", "Twilio", "WhatsApp Cloud"] },
  ),
  "plug-biz-phone": P(
    [
      { path: "/phone", name: "Business Phone", purpose: "1:1 calling with CRM sync",
        subpages: [
          { path: "/phone/dialer", name: "Dialer", purpose: "Manual + click-to-call" },
          { path: "/phone/history", name: "History", purpose: "Call log with recordings" },
          { path: "/phone/voicemails", name: "Voicemails", purpose: "Voicemail inbox with transcripts" },
          { path: "/phone/numbers", name: "Numbers", purpose: "Provisioned lines + routing" },
        ],
      },
    ],
    [
      { name: "Click-to-call", description: "Click any phone number in the portal to dial" },
      { name: "Call logging", description: "Auto-log to CRM with disposition + notes" },
      { name: "Voicemail transcribe", description: "Gemini transcribes + summarizes" },
    ],
    { status: "planned", integrations: ["Twilio Voice"] },
  ),
  "plug-sales-dialer": P(
    [
      { path: "/dialer", name: "Sales Dialer", purpose: "Power dialing for outbound campaigns",
        subpages: [
          { path: "/dialer/lists", name: "Call lists", purpose: "Upload or filter lists for dialing" },
          { path: "/dialer/session/:id", name: "Session", purpose: "Active dial session" },
          { path: "/dialer/reports", name: "Reports", purpose: "Connect rate, talk time, outcomes" },
        ],
      },
    ],
    [
      { name: "Power dial", description: "Auto-advance to next contact after disposition" },
      { name: "Parallel dial", description: "Dial 3 numbers; connect the first to answer" },
    ],
    { status: "planned" },
  ),
  "plug-meeting-links": P(
    [
      { path: "/meetings", name: "Meeting Links", purpose: "Booking pages with availability rules",
        subpages: [
          { path: "/meetings/mine", name: "My links", purpose: "Links you own" },
          { path: "/meetings/book/:slug", name: "Public booking", purpose: "Guest booking page" },
          { path: "/meetings/rules", name: "Availability", purpose: "Hours + buffer rules" },
        ],
      },
    ],
    [
      { name: "Book", description: "Guest picks slot → calendar event + email + reminder" },
      { name: "Round-robin", description: "Distribute bookings across team" },
    ],
    { status: "planned", integrations: ["Google Calendar"] },
  ),
  "plug-meeting-router": P(
    [{ path: "/meetings/router", name: "Meeting Router", purpose: "Route inbound requests to the right rep via lead-scoring rules" }],
    [{ name: "Route rule", description: "Evaluate lead fields; assign to rep" }],
    { status: "planned" },
  ),
  "plug-whatsapp-full": P(
    [
      { path: "/whatsapp", name: "WhatsApp Business", purpose: "Templates, flows, and inbound handling",
        subpages: [
          { path: "/whatsapp/inbox", name: "Inbox", purpose: "Inbound conversations" },
          { path: "/whatsapp/templates", name: "Templates", purpose: "Meta-approved templates" },
          { path: "/whatsapp/flows", name: "Flows", purpose: "Interactive flow builder" },
          { path: "/whatsapp/broadcasts", name: "Broadcasts", purpose: "Bulk template sends" },
        ],
      },
    ],
    [
      { name: "Template submit", description: "Submit template to Meta for approval" },
      { name: "Broadcast", description: "Send template to audience" },
      { name: "Flow run", description: "Trigger an interactive flow" },
    ],
    { status: "planned", integrations: ["WhatsApp Cloud API"] },
  ),

  /* ── Operations ── */
  "plug-calendar": P(
    [
      { path: "/calendar", name: "Calendar", purpose: "Personal and shared calendars",
        subpages: [
          { path: "/calendar/day", name: "Day", purpose: "Day view" },
          { path: "/calendar/week", name: "Week", purpose: "Week view (default)" },
          { path: "/calendar/month", name: "Month", purpose: "Month view" },
          { path: "/calendar/shared", name: "Shared", purpose: "Team + space calendars" },
        ],
      },
    ],
    [
      { name: "Event CRUD", description: "Create/update/delete with attendees + reminders" },
      { name: "Calendar sync", description: "Two-way Google Calendar sync" },
    ],
    { status: "stable" },
  ),
  "plug-tasks": P(
    [
      { path: "/tasks", name: "Tasks", purpose: "Kanban + list + tree task management",
        subpages: [
          { path: "/tasks?view=kanban", name: "Kanban", purpose: "Drag-drop columns by status" },
          { path: "/tasks?view=list", name: "List", purpose: "Flat sortable list" },
          { path: "/tasks?view=tree", name: "Tree", purpose: "3-level tree (this page)" },
          { path: "/tasks/:id", name: "Detail", purpose: "Task detail with comments + activity" },
        ],
      },
    ],
    [
      { name: "Create task", description: "Quick-add or full-form" },
      { name: "Assign + due", description: "Pick owner + due date" },
      { name: "Bulk actions", description: "Complete/delete/move in bulk" },
    ],
    { status: "stable", dataModel: ["tasks", "task_comments"] },
  ),
  "plug-automations": P(
    [
      { path: "/automations", name: "Automations", purpose: "Background workflows with flow canvas",
        subpages: [
          { path: "/automations/overview", name: "Overview", purpose: "Metrics + active flows" },
          { path: "/automations/history", name: "History", purpose: "Run log + errors" },
          { path: "/automations/notifications", name: "Notifications", purpose: "Notify rules" },
          { path: "/automations/sync", name: "Sync", purpose: "Data sync flows" },
          { path: "/automations/:id", name: "Flow editor", purpose: "Visual flow editing" },
        ],
      },
    ],
    [
      { name: "Build flow", description: "Trigger → conditions → actions on a canvas" },
      { name: "Run history", description: "View every execution with inputs/outputs" },
      { name: "Retry failed", description: "Replay failed runs" },
    ],
    { status: "built", dataModel: ["automations", "automation_runs"] },
  ),
  "plug-analytics": P(
    [
      { path: "/analytics", name: "Analytics", purpose: "Revenue + traffic + performance",
        subpages: [
          { path: "/analytics/revenue", name: "Revenue", purpose: "Revenue trends by channel" },
          { path: "/analytics/traffic", name: "Traffic", purpose: "Traffic + conversion" },
          { path: "/analytics/stores", name: "Stores", purpose: "Per-store KPIs" },
          { path: "/analytics/products", name: "Products", purpose: "Top SKUs + margin" },
          { path: "/analytics/geography", name: "Geography", purpose: "Map of orders/revenue" },
        ],
      },
    ],
    [{ name: "Date range", description: "Compare vs previous period" }],
    { status: "built" },
  ),
  "plug-tickets": P(
    [
      { path: "/tickets", name: "Tickets", purpose: "Internal + client support queues",
        subpages: [
          { path: "/tickets?queue=internal", name: "Internal", purpose: "Ops + engineering queue" },
          { path: "/tickets?queue=client", name: "Client", purpose: "Client-facing tickets" },
          { path: "/tickets/:id", name: "Ticket detail", purpose: "Conversation, status, SLA" },
        ],
      },
    ],
    [
      { name: "Create ticket", description: "From inbound or internal form" },
      { name: "SLA clock", description: "Response + resolution SLA tracking" },
    ],
    { status: "built" },
  ),
  "plug-notes": P(
    [
      { path: "/notes", name: "Notes", purpose: "Rich notes with mentions + linking",
        subpages: [
          { path: "/notes/mine", name: "My notes", purpose: "Private notes" },
          { path: "/notes/shared", name: "Shared", purpose: "Team/space shared notes" },
          { path: "/notes/:id", name: "Note editor", purpose: "Rich editor" },
        ],
      },
    ],
    [{ name: "Backlinks", description: "Auto-link notes that reference the same entity" }],
    { status: "built" },
  ),
  "plug-forms": P(
    [
      { path: "/forms", name: "Forms", purpose: "Data capture that pipes into any module",
        subpages: [
          { path: "/forms/builder/:id", name: "Builder", purpose: "Drag-drop form builder" },
          { path: "/forms/submissions/:id", name: "Submissions", purpose: "Response data table" },
          { path: "/forms/public/:slug", name: "Public form", purpose: "Guest-facing form" },
        ],
      },
    ],
    [
      { name: "Build form", description: "Fields + logic + conditional display" },
      { name: "Pipe output", description: "Map submissions → CRM / Tickets / Tasks / DB table" },
    ],
    { status: "planned" },
  ),
  "plug-workflows": P(
    [
      { path: "/workflows", name: "Workflows", purpose: "Visual drag-drop process builder",
        subpages: [
          { path: "/workflows/library", name: "Library", purpose: "Saved workflows" },
          { path: "/workflows/editor/:id", name: "Editor", purpose: "Canvas editor" },
          { path: "/workflows/runs/:id", name: "Runs", purpose: "Execution history per workflow" },
        ],
      },
    ],
    [{ name: "Run workflow", description: "Manual or event-triggered run" }],
    { status: "planned" },
  ),
  "plug-sheets": P(
    [
      { path: "/sheets", name: "Sheets", purpose: "Lightweight collaborative spreadsheets",
        subpages: [
          { path: "/sheets/:id", name: "Sheet", purpose: "Grid with formulas" },
        ],
      },
    ],
    [
      { name: "Edit cells", description: "Formula support + cell formatting" },
      { name: "Share", description: "Invite collaborators, role-based access" },
    ],
    { status: "planned" },
  ),
  "plug-esign": P(
    [
      { path: "/esign", name: "E-Sign", purpose: "Legally binding document signatures",
        subpages: [
          { path: "/esign/envelopes", name: "Envelopes", purpose: "List of sent + received" },
          { path: "/esign/envelopes/:id", name: "Envelope detail", purpose: "Signer status + audit" },
          { path: "/esign/templates", name: "Templates", purpose: "Reusable document templates" },
        ],
      },
    ],
    [
      { name: "Send for signature", description: "Upload PDF, place fields, send to signers" },
      { name: "Sign", description: "Signer completes + returns" },
    ],
    { status: "planned", integrations: ["DocuSign"] },
  ),
  "plug-contracts": P(
    [
      { path: "/contracts", name: "Client Contracts", purpose: "Lifecycle management",
        subpages: [
          { path: "/contracts/active", name: "Active", purpose: "Live contracts" },
          { path: "/contracts/renewals", name: "Renewals", purpose: "Upcoming renewals" },
          { path: "/contracts/expired", name: "Expired", purpose: "Historical contracts" },
          { path: "/contracts/:id", name: "Contract detail", purpose: "Terms + parties + timeline" },
        ],
      },
    ],
    [{ name: "Renewal reminder", description: "90/30/14 day notify" }],
    { status: "planned" },
  ),
  "plug-reports": P(
    [
      { path: "/reports", name: "Reports", purpose: "Schedulable rich-text reports with charts",
        subpages: [
          { path: "/reports/library", name: "Library", purpose: "Saved report templates" },
          { path: "/reports/scheduled", name: "Scheduled", purpose: "Upcoming + past sends" },
          { path: "/reports/:id", name: "Report viewer", purpose: "Rendered report" },
        ],
      },
    ],
    [{ name: "Schedule send", description: "Email a rendered PDF on cron" }],
    { status: "planned" },
  ),
  "plug-payment-link": P(
    [
      { path: "/payment-links", name: "Payment Link Generator", purpose: "Create + share payment links",
        subpages: [
          { path: "/payment-links/new", name: "New link", purpose: "Create a link with amount + note" },
          { path: "/payment-links/:id", name: "Link detail", purpose: "Status + collection events" },
        ],
      },
    ],
    [{ name: "Create + share", description: "Generate link, copy to WhatsApp/email, track payment" }],
    { status: "planned", integrations: ["Razorpay", "Stripe"] },
  ),
  "plug-quotation-pdf": P(
    [{ path: "/quotations", name: "Quotation PDF Generator", purpose: "Auto-generate quotes from data" }],
    [{ name: "Generate PDF", description: "Pick client + lines → render branded PDF → send" }],
    { status: "planned" },
  ),
  "plug-daily-reports": P(
    [{ path: "/daily-reports", name: "Daily Reports", purpose: "Automated daily summary reports per space" }],
    [{ name: "Auto-compile", description: "End-of-day digest to space owner" }],
    { status: "planned" },
  ),
  "plug-settings": P(
    [
      { path: "/settings", name: "Settings", purpose: "Per-space configuration UI",
        subpages: [
          { path: "/settings/general", name: "General", purpose: "Name, locale, timezone" },
          { path: "/settings/members", name: "Members", purpose: "Invite + roles" },
          { path: "/settings/billing", name: "Billing", purpose: "Subscription + invoices" },
          { path: "/settings/integrations", name: "Integrations", purpose: "Connected services" },
          { path: "/settings/api-keys", name: "API keys", purpose: "Tokens + scopes" },
        ],
      },
    ],
    [{ name: "Update setting", description: "Change + persist + audit log" }],
    { status: "planned" },
  ),
  "plug-news": P(
    [{ path: "/news", name: "News", purpose: "Daily update feed plugin per space" }],
    [{ name: "Publish item", description: "Post a short update to the feed" }],
    { status: "planned" },
  ),
  "plug-ledger": P(
    [
      { path: "/ledger", name: "Ledger", purpose: "Financial ledger + balance tracking",
        subpages: [
          { path: "/ledger/accounts", name: "Accounts", purpose: "Account list" },
          { path: "/ledger/entries", name: "Entries", purpose: "Journal entries" },
          { path: "/ledger/reconcile", name: "Reconcile", purpose: "Bank reconciliation" },
        ],
      },
    ],
    [{ name: "Post entry", description: "Double-entry posting with validation" }],
    { status: "planned" },
  ),

  /* ── HR Suite ── */
  "plug-team": P(
    [
      { path: "/team", name: "Team", purpose: "Directory with roles and contacts",
        subpages: [
          { path: "/team/directory", name: "Directory", purpose: "All employees grid" },
          { path: "/team/:id", name: "Profile", purpose: "Employee profile + WhatsApp card" },
        ],
      },
    ],
    [{ name: "Generate WhatsApp card", description: "Auto-branded profile image" }],
    { status: "stable" },
  ),
  "plug-remote": P(
    [{ path: "/remote", name: "Remote", purpose: "Time zones, availability, status board" }],
    [{ name: "Set status", description: "Available / heads-down / OOO" }],
    { status: "built" },
  ),
  "plug-employees": P(
    [
      { path: "/employees", name: "Employees", purpose: "Full records with detail pages",
        subpages: [
          { path: "/employees/:id", name: "Detail", purpose: "Personal + work + payroll + docs tabs" },
          { path: "/employees/new", name: "New hire", purpose: "Onboarding intake form" },
        ],
      },
    ],
    [
      { name: "Onboard", description: "New hire → profile → checklist → access provisioning" },
      { name: "Offboard", description: "Exit interview + access revocation + final settlement" },
    ],
    { status: "planned" },
  ),
  "plug-onboarding": P(
    [
      { path: "/onboarding", name: "Onboarding", purpose: "Structured checklists + welcome flows",
        subpages: [
          { path: "/onboarding/templates", name: "Templates", purpose: "Checklist templates per role" },
          { path: "/onboarding/:id", name: "In-progress", purpose: "Employee's onboarding progress" },
        ],
      },
    ],
    [{ name: "Assign checklist", description: "Pick template → assign to hire → auto-remind" }],
    { status: "planned" },
  ),
  "plug-org-chart": P(
    [{ path: "/org-chart", name: "Org Chart", purpose: "Auto-generated with drill-down" }],
    [{ name: "Drill", description: "Click person to expand reports" }],
    { status: "planned" },
  ),
  "plug-departments": P(
    [
      { path: "/departments", name: "Departments", purpose: "Budgets + headcount planning",
        subpages: [
          { path: "/departments/:id", name: "Department", purpose: "Dept KPIs + members + budget" },
        ],
      },
    ],
    [{ name: "Plan headcount", description: "Set target vs actual by quarter" }],
    { status: "planned" },
  ),
  "plug-attendance": P(
    [
      { path: "/attendance", name: "Attendance", purpose: "Clock-in/out with geofencing",
        subpages: [
          { path: "/attendance/logs", name: "Logs", purpose: "Daily punch log" },
          { path: "/attendance/regularize", name: "Regularize", purpose: "Missed-punch requests" },
        ],
      },
    ],
    [
      { name: "Punch in/out", description: "Geo-verified clock" },
      { name: "Approve regularization", description: "Manager review flow" },
    ],
    { status: "planned" },
  ),
  "plug-leaves": P(
    [
      { path: "/leaves", name: "Leaves", purpose: "Requests, balances, approval routing",
        subpages: [
          { path: "/leaves/apply", name: "Apply", purpose: "New leave request" },
          { path: "/leaves/balances", name: "Balances", purpose: "Accrued + used" },
          { path: "/leaves/approvals", name: "Approvals", purpose: "Manager queue" },
        ],
      },
    ],
    [{ name: "Apply → approve", description: "Employee applies; manager approves/rejects with notification" }],
    { status: "planned" },
  ),
  "plug-payroll": P(
    [
      { path: "/payroll", name: "Payroll", purpose: "Salary processing + compliance",
        subpages: [
          { path: "/payroll/runs", name: "Runs", purpose: "Monthly payroll runs" },
          { path: "/payroll/payslips", name: "Payslips", purpose: "Individual payslips" },
          { path: "/payroll/compliance", name: "Compliance", purpose: "PF / ESI / TDS filings" },
        ],
      },
    ],
    [
      { name: "Run payroll", description: "Gather attendance + variables → compute → disburse" },
      { name: "Send payslips", description: "Email + WhatsApp payslip PDF" },
    ],
    { status: "planned" },
  ),
  "plug-performance": P(
    [
      { path: "/performance", name: "Performance Reviews", purpose: "360 feedback cycles",
        subpages: [
          { path: "/performance/cycles", name: "Cycles", purpose: "Review cycle setup" },
          { path: "/performance/reviews/:id", name: "Review", purpose: "Self + peer + manager ratings" },
        ],
      },
    ],
    [{ name: "Launch cycle", description: "Define participants → send forms → aggregate → publish" }],
    { status: "planned" },
  ),
  "plug-okrs": P(
    [
      { path: "/okrs", name: "OKRs", purpose: "Company + team + individual goal tracking",
        subpages: [
          { path: "/okrs/company", name: "Company", purpose: "Top-level objectives" },
          { path: "/okrs/team/:id", name: "Team", purpose: "Team-level" },
          { path: "/okrs/me", name: "Mine", purpose: "Personal OKRs" },
        ],
      },
    ],
    [{ name: "Check-in", description: "Update progress on a KR" }],
    { status: "planned" },
  ),
  "plug-candidates": P(
    [
      { path: "/candidates", name: "Candidates (ATS)", purpose: "Pipeline + scorecards",
        subpages: [
          { path: "/candidates/pipeline", name: "Pipeline", purpose: "Kanban by stage" },
          { path: "/candidates/:id", name: "Candidate", purpose: "Resume + interviews + scorecards" },
          { path: "/candidates/jobs", name: "Jobs", purpose: "Open roles" },
        ],
      },
    ],
    [
      { name: "Move stage", description: "Drag across columns with notification" },
      { name: "Submit scorecard", description: "Interviewer fills form post-interview" },
    ],
    { status: "planned" },
  ),
  "plug-interviews": P(
    [
      { path: "/interviews", name: "Interviews", purpose: "Scheduling + kits + feedback",
        subpages: [
          { path: "/interviews/schedule", name: "Schedule", purpose: "Pick slot + invite" },
          { path: "/interviews/kits", name: "Kits", purpose: "Interview kits per role" },
          { path: "/interviews/:id", name: "Interview", purpose: "Questions + notes" },
        ],
      },
    ],
    [{ name: "Schedule + send kit", description: "Create calendar event + send kit to interviewer" }],
    { status: "planned" },
  ),

  /* ── Ecommerce ── */
  "plug-fulfillment": P(
    [
      { path: "/fulfillment", name: "Fulfillment Hub", purpose: "Pick, pack, ship across warehouses",
        subpages: [
          { path: "/fulfillment/queue", name: "Queue", purpose: "To-pick orders" },
          { path: "/fulfillment/pickers", name: "Pickers", purpose: "Warehouse staff dashboard" },
          { path: "/fulfillment/shipments", name: "Shipments", purpose: "Outbound shipments" },
        ],
      },
    ],
    [
      { name: "Pick → pack → ship", description: "Scan SKU → pack → generate label → dispatch" },
      { name: "Split shipment", description: "Split across warehouses" },
    ],
    { status: "planned", integrations: ["Shiprocket", "17Track"] },
  ),
  "plug-procurement": P(
    [
      { path: "/procurement", name: "Procurement", purpose: "POs, supplier mgmt, landed cost",
        subpages: [
          { path: "/procurement/suppliers", name: "Suppliers", purpose: "Directory + scorecards" },
          { path: "/procurement/pos", name: "Purchase Orders", purpose: "PO list" },
          { path: "/procurement/pos/:id", name: "PO detail", purpose: "Lines + receipts + invoice match" },
        ],
      },
    ],
    [
      { name: "Create PO", description: "Select supplier + lines → approve → send" },
      { name: "Receive goods", description: "Record receipt against PO" },
    ],
    { status: "planned" },
  ),
  "plug-invoices": P(
    [
      { path: "/invoices", name: "Invoices", purpose: "Customer-facing with tax + payment links",
        subpages: [
          { path: "/invoices/new", name: "New", purpose: "Create invoice" },
          { path: "/invoices/:id", name: "Invoice", purpose: "PDF + send + record payment" },
        ],
      },
    ],
    [{ name: "Invoice → payment", description: "Send → payment link → reconcile" }],
    { status: "planned" },
  ),
  "plug-ecom-marketing": P(
    [{ path: "/ecom-marketing", name: "Ecommerce Marketing", purpose: "Promos + seasonal campaigns" }],
    [{ name: "Schedule promo", description: "Time-boxed discount with tracking" }],
    { status: "planned" },
  ),

  /* ── Sales & CRM ── */
  "plug-sequences": P(
    [
      { path: "/sequences", name: "Sequences", purpose: "Multi-channel outreach cadences",
        subpages: [
          { path: "/sequences/library", name: "Library", purpose: "Sequence templates" },
          { path: "/sequences/:id", name: "Editor", purpose: "Step editor: email/call/task" },
          { path: "/sequences/:id/contacts", name: "Contacts", purpose: "Who's enrolled" },
        ],
      },
    ],
    [
      { name: "Enroll contact", description: "Manual or rule-based enrollment" },
      { name: "Branching", description: "Reply-based branching" },
    ],
    { status: "planned" },
  ),
  "plug-cpq": P(
    [{ path: "/cpq", name: "CPQ", purpose: "Configure-price-quote for bundled offers" }],
    [{ name: "Configure + quote", description: "Product config + rules → quote PDF" }],
    { status: "planned" },
  ),
  "plug-prospect": P(
    [
      { path: "/prospect", name: "Prospect", purpose: "Find decision-makers with verified data",
        subpages: [
          { path: "/prospect/search", name: "Search", purpose: "People + company search" },
          { path: "/prospect/lists", name: "Lists", purpose: "Saved prospect lists" },
        ],
      },
    ],
    [{ name: "Add to sequence", description: "Push prospect into a sequence" }],
    { status: "planned" },
  ),
  "plug-enrich": P(
    [{ path: "/enrich", name: "Data Enrichment", purpose: "Auto-fill company + firmographic data" }],
    [{ name: "Enrich on save", description: "When contact/company created, enrich async" }],
    { status: "planned" },
  ),
  "plug-signals": P(
    [{ path: "/signals", name: "Signals", purpose: "Website visits → ready-to-work leads" }],
    [{ name: "Capture visit", description: "Identify known visitor, create signal" }],
    { status: "planned" },
  ),

  /* ── Finance ── */
  "plug-fin-invoices": P(
    [{ path: "/finance/invoices", name: "Invoices (Finance)", purpose: "Send + collect with payment links" }],
    [{ name: "Issue + collect", description: "Issue → send → payment link → collect" }],
    { status: "planned" },
  ),
  "plug-pos": P(
    [{ path: "/pos", name: "POS", purpose: "Point-of-sale for in-store checkout" }],
    [{ name: "Ring sale", description: "Scan → discount → tender → receipt" }],
    { status: "planned" },
  ),
  "plug-valo": P(
    [{ path: "/valo", name: "Valo", purpose: "Company valuation + cap-table modelling" }],
    [{ name: "Model round", description: "Pre/post-money scenarios" }],
    { status: "planned" },
  ),

  /* ── Dev & Builder ── */
  "plug-development": P(
    [
      { path: "/development", name: "Development", purpose: "Engineering space — projects, deploys, roadmap",
        subpages: [
          { path: "/development/overview", name: "Overview", purpose: "Engineering KPIs" },
          { path: "/development/projects", name: "Projects", purpose: "Project registry" },
          { path: "/development/deployments", name: "Deployments", purpose: "Vercel feed" },
          { path: "/development/roadmap", name: "Roadmap", purpose: "Quarterly themes + changelog" },
          { path: "/development/integrations", name: "Integrations", purpose: "Third-party services" },
          { path: "/development/checklists", name: "Checklists", purpose: "Per-project gate items" },
          { path: "/development/claude-log", name: "Claude log", purpose: "Claude's own audit trail" },
        ],
      },
    ],
    [{ name: "Ship a project", description: "Project moves from building → live gated by checklist" }],
    { status: "stable" },
  ),
  "plug-projects": P(
    [{ path: "/projects", name: "Projects Portfolio", purpose: "All apps grouped by venture" }],
    [{ name: "Open project", description: "Drill into any project's detail view" }],
    { status: "stable" },
  ),
  "plug-deployments": P(
    [
      { path: "/development/deployments", name: "Deployments", purpose: "Vercel webhook feed + backfill",
        subpages: [
          { path: "/development/deployments/by-project", name: "By project", purpose: "Grouped view" },
          { path: "/development/deployments/errors", name: "Errors", purpose: "Failed builds" },
        ],
      },
    ],
    [{ name: "Ingest webhook", description: "Vercel webhook → deployment_events" }],
    { status: "built" },
  ),
  "plug-roadmap": P(
    [
      { path: "/development/roadmap", name: "Roadmap", purpose: "Quarterly themes + changelog",
        subpages: [
          { path: "/development/roadmap/changelog", name: "Changelog", purpose: "Weekly changelog" },
          { path: "/development/roadmap/ventures", name: "Ventures", purpose: "Roadmap by venture" },
        ],
      },
    ],
    [{ name: "Publish update", description: "Append entry to changelog" }],
    { status: "built" },
  ),
  "plug-github": P(
    [
      { path: "/github", name: "GitHub", purpose: "Repo activity + PRs + review queue",
        subpages: [
          { path: "/github/prs", name: "PRs", purpose: "Open + recent PRs" },
          { path: "/github/reviews", name: "Reviews", purpose: "My review queue" },
        ],
      },
    ],
    [{ name: "Sync repos", description: "Webhook-driven repo/activity sync" }],
    { status: "planned", integrations: ["GitHub API"] },
  ),
  "plug-vercel-console": P(
    [{ path: "/vercel", name: "Vercel Console", purpose: "Deploy status + build logs" }],
    [{ name: "Stream logs", description: "Live-tail build logs" }],
    { status: "planned", integrations: ["Vercel API"] },
  ),
  "plug-supabase-console": P(
    [
      { path: "/supabase", name: "Supabase Console", purpose: "Schema + migrations + RLS",
        subpages: [
          { path: "/supabase/tables", name: "Tables", purpose: "Browse + edit" },
          { path: "/supabase/migrations", name: "Migrations", purpose: "Applied + pending" },
          { path: "/supabase/rls", name: "RLS", purpose: "Policies per table" },
        ],
      },
    ],
    [{ name: "Apply migration", description: "Run SQL against branch → merge to prod" }],
    { status: "planned" },
  ),
  "plug-sentry": P(
    [{ path: "/sentry", name: "Sentry", purpose: "Exceptions with stack traces" }],
    [{ name: "Ingest issue", description: "Sentry webhook → inbox + triage" }],
    { status: "planned" },
  ),
  "plug-component-lib": P(
    [{ path: "/dev/components", name: "Component Library", purpose: "Separate reusable UI package" }],
    [{ name: "Publish component", description: "Promote from app → shared package" }],
    { status: "planned" },
  ),
  "plug-theme-skins": P(
    [
      { path: "/dev/themes", name: "Theme Skins", purpose: "1-click portal theme switching",
        subpages: [
          { path: "/dev/themes/library", name: "Library", purpose: "Available themes" },
          { path: "/dev/themes/preview", name: "Preview", purpose: "Live theme preview" },
        ],
      },
    ],
    [{ name: "Switch theme", description: "Apply theme globally or per-space" }],
    { status: "planned" },
  ),

  /* ── AI-Native ── */
  "plug-ai-tools": P(
    [
      { path: "/ai-tools", name: "AI Tools", purpose: "Title optimizer, desc gen, pricing, tags, audit",
        subpages: [
          { path: "/ai-tools/title-optimizer", name: "Title Optimizer", purpose: "Rewrite listing titles" },
          { path: "/ai-tools/description-gen", name: "Description Generator", purpose: "Draft product descriptions" },
          { path: "/ai-tools/pricing-advisor", name: "Pricing Advisor", purpose: "Competitor-aware pricing" },
          { path: "/ai-tools/tag-generator", name: "Tag Generator", purpose: "SEO tags" },
          { path: "/ai-tools/listing-audit", name: "Listing Audit", purpose: "Score listings" },
        ],
      },
    ],
    [{ name: "Run tool", description: "Submit input → LLM call → save output" }],
    { status: "built" },
  ),
  "plug-ai-team": P(
    [
      { path: "/ai-team", name: "AI Team", purpose: "Remote AI agent roster",
        subpages: [
          { path: "/ai-team/roster", name: "Roster", purpose: "All AI employees" },
          { path: "/ai-team/:id", name: "AI profile", purpose: "Persona + skills + history" },
        ],
      },
    ],
    [{ name: "Chat with AI", description: "Start a conversation with a persona" }],
    { status: "built" },
  ),
  "plug-ai-notetaker": P(
    [{ path: "/ai-notetaker", name: "AI Notetaker", purpose: "Meeting transcription + summaries" }],
    [{ name: "Attend meeting", description: "Join call → transcribe → summarize → action items" }],
    { status: "planned" },
  ),
  "plug-ai-coaches": P(
    [{ path: "/ai-coaches", name: "AI Coaches", purpose: "Persona-based agents for strategy/ops" }],
    [{ name: "Ask coach", description: "Pick persona → ask question" }],
    { status: "planned" },
  ),
  "plug-ai-scorers": P(
    [{ path: "/ai-scorers", name: "AI Scorers", purpose: "Auto-grade listings, candidates, deals" }],
    [{ name: "Score item", description: "Run scorer on entity; write score back" }],
    { status: "planned" },
  ),

  /* ── Knowledge & Learning ── */
  "plug-research": P(
    [
      { path: "/research", name: "Research", purpose: "Product ideas, competitors, trends, sources",
        subpages: [
          { path: "/research/goals", name: "Goals", purpose: "Research goals board" },
          { path: "/research/competitors", name: "Competitors", purpose: "Competitor tracking" },
          { path: "/research/trends", name: "Trends", purpose: "Trend feed" },
          { path: "/research/sources", name: "Sources", purpose: "Source directory" },
        ],
      },
    ],
    [{ name: "Add source", description: "Bookmark + tag source material" }],
    { status: "built" },
  ),
  "plug-learning": P(
    [
      { path: "/learning", name: "Learning", purpose: "Training videos, SOPs, knowledge base",
        subpages: [
          { path: "/learning/courses", name: "Courses", purpose: "Courses + modules" },
          { path: "/learning/sops", name: "SOPs", purpose: "Standard operating procedures" },
          { path: "/learning/kb", name: "KB", purpose: "Searchable knowledge base" },
        ],
      },
    ],
    [{ name: "Enroll + progress", description: "Track module completion" }],
    { status: "built" },
  ),
  "plug-help": P(
    [{ path: "/help", name: "Help", purpose: "FAQ + guided support" }],
    [{ name: "Ask help", description: "Search KB → escalate to human" }],
    { status: "built" },
  ),
  "plug-links": P(
    [{ path: "/links", name: "Links", purpose: "URL shortener + link manager" }],
    [{ name: "Shorten + track", description: "Create short link with click tracking" }],
    { status: "built" },
  ),
  "plug-files": P(
    [
      { path: "/files", name: "Files", purpose: "Centralized file storage",
        subpages: [
          { path: "/files/browser", name: "Browser", purpose: "Folder tree + grid" },
          { path: "/files/shared", name: "Shared", purpose: "Files shared with me" },
        ],
      },
    ],
    [{ name: "Upload + share", description: "Upload to Supabase Storage → share link" }],
    { status: "built" },
  ),
  "plug-stack": P(
    [{ path: "/stack", name: "Stack", purpose: "Tech stack directory" }],
    [{ name: "Audit stack", description: "Detect broken logos + dead integrations" }],
    { status: "built" },
  ),

  /* ── Third-Party Integrations ── */
  "plug-stripe": P(
    [
      { path: "/integrations/stripe", name: "Stripe", purpose: "Subscriptions + one-time billing",
        subpages: [
          { path: "/integrations/stripe/customers", name: "Customers", purpose: "Stripe customer records" },
          { path: "/integrations/stripe/subscriptions", name: "Subscriptions", purpose: "Active subs" },
        ],
      },
    ],
    [{ name: "Sync webhook", description: "Ingest Stripe events" }],
    { status: "planned", integrations: ["Stripe"] },
  ),
  "plug-cloudflare": P(
    [{ path: "/integrations/cloudflare", name: "Cloudflare", purpose: "DNS + edge + WAF" }],
    [{ name: "Update DNS", description: "CRUD records via API" }],
    { status: "planned" },
  ),
  "plug-datadog": P(
    [{ path: "/integrations/datadog", name: "DataDog", purpose: "Infra monitoring + uptime" }],
    [{ name: "Ingest alert", description: "DataDog webhook → inbox" }],
    { status: "planned" },
  ),
  "plug-figma": P(
    [{ path: "/integrations/figma", name: "Figma", purpose: "Design files + Code Connect mappings" }],
    [{ name: "Pull design", description: "Import from Figma to /files" }],
    { status: "planned" },
  ),
  "plug-dev-center": P(
    [
      { path: "/developer", name: "Developer Center", purpose: "API keys + webhooks + integration docs",
        subpages: [
          { path: "/developer/keys", name: "API keys", purpose: "Token management" },
          { path: "/developer/webhooks", name: "Webhooks", purpose: "Subscribe/trigger webhooks" },
          { path: "/developer/docs", name: "Docs", purpose: "API documentation" },
        ],
      },
    ],
    [{ name: "Issue key", description: "Generate API key with scopes" }],
    { status: "planned" },
  ),

  /* ── Social & Scheduling ── */
  "plug-content-cal": P(
    [{ path: "/social/calendar", name: "Content Calendar", purpose: "Visual schedule for posts" }],
    [{ name: "Schedule post", description: "Drag onto calendar with channel target" }],
    { status: "planned" },
  ),
  "plug-post-composer": P(
    [{ path: "/social/composer", name: "Post Composer", purpose: "Multi-network editor with previews" }],
    [{ name: "Compose + preview", description: "Single draft, per-network preview" }],
    { status: "planned" },
  ),
  "plug-social-analytics": P(
    [{ path: "/social/analytics", name: "Social Analytics", purpose: "Reach, engagement, followers" }],
    [{ name: "Fetch metrics", description: "Pull daily metrics from each network" }],
    { status: "planned" },
  ),
  "plug-hashtag-mgr": P(
    [{ path: "/social/hashtags", name: "Hashtag Manager", purpose: "Curated sets with performance" }],
    [{ name: "Save set", description: "Save + reuse + track per-post performance" }],
    { status: "planned" },
  ),
}

/* ------------------------------------------------------------------ */
/*  Merge + export                                                      */
/* ------------------------------------------------------------------ */

export const TASK_DETAILS: Record<string, TaskDetail> = {
  ...TASKS,
  ...IDEAS,
  ...BUGS,
  ...PLUGINS,
}

export function getTaskDetail(id: string): TaskDetail | undefined {
  return TASK_DETAILS[id]
}
