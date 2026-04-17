"use client"

import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import Link from "next/link"
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Wallet,
  Blocks,
  Target,
  ChevronDown,
  Layers,
  Check,
  Truck,
  FolderKanban,
  ShieldCheck,
  ListTodo,
  Rocket,
  Map as MapIcon,
  Megaphone,
  Globe,
  Briefcase,
  UserPlus,
  Plane,
  Hotel,
  Compass,
  FileText,
  CreditCard,
  ArrowUpFromLine,
  UserCircle,
  CheckCircle2,
  FolderOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useBrandFilter } from "@/lib/brand-filter-context"
import { supabaseB2B } from "@/lib/supabase"
import { useRef } from "react"
import { useActiveSpace } from "@/lib/use-active-space"

interface SubItem {
  title: string
  url: string
  countKey?: string // key for notification count
}

interface NavItem {
  title: string
  url: string
  icon: React.ElementType
  subItems?: SubItem[]
  centralOnly?: boolean
  countKey?: string
}

// ============================================================================
// Per-space top navigation. The nav switches based on which Space the user
// is currently inside (resolved via `getActiveSpaceSlug(pathname)`). The
// `b2b-ecommerce` space has the full Faire portal nav. Other spaces start
// with a small placeholder nav until they are built out.
// ============================================================================

// HQ top nav — 8 sections per suprans-hq-full-spec.md. Calls QA is
// served from the right-dock (`calls-qa` plugin) so it's no longer in
// the top menu. See SPACE_PATTERN.md §6.
const PLACEHOLDER_HQ: NavItem[] = [
  {
    title: "Overview", url: "/hq/overview", icon: LayoutDashboard,
    subItems: [
      { title: "Command", url: "/hq/overview" },
      { title: "P&L Summary", url: "/hq/overview/p-and-l" },
      { title: "Headcount", url: "/hq/overview/headcount" },
      { title: "Alerts", url: "/hq/overview/alerts" },
    ],
  },
  {
    title: "People", url: "/hq/people/directory", icon: Users,
    subItems: [
      { title: "Directory", url: "/hq/people/directory" },
      { title: "Attendance", url: "/hq/people/attendance" },
      { title: "Leave", url: "/hq/people/leave" },
      { title: "Payroll", url: "/hq/people/payroll" },
      { title: "Performance", url: "/hq/people/performance" },
      { title: "Org Chart", url: "/hq/people/org-chart" },
      { title: "Departments", url: "/hq/people/departments" },
      { title: "Policies", url: "/hq/people/policies" },
    ],
  },
  {
    title: "Hiring", url: "/hq/hiring", icon: UserPlus,
    subItems: [
      { title: "Dashboard", url: "/hq/hiring" },
      { title: "Roles", url: "/hq/hiring/roles" },
      { title: "Candidates", url: "/hq/hiring/candidates" },
      { title: "Pipeline", url: "/hq/hiring/pipeline" },
      { title: "Interviews", url: "/hq/hiring/interviews" },
      { title: "Offers", url: "/hq/hiring/offers" },
      { title: "Platforms", url: "/hq/hiring/platforms" },
      { title: "Job posts", url: "/hq/hiring/posts" },
      { title: "Daily reports", url: "/hq/hiring/daily" },
    ],
  },
  {
    title: "Finance", url: "/hq/finance/revenue", icon: Wallet,
    subItems: [
      { title: "Revenue", url: "/hq/finance/revenue" },
      { title: "Expenses", url: "/hq/finance/expenses" },
      { title: "Entities", url: "/hq/finance/entities" },
      { title: "Transactions", url: "/hq/finance/transactions" },
      { title: "Reconciliation", url: "/hq/finance/reconciliation" },
    ],
  },
  {
    title: "Razorpay", url: "/hq/razorpay/overview", icon: CreditCard,
    subItems: [
      { title: "Overview", url: "/hq/razorpay/overview" },
      { title: "Payments", url: "/hq/razorpay/all" },
      { title: "Payment Links", url: "/hq/razorpay/links" },
      { title: "Invoices", url: "/hq/razorpay/invoices" },
      { title: "Refunds", url: "/hq/razorpay/refunds" },
      { title: "Settlements", url: "/hq/razorpay/settlements" },
      { title: "Subscriptions", url: "/hq/razorpay/subscriptions" },
      { title: "Disputes", url: "/hq/razorpay/disputes" },
      { title: "Settings", url: "/hq/razorpay/settings" },
    ],
  },
  {
    title: "Razorpay X", url: "/hq/razorpay-x/payouts", icon: ArrowUpFromLine,
    subItems: [
      { title: "Payouts", url: "/hq/razorpay-x/payouts" },
      { title: "Contacts", url: "/hq/razorpay-x/contacts" },
      { title: "Transactions", url: "/hq/razorpay-x/transactions" },
    ],
  },
  {
    title: "Projects", url: "/hq/projects/overview", icon: Blocks,
    subItems: [
      { title: "Active Projects", url: "/hq/projects/overview" },
      { title: "OKRs", url: "/hq/projects/okrs" },
      { title: "Roadmap", url: "/hq/projects/roadmap" },
    ],
  },
  {
    title: "Assets", url: "/hq/assets/devices", icon: Briefcase,
    subItems: [
      { title: "Devices", url: "/hq/assets/devices" },
      { title: "Licenses", url: "/hq/assets/licenses" },
      { title: "Vendor Contracts", url: "/hq/assets/contracts" },
      { title: "Office Inventory", url: "/hq/assets/inventory" },
    ],
  },
  {
    title: "Social", url: "/hq/social/overview", icon: Megaphone,
    subItems: [
      { title: "Dashboard", url: "/hq/social/overview" },
      { title: "Connected Accounts", url: "/hq/social/accounts" },
      { title: "Content Calendar", url: "/hq/social/calendar" },
      { title: "Posts", url: "/hq/social/posts" },
      { title: "Approval Queue", url: "/hq/social/approvals" },
      { title: "Analytics", url: "/hq/social/analytics" },
    ],
  },
  {
    title: "Sites", url: "/hq/sites/overview", icon: Globe,
    subItems: [
      { title: "Sites Overview", url: "/hq/sites/overview" },
      { title: "Traffic Analytics", url: "/hq/sites/traffic" },
      { title: "Leads", url: "/hq/sites/leads" },
      { title: "SEO Monitoring", url: "/hq/sites/seo" },
      { title: "Content", url: "/hq/sites/content" },
      { title: "Uptime", url: "/hq/sites/uptime" },
    ],
  },
  {
    title: "Compliance", url: "/hq/compliance/overview", icon: Target,
    subItems: [
      { title: "Overview", url: "/hq/compliance/overview" },
      { title: "Entity Registry", url: "/hq/compliance/entities" },
      { title: "Filings", url: "/hq/compliance/filings" },
      { title: "Contracts", url: "/hq/compliance/contracts" },
      { title: "Legal Cases", url: "/hq/compliance/legal-cases" },
    ],
  },
]

