# Architecture Guides — Final Audit
**Date:** 2026-04-10
**Auditor:** Subagent audit pass
**Scope:** Guides 01–05 in `.claude/`, plus the implicit "master execution plan" phases tracked in `docs/deferred-phases.md`
**Goal:** Decide whether the project is 100% ready to start building the **LegalNations Admin** space.

---

## 1. Executive Summary

**Short answer:** _Yes, with caveats._ The foundation is in place — homepage, schema isolation, left dock, RBAC tables, auth-context shim, and the physical `b2b` schema migration are all **done**. A brand-new `legal` space can be scaffolded right now, and its tables will drop into the empty `legal` schema cleanly, RLS hooks are ready, and `SpaceDock`/`SpaceGuard` will pick it up once activated.

However, a handful of **gating items** remain before LegalNations ships safely. They are small and mostly hygiene — the most important being **RLS on 7 unprotected `b2b.*` tables** (all Meta Ads + `marketing_budgets`), **RLS on `public.users`/`public.spaces`/`public.user_brand_access`**, **the `on_auth_user_created` trigger** (so new sign-ups auto-provision a `public.users` row), and **wiring `<SpaceGuard>` into real routes**. None of these block *starting* to scaffold LegalNations, but they absolutely block *shipping* it to non-superadmin users.

Guides that are intentionally deferred (monorepo, full user-mgmt UI, email invitation flow) remain deferred and don't block LegalNations.

---

## 2. Per-guide status

### Guide 01 — Homepage Repurpose

| Item | Status | Notes |
|---|---|---|
| Replace single space card with dynamic launcher | ✅ DONE | `src/app/page.tsx` reads from `listSpaces()` and renders active apps |
| Two sections: Internal spaces + External apps | ✅ DONE | `INTERNAL_SPACES` is now `activeApps.filter(is_active)` + `EXTERNAL_APPS` array |
| Coming-soon spaces hidden from homepage | ✅ DONE | Only `is_active` spaces show; 4 coming-soon spaces intentionally suppressed |
| `/dashboard` route unchanged | ✅ DONE | B2B routes untouched |
| Status badges (active / coming-soon / planned) | ⚠️ PARTIAL | Homepage only renders `active` + external `planned/live/building`. The "coming-soon" internal cards are **not shown at all** — this deviates from the guide but matches the user's explicit decision. **CLASSIFICATION: OBSOLETE** (guide intent superseded) |
| External apps with correct URLs | ✅ DONE | 7 cards (4 websites + 1 client portal + 2 vendor portals) |
| Mobile layout | ✅ DONE (centered flex layout) |

**Guide 01 verdict:** ✅ Complete, with one intentional divergence (hiding coming-soon).

---

### Guide 02 — Schema Isolation (Safe Migration)

