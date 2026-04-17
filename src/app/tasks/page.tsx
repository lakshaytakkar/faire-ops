"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Trash2, Square, CheckSquare, ListTodo, Lightbulb, Bug, Puzzle, Bot, Plug, X, FolderKanban } from "lucide-react"
import { getTaskDetail } from "./_data/task-details"
import { TaskDetailModal } from "./_components/task-detail-modal"
import { ExternalProjectsTab } from "./_components/external-projects-tab"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TaskNode {
  id: string
  label: string
  done: boolean
  createdAt: string
  category?: string
  children?: TaskNode[]
}

type TabKey = "tasks" | "ideas" | "bugs" | "plugins" | "agents" | "integrations" | "external-projects"

/* ------------------------------------------------------------------ */
/*  Initial task tree                                                   */
/* ------------------------------------------------------------------ */

let _idCounter = 100

function uid() {
  return `task-${++_idCounter}-${Date.now()}`
}

const TODAY = new Date().toISOString().slice(0, 10)

function makeTasksTree(): TaskNode[] {
  const d = TODAY
  return [
    {
      id: "marketing", label: "Marketing & Content", done: false, createdAt: d,
      children: [
        { id: "canva-foshan", label: "Canva Post for Foshan Office", done: false, createdAt: d },
        { id: "ets-presentation", label: "ETS Presentation in Our Style in Canva", done: false, createdAt: d },
        { id: "marketing-pages", label: "Marketing Pages and Connectors", done: false, createdAt: d },
        {
          id: "daily-faire", label: "Daily Faire message sending automation", done: false, createdAt: d,
          children: [
            { id: "faire-process", label: "Process build for automated daily sending", done: false, createdAt: d },
            { id: "faire-scrape", label: "Retailers scrape via Claude browser / Claude Code + Playwright (credentials in env)", done: false, createdAt: d },
            { id: "find-retailers", label: "Find retailers in USA", done: false, createdAt: d },
          ],
        },
        {
          id: "interior-catalog", label: "Interior Catalog for Clients", done: false, createdAt: d,
          children: [
            { id: "product-selection-call", label: "Product Selection Process on Call based on collections/categories", done: false, createdAt: d },
            { id: "how-to-product", label: "HOW TO — Product Selection and how to make it easy in the software", done: false, createdAt: d },
          ],
        },
      ],
    },
    {
      id: "team", label: "Team & Operations", done: false, createdAt: d,
      children: [
        { id: "team-expectations", label: "Clear expectations from team — building right team, ownership, going extra step by teammates", done: false, createdAt: d },
        { id: "legal-notice", label: `Send Legal Notice SP Jangid (${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })})`, done: false, createdAt: d },
        { id: "sop-ln-ops", label: "SOP Creation for LegalNations Operations", done: false, createdAt: d },
        { id: "hire-customer-calls", label: "Hire: Customer calls & service management", done: false, createdAt: d },
        { id: "hire-sales-relation", label: "Hire: Sales/relation building (WhatsApp/tickets)", done: false, createdAt: d },
        { id: "hire-overall-manager", label: "Hire: Overall Manager", done: false, createdAt: d },
        { id: "hire-female-rep", label: "Hire: 1 female rep for client-facing", done: false, createdAt: d },
      ],
    },
    {
      id: "migrations", label: "Migrations & Data", done: false, createdAt: d,
      children: [
        { id: "website-migrate", label: "Website Changes — migrate website to main portal", done: false, createdAt: d },
        { id: "toyarina-gullee", label: "Migrate Toyarina and Gullee Pets to B2B Ecommerce Space", done: false, createdAt: d },
        { id: "ln-migration", label: "LegalNations Migration", done: false, createdAt: d },
        {
          id: "other-seedings", label: "Other Seedings", done: false, createdAt: d,
          children: [
            { id: "seed-ats", label: "ATS seeding", done: false, createdAt: d },
            { id: "seed-hrms", label: "HRMS seeding", done: false, createdAt: d },
            { id: "seed-callsync", label: "Callsync Mobile App — on-demand and auto sync", done: false, createdAt: d },
          ],
        },
      ],
    },
    {
      id: "products", label: "Products & Ventures", done: false, createdAt: d,
      children: [
        {
          id: "ets-1click", label: "ETS 1-Click Automation Suite", done: false, createdAt: d,
          children: [
            { id: "ets-complete", label: "Complete EazyToSell Client and Prepare", done: false, createdAt: d },
            { id: "ets-1click-website", label: "1-click website launch", done: false, createdAt: d },
            { id: "ets-1click-brand", label: "1-click brand kit generation", done: false, createdAt: d },
            { id: "ets-1click-catalog", label: "1-click catalog build", done: false, createdAt: d },
            { id: "ets-1click-creatives", label: "1-click ad creatives build", done: false, createdAt: d },
            { id: "ets-1click-adrun", label: "1-click ad run", done: false, createdAt: d },
            { id: "ets-3day-website", label: "3-day website build — fill form flow, team generates and delivers", done: false, createdAt: d },
          ],
        },
        { id: "jsblueridge", label: "JSBlueridge revive and stabilize", done: false, createdAt: d },
        {
          id: "usdrop", label: "USDrop", done: false, createdAt: d,
          children: [
            { id: "usdrop-client", label: "USDrop Client — stable", done: false, createdAt: d },
            { id: "usdrop-admin", label: "USDrop Admin — stable", done: false, createdAt: d },
            { id: "usdrop-rbac", label: "Complete comprehensive reusable user & RBAC panels/plugins", done: false, createdAt: d },
          ],
        },
        {
          id: "toys-project", label: "Surface New Space — Toys Project", done: false, createdAt: d,
          children: [
            { id: "toys-ideation", label: "Complete ideation", done: false, createdAt: d },
            { id: "toys-legal", label: "Legal panels", done: false, createdAt: d },
            { id: "toys-omnichannel", label: "Omnichannel in India panels", done: false, createdAt: d },
            { id: "toys-explorers", label: "Explorers and Inspirations", done: false, createdAt: d },
            { id: "toys-find-products", label: "Find products", done: false, createdAt: d },
          ],
        },
        {
          id: "china-imports", label: "China Imports", done: false, createdAt: d,
          children: [
            { id: "chinaproducts", label: "chinaproducts.in", done: false, createdAt: d },
            { id: "chinaimports", label: "chinaimports.in", done: false, createdAt: d },
          ],
        },
        { id: "import-admin-client", label: "Import Admin and Client", done: false, createdAt: d },
      ],
    },
    {
      id: "plugins-integrations", label: "Plugins & Integrations", done: false, createdAt: d,
      children: [
        { id: "docusign", label: "DocuSign plugin", done: false, createdAt: d },
        { id: "ideas-plugin", label: "Ideas plugin", done: false, createdAt: d },
        { id: "explorer-plugin", label: "Explorer plugin", done: false, createdAt: d },
        { id: "other-plugins", label: "Other plugins", done: false, createdAt: d },
        { id: "razorpay-sync", label: "Razorpay Sync", done: false, createdAt: d },
        { id: "wise-payments", label: "Wise for Sending Payments", done: false, createdAt: d },
      ],
    },
    {
      id: "platform", label: "Platform & Infra", done: false, createdAt: d,
      children: [
        { id: "stack-page", label: "Improve Stack Page", done: false, createdAt: d },
        { id: "folder-hygiene", label: "Folder / DB everything hygiene skill", done: false, createdAt: d },
        { id: "task-mgmt-tree", label: "Grouping-based 3-level tree for task management", done: false, createdAt: d },
      ],
    },
    {
      id: "faire-expansion", label: "Faire Account Expansion", done: false, createdAt: d,
      children: [
        { id: "faire-new-account", label: "New Faire Account Process — Gmail (existing brand), domain/Etsy page, 5 branded products (candles), listing CSV, brand page, apply via browser UI", done: false, createdAt: d },
        { id: "faire-us-suppliers", label: "Find US Suppliers for Faire — validate squishy idea, fix outreach approach", done: false, createdAt: d },
        { id: "faire-products-flow-fix", label: "Faire Products flow needs fixing — broken product management pipeline", done: false, createdAt: d },
        { id: "faire-mail-fwd", label: "Check mail & set mail forwarding & checks for new Faire accounts", done: false, createdAt: d },
        { id: "faire-move-gullee-toyarina", label: "Move out Faire: Build project — Gullee & Toyarina to B2B Ecommerce", done: false, createdAt: d },
        { id: "faire-all-admins-data", label: "Consolidate all Faire admins data", done: false, createdAt: d },
      ],
    },
    {
      id: "sales-revenue", label: "Sales & Revenue", done: false, createdAt: d,
      children: [
        { id: "sales-page-hq", label: "Sales Page in Suprans HQ — build and copy to all spaces", done: false, createdAt: d },
        { id: "sales-structures", label: "List of pages and structures for Sales across spaces", done: false, createdAt: d },
        { id: "revenue-goal-gap", label: "Set a really big position and money goal — analyze why not there yet", done: false, createdAt: d },
      ],
    },
    {
      id: "finance-payments", label: "Finance & Payments", done: false, createdAt: d,
      children: [
        { id: "payment-verification", label: "Payment verification process for travel & other sales from Bank", done: false, createdAt: d },
        { id: "invoice-mail-whatsapp", label: "Invoice mail & WhatsApp automation", done: false, createdAt: d },
        { id: "ledger-pending-balance", label: "Ledger & pending balance tracking", done: false, createdAt: d },
        { id: "payment-deadline-contract", label: "Payment deadline contract system", done: false, createdAt: d },
        { id: "onboard-50pct", label: "50% min amount to start onboarding — enforce across ETS/GoyoTours", done: false, createdAt: d },
        { id: "n-u-automation", label: "N&U for automation details — automate payment flows", done: false, createdAt: d },
      ],
    },
    {
      id: "dashboards-reports", label: "Dashboards & Reports", done: false, createdAt: d,
      children: [
        { id: "enrich-dashboards", label: "Enrich all dashboards, analytics, and reports across spaces", done: false, createdAt: d },
        { id: "flows-crud-plan", label: "FLOWS and CRUD plan-add in all pages and subpages — long running agents", done: false, createdAt: d },
        { id: "internal-linking", label: "Internal linking, microinteractions, and feedback polish across pages", done: false, createdAt: d },
      ],
    },
  ]
}