const PLACEHOLDER_LEGAL: NavItem[] = [
  {
    title: "Dashboard", url: "/legal/dashboard", icon: LayoutDashboard,
    subItems: [
      { title: "Overview", url: "/legal/dashboard" },
    ],
  },
  {
    title: "Clients", url: "/legal/clients", icon: UserCircle,
    subItems: [
      { title: "All clients",  url: "/legal/clients" },
      { title: "Healthy",      url: "/legal/clients/active" },
      { title: "Onboarding",   url: "/legal/clients/onboarding" },
      { title: "Pipeline",     url: "/legal/clients/pipeline" },
    ],
  },
  {
    title: "Onboarding", url: "/legal/onboarding", icon: CheckCircle2,
    subItems: [
      { title: "All steps",  url: "/legal/onboarding" },
      { title: "By phase",   url: "/legal/onboarding/by-phase" },
    ],
  },
  {
    title: "Tax Filings", url: "/legal/tax-filings", icon: FileText,
    subItems: [
      { title: "All filings",  url: "/legal/tax-filings" },
      { title: "By stage",     url: "/legal/tax-filings/by-stage" },
    ],
  },
  {
    title: "Compliance", url: "/legal/compliance", icon: Target,
    subItems: [
      { title: "Calendar",  url: "/legal/compliance" },
      { title: "List",      url: "/legal/compliance/list" },
    ],
  },
  {
    title: "Documents", url: "/legal/documents", icon: FolderOpen,
    subItems: [
      { title: "All",  url: "/legal/documents" },
    ],
  },
  {
    title: "Payments", url: "/legal/payments", icon: CreditCard,
    subItems: [
      { title: "Ledger",     url: "/legal/payments" },
      { title: "By client",  url: "/legal/payments/by-client" },
    ],
  },
]

