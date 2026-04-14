import "server-only"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/**
 * Service-role client for USDrop admin writes.
 *
 * RLS on `usdrop.*` tables grants only SELECT to the `authenticated` role, so
 * every INSERT / UPDATE / DELETE must go through this service-role client,
 * which is only importable from server actions (enforced via `server-only`).
 *
 * Never import this from a Client Component. Pair it with "use server"
 * actions colocated in the USDrop space.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""

// Untyped client — schema types for `usdrop` are not generated yet, so we
// intentionally widen to `SupabaseClient` so `.from("anything").update(obj)`
// accepts a plain Record<string, unknown>.
let _admin: SupabaseClient | null = null

export function usdropAdmin(): SupabaseClient {
  if (!_admin) {
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        "USDrop admin client missing env: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.",
      )
    }
    _admin = createClient(supabaseUrl, serviceRoleKey, {
      db: { schema: "usdrop" as unknown as "public" },
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return _admin
}

export type ActionResult = { ok: true } | { ok: false; error: string }