function makeIdeasTree(): TaskNode[] {
  const d = TODAY
  return [
    {
      id: "idea-faire", label: "Faire Wholesale Admin", done: false, createdAt: d,
      children: [
        { id: "idea-faire-auto-accept", label: "Auto-accept orders when inventory >= qty (zero human touch)", done: false, createdAt: d },
        { id: "idea-faire-inv-alerts", label: "Inventory threshold alerts via Slack + email + in-app", done: false, createdAt: d },
        { id: "idea-faire-tracking-writeback", label: "Auto-import tracking from 17Track and write back to Faire API", done: false, createdAt: d },
        { id: "idea-faire-smart-reconcile", label: "ML-enhanced auto-reconciliation (Gemini analyzes txn+order match)", done: false, createdAt: d },
        { id: "idea-faire-payout-recon", label: "Payout reconciliation — trace Faire payouts to Wise deposits", done: false, createdAt: d },
        { id: "idea-faire-churn", label: "Retailer churn prediction + auto re-engagement emails", done: false, createdAt: d },
        { id: "idea-faire-bulk-accept", label: "Bulk order accept — accept all NEW orders with sufficient stock", done: false, createdAt: d },
        { id: "idea-faire-whatsapp-confirm", label: "Auto-send WhatsApp order confirmation to retailers", done: false, createdAt: d },
        { id: "idea-faire-demand-forecast", label: "Demand forecasting by product/category (time-series analysis)", done: false, createdAt: d },
        { id: "idea-faire-pricing-optim", label: "Product pricing optimization via competitor + demand analysis", done: false, createdAt: d },
        { id: "idea-faire-dead-stock", label: "Dead stock detection + markdown suggestions", done: false, createdAt: d },
        { id: "idea-faire-daily-digest", label: "Daily Faire retailer message sending automation", done: false, createdAt: d },
        { id: "idea-faire-scrape-retailers", label: "Retailer scraping via Playwright for outreach campaigns", done: false, createdAt: d },
        { id: "idea-faire-collection-ai", label: "AI collection builder — curate seasonal/thematic product sets", done: false, createdAt: d },
      ],
    },
    {
      id: "idea-ln", label: "Legal Nations Admin", done: false, createdAt: d,
      children: [
        { id: "idea-ln-tax-reminders", label: "Tax filing deadline reminders (90/30/7 days) via email + WhatsApp", done: false, createdAt: d },
        { id: "idea-ln-payment-alerts", label: "Payment overdue alerts with escalation (1d/7d/30d)", done: false, createdAt: d },
        { id: "idea-ln-health-score", label: "Client health score auto-calculation (LLC status + payments + docs)", done: false, createdAt: d },
        { id: "idea-ln-onboarding-auto", label: "Onboarding phase auto-progression when all checklist items done", done: false, createdAt: d },
        { id: "idea-ln-doc-reminders", label: "Missing document reminders to clients (weekly during onboarding)", done: false, createdAt: d },
        { id: "idea-ln-ein-verify", label: "EIN verification status auto-checker", done: false, createdAt: d },
        { id: "idea-ln-llc-status", label: "LLC status auto-check via state registry scraping", done: false, createdAt: d },
        { id: "idea-ln-tax-prefill", label: "AI tax form pre-filler (1120/5472) from client data", done: false, createdAt: d },
        { id: "idea-ln-compliance-gen", label: "State-specific compliance checklist generator", done: false, createdAt: d },
        { id: "idea-ln-annual-report", label: "Annual report due date alerts + auto-preparation", done: false, createdAt: d },
        { id: "idea-ln-bank-stmt", label: "Bank statement collection reminders during tax season", done: false, createdAt: d },
        { id: "idea-ln-data-migrate", label: "Complete LN data migration from remote Supabase (249 clients, 28 filings, 1000 checklist items)", done: false, createdAt: d },
      ],
    },
    {
      id: "idea-ets", label: "EazyToSell Admin", done: false, createdAt: d,
      children: [
        { id: "idea-ets-launch-seq", label: "Store launch checklist auto-sequencing (multi-phase pipeline)", done: false, createdAt: d },
        { id: "idea-ets-name-norm", label: "AI product name normalization for marketplace listings", done: false, createdAt: d },
        { id: "idea-ets-auto-cat", label: "Auto-category assignment via AI for new products", done: false, createdAt: d },
        { id: "idea-ets-qc-notify", label: "QC failure notification + AI-generated remediation steps", done: false, createdAt: d },
        { id: "idea-ets-churn-risk", label: "Client churn risk scoring based on activity + pipeline stagnation", done: false, createdAt: d },
        { id: "idea-ets-china-eta", label: "China batch arrival ETA predictions from historical data", done: false, createdAt: d },
        { id: "idea-ets-proposal-gen", label: "AI sales proposal auto-generation from client profile", done: false, createdAt: d },
        { id: "idea-ets-complete-client", label: "Complete EazyToSell Client portal and prepare for launch", done: false, createdAt: d },
        { id: "idea-ets-interior-catalog", label: "Interior catalog for clients — product selection on call", done: false, createdAt: d },
        { id: "idea-ets-boq-gen", label: "BOQ (Bill of Quantities) auto-generator from store spec", done: false, createdAt: d },
      ],
    },
    {
      id: "idea-usdrop", label: "USDrop AI Admin", done: false, createdAt: d,
      children: [
        { id: "idea-usdrop-pipeline-score", label: "AI product pipeline auto-scoring (demand + competition + margin)", done: false, createdAt: d },
        { id: "idea-usdrop-auto-publish", label: "Auto-publish high-scoring products (score > 8)", done: false, createdAt: d },
        { id: "idea-usdrop-supplier-score", label: "Supplier reliability scoring (fulfillment, quality, price stability)", done: false, createdAt: d },
        { id: "idea-usdrop-ticket-triage", label: "Support ticket auto-triage (urgency + category + sentiment)", done: false, createdAt: d },
        { id: "idea-usdrop-faq-autorespond", label: "FAQ auto-response from knowledge base for support tickets", done: false, createdAt: d },
        { id: "idea-usdrop-reengage", label: "Client inactivity re-engagement campaigns (14+ days idle)", done: false, createdAt: d },
        { id: "idea-usdrop-client-stable", label: "USDrop Client app — stable release", done: false, createdAt: d },
        { id: "idea-usdrop-admin-stable", label: "USDrop Admin — complete and stabilize", done: false, createdAt: d },
        { id: "idea-usdrop-rbac", label: "Comprehensive reusable user & RBAC panels/plugins", done: false, createdAt: d },
      ],
    },
    {
      id: "idea-hq", label: "Suprans HQ", done: false, createdAt: d,
      children: [
        { id: "idea-hq-pnl-close", label: "Monthly P&L auto-close + AI variance analysis narrative", done: false, createdAt: d },
        { id: "idea-hq-compliance-alerts", label: "Compliance filing deadline alerts (GST, TDS, ROC, etc.)", done: false, createdAt: d },
        { id: "idea-hq-contract-renewal", label: "Contract renewal reminders (90/30/14 days)", done: false, createdAt: d },
        { id: "idea-hq-resume-screen", label: "AI resume screener — auto-score candidates against role requirements", done: false, createdAt: d },
        { id: "idea-hq-jd-gen", label: "Job description auto-generation from role title + department", done: false, createdAt: d },
        { id: "idea-hq-leave-routing", label: "Leave approval auto-routing to reporting manager", done: false, createdAt: d },
        { id: "idea-hq-interview-synth", label: "Interview feedback synthesis — aggregate all scorecards into recommendation", done: false, createdAt: d },
        { id: "idea-hq-social-caption", label: "Social media caption generation for Instagram/LinkedIn/Twitter", done: false, createdAt: d },
        { id: "idea-hq-site-uptime", label: "Site uptime monitoring (5-min pings + immediate Slack alerts)", done: false, createdAt: d },
        { id: "idea-hq-seo-alerts", label: "SEO rank change alerts via Ahrefs integration", done: false, createdAt: d },
        { id: "idea-hq-callsync", label: "Callsync Mobile App — on-demand and auto call sync", done: false, createdAt: d },
        { id: "idea-hq-ats-seed", label: "ATS seeding with real candidate data", done: false, createdAt: d },
        { id: "idea-hq-hrms-seed", label: "HRMS seeding with real employee data", done: false, createdAt: d },
      ],
    },
    {
      id: "idea-goyo", label: "GoyoTours Admin", done: false, createdAt: d,
      children: [
        { id: "idea-goyo-visa-remind", label: "Visa expiry reminders (90/30/7 days) via email + WhatsApp", done: false, createdAt: d },
        { id: "idea-goyo-itinerary-ai", label: "AI itinerary generator from tour template + client preferences", done: false, createdAt: d },
        { id: "idea-goyo-guide-match", label: "Guide auto-assignment based on language + availability + ratings", done: false, createdAt: d },
        { id: "idea-goyo-booking-confirm", label: "Booking confirmation email/WhatsApp with full tour details", done: false, createdAt: d },
        { id: "idea-goyo-dynamic-pricing", label: "Dynamic tour pricing based on seasonal demand + competitor analysis", done: false, createdAt: d },
        { id: "idea-goyo-cancel-predict", label: "Cancellation risk prediction for upcoming bookings", done: false, createdAt: d },
      ],
    },
    {
      id: "idea-life", label: "Life AI", done: false, createdAt: d,
      children: [
        { id: "idea-life-weekly-synth", label: "Weekly insight synthesis (mood + spending + goals + health trends)", done: false, createdAt: d },
        { id: "idea-life-habit-nudge", label: "Habit streak prediction + daily motivational nudges", done: false, createdAt: d },
        { id: "idea-life-networth", label: "Net worth forecast (3/6/12 months) with scenarios", done: false, createdAt: d },
        { id: "idea-life-spend-anomaly", label: "Spending anomaly alerts for large/unusual transactions", done: false, createdAt: d },
        { id: "idea-life-book-actions", label: "Book-to-action extraction — key takeaways + habit suggestions", done: false, createdAt: d },
        { id: "idea-life-health-corr", label: "Health correlator — sleep vs mood vs exercise patterns", done: false, createdAt: d },
        { id: "idea-life-birthday", label: "Birthday/milestone reminders with suggested actions", done: false, createdAt: d },
      ],
    },
    {
      id: "idea-dev", label: "Development & Platform", done: false, createdAt: d,
      children: [
        { id: "idea-dev-deploy-triage", label: "Deployment failure auto-triage — AI explains errors + suggests fix", done: false, createdAt: d },
        { id: "idea-dev-domain-ssl", label: "Domain/SSL expiry reminders (60/30/14/7 days)", done: false, createdAt: d },
        { id: "idea-dev-claude-summary", label: "Weekly Claude work summary — aggregate claude_work_log into digest", done: false, createdAt: d },
        { id: "idea-dev-vuln-scan", label: "Dependency vulnerability scan (daily npm audit)", done: false, createdAt: d },
        { id: "idea-dev-stale-checklist", label: "Project checklist stale-item alerts (not updated in 7+ days)", done: false, createdAt: d },
        { id: "idea-dev-api-docs", label: "API documentation auto-generator from route handler files", done: false, createdAt: d },
      ],
    },
    {
      id: "idea-plugins", label: "Plugins & Integrations", done: false, createdAt: d,
      children: [
        { id: "idea-plug-docusign", label: "DocuSign plugin for contract signing", done: false, createdAt: d },
        { id: "idea-plug-razorpay", label: "Razorpay Sync — payment gateway integration", done: false, createdAt: d },
        { id: "idea-plug-wise-pay", label: "Wise for sending outbound payments (not just receiving)", done: false, createdAt: d },
        { id: "idea-plug-shopify", label: "Shopify multi-channel sync alongside Faire", done: false, createdAt: d },
        { id: "idea-plug-slack", label: "Slack webhook notifications for all spaces", done: false, createdAt: d },
        { id: "idea-plug-shipstation", label: "ShipStation / EasyPost for shipping label generation", done: false, createdAt: d },
        { id: "idea-plug-quickbooks", label: "QuickBooks / Xero accounting integration", done: false, createdAt: d },
        { id: "idea-plug-calendly", label: "Calendly integration for onboarding call scheduling", done: false, createdAt: d },
      ],
    },
    {
      id: "idea-cross-space", label: "Cross-Space Platform Intelligence", done: false, createdAt: d,
      children: [
        { id: "idea-cs-notif-hub", label: "Unified notification center (Slack + email + WhatsApp + in-app)", done: false, createdAt: d },
        { id: "idea-cs-anomaly", label: "Cross-space anomaly detection (revenue drops, churn spikes, cost overruns)", done: false, createdAt: d },
        { id: "idea-cs-data-quality", label: "Nightly data quality check (nulls, stale data, orphan records)", done: false, createdAt: d },
        { id: "idea-cs-semantic-search", label: "Unified semantic search across all spaces (full-text + embeddings)", done: false, createdAt: d },
        { id: "idea-cs-sla-monitor", label: "SLA monitoring (ticket response time, order fulfillment time)", done: false, createdAt: d },
        { id: "idea-cs-activity-digest", label: "Daily activity digest per space sent to space owner", done: false, createdAt: d },
      ],
    },
    {
      id: "idea-ventures", label: "New Ventures & Expansions", done: false, createdAt: d,
      children: [
        { id: "idea-toys-project", label: "Surface new space — Toys Project (ideation, legal, omnichannel)", done: false, createdAt: d },
        { id: "idea-china-imports", label: "chinaproducts.in + chinaimports.in — China import admin + client", done: false, createdAt: d },
        { id: "idea-jsblueridge-revive", label: "JSBlueridge revive and stabilize", done: false, createdAt: d },
        { id: "idea-koa-port-huron", label: "KOA Port Huron comprehensive execution plan", done: false, createdAt: d },
        { id: "idea-website-migrate", label: "Migrate suprans.in website to main portal", done: false, createdAt: d },
        { id: "idea-omnichannel", label: "Omnichannel integration strategy — Shopify, Amazon, TikTok Shop, Etsy alongside Faire", done: false, createdAt: d },
      ],
    },
    {
      id: "idea-ai-tools", label: "AI Tools to Build", done: false, createdAt: d,
      children: [
        { id: "idea-ai-order-risk", label: "Order Risk Scorer — flag risky orders (new retailer, high value)", done: false, createdAt: d },
        { id: "idea-ai-retailer-insights", label: "Retailer Insights Generator — profile + LTV + churn risk", done: false, createdAt: d },
        { id: "idea-ai-margin-calc", label: "Margin Calculator — real-time with COGS + Faire commission + shipping", done: false, createdAt: d },
        { id: "idea-ai-reorder-predict", label: "Reorder Predictor — predict when retailer will reorder", done: false, createdAt: d },
        { id: "idea-ai-listing-audit", label: "Listing Audit — score products against marketplace best practices", done: false, createdAt: d },
        { id: "idea-ai-pnl-narrator", label: "P&L Narrator — AI explains financial performance trends", done: false, createdAt: d },
        { id: "idea-ai-meeting-notes", label: "Meeting Notes Summarizer — recordings to action items", done: false, createdAt: d },
        { id: "idea-ai-goal-decompose", label: "Goal Decomposer — break goals into milestones + habits", done: false, createdAt: d },
        { id: "idea-ai-decision-framework", label: "Decision Framework — structured pros/cons/risk for journal decisions", done: false, createdAt: d },
        { id: "idea-ai-error-explainer", label: "Error Explainer — plain English build/deploy error explanations", done: false, createdAt: d },
        { id: "idea-ai-niche-finder", label: "Niche Finder — identify underserved product niches from trends", done: false, createdAt: d },
      ],
    },
    {
      id: "idea-accounting", label: "Accounting & Compliance", done: false, createdAt: d,
      children: [
        { id: "idea-acc-separate-space", label: "Separate CA + Full Accounting & Compliance space — or mini ledger in HQ for Yash to manage", done: false, createdAt: d },
        { id: "idea-acc-us-companies", label: "US Companies management — all company-related things in one place", done: false, createdAt: d },
        { id: "idea-acc-contracts-docs", label: "Contracts, documents, trademark management section", done: false, createdAt: d },
        { id: "idea-acc-compliance-cal", label: "Compliance calendar integrated with LN client data", done: false, createdAt: d },
      ],
    },
    {
      id: "idea-india-d2c", label: "India D2C & New Markets", done: false, createdAt: d,
      children: [
        { id: "idea-d2c-space", label: "India D2C Brand & Testing — separate space or merged with dropdown", done: false, createdAt: d },
        { id: "idea-micro-saas", label: "Micro SaaS products — build and sell in US not India", done: false, createdAt: d },
        { id: "idea-ds-cohosts", label: "Digital School (DS) — cohosts program", done: false, createdAt: d },
        { id: "idea-ds-courses", label: "Digital School (DS) — recorded courses", done: false, createdAt: d },
      ],
    },
    {
      id: "idea-branding-platform", label: "Branding & Marketing Platform", done: false, createdAt: d,
      children: [
        { id: "idea-brand-space", label: "Space or pages for Branding — logo, brand kit, creatives", done: false, createdAt: d },
        { id: "idea-brand-location", label: "Place in Suprans HQ or marketing space — decide location", done: false, createdAt: d },
        { id: "idea-role-scoping", label: "Role scoping — clone & build to suit role (pros/cons/auth)", done: false, createdAt: d },
        { id: "idea-role-switching", label: "Role switching & space creation per employee — Manager → Executive → All-general or Specifics", done: false, createdAt: d },
        { id: "idea-separate-filter", label: "Separate space or filter this one — for different employee roles", done: false, createdAt: d },
      ],
    },
    {
      id: "idea-agent-improvements", label: "Agent & Theme Improvements", done: false, createdAt: d,
      children: [
        { id: "idea-polish-agents", label: "Polish agents — refine prompts and behavior", done: false, createdAt: d },
        { id: "idea-audit-agents", label: "Audit agents — verify correctness and coverage", done: false, createdAt: d },
        { id: "idea-compare-agents", label: "Compare & improve agents — benchmark and iterate", done: false, createdAt: d },
        { id: "idea-portal-skins", label: "Skins for each portal — 1-click theme change", done: false, createdAt: d },
        { id: "idea-normalize-css", label: "Normalize global CSS to import multiple theme sets", done: false, createdAt: d },
        { id: "idea-component-lib", label: "Component library — separate reusable UI package", done: false, createdAt: d },
        { id: "idea-reusable-plugins", label: "Reusable component & plugin/pages library in development", done: false, createdAt: d },
      ],
    },
  ]
}

