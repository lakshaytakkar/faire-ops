# Guide 02 — Schema Isolation (Safe Migration)
**Project:** Team Portal  
**Purpose:** Move existing tables into isolated schemas without breaking any current B2B / Faire functionality  
**Risk level:** HIGH — database migrations. Follow every step in order. Never skip safety checks.

---

## Golden Rule

> **Never drop or rename a table in `public` until the new schema table is live, verified, and all app references are updated.**  
> Every step below is additive first, then a cutover, then a cleanup. Never cutover and cleanup in the same step.

---

## Target Schema Structure

```
public/          ← foundational, cross-app (stays mostly the same)
b2b/             ← all current Faire / B2B tables move here
hq/              ← Suprans HQ tables (new, built later)
legal/           ← LegalNations tables (new, built later)
goyo/            ← GoyoTours tables (new, built later)
vendor/          ← vendor portal tables (new, built later)
client/          ← client portal tables (new, built later)
```

---

## Phase A — Audit What Exists (Do This First, Touch Nothing)

### Step A1: Export current table list

Run this in Supabase SQL editor and save the output:

```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Save this output as your **baseline snapshot**. Date it. Keep it.

### Step A2: Categorize every table

Go through the list and label each table as one of:

| Category | Label | Action |
|---|---|---|
| Cross-app / foundational | `KEEP_PUBLIC` | Stays in public |
| B2B / Faire specific | `MOVE_B2B` | Will move to b2b schema |
| Future HQ tables | `FUTURE_HQ` | Will be created in hq schema |
| Unknown / unused | `AUDIT` | Investigate before touching |

**Tables that are almost certainly `KEEP_PUBLIC`:**
- `users` / `profiles`
- `spaces` (if exists)
- `notifications`
- `audit_logs` / `ai_actions`
- `settings`

**Tables that are almost certainly `MOVE_B2B`:**
- `orders`, `order_items`
- `products`, `product_variants`
- `retailers`, `retailer_contacts`
- `brands`, `stores`
- `shipments`, `tracking_events`
- `faire_*` (any table prefixed with faire_)
- `campaigns`, `follow_ups`
- `catalog_*`

### Step A3: Map every API route to the tables it touches

Open your Express routes folder and for each route file note:
- Which tables it queries
- Whether it uses raw SQL or Drizzle ORM
- Whether the table name is hardcoded or referenced via a schema object

This map is your **impact assessment**. You need it before touching anything.

---

## Phase B — Create New Schemas (Zero Risk)

This phase creates empty schemas. Nothing moves yet. Zero app impact.

```sql
-- Run in Supabase SQL editor
CREATE SCHEMA IF NOT EXISTS b2b;
CREATE SCHEMA IF NOT EXISTS hq;
CREATE SCHEMA IF NOT EXISTS legal;
CREATE SCHEMA IF NOT EXISTS goyo;
CREATE SCHEMA IF NOT EXISTS vendor;
CREATE SCHEMA IF NOT EXISTS client;

-- Verify
SELECT schema_name FROM information_schema.schemata
WHERE schema_name IN ('b2b','hq','legal','goyo','vendor','client');
```

Expected: 6 rows returned. If any are missing, re-run the CREATE for that one.

---

## Phase C — B2B Schema Migration (High Care Required)

This is the only risky phase. Do it table by table, not all at once.

### Step C1: Create table in new schema (copy, not move)

For each B2B table, create it in the `b2b` schema first. Example for `orders`:

```sql
-- 1. Create the new table in b2b schema (identical structure)
CREATE TABLE b2b.orders (LIKE public.orders INCLUDING ALL);

-- 2. Copy all data
INSERT INTO b2b.orders SELECT * FROM public.orders;

-- 3. Verify row count matches
SELECT
  (SELECT COUNT(*) FROM public.orders) AS public_count,
  (SELECT COUNT(*) FROM b2b.orders) AS b2b_count;
-- Must show identical numbers before proceeding
```

### Step C2: Create a compatibility view in public (keeps app working)

This is the safety net. Your app still queries `public.orders` — the view makes it work transparently:

```sql
-- Drop the old table only after this view is confirmed working
CREATE OR REPLACE VIEW public.orders_v AS
  SELECT * FROM b2b.orders;
```

**Do NOT rename or drop `public.orders` yet.** The view is just a forward reference for later.

### Step C3: Update Drizzle schema references

In your Drizzle schema file, update the table definition to point to the new schema:

```typescript
// Before
export const orders = pgTable('orders', { ... });

// After
export const orders = pgTable('orders', { ... }, (table) => ({
  // add schema reference
}));

