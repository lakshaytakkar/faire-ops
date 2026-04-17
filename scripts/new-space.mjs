#!/usr/bin/env node
/**
 * Scaffold a compliant portal space. See SPACE_PATTERN.md.
 *
 * Usage:
 *   node scripts/new-space.mjs <slug> [section] [--layout <shape>]
 *
 * Layout shape ∈ { table (default), timeline, kanban, ledger, calendar, dashboard }.
 *
 * Example:
 *   node scripts/new-space.mjs retail directory --layout table
 *   node scripts/new-space.mjs journal entries --layout timeline
 *
 * Generates:
 *   src/app/(portal)/<slug>/layout.tsx             — pass-through
 *   src/app/(portal)/<slug>/page.tsx               — redirect to <section>
 *   src/app/(portal)/<slug>/<section>/page.tsx     — list skeleton (varies by --layout)
 *   src/app/(portal)/<slug>/<section>/[id]/page.tsx — detail skeleton
 *   supabase/seeds/<slug>_demo.sql                  — commented seed template
 *
 * Also patches src/components/layout/top-navigation.tsx to wire a placeholder nav.
 *
 * After scaffolding you still need to:
 *   1. Register the space in src/lib/verticals-config.ts
 *   2. Review the auto-injected placeholder nav and refine as needed
 *   3. INSERT a row into public.spaces (slug, name)
 *   4. Run the seed at supabase/seeds/<slug>_demo.sql (or replace it with real data)
 *   5. Verify the nav on a DEEP route — not just the landing page
 */

import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// ---------- arg parsing --------------------------------------------------

const argv = process.argv.slice(2);
const positional = [];
let layout = "table";
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--layout") {
    layout = (argv[++i] ?? "").toLowerCase();
  } else if (a.startsWith("--layout=")) {
    layout = a.slice("--layout=".length).toLowerCase();
  } else {
    positional.push(a);
  }
}

const LAYOUTS = new Set(["table", "timeline", "kanban", "ledger", "calendar", "dashboard"]);
if (!LAYOUTS.has(layout)) {
  console.error(`Invalid --layout "${layout}". Must be one of: ${[...LAYOUTS].join(", ")}`);
  process.exit(1);
}

const [slugArg, sectionArg] = positional;
if (!slugArg) {
  console.error("Usage: node scripts/new-space.mjs <slug> [section] [--layout <shape>]");
  process.exit(1);
}

const slug = slugArg.toLowerCase().replace(/[^a-z0-9-]/g, "");
const section = (sectionArg ?? "overview").toLowerCase().replace(/[^a-z0-9-]/g, "");
const spaceDir = resolve(root, `src/app/(portal)/${slug}`);
const sectionDir = resolve(spaceDir, section);
const detailDir = resolve(sectionDir, "[id]");

if (existsSync(spaceDir)) {
  console.error(`Directory already exists: ${spaceDir}`);
  process.exit(1);
}

mkdirSync(detailDir, { recursive: true });

const capSlug = slug.charAt(0).toUpperCase() + slug.slice(1);
const capSection = section.charAt(0).toUpperCase() + section.slice(1);
const slugUpper = slug.toUpperCase().replace(/-/g, "_");

// ---------- layout.tsx + redirect page.tsx -------------------------------

writeFileSync(
  resolve(spaceDir, "layout.tsx"),
  `export const metadata = {
  title: "${capSlug} | Suprans",
};

// Pass-through. Shell is rendered by src/app/(portal)/layout.tsx.
// See SPACE_PATTERN.md §2.
export default function ${capSlug}Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
`,
);

writeFileSync(
  resolve(spaceDir, "page.tsx"),
  `import { redirect } from "next/navigation";

export default function ${capSlug}RootPage() {
  redirect("/${slug}/${section}");
}
`,
);

// ---------- list page — varies by layout ---------------------------------