function makeBugsTree(): TaskNode[] {
  const d = TODAY
  return [
    {
      id: "bug-server-errors", label: "Server Errors (500)", done: false, createdAt: d,
      children: [
        { id: "bug-dev-projects-500", label: "/development/projects — HTTP 500, server-side crash in RSC render", done: false, createdAt: d, category: "api" },
        { id: "bug-projects-500", label: "/projects — HTTP 500, page shows 'This page couldn\\'t load'", done: false, createdAt: d, category: "api" },
      ],
    },
    {
      id: "bug-missing-routes", label: "Missing Routes & 404s", done: false, createdAt: d,
      children: [
        { id: "bug-qa-calls-404", label: "/workspace/qa/calls — Referenced in sidebar nav but route never built. Causes 404 prefetch on every workspace page", done: false, createdAt: d, category: "api" },
        { id: "bug-wallpaper-404", label: "Homepage — /wallpaper-vestrahorn.jpg returns 404, broken background image", done: false, createdAt: d, category: "ui" },
      ],
    },
    {
      id: "bug-supabase-queries", label: "Supabase Query Errors (400)", done: false, createdAt: d,
      children: [
        { id: "bug-sms-logs-400", label: "/workspace/comms/overview — sms_logs query returns 400 (table may not exist or wrong column)", done: false, createdAt: d, category: "data" },
        { id: "bug-research-ideas-400", label: "/workspace/research/goals — research_product_ideas query returns 400 (missing 'name' column)", done: false, createdAt: d, category: "data" },
      ],
    },
    {
      id: "bug-ssr-hydration", label: "SSR / Hydration Issues", done: false, createdAt: d,
      children: [
        { id: "bug-marketing-dash-rsc", label: "/marketing/dashboard — Raw RSC payload leaks into <body> text, flash of unhydrated content", done: false, createdAt: d, category: "ui" },
        { id: "bug-marketing-camp-rsc", label: "/marketing/campaigns — Same RSC payload leak as marketing/dashboard", done: false, createdAt: d, category: "ui" },
      ],
    },
    {
      id: "bug-broken-external", label: "Broken External Services", done: false, createdAt: d,
      children: [
        { id: "bug-clearbit-dns", label: "/workspace/stack — logo.clearbit.com DNS is dead, 35+ company logos are broken images", done: false, createdAt: d, category: "integration" },
      ],
    },
    {
      id: "bug-css-assets", label: "CSS & Asset Issues", done: false, createdAt: d,
      children: [
        { id: "bug-pricing-css-mime", label: "/catalog/pricing — CSS chunk served as text/plain instead of text/css, styles not applied", done: false, createdAt: d, category: "deployment" },
      ],
    },
    {
      id: "bug-performance", label: "Performance Issues", done: false, createdAt: d,
      children: [
        { id: "bug-aggressive-prefetch", label: "Workspace pages — Aggressive RSC prefetching causes mass ERR_ABORTED network requests on navigation", done: false, createdAt: d, category: "performance" },
        { id: "bug-stale-chunks", label: "/workspace/research/goals — Multiple JS chunks fail to load (ERR_ABORTED), possible stale deployment artifacts", done: false, createdAt: d, category: "deployment" },
      ],
    },
    {
      id: "bug-product-flow", label: "Product Flow Issues", done: false, createdAt: d,
      children: [
        { id: "bug-faire-products-flow", label: "Faire Products flow broken — product management pipeline needs fixing", done: false, createdAt: d, category: "data" },
      ],
    },
    /* ── USDrop Client Portal ── */
    {
      id: "bug-usdrop-client", label: "USDrop — Client Portal", done: false, createdAt: d,
      children: [
        {
          id: "bug-usdrop-videos", label: "Content & Videos", done: false, createdAt: d,
          children: [
            { id: "bug-ud-vid-mentorship02", label: "Introduction to Mentorship 02 — video not available on platform", done: false, createdAt: d, category: "data" },
            { id: "bug-ud-vid-stepbystep", label: "USA Dropshipping: Step by Step — video not available on platform", done: false, createdAt: d, category: "data" },
            { id: "bug-ud-vid-tools02", label: "Tools 02: How to install plugins — video not available on platform", done: false, createdAt: d, category: "data" },
            { id: "bug-ud-vid-tools03", label: "Tools 03: How to use Niche Scraper — video not available on platform", done: false, createdAt: d, category: "data" },
            { id: "bug-ud-vid-shopify-setup", label: "Shopify: Shopify Setup — video not available on platform", done: false, createdAt: d, category: "data" },
            { id: "bug-ud-vid-shopify04", label: "Shopify 04 — video not available on platform", done: false, createdAt: d, category: "data" },
            { id: "bug-ud-vid-shopify07", label: "Shopify 07 — video not available on platform", done: false, createdAt: d, category: "data" },
            { id: "bug-ud-vid-metaad04", label: "Meta Ad 04 — video not available on platform", done: false, createdAt: d, category: "data" },
            { id: "bug-ud-vid-metaad05", label: "Meta Ad 05 — video not available on platform", done: false, createdAt: d, category: "data" },
            { id: "bug-ud-vid-resources-docs", label: "Resources section — documents are missing entirely", done: false, createdAt: d, category: "data" },
            { id: "bug-ud-vid-listing-walkthrough", label: "Resources: Product listing walkthrough — placeholder video URL added, modal renders iframe", done: true, createdAt: d, category: "data" },
            { id: "bug-ud-vid-store-blueprint", label: "Resources: Store launch blueprint — placeholder video URL added, modal renders iframe", done: true, createdAt: d, category: "data" },
            { id: "bug-ud-vid-mylearning-empty", label: "My Learning > Resources — no videos available for user", done: false, createdAt: d, category: "data" },
            { id: "bug-ud-vid-free-access", label: "Free user access — slug-based whitelist: only Mentorship Framework (2 modules) + Sourcing China 1688.com", done: true, createdAt: d, category: "auth" },
          ],
        },
        {
          id: "bug-usdrop-store-products", label: "Store & Products", done: false, createdAt: d,
          children: [
            { id: "bug-ud-shopify-connect", label: "Shopify Store connection — user unable to connect their Shopify store in platform (OAuth fully implemented)", done: true, createdAt: d, category: "integration" },
            { id: "bug-ud-trending-products", label: "Trending products — not loading with images and details (DB-backed, working)", done: true, createdAt: d, category: "data" },
            { id: "bug-ud-product-selection", label: "Product selection — out of 100 products, cannot identify which are selected or not", done: false, createdAt: d, category: "ui" },
            { id: "bug-ud-product-search", label: "Search bar in Product Toolbar — debounced API search + local filter added", done: true, createdAt: d, category: "ui" },
          ],
        },
        {
          id: "bug-usdrop-profile-account", label: "Profile & Account", done: false, createdAt: d,
          children: [
            { id: "bug-ud-profile-pic", label: "Profile Picture — unable to edit/change profile picture", done: true, createdAt: d, category: "ui" },
            { id: "bug-ud-password-change", label: "Password change — PUT /api/user/password endpoint + form added to my-profile", done: true, createdAt: d, category: "auth" },
            { id: "bug-ud-account-settings", label: "Account settings — dropdown links added (My Profile + Account Settings)", done: true, createdAt: d, category: "ui" },
            { id: "bug-ud-my-profile", label: "My Profile — dropdown link added to topbar menu", done: true, createdAt: d, category: "ui" },
          ],
        },
        {
          id: "bug-usdrop-features-ux", label: "Features & UX", done: false, createdAt: d,
          children: [
            { id: "bug-ud-ai-shortcut", label: "US Drop AI shortcut popup — not visible on screen to install the app (PWA prompt implemented)", done: true, createdAt: d, category: "ui" },
            { id: "bug-ud-call-mentor", label: "'Call with Mentor' in My Roadmap — now only shows after Stage 1&2, removed from later stages", done: true, createdAt: d, category: "ui" },
            { id: "bug-ud-session-duration", label: "My Session — duration stored as string in DB, verify data accuracy", done: false, createdAt: d, category: "data" },
            { id: "bug-ud-notifications", label: "Notifications (Bell Icon) — bell icon added to topbar with dropdown shell", done: true, createdAt: d, category: "ui" },
          ],
        },
      ],
    },
    /* ── USDrop Admin Portal ── */
    {
      id: "bug-usdrop-admin", label: "USDrop — Admin Portal", done: false, createdAt: d,
      children: [
        {
          id: "bug-usdrop-admin-users", label: "User Management", done: false, createdAt: d,
          children: [
            { id: "bug-ua-pro-count", label: "PRO User count — filterable via Pro/Enterprise tab, count accurate from DB", done: true, createdAt: d, category: "data" },
            { id: "bug-ua-user-limit", label: "User list — expanded to 1000 rows + client-side Load More pagination (50 per page)", done: true, createdAt: d, category: "ui" },
            { id: "bug-ua-saved-products", label: "User saved products — new 'Saved Products' tab added to user detail page", done: true, createdAt: d, category: "data" },
            { id: "bug-ua-edit-profile", label: "Edit profile — 'Edit Profile' modal added to user actions menu", done: true, createdAt: d, category: "ui" },
            { id: "bug-ua-plan-edit", label: "Plan editing — promote/demote actions exist in user detail page", done: true, createdAt: d, category: "ui" },
          ],
        },
        {
          id: "bug-usdrop-admin-progress", label: "Progress & Tracking", done: false, createdAt: d,
          children: [
            { id: "bug-ua-progress-sync", label: "Progress — new 'Courses' tab shows enrollments + module completions per user", done: true, createdAt: d, category: "data" },
            { id: "bug-ua-enrolled-courses", label: "Enrolled courses — visible in user detail 'Courses' tab with status/progress", done: true, createdAt: d, category: "data" },
            { id: "bug-ua-onboarding-progress", label: "Onboarding Progress — shown as KPI in user detail + course enrollment tracking", done: true, createdAt: d, category: "data" },
          ],
        },
        {
          id: "bug-usdrop-admin-search", label: "Search & Navigation", done: false, createdAt: d,
          children: [
            { id: "bug-ua-search-bar", label: "Search bar — client-side search working on all admin pages", done: true, createdAt: d, category: "ui" },
          ],
        },
      ],
    },
  ]
}

