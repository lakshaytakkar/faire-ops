import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { updateVariantInventory } from "@/lib/faire-api"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
)

const TARGET = 10000
const DELAY = 200

export async function POST(_req: Request, { params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params
  try {
    const { data: store } = await supabase
      .from("faire_stores")
      .select("id, name, oauth_token, app_credentials")
      .eq("id", storeId)
      .single()

    if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 })

    const creds = { oauth_token: store.oauth_token, app_credentials: store.app_credentials }

    // Only fetch products NOT yet updated
    const { data: products } = await supabase
      .from("faire_products")
      .select("faire_product_id, raw_data, variant_count")
      .eq("store_id", store.id)
      .lt("total_inventory", TARGET)
      .range(0, 999)

    if (!products?.length) {
      return NextResponse.json({ store: store.name, message: "All products already at target", updated: 0 })
    }

    let updated = 0
    let failed = 0

    for (const product of products) {
      const variants = ((product.raw_data as Record<string, unknown>)?.variants as unknown[]) ?? []
      for (const v of variants) {
        const vid = (v as Record<string, unknown>).id as string
        if (!vid) continue
        try {
          await updateVariantInventory(creds, product.faire_product_id, vid, TARGET)
          updated++
        } catch (err) {
          if ((err as Error).message.includes("429")) {
            await new Promise(r => setTimeout(r, 3000))
            try {
              await updateVariantInventory(creds, product.faire_product_id, vid, TARGET)
              updated++
            } catch { failed++ }
          } else { failed++ }
        }
        await new Promise(r => setTimeout(r, DELAY))
      }
      await supabase.from("faire_products").update({ total_inventory: TARGET * variants.length }).eq("faire_product_id", product.faire_product_id)
    }

    return NextResponse.json({
      store: store.name,
      batch_size: products.length,
      variants_updated: updated,
      failed,
      remaining: products.length > 999 ? "more batches needed" : "done",
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