| Phase | Item | Status | Notes |
|---|---|---|---|
| A — Audit | Export table list | ✅ DONE | `docs/db-audit-2026-04-10.md`, 86 tables |
| A — Audit | Categorize every table | ✅ DONE | 52 KEEP_PUBLIC, 30 MOVE_B2B, 0 AUDIT |
| A — Audit | Route → table map | ✅ DONE | File-pattern map in db-audit doc |
| B — Schemas | Create `b2b/hq/legal/goyo/vendor/client` | ✅ DONE | Plus `usdrop` (7 total schemas) |
| C — Migration | Create tables in b2b, copy data | ✅ DONE | **28 tables physically live in `b2b` schema** (not the 30 in audit — `bank_accounts` + `bank_transactions_v2` stayed in public as cross-app finance) |
| C — Migration | Compatibility views in public | ✅ DONE | `public.faire_orders/products/retailers/stores` all confirmed as VIEW |
| C — Migration | Row count verification | ✅ DONE | `public.faire_orders` = 1,815 rows confirmed |
| C — Migration | All routes still working | ✅ DONE | Views are auto-updatable, no code change required |
| C — Migration | Rename old tables with date suffix + 7-day wait | 🚫 N/A | Not applicable — views replaced the originals atomically, no rename-then-drop path |
| D — RLS | Enable RLS on every b2b table | ❌ NOT DONE | **21 of 28 tables have RLS enabled, 7 DO NOT**: `marketing_budgets`, `meta_ad_accounts`, `meta_ad_creatives`, `meta_ad_reports`, `meta_ad_sets`, `meta_ads`, `meta_campaigns`. **CRITICAL** |
| D — RLS | Internal-user access policy | ⚠️ PARTIAL | Existing RLS policies still key off the pre-migration shape (inherited via `CREATE TABLE ... LIKE ... INCLUDING ALL`). Policies have not been rewritten to key off `user_space_roles.space_slug = 'b2b-ecommerce'` — they still use whatever the old public tables used |
| D — RLS | Brand-level filter policy | ❌ NOT DONE | `user_brand_access` table exists but **has RLS disabled itself** and no policy on any b2b table references it. Brand filtering is enforced purely client-side via `brand-filter-context`. **NICE-TO-HAVE** (works today because every user is superadmin) |
| E — Foundational | `spaces` table seeded | ✅ DONE | 5 rows: b2b-ecommerce, hq, legal, goyo, usdrop |
| E — Foundational | `user_space_roles` | ✅ DONE | Exists with `space_slug` (text) not `space_id`. 5 rows — superadmin seeded into all 5 spaces |
| E — Foundational | `user_brand_access` | ✅ DONE | Table exists (0 rows, RLS OFF) |
| E — Foundational | `users.user_type` + `users.last_space` | ✅ DONE | Both columns present |

**Guide 02 verdict:** ⚠️ 95% complete. Schema migration itself shipped, but **RLS hardening is incomplete** and **deferred-phases.md is out of date** (it claims Phase C was deferred — it was actually executed).

---

### Guide 03 — Left Dock Space Switcher

| Item | Status | Notes |
|---|---|---|
| Space context (`useSpace` hook) | ⚠️ PARTIAL | No dedicated `SpaceContext` — `SpaceDock` derives active space from pathname via `getActiveSpaceSlug()`. Functionally equivalent, architecturally divergent. **OBSOLETE** — the pathname-based derivation is cleaner for Next.js App Router |
| SPACES array defined | ✅ DONE | Hardcoded in `src/components/layout/space-dock.tsx` (5 spaces) |
| LeftDock refactored from brand logos to space icons | ✅ DONE | `<SpaceDock>` replaces `<BrandDock>` in portal layout |
| Active space highlight | ✅ DONE | `bg-white/10` + 2px right-edge indicator |
| Coming-soon spaces dimmed + not clickable | ✅ DONE | 40% opacity + amber dot |
| Hover tooltip with space name | ✅ DONE |
| Top nav reactive to active space | ❌ NOT DONE | Top nav is **still static B2B**. `top-navigation.tsx` doesn't branch on active space — it renders a fixed B2B menu. **NOT CRITICAL** because only B2B is active today, but **CRITICAL** before LegalNations ships (else clicking the Legal dock icon still shows B2B's top nav) |
| Brand context + filter (B2B only) | ✅ DONE | `brand-filter-context.tsx` + `BrandFilterCell` |
| Brand filter as pinned pill | ✅ DONE (was pill, now promoted to top-nav first cell — line 169/389 of `top-navigation.tsx`) |
| Brand filter hidden outside B2B | ❌ NOT DONE | `BrandFilterCell` renders unconditionally in the top nav. Hidden today only because there are no non-B2B routes. **CRITICAL** once LegalNations space exists |
| Wire brand filter to data queries | ✅ DONE (existing `useBrandFilter` hook) |
| `userSpaces` filtered by user permissions | ✅ DONE | `SpaceDock` filters via `useAuth().hasSpaceAccess()` with superadmin bypass |
| localStorage `lastSpace` persistence | ❌ NOT DONE | Active space is derived from URL, not persisted. **NICE-TO-HAVE** |

**Guide 03 verdict:** ⚠️ 75% done. The dock itself is complete, but **top-nav-per-space** and **brand-filter-hide-outside-b2b** are both gaps that will surface the moment a second space exists.

---

### Guide 04 — External Apps + Monorepo

