# Deferred Phases — Master Execution Plan

**Date:** 2026-04-10
**Branch:** `team-portal-restructure`
**Author:** Claude / Lakshay

This document records the two phases of the master execution plan that we **deliberately did not execute**, with the reasoning. These are not bugs or omissions — they are conscious deferrals.

---

## Phase 2 — Monorepo (pnpm workspaces + Turborepo)

### What the guide proposed
Convert the repo into a pnpm workspace with `apps/portal`, `apps/legalnations-web`, `packages/ui`, `packages/db`, `packages/utils`, etc. — managed by Turborepo.

### Why we deferred it

1. **We currently have ONE app**, not multiple. A monorepo before there's anything to share is pure overhead.
2. **Switching from `npm` → `pnpm` is risky.** It would invalidate `package-lock.json`, change `node_modules` layout, and the Vercel deploy would need its install command updated. We just shipped `v2.0-stable` on the existing setup — not worth disturbing.
3. **No code is shared today.** There's no UI library, no shared schema, no shared utils — everything lives inside the single Next.js app. Extracting them prematurely creates abstractions that don't match real usage patterns yet.
4. **Vercel single-project simplicity.** Right now we're one Vercel project, one domain, one cron config. Going multi-app would split this into N projects, each with its own env vars, each with its own cron — and we'd have to coordinate them.
5. **No external apps exist yet.** Guide 04 lists 7 external apps (legalnations.com, vendor.usdropai.com, etc.) — every single one is `status: 'planned'`, none built. There's nothing to monorepo-ize.

### When to revisit
The day we actually start building **the second app** (e.g. `legalnations.com` static landing page or `vendor.usdropai.com` vendor portal). At that point:
1. Create the new app as a separate Vercel project from a new directory
2. If we end up sharing real code (e.g. a `<Logo>` component, Supabase client config, auth helpers), THEN extract to packages
3. If sharing grows past ~3 packages, THEN migrate to pnpm + Turborepo
4. The current `apps/portal` doesn't need to move first — it can sit at the repo root indefinitely and still work alongside a monorepo structure

### Cost of deferring
**Zero.** We can convert at any future date with the same effort. The structural refactor doesn't get easier or harder by waiting.

---

## Phase 7 — Schema Migration (`public.* → b2b.*`)

### Status: COMPLETE
- ✅ **Phase B (empty schemas)** — DONE on 2026-04-10. The 7 schemas `b2b`, `hq`, `legal`, `goyo`, `usdrop`, `vendor`, `client` exist with `USAGE` granted.
- ✅ **Phase C (actual table migration)** — DONE on 2026-04-10 via `ALTER TABLE SET SCHEMA` + auto-updatable forwarding views in `public`. All 28 Faire/B2B tables physically moved to `b2b.*`. Verified preserved: 1,815 orders, 4,487 products, 7 stores, $330,359.73 all-time revenue, all RLS policies, all FKs (incl. cross-schema `public.user_brand_access → b2b.faire_stores`). Zero file edits in app code — `supabase.from("faire_orders")` continues to work via the views.
- ⚠️ **Phase C cleanup (drop forwarding views in public)** — Still deferred. Dropping the views would require updating all ~150 `supabase.from(...)` call sites to `supabase.schema('b2b').from(...)` AND adding `b2b` to Supabase's exposed schemas in the dashboard. The views cost nothing functionally and provide a safety net, so they stay.

The original "deferred" reasoning below is preserved for historical context but no longer applies to the table-move step.

### What the guide proposed
Move every Faire/B2B-specific table from the `public` schema into a new `b2b` schema (and create empty `hq`, `legal`, `goyo`, `vendor`, `client` schemas for future use).

### Why we deferred it

1. **30 tables would need to move**, including the two largest in the database (`faire_products` 36MB, `faire_orders` 15MB). Each table has its own RLS policies, foreign keys, indexes, and views.

