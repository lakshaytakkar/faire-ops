# Cross-schema pattern

One Supabase project hosts every venture (19 schemas: `b2b`, `chinaproducts`, `chinaimports`, `ets`, `gullee`, `goyo`, `hq`, `jsblueridge`, `legal`, `life`, `suprans`, `suprdm`, `usdrop`, `hrms`, `public`, `shared`, `vendor`, `client`, `b2b_ecosystem`). Most pages in team-portal are **schema-scoped** — one venture at a time, using the per-schema anon clients in `src/lib/supabase.ts`. But a few dashboards (HQ rollups, cross-venture CRM, all-ventures task view) need to **read across schemas**. The `admin` schema is the sanctioned place for that.

## Rules

1. **Cross-schema reads happen only in team-portal.** Never in `client-apps/*`, `vendor-portals/*`, `websites/*`, or `ecommerce/*`. Each of those is a separate Vercel deploy and must stay scoped to its own venture schema via the anon/authenticated role + RLS.
2. **Cross-schema reads happen only through the `admin` schema.** Never ad-hoc service-role queries scattered across pages — those are impossible to audit and grep for.
3. **`admin.*` is read-only VIEWS.** No base tables. If you need a base table to live across ventures, that's a different design conversation (consolidation) — open an issue, don't inline it.
4. **Never expose `admin` via PostgREST.** It must stay out of `postgrest.db-schemas`. The only reader is `service_role` from server-side code in team-portal.
5. **Service-role key stays server-side.** Use `src/lib/supabase.admin.ts` (which imports `"server-only"` so any client-side import crashes the build).

## How to consume an admin view

```tsx
// Server component only — this file must never have "use client"
import { supabaseAdmin } from "@/lib/supabase.admin"

export default async function Page() {
  const { data, error } = await supabaseAdmin
    .from("all_active_orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    return <div>Failed to load cross-venture orders: {error.message}</div>
  }
  return <Table rows={data} />
}
```

Because the client is pinned to `db: { schema: "admin" }`, you just pass the view name — no schema prefix.

## Views that exist today

| View | Union of | Row count (2026-04-17) | Purpose |
|---|---|---|---|
| `admin.all_active_orders` | `b2b.faire_orders`, `jsblueridge.faire_orders`, `ets.orders`, `ets.pos_sales`, `chinaproducts.orders`, `chinaimports.orders`, `gullee.orders`, `usdrop.orders` | ~20 022 | Every order stream across ventures, normalised to `{venture, order_id, order_number, customer_ref, customer_name, total, currency, status, item_count, created_at, updated_at}` |
| `admin.all_clients` | `legal.clients`, `goyo.clients`, `ets.clients`, `ets.customers`, `gullee.retailers` | ~640 | Cross-venture client roster, normalised to `{venture, client_id, external_code, name, email, phone, country, status, created_at, updated_at}` |

Pilot page that consumes both: `src/app/(portal)/development/cross-schema-demo/page.tsx`.

## How to add a new admin view

1. **Name.** Prefix with `all_` if the view unions data (e.g. `all_employees`, `all_deployments`, `all_tasks`). Prefix with `by_` if it's an aggregate rollup (e.g. `by_venture_revenue_monthly`).
2. **Shape.** Pick the column contract carefully — once a page reads the view, renaming columns is a migration. Follow the normalised shape convention (venture / natural_id / name / total / currency / status / created_at / updated_at where applicable).
3. **Cast explicitly.** Every `UNION ALL` branch must emit the same data type for the same column. Cast with `::text`, `::numeric(14,2)`, etc.
4. **Migration file.** Create `team-portal/docs/db-migrations/YYYY-MM-DD_<name>.sql` with `CREATE OR REPLACE VIEW admin.<name> AS ...`. End with `GRANT SELECT ON admin.<name> TO service_role;`. Apply via `mcp__supabase__apply_migration` (requires user confirmation).
5. **Update this doc.** Add a row to the table above.
6. **Consume it.** Wire the view into a team-portal server component that uses `supabaseAdmin`.

## Verification after applying any `admin.*` migration

```sql
-- As service_role (connected with SUPABASE_SERVICE_ROLE_KEY):
SET ROLE service_role;
SELECT count(*), venture FROM admin.all_active_orders GROUP BY venture ORDER BY 1 DESC;
-- should return one row per venture with a sensible count.

-- As anon:
SET ROLE anon;
SELECT * FROM admin.all_active_orders LIMIT 1;
-- expect ERROR: permission denied for schema admin

RESET ROLE;
```

Repeat for any external portal: hit its URL with network tab open, confirm no requests surface `admin.*` anywhere. If they do, the view was accidentally exposed (check `postgrest.db-schemas` in Supabase dashboard → Project Settings → API).

## When NOT to add an admin view

- **One venture at a time.** If the page only reads `b2b.*`, use `supabaseB2B` directly. Don't add `admin.b2b_orders` just to keep one file pattern.
- **Writes.** `admin.*` is views. Writes go through the venture's server actions, which already use the per-schema client.
- **Client-side.** If the data ends up in a `"use client"` component, still fetch it server-side and pass it as props. Never expose `supabaseAdmin` to the browser.

## Promoting a view to materialized

If a view is read on every page load and the underlying union is expensive (>500 ms at 10x current data), promote to `MATERIALIZED VIEW`:

```sql
CREATE MATERIALIZED VIEW admin.all_active_orders_mv AS SELECT * FROM admin.all_active_orders;
CREATE UNIQUE INDEX ON admin.all_active_orders_mv (venture, order_id);
-- refresh manually or via pg_cron:
-- SELECT cron.schedule('refresh_admin_orders', '*/5 * * * *', $$REFRESH MATERIALIZED VIEW CONCURRENTLY admin.all_active_orders_mv$$);
```

Then switch the page to read `all_active_orders_mv` instead. Keep the non-materialized view for freshness fallback.

## Related

- **DB hygiene report:** `docs/db-audits/2026-04-17.md` — identifies what data actually lives where and flags duplication candidates that would reduce the need for `admin.*` unions.
- **Migration queue:** `docs/db-migrations/` — staged SQL awaiting user approval.
- **Per-schema clients:** `src/lib/supabase.ts` — start here for single-venture work.