function makePluginsTree(): TaskNode[] {
  const d = TODAY
  return [
    {
      id: "plug-comm", label: "Communication", done: false, createdAt: d,
      children: [
        { id: "plug-inbox", label: "Inbox — unified notification inbox", done: true, createdAt: d, category: "stable" },
        { id: "plug-chat", label: "Chat — team chat with channels and threads", done: true, createdAt: d, category: "stable" },
        { id: "plug-comms", label: "Comms — email broadcasts, templates, campaigns", done: true, createdAt: d, category: "built" },
        { id: "plug-gmail", label: "Gmail — native inbox, drafts, AI categorization", done: true, createdAt: d, category: "built" },
        { id: "plug-unibox", label: "Unibox — unified inbox across email/WhatsApp/SMS/in-app", done: false, createdAt: d, category: "planned" },
        { id: "plug-biz-phone", label: "Business Phone — 1-to-1 calling with CRM sync", done: false, createdAt: d, category: "planned" },
        { id: "plug-sales-dialer", label: "Sales Dialer — power dialing for outbound campaigns", done: false, createdAt: d, category: "planned" },
        { id: "plug-meeting-links", label: "Meeting Links — booking pages with availability rules", done: false, createdAt: d, category: "planned" },
        { id: "plug-meeting-router", label: "Meeting Router — route inbound meetings via lead-routing", done: false, createdAt: d, category: "planned" },
        { id: "plug-whatsapp-full", label: "WhatsApp Business — templates, flows and inbound", done: false, createdAt: d, category: "planned" },
      ],
    },
    {
      id: "plug-ops", label: "Operations", done: false, createdAt: d,
      children: [
        { id: "plug-calendar", label: "Calendar — personal and shared calendars", done: true, createdAt: d, category: "stable" },
        { id: "plug-tasks", label: "Tasks — kanban, assignments, priority tracking", done: true, createdAt: d, category: "stable" },
        { id: "plug-automations", label: "Automations — background workflows, flow canvas", done: true, createdAt: d, category: "built" },
        { id: "plug-analytics", label: "Analytics — revenue, traffic, performance dashboards", done: true, createdAt: d, category: "built" },
        { id: "plug-tickets", label: "Tickets — internal and client support queues", done: true, createdAt: d, category: "built" },
        { id: "plug-notes", label: "Notes — rich notes with mentions and linking", done: true, createdAt: d, category: "built" },
        { id: "plug-forms", label: "Forms — data capture that pipes into any module", done: false, createdAt: d, category: "planned" },
        { id: "plug-workflows", label: "Workflows — visual drag-and-drop process builder", done: false, createdAt: d, category: "planned" },
        { id: "plug-sheets", label: "Sheets — lightweight collaborative spreadsheets", done: false, createdAt: d, category: "planned" },
        { id: "plug-esign", label: "E-Sign — legally binding document signatures", done: false, createdAt: d, category: "planned" },
        { id: "plug-contracts", label: "Client Contracts — lifecycle management", done: false, createdAt: d, category: "planned" },
        { id: "plug-reports", label: "Reports — schedulable rich-text reports with charts", done: false, createdAt: d, category: "planned" },
        { id: "plug-payment-link", label: "Payment Link Generator — create and share payment links", done: false, createdAt: d, category: "planned" },
        { id: "plug-quotation-pdf", label: "Quotation PDF Generator — auto-generate quotes from data", done: false, createdAt: d, category: "planned" },
        { id: "plug-daily-reports", label: "Daily Reports — automated daily summary reports", done: false, createdAt: d, category: "planned" },
        { id: "plug-settings", label: "Settings Page — per-space configuration UI", done: false, createdAt: d, category: "planned" },
        { id: "plug-news", label: "News — daily update feed plugin", done: false, createdAt: d, category: "planned" },
        { id: "plug-ledger", label: "Ledger — financial ledger and balance tracking", done: false, createdAt: d, category: "planned" },
      ],
    },
    {
      id: "plug-hr", label: "HR Suite", done: false, createdAt: d,
      children: [
        { id: "plug-team", label: "Team — directory with roles and contacts", done: true, createdAt: d, category: "stable" },
        { id: "plug-remote", label: "Remote — time zones, availability, status board", done: true, createdAt: d, category: "built" },
        { id: "plug-employees", label: "Employees — full records with detail pages", done: false, createdAt: d, category: "planned" },
        { id: "plug-onboarding", label: "Onboarding — structured checklists and welcome flows", done: false, createdAt: d, category: "planned" },
        { id: "plug-org-chart", label: "Org Chart — auto-generated with drill-down", done: false, createdAt: d, category: "planned" },
        { id: "plug-departments", label: "Departments — budgets and headcount planning", done: false, createdAt: d, category: "planned" },
        { id: "plug-attendance", label: "Attendance — clock-in/out with geofencing", done: false, createdAt: d, category: "planned" },
        { id: "plug-leaves", label: "Leaves — requests, balances, approval routing", done: false, createdAt: d, category: "planned" },
        { id: "plug-payroll", label: "Payroll — salary processing and compliance", done: false, createdAt: d, category: "planned" },
        { id: "plug-performance", label: "Performance Reviews — 360 feedback cycles", done: false, createdAt: d, category: "planned" },
        { id: "plug-okrs", label: "Goals / OKRs — company + team + individual tracking", done: false, createdAt: d, category: "planned" },
        { id: "plug-candidates", label: "Candidates — ATS with pipeline and scorecards", done: false, createdAt: d, category: "planned" },
        { id: "plug-interviews", label: "Interviews — scheduling, kits, feedback collection", done: false, createdAt: d, category: "planned" },
      ],
    },
    {
      id: "plug-ecom", label: "Ecommerce", done: false, createdAt: d,
      children: [
        { id: "plug-fulfillment", label: "Fulfillment Hub — pick, pack, ship across warehouses", done: false, createdAt: d, category: "planned" },
        { id: "plug-procurement", label: "Procurement — POs, supplier mgmt, landed-cost", done: false, createdAt: d, category: "planned" },
        { id: "plug-invoices", label: "Invoices — customer-facing with tax and payment links", done: false, createdAt: d, category: "planned" },
        { id: "plug-ecom-marketing", label: "Ecommerce Marketing — promos and seasonal campaigns", done: false, createdAt: d, category: "planned" },
      ],
    },
    {
      id: "plug-sales", label: "Sales & CRM", done: false, createdAt: d,
      children: [
        { id: "plug-sequences", label: "Sequences — multi-channel outreach cadences", done: false, createdAt: d, category: "planned" },
        { id: "plug-cpq", label: "CPQ — configure-price-quote for bundled offers", done: false, createdAt: d, category: "planned" },
        { id: "plug-prospect", label: "Prospect — find decision-makers with verified data", done: false, createdAt: d, category: "planned" },
        { id: "plug-enrich", label: "Data Enrichment — auto-fill company + firmographic data", done: false, createdAt: d, category: "planned" },
        { id: "plug-signals", label: "Signals — website visits to ready-to-work leads", done: false, createdAt: d, category: "planned" },
      ],
    },
    {
      id: "plug-finance", label: "Finance", done: false, createdAt: d,
      children: [
        { id: "plug-fin-invoices", label: "Invoices — send and collect with payment links", done: false, createdAt: d, category: "planned" },
        { id: "plug-pos", label: "POS — point-of-sale for in-store checkout", done: false, createdAt: d, category: "planned" },
        { id: "plug-valo", label: "Valo — company valuation and cap-table modelling", done: false, createdAt: d, category: "planned" },
      ],
    },
    {
      id: "plug-dev", label: "Dev & Builder", done: false, createdAt: d,
      children: [
        { id: "plug-development", label: "Development — engineering space with projects/deploys/roadmap", done: true, createdAt: d, category: "stable" },
        { id: "plug-projects", label: "Projects Portfolio — all apps grouped by venture", done: true, createdAt: d, category: "stable" },
        { id: "plug-deployments", label: "Deployments — Vercel webhook feed + backfill", done: true, createdAt: d, category: "built" },
        { id: "plug-roadmap", label: "Roadmap — quarterly themes + changelog", done: true, createdAt: d, category: "built" },
        { id: "plug-github", label: "GitHub — repo activity, PRs, review queue", done: false, createdAt: d, category: "planned" },
        { id: "plug-vercel-console", label: "Vercel Console — deploy status and build logs", done: false, createdAt: d, category: "planned" },
        { id: "plug-supabase-console", label: "Supabase Console — schema, migrations, RLS", done: false, createdAt: d, category: "planned" },
        { id: "plug-sentry", label: "Sentry — exceptions with stack traces", done: false, createdAt: d, category: "planned" },
        { id: "plug-component-lib", label: "Component Library — separate reusable UI package", done: false, createdAt: d, category: "planned" },
        { id: "plug-theme-skins", label: "Theme Skins — 1-click portal theme switching, multiple theme sets", done: false, createdAt: d, category: "planned" },
      ],
    },
    {
      id: "plug-ai", label: "AI-Native", done: false, createdAt: d,
      children: [
        { id: "plug-ai-tools", label: "AI Tools — title optimizer, desc gen, pricing, tags, audit", done: true, createdAt: d, category: "built" },
        { id: "plug-ai-team", label: "AI Team — remote AI agent roster", done: true, createdAt: d, category: "built" },
        { id: "plug-ai-notetaker", label: "AI Notetaker — meeting transcription and summaries", done: false, createdAt: d, category: "planned" },
        { id: "plug-ai-coaches", label: "AI Coaches — persona-based agents for strategy/ops", done: false, createdAt: d, category: "planned" },
        { id: "plug-ai-scorers", label: "AI Scorers — auto-grade listings, candidates, deals", done: false, createdAt: d, category: "planned" },
      ],
    },
    {
      id: "plug-knowledge", label: "Knowledge & Learning", done: false, createdAt: d,
      children: [
        { id: "plug-research", label: "Research — product ideas, competitors, trends, sources", done: true, createdAt: d, category: "built" },
        { id: "plug-learning", label: "Learning — training videos, SOPs, knowledge base", done: true, createdAt: d, category: "built" },
        { id: "plug-help", label: "Help — FAQ and guided support", done: true, createdAt: d, category: "built" },
        { id: "plug-links", label: "Links — URL shortener and link manager", done: true, createdAt: d, category: "built" },
        { id: "plug-files", label: "Files — centralized file storage", done: true, createdAt: d, category: "built" },
        { id: "plug-stack", label: "Stack — tech stack directory", done: true, createdAt: d, category: "built" },
      ],
    },
    {
      id: "plug-integrations", label: "Third-Party Integrations", done: false, createdAt: d,
      children: [
        { id: "plug-stripe", label: "Stripe — subscriptions + one-time billing", done: false, createdAt: d, category: "planned" },
        { id: "plug-cloudflare", label: "Cloudflare — DNS, edge routing, WAF rules", done: false, createdAt: d, category: "planned" },
        { id: "plug-datadog", label: "DataDog — infra monitoring and synthetic uptime", done: false, createdAt: d, category: "planned" },
        { id: "plug-figma", label: "Figma — design files with code-connect mappings", done: false, createdAt: d, category: "planned" },
        { id: "plug-dev-center", label: "Developer Center — API keys, webhooks, integration docs", done: false, createdAt: d, category: "planned" },
      ],
    },
    {
      id: "plug-social", label: "Social & Scheduling", done: false, createdAt: d,
      children: [
        { id: "plug-content-cal", label: "Content Calendar — visual schedule for posts", done: false, createdAt: d, category: "planned" },
        { id: "plug-post-composer", label: "Post Composer — multi-network editor with previews", done: false, createdAt: d, category: "planned" },
        { id: "plug-social-analytics", label: "Social Analytics — reach, engagement, followers", done: false, createdAt: d, category: "planned" },
        { id: "plug-hashtag-mgr", label: "Hashtag Manager — curated sets with performance", done: false, createdAt: d, category: "planned" },
      ],
    },
  ]
}

