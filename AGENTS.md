<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Portal design canon — read this before touching any portal page

The authoritative portal design rules live in `DESIGN_SYSTEM.md` at the repo root. Every portal space (`/orders`, `/retailers`, `/catalog`, `/finance`, `/ets`, `/development`, and any future space) must follow it:

- **Shell**: `max-w-[1440px] mx-auto w-full space-y-5`
- **Heading scale**: H1 = `text-2xl font-bold font-heading`; card titles = `text-[0.9375rem] font-semibold tracking-tight`
- **Shared primitives** (do not reinvent inline): `PageHeader`, `KPIGrid` + `MetricCard`, `FilterBar`, `EmptyState`, `StatusBadge`, plus `FullPageDetail` / `DetailCard` / `InfoRow` / `LargeModal` from `src/components/shared/`
- **Status colors**: always via `StatusBadge` with `toneForStatus(value)` — no hardcoded hex
- **Data**: server components read directly from Supabase (`@/lib/supabase`); client components receive via props
- **No mock arrays in page files**: if the user expects data to be editable (roadmap, changelog, deploys), back it with a Supabase table

If a pattern is used 3+ times, promote it into `src/components/shared/` with a prop contract and update `DESIGN_SYSTEM.md`. Reviewers should reject PRs that break the canon without updating the doc.

# Space structure — read this before adding or modifying a portal space

The authoritative **structural** rules for every portal space (folder layout, list/detail page skeletons, right-dock plugin scoping, anti-patterns) live in `SPACE_PATTERN.md` at the repo root. `DESIGN_SYSTEM.md` governs primitives; `SPACE_PATTERN.md` governs space shape.

Quick rules:
- Each space has a pass-through `layout.tsx`, a `page.tsx` that redirects to its first list, list pages at `/<space>/<section>/page.tsx`, detail pages at `/<space>/<section>/[id]/page.tsx`.
- List page skeleton: `PageHeader` → `KPIGrid` → `FilterBar` → `DetailCard`.
- Detail page skeleton: `BackLink` → `HeroCard` → `KPIGrid` (optional) → 2-col grid of `DetailCard`s.
- Format helpers come from `@/lib/format` (never from another space's `_components/`).
- Right-dock plugin tables must have `space_slug`. Plugin pages filter by `useActiveSpace().slug`.
- Cross-space imports from `@/app/(portal)/<space>/_components/*` are ESLint errors — promote to `src/components/shared/` first.

Scaffold a new space with `node scripts/new-space.mjs <slug>` once it exists. For now, copy the B2B `/retailers` pattern.