const PLACEHOLDER_GOYO: NavItem[] = [
  {
    title: "Dashboard", url: "/goyo/dashboard", icon: LayoutDashboard,
    subItems: [
      { title: "Overview", url: "/goyo/dashboard" },
      { title: "Activity", url: "/goyo/dashboard/activity" },
    ],
  },
  {
    title: "Bookings", url: "/goyo/bookings", icon: ShoppingCart,
    subItems: [
      { title: "All",         url: "/goyo/bookings" },
      { title: "Upcoming",    url: "/goyo/bookings/upcoming" },
      { title: "In progress", url: "/goyo/bookings/in-progress" },
      { title: "Completed",   url: "/goyo/bookings/completed" },
    ],
  },
  {
    title: "Clients", url: "/goyo/clients", icon: UserCircle,
    subItems: [
      { title: "All",    url: "/goyo/clients" },
      { title: "Active", url: "/goyo/clients/active" },
      { title: "Repeat", url: "/goyo/clients/repeat" },
    ],
  },
  {
    title: "Tours", url: "/goyo/tours", icon: Compass,
    subItems: [
      { title: "Catalog", url: "/goyo/tours" },
      { title: "By type", url: "/goyo/tours/by-type" },
    ],
  },
  {
    title: "Visas", url: "/goyo/visas", icon: ShieldCheck,
    subItems: [
      { title: "All",         url: "/goyo/visas" },
      { title: "In progress", url: "/goyo/visas/in-progress" },
      { title: "Calendar",    url: "/goyo/visas/calendar" },
    ],
  },
  {
    title: "Travel", url: "/goyo/travel/flights", icon: Plane,
    subItems: [
      { title: "Flights",     url: "/goyo/travel/flights" },
      { title: "Hotels",      url: "/goyo/travel/hotels" },
      { title: "Itineraries", url: "/goyo/itineraries" },
    ],
  },
  {
    title: "Guides", url: "/goyo/guides", icon: Users,
    subItems: [
      { title: "All",     url: "/goyo/guides" },
      { title: "Active",  url: "/goyo/guides/active" },
      { title: "By city", url: "/goyo/guides/by-city" },
    ],
  },
  {
    title: "Finance", url: "/goyo/finance", icon: Wallet,
    subItems: [
      { title: "Overview",  url: "/goyo/finance" },
      { title: "Payments",  url: "/goyo/finance/payments" },
      { title: "Refunds",   url: "/goyo/finance/refunds" },
      { title: "By booking",url: "/goyo/finance/by-booking" },
    ],
  },
]

const PLACEHOLDER_USDROP: NavItem[] = [
  { title: "Overview", url: "/usdrop/overview", icon: LayoutDashboard },
  {
    title: "Catalog",
    url: "/usdrop/products",
    icon: Package,
    subItems: [
      { title: "Products", url: "/usdrop/products" },
      { title: "Categories", url: "/usdrop/categories" },
      { title: "Suppliers", url: "/usdrop/suppliers" },
      { title: "AI pipeline", url: "/usdrop/pipeline" },
    ],
  },
  {
    title: "Customers",
    url: "/usdrop/users",
    icon: Users,
    subItems: [
      { title: "Users", url: "/usdrop/users" },
      { title: "Shopify stores", url: "/usdrop/stores" },
      { title: "Tickets", url: "/usdrop/tickets" },
    ],
  },
  {
    title: "Operations",
    url: "/usdrop/orders",
    icon: ShoppingCart,
    subItems: [
      { title: "Orders", url: "/usdrop/orders" },
      { title: "Payouts", url: "/usdrop/payouts" },
    ],
  },
  {
    title: "Learning",
    url: "/usdrop/courses",
    icon: Blocks,
    subItems: [
      { title: "Courses", url: "/usdrop/courses" },
      { title: "Content", url: "/usdrop/content" },
      { title: "Roadmap", url: "/usdrop/roadmap" },
    ],
  },
  {
    title: "Comms",
    url: "/usdrop/email",
    icon: Target,
    subItems: [
      { title: "Email", url: "/usdrop/email" },
      { title: "SMS", url: "/usdrop/sms" },
    ],
  },
]