function listPageTable() {
  return `import { PageHeader } from "@/components/shared/page-header";
import { KPIGrid } from "@/components/shared/kpi-grid";
import { MetricCard } from "@/components/shared/metric-card";
import { DetailCard } from "@/components/shared/detail-views";
import { EmptyState } from "@/components/shared/empty-state";
import { Box } from "lucide-react";

// Canonical table list page. See SPACE_PATTERN.md §3.
export default function ${capSlug}${capSection}Page() {
  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="${capSection}"
        subtitle="One sentence summarizing what's on this page."
      />

      <KPIGrid>
        <MetricCard label="Total" value={0} icon={Box} iconTone="blue" />
        <MetricCard label="Active" value={0} icon={Box} iconTone="emerald" />
        <MetricCard label="Pending" value={0} icon={Box} iconTone="amber" />
        <MetricCard label="Blocked" value={0} icon={Box} iconTone="red" />
      </KPIGrid>

      {/* wire up your data — replace with a <Table> or a client component driven by Supabase */}
      <DetailCard title="All ${section}">
        <EmptyState
          icon={Box}
          title="Nothing here yet"
          description="Connect this page to its data source."
        />
      </DetailCard>
    </div>
  );
}
`;
}

function listPageTimeline() {
  return `import { PageHeader } from "@/components/shared/page-header";
import { TimelineList } from "@/components/shared/timeline-list";

// Chronological entries view. See SPACE_PATTERN.md §3b.
export default function ${capSlug}${capSection}Page() {
  // Populate items from your table.
  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="${capSection}"
        subtitle="One sentence summarizing what's on this page."
      />

      <TimelineList
        items={[]}
        emptyMessage="No entries yet. Insert rows into your source table."
      />
    </div>
  );
}
`;
}

function listPageKanban() {
  return `import { PageHeader } from "@/components/shared/page-header";
import {
  KanbanBoard,
  type KanbanColumn,
  type KanbanCard,
} from "@/components/shared/kanban-board";

// Status-grouped swim lanes. See SPACE_PATTERN.md §3b.
const COLUMNS: KanbanColumn[] = [
  { key: "todo", label: "To do", tone: "slate" },
  { key: "in-progress", label: "In progress", tone: "amber" },
  { key: "in-review", label: "In review", tone: "blue" },
  { key: "done", label: "Done", tone: "emerald" },
];

export default function ${capSlug}${capSection}Page() {
  // Populate cards from your table.
  const cards: KanbanCard[] = [];

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="${capSection}"
        subtitle="One sentence summarizing what's on this page."
      />

      <KanbanBoard columns={COLUMNS} cards={cards} />
    </div>
  );
}
`;
}

function listPageLedger() {
  return `import { PageHeader } from "@/components/shared/page-header";
import { LedgerTable, type LedgerRow } from "@/components/shared/ledger-table";

// Money movements with running balance. See SPACE_PATTERN.md §3b.
export default function ${capSlug}${capSection}Page() {
  // Populate rows from your table. Set openingBalance to the balance carried
  // in from prior periods so the running balance is accurate from row 1.
  const rows: LedgerRow[] = [];

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="${capSection}"
        subtitle="One sentence summarizing what's on this page."
      />

      <LedgerTable
        rows={rows}
        openingBalance={0}
        emptyMessage="No transactions yet."
      />
    </div>
  );
}
`;
}

function listPageCalendar() {
  return `import { PageHeader } from "@/components/shared/page-header";
import { CalendarGrid } from "@/components/shared/calendar-grid";

// Date-bound events. See SPACE_PATTERN.md §3b.
export default function ${capSlug}${capSection}Page() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="${capSection}"
        subtitle="One sentence summarizing what's on this page."
      />

      <CalendarGrid
        year={year}
        month={month}
        render={() => {
          // Return a cell body for the given date (e.g. event pills).
          return null;
        }}
      />
    </div>
  );
}
`;
}

