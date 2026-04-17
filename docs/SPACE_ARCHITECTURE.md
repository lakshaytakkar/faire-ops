# Space architecture & cross-space consistency

Canonical reference for how spaces, the right-dock universal modules, and the `?space=` URL param fit together. **Read this before adding a new space, a new universal module, or a new schema-bound resource.**

## The model

- **Spaces** are top-level workspaces — `b2b-ecommerce` (Faire Wholesale Admin), `hq`, `ets`, `legal`, `goyo`, `usdrop`, `eazysell`, `toysinbulk`, `suprans-app`, `development`, `jsblueridge` (JSBlueridge Admin), `b2b-ecosystem` (B2B Ecosystem — Toyarina.com + Gullee.com D2C). One row per space in `public.spaces`. The left dock (`SpaceDock`) lists them.
- **Universal modules** are tools that exist for every space — calendar, tasks, chat, tickets, inbox, comms, research, training, knowledge, links, files, automations, analytics, AI tools, gmail, settings. The right dock (`WorkspaceDock`) lists them.
- The portal layout is `LeftDock | TopNav + main | RightDock`. Padding comes from `<main className="px-3 py-3 md:px-5 md:py-4 lg:px-6">` in `(portal)/layout.tsx`. **Per-space layouts must NOT add their own padding** — they should be pass-throughs (`return <>{children}</>`).

## Active-space resolution

The active space is resolved by `useActiveSpace()` (`src/lib/use-active-space.ts`). Rules, in order:

1. If pathname starts with a known space prefix (`/hq`, `/ets`, `/usdrop`, etc.), that space wins.
2. If pathname is a B2B-shared module (`/workspace`, `/operations`, `/automations`, `/analytics`, `/dashboard`, `/overview`, `/orders`, `/catalog`, `/retailers`, `/marketing`, `/finance`, `/reports`) AND `?space=` param is present, the param wins.
3. Otherwise, `b2b-ecommerce`.

**Anything that displays "active space" must call `useActiveSpace()`** — never `getActiveSpaceSlug(pathname)` alone, because path-only resolution returns `b2b-ecommerce` for shared modules and ignores the param.

## Right-dock navigation rules

`WorkspaceDock` resolves each item's href via `resolveHref(item, activeSlug)`. Three cases, in order:

1. **Native override** — if `SPACE_MODULE_OVERRIDES[activeSlug][item.module]` is set, use that. The user gets a real CRUD page inside their space.
2. **B2B legacy** — if active space is `b2b-ecommerce`, use the legacy href as-is.
3. **`?space=` fallback** — for every other space, append `?space=<slug>` to the legacy href.

**When you ship a native module page in a space**, add it to `SPACE_MODULE_OVERRIDES`:

```ts
const SPACE_MODULE_OVERRIDES = {
  usdrop: {
    tickets: "/usdrop/tickets",
    emails: "/usdrop/email",
  },
}
```

## Universal pages reading `?space=`

If you build/maintain a `/workspace/*` (or `/operations/*`, `/analytics/*`) page that's shared across spaces:

- Read the param via `useActiveSpace().slug` (client) or `resolveActiveSpace(pathname, searchParams)` (server).
- Pick the right Supabase client / schema / table for that space:
  ```ts
  function dbForSpace(slug: string) {
    if (slug === "usdrop") return supabaseUsdrop
    if (slug === "ets") return supabaseEts
    if (slug === "suprans") return supabaseSuprans
    return supabase  // b2b-ecommerce → public schema
  }
  ```
- Filter visible data to the active space. If the schema doesn't have an equivalent table, render a friendly empty state with a link to the space's native page.

## Per-space layout rules

- **No `<div className="p-6 md:p-8">` wrappers in space layouts.** The portal main provides padding.
- Pages use the shared shell from `src/components/shared/`:
  - `PageHeader` for the title block
  - `KPIGrid` + `MetricCard` for stats rows
  - `EmptyState` when there's no data
  - `StatusBadge` + `toneForStatus(value)` for status pills (never raw `<Badge>` for status)
- Page wrapper is `<div className="space-y-5">`.

## Bugs we already hit (and prevented recurring)

| Bug | Why | Prevention |
|---|---|---|
| Right dock yanked user out of USDrop when clicking Tickets | Right dock had no space-aware override | `SPACE_MODULE_OVERRIDES` in `workspace-dock.tsx` |
| Left dock highlighted B2B even on `/workspace/x?space=usdrop` | `SpaceDock` used `getActiveSpaceSlug(pathname)` only — ignored param | `SpaceDock` now uses `useActiveSpace()` |
| Development pages had more padding than B2B / ETS | `development/layout.tsx` added its own `p-6 md:p-8` | Layout is pass-through; padding only in portal main |
| `/development/overview` 404 after consolidation | Page moved without redirect | Always add a redirect when moving routes |
| Native admin pages drifted from ETS visual grammar | No shared canon | Use `src/components/shared/*` primitives |

## Typography rules — strictly enforced

Readability across spaces is load-bearing. Reviewers reject PRs that break these:

- **No `font-mono` on user-visible page content.** Mono is only allowed for: code snippets inside docs pages, a truly fixed-width identifier column (transaction hash, commit SHA, UUID) and even there a regular-font copy-button is preferred. Default to `font-sans` (Plus Jakarta Sans). Never use mono for body copy, headings, KPI values, status labels, empty-state descriptions, breadcrumbs, or navigation.
- **No micro text.** Absolute minimum font sizes:
  - Body copy / row content: `text-sm` (14px). Never `text-xs` (12px) except inside `<Badge>`, `<StatusBadge>`, or metadata labels like "last updated 2h ago".
  - Section labels / breadcrumbs: `text-sm` or larger.
  - Card titles: `text-base` (16px) minimum — use the shared canonical `text-[0.9375rem] font-semibold tracking-tight` from the design canon, never smaller.
  - Page titles (H1): `text-2xl font-bold font-heading` — PageHeader enforces this.
- **Never use `text-[10px]` or `text-[11px]` anywhere.** Those hit font rendering cliffs on Windows/Linux. If the designer asks for tighter, use a smaller padding + `text-xs` — or rethink the density.
- **Tabular numbers** always use `tabular-nums`. Metrics, currencies, percentages, durations — all of them.
- **Status labels** always render through `StatusBadge` (`text-xs` inside is fine because it's a badge). Never roll a custom pill.
- If a table row feels too cramped, increase `py-N` on the cell, not decrease the `text-sm`. Typography stays.

## Checklist before shipping a new space or module

- [ ] Space layout is a pass-through. No padding wrappers.
- [ ] Pages use `PageHeader` + `KPIGrid` + `MetricCard` + `EmptyState` + `StatusBadge`.
- [ ] Every native universal-module page has an entry in `SPACE_MODULE_OVERRIDES`.
- [ ] Universal `/workspace/*` pages call `useActiveSpace()` and filter to the right schema.
- [ ] If you renamed/moved a route, the old URL has a redirect.
- [ ] Status colors come from `StatusBadge` + `toneForStatus(value)`. No hardcoded hex.
- [ ] Empty-state copy describes business meaning, not the schema.
- [ ] No `font-mono` on user-visible page content (see typography rules above).
- [ ] No `text-xs` outside badges/metadata. No `text-[10px]` / `text-[11px]` anywhere.
- [ ] All numeric columns use `tabular-nums`.