| Item | Status | Notes |
|---|---|---|
| External apps config | ✅ DONE (inlined in `src/app/page.tsx`, not a separate config file) |
| Homepage external apps section | ✅ DONE |
| Grouped by category | ⚠️ PARTIAL | Rendered in a single list, not grouped into "Websites" vs "Portals" sub-sections. **NICE-TO-HAVE** |
| External card shows domain, description, status | ✅ DONE |
| Live external apps open in new tab | ✅ DONE (`target="_blank"`) |
| Planned/building apps show status pill, not clickable | ✅ DONE |
| pnpm workspaces | 🚫 DEFERRED | `docs/deferred-phases.md` Phase 2 — reason: 1 app, 0 shared code |
| Turborepo | 🚫 DEFERRED | Same |
| `apps/portal`, `apps/legalnations-web` structure | 🚫 DEFERRED | Same |
| `packages/ui`, `packages/db`, `packages/utils` | 🚫 DEFERRED | Same |
| Supabase auth per app (signInAsInternal etc.) | ❌ NOT DONE | No auth flow of any kind in the code. Today the app runs with zero auth and uses the `SUPERADMIN_FALLBACK_EMAIL` shim. **NICE-TO-HAVE** for LegalNations Admin (internal users only — still on the shim) |
| Separate Vercel deployments per app | 🚫 DEFERRED | Single Vercel project by design |
| DNS per domain | 🚫 DEFERRED | Not applicable until a second app exists |

**Guide 04 verdict:** ✅ Part 1 (External Apps listing) complete. Parts 2–4 (Monorepo / Vercel multi-project / multi-portal auth) are **explicitly deferred**, documented, and do not block LegalNations.

---

### Guide 05 — User Management, RBAC & Auth

#### Database (Phase A equivalent)

| Item | Status | Notes |
|---|---|---|
| `user_profiles` table | ⚠️ DIVERGENT | Guide proposes `user_profiles` separate from `auth.users`. Implementation merged it into the existing `public.users` table (23 columns including `is_superadmin`, `is_active`, `user_type`, `display_name`, `job_title`, `department`, `employee_id`, `auth_user_id`, `invited_by`, `invited_at`, `joined_at`, `last_seen_at`). **Functionally equivalent, not a gap.** |
| `user_groups` + seed rows | ✅ DONE | 7 groups seeded (Faire Ops, Finance, Marketing, Tech, HR, Leadership, QA & Support) |
| `user_group_members` | ✅ DONE | 0 rows |
| `user_space_roles` | ✅ DONE | uses `space_slug` (text) not `space_id`. 5 rows for superadmin |
| `user_module_permissions` | ✅ DONE | 0 rows |
| `user_brand_access` | ✅ DONE | 0 rows, RLS OFF |
| `group_space_permissions` + seed | ✅ DONE | 7 rows seeded for "Faire Ops" group |
| `user_invitations` | ✅ DONE | 0 rows |
| `permission_audit_log` | ✅ DONE | 0 rows |
| `handle_new_user` trigger (auth.users INSERT → public.users) | ❌ NOT DONE | Not found in `information_schema.triggers`. **CRITICAL** as soon as any real user signs up — otherwise they'll have an `auth.users` row with no `public.users` row and the `auth-context` lookup will fail. Today it's masked by the dev fallback to Lakshay |
| `set_updated_at` trigger | ✅ DONE (function + trigger present) |
| Helper functions `is_superadmin`, `has_space_access`, `space_role`, `current_user_id` | ✅ DONE | All 4 present |
| `protect_superadmin` trigger | ✅ DONE (on public.users) |
| Superadmin row (lakshay@suprans.in, is_superadmin=true) | ✅ DONE |

#### RLS policies