function listPageDashboard() {
  return `import { PageHeader } from "@/components/shared/page-header";
import { KPIGrid } from "@/components/shared/kpi-grid";
import { MetricCard } from "@/components/shared/metric-card";
import { DetailCard } from "@/components/shared/detail-views";
import { Box } from "lucide-react";

// Dashboard: KPIs + narrative cards, no primary table.
export default function ${capSlug}${capSection}Page() {
  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="${capSection}"
        subtitle="One sentence summarizing what's on this page."
      />

      <KPIGrid>
        <MetricCard label="Total" value={0} icon={Box} iconTone="blue" />
        <MetricCard label="Active" value={0} icon={Box} iconTone="emerald" />
        <MetricCard label="Pending" value={0} icon={Box} iconTone="amber" />
        <MetricCard label="Blocked" value={0} icon={Box} iconTone="red" />
      </KPIGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <DetailCard title="Summary">
          {/* Replace with your summary content. */}
          <div className="text-sm text-muted-foreground">Wire up your data.</div>
        </DetailCard>
        <DetailCard title="Recent activity">
          <div className="text-sm text-muted-foreground">Wire up your data.</div>
        </DetailCard>
      </div>
    </div>
  );
}
`;
}

const LIST_TEMPLATES = {
  table: listPageTable,
  timeline: listPageTimeline,
  kanban: listPageKanban,
  ledger: listPageLedger,
  calendar: listPageCalendar,
  dashboard: listPageDashboard,
};

writeFileSync(resolve(sectionDir, "page.tsx"), LIST_TEMPLATES[layout]());

// ---------- detail page --------------------------------------------------

writeFileSync(
  resolve(detailDir, "page.tsx"),
  `"use client";

import { useParams } from "next/navigation";
import { BackLink } from "@/components/shared/back-link";
import { HeroCard } from "@/components/shared/hero-card";
import { DetailCard, InfoRow } from "@/components/shared/detail-views";
import { Box } from "lucide-react";

// Canonical detail page. See SPACE_PATTERN.md §4.
export default function ${capSlug}${capSection}DetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <BackLink href="/${slug}/${section}" label="All ${section}" />

      <HeroCard
        title={\`${capSection} \${id}\`}
        subtitle="Replace with the real name + subtitle."
        icon={Box}
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
`,
);

// ---------- supabase seed template ---------------------------------------

const seedDir = resolve(root, "supabase/seeds");
mkdirSync(seedDir, { recursive: true });
const seedFile = resolve(seedDir, `${slug}_demo.sql`);
if (!existsSync(seedFile)) {
  writeFileSync(
    seedFile,
    `-- Demo seed for ${slug} space. Idempotent: gates each block on WHERE NOT EXISTS.
-- Replace with real data. Example:
--
-- insert into public.${slug}_items (slug, name)
-- select 'example', 'Example item'
-- where not exists (
--   select 1 from public.${slug}_items where slug = 'example'
-- );
--
-- Run from the Supabase SQL editor, or via:
--   psql "$DATABASE_URL" -f supabase/seeds/${slug}_demo.sql
`,
  );
}

// ---------- patch top-navigation.tsx -------------------------------------