// Life AI — Mr. Suprans's personal operating system. 8 top items with deep
// subItems covering the 37 Supabase tables in life.*. Order mirrors the user's
// daily flow (Today → Goals → Journal → reflective/operational domains).
const PLACEHOLDER_LIFE: NavItem[] = [
  {
    title: "Today", url: "/life", icon: LayoutDashboard,
    subItems: [
      { title: "Capture", url: "/life" },
      { title: "Inbox",   url: "/life/inbox" },
    ],
  },
  {
    title: "Goals", url: "/life/goals", icon: Target,
    subItems: [
      { title: "Active goals", url: "/life/goals" },
      { title: "Vision", url: "/life/goals/vision" },
      { title: "Issues", url: "/life/issues" },
    ],
  },
  {
    title: "Journal", url: "/life/journal", icon: FileText,
    subItems: [
      { title: "Daily", url: "/life/journal" },
      { title: "Thoughts", url: "/life/journal/thoughts" },
      { title: "Decisions", url: "/life/journal/decisions" },
      { title: "Wins", url: "/life/journal/wins" },
      { title: "Letters", url: "/life/journal/letters" },
    ],
  },
  {
    title: "Finance", url: "/life/finance", icon: Wallet,
    subItems: [
      { title: "Net worth", url: "/life/finance/net-worth" },
      { title: "Transactions", url: "/life/finance/transactions" },
      { title: "Investments", url: "/life/finance/investments" },
      { title: "Insurance", url: "/life/finance/insurance" },
      { title: "Blocked money", url: "/life/finance/blocked" },
      { title: "EMIs", url: "/life/finance/emis" },
      { title: "Debtors", url: "/life/finance/debtors" },
      { title: "Creditors", url: "/life/finance/creditors" },
      { title: "Budgets", url: "/life/finance/budgets" },
    ],
  },
  {
    title: "Health", url: "/life/health", icon: ShieldCheck,
    subItems: [
      { title: "Fitness", url: "/life/health/fitness" },
      { title: "Sleep", url: "/life/health/sleep" },
      { title: "Medical", url: "/life/health/medical" },
      { title: "Supplements", url: "/life/health/supplements" },
      { title: "Doctors", url: "/life/health/doctors" },
      { title: "Mood", url: "/life/health/mood" },
      { title: "Meditation", url: "/life/health/meditation" },
      { title: "Gratitude", url: "/life/health/gratitude" },
    ],
  },
  {
    title: "Growth", url: "/life/growth", icon: Layers,
    subItems: [
      { title: "Books", url: "/life/growth/books" },
      { title: "Skills", url: "/life/growth/skills" },
      { title: "Captures", url: "/life/growth/captures" },
      { title: "Queue", url: "/life/growth/queue" },
      { title: "Courses", url: "/life/growth/courses" },
    ],
  },
  {
    title: "People", url: "/life/people", icon: Users,
    subItems: [
      { title: "Contacts", url: "/life/people" },
      { title: "Interactions", url: "/life/people/interactions" },
      { title: "Events", url: "/life/people/events" },
      { title: "Network", url: "/life/people/network" },
    ],
  },
  {
    title: "Plans", url: "/life/plans", icon: MapIcon,
    subItems: [
      { title: "Habits", url: "/life/plans/habits" },
      { title: "Routines", url: "/life/plans/routines" },
      { title: "Trips", url: "/life/plans/trips" },
      { title: "Projects", url: "/life/plans/projects" },
      { title: "Bucket list", url: "/life/plans/bucket-list" },
      { title: "Vehicles", url: "/life/plans/vehicles" },
      { title: "Documents", url: "/life/plans/documents" },
      { title: "Physical assets", url: "/life/plans/assets" },
    ],
  },
]

// ETS (EazyToSell) — Store Launch + Supply Partner platform. Top nav is
// organised around the superadmin's workflow: pre-deal (Sales) → goods we
// sell partners (Catalog) → getting goods there (Supply) → running stores
// (Stores) → our supply-side (Vendors) → money flows (Finance). Overview
// is the daily KPI landing.
const PLACEHOLDER_ETS: NavItem[] = [
  {
    title: "Overview",
    url: "/ets/overview",
    icon: LayoutDashboard,
  },
  {
    title: "Projects",
    url: "/ets/projects",
    icon: FolderKanban,
    subItems: [
      { title: "All projects", url: "/ets/projects" },
      { title: "Clients", url: "/ets/sales/clients" },
    ],
  },
  {
    title: "Sales",
    url: "/ets/sales/pipeline",
    icon: Target,
    subItems: [
      { title: "Pipeline", url: "/ets/sales/pipeline" },
      { title: "Clients", url: "/ets/sales/clients" },
      { title: "Proposals", url: "/ets/sales/proposals" },
      { title: "Calculator", url: "/ets/sales/calculator" },
      { title: "Milestones", url: "/ets/sales/milestones" },
      { title: "Activities", url: "/ets/sales/activities" },
    ],
  },
  {
    title: "Catalog",
    url: "/ets/catalog/products",
    icon: Package,
    subItems: [
      { title: "Products", url: "/ets/catalog/products" },
      { title: "Studio", url: "/ets/catalog/studio" },
      { title: "Categories", url: "/ets/catalog/categories" },
      { title: "Collections", url: "/ets/catalog/collections" },
      { title: "Pricing", url: "/ets/catalog/pricing" },
      { title: "Compliance", url: "/ets/catalog/compliance" },
      { title: "Images", url: "/ets/catalog/images" },
      { title: "Bulk upload", url: "/ets/catalog/bulk-upload" },
      { title: "Setup kit", url: "/ets/catalog/setup-kit" },
    ],
  },
  {
    title: "Supply",
    url: "/ets/supply/launches",
    icon: Truck,
    subItems: [
      { title: "Launches", url: "/ets/supply/launches" },
      { title: "China batches", url: "/ets/supply/china-batches" },
      { title: "Dispatch", url: "/ets/supply/dispatch" },
      { title: "Warehouse", url: "/ets/supply/warehouse" },
      { title: "Stock", url: "/ets/supply/stock" },
      { title: "QC", url: "/ets/supply/qc" },
      { title: "Fulfillment", url: "/ets/supply/fulfillment" },
    ],
  },
  {
    title: "Stores",
    url: "/ets/stores",
    icon: Blocks,
    subItems: [
      { title: "All stores", url: "/ets/stores" },
      { title: "Staff", url: "/ets/stores/staff" },
      { title: "BOQ", url: "/ets/stores/boq" },
      { title: "Documents", url: "/ets/stores/documents" },
    ],
  },
  {
    title: "Vendors",
    url: "/ets/vendors",
    icon: Users,
    subItems: [
      { title: "All vendors", url: "/ets/vendors" },
      { title: "Payouts", url: "/ets/vendors/payouts" },
    ],
  },
  {
    title: "Finance",
    url: "/ets/finance/payments",
    icon: Wallet,
    subItems: [
      { title: "Payments", url: "/ets/finance/payments" },
      { title: "Invoices", url: "/ets/finance/invoices" },
      { title: "Analytics", url: "/ets/finance/analytics" },
    ],
  },
]

