#!/usr/bin/env node
/**
 * Scaffold multiple list+detail sections inside an existing space.
 * Reads a simple JSON spec from stdin or a hardcoded block below.
 * Each section becomes a compliant list page + `[id]/page.tsx` detail
 * page per SPACE_PATTERN.md.
 *
 * Usage: node scripts/scaffold-sections.mjs
 */

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Sections to scaffold. Each entry: { space, path, title, icon, nounPlural, nounSingular, noDetail? }
const SECTIONS = [
  // ============ HQ (Session 2) ============
  // People / HRMS
  { space: "hq", path: "people/directory",   title: "Employees",         icon: "Users",         nounSingular: "Employee",         nounPlural: "employees" },
  { space: "hq", path: "people/attendance",  title: "Attendance",        icon: "CalendarCheck", nounSingular: "Attendance day",   nounPlural: "attendance days",   noDetail: true },
  { space: "hq", path: "people/leave",       title: "Leave Requests",    icon: "CalendarOff",   nounSingular: "Leave request",    nounPlural: "leave requests" },
  { space: "hq", path: "people/payroll",     title: "Payroll",           icon: "Wallet",        nounSingular: "Payroll run",      nounPlural: "payroll runs" },
  { space: "hq", path: "people/performance", title: "Performance",       icon: "Target",        nounSingular: "Review",           nounPlural: "reviews" },
  { space: "hq", path: "people/org-chart",   title: "Org Chart",         icon: "Network",       nounSingular: "Team member",      nounPlural: "team members",      noDetail: true },
  { space: "hq", path: "people/departments", title: "Departments",       icon: "Layers",        nounSingular: "Department",       nounPlural: "departments" },
  { space: "hq", path: "people/policies",    title: "HR Policies",       icon: "FileText",      nounSingular: "Policy",           nounPlural: "policies",          noDetail: true },
  // People / ATS
  { space: "hq", path: "people/ats/roles",      title: "Open Roles",     icon: "Briefcase",     nounSingular: "Role",             nounPlural: "roles" },
  { space: "hq", path: "people/ats/candidates", title: "Candidates",     icon: "UserCircle",    nounSingular: "Candidate",        nounPlural: "candidates" },
  { space: "hq", path: "people/ats/pipeline",   title: "Pipeline",       icon: "Workflow",      nounSingular: "Candidate",        nounPlural: "candidates",        noDetail: true },
  { space: "hq", path: "people/ats/interviews", title: "Interviews",     icon: "Video",         nounSingular: "Interview",        nounPlural: "interviews",        noDetail: true },
  { space: "hq", path: "people/ats/offers",     title: "Offers",         icon: "FileCheck",     nounSingular: "Offer",            nounPlural: "offers",            noDetail: true },
  // Finance
  { space: "hq", path: "finance/entities",      title: "Entities",       icon: "Building2",     nounSingular: "Entity",           nounPlural: "entities" },
  { space: "hq", path: "finance/transactions",  title: "Transactions",   icon: "ArrowRightLeft",nounSingular: "Transaction",      nounPlural: "transactions",      noDetail: true },
  { space: "hq", path: "finance/reconciliation",title: "Reconciliation", icon: "CheckSquare",   nounSingular: "Match",            nounPlural: "matches",           noDetail: true },
  // Projects
  { space: "hq", path: "projects/overview",     title: "Active Projects",icon: "Blocks",        nounSingular: "Project",          nounPlural: "projects" },
  { space: "hq", path: "projects/okrs",         title: "OKRs",           icon: "Target",        nounSingular: "Objective",        nounPlural: "objectives",        noDetail: true },
  { space: "hq", path: "projects/roadmap",      title: "Roadmap",        icon: "Map",           nounSingular: "Milestone",        nounPlural: "milestones",        noDetail: true },
  // Assets
  { space: "hq", path: "assets/devices",        title: "Devices",        icon: "Laptop",        nounSingular: "Asset",            nounPlural: "assets" },
  { space: "hq", path: "assets/licenses",       title: "Licenses",       icon: "KeyRound",      nounSingular: "License",          nounPlural: "licenses" },
  { space: "hq", path: "assets/contracts",      title: "Vendor Contracts",icon:"ScrollText",    nounSingular: "Contract",         nounPlural: "contracts" },
  { space: "hq", path: "assets/inventory",      title: "Office Inventory",icon:"Package",       nounSingular: "Item",             nounPlural: "items",             noDetail: true },
  // Social
  { space: "hq", path: "social/overview",       title: "Social Dashboard",icon:"Megaphone",     nounSingular: "Account",          nounPlural: "accounts",          noDetail: true },
  { space: "hq", path: "social/accounts",       title: "Connected Accounts",icon:"AtSign",      nounSingular: "Account",          nounPlural: "accounts" },
  { space: "hq", path: "social/calendar",       title: "Content Calendar",icon:"CalendarDays", nounSingular: "Post",             nounPlural: "posts",             noDetail: true },
  { space: "hq", path: "social/posts",          title: "Posts",          icon: "Image",         nounSingular: "Post",             nounPlural: "posts" },
  { space: "hq", path: "social/approvals",      title: "Approval Queue", icon: "CheckSquare",   nounSingular: "Post",             nounPlural: "posts",             noDetail: true },
  { space: "hq", path: "social/analytics",      title: "Social Analytics",icon:"TrendingUp",    nounSingular: "Metric",           nounPlural: "metrics",           noDetail: true },
  // Sites
  { space: "hq", path: "sites/overview",        title: "Sites Overview", icon: "Globe",         nounSingular: "Site",             nounPlural: "sites",             noDetail: true },
  { space: "hq", path: "sites/traffic",         title: "Traffic Analytics",icon:"BarChart3",    nounSingular: "Page",             nounPlural: "pages",             noDetail: true },
  { space: "hq", path: "sites/seo",             title: "SEO Monitoring", icon: "Search",        nounSingular: "Keyword",          nounPlural: "keywords",          noDetail: true },
  { space: "hq", path: "sites/content",         title: "Site Content",   icon: "FileText",      nounSingular: "Content item",     nounPlural: "content items" },
  { space: "hq", path: "sites/uptime",          title: "Uptime",         icon: "Activity",      nounSingular: "Check",            nounPlural: "checks",            noDetail: true },
  // Compliance
  { space: "hq", path: "compliance/overview",   title: "Compliance Dashboard",icon:"Target",    nounSingular: "Item",             nounPlural: "items",             noDetail: true },
  { space: "hq", path: "compliance/entities",   title: "Entity Registry",icon: "Building2",     nounSingular: "Entity",           nounPlural: "entities" },
  { space: "hq", path: "compliance/filings",    title: "Filings",        icon: "FileCheck",     nounSingular: "Filing",           nounPlural: "filings" },
  { space: "hq", path: "compliance/contracts",  title: "Contracts",      icon: "ScrollText",    nounSingular: "Contract",         nounPlural: "contracts" },
  { space: "hq", path: "compliance/legal-cases",title: "Legal Cases",    icon: "Gavel",         nounSingular: "Case",             nounPlural: "cases" },

  // ============ Goyo (Session 1, already run) ============
  { space: "goyo", path: "bookings", title: "Bookings", icon: "ShoppingCart", nounSingular: "Booking", nounPlural: "bookings" },
  { space: "goyo", path: "clients", title: "Clients", icon: "UserCircle", nounSingular: "Client", nounPlural: "clients" },
  { space: "goyo", path: "tours", title: "Tours", icon: "Compass", nounSingular: "Tour", nounPlural: "tours" },
  { space: "goyo", path: "visas", title: "Visas", icon: "ShieldCheck", nounSingular: "Visa application", nounPlural: "visa applications", noDetail: true },
  { space: "goyo", path: "travel/flights", title: "Flights", icon: "Plane", nounSingular: "Flight", nounPlural: "flights", noDetail: true },
  { space: "goyo", path: "travel/hotels", title: "Hotels", icon: "Hotel", nounSingular: "Hotel booking", nounPlural: "hotel bookings", noDetail: true },
  { space: "goyo", path: "itineraries", title: "Itineraries", icon: "Map", nounSingular: "Itinerary", nounPlural: "itineraries" },
  { space: "goyo", path: "guides", title: "Guides", icon: "Users", nounSingular: "Guide", nounPlural: "guides" },
  { space: "goyo", path: "finance", title: "Finance", icon: "Wallet", nounSingular: "Transaction", nounPlural: "transactions", noDetail: true },

  // Legal
  { space: "legal", path: "clients", title: "Clients", icon: "UserCircle", nounSingular: "Client", nounPlural: "clients" },
  { space: "legal", path: "cases", title: "Cases", icon: "Blocks", nounSingular: "Case", nounPlural: "cases" },
  { space: "legal", path: "documents", title: "Documents", icon: "FileText", nounSingular: "Document", nounPlural: "documents", noDetail: true },
  { space: "legal", path: "payments", title: "Payments", icon: "CreditCard", nounSingular: "Payment", nounPlural: "payments", noDetail: true },
  { space: "legal", path: "compliance", title: "Compliance", icon: "Target", nounSingular: "Filing", nounPlural: "filings", noDetail: true },
];