const navPath = resolve(root, "src/components/layout/top-navigation.tsx");
const warnings = [];
let navPatched = false;
if (existsSync(navPath)) {
  let navSrc = readFileSync(navPath, "utf8");

  // 1. Append placeholder const before "const NAV_ITEMS"
  const navItemsMarker = "const NAV_ITEMS: NavItem[] =";
  const navItemsIdx = navSrc.indexOf(navItemsMarker);
  const placeholderConstName = `PLACEHOLDER_${slugUpper}`;
  const alreadyHasPlaceholder = navSrc.includes(`const ${placeholderConstName}`);

  if (navItemsIdx === -1) {
    warnings.push(
      `top-navigation.tsx: could not find "${navItemsMarker}" — skipped placeholder injection.`,
    );
  } else if (alreadyHasPlaceholder) {
    warnings.push(
      `top-navigation.tsx: ${placeholderConstName} already exists — skipped placeholder injection.`,
    );
  } else {
    const block = `const ${placeholderConstName}: NavItem[] = [
  {
    title: "Overview", url: "/${slug}", icon: LayoutDashboard,
    subItems: [
      { title: "Dashboard", url: "/${slug}" },
      { title: "Analytics", url: "/${slug}/analytics" },
    ],
  },
  {
    title: "${capSection}", url: "/${slug}/${section}", icon: Box,
    subItems: [
      { title: "All ${section}", url: "/${slug}/${section}" },
      { title: "Archived", url: "/${slug}/${section}/archived" },
    ],
  },
]

`;
    navSrc = navSrc.slice(0, navItemsIdx) + block + navSrc.slice(navItemsIdx);
    navPatched = true;
  }

  // 2. Add switch case before "default:"
  const defaultMarker = /([\t ]+)default:\s*return NAV_ITEMS/;
  const defaultMatch = navSrc.match(defaultMarker);
  const caseLineNeedle = `case "${slug}":`;
  if (!defaultMatch) {
    warnings.push(
      `top-navigation.tsx: could not find "default: return NAV_ITEMS" in switch — skipped case injection.`,
    );
  } else if (navSrc.includes(caseLineNeedle)) {
    warnings.push(
      `top-navigation.tsx: case "${slug}" already present — skipped case injection.`,
    );
  } else {
    const indent = defaultMatch[1];
    const caseLine = `${indent}case "${slug}": return ${placeholderConstName}\n`;
    navSrc = navSrc.replace(defaultMarker, `${caseLine}${defaultMatch[0]}`);
    navPatched = true;
  }

  // 3. Make sure LayoutDashboard + Box icons are imported. They already are
  //    in the canonical file; if not, warn instead of corrupting imports.
  for (const iconName of ["LayoutDashboard", "Box"]) {
    if (!new RegExp(`\\b${iconName}\\b`).test(navSrc)) {
      warnings.push(
        `top-navigation.tsx: "${iconName}" icon not found in imports — add it manually before this nav will compile.`,
      );
    }
  }

  if (navPatched) {
    writeFileSync(navPath, navSrc);
  }
} else {
  warnings.push(`top-navigation.tsx not found at ${navPath} — no nav wiring applied.`);
}

// ---------- post-scaffold console output ---------------------------------

console.log(`Scaffolded space at ${spaceDir}`);
console.log(`  layout.tsx           (pass-through)`);
console.log(`  page.tsx             (redirect -> /${slug}/${section})`);
console.log(`  ${section}/page.tsx        (list — layout: ${layout})`);
console.log(`  ${section}/[id]/page.tsx   (detail skeleton)`);
console.log(`  supabase/seeds/${slug}_demo.sql`);
if (navPatched) {
  console.log(`  top-navigation.tsx   (PLACEHOLDER_${slugUpper} + switch case injected)`);
}
if (warnings.length > 0) {
  console.log("");
  console.log("Warnings:");
  for (const w of warnings) console.log(`  - ${w}`);
}
console.log("");
console.log("Next steps:");
console.log(`  1. Register the space in src/lib/verticals-config.ts`);
console.log(`  2. Review PLACEHOLDER_${slugUpper} in top-navigation.tsx and refine sub-items`);
console.log(`  3. INSERT INTO public.spaces (slug, name) VALUES ('${slug}', '${capSlug}');`);
console.log(`  4. Seed supabase.space_plugin_settings for this space`);
console.log(`  5. Run supabase/seeds/${slug}_demo.sql (or replace it with real data)`);
console.log(`  6. Verify the nav on a DEEP route (e.g. /${slug}/${section}/some-id), not just the landing page`);