const PLACEHOLDER_DEVELOPMENT: NavItem[] = [
  {
    title: "Overview", url: "/development", icon: LayoutDashboard,
    subItems: [
      { title: "Dashboard", url: "/development" },
      { title: "Ventures", url: "/development/ventures" },
      { title: "Health", url: "/development/health" },
    ],
  },
  {
    title: "Projects", url: "/development/projects", icon: FolderKanban,
    subItems: [
      { title: "All", url: "/development/projects" },
      { title: "Building", url: "/development/projects/building" },
      { title: "Live", url: "/development/projects/live" },
    ],
  },
  {
    title: "Deployments", url: "/development/deployments", icon: Rocket,
    subItems: [
      { title: "Feed", url: "/development/deployments" },
      { title: "By project", url: "/development/deployments/by-project" },
      { title: "Errors", url: "/development/deployments/errors" },
    ],
  },
  {
    title: "Roadmap", url: "/development/roadmap", icon: MapIcon,
    subItems: [
      { title: "Timeline", url: "/development/roadmap" },
      { title: "Changelog", url: "/development/roadmap/changelog" },
      { title: "By venture", url: "/development/roadmap/ventures" },
    ],
  },
  {
    title: "Tasks", url: "/development/tasks", icon: ListTodo,
    subItems: [
      { title: "List", url: "/development/tasks" },
      { title: "Kanban", url: "/development/tasks/kanban" },
      { title: "By assignee", url: "/development/tasks/assignee" },
    ],
  },
  {
    title: "Meta", url: "/development/registry", icon: Layers,
    subItems: [
      { title: "Registry", url: "/development/registry" },
      { title: "Checklists", url: "/development/checklists" },
      { title: "Domains", url: "/development/domains" },
      { title: "Integrations", url: "/development/integrations" },
      { title: "AI tools", url: "/development/ai-tools" },
      { title: "Automations", url: "/development/automations" },
      { title: "Design system", url: "/development/design-system" },
      { title: "Vault", url: "/development/vault" },
      { title: "Claude log", url: "/development/claude-log" },
    ],
  },
]

const PLACEHOLDER_JSBLUERIDGE: NavItem[] = [
  {
    title: "Overview", url: "/jsblueridge/overview", icon: LayoutDashboard,
    subItems: [
      { title: "Dashboard", url: "/jsblueridge/overview" },
      { title: "Analytics", url: "/jsblueridge/overview/analytics" },
      { title: "Reports", url: "/jsblueridge/overview/reports" },
    ],
  },
  {
    title: "Orders", url: "/jsblueridge/orders", icon: ShoppingCart,
    subItems: [
      { title: "All Orders", url: "/jsblueridge/orders/all" },
      { title: "Pending", url: "/jsblueridge/orders/pending" },
      { title: "Fulfillment", url: "/jsblueridge/orders/fulfillment" },
      { title: "Shipments", url: "/jsblueridge/orders/shipments" },
      { title: "Disputes", url: "/jsblueridge/orders/refunds" },
      { title: "Quotes", url: "/jsblueridge/orders/quotes" },
    ],
  },
  {
    title: "Products", url: "/jsblueridge/catalog", icon: Package,
    subItems: [
      { title: "Listings", url: "/jsblueridge/catalog/listings" },
      { title: "Collections", url: "/jsblueridge/catalog/collections" },
      { title: "Inventory", url: "/jsblueridge/catalog/inventory" },
      { title: "Pricing", url: "/jsblueridge/catalog/pricing" },
      { title: "Sourcing", url: "/jsblueridge/catalog/sourcing" },
      { title: "Review", url: "/jsblueridge/catalog/sourcing/review" },
      { title: "Queue", url: "/jsblueridge/catalog/publishing-queue" },
      { title: "Images", url: "/jsblueridge/catalog/image-studio" },
    ],
  },
  {
    title: "Retailers", url: "/jsblueridge/retailers", icon: Users,
    subItems: [
      { title: "All Retailers", url: "/jsblueridge/retailers/directory" },
      { title: "Campaigns", url: "/jsblueridge/retailers/campaigns" },
      { title: "Follow-ups", url: "/jsblueridge/retailers/follow-ups" },
      { title: "WhatsApp", url: "/jsblueridge/retailers/whatsapp" },
      { title: "Faire Direct", url: "/jsblueridge/retailers/faire-direct" },
    ],
  },
]

