<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Portal design canon — read this before touching any portal page

The authoritative portal design rules live in `DESIGN_SYSTEM.md` at the repo root. Every portal space (`/orders`, `/retailers`, `/catalog`, `/finance`, `/ets`, `/development`, and any future space) must follow it:

- **Shell**: `max-w-[1440px] mx-auto w-full space-y-5`
- **Heading scale**: H1 = `text-2xl font-bold font-heading`; card titles = `text-[0.9375rem] font-semibold tracking-tight`
- **Typography (strict)**: no `font-mono` on user-visible content; no `text-xs` outside badges/metadata; no `text-[10px]` or `text-[11px]` anywhere; body copy `text-sm` minimum; numeric columns use `tabular-nums`. Full rules in `docs/SPACE_ARCHITECTURE.md` § Typography.
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
- Layout variants + nav engine rules — see SPACE_PATTERN.md §2b and §3b.

Scaffold a new space with `node scripts/new-space.mjs <slug>` once it exists. For now, copy the B2B `/retailers` pattern.

# Agent roster & Claude work logging

Specialized agents live in `.claude/agents/` — see `.claude/agents/README.md` for the full roster. Key rules:

- **Real data only.** Never seed fake rows. If a source file has gaps, leave NULL + mark the checklist item `blocked`. Enforced by the `data-seeder` and `real-data-auditor` agents.
- **Typography/primitives strict.** Run `design-system-enforcer` before any major UI ship.
- **Deploy via `deploy-agent`.** Always `--archive=tgz`; always alias; always log to `public.deployment_events`.
- **Projects have checklists.** Before marking a project `live`, invoke `checklist-enforcer` on its row in `public.project_checklists`. The gate fails on any unticked required item.

## Work-logger rule (mandatory)

After **any major change Claude ships in this repo**, invoke the `work-logger` agent to write to `public.tasks` + `public.claude_work_log`. A change is **major** if any of:

- New page file
- New DB table or migration
- Deploy to prod
- Refactor touching ≥3 files
- >50 LOC across ≥2 files
- Multi-step feature

Minor changes (typos, single-line fixes, <30 LOC single-file edits, formatting) should still get a `claude_work_log` row with `minor: true` — but are excluded from the daily digest at `/development/claude-log`. Never fabricate a log entry. If a change didn't happen, don't log it.

## Meta-infrastructure tables (read-only references)

- `public.project_types` — 5 rows (admin-space, plugin, client-portal, mobile-app, landing-page).
- `public.projects` — every in-flight project, typed via `project_type_id`.
- `public.project_checklists` — per-project checklist instance; items jsonb.
- `public.checklist_templates` — per-type template.
- `public.domains`, `public.integrations`, `public.ai_tools`, `public.automations`, `public.ui_kits`, `public.vault_refs` — ops registries.
- `public.claude_work_log` — Claude's own audit trail.

Admin UI for all of the above lives under `/development/*`.
