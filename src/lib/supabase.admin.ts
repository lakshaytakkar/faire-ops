// Server-only Supabase client for the `admin` schema.
//
// The `admin` schema hosts cross-venture read-only VIEWS (e.g. admin.all_active_orders,
// admin.all_clients) that UNION data across b2b/ets/usdrop/chinaproducts/chinaimports/
// gullee/jsblueridge/legal/goyo. It is NOT exposed via PostgREST — the only way to
// reach it is this service-role client running server-side.
//
// HARD RULES:
//   1. NEVER import this file from any "use client" module. It leaks SUPABASE_SERVICE_ROLE_KEY.
//   2. NEVER use this client for writes. Views are read-only; writes belong in per-schema
//      clients (supabaseEts, supabaseB2B, supabaseUsdrop, etc.).
//   3. External portals (client-apps/*, vendor-portals/*, websites/*) MUST NOT consume
//      from this file — they are separate Vercel deploys with anon-scoped clients and
//      should stay schema-isolated.
//
// See team-portal/docs/CROSS_SCHEMA.md for the full pattern.

import "server-only"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""

if (!serviceRoleKey) {
  // Soft warn rather than throw at module load — pages that don't use this client
  // shouldn't crash the build. Pages that call it will fail with a helpful error.
  console.warn(
    "[supabase.admin] SUPABASE_SERVICE_ROLE_KEY is not set. admin.* reads will fail.",
  )
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  db: { schema: "admin" },
})