function listPageCode(s) {
  return `import { PageHeader } from "@/components/shared/page-header";
import { KPIGrid } from "@/components/shared/kpi-grid";
import { MetricCard } from "@/components/shared/metric-card";
import { DetailCard } from "@/components/shared/detail-views";
import { EmptyState } from "@/components/shared/empty-state";
import { ${s.icon} } from "lucide-react";

// Scaffolded from SPACE_PATTERN.md §3. Wire real data when the
// ${s.space}-space build session fills in the table.
export default function ${s.space.charAt(0).toUpperCase() + s.space.slice(1)}${s.title.replace(/\\s+/g, "")}Page() {
  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="${s.title}"
        subtitle="All ${s.nounPlural}. Filter, sort, and open a ${s.nounSingular.toLowerCase()} for full details."
      />

      <KPIGrid>
        <MetricCard label="Total" value={0} icon={${s.icon}} iconTone="blue" />
        <MetricCard label="Active" value={0} icon={${s.icon}} iconTone="emerald" />
        <MetricCard label="Pending" value={0} icon={${s.icon}} iconTone="amber" />
        <MetricCard label="At risk" value={0} icon={${s.icon}} iconTone="red" />
      </KPIGrid>

      <DetailCard title="All ${s.nounPlural}">
        <EmptyState
          icon={${s.icon}}
          title="No ${s.nounPlural} yet"
          description="Data will appear here once the ${s.space} backend is wired up."
        />
      </DetailCard>
    </div>
  );
}
`;
}