/* ------------------------------------------------------------------ */
/*  Agents & Skills data                                               */
/* ------------------------------------------------------------------ */

type CatalogItem = {
  id: string
  name: string
  category: string
  description: string
  details: { label: string; value: string }[]
}

const AGENTS_SKILLS: CatalogItem[] = [
  // Claude Code Skills — Core
  { id: "sk-update-config", name: "/update-config", category: "Skills — Core", description: "Configure Claude Code harness settings, hooks, permissions, and env vars", details: [{ label: "Trigger", value: "Settings changes, hooks, permissions" }] },
  { id: "sk-init", name: "/init", category: "Skills — Core", description: "Initialize a new CLAUDE.md file with codebase documentation", details: [{ label: "Trigger", value: "/init in new repo" }] },
  { id: "sk-loop", name: "/loop", category: "Skills — Core", description: "Run a prompt or slash command on a recurring interval", details: [{ label: "Trigger", value: "Recurring tasks, polling" }] },
  { id: "sk-schedule", name: "/schedule", category: "Skills — Core", description: "Create, update, list, or run scheduled remote agents on cron", details: [{ label: "Trigger", value: "Cron jobs, scheduled automation" }] },
  { id: "sk-skill-creator", name: "/skill-creator", category: "Skills — Core", description: "Guide for creating new skills that extend Claude capabilities", details: [{ label: "Trigger", value: "Building new skills" }] },
  // Skills — Code
  { id: "sk-claude-api", name: "/claude-api", category: "Skills — Code", description: "Build, debug, and optimize Claude API / Anthropic SDK apps with prompt caching", details: [{ label: "Trigger", value: "Anthropic SDK imports, Claude API usage" }] },
  { id: "sk-mcp-builder", name: "/mcp-builder", category: "Skills — Code", description: "Guide for creating MCP servers to integrate external APIs/services", details: [{ label: "Trigger", value: "Building MCP servers" }] },
  { id: "sk-simplify", name: "/simplify", category: "Skills — Code", description: "Review changed code for reuse, quality, and efficiency, then fix issues", details: [{ label: "Trigger", value: "Code review, refactoring" }] },
  { id: "sk-review", name: "/review", category: "Skills — Code", description: "Review a pull request for code quality and correctness", details: [{ label: "Trigger", value: "/review on PR" }] },
  { id: "sk-security-review", name: "/security-review", category: "Skills — Code", description: "Complete security review of pending changes on current branch", details: [{ label: "Trigger", value: "/security-review" }] },
  // Skills — Design
  { id: "sk-frontend-design", name: "/frontend-design", category: "Skills — Design", description: "Create distinctive, production-grade frontend interfaces with high design quality", details: [{ label: "Trigger", value: "Building web components, pages, dashboards" }] },
  { id: "sk-algorithmic-art", name: "/algorithmic-art", category: "Skills — Design", description: "Create algorithmic art using p5.js with seeded randomness and interactivity", details: [{ label: "Trigger", value: "Generative art, flow fields" }] },
  { id: "sk-canvas-design", name: "/canvas-design", category: "Skills — Design", description: "Create visual art in .png and .pdf using design philosophy", details: [{ label: "Trigger", value: "Posters, visual art, static designs" }] },
  { id: "sk-theme-factory", name: "/theme-factory", category: "Skills — Design", description: "Style artifacts with 10 pre-set themes or generate custom themes", details: [{ label: "Trigger", value: "Theming slides, docs, pages" }] },
  { id: "sk-web-artifacts", name: "/web-artifacts-builder", category: "Skills — Design", description: "Build multi-component claude.ai HTML artifacts with React, Tailwind, shadcn/ui", details: [{ label: "Trigger", value: "Complex web artifacts" }] },
  // Skills — Documents
  { id: "sk-pdf", name: "/pdf", category: "Skills — Documents", description: "Read, create, merge, split, rotate, watermark, encrypt, OCR PDF files", details: [{ label: "Trigger", value: "Any .pdf file task" }] },
  { id: "sk-docx", name: "/docx", category: "Skills — Documents", description: "Create, read, edit Word documents with formatting, TOC, headers, images", details: [{ label: "Trigger", value: "Any .docx task" }] },
  { id: "sk-pptx", name: "/pptx", category: "Skills — Documents", description: "Create, read, edit PowerPoint presentations with slides, notes, templates", details: [{ label: "Trigger", value: "Any .pptx task" }] },
  { id: "sk-xlsx", name: "/xlsx", category: "Skills — Documents", description: "Open, read, edit, create spreadsheets with formulas, charts, formatting", details: [{ label: "Trigger", value: "Any .xlsx, .csv task" }] },
  { id: "sk-doc-coauthor", name: "/doc-coauthoring", category: "Skills — Documents", description: "Structured workflow for co-authoring documentation, proposals, and specs", details: [{ label: "Trigger", value: "Writing docs, proposals" }] },
  // Skills — Testing
  { id: "sk-playwright", name: "/playwright-skill", category: "Skills — Testing", description: "Complete browser automation with Playwright — test pages, forms, screenshots", details: [{ label: "Trigger", value: "Browser testing, automation" }] },
  { id: "sk-webapp-test", name: "/webapp-testing", category: "Skills — Testing", description: "Interact with and test local web applications using Playwright", details: [{ label: "Trigger", value: "Frontend verification, debugging UI" }] },
  // Skills — Memory
  { id: "sk-mem-search", name: "/claude-mem:mem-search", category: "Skills — Memory", description: "Search persistent cross-session memory database for prior work", details: [{ label: "Trigger", value: "Recalling past sessions" }] },
  { id: "sk-make-plan", name: "/claude-mem:make-plan", category: "Skills — Memory", description: "Create detailed, phased implementation plans with documentation discovery", details: [{ label: "Trigger", value: "Planning features" }] },
  { id: "sk-do", name: "/claude-mem:do", category: "Skills — Memory", description: "Execute phased implementation plans using parallel subagents", details: [{ label: "Trigger", value: "Running plans" }] },
  { id: "sk-smart-explore", name: "/claude-mem:smart-explore", category: "Skills — Memory", description: "Token-optimized structural code search using tree-sitter AST parsing", details: [{ label: "Trigger", value: "Understanding code structure" }] },
  { id: "sk-timeline", name: "/claude-mem:timeline-report", category: "Skills — Memory", description: "Generate narrative report analyzing project's full development history", details: [{ label: "Trigger", value: "Project history analysis" }] },
  // Claude Code Agents
  { id: "ag-work-logger", name: "work-logger", category: "Code Agents", description: "Logs all major changes to public.tasks and public.claude_work_log — mandatory after every significant ship", details: [{ label: "Role", value: "Audit Trail" }, { label: "Platform", value: "Claude Code" }] },
  { id: "ag-deploy", name: "deploy-agent", category: "Code Agents", description: "Handles production deployments — always uses --archive=tgz, aliases, and logs to public.deployment_events", details: [{ label: "Role", value: "Deployment" }, { label: "Platform", value: "Claude Code" }] },
  { id: "ag-seeder", name: "data-seeder", category: "Code Agents", description: "Seeds real data from source files into Supabase tables — never fake rows, marks blocked items", details: [{ label: "Role", value: "Data Pipeline" }, { label: "Platform", value: "Claude Code" }] },
  { id: "ag-auditor", name: "real-data-auditor", category: "Code Agents", description: "Audits seeded data for correctness — verifies no synthetic/fake rows exist in production tables", details: [{ label: "Role", value: "Data Quality" }, { label: "Platform", value: "Claude Code" }] },
  { id: "ag-design", name: "design-system-enforcer", category: "Code Agents", description: "Enforces DESIGN_SYSTEM.md rules — typography, shared primitives, status colors, shell layout before UI ships", details: [{ label: "Role", value: "UI Quality" }, { label: "Platform", value: "Claude Code" }] },
  { id: "ag-checklist", name: "checklist-enforcer", category: "Code Agents", description: "Validates project checklists before marking projects live — fails on any unticked required item", details: [{ label: "Role", value: "Project Gates" }, { label: "Platform", value: "Claude Code" }] },
  // AI Employees
  { id: "ai-priya", name: "Priya Sharma", category: "AI Employees", description: "Operations Manager — manages 6 Faire stores, order processing, inventory, fulfillment optimization, shipping logistics, and 17Track integration", details: [{ label: "Role", value: "Operations Manager" }, { label: "Status", value: "Online" }] },
  { id: "ai-vikram", name: "Vikram Singh", category: "AI Employees", description: "Technical Engineer — owns the Faire Ops tech stack, Next.js, Supabase, Vercel, API integrations, and automation", details: [{ label: "Role", value: "Technical Engineer" }, { label: "Status", value: "Online" }] },
  { id: "ai-meera", name: "Meera Reddy", category: "AI Employees", description: "Marketing & Content Lead — product listing SEO, email campaigns, WhatsApp outreach, Faire Direct strategy", details: [{ label: "Role", value: "Marketing & Content Lead" }, { label: "Status", value: "Online" }] },
  { id: "ai-ananya", name: "Ananya Desai", category: "AI Employees", description: "Customer Success Manager — retailer relationships, dispute resolution, VIP programs, 85% reactivation rate", details: [{ label: "Role", value: "Customer Success Manager" }, { label: "Status", value: "Online" }] },
  { id: "ai-arjun", name: "Arjun Patel", category: "AI Employees", description: "Analytics Specialist — sales data analysis, revenue trends, retailer behavior analytics, cohort segmentation, KPI dashboards", details: [{ label: "Role", value: "Analytics Specialist" }, { label: "Status", value: "Online" }] },
  // MCP Integrations
  { id: "mcp-supabase", name: "Supabase", category: "MCP Integrations", description: "Execute SQL, manage migrations, deploy edge functions, list tables, generate types, manage branches", details: [{ label: "Role", value: "Database & Backend" }, { label: "Protocol", value: "MCP" }] },
  { id: "mcp-ahrefs", name: "Ahrefs", category: "MCP Integrations", description: "Site explorer, keyword research, rank tracking, backlink analysis, web analytics, brand radar", details: [{ label: "Role", value: "SEO & Analytics" }, { label: "Protocol", value: "MCP" }] },
  { id: "mcp-figma", name: "Figma", category: "MCP Integrations", description: "Read designs, get screenshots, create FigJam diagrams, Code Connect mappings, design-to-code workflow", details: [{ label: "Role", value: "Design Tool" }, { label: "Protocol", value: "MCP" }] },
  { id: "mcp-slack", name: "Slack", category: "MCP Integrations", description: "Send/schedule messages, search channels/users, read threads, create/update canvases", details: [{ label: "Role", value: "Team Communication" }, { label: "Protocol", value: "MCP" }] },
  { id: "mcp-clickup", name: "ClickUp", category: "MCP Integrations", description: "Create/filter tasks, manage docs, time tracking, folders, lists, comments, reminders, chat", details: [{ label: "Role", value: "Project Management" }, { label: "Protocol", value: "MCP" }] },
  { id: "mcp-gmail", name: "Gmail", category: "MCP Integrations", description: "Search messages, read threads, create drafts, list labels, get profile info", details: [{ label: "Role", value: "Email" }, { label: "Protocol", value: "MCP" }] },
  { id: "mcp-gcal", name: "Google Calendar", category: "MCP Integrations", description: "Calendar event management with OAuth authentication", details: [{ label: "Role", value: "Scheduling" }, { label: "Protocol", value: "MCP" }] },
  { id: "mcp-razorpay", name: "Razorpay", category: "MCP Integrations", description: "Payment gateway integration with OAuth authentication", details: [{ label: "Role", value: "Payments" }, { label: "Protocol", value: "MCP" }] },
  { id: "mcp-mercury", name: "Mercury", category: "MCP Integrations", description: "Business banking integration with OAuth authentication", details: [{ label: "Role", value: "Banking" }, { label: "Protocol", value: "MCP" }] },
  { id: "mcp-godaddy", name: "GoDaddy", category: "MCP Integrations", description: "Check domain availability and get domain suggestions", details: [{ label: "Role", value: "Domains" }, { label: "Protocol", value: "MCP" }] },
  { id: "mcp-kiwi", name: "Kiwi.com", category: "MCP Integrations", description: "Search flights and provide travel feedback", details: [{ label: "Role", value: "Travel" }, { label: "Protocol", value: "MCP" }] },
  { id: "mcp-mem", name: "claude-mem", category: "MCP Integrations", description: "Cross-session memory with timeline, search, smart-explore, and observation tracking (1.17M tokens of work history)", details: [{ label: "Role", value: "Persistent Memory" }, { label: "Protocol", value: "MCP" }] },
]

