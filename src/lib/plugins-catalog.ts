/**
 * Plugins catalogue — universal modules that can be installed into any
 * space. Shared by the standalone `/plugins` route AND the inline plugins
 * view on the homepage so both stay in sync from one source of truth.
 *
 * `installed` = already shipped and reachable from the right dock
 * `pending`   = on the roadmap; renders grayscale + "Coming soon"
 */

import {
  // Ecommerce
  Truck,
  ShoppingCart,
  Receipt,
  // Sales & CRM
  Workflow,
  Calculator,
  Search,
  Database,
  Radio,
  Eye,
  // Communication
  MessageCircle,
  Mail,
  Inbox as InboxIcon,
  Phone,
  PhoneCall,
  Video,
  GitBranch,
  MessageSquare,
  Bell,
  Megaphone,
  // Operations
  Calendar,
  ClipboardList,
  Zap,
  BarChart3,
  LifeBuoy,
  StickyNote,
  FileText,
  Table,
  PenLine,
  FileSignature,
  FileBarChart,
  // Finance
  FileCheck,
  CreditCard,
  Wallet,
  // HR
  Users,
  UserCheck,
  UserPlus,
  Network,
  Building,
  Clock,
  CalendarOff,
  PartyPopper,
  ReceiptText,
  Star,
  Target,
  Briefcase,
  Users2,
  Mic,
  ThumbsUp,
  UsersRound,
  TrendingUp,
  User,
  // Assets
  Package2,
  Info,
  Tags,
  ArrowRightLeft,
  Wrench,
  Trash2,
  FileSpreadsheet,
  History,
  // Social
  CalendarDays,
  Edit,
  Share2,
  ListOrdered,
  Rocket,
  Layers,
  Type,
  Hash,
  Activity,
  // Dev
  ShieldCheck,
  Terminal,
  AlertTriangle,
  Code2,
  LayoutTemplate,
  // AI
  Sparkles,
  Notebook,
  Headphones,
  Trophy,
  Crosshair,
  Quote,
  CalendarClock,
  Recycle,
  Award,
  FileEdit,
  Percent,
  Gauge,
  Scale as ScaleIcon,
  BookCheck,
  // Knowledge
  Telescope,
  GraduationCap,
  BookOpen,
  Link2,
  FolderOpen,
  type LucideIcon,
} from "lucide-react"

export type PluginStatus = "installed" | "pending"

export interface Plugin {
  name: string
  description: string
  icon: LucideIcon
  status: PluginStatus
  href?: string
}

export interface PluginCategory {
  name: string
  blurb: string
  plugins: Plugin[]
}