const PLACEHOLDER_B2B_ECOSYSTEM: NavItem[] = [
  {
    title: "Overview", url: "/b2b-ecosystem/overview", icon: LayoutDashboard,
    subItems: [
      { title: "Dashboard", url: "/b2b-ecosystem/overview" },
    ],
  },
  {
    title: "Orders", url: "/b2b-ecosystem/orders", icon: ShoppingCart,
    subItems: [
      { title: "All Orders", url: "/b2b-ecosystem/orders" },
    ],
  },
  {
    title: "Products", url: "/b2b-ecosystem/catalog", icon: Package,
    subItems: [
      { title: "Catalog", url: "/b2b-ecosystem/catalog" },
    ],
  },
  {
    title: "Retailers", url: "/b2b-ecosystem/retailers", icon: Users,
    subItems: [
      { title: "Directory", url: "/b2b-ecosystem/retailers" },
    ],
  },
]

const NAV_ITEMS: NavItem[] = [
  {
    title: "Overview",
    url: "/overview",
    icon: LayoutDashboard,
    subItems: [
      { title: "Dashboard", url: "/overview" },
      { title: "Analytics", url: "/overview/analytics" },
      { title: "Reports", url: "/overview/reports" },
    ],
  },
  {
    title: "Orders",
    url: "/orders",
    icon: ShoppingCart,
    countKey: "pendingOrders",
    subItems: [
      { title: "All Orders", url: "/orders/all" },
      { title: "Pending", url: "/orders/pending", countKey: "pendingOrders" },
      { title: "Fulfillment", url: "/orders/fulfillment", countKey: "processingOrders" },
      { title: "Shipments", url: "/orders/shipments" },
      { title: "Disputes", url: "/orders/refunds" },
      { title: "Quotes", url: "/orders/quotes" },
    ],
  },
  {
    title: "Products",
    url: "/catalog",
    icon: Package,
    subItems: [
      { title: "Listings", url: "/catalog/listings" },
      { title: "Collections", url: "/catalog/collections" },
      { title: "Inventory", url: "/catalog/inventory" },
      { title: "Pricing", url: "/catalog/pricing" },
      { title: "Sourcing", url: "/catalog/sourcing" },
      { title: "Review", url: "/catalog/sourcing/review", countKey: "newScraped" },
      { title: "Queue", url: "/catalog/publishing-queue" },
      { title: "Images", url: "/catalog/image-studio" },
    ],
  },
  {
    title: "Retailers",
    url: "/retailers",
    icon: Users,
    subItems: [
      { title: "All Retailers", url: "/retailers/directory" },
      { title: "Campaigns", url: "/retailers/campaigns" },
      { title: "Follow-ups", url: "/retailers/follow-ups" },
      { title: "WhatsApp", url: "/retailers/whatsapp" },
      { title: "Faire Direct", url: "/retailers/faire-direct" },
    ],
  },
  {
    title: "Finance",
    url: "/finance",
    icon: Wallet,
    centralOnly: true,
    subItems: [
      { title: "Overview", url: "/finance/banking" },
      { title: "Transactions", url: "/finance/banking/transactions" },
      { title: "Reconcile", url: "/finance/banking/reconciliation" },
      { title: "Ledger", url: "/workspace/ledger" },
    ],
  },
  {
    title: "Stores",
    url: "/workspace/stores",
    icon: Blocks,
    centralOnly: true,
    subItems: [
      { title: "All Stores", url: "/workspace/stores/all" },
      { title: "Applications", url: "/workspace/applications", countKey: "draftApps" },
    ],
  },
  {
    title: "Marketing",
    url: "/marketing",
    icon: Target,
    centralOnly: true,
    subItems: [
      { title: "Dashboard", url: "/marketing/dashboard" },
      { title: "Campaigns", url: "/marketing/campaigns" },
      { title: "Ad Sets", url: "/marketing/ad-sets" },
      { title: "Ads", url: "/marketing/ads" },
      { title: "Creatives", url: "/marketing/creatives" },
      { title: "Reports", url: "/marketing/reports" },
    ],
  },
]

// Prefer the longest matching URL so a short root item (e.g. "Today" at
// "/life") cannot steal focus from a deeper sibling ("Goals" at "/life/goals")
// when the user is on /life/goals. Top-level and subItem URLs compete on the
// same score — whichever prefix is longest wins and its top-level item is the
// active one.
function getActiveNavItem(pathname: string, items: NavItem[]): NavItem | null {
  let best: NavItem | null = null
  let bestLen = -1
  for (const item of items) {
    if ((pathname === item.url || pathname.startsWith(item.url + "/")) && item.url.length > bestLen) {
      best = item
      bestLen = item.url.length
    }
    if (item.subItems) {
      for (const sub of item.subItems) {
        if ((pathname === sub.url || pathname.startsWith(sub.url + "/")) && sub.url.length > bestLen) {
          best = item
          bestLen = sub.url.length
        }
      }
    }
  }
  return best
}

