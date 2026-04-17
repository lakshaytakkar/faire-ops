import "server-only"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/**
 * Service-role client for Life AI admin writes.
 *
 * Mirrors the USDrop `_client.ts` pattern: life.* tables are read via the
 * anon `supabaseLife` client, and mutated via this server-only service-role
 * client from inside "use server" actions. Never import this from a Client
 * Component.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""

let _admin: SupabaseClient | null = null

export function lifeAdmin(): SupabaseClient {
  if (!_admin) {
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        "Life admin client missing env: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.",
      )
    }
    _admin = createClient(supabaseUrl, serviceRoleKey, {
      db: { schema: "life" as unknown as "public" },
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return _admin
}

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string }
