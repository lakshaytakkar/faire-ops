# faire-ops portal design canon

This is the locked design system for every space inside the portal (`/orders`, `/retailers`, `/catalog`, `/finance`, `/ets`, `/development`, etc.). Divergence is a bug. When you need a pattern that isn't here, either extend a shared primitive or add a new one — never reinvent inline.

> **Companion**: [SPACE_PATTERN.md](./SPACE_PATTERN.md) locks the structural shape every space must follow (folder layout, list/detail skeletons, right-dock plugin rules). Read it before adding or modifying a space. This file covers primitives and tokens; SPACE_PATTERN.md covers page structure.

Reference implementations to study before touching new code:
- `src/app/(portal)/orders/all/page.tsx` — canonical index with KPIs + filter bar + table
- `src/app/(portal)/retailers/directory/[id]/page.tsx` — canonical detail page structure
- `src/app/(portal)/development/page.tsx` — overview/hub with mixed KPI + rollup + feed
- `src/app/(portal)/development/projects/[slug]/page.tsx` — detail + SubNav-style tabs + LargeModal

---

## 1. Shell & layout

- **Container**: every page wraps in `max-w-[1440px] mx-auto w-full space-y-5`.
- **Outer padding**: set by the space layout (e.g., `/development/layout.tsx`) via `p-6 md:p-8`. Pages should NOT repeat padding.
- **Vertical rhythm between sections**: `space-y-5` (cards), `space-y-8` (section groups).
- **Card padding**: `p-5` standard, `p-4` compact, `p-3` tight.
- **Grid gaps**: `gap-3` tight, `gap-4` default, `gap-5` loose.
- **Responsive**: start single-column, escalate at `md:` or `lg:`. Metrics always `grid-cols-2 lg:grid-cols-4`.

## 2. Typography

| Element | Class | Notes |
|---|---|---|
| H1 (page title) | `text-2xl font-bold font-heading text-foreground` | exactly one per page, in `PageHeader` |
| H2 / card title | `text-[0.9375rem] font-semibold tracking-tight` | used by `DetailCard` header |
| H3 / sub | `text-sm font-semibold leading-snug` | card/row titles |
| Section eyebrow | `text-xs font-semibold uppercase tracking-wider text-muted-foreground` | optional above H2 |
| Body | `text-sm` | table cells, descriptions, modal body |
| Micro / label | `text-xs font-medium text-muted-foreground` | KPI labels, metadata, timestamps |
| Metric numeral | `text-2xl font-bold font-heading tabular-nums` | inside `MetricCard` |
| Mono | `font-mono` (+ `text-xs` usually) | SHAs, IDs |

Weights: bold/semibold for headings + numbers + active states; medium for labels + nav; normal for body.

Never:
- Write a raw `<h1>` with bespoke classes — always use `PageHeader`.
- Use `text-xl` or `text-3xl` for page titles — only `text-2xl`.
- Use a different heading font than `font-heading`.

## 3. Color tokens

Defined in `src/app/globals.css` as HSL CSS vars (Tailwind v4 `@theme inline`). Use the semantic names, never hardcoded hex.

Core:
- `bg-background`, `bg-card`, `bg-muted`
- `text-foreground`, `text-muted-foreground`, `text-primary`
- `border-border/80` (standard border), `border-input` (form inputs)

Semantic status palette — always `bg-{tone}-50 text-{tone}-700 ring-{tone}-200` for pill/badges (handled by `StatusBadge`):
- `emerald` — success, live, shipped, ready, completed
- `amber` — warning, building, in-progress, queued, planned
- `red` — danger, failed, error, at_risk, blocked
- `blue` — info, planning, in-review
- `violet` — neutral-positive, deferred
- `slate` — inactive, archived, fallback

## 4. Shared primitives (single source of truth)

All live under `src/components/shared/`. Before adding a new inline pattern, check if one of these fits. If something is used 3+ times, promote it into this folder.

| Component | File | When to use |
|---|---|---|
| `PageHeader` | `page-header.tsx` | every page — title + subtitle + actions + breadcrumbs |
| `KPIGrid` + `MetricCard` | `kpi-grid.tsx`, `metric-card.tsx` | KPI strip above filter bar |
| `FilterBar` | `filter-bar.tsx` | search + tabs + right-side select cluster |
| `EmptyState` | `empty-state.tsx` | zero-result panels |
| `StatusBadge` + `toneForStatus()` | `status-badge.tsx` | any status/kind/priority pill |
| `FullPageDetail`, `DetailCard`, `InfoRow`, `LargeModal`, `QuickDetailModal`, `PreviewPanel` | `detail-views.tsx` | detail-page shell + section cards + modals |
| `SubNav` | `sub-nav.tsx` | internal navigation between related sub-routes |
| `PageResourcesButton` | `page-resources.tsx` | top-right reference menu |
| `ChecklistDot` | `checklist-dot.tsx` | green/red dot for boolean readiness checks (publish checklists, QA grids) |
| `DiffCard` | `diff-card.tsx` | side-by-side original vs AI suggestion with Accept / Reject / Re-roll |

