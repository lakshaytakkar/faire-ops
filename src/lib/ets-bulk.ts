import { supabaseEts } from "@/lib/supabase"

/**
 * Bulk-update a set of rows in `ets.products` by id.
 * Returns the count of rows updated (or throws on error).
 *
 * Shared across catalog admin pages (compliance queue, image workbench)
 * so each page doesn't hand-roll its own supabase call.
 */
export async function bulkUpdateProducts(
  ids: string[],
  patch: Record<string, unknown>,
): Promise<{ updated: number; error: string | null }> {
  if (ids.length === 0) return { updated: 0, error: null }
  const { data, error } = await supabaseEts
    .from("products")
    .update(patch)
    .in("id", ids)
    .select("id")
  if (error) return { updated: 0, error: error.message }
  return { updated: data?.length ?? 0, error: null }
}

/**
 * Update a single product row by id. Convenience helper for inline-edit
 * cells (hs_code, bis_status, etc.).
 */
export async function updateProduct(
  id: string,
  patch: Record<string, unknown>,
): Promise<{ error: string | null }> {
  const { error } = await supabaseEts
    .from("products")
    .update(patch)
    .eq("id", id)
  return { error: error?.message ?? null }
}
