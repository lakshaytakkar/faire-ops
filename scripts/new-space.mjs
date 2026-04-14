#!/usr/bin/env node
/**
 * Scaffold a compliant portal space. See SPACE_PATTERN.md.
 *
 * Usage:  node scripts/new-space.mjs <slug> [section]
 * Example: node scripts/new-space.mjs retail directory
 *
 * Generates:
 *   src/app/(portal)/<slug>/layout.tsx             — pass-through
 *   src/app/(portal)/<slug>/page.tsx               — redirect to <section>
 *   src/app/(portal)/<slug>/<section>/page.tsx     — list skeleton
 *   src/app/(portal)/<slug>/<section>/[id]/page.tsx — detail skeleton
 *
 * You still need to:
 *   1. Register the space in src/lib/verticals-config.ts
 *   2. Add menu entries in src/components/layout/top-navigation.tsx
 *   3. Insert a row into public.spaces (slug, name)
 *   4. public.space_plugin_settings is seeded automatically by the existing
 *      cross-join query when you add the space (re-run the Phase D seed
 *      migration or INSERT manually).
 */

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const [, , slugArg, sectionArg] = process.argv;
if (!slugArg) {
  console.error("Usage: node scripts/new-space.mjs <slug> [section]");
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

writeFileSync(
  resolve(sectionDir, "page.tsx"),
  `import { PageHeader } from "@/components/shared/page-header";
import { KPIGrid } from "@/components/shared/kpi-grid";
import { MetricCard } from "@/components/shared/metric-card";
import { DetailCard } from "@/components/shared/detail-views";
import { EmptyState } from "@/components/shared/empty-state";
import { Box } from "lucide-react";

// Canonical list page. See SPACE_PATTERN.md §3.
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
`,
);

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

console.log(`Scaffolded space at ${spaceDir}`);
console.log("Next steps:");
console.log(`  1. Register in src/lib/verticals-config.ts`);
console.log(`  2. Add menu entries in src/components/layout/top-navigation.tsx`);
console.log(`  3. INSERT INTO public.spaces (slug, name) VALUES ('${slug}', '${capSlug}');`);
console.log(`  4. Seed public.space_plugin_settings for this space.`);
