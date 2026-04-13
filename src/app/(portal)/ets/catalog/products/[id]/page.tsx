import { redirect } from "next/navigation"
import { createClient } from "@supabase/supabase-js"

// Resolve the legacy /ets/catalog/products/[id] (UUID) URL to the canonical
// /ets/products/[sku] route. Falls back to the UUID if SKU lookup fails so
// the new detail page can still render via its UUID fallback.
export default async function LegacyProductRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  let slug = id
  if (url && key) {
    const sb = createClient(url, key, {
      auth: { persistSession: false },
      db: { schema: "ets" },
    })
    const { data } = await sb
      .from("products")
      .select("product_code")
      .eq("id", id)
      .maybeSingle()
    if (data?.product_code) slug = data.product_code
  }
  redirect(`/ets/products/${slug}`)
}