| Item | Status | Notes |
|---|---|---|
| `user_profiles` / `users` RLS | ❌ NOT DONE | `public.users` has RLS **disabled**. Any authenticated user can read/write every profile row. **CRITICAL** |
| `spaces` RLS | ❌ NOT DONE | `public.spaces` has RLS **disabled**. Lower risk (read-only reference data) but should be enabled with a superadmin-only write policy. **NICE-TO-HAVE** |
| `user_brand_access` RLS | ❌ NOT DONE | Table exists, RLS disabled, no policies. **NICE-TO-HAVE** until brand-gated users exist |
| `user_space_roles` RLS | ✅ DONE | 2 policies (`superadmin_manage_roles`, `view_own_or_super_roles`) |
| `user_module_permissions` RLS | ✅ DONE | 2 policies |
| `user_groups` RLS | ✅ DONE | 2 policies |
| `user_group_members` RLS | ✅ DONE | 2 policies |
| `group_space_permissions` RLS | ✅ DONE | 2 policies |
| `user_invitations` RLS | ⚠️ PARTIAL | Only `superadmin_all_invitations`. Missing `space_admin_create` policy — not critical since space admins don't exist yet |
| `permission_audit_log` RLS | ⚠️ PARTIAL | Only `superadmin_all_audit`. Missing `space_admin_view_own_space` — low priority |

#### Auth (Phase B / Section 5)

| Item | Status | Notes |
|---|---|---|
| Supabase Auth config (site URL, redirect URLs, magic links) | ❓ UNKNOWN | No code evidence either way. Probably not configured |
| `auth.ts` helper package (signIn/signOut/signInAsClient/etc) | ❌ NOT DONE | Only raw `supabase.auth.getUser()` calls in `auth-context.tsx` |
| Login page | ❌ NOT DONE | No `/login` or `/auth/**` routes exist |
| Accept-invite page | ❌ NOT DONE | No route |
| `AuthProvider` + `useAuth` hook | ✅ DONE | `src/lib/auth-context.tsx` is wired into `src/app/(portal)/layout.tsx` |
| Superadmin fallback for dev | ✅ DONE | Falls back to `lakshay@suprans.in` when no session — documented as a dev-only shim |
| `usePermissions(space, module)` hook | ✅ DONE | Exported from `auth-context.tsx` |
| `<SpaceGuard>` component | ✅ DONE | `src/components/auth/space-guard.tsx` |
| `<SpaceGuard>` actually wrapping routes | ❌ NOT DONE | **Zero routes use it.** Defined but unused. **CRITICAL** before LegalNations routes are built |

#### Left-dock integration

| Item | Status | Notes |
|---|---|---|
| `SpaceDock` reads from `hasSpaceAccess` | ✅ DONE | Line 127 of `space-dock.tsx` |
| Superadmin sees all spaces | ✅ DONE | `isSuperadmin` short-circuit |

#### User management UI (Section 7)

| Item | Status | Notes |
|---|---|---|
| `/settings/access/users` list | ❌ NOT DONE | No `/settings` route directory in the app |
| `/settings/access/users/invite` modal | ❌ NOT DONE | |
| `/settings/access/users/[id]` detail page | ❌ NOT DONE | |
| `/settings/access/groups` | ❌ NOT DONE | |
| `/settings/access/audit` | ❌ NOT DONE | |
| Server route `POST /settings/access/invite` | ❌ NOT DONE | |
| Supabase `admin.inviteUserByEmail` integration | ❌ NOT DONE | |

**All of Section 7 (the admin UI) is NOT DONE.** Classification: **NICE-TO-HAVE** for LegalNations. Today the team has one real user (Lakshay as superadmin). A real invite UI is only needed when the second internal user is onboarded — and even then, they can be inserted directly via SQL.

**Guide 05 verdict:** ⚠️ ~60% done. Schema + helpers + auth-context shim + SpaceDock integration = ✅. Real auth flow, user management UI, email invitations, and several RLS policies = ❌.

---

### Master execution plan (from `docs/deferred-phases.md`)

