# Space Pattern — the locked portal canon

> **Mandatory read before adding or modifying any portal space.** Companion to [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) which locks visual primitives; this document locks the *structural* pattern every space must follow.

---

## TL;DR

Every space follows the **same shape** as `/retailers` (B2B ecommerce). New spaces that reinvent the shell, roll their own hero headers, or import primitives from other spaces' `_components/` folders are **rejected by design**. If you need a new primitive, promote it to `src/components/shared/`.

---

## 1. Hierarchy

```
Portal shell (src/app/(portal)/layout.tsx)
 ├── SpaceDock (left)        — choose a space
 ├── TopNavigation           — menu items + sub-items for the active space
 ├── Main content area       — pages go here
 └── WorkspaceDock (right)   — plugins filtered by active space
```

- **Space** = top of the hierarchy. Each space has its own menu (registered in `src/components/layout/top-navigation.tsx`).
- **Menu item** = top-level group under a space, with one default URL and a set of sub-items.
- **Sub-item** = individual **list page** inside the space.
- **Detail page** = `/<space>/<section>/[id]/page.tsx` — full-page route, NOT a modal.
- **Row action** = icon or kebab menu pinned to each row in the list; opens the detail page.
- **Plugin** = universal page (tasks, chat, calendar, tickets…) launched from the right dock, **filtered to the current space via `space_slug`**.

---

## 2. Folder layout (required)

```
src/app/(portal)/<space>/
  layout.tsx                 — pass-through. Nothing bespoke. Just `return <>{children}</>`
  page.tsx                   — redirect to the first list page (e.g. /<space>/<default-section>)
  <section>/
    page.tsx                 — list page (skeleton below)
    [id]/
      page.tsx               — detail page (skeleton below)
  _components/               — optional, ONLY for space-specific components
```

**Hard rule**: never import from another space's `_components/`. If a component is useful in 2+ spaces, lift it to `src/components/shared/` (ESLint will enforce this — see §7).

---

## 3. List page skeleton (copy-paste)

```tsx
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { FilterBar } from "@/components/shared/filter-bar"
import { DetailCard } from "@/components/shared/detail-views"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"

export default function SomeListPage() {
  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Things"
        subtitle="One sentence summarizing what's on this page."
        actions={<Button>+ New thing</Button>}
      />

      <KPIGrid>
        <MetricCard label="Total" value={42} icon={Box} iconTone="blue" />
        <MetricCard label="Active" value={37} icon={Check} iconTone="emerald" />
        <MetricCard label="At risk" value={3} icon={AlertTriangle} iconTone="amber" />
        <MetricCard label="Blocked" value={2} icon={X} iconTone="red" />
      </KPIGrid>

      <FilterBar
        search={{ value: q, onChange: setQ, placeholder: "Search..." }}
        tabs={TABS}
        activeTab={tab}
        onTabChange={setTab}
        right={<Select>...</Select>}
      />

      <DetailCard title="All things">
        {rows.length === 0
          ? <EmptyState icon={Box} title="No results" description="Try adjusting your filters." />
          : <Table>…</Table>}
      </DetailCard>
    </div>
  )
}
```

**Required primitives**: `PageHeader`, `KPIGrid`+`MetricCard` (even if you only use 2), `FilterBar`, `DetailCard`, `StatusBadge`+`toneForStatus`, `EmptyState`.

**Row click → navigate to detail route** (`<Link href={\`/<space>/<section>/\${row.id}\`}>`). Not a modal.

---

## 4. Detail page skeleton

```tsx
import { BackLink } from "@/components/shared/back-link"
import { HeroCard } from "@/components/shared/hero-card"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"

export default function SomeDetailPage() {
  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <BackLink href="/<space>/<section>" label="All things" />

      <HeroCard
        title={row.name}
        subtitle={row.subtitle}
        icon={Box}
        actions={
          <>
            <Button variant="outline" size="sm">Edit</Button>
            <Button variant="outline" size="sm">Export</Button>
            <Button size="sm">Primary action</Button>
          </>
        }
        meta={<StatusBadge tone={toneForStatus(row.status)}>{row.status}</StatusBadge>}
      />

      <KPIGrid>
        {/* thing-specific metrics */}
      </KPIGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <DetailCard title="Overview">
            <InfoRow label="Created" value={row.created_at} />
            <InfoRow label="Owner" value={row.owner} />
          </DetailCard>
          <DetailCard title="Activity">…</DetailCard>
        </div>
        <div className="space-y-5">
          <DetailCard title="Quick stats">…</DetailCard>
          <DetailCard title="Related">…</DetailCard>
        </div>
      </div>
    </div>
  )
}
```