2. **~150+ files would need code changes.** Every Supabase JS client call in our codebase looks like:
   ```ts
   supabase.from("faire_orders").select(...)
   ```
   In a multi-schema world it becomes:
   ```ts
   supabase.schema("b2b").from("faire_orders").select(...)
   ```
   That's a mechanical change, but it touches every page, every API route, every cron, every hook.

3. **The compatibility-view path is brittle.** Creating `public.faire_orders` as a `VIEW` of `b2b.faire_orders` would let the existing code keep working without changes. But:
   - Views can't be inserted into without `INSTEAD OF` triggers (lots of code does inserts/upserts)
   - RLS through views gets confusing — `auth.uid()` evaluation differs
   - Drizzle / supabase-js generates types from `public.*` tables — view-shaped tables break type safety
   - Foreign keys can't reference views, so cross-table joins get weird

4. **Zero benefit until a second schema's data exists.** Schema isolation pays off when you have, say, `b2b.orders` AND `legal.cases` AND `goyo.bookings` and you need RLS to enforce that a Legal user never sees a B2B order. But right now the database has only B2B data — there is nothing to isolate it from.

5. **High blast radius.** The master plan's own Phase 7 acknowledges this is HIGH RISK and recommends a 7-day `_deprecated_YYYYMMDD` window before any DROP. That's a week of carrying both old and new tables in production.

### When to revisit
The day we actually add a second space's data — e.g. when LegalNations Admin starts persisting client cases. At that point:
1. Create the `legal` schema FIRST (empty)
2. Create `legal.clients`, `legal.cases`, etc. as **net-new** tables in the `legal` schema (not `public`)
3. Add RLS policies that key off `user_space_roles` from day one
4. Leave existing `public.faire_*` tables alone — they remain the implicit "B2B" schema
5. **Only IF cross-space coupling becomes a real problem** (e.g. an internal user needs different brand access by space), THEN do the migration the master plan describes — but at that point we can scope it down to just the tables that actually need RLS coordination

### Cost of deferring
**Zero today.** When we do execute this in the future, the cost is roughly the same as it would be now — the table count and the number of file references both grow as we build, so doing it earlier might even be cheaper than later. **But** it's strictly cheaper than zero only if there's a benefit, and there isn't one yet.

### What WE DID do that future-proofs Phase 7
Phase 4 of this restructure already added:
- `public.user_space_roles` — keyed by `space_slug`, ready to be referenced by RLS policies
- `public.user_brand_access` — for fine-grained brand-level access inside the B2B space
- `user_type` and `last_space` columns on `public.users`
- The `public.spaces` table seeded with all 5 spaces

So when Phase 7 IS justified, the foundational tables it depends on are already in place. The migration becomes purely about moving data, not building infrastructure.

---

## Summary

| Phase | Status | Reason | When to revisit |
|---|---|---|---|
| Phase 2 — Monorepo | Deferred | One app today, zero shared code | Day we build a second app |
| Phase 7 — Schema migration | Deferred | One space's data, zero isolation benefit | Day we build a second space's data |

Both are **structural** decisions that scale with our needs. Neither is "skipped" — they are explicitly tracked here so we don't accidentally start either without a real reason.

---

## What WAS executed in this restructure session

| Phase | Status | Notes |
|---|---|---|
| Phase 0 — Snapshot & branch | ✅ | Branched off `v2.0-stable` |
| Phase 1 + 8 — Homepage + external apps | ✅ | 5 internal spaces (1 active + 4 coming-soon) + 7 external apps |
| Phase 3 — Schema audit | ✅ | See `db-audit-2026-04-10.md` |
| Phase 4 — Foundational tables | ✅ | `user_space_roles`, `user_brand_access`, `user_type`, `last_space` |
| Phase 5 — Left dock space switcher | ✅ | New `<SpaceDock>` replaces `<BrandDock>` in portal layout |
| Phase 6 — B2B brand filter pill | ✅ | New `<BrandFilterPill>` component, `useBrandFilter` hook unchanged |
| Phase 2 — Monorepo | ⚠️ Deferred | See above |
| Phase 7 — Schema migration | ⚠️ Deferred | See above |
