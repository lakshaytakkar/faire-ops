# Suprans HQ — Architecture & Vocabulary Guide

> Source of truth for how TeamSync AI, the Suprans brand, and every venture
> portal relate to each other. When a concept has a name here, use that
> exact name in code, DB, and UI. Retired terms in §1 must not be revived.

**Last reviewed:** 2026-04-13
**Owner:** @lakshay (Suprans CEO)
**Companion docs:** `docs/deferred-phases.md`, `docs/db-audit-2026-04-10.md`, `.checkpoints/b2b-refactor-2026-04-10.md`

---

## 1 — Vocabulary (locked)

| Concept | Name in UI | Name in code / DB | Where it lives |
|---|---|---|---|
| Parent company | **Suprans** (customer-facing) / **Startup Squad** (internal, legal, Vercel team) | single-tenant, no table yet | — |
| The internal SaaS product | **TeamSync AI** | `faire-ops` Next.js app | `faire-ops-flax.vercel.app` |
| Home page after login | **Suprans HQ** | `/` route | The launcher/gateway |
| Company-wide workspace | **Suprans HQ** (space) | `public.spaces` row, `slug='hq'`, `kind='company'` | All-hands chat, calendar, full team |
| Top-level business line | **Venture** | `public.spaces` row, `kind='venture'` | LegalNations, B2B Ecommerce, GoyoTours, USDrop AI, EazySell, ToysInBulk, Suprans Lead Hub |
| Sub-brand inside a venture | **Brand** (B2B only today) / **Store** | `b2b.faire_stores` | Buddha Yoga, Super Santa, Toyarina |
| Reusable feature unit | **Module** | `src/lib/plugins-catalog.ts` entry | Tasks, Chat, QA, Gmail, Tickets |
| Public marketing site | **Public Site** | Separate Vercel deploy | `legalnations.com`, `suprans-landing.vercel.app` |
| External customer auth portal | **Client Portal** | Separate Vercel deploy per venture (future) | `legalnations.com/portal` |
| Startup Squad employee | **Member** | `public.users.user_type='member'` | — |
| External customer | **Client** | `public.users.user_type='client'` | Only logs into a Client Portal, never TeamSync AI |
| Named grouping of members | **Team** | `public.user_groups` | "Legal team", "Ecom ops team" |
| Permission of a member inside a space | **Role** | `public.user_space_roles` | owner, manager, contributor, viewer |

### Retired terms — do not use

- **"Team Portal HQ"** → the app is **TeamSync AI**; the home is **Suprans HQ**.
- **Brand-logo grid on home** → all venture identity flows through `public.spaces`.
- **"TeamSync AI" as a tile alongside ventures** → it's the app, not a venture.

---

## 2 — The hierarchy (5 levels)

```
Level 0 — COMPANY
        Suprans ( = Startup Squad)                 [single legal entity]

Level 1 — DEPLOYMENTS                              [distinct Vercel apps]
├── TeamSync AI              ← faire-ops           (internal ops, all employees)
├── legalnations-landing     ← external/legalnations          (public marketing site)
├── suprans-landing          ← external/supranslanding        (public marketing site)
└── future client portals    ← external/<venture>-client      (one per venture)

Level 2 — SPACES inside TeamSync AI                [rows in public.spaces]
├── kind='company'
│   └── Suprans HQ                    slug='hq'              (all-hands tier)
└── kind='venture'
    ├── B2B Ecommerce                 slug='b2b-ecommerce'   ✅ built, active
    ├── Legal Nations                 slug='legal'           ✅ active (external URL)
    ├── GoyoTours                     slug='goyo'            seeded, inactive
    ├── USDrop AI                     slug='usdrop'          seeded, inactive
    ├── EazySell                      slug='eazysell'        seeded, inactive
    ├── ToysInBulk                    slug='toysinbulk'      seeded, inactive
    └── Suprans Lead Hub              slug='suprans-app'     seeded, inactive

Level 3 — MODULES inside a space                   [plugins-catalog.ts]
    Universal (every space, context-scoped):
        Tasks, Chat, QA, Gmail, Tickets, Calendar, Team, Research, Files,
        Knowledge, Learning, AI Tools, Inbox, Analytics
    Venture-specific:
        Orders, Catalog, Retailers, Marketing Ads, Vendor Quotes   (B2B only)
        Clients, LLC Filings, Documents                            (LegalNations — future)
        Leads, Lead Assignment                                     (Suprans Lead Hub only)
        Landing Admin                                              (Suprans Lead Hub — §4)

Level 4 — SUB-ENTITIES inside a venture
    B2B Ecommerce    → Brands / Stores (b2b.faire_stores: 7 Faire shops)
    LegalNations     → Clients + LLC cases (future, legalnations.*)
    GoyoTours        → Tours + Bookings (future, goyo.*)
    USDrop AI        → Vendors + Orders (future, usdrop.*)

Level 5 — TEAMS inside a venture                   [public.user_groups]
    Member groupings scoped to a venture via group_space_permissions.
    Example: "B2B catalog team", "Legal paralegals team"
```