function isSubItemActive(pathname: string, subUrl: string, isFirst: boolean, parentUrl: string): boolean {
  if (pathname === subUrl) return true
  // When a sub-item's url equals the parent url (e.g. first sub pointing at the
  // parent route), it should only be active on the exact parent path — otherwise
  // it would light up for every descendant route.
  if (subUrl === parentUrl) return false
  if (pathname.startsWith(subUrl + "/")) return true
  return false
}

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
      {count > 99 ? "99+" : count}
    </span>
  )
}

/**
 * Brand filter cell — pinned as the FIRST item in the dark top nav.
 * Renders the active brand (or "All Brands") with a chevron, opens a dark
 * dropdown matching the nav theme. UX-friendly: shows brand logo + name,
 * plus All Brands option at top, and inactive stores at bottom.
 */
function BrandFilterCell() {
  const { activeBrand, setActiveBrand, stores, inactiveStores, activeStore } =
    useBrandFilter()
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [open])

  const isAll = activeBrand === "all"
  const label = isAll ? "All Brands" : activeStore?.name ?? "All Brands"

  return (
    <div ref={wrapperRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2 h-12 px-4 text-sm font-medium border-r border-dock-border transition-colors min-w-[180px]",
          open ? "bg-dock-hover text-dock-foreground" : "text-dock-foreground hover:bg-dock-hover"
        )}
      >
        {isAll ? (
          <span className="flex items-center justify-center h-6 w-6 rounded bg-dock-hover text-dock-foreground shrink-0">
            <Layers className="h-3.5 w-3.5" />
          </span>
        ) : activeStore?.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activeStore.logo_url}
            alt=""
            className="h-6 w-6 rounded object-cover ring-1 ring-dock-border shrink-0"
          />
        ) : (
          <span
            className="flex items-center justify-center h-6 w-6 rounded text-[10px] font-bold text-dock-foreground shrink-0"
            style={{ backgroundColor: activeStore?.color ?? "#64748b" }}
          >
            {activeStore?.short ?? "?"}
          </span>
        )}
        <span className="flex-1 text-left truncate leading-none">{label}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-0 w-72 rounded-b-md border border-border/80 bg-card shadow-xl ring-1 ring-black/10 overflow-hidden z-50">
          <div className="px-3 py-2 border-b border-border/80 bg-muted/30">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Filter by brand
            </p>
          </div>
          <div className="py-1 max-h-[60vh] overflow-y-auto">
            {/* All Brands */}
            <button
              type="button"
              onClick={() => {
                setActiveBrand("all")
                setOpen(false)
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/60 transition-colors",
                isAll && "bg-muted/40"
              )}
            >
              <span className="flex items-center justify-center h-8 w-8 rounded-md bg-primary/10 text-primary shrink-0">
                <Layers className="h-4 w-4" />
              </span>
              <div className="flex-1 text-left min-w-0">
                <p className="font-semibold text-foreground leading-tight">All Brands</p>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  {stores.length} active store{stores.length !== 1 ? "s" : ""}
                </p>
              </div>
              {isAll && <Check className="h-4 w-4 text-primary shrink-0" />}
            </button>

            {/* Active stores */}
            {stores.length > 0 && (
              <div className="border-t border-border/60 mt-1 pt-1">
                <p className="px-3 pb-1 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                  Stores
                </p>
                {stores.map((store) => {
                  const isActiveStore = activeBrand === store.id
                  return (
                    <button
                      key={store.id}
                      type="button"
                      onClick={() => {
                        setActiveBrand(store.id)
                        setOpen(false)
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/60 transition-colors",
                        isActiveStore && "bg-muted/40"
                      )}
                    >
                      {store.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={store.logo_url}
                          alt=""
                          className="h-8 w-8 rounded-md object-cover shrink-0 ring-1 ring-border/60"
                        />
                      ) : (
                        <span
                          className="flex items-center justify-center h-8 w-8 rounded-md text-[11px] font-bold text-white shrink-0"
                          style={{ backgroundColor: store.color }}
                        >
                          {store.short}
                        </span>
                      )}
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-semibold text-foreground leading-tight truncate">
                          {store.name}
                        </p>
                        {store.category && (
                          <p className="text-[11px] text-muted-foreground leading-tight truncate">
                            {store.category}
                          </p>
                        )}
                      </div>
                      {isActiveStore && (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Inactive stores */}
            {inactiveStores.length > 0 && (
              <div className="border-t border-border/60 mt-1 pt-1">
                <p className="px-3 pb-1 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                  Inactive
                </p>
                {inactiveStores.map((store) => (
                  <div
                    key={store.id}
                    className="flex items-center gap-3 px-3 py-2 text-sm opacity-50 cursor-not-allowed"
                  >
                    {store.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={store.logo_url}
                        alt=""
                        className="h-8 w-8 rounded-md object-cover shrink-0 grayscale"
                      />
                    ) : (
                      <span
                        className="flex items-center justify-center h-8 w-8 rounded-md text-[11px] font-bold text-white shrink-0 grayscale"
                        style={{ backgroundColor: store.color }}
                      >
                        {store.short}
                      </span>
                    )}
                    <span className="flex-1 text-left text-muted-foreground truncate">
                      {store.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function TopNavigation() {
  const pathname = usePathname()
  const { activeBrand } = useBrandFilter()
  const [counts, setCounts] = useState<Record<string, number>>({})

  // Fetch notification counts — deferred so nav renders instantly
  useEffect(() => {
    const timer = setTimeout(async () => {
      const filterByStore = activeBrand !== "all"

      let pendingQuery = supabaseB2B.from("faire_orders").select("*", { count: "exact", head: true }).eq("state", "NEW")
      let processingQuery = supabaseB2B.from("faire_orders").select("*", { count: "exact", head: true }).eq("state", "PROCESSING")
      if (filterByStore) {
        pendingQuery = pendingQuery.eq("store_id", activeBrand)
        processingQuery = processingQuery.eq("store_id", activeBrand)
      }

      const [pendingRes, processingRes] = await Promise.all([
        pendingQuery,
        processingQuery,
      ])
      setCounts({
        pendingOrders: pendingRes.count ?? 0,
        processingOrders: processingRes.count ?? 0,
      })
    }, 500) // Defer 500ms so page renders first
    return () => clearTimeout(timer)
  }, [activeBrand])

  // Pick the nav set based on which Space the user is currently in.
  // The b2b-ecommerce space gets the full Faire portal nav; other spaces
  // get their lightweight placeholder nav until they're built.
  const activeSpaceSlug = useActiveSpace().slug
  const spaceNavItems: NavItem[] = (() => {
    switch (activeSpaceSlug) {
      case "hq":     return PLACEHOLDER_HQ
      case "legal":  return PLACEHOLDER_LEGAL
      case "goyo":   return PLACEHOLDER_GOYO
      case "usdrop": return PLACEHOLDER_USDROP
      case "ets":            return PLACEHOLDER_ETS
      case "development":    return PLACEHOLDER_DEVELOPMENT
      case "life":           return PLACEHOLDER_LIFE
      case "jsblueridge":    return PLACEHOLDER_JSBLUERIDGE
      case "b2b-ecosystem":  return PLACEHOLDER_B2B_ECOSYSTEM
      case "b2b-ecommerce":
      default:               return NAV_ITEMS
    }
  })()

  const isB2BSpace = activeSpaceSlug === "b2b-ecommerce"

  const visibleItems = isB2BSpace && activeBrand !== "all"
    ? spaceNavItems.filter((item) => !item.centralOnly)
    : spaceNavItems

  const activeItem = getActiveNavItem(pathname, visibleItems)
  const subItems = activeItem?.subItems

  return (
    <div className="shrink-0">
      {/* Primary nav bar — brand filter pinned as first cell (B2B only), modules fill remaining width */}
      <nav className="flex bg-dock">
        {isB2BSpace && <BrandFilterCell />}
        <div
          className="flex-1 grid"
          style={{ gridTemplateColumns: `repeat(${visibleItems.length}, 1fr)` }}
        >
        {visibleItems.map((item) => {
          const isActive =
            activeItem?.url === item.url ||
            (activeItem == null && (pathname === item.url || pathname.startsWith(item.url + "/")))
          const Icon = item.icon
          const count = item.countKey ? counts[item.countKey] ?? 0 : 0
          return (
            <Link
              key={item.url}
              href={item.url}
              className={cn(
                "flex items-center justify-center gap-1.5 h-12 text-sm font-medium transition-colors",
                isActive
                  ? "bg-dock-active text-dock-active-foreground"
                  : "text-dock-foreground hover:bg-dock-hover"
              )}
            >
              <Icon className="size-4" />
              {item.title}
              {count > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
                  {count}
                </span>
              )}
            </Link>
          )
        })}
        </div>
      </nav>

      {/* Sub-nav bar */}
      {subItems && subItems.length > 0 && (
        <div
          className="grid border-b border-border bg-background"
          style={{ gridTemplateColumns: `repeat(${subItems.length}, 1fr)` }}
        >
          {subItems.map((sub, i) => {
            const active = isSubItemActive(pathname, sub.url, i === 0, activeItem!.url)
            const subCount = sub.countKey ? counts[sub.countKey] ?? 0 : 0
            return (
              <Link
                key={sub.url}
                href={sub.url}
                className={cn(
                  "flex items-center justify-center gap-1.5 h-11 text-sm transition-colors",
                  i < subItems.length - 1 && "border-r border-border",
                  active
                    ? "bg-primary/8 text-foreground font-bold border-b-2 border-b-primary"
                    : "text-foreground font-medium hover:bg-muted/50"
                )}
              >
                {sub.title}
                <CountBadge count={subCount} />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