Rules:
- Every detail page lives at `/<space>/<section>/[id]` (or `[slug]`).
- Actions (edit / delete / export / primary) go in the `HeroCard.actions` prop — **never inline in the page body**.
- Sidebar = 1 column; main = 2 columns; stacked on mobile.

---

## 5. Row-level actions

- Primary row action = **row click → detail route**.
- Secondary actions (2-3 max visible) = icon buttons in the last column (pinned, not scrolled).
- 4+ actions = a kebab-menu dropdown as the last column.
- Never put row actions in a floating toolbar that appears on hover — discoverability is bad.

---

## 6. Right-dock plugins

The `WorkspaceDock` (`src/components/layout/workspace-dock.tsx`) renders a list of **plugins** on every portal page. Plugins are just pages (tasks, chat, calendar, tickets, inbox, notifications, …) but they always:

1. Read the **current space** via `useActiveSpace().slug`.
2. Filter their data by `space_slug = <current>`.
3. Respect `public.space_plugin_settings(space_slug, plugin_key, enabled)` — if a plugin is disabled for a space, the dock hides it from that space.

**Required**: every plugin table (e.g. `public.tasks`, `public.notifications`, `public.comments`, `public.mentions`, `public.calendar_events`, `public.tickets`) MUST have a `space_slug text NOT NULL` column with an index.

To opt a space out of a plugin: `UPDATE space_plugin_settings SET enabled=false WHERE space_slug='...' AND plugin_key='...'`.

---

## 7. Anti-patterns (auto-rejected)

❌ Importing from another space's `_components/` (ESLint rule enforces this).
❌ Hand-rolling a hero/header card — use `HeroCard`.
❌ Inline `<h1>` with bespoke classes — use `PageHeader`.
❌ Custom `<div className="rounded-lg border p-4">` for cards — use `DetailCard`.
❌ Inline `text-red-500` / `text-green-600` for status — use `StatusBadge` + `toneForStatus()`.
❌ Detail-view-as-modal for any entity with its own identity — use full-page detail routes.
❌ Space-local `formatCurrency` / `formatDate` — import from `@/lib/format.ts`.
❌ Sub-nav bands inside `<space>/layout.tsx` — TopNavigation handles sub-items.
❌ Padding on the page shell — the portal layout sets it; pages just use `space-y-5`.
❌ Inline hex colors (`#ABCDEF`) — use tailwind semantic tokens.
❌ Plugin pages that don't filter by `space_slug` — they're universal surfaces scoped per space.

---

## 8. Scaffolding a new space

```bash
node scripts/new-space.mjs <slug>
```

This generates:
- `src/app/(portal)/<slug>/layout.tsx` (pass-through)
- `src/app/(portal)/<slug>/page.tsx` (redirect)
- `src/app/(portal)/<slug>/<default-section>/page.tsx` (compliant list page)
- `src/app/(portal)/<slug>/<default-section>/[id]/page.tsx` (compliant detail page)
- A migration seeding the space in `public.spaces` and default `public.space_plugin_settings` rows.

You then:
1. Register the space in `src/lib/verticals-config.ts`.
2. Add its menu entries to `src/components/layout/top-navigation.tsx`.
3. Fill in real queries in the scaffolded pages.
4. Flip any unneeded plugin rows to `enabled=false`.

---

## 9. Reference space: B2B ecommerce (`/retailers`)

Use as the canonical example. Specifically:
- `src/app/(portal)/retailers/directory/[id]/page.tsx` — detail page blueprint.
- `src/app/(portal)/orders/all/page.tsx` — list page blueprint.

Copy the shape, change the data.

---

## 10. Enforcement

| Violation | Caught by |
|---|---|
| Cross-space `_components/` import | ESLint `no-restricted-imports` |
| Missing shared primitive | code review against §3/§4 skeletons |
| Plugin page not filtering by `space_slug` | manual review; will be promoted to a lint rule |
| Inline hex / raw `<h1>` / modal-as-detail | code review against §7 |

**If in doubt**: re-read this file, match B2B, promote the primitive.