---

## 3 — Decision rules (when in doubt, use these)

### 3.1 — Homepage vs dock (where does a thing go?)

| Thing | Goes where | Why |
|---|---|---|
| A new venture | **Space in the dock** | Identical nav model; avoids tile explosion on home |
| A public marketing site | **Homepage "Public sites" section** | One-click hop to external deploy |
| A rare admin tool (quarterly) | Hidden under its owning space's sub-nav | Not worth a dock slot |
| A cross-venture dashboard ("Today across all ventures") | **Suprans HQ space** (`slug='hq'`) | Company tier pinned to top of dock |
| A personal destination (Gmail, Calendar, Tasks) | **Right WorkspaceDock, universal** | Shared across all spaces |

**Rule:** the left dock holds *ventures + the company tier*. Everything else sits either inside a venture's sub-nav or in the universal right dock.

### 3.2 — User menu behaviour (locked)

**Universal chrome, space-scoped content.**

- **Universal** (identical across every space): avatar, profile link, settings, notifications bell, logout, switch-account.
- **Space-scoped content**: the data rendered on each page filters by the active space. `/workspace/tasks` shows tasks in the active venture only; `/workspace/calendar` shows that venture's calendar; `/workspace/chat` shows channels scoped to the active space. Switching spaces via the left dock changes the filter without changing the nav.

### 3.3 — Auth

1. One auth wall **before** the home page. Unauthenticated → sign in. ✅ already true.
2. No per-space auth walls inside TeamSync AI.
3. Superadmin (`lakshay@suprans.in`) sees everything.
4. Members see only spaces they have `user_space_roles` for. `SpaceDock` filter already wired.
5. **Clients never log into TeamSync AI.** They log into the Client Portal deploy for their venture.
6. Public sites have no auth.

### 3.4 — Client portals

**Separate deployment per venture.** Same pattern as the current `external/legalnations` / `external/supranslanding` public sites. Each client portal:

- Lives under `external/<venture>-client/` or its own git repo.
- Is its own Vercel project.
- Reads our Supabase with the anon key + strict RLS locked to `auth.uid() = client.user_id`.
- Only touches the venture's schema (e.g., LegalNations client portal only reads `legalnations.*`).

Don't build one yet — wait until the venture has real clients.

### 3.5 — One schema per venture (extend the b2b pattern)

```
public.*         users, spaces, tasks, chat, gmail, tickets, calls, ai_*, research_*, notifications, ...
b2b.*            faire_*, collections, meta_*, vendor_quotes, sync_log, reports, daily_reports     ✅ done
suprans.*        services, employees, events, travel_packages, website_content, ...                 ⏳ §4
legalnations.*   clients, cases, documents, llc_filings, registered_agents                          (future)
goyo.*           itineraries, bookings, tours, travelers                                            (future)
usdrop.*         vendors, products, catalogs, fulfillment                                           (future)
eazysell.*       deals, pipelines, quotes, commissions                                              (future)
toysinbulk.*     orders, inventory                                                                  (future)
```

This isolation is what lets us later lift-and-shift a venture into its own deployment via `pg_dump --schema=<venture>`.

### 3.6 — Admin panel: homepage tile vs dock slot

**Answer: dock slot, not homepage tile.** Every venture gets a left-dock entry. Inside that space, use a sub-nav (the QA pattern) to split into tabs. The homepage is the launcher for initial orientation + the jump-off to public sites — nothing more.

---

## 4 — Suprans Landing wire-up (what's next to build)

### 4.1 — Status of the imported repo