| Phase | Status | Notes |
|---|---|---|
| Phase 0 — Snapshot & branch | ✅ DONE | branched off `v2.0-stable` |
| Phase 1 — Homepage + external apps | ✅ DONE | Guide 01 + 04 part 1 |
| Phase 2 — Monorepo | 🚫 DEFERRED | Documented, zero cost to defer |
| Phase 3 — Schema audit | ✅ DONE | `docs/db-audit-2026-04-10.md` |
| Phase 4 — Foundational tables | ✅ DONE | `user_space_roles`, `user_brand_access`, `user_type`, `last_space` |
| Phase 5 — Left dock space switcher | ✅ DONE | `<SpaceDock>` |
| Phase 6 — Brand filter pill → top-nav cell | ✅ DONE | `BrandFilterCell` in `top-navigation.tsx` |
| Phase 7 — Schema migration | ✅ DONE | **`deferred-phases.md` is WRONG — this WAS executed**. 28 b2b tables live, views in public, RLS partially set up |
| Phase 8 — External apps on homepage | ✅ DONE | Part of Phase 1 |
| Phase A (Guide 05) — User-mgmt tables | ✅ DONE | |
| Phase B (Guide 05) — Auth context + SpaceGuard | ⚠️ PARTIAL | Context done, SpaceGuard defined but unused; no actual auth UI |

**Observation:** `docs/deferred-phases.md` claims Phase 7 (schema migration) is **deferred**, but the database shows it was **executed**. This doc should be updated to reflect reality.

---

## 3. CRITICAL pending items — ranked

These must be addressed **before LegalNations Admin is built out**, in priority order.