// OR using pgSchema helper
import { pgSchema } from 'drizzle-orm/pg-core';
const b2bSchema = pgSchema('b2b');
export const orders = b2bSchema.table('orders', { ... });
```

### Step C4: Test every affected route

For each route that touches the migrated table:
- Hit the route manually or via your test suite
- Check response is identical to before migration
- Check no 500 errors in logs
- Check Supabase logs for any query errors

### Step C5: Only after all routes verified — drop public table

```sql
-- Only run this after Step C4 passes completely
ALTER TABLE public.orders RENAME TO orders_deprecated_YYYYMMDD;
-- Keep for 7 days, then drop
-- DROP TABLE public.orders_deprecated_YYYYMMDD;
```

Never drop immediately. Rename with date suffix first. Wait 7 days. Then drop.

### Repeat C1–C5 for each B2B table in this order:

1. `brands` / `stores` (lowest dependencies)
2. `products`, `product_variants`
3. `retailers`, `retailer_contacts`
4. `orders`, `order_items` (highest traffic — do last)
5. `shipments`, `tracking_events`
6. `faire_*` tables
7. `campaigns`, `follow_ups`

---

## Phase D — RLS Policies on New Schemas

After migration, add RLS to every new schema table:

```sql
-- Enable RLS on b2b schema tables
ALTER TABLE b2b.orders ENABLE ROW LEVEL SECURITY;

-- Internal users with b2b space access
CREATE POLICY "b2b_internal_access" ON b2b.orders
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND user_type = 'internal'
  )
  AND EXISTS (
    SELECT 1 FROM public.user_space_roles
    WHERE user_id = auth.uid()
    AND space_id = 'b2b'
  )
);

-- Brand-level filter (for brand switcher)
CREATE POLICY "b2b_brand_filter" ON b2b.orders
FOR ALL USING (
  brand_id IN (
    SELECT brand_id FROM public.user_brand_access
    WHERE user_id = auth.uid()
  )
  OR
  NOT EXISTS (
    SELECT 1 FROM public.user_brand_access
    WHERE user_id = auth.uid()
  ) -- if no brand restrictions set, allow all brands
);
```

---

## Phase E — Foundational Tables to Add to Public

These tables don't exist yet. Create them fresh in `public`:

```sql
-- Spaces registry
CREATE TABLE public.spaces (
  id TEXT PRIMARY KEY,             -- 'b2b', 'hq', 'legal', etc.
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  route TEXT,
  status TEXT DEFAULT 'active',    -- 'active' | 'coming-soon' | 'planned'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed with current spaces
INSERT INTO public.spaces VALUES
  ('b2b', 'B2B Ecommerce (USA)', 'Wholesale operations powered by Faire', null, '/dashboard', 'active'),
  ('hq', 'Suprans HQ', 'CEO command center', null, '/hq/overview', 'coming-soon'),
  ('legal', 'LegalNations Admin', 'LLC formation and compliance', null, '/legal/clients', 'coming-soon'),
  ('goyo', 'GoyoTours Admin', 'Travel and tour management', null, '/goyo/bookings', 'coming-soon'),
  ('usdrop', 'USDrop AI Admin', 'Dropshipping operations', null, '/usdrop/orders', 'coming-soon');

-- User space roles
CREATE TABLE public.user_space_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id TEXT REFERENCES public.spaces(id),
  role TEXT DEFAULT 'member',       -- 'admin' | 'member' | 'viewer'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, space_id)
);

-- User brand access (B2B specific)
CREATE TABLE public.user_brand_access (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id UUID,                    -- references b2b.brands after migration
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, brand_id)
);

-- User type on existing users table (add column if not exists)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS last_space TEXT DEFAULT 'b2b';
```

---

## Safety Checklist — Run After Every Phase

```
Phase A complete:
  [ ] Table inventory exported and saved
  [ ] Every table categorized
  [ ] API route → table map documented

Phase B complete:
  [ ] All 6 schemas exist in Supabase
  [ ] No existing queries broken (run app and check)

Phase C complete (per table):
  [ ] Row counts match between public and new schema
  [ ] Compatibility view created in public
  [ ] Drizzle schema updated
  [ ] All affected routes tested manually
  [ ] No errors in Supabase logs
  [ ] Old table renamed with date suffix (NOT dropped)
  [ ] 7-day wait before final drop

Phase D complete:
  [ ] RLS enabled on all migrated tables
  [ ] Internal user access policy tested
  [ ] Brand filter policy tested
  [ ] Vendor/client policies return empty (not error) for wrong user type

Phase E complete:
  [ ] public.spaces table seeded
  [ ] public.user_space_roles table created
  [ ] public.user_brand_access table created
  [ ] users table has user_type column
  [ ] Super admin (you) has access to all spaces in user_space_roles
```

---

## Rollback Plan

If anything breaks at any phase:

1. **Phase B** — Drop the empty schemas. Zero impact.
2. **Phase C** — The original `public.orders` table still exists (you renamed, not dropped). Revert Drizzle schema change. App is back to normal instantly.
3. **Phase D** — Disable RLS temporarily: `ALTER TABLE b2b.orders DISABLE ROW LEVEL SECURITY;`
4. **Phase E** — New tables are additive. Drop them if needed. No existing functionality depends on them yet.

At no point in this guide do you irreversibly delete anything until a 7-day verification window has passed.
