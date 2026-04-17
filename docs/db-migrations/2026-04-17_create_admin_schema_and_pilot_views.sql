-- 2026-04-17_create_admin_schema_and_pilot_views.sql
-- Purpose: Create the `admin` schema that hosts cross-venture read-only views
--         consumed ONLY by team-portal (service_role).
-- Scope:  NOT exposed via PostgREST (don't add `admin` to postgrest.db-schemas).
--         GRANT only to service_role. anon + authenticated get nothing.
-- Risk:   Read-only views. No data mutation. Reversible by DROP SCHEMA admin CASCADE.

CREATE SCHEMA IF NOT EXISTS admin;
COMMENT ON SCHEMA admin IS 'Cross-venture read views for team-portal admin pages. Service-role only. Not exposed to anon/authenticated REST.';

REVOKE ALL ON SCHEMA admin FROM PUBLIC;
REVOKE ALL ON SCHEMA admin FROM anon;
REVOKE ALL ON SCHEMA admin FROM authenticated;
GRANT USAGE ON SCHEMA admin TO service_role;
GRANT USAGE ON SCHEMA admin TO postgres;

-- =========================================
-- admin.all_active_orders
-- Union of order streams across every venture. Normalized shape.
-- Columns: venture, order_id, order_number, customer_ref, customer_name, total,
--          currency, status, item_count, created_at, updated_at
-- =========================================
CREATE OR REPLACE VIEW admin.all_active_orders AS
  SELECT
    'b2b'::text                                     AS venture,
    o.id::text                                      AS order_id,
    o.display_id                                    AS order_number,
    o.retailer_id::text                             AS customer_ref,
    NULL::text                                      AS customer_name,
    (o.total_cents::numeric / 100.0)::numeric(14,2) AS total,
    'USD'::text                                     AS currency,
    o.state                                         AS status,
    o.item_count                                    AS item_count,
    o.faire_created_at                              AS created_at,
    o.faire_updated_at                              AS updated_at
  FROM b2b.faire_orders o

  UNION ALL
  SELECT 'jsblueridge', o.id::text, o.display_id, o.retailer_id::text, NULL::text,
         (o.total_cents::numeric/100.0)::numeric(14,2), 'USD', o.state, o.item_count,
         o.faire_created_at, o.faire_updated_at
  FROM jsblueridge.faire_orders o

  UNION ALL
  SELECT 'ets', o.id::text, o.order_number, o.client_id::text, NULL::text,
         o.total_amount::numeric(14,2), 'INR', o.status, o.total_items,
         o.created_at, o.updated_at
  FROM ets.orders o

  UNION ALL
  SELECT 'ets-pos', s.id::text, s.bill_number, s.customer_id::text, s.customer_name,
         s.total_amount::numeric(14,2), 'INR', s.status, NULL::int,
         s.sale_date, s.created_at
  FROM ets.pos_sales s

  UNION ALL
  SELECT 'chinaproducts', o.id::text, o.order_number, o.buyer_id::text, o.buyer_name,
         o.total_inr::numeric(14,2), 'INR', o.status, o.quantity_tier,
         o.created_at, o.updated_at
  FROM chinaproducts.orders o

  UNION ALL
  SELECT 'chinaimports', o.id::text, o.order_number, o.buyer_id::text, o.buyer_company,
         o.total_inr::numeric(14,2), 'INR', o.current_stage, o.quantity,
         o.created_at, o.updated_at
  FROM chinaimports.orders o

  UNION ALL
  SELECT 'gullee', o.id::text, o.order_number, o.retailer_id::text, NULL::text,
         o.total::numeric(14,2), 'USD', o.status, o.item_count,
         o.placed_at, o.created_at
  FROM gullee.orders o

  UNION ALL
  SELECT 'usdrop', o.id::text, o.order_number, o.user_id::text, o.customer_name,
         o.total_amount::numeric(14,2), 'USD', o.status, NULL::int,
         o.created_at, o.updated_at
  FROM usdrop.orders o;

COMMENT ON VIEW admin.all_active_orders IS
'Cross-venture order roster. Consumed by team-portal HQ overview page. Service-role only.';

-- =========================================
-- admin.all_clients
-- Unified client/customer/retailer roster across ventures.
-- Columns: venture, client_id, external_code, name, email, phone, country, status,
--          created_at, updated_at
-- =========================================
CREATE OR REPLACE VIEW admin.all_clients AS
  SELECT
    'legal'::text      AS venture,
    c.id::text         AS client_id,
    c.client_code      AS external_code,
    c.client_name      AS name,
    c.email            AS email,
    c.contact_number   AS phone,
    c.country          AS country,
    c.llc_status       AS status,
    c.created_at       AS created_at,
    c.updated_at       AS updated_at
  FROM legal.clients c

  UNION ALL
  SELECT 'goyo', c.id::text, c.client_code, c.name, c.email, c.phone,
         c.nationality, c.status, c.created_at, c.updated_at
  FROM goyo.clients c

  UNION ALL
  SELECT 'ets', c.id::text, c.client_id_external, c.name, c.email, c.phone,
         c.country, c.stage, c.created_at, c.updated_at
  FROM ets.clients c

  UNION ALL
  SELECT 'ets-retail', cu.id::text, NULL::text, cu.name, cu.email, cu.phone,
         NULL::text,
         CASE WHEN cu.is_active THEN 'active' ELSE 'inactive' END,
         cu.created_at, cu.updated_at
  FROM ets.customers cu

  UNION ALL
  SELECT 'gullee', r.id::text, NULL::text, r.business_name, r.email, r.phone,
         r.country, r.status, r.created_at, r.created_at
  FROM gullee.retailers r;

COMMENT ON VIEW admin.all_clients IS
'Cross-venture client roster. Consumed by team-portal HQ overview page. Service-role only.';

-- Grants
GRANT SELECT ON admin.all_active_orders TO service_role;
GRANT SELECT ON admin.all_clients TO service_role;

-- Verification (run after apply):
--   As service_role: SELECT count(*), venture FROM admin.all_active_orders GROUP BY venture;
--                    -> expect 20 022 total (b2b 1851, jsblueridge 16962, ets 3, ets-pos 1190, chinaimports 1, gullee 15)
--   As anon:         SELECT * FROM admin.all_active_orders;
--                    -> expect `permission denied for schema admin`
