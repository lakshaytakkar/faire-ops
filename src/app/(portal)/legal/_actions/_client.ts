import "server-only"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""

let _admin: SupabaseClient | null = null

export function legalAdmin(): SupabaseClient {
  if (!_admin) {
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        "Legal admin client missing env: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.",
      )
    }
    _admin = createClient(supabaseUrl, serviceRoleKey, {
      db: { schema: "legal" as unknown as "public" },
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return _admin
}

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string }