### C1. Enable RLS on 7 unprotected `b2b.*` tables
**Files to touch:** SQL migration only.
**Tables:** `b2b.marketing_budgets`, `b2b.meta_ad_accounts`, `b2b.meta_ad_creatives`, `b2b.meta_ad_reports`, `b2b.meta_ad_sets`, `b2b.meta_ads`, `b2b.meta_campaigns`.
**Action:** `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + add a `b2b_internal_access` policy keyed off `public.has_space_access('b2b-ecommerce')`.
**Effort:** 15 min.
**Why critical:** Once the Legal space has its own users who are NOT B2B members, they will currently be able to query Meta Ads data because the views over these unprotected tables will still answer.

### C2. Enable RLS on `public.users`
**Files to touch:** SQL only.
**Action:** `ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;` + policies: `superadmin_all`, `own_profile` (id = auth.uid() or auth_user_id = auth.uid()), `space_admin_view_members`.
**Effort:** 20 min.
**Why critical:** Without RLS, any authenticated user can read every other user's `is_superadmin`, `department`, `employee_id`, etc. This is a privacy bug that must not ship to a multi-user space.

### C3. Add `handle_new_user` trigger on `auth.users` INSERT
**Files to touch:** SQL migration only.
**Action:** Create the function + trigger from Guide 05 §3.2, adapted to write into `public.users` (not `user_profiles`).
**Effort:** 15 min.
**Why critical:** The moment the first non-Lakshay user signs in, `auth-context.tsx` will try to load a `public.users` row by email, find nothing, and drop them to "no access". This blocks ever adding a second real user.

### C4. Make top-navigation reactive to active space
**Files to touch:** `src/components/layout/top-navigation.tsx`, possibly `src/lib/spaces.ts`.
**Action:** Either branch on `getActiveSpaceSlug(pathname)` to render a different nav array per space, or extract `SPACES[].topNav` from `space-dock.tsx` into a shared config and drive top nav from it.
**Effort:** 1–2 hours.
**Why critical:** Today the B2B top nav is hardcoded. When a user clicks "Legal" in SpaceDock and lands on `/legal/clients`, they'll see Orders / Catalog / Retailers / Finance in the top nav — which is wrong and confusing. LegalNations has its own modules (Clients, Cases, Documents, Payments, Compliance).

### C5. Hide `<BrandFilterCell>` outside B2B
**Files to touch:** `src/components/layout/top-navigation.tsx` (line ~389).
**Action:** `{getActiveSpaceSlug(pathname) === 'b2b-ecommerce' && <BrandFilterCell />}`.
**Effort:** 10 min.
**Why critical:** Same reason as C4 — brand filter is meaningless in Legal/HQ/Goyo. Currently always rendered.

### C6. Wrap LegalNations routes with `<SpaceGuard spaceSlug="legal">`
**Files to touch:** new `src/app/(portal)/legal/layout.tsx`.
**Action:** When scaffolding the Legal routes, wrap the layout in `<SpaceGuard spaceSlug="legal">`.
**Effort:** 5 min at Legal scaffold time.
**Why critical:** Otherwise any user with any space access can navigate to `/legal/*` directly. This is the whole point of SpaceGuard; it was built, never used.

### C7. Update `docs/deferred-phases.md` to reflect reality
**Files to touch:** `docs/deferred-phases.md`.
**Action:** Flip Phase 7 from "Deferred" to "Done", record the 28 tables moved + views created, note the RLS caveats (C1).
**Effort:** 10 min.
**Why critical:** Prevents confusion in future sessions. The doc currently tells the next agent the migration hasn't happened.

---

## 4. Nice-to-have items (do NOT block LegalNations)

- **N1.** RLS on `public.spaces` (read-all / superadmin-write). Low risk — reference data.
- **N2.** RLS on `public.user_brand_access` + brand-filter policy on all `b2b.*` tables. Not needed until a user needs brand-gating; superadmin bypasses anyway.
- **N3.** Enable RLS on `b2b` inherited policies — re-write the existing RLS policies to key off `public.has_space_access('b2b-ecommerce')` instead of whatever they inherited. Cleanup, not a correctness bug.
- **N4.** Group external app cards into "Websites" vs "Portals" sub-sections on homepage.
- **N5.** `lastSpace` persistence in localStorage so the user returns to their last active space on next login.
- **N6.** `SpaceContext` (React context) so multiple components can share active space state without re-deriving from pathname.
- **N7.** Full `/settings/access/*` admin UI (users list, invite modal, user detail, groups, audit log) — Guide 05 Section 7. Not needed until there's a second real user to manage.
- **N8.** Real login page + `signIn` / `signInAsInternal` / magic-link flow. The dev superadmin fallback in `auth-context.tsx` is sufficient for internal use right now.
- **N9.** Accept-invite page + `handle_new_user` copying permissions from the invitation row to `user_module_permissions`.
- **N10.** `space_admin_create` policy on `user_invitations` and `space_admin_view_own_space` on `permission_audit_log` — only matters when space admins exist.

---

## 5. Obsolete / Not applicable

| Item | Reason |
|---|---|
| Guide 02 Phase C5 — "rename old table, wait 7 days, drop" | Migration used CREATE-then-VIEW (atomic), not copy-then-rename. The 7-day buffer doesn't apply. |
| Guide 03 — `SpaceContext` React context | Replaced by pathname-driven `getActiveSpaceSlug()`, which is cleaner in App Router. |
| Guide 05 — separate `user_profiles` table | Merged into existing `public.users`. Every column from the guide is present. |
| Guide 04 — pnpm workspaces + Turborepo + `apps/*` + `packages/*` | Explicitly deferred in `docs/deferred-phases.md`. Stack is `npm` + single Next.js app on Vercel. |
| Guide 04 — Drizzle schema references (`pgSchema('b2b')`) | Stack is Supabase JS, not Drizzle. Supabase JS transparently resolves views. |
| Guide 01 — "coming-soon" cards on the homepage | User decision to hide them; only active spaces show. |
| Guide 01 — dashboard route is B2B's default | Homepage `ActiveSpaceCard` uses `entry_url` from the DB (`/overview`), not `/dashboard`. Functionally equivalent. |
| Guide 02 — `pgSchema` / Drizzle refactor | Not using Drizzle; supabase-js pointing at `public.*` views is the chosen path |
| Guide 03 — client/src/ paths, Wouter, Express | Stack is Next.js App Router, paths live in `src/app/(portal)/**` |

---

## 6. Bottom line

**Can LegalNations Admin be started?** **Yes.**
**Can LegalNations Admin be shipped to users without first clearing C1–C6?** **No.**

The remaining critical items total roughly **3–4 hours of focused work** and all fit into a single pre-LegalNations cleanup pass. Once they're done, the foundation is genuinely 100% ready: the `legal` schema is empty and waiting, `SpaceDock` already shows a Legal icon, `SpaceGuard` is ready to wrap routes, and `spaces.legal` is seeded in `public.spaces`.