/* ------------------------------------------------------------------ */
/*  External Integrations data                                         */
/* ------------------------------------------------------------------ */

type IntegrationItem = {
  id: string
  name: string
  category: string
  description: string
  spaces: string[]
  status: "active" | "planned"
  details: { label: string; value: string }[]
}

const EXTERNAL_INTEGRATIONS: IntegrationItem[] = [
  { id: "int-twilio", name: "Twilio", category: "Communication", description: "SMS and WhatsApp messaging via Twilio API. Supports template-based outreach, delivery receipts, and inbound message handling across all portal spaces.", spaces: ["Operations", "ETS", "LegalNations", "USDrop", "GoyoTours"], status: "active", details: [{ label: "Services", value: "SMS API, WhatsApp Business API" }, { label: "Use cases", value: "Order confirmations, retailer outreach, payment reminders, booking confirmations" }, { label: "Tables", value: "sms_logs, sms_templates" }] },
  { id: "int-resend", name: "Resend", category: "Communication", description: "Transactional and marketing email delivery via Resend API. Powers email templates, campaign broadcasts, scheduled sends, and delivery tracking across all spaces.", spaces: ["Operations", "ETS", "LegalNations", "USDrop", "HQ", "GoyoTours"], status: "active", details: [{ label: "Services", value: "Email API, Batch sending, Webhooks" }, { label: "Use cases", value: "Email campaigns, transactional emails, retailer reactivation, onboarding sequences" }, { label: "Tables", value: "email_templates, email_logs, scheduled_emails, campaigns" }] },
  { id: "int-supabase", name: "Supabase", category: "Infrastructure", description: "Core backend infrastructure — PostgreSQL database, Row Level Security, Edge Functions, Realtime subscriptions, and file storage. Powers every space and every feature in the portal.", spaces: ["All spaces"], status: "active", details: [{ label: "Services", value: "PostgreSQL, Auth, Storage, Edge Functions, Realtime" }, { label: "Database", value: "90+ tables across public + usdrop schemas" }, { label: "Storage", value: "Images, documents, exports via Supabase Storage buckets" }] },
  { id: "int-faire", name: "Faire API", category: "Marketplace", description: "Faire External API v2 for order management, product catalog sync, retailer data, and shipment tracking across 6 Faire stores.", spaces: ["Operations"], status: "active", details: [{ label: "Services", value: "Orders, Products, Retailers, Shipments, Inventory" }, { label: "Stores", value: "Buddha Ayurveda, Buddha Yoga, Gullee Gadgets, Holiday Farm, Super Santa, Toyarina" }] },
  { id: "int-wise", name: "Wise", category: "Finance", description: "International payment processing and multi-currency accounts. Used for receiving Faire payouts, sending vendor payments, and financial reconciliation.", spaces: ["Operations", "HQ"], status: "active", details: [{ label: "Services", value: "Multi-currency accounts, Transfers, Statements" }, { label: "Use cases", value: "Payout tracking, vendor payments, P&L reconciliation" }] },
  { id: "int-17track", name: "17Track", category: "Logistics", description: "Universal shipment tracking across 1,500+ carriers. Polls tracking updates and writes delivery status back to order records.", spaces: ["Operations"], status: "active", details: [{ label: "Services", value: "Track API, Carrier detection, Status webhooks" }, { label: "Carriers", value: "USPS, FedEx, DHL, UPS, and 1500+ global carriers" }] },
  { id: "int-gemini", name: "Google Gemini AI", category: "AI", description: "AI content generation for product descriptions, listing optimization, and intelligent auto-reconciliation of financial transactions.", spaces: ["Operations", "ETS", "USDrop"], status: "active", details: [{ label: "Services", value: "Gemini Pro, Content generation, Analysis" }, { label: "Use cases", value: "Product descriptions, title optimization, transaction matching" }] },
  { id: "int-vercel", name: "Vercel", category: "Infrastructure", description: "Hosting and deployment platform for all Next.js applications. Provides edge functions, cron jobs, preview deployments, and production CI/CD.", spaces: ["All spaces"], status: "active", details: [{ label: "Services", value: "Hosting, Edge Functions, Cron, Preview deploys" }, { label: "Projects", value: "faire-ops, usdrop-client, usdrop-landing, ets-client, and more" }] },
  { id: "int-google-oauth", name: "Google OAuth 2.0", category: "Auth", description: "Authentication provider for portal login and Gmail integration. Handles user sign-in, token refresh, and Gmail API access scopes.", spaces: ["All spaces"], status: "active", details: [{ label: "Services", value: "OAuth 2.0, Gmail API scopes, Calendar API scopes" }, { label: "Use cases", value: "User authentication, Gmail integration, Calendar sync" }] },
  { id: "int-razorpay", name: "Razorpay", category: "Payments", description: "Payment gateway for Indian operations — UPI, cards, netbanking, wallets, and auto-recurring. Powers client invoicing for LegalNations, booking payments for GoyoTours, and B2B order collection for Bhagwati.", spaces: ["LegalNations", "GoyoTours", "Bhagwati", "ETS", "HQ"], status: "planned", details: [{ label: "Services", value: "Payment Gateway, Razorpay X (payouts), Payment Links, Subscriptions, Route (split payments)" }, { label: "Use cases", value: "Client retainers, booking deposits, B2B invoicing, vendor payouts, salary disbursement" }, { label: "Modes", value: "UPI, Credit/Debit Cards, Netbanking, Wallets, EMI, International cards" }] },
  { id: "int-shiprocket", name: "Shiprocket", category: "Logistics", description: "Indian shipping aggregator for domestic order fulfillment. Auto-selects cheapest courier, generates AWB labels, and pushes tracking updates back to order records.", spaces: ["Operations", "Bhagwati", "USDrop"], status: "planned", details: [{ label: "Services", value: "Multi-courier aggregation, NDR management, COD reconciliation, Warehouse management" }, { label: "Carriers", value: "Delhivery, BlueDart, Ecom Express, DTDC, Shadowfax, and 25+ carriers" }, { label: "Use cases", value: "Domestic B2B shipments, Bhagwati order dispatch, return management" }] },
  { id: "int-cloudinary", name: "Cloudinary", category: "Media", description: "Image and video management platform. Handles product image optimization, headshot transformations, document thumbnails, and responsive delivery across all portals.", spaces: ["Operations", "USDrop", "Bhagwati", "HQ"], status: "planned", details: [{ label: "Services", value: "Image CDN, Auto-optimization, Transformations, AI background removal" }, { label: "Use cases", value: "Product listing images, employee headshots, document previews, WhatsApp template assets" }, { label: "Formats", value: "WebP/AVIF auto-format, responsive srcsets, lazy loading" }] },
  { id: "int-sentry", name: "Sentry", category: "Observability", description: "Application error monitoring and performance tracking. Captures frontend and backend exceptions, traces slow transactions, and alerts on regressions across all deployed applications.", spaces: ["All spaces"], status: "planned", details: [{ label: "Services", value: "Error tracking, Performance monitoring, Session replay, Release tracking" }, { label: "Use cases", value: "Production error alerts, deploy health checks, user session debugging" }, { label: "SDKs", value: "Next.js (frontend + API routes), Node.js (Edge Functions)" }] },
  { id: "int-ga4", name: "Google Analytics 4", category: "Analytics", description: "Web analytics across all public-facing properties — landing pages, client portals, and storefronts. Tracks user acquisition, engagement funnels, and conversion events.", spaces: ["USDrop", "GoyoTours", "LegalNations", "Bhagwati", "HQ"], status: "planned", details: [{ label: "Services", value: "GA4 Events, Conversion tracking, Audiences, BigQuery export" }, { label: "Use cases", value: "Landing page performance, client portal engagement, funnel analysis, ad attribution" }, { label: "Properties", value: "One per client-facing domain — usdrop, goyotours, legalnations, bhagwati, lxsh.ai" }] },
  { id: "int-tally", name: "Tally Prime", category: "Finance", description: "Indian accounting and GST compliance system. Syncs invoices, manages GST filings, and reconciles bank statements for all India-entity operations.", spaces: ["HQ", "Bhagwati", "ETS"], status: "planned", details: [{ label: "Services", value: "GST filing, Ledger sync, Invoice generation, TDS/TCS management" }, { label: "Use cases", value: "Monthly GST returns, vendor bill booking, P&L by vertical, bank reconciliation" }, { label: "Integration path", value: "Tally Connect API or CSV push/pull via Edge Function" }] },
  { id: "int-meta-whatsapp", name: "WhatsApp Cloud API", category: "Communication", description: "Direct Meta Business API for WhatsApp — richer than Twilio relay. Supports catalog messages, interactive lists, flows, and template management with higher throughput and lower per-message cost.", spaces: ["Operations", "GoyoTours", "LegalNations", "Bhagwati"], status: "planned", details: [{ label: "Services", value: "Cloud API, Message templates, Interactive messages, Catalog sharing, Flows" }, { label: "Use cases", value: "Booking confirmations, invoice sharing, product catalogs, appointment reminders, bulk campaigns" }, { label: "Advantage over Twilio", value: "Lower cost per message, native catalog cards, WhatsApp Flows for forms" }] },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function toggleNode(nodes: TaskNode[], id: string): TaskNode[] {
  return nodes.map((n) => {
    if (n.id === id) return { ...n, done: !n.done }
    if (n.children) return { ...n, children: toggleNode(n.children, id) }
    return n
  })
}

function deleteNode(nodes: TaskNode[], id: string): TaskNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => {
      if (n.children) return { ...n, children: deleteNode(n.children, id) }
      return n
    })
}