function detailPageCode(s) {
  return `"use client";

import { useParams } from "next/navigation";
import { BackLink } from "@/components/shared/back-link";
import { HeroCard } from "@/components/shared/hero-card";
import { DetailCard, InfoRow } from "@/components/shared/detail-views";
import { ${s.icon} } from "lucide-react";

// Scaffolded from SPACE_PATTERN.md §4.
export default function ${s.space.charAt(0).toUpperCase() + s.space.slice(1)}${s.title.replace(/\\s+/g, "")}DetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <BackLink href="/${s.space}/${s.path}" label="All ${s.nounPlural}" />

      <HeroCard
        title={\`${s.nounSingular} \${id}\`}
        subtitle="Replace with real data once the backend is wired."
        icon={${s.icon}}
        tone="blue"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <DetailCard title="Overview">
            <InfoRow label="ID" value={id} />
          </DetailCard>
        </div>
        <div className="space-y-5">
          <DetailCard title="Meta">
            <InfoRow label="Created" value="—" />
          </DetailCard>
        </div>
      </div>
    </div>
  );
}
`;
}

let created = 0;
let skipped = 0;

for (const s of SECTIONS) {
  const sectionDir = resolve(root, `src/app/(portal)/${s.space}/${s.path}`);
  const listFile = resolve(sectionDir, "page.tsx");
  if (existsSync(listFile)) {
    console.log(`skip  ${s.space}/${s.path}/page.tsx (exists)`);
    skipped++;
  } else {
    mkdirSync(sectionDir, { recursive: true });
    writeFileSync(listFile, listPageCode(s));
    console.log(`write ${s.space}/${s.path}/page.tsx`);
    created++;
  }

  if (!s.noDetail) {
    const detailDir = resolve(sectionDir, "[id]");
    const detailFile = resolve(detailDir, "page.tsx");
    if (existsSync(detailFile)) {
      console.log(`skip  ${s.space}/${s.path}/[id]/page.tsx (exists)`);
      skipped++;
    } else {
      mkdirSync(detailDir, { recursive: true });
      writeFileSync(detailFile, detailPageCode(s));
      console.log(`write ${s.space}/${s.path}/[id]/page.tsx`);
      created++;
    }
  }
}

console.log(`\nDone: ${created} created, ${skipped} skipped`);