- **Path:** `external/supranslanding/` (Vite + Express + Supabase + drizzle, SPA routing via wouter)
- **Deployed:** `suprans-landing.vercel.app` (live, 200)
- **Current Supabase:** uses `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` env vars via `server/db.ts`. Default schema: `public`.
- **No admin UI** in the repo — public-facing only. Admin editing must live inside TeamSync AI.
- **21 Drizzle tables** in `external/supranslanding/shared/schema.ts`: services, employees, events, travel_packages, travel_bookings, booking_types, bookings, event_attendees, event_hotels, event_flights, event_creatives, event_packing_items, event_communications, event_presentations, website_content, offices, templates, **leads, tasks, users, activities**.

### 4.2 — Split decision (content-only)

Into **`suprans.*`** schema (landing-owned content + its own transactions):

```
suprans.services                        suprans.events
suprans.employees                       suprans.event_attendees
suprans.offices                         suprans.event_hotels
suprans.website_content                 suprans.event_flights
suprans.templates                       suprans.event_creatives
suprans.booking_types                   suprans.event_packing_items
suprans.bookings                        suprans.event_communications
suprans.travel_packages                 suprans.event_presentations
suprans.travel_bookings
```

Stay in shared **`public.*`** (don't duplicate into suprans):

- `public.users` — suprans' `employees.user_id` and future `leads.assignee_id` FK into here.
- `public.tasks` — one tasks table, not one per venture.
- `public.activities` — if needed, single table; not venture-specific.
- Leads landing from the public site → future `public.leads` (or `public.suprans_leads` if we need venture-scoped columns). TBD when Lead Hub is built.

The landing repo's `users`, `tasks`, `activities` tables are **redundant and skipped**.

### 4.3 — Implementation steps (order)

1. **Create `suprans` schema + 17 tables.** Port Drizzle definitions to plain SQL. Grant `anon`/`authenticated`/`service_role` usage. Enable RLS per-table (permissive `true` for now, tighten later).
2. **Expose in PostgREST:**
   ```sql
   ALTER ROLE authenticator SET pgrst.db_schemas = 'public, b2b, suprans';
   NOTIFY pgrst, 'reload schema';
   ```
3. **Seed `suprans.website_content`** from the landing repo's `server/seed-website-content.ts` so home hero / FAQs / stats stop living hardcoded in `.tsx`.
4. **Seed `suprans.employees`** with the 4 sales contacts in `contact.tsx:11-16`.
5. **Seed `suprans.offices`** with the 6 offices in `about.tsx:44-87`.
6. **Re-point the landing deploy:**
   - Vercel env: `SUPABASE_URL` = our project, `SUPABASE_SERVICE_ROLE_KEY` = ours.
   - `external/supranslanding/server/db.ts` — pass `{ db: { schema: 'suprans' } }` to `createClient`.
   - Push upstream → `lakshaytakkar/suprans-landing` main → Vercel auto-deploys.
7. **Build the Landing Admin inside TeamSync AI** (in the Suprans Lead Hub space):
   - `UPDATE public.spaces SET is_active=true WHERE slug='suprans-app';`
   - Add routes under `/suprans-app/*`: `leads`, `landing/services`, `landing/employees`, `landing/events`, `landing/travel`, `landing/website-content`, `landing/offices`.
   - Sub-nav (mirrors the QA pattern): `[ Leads | Services | Employees | Events | Travel | Website Content | Offices ]`.
   - Each admin page is a CRUD table reading/writing `suprans.*` via a new `supabaseSuprans` client in `src/lib/supabase.ts` (same pattern as `supabaseB2B`).
8. **Verify** `suprans-landing.vercel.app` still renders correctly — data now coming from `suprans.*`.

### 4.4 — What NOT to build yet

- Events / travel packages / bookings / booking types / event_* CRUD UIs — lots of screens, low churn. Seed + render read-only.
- **Start admin UIs with services, employees, website_content, offices** — highest-churn content.
- Integration of landing leads into TeamSync AI's lead inbox → defer until the inbox exists.

---

## 5 — Build status

| Layer | Status |
|---|---|
| Vocab locked in code + DB | ✅ commit `9ca4ddf` |
| `public.spaces` rows cleaned (8 ventures, 1 company) | ✅ migration `tighten_spaces_vocabulary` |
| SpaceDock reads from DB, not hardcoded | ✅ |
| Home title = "Suprans HQ / TeamSync AI" | ✅ |
| BrandLogoGrid retired | ✅ |
| External-link badge on external spaces | ✅ |
| b2b schema isolation | ✅ |
| QA sibling subpages wired via SubNav | ✅ commit `361c20d` |
| `suprans` schema + landing admin | ⏳ next (§4) |
| Per-venture schemas (legalnations, goyo, usdrop, eazysell, toysinbulk) | ⏳ when each venture's admin is prioritised |
| Activate `hq` space content (all-hands, company calendar, full team) | ⏳ |
| Move `/overview`, `/orders`, `/catalog`, `/marketing` under `/b2b/*` | ⏳ (deferred until 2nd venture admin starts) |
| Client portal per venture | ⏳ (when LegalNations has real clients) |
| Multi-tenant SaaS plumbing (TeamSync AI as product) | ⏳ future pivot only |

---

## 6 — Recipe: add a new venture

1. Pick a slug (lower-case, hyphen-separated, matches brand).
2. ```sql
   INSERT INTO public.spaces (slug, name, tagline, kind, icon, color, entry_url, is_active, sort_order)
   VALUES ('myventure', 'My Venture', 'Tagline', 'venture', 'IconName', '#hexcolor', '/myventure/overview', false, 90);
   ```
   (Keep `is_active=false` until the admin is built.)
3. Create the per-venture schema:
   ```sql
   CREATE SCHEMA myventure;
   GRANT USAGE ON SCHEMA myventure TO anon, authenticated, service_role;
   ALTER ROLE authenticator SET pgrst.db_schemas = 'public, b2b, suprans, myventure';
   NOTIFY pgrst, 'reload schema';
   ```
4. Add a `supabaseMyventure` client in `src/lib/supabase.ts` with `{ db: { schema: 'myventure' } }`.
5. Build admin pages under `/myventure/*` with a SubNav (copy the QA pattern in `src/app/(portal)/workspace/qa/*/page.tsx`).
6. Flip `public.spaces.is_active=true WHERE slug='myventure'`. Dock updates live, home card appears — no redeploy required.
7. **If the venture needs a public site:** commit into `external/myventure-landing/`, deploy as its own Vercel project, add to `EXTERNAL_APPS` in `home-launcher.tsx` under "Public sites".
8. **If the venture needs a client portal:** separate deploy in `external/myventure-client/`, own Vercel project, reads our Supabase via anon + strict RLS.

---

## 7 — FAQ

**Q: Why is "Team Portal HQ" wrong?**
The name used to refer to the whole app informally, and somebody also stored it as the display name of the `b2b-ecommerce` space. Both are misleading. The app is **TeamSync AI** (product name). The home is **Suprans HQ** (company-wide tier).

**Q: Why is Suprans both the parent company AND a venture slug (`suprans-app`)?**
The parent company is **Suprans** (the umbrella). The slug `suprans-app` points to the **Suprans Lead Hub** — the space where incoming leads from `suprans-landing.vercel.app` get assigned to whichever venture (Legal, Goyo, USDrop, etc.) fits. Different things, linked by name because the lead hub is owned by the parent company.

**Q: Where does TeamSync AI (the SaaS product) go once you start selling it?**
It's still the same Next.js app — you add a `tenants` table, gate every `public.*` query by `tenant_id`, and add tenant claim to the JWT. At that point Suprans becomes one tenant row among many. No new deployment needed. This is deferred; don't pay for it today.

**Q: Do clients of LegalNations / GoyoTours log into this app?**
**No.** They log into per-venture Client Portals (future separate Vercel deploys). TeamSync AI is employee-only.

**Q: How do I edit the Suprans landing page's copy?**
Inside TeamSync AI → Suprans Lead Hub space → Landing tab → Website Content page (once §4 ships). Edits write to `suprans.website_content`; the landing deploy reads the same row and re-renders on its next request.

**Q: Why one Supabase project for everything?**
Because we're single-tenant today and CEO-only. Schemas isolate ventures cleanly. If a venture ever needs its own database (regulatory, scale), we `pg_dump --schema=<venture>` and stand it up separately. Don't split prematurely.

---

## Related references

- **Vocabulary enforcement in memory:** `~/.claude/projects/C--antigravity-faire/memory/project_architecture_suprans.md`
- **b2b refactor checkpoint:** `.checkpoints/b2b-refactor-2026-04-10.md`
- **B2B view restore SQL (if needed):** `.checkpoints/b2b-views-restore.sql`
- **Deferred roadmap items:** `docs/deferred-phases.md`