function addChild(nodes: TaskNode[], parentId: string, child: TaskNode): TaskNode[] {
  return nodes.map((n) => {
    if (n.id === parentId) {
      return { ...n, children: [...(n.children ?? []), child] }
    }
    if (n.children) return { ...n, children: addChild(n.children, parentId, child) }
    return n
  })
}

function countAll(nodes: TaskNode[]): { total: number; done: number } {
  let total = 0
  let done = 0
  for (const n of nodes) {
    if (!n.children || n.children.length === 0) {
      total++
      if (n.done) done++
    } else {
      const sub = countAll(n.children)
      total += sub.total
      done += sub.done
    }
  }
  return { total, done }
}

function collectExpandIds(nodes: TaskNode[]): Set<string> {
  const ids = new Set<string>()
  function walk(ns: TaskNode[]) {
    for (const n of ns) {
      if (n.children && n.children.length > 0) {
        ids.add(n.id)
        walk(n.children)
      }
    }
  }
  walk(nodes)
  return ids
}

/* ------------------------------------------------------------------ */
/*  localStorage helpers                                               */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "suprans-tasks-v1"

function loadState(): Record<string, TaskNode[]> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveState(trees: Record<string, TaskNode[]>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trees))
  } catch { /* quota exceeded — ignore */ }
}

/* ------------------------------------------------------------------ */
/*  Bug category helpers                                               */
/* ------------------------------------------------------------------ */

const BUG_CATEGORIES = [
  { key: "ui", label: "UI", color: "bg-pink-100 text-pink-700" },
  { key: "data", label: "Data", color: "bg-amber-100 text-amber-700" },
  { key: "api", label: "API", color: "bg-blue-100 text-blue-700" },
  { key: "performance", label: "Performance", color: "bg-orange-100 text-orange-700" },
  { key: "auth", label: "Auth", color: "bg-red-100 text-red-700" },
  { key: "deployment", label: "Deployment", color: "bg-purple-100 text-purple-700" },
  { key: "integration", label: "Integration", color: "bg-teal-100 text-teal-700" },
  { key: "other", label: "Other", color: "bg-slate-100 text-slate-700" },
]

const PLUGIN_STATUS_COLORS: Record<string, string> = {
  planned: "bg-slate-100 text-slate-600",
  built: "bg-blue-100 text-blue-700",
  stable: "bg-emerald-100 text-emerald-700",
}

function getCategoryColor(cat?: string): string {
  if (cat && PLUGIN_STATUS_COLORS[cat]) return PLUGIN_STATUS_COLORS[cat]
  return BUG_CATEGORIES.find((c) => c.key === cat)?.color ?? "bg-slate-100 text-slate-600"
}

/* ------------------------------------------------------------------ */
/*  Inline add input                                                   */
/* ------------------------------------------------------------------ */