Space-specific primitives (do not promote globally):
- `src/components/development/dev-primitives.tsx` — `StatusPill`, `HealthDot`, `VentureBadge`, `ventureMeta`, `relativeTime`, `TechStack`, `SectionHeader`. `StatusPill` wraps `StatusBadge`.
- `src/app/(portal)/ets/_components/ets-ui.tsx` — ETS-flavoured primitives. Being progressively replaced by shared primitives; do not add new patterns here.

## 5. Canonical page skeletons

**Index page**
```tsx
<div className="space-y-5">
  <PageHeader title="…" subtitle="…" actions={<Button …/>} />
  <KPIGrid>
    <MetricCard label="…" value={…} icon={…} iconTone="…"/>
    … (3 more)
  </KPIGrid>
  <FilterBar search={…} tabs={…} activeTab={…} onTabChange={…} right={…} />
  <DetailCard title="…"> …table or grid… </DetailCard>
</div>
```

**Detail page**
```tsx
<div className="max-w-[1440px] mx-auto w-full space-y-5">
  <BackLink />
  <HeroCard /* title + badges + actions + 6-col KPI strip */ />
  <FilterBar tabs={[Overview, …]} activeTab={tab} onTabChange={setTab} />
  { tab === "overview" && <DetailCard>…</DetailCard> }
  { /* other tabs */ }
  { selected && <LargeModal title={…} onClose={…}> …InfoRow cards… </LargeModal> }
</div>
```

## 6. Data access rules

- **Server components**: read directly via `@/lib/supabase` (or dedicated schema client: `supabaseB2B`, `supabaseEts`, `supabaseSuprans`, `supabaseUsdrop`). Prefer `export const dynamic = "force-dynamic"` on dashboards/feeds.
- **Client components**: only for interactive state (filters, tabs, modals). They must receive data via props, not re-query.
- **Shared data helpers**: `src/lib/projects.ts`, `src/lib/use-faire-data.ts`, `src/lib/vercel.ts`. Reuse before writing new queries.
- **No React Query** — use native async + `useMemo`/`useState` for client-side filtering.

## 7. Motion & modals

- Use `LargeModal` / `QuickDetailModal` / `PreviewPanel` from `detail-views.tsx`. Do not roll your own overlay.
- Hover/active transitions: `transition-colors`, `transition-shadow`, `hover:shadow-md`, `active:translate-y-px`.
- Loading skeletons: `animate-pulse`.
- No Framer Motion in portal pages.

## 8. Anti-patterns (do not do)

- ❌ Inline metric cards with custom padding/border — always `MetricCard`.
- ❌ Hand-rolled filter bars with `<input type="search">` + tabs — always `FilterBar`.
- ❌ Hardcoded hex colors (`#3B82F6`, `text-red-500` for status) — use `StatusBadge` + semantic palette.
- ❌ Raw `<h1>` + bespoke `text-xl font-semibold` — always `PageHeader`.
- ❌ Static data arrays embedded in page files for content the user expects to be live (roadmap, changelog, deploys) — back it with Supabase tables.
- ❌ `EtsListShell` in non-ETS spaces — it's being retired. Use `PageHeader` + `space-y-5`.
- ❌ Creating a new `Sheet`/`Dialog` wrapper per feature — extend a shared primitive.
- ❌ Loading state via `{ loading ? <Skeleton/> : <Content/> }` scattered across components — prefer server components with `force-dynamic`.

## 9. Status badges — tone mapping cheat-sheet

Always call `StatusBadge` with `tone={toneForStatus(value)}` to get correct colors automatically. The mapping lives in `src/components/shared/status-badge.tsx` and covers: live/active/ready/shipped/completed/done/resolved/approved/paid → emerald; building/in-progress/pending/queued/planned → amber; error/failed/at_risk/blocked/critical/cancelled → red; planning/in-review → blue; deferred → violet; inactive/archived/deprecated/on-hold/not-started → slate.

If you find a status value that maps to the wrong tone, update `DEFAULT_MAP` in `status-badge.tsx` — don't paper over it with inline overrides.

## 10. Extending the canon

New pattern used 3+ times → promote into `src/components/shared/` with a clear prop contract and a line in the table above. Update this document at the same commit. Any PR that breaks the canon without updating the doc should be rejected on review.