export const PLUGIN_CATEGORIES: PluginCategory[] = [
  {
    name: "Ecommerce",
    blurb: "Storefront, fulfillment and wholesale operations.",
    plugins: [
      { name: "Fulfillment Hub", description: "Central queue for picking, packing and shipping across warehouses.", icon: Truck, status: "pending" },
      { name: "Procurement", description: "Purchase orders, supplier management and landed-cost tracking.", icon: ShoppingCart, status: "pending" },
      { name: "Invoices", description: "Customer-facing invoices with line items, tax and payment links.", icon: Receipt, status: "pending" },
      { name: "Ecommerce Marketing", description: "Product launches, promotions and seasonal campaign orchestration.", icon: Megaphone, status: "pending" },
    ],
  },
  {
    name: "Sales & CRM",
    blurb: "Pipeline, outbound and revenue intelligence.",
    plugins: [
      { name: "Sequences", description: "Multi-channel outreach cadences with reply detection.", icon: Workflow, status: "pending" },
      { name: "CPQ", description: "Configure-Price-Quote engine for complex, bundled offers.", icon: Calculator, status: "pending" },
      { name: "Prospect", description: "Find decision-makers and enrich them with verified contact data.", icon: Search, status: "pending" },
      { name: "Data Enrichment", description: "Upload CSVs and auto-fill company, role and firmographic data.", icon: Database, status: "pending" },
      { name: "Signals", description: "Turn website visits and product usage into ready-to-work leads.", icon: Radio, status: "pending" },
      { name: "Anonymous Visitors", description: "Identify accounts browsing your site before they hit a form.", icon: Eye, status: "pending" },
    ],
  },
  {
    name: "Communication",
    blurb: "Inboxes, phones and every channel your team talks on.",
    plugins: [
      { name: "Inbox", description: "Unified notification inbox for orders, alerts and system events.", icon: Bell, status: "installed", href: "/workspace/inbox" },
      { name: "Chat", description: "Team chat with channels, threads and file sharing.", icon: MessageCircle, status: "installed", href: "/workspace/chat" },
      { name: "Comms", description: "Campaign-grade email broadcasts with templates and analytics.", icon: Megaphone, status: "installed", href: "/workspace/emails/dashboard" },
      { name: "Gmail", description: "Native Gmail inbox, drafts and thread view inside the portal.", icon: Mail, status: "installed", href: "/workspace/gmail" },
      { name: "Unibox", description: "One inbox across email, WhatsApp, SMS and in-app chats.", icon: InboxIcon, status: "pending" },
      { name: "Business Phone", description: "1-to-1 calling with call logging and CRM sync.", icon: Phone, status: "pending" },
      { name: "Sales Dialer", description: "Parallel and power dialing for outbound calling campaigns.", icon: PhoneCall, status: "pending" },
      { name: "Meeting Links", description: "Personal and team booking pages with buffers and availability rules.", icon: Video, status: "pending" },
      { name: "Meeting Router", description: "Route inbound meetings to the right owner via lead-routing logic.", icon: GitBranch, status: "pending" },
      { name: "Num", description: "Number pool with local presence and SMS support.", icon: Phone, status: "pending" },
      { name: "WhatsApp", description: "Full WhatsApp Business module — templates, flows and inbound.", icon: MessageSquare, status: "pending" },
    ],
  },
  {
    name: "Operations",
    blurb: "Day-to-day execution — tasks, docs and approvals.",
    plugins: [
      { name: "Calendar", description: "Personal and shared calendars with booking and meeting links.", icon: Calendar, status: "installed", href: "/workspace/calendar" },
      { name: "Tasks", description: "Task lists, assignments and team-wide priority tracking.", icon: ClipboardList, status: "installed", href: "/operations/tasks" },
      { name: "Automations", description: "Trigger-based background workflows and scheduled jobs.", icon: Zap, status: "installed", href: "/automations/overview" },
      { name: "Analytics", description: "Cross-module dashboards — revenue, traffic and performance.", icon: BarChart3, status: "installed", href: "/analytics/revenue" },
      { name: "Tickets", description: "Internal and client-facing support ticket queues.", icon: LifeBuoy, status: "installed", href: "/workspace/tickets" },
      { name: "Notes", description: "Rich notes with mentions, linking and AI summaries.", icon: StickyNote, status: "pending" },
      { name: "Forms", description: "Branded forms that capture data and pipe into any module.", icon: FileText, status: "pending" },
      { name: "Workflows", description: "Visual drag-and-drop builder for multi-step business processes.", icon: Workflow, status: "pending" },
      { name: "Sheets", description: "Lightweight collaborative spreadsheets with formulas.", icon: Table, status: "pending" },
      { name: "E-Sign", description: "Send documents for legally binding signatures.", icon: PenLine, status: "pending" },
      { name: "Client Contracts", description: "Contract lifecycle management — draft, sign, renew.", icon: FileSignature, status: "pending" },
      { name: "Reports", description: "Schedulable rich-text reports with charts and KPIs.", icon: FileBarChart, status: "pending" },
    ],
  },
  {
    name: "Finance",
    blurb: "Money in, money out — ledgers, payments and receipts.",
    plugins: [
      { name: "Invoices", description: "Send and collect on customer invoices with payment links.", icon: FileCheck, status: "pending" },
      { name: "POS", description: "Point-of-sale terminal for in-store checkout and receipts.", icon: CreditCard, status: "pending" },
      { name: "Valo", description: "Company valuation and cap-table modelling.", icon: Wallet, status: "pending" },
    ],
  },
  {
    name: "HR Suite",
    blurb: "People operations, hiring and payroll.",
    plugins: [
      { name: "Team", description: "Team directory with roles, contacts and reporting lines.", icon: Users, status: "installed", href: "/workspace/team" },
      { name: "Remote", description: "Remote team availability, time zones and status board.", icon: UserCheck, status: "installed", href: "/workspace/ai-team" },
      { name: "Employees", description: "Employee records with full detail pages and document history.", icon: User, status: "pending" },
      { name: "Onboarding", description: "Structured onboarding checklists and welcome flows.", icon: UserPlus, status: "pending" },
      { name: "Org Chart", description: "Auto-generated company org chart with drill-down.", icon: Network, status: "pending" },
      { name: "Departments", description: "Department management with budgets and headcount planning.", icon: Building, status: "pending" },
      { name: "Policies", description: "Employee handbook and policy acknowledgements.", icon: FileText, status: "pending" },
      { name: "Attendance", description: "Clock-in / clock-out with geofencing and timesheet export.", icon: Clock, status: "pending" },
      { name: "Leaves", description: "Leave requests, balances and approval routing.", icon: CalendarOff, status: "pending" },
      { name: "Holidays", description: "Public holiday calendar per region and entity.", icon: PartyPopper, status: "pending" },
      { name: "Payroll", description: "Salary processing, deductions and compliance filings.", icon: Wallet, status: "pending" },
      { name: "Payslips", description: "Generate and distribute payslips with tax breakdowns.", icon: ReceiptText, status: "pending" },
      { name: "Performance Reviews", description: "360 reviews, feedback cycles and rating calibration.", icon: Star, status: "pending" },
      { name: "Goals / OKRs", description: "Company, team and individual objective tracking.", icon: Target, status: "pending" },
      { name: "Jobs", description: "Public and internal job postings with careers page.", icon: Briefcase, status: "pending" },
      { name: "Candidates", description: "Applicant tracking with pipeline stages and scorecards.", icon: Users2, status: "pending" },
      { name: "Interviews", description: "Interview scheduling, kits and feedback collection.", icon: Mic, status: "pending" },
      { name: "Offers", description: "Offer letter generation and e-signature.", icon: ThumbsUp, status: "pending" },
      { name: "Talent Pool", description: "Curated pool of past candidates for re-engagement.", icon: UsersRound, status: "pending" },
      { name: "ATS Analytics", description: "Hiring funnel metrics, source-of-hire and time-to-fill.", icon: TrendingUp, status: "pending" },
    ],
  },
  {
    name: "Asset Tracking",
    blurb: "Company assets, maintenance and disposal.",
    plugins: [
      { name: "Asset Directory", description: "Every asset in one searchable register.", icon: Package2, status: "pending" },
      { name: "Asset Detail", description: "Drill-down page with history, photos and documents.", icon: Info, status: "pending" },
      { name: "Categories & Depreciation", description: "Asset classes, lifespans and depreciation schedules.", icon: Tags, status: "pending" },
      { name: "Assignments", description: "Track who has what, transfers and check-in / check-out.", icon: ArrowRightLeft, status: "pending" },
      { name: "Maintenance & AMC", description: "Scheduled maintenance and annual-maintenance contracts.", icon: Wrench, status: "pending" },
      { name: "Disposal & Write-off", description: "End-of-life workflows with audit trail.", icon: Trash2, status: "pending" },
      { name: "Asset Report", description: "Fleet reports, utilisation and value snapshots.", icon: FileSpreadsheet, status: "pending" },
      { name: "Audit Log", description: "Immutable log of every asset change.", icon: History, status: "pending" },
    ],
  },
  {
    name: "Social & Scheduling",
    blurb: "Plan, publish and measure across every social channel.",
    plugins: [
      { name: "Content Calendar", description: "Visual calendar for scheduled and draft posts.", icon: CalendarDays, status: "pending" },
      { name: "Post Composer", description: "Multi-network post editor with media and previews.", icon: Edit, status: "pending" },
      { name: "Connected Accounts", description: "Link and manage every social account under one roof.", icon: Share2, status: "pending" },
      { name: "Post Queue", description: "Ordered publishing queue with drag-to-reschedule.", icon: ListOrdered, status: "pending" },
      { name: "Campaigns", description: "Group related posts into named social campaigns.", icon: Rocket, status: "pending" },
      { name: "Campaign Detail", description: "Drill-down view of a single campaign's performance.", icon: Layers, status: "pending" },
      { name: "Caption Scripts", description: "Reusable caption templates with variables.", icon: Type, status: "pending" },
      { name: "Hashtag Manager", description: "Curated hashtag sets with performance tracking.", icon: Hash, status: "pending" },
      { name: "Social Analytics", description: "Reach, engagement and follower-growth dashboards.", icon: BarChart3, status: "pending" },
      { name: "Post Performance", description: "Per-post deep-dive with reactions and conversion data.", icon: Activity, status: "pending" },
    ],
  },
  {
    name: "Dev & Builder",
    blurb: "Engineering tools, QA and custom builders.",
    plugins: [
      { name: "AI QA", description: "AI-assisted QA dashboard for release testing.", icon: ShieldCheck, status: "installed", href: "/workspace/qa/dashboard" },
      { name: "Developer Center", description: "API keys, webhooks and integration docs.", icon: Terminal, status: "pending" },
      { name: "Error Logging", description: "Captured exceptions with stack traces and source maps.", icon: AlertTriangle, status: "pending" },
      { name: "Code Reviewer", description: "AI PR reviewer with style, security and logic checks.", icon: Code2, status: "pending" },
      { name: "Landing Page Builder", description: "No-code page builder for marketing and launches.", icon: LayoutTemplate, status: "pending" },
    ],
  },
  {
    name: "AI-native",
    blurb: "AI-native modules — agents, scorers and auto-generators.",
    plugins: [
      { name: "AI Tools", description: "Umbrella launcher for every AI tool in the portal.", icon: Sparkles, status: "installed", href: "/workspace/ai-tools" },
      { name: "AI Notetaker", description: "Auto-join meetings, transcribe and surface action items.", icon: Notebook, status: "pending" },
      { name: "AI Business Receptionist", description: "Voice agent that answers, qualifies and routes inbound calls.", icon: Headphones, status: "pending" },
      { name: "AI Deal Coach", description: "Next-best-action suggestions on every open deal.", icon: Trophy, status: "pending" },
      { name: "AI Lead Scorer", description: "Score and rank leads based on fit and intent.", icon: Crosshair, status: "pending" },
      { name: "AI Caption Writer", description: "On-brand social captions from a single brief.", icon: Quote, status: "pending" },
      { name: "AI Content Calendar Generator", description: "Auto-plan a month of social content in one click.", icon: CalendarClock, status: "pending" },
      { name: "AI Repurpose Engine", description: "Turn one long-form asset into ten channel-native posts.", icon: Recycle, status: "pending" },
      { name: "AI Interview Scorer", description: "Score interview transcripts against a rubric.", icon: Award, status: "pending" },
      { name: "AI JD Generator", description: "Generate job descriptions from a role title and signals.", icon: FileEdit, status: "pending" },
      { name: "AI Margin Optimizer", description: "Price-and-cost analysis to maximise margin per SKU.", icon: Percent, status: "pending" },
      { name: "AI Supplier Scorer", description: "Score suppliers on price, lead time and reliability.", icon: Gauge, status: "pending" },
      { name: "AI Reconciliation", description: "Auto-match bank transactions to invoices and POs.", icon: ScaleIcon, status: "pending" },
      { name: "EOD Report Summarizer", description: "End-of-day summary of every module in one digest.", icon: BookCheck, status: "pending" },
    ],
  },
  {
    name: "Knowledge & Productivity",
    blurb: "Research, training and shared knowledge.",
    plugins: [
      { name: "Research", description: "AI research assistant with citations and saved briefs.", icon: Telescope, status: "installed", href: "/workspace/research" },
      { name: "Learning", description: "Training courses, videos and internal SOPs.", icon: GraduationCap, status: "installed", href: "/workspace/training" },
      { name: "Help", description: "Searchable knowledge base for every module.", icon: BookOpen, status: "installed", href: "/workspace/knowledge" },
      { name: "Links", description: "Shared link library with tags and previews.", icon: Link2, status: "installed", href: "/workspace/links" },
      { name: "Files", description: "Cross-module file browser with version history.", icon: FolderOpen, status: "installed", href: "/workspace/files" },
    ],
  },
]

export function countInstalled(): number {
  return PLUGIN_CATEGORIES.reduce(
    (acc, c) => acc + c.plugins.filter((p) => p.status === "installed").length,
    0
  )
}

export function countPending(): number {
  return PLUGIN_CATEGORIES.reduce(
    (acc, c) => acc + c.plugins.filter((p) => p.status === "pending").length,
    0
  )
}