function InlineAdd({ onAdd, onCancel, placeholder, showCategory }: { onAdd: (label: string, category?: string) => void; onCancel: () => void; placeholder?: string; showCategory?: boolean }) {
  const ref = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState("")
  const [category, setCategory] = useState("")

  return (
    <div className="flex items-center gap-2 mt-1">
      <input
        ref={ref}
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) {
            onAdd(value.trim(), category || undefined)
            setValue("")
            setCategory("")
          }
          if (e.key === "Escape") onCancel()
        }}
        placeholder={placeholder ?? "New item..."}
        className="flex-1 h-8 px-2.5 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring font-heading"
      />
      {showCategory && (
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-8 px-2 text-xs bg-background border border-input rounded-md"
        >
          <option value="">Category</option>
          {BUG_CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>
      )}
      <button
        type="button"
        onClick={() => { if (value.trim()) { onAdd(value.trim(), category || undefined); setValue(""); setCategory("") } }}
        className="h-8 px-3 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Add
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="h-8 px-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Cancel
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tree row                                                           */
/* ------------------------------------------------------------------ */

function TaskRow({
  node,
  depth,
  expanded,
  onToggleExpand,
  onToggleDone,
  onDelete,
  onAddChild,
  onOpenDetail,
  isBugTab,
}: {
  node: TaskNode
  depth: number
  expanded: Set<string>
  onToggleExpand: (id: string) => void
  onToggleDone: (id: string) => void
  onDelete: (id: string) => void
  onAddChild: (parentId: string, label: string, category?: string) => void
  onOpenDetail: (node: TaskNode) => void
  isBugTab?: boolean
}) {
  const hasChildren = node.children && node.children.length > 0
  const isExpanded = expanded.has(node.id)
  const isLeaf = !hasChildren

  const childStats = hasChildren ? countAll(node.children!) : null
  const allChildrenDone = childStats ? childStats.done === childStats.total : false
  const isGroupDone = hasChildren ? allChildrenDone : node.done

  const [showAdd, setShowAdd] = useState(false)

  return (
    <div>
      <div
        className="group flex items-center gap-1.5 py-1 pr-2 rounded-md hover:bg-muted/50 transition-colors"
        style={{ paddingLeft: `${depth * 20 + 4}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggleExpand(node.id)}
            className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 font-mono text-sm font-bold select-none"
          >
            {isExpanded ? "\u2212" : "+"}
          </button>
        ) : (
          <span className="w-6 shrink-0" />
        )}

        <button
          type="button"
          onClick={() => { if (isLeaf) onToggleDone(node.id) }}
          className={`h-5 w-5 flex items-center justify-center shrink-0 transition-colors ${
            isLeaf ? "cursor-pointer hover:text-primary" : "cursor-default"
          } ${isGroupDone ? "text-emerald-600" : "text-muted-foreground/60"}`}
        >
          {isGroupDone ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
        </button>

        {isLeaf ? (
          <button
            type="button"
            onClick={() => onOpenDetail(node)}
            title="Open details"
            className={`ml-1.5 text-sm text-left select-none leading-snug cursor-pointer hover:text-primary hover:underline decoration-dotted underline-offset-4 transition-colors ${
              isGroupDone ? "line-through text-muted-foreground" : "text-foreground"
            }`}
          >
            {node.label}
          </button>
        ) : (
          <span
            className={`ml-1.5 text-sm select-none leading-snug ${
              isGroupDone
                ? "line-through text-muted-foreground"
                : "font-semibold text-foreground"
            }`}
          >
            {node.label}
          </span>
        )}

        {node.category && isLeaf && (
          <span className={`ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded capitalize ${getCategoryColor(node.category)}`}>
            {BUG_CATEGORIES.find((c) => c.key === node.category)?.label ?? node.category}
          </span>
        )}

        {isLeaf && node.createdAt && (
          <span className="text-xs tabular-nums text-muted-foreground/50 shrink-0 ml-2">
            {new Date(node.createdAt + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </span>
        )}

        {childStats && (
          <span className="ml-2 text-xs tabular-nums text-muted-foreground shrink-0">
            {childStats.done}/{childStats.total}
          </span>
        )}

        <span className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            title="Add sub-item"
            className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(node.id)}
            title="Delete"
            className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <TaskRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggleExpand={onToggleExpand}
              onToggleDone={onToggleDone}
              onDelete={onDelete}
              onAddChild={onAddChild}
              onOpenDetail={onOpenDetail}
              isBugTab={isBugTab}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <div style={{ paddingLeft: `${(depth + 1) * 20 + 4}px` }}>
          <InlineAdd
            placeholder={isBugTab ? "Describe the bug..." : undefined}
            showCategory={isBugTab}
            onAdd={(label, category) => {
              onAddChild(node.id, label, category)
              setShowAdd(false)
            }}
            onCancel={() => setShowAdd(false)}
          />
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Small modal for agents/skills/integrations                         */
/* ------------------------------------------------------------------ */

function SmallModal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-background border border-border rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted transition-colors">
            <X className="size-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab config                                                         */
/* ------------------------------------------------------------------ */

const TABS: { key: TabKey; label: string; icon: typeof ListTodo; description: string; addLabel: string; isTree: boolean }[] = [
  { key: "tasks", label: "Tasks", icon: ListTodo, description: "Daily tasks and action items", addLabel: "Add group", isTree: true },
  { key: "ideas", label: "Ideas & Future Scope", icon: Lightbulb, description: "Feature ideas, future scope, and wish list", addLabel: "Add idea group", isTree: true },
  { key: "bugs", label: "Bugs", icon: Bug, description: "Track bugs, group by category, resolve", addLabel: "Add bug group", isTree: true },
  { key: "plugins", label: "Plugins", icon: Puzzle, description: "Right-dock plugins — planned, built, stable", addLabel: "Add plugin group", isTree: true },
  { key: "agents", label: "Agents & Skills", icon: Bot, description: "Claude Code skills, agents, and AI employees", addLabel: "", isTree: false },
  { key: "integrations", label: "Integrations", icon: Plug, description: "External services connected across spaces", addLabel: "", isTree: false },
  { key: "external-projects", label: "External Projects", icon: FolderKanban, description: "Incoming GitHub repos — landing pages, client portals, admin spaces", addLabel: "", isTree: false },
]

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function TasksPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("tasks")

  const [tasksTree, setTasksTree] = useState<TaskNode[]>(() => loadState()?.tasks ?? makeTasksTree())
  const [ideasTree, setIdeasTree] = useState<TaskNode[]>(() => loadState()?.ideas ?? makeIdeasTree())
  const [bugsTree, setBugsTree] = useState<TaskNode[]>(() => loadState()?.bugs ?? makeBugsTree())
  const [pluginsTree, setPluginsTree] = useState<TaskNode[]>(() => loadState()?.plugins ?? makePluginsTree())

  const [tasksExpanded, setTasksExpanded] = useState<Set<string>>(() => collectExpandIds(tasksTree))
  const [ideasExpanded, setIdeasExpanded] = useState<Set<string>>(() => collectExpandIds(ideasTree))
  const [bugsExpanded, setBugsExpanded] = useState<Set<string>>(() => collectExpandIds(bugsTree))
  const [pluginsExpanded, setPluginsExpanded] = useState<Set<string>>(() => collectExpandIds(pluginsTree))

  // Persist tree state to localStorage
  useEffect(() => {
    saveState({ tasks: tasksTree, ideas: ideasTree, bugs: bugsTree, plugins: pluginsTree })
  }, [tasksTree, ideasTree, bugsTree, pluginsTree])

  // Modal state for catalog tabs
  const [modalItem, setModalItem] = useState<CatalogItem | IntegrationItem | null>(null)
  // Modal state for tree-tab leaf details
  const [detailNode, setDetailNode] = useState<TaskNode | null>(null)

  const treeMap: Record<string, TaskNode[]> = { tasks: tasksTree, ideas: ideasTree, bugs: bugsTree, plugins: pluginsTree }
  const setTreeMap: Record<string, React.Dispatch<React.SetStateAction<TaskNode[]>>> = { tasks: setTasksTree, ideas: setIdeasTree, bugs: setBugsTree, plugins: setPluginsTree }
  const expandedMap: Record<string, Set<string>> = { tasks: tasksExpanded, ideas: ideasExpanded, bugs: bugsExpanded, plugins: pluginsExpanded }
  const setExpandedMap: Record<string, React.Dispatch<React.SetStateAction<Set<string>>>> = { tasks: setTasksExpanded, ideas: setIdeasExpanded, bugs: setBugsExpanded, plugins: setPluginsExpanded }

  const tree = treeMap[activeTab] ?? []
  const setTree = setTreeMap[activeTab]
  const expanded = expandedMap[activeTab] ?? new Set<string>()
  const setExpanded = setExpandedMap[activeTab]

  const [showRootAdd, setShowRootAdd] = useState(false)

  const toggleExpand = useCallback((id: string) => {
    setExpanded?.((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [setExpanded])

  const toggleDone = useCallback((id: string) => {
    setTree?.((prev) => toggleNode(prev, id))
  }, [setTree])

  const handleDelete = useCallback((id: string) => {
    setTree?.((prev) => deleteNode(prev, id))
  }, [setTree])

  const handleAddChild = useCallback((parentId: string, label: string, category?: string) => {
    const child: TaskNode = { id: uid(), label, done: false, createdAt: new Date().toISOString().slice(0, 10), category }
    setTree?.((prev) => addChild(prev, parentId, child))
    setExpanded?.((prev) => new Set(prev).add(parentId))
  }, [setTree, setExpanded])

  const handleAddRoot = useCallback((label: string, category?: string) => {
    const node: TaskNode = { id: uid(), label, done: false, createdAt: new Date().toISOString().slice(0, 10), category }
    setTree?.((prev) => [...prev, node])
  }, [setTree])

  const expandAll = useCallback(() => {
    setExpanded?.(collectExpandIds(tree))
  }, [tree, setExpanded])

  const collapseAll = useCallback(() => {
    setExpanded?.(new Set())
  }, [setExpanded])

  const stats = countAll(tree)
  const tabConfig = TABS.find((t) => t.key === activeTab)!
  const isBugTab = activeTab === "bugs"
  const isTreeTab = tabConfig.isTree

  // Group agents/skills by category
  const agentCategories = Array.from(new Set(AGENTS_SKILLS.map((a) => a.category)))

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/80">
        <div className="max-w-[1440px] mx-auto w-full px-6 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold font-heading text-foreground">{tabConfig.label}</h1>
              <p className="text-xs font-medium text-muted-foreground tabular-nums">
                {isTreeTab && stats.total > 0 ? `${stats.done} of ${stats.total} done` : tabConfig.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isTreeTab && (
              <>
                <button
                  type="button"
                  onClick={() => setShowRootAdd(true)}
                  className="inline-flex items-center gap-1.5 h-8 px-3 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  {tabConfig.addLabel}
                </button>
                <button
                  type="button"
                  onClick={expandAll}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md hover:bg-muted transition-colors"
                >
                  Expand all
                </button>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md hover:bg-muted transition-colors"
                >
                  Collapse all
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="max-w-[1440px] mx-auto w-full px-6 md:px-8">
          <div className="flex border-b border-border -mb-px overflow-x-auto">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key
              const tabTree = treeMap[tab.key]
              const tabStats = tabTree ? countAll(tabTree) : null
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setShowRootAdd(false) }}
                  className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  <Icon className="size-3.5" />
                  {tab.label}
                  {tabStats && tabStats.total > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {tabStats.done}/{tabStats.total}
                    </span>
                  )}
                  {tab.key === "agents" && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {AGENTS_SKILLS.length}
                    </span>
                  )}
                  {tab.key === "integrations" && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {EXTERNAL_INTEGRATIONS.length}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Tree tabs ── */}
      {isTreeTab && (
        <>
          {/* progress bar */}
          {stats.total > 0 && (
            <div className="max-w-[1440px] mx-auto w-full px-6 md:px-8 pt-5">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${stats.total > 0 ? (stats.done / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* add root at top */}
          {showRootAdd && (
            <div className="max-w-[1440px] mx-auto w-full px-6 md:px-8 pt-5">
              <InlineAdd
                placeholder={isBugTab ? "Bug group name..." : activeTab === "ideas" ? "Idea group name..." : "Group name..."}
                showCategory={false}
                onAdd={(label) => {
                  handleAddRoot(label)
                  setShowRootAdd(false)
                }}
                onCancel={() => setShowRootAdd(false)}
              />
            </div>
          )}

          {/* tree */}
          <div className="max-w-[1440px] mx-auto w-full px-6 md:px-8 py-5 space-y-0.5">
            {tree.length === 0 && !showRootAdd && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                  <tabConfig.icon className="size-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold text-foreground">No {tabConfig.label.toLowerCase()} yet</p>
                <p className="text-xs text-muted-foreground mt-1">{tabConfig.description}</p>
                <button
                  type="button"
                  onClick={() => setShowRootAdd(true)}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 px-3 py-1.5 rounded-md hover:bg-primary/5 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  {tabConfig.addLabel}
                </button>
              </div>
            )}

            {tree.map((node) => (
              <TaskRow
                key={node.id}
                node={node}
                depth={0}
                expanded={expanded}
                onToggleExpand={toggleExpand}
                onToggleDone={toggleDone}
                onDelete={handleDelete}
                onAddChild={handleAddChild}
                onOpenDetail={setDetailNode}
                isBugTab={isBugTab}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Agents & Skills tab ── */}
      {activeTab === "agents" && (
        <div className="max-w-[1440px] mx-auto w-full px-6 md:px-8 py-5 space-y-6">
          {agentCategories.map((cat) => {
            const items = AGENTS_SKILLS.filter((a) => a.category === cat)
            return (
              <div key={cat}>
                <h3 className="text-sm font-semibold text-foreground mb-3">{cat}</h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setModalItem(item)}
                      className="rounded-lg border border-border/80 bg-card p-3.5 cursor-pointer hover:border-primary/40 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold truncate">{item.name}</span>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 shrink-0 ml-2">Active</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── External Integrations tab ── */}
      {activeTab === "integrations" && (
        <div className="max-w-[1440px] mx-auto w-full px-6 md:px-8 py-5 space-y-6">
          {Array.from(new Set(EXTERNAL_INTEGRATIONS.map((i) => i.category))).map((cat) => {
            const items = EXTERNAL_INTEGRATIONS.filter((i) => i.category === cat)
            return (
              <div key={cat}>
                <h3 className="text-sm font-semibold text-foreground mb-3">{cat}</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setModalItem(item)}
                      className="rounded-lg border border-border/80 bg-card p-4 cursor-pointer hover:border-primary/40 hover:shadow-md transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{item.name}</span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ml-2 ${item.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                          {item.status === "active" ? "Active" : "Planned"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {item.spaces.map((sp) => (
                          <span key={sp} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{sp}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── External Projects tab (Supabase-backed) ── */}
      {activeTab === "external-projects" && <ExternalProjectsTab />}

      {/* ── Detail modal ── */}
      {modalItem && (
        <SmallModal title={modalItem.name} onClose={() => setModalItem(null)}>
          <div className="space-y-3">
            <p className="text-sm leading-relaxed">{modalItem.description}</p>
            {"spaces" in modalItem && (
              <div>
                <span className="text-xs font-medium text-muted-foreground">Spaces:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(modalItem as IntegrationItem).spaces.map((sp) => (
                    <span key={sp} className="text-xs bg-muted px-2 py-0.5 rounded">{sp}</span>
                  ))}
                </div>
              </div>
            )}
            {modalItem.details.map((d) => (
              <div key={d.label}>
                <span className="text-xs font-medium text-muted-foreground">{d.label}</span>
                <p className="text-sm mt-0.5">{d.value}</p>
              </div>
            ))}
          </div>
        </SmallModal>
      )}

      {/* ── Leaf detail modal for tree tabs ── */}
      {detailNode && isTreeTab && (
        <TaskDetailModal
          title={detailNode.label}
          tab={activeTab as "tasks" | "ideas" | "bugs" | "plugins"}
          detail={getTaskDetail(detailNode.id)}
          onClose={() => setDetailNode(null)}
        />
      )}
    </div>
  )
}
