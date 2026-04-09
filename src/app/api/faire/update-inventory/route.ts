import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { updateVariantInventory } from "@/lib/faire-api"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  )
}

const TARGET_QUANTITY = 10000
const DELAY_MS = 250 // delay between API calls to avoid rate limiting

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function POST() {
  try {
    // Get all active stores
    const { data: stores } = await getSupabase()
      .from("faire_stores")
      .select("id, name, oauth_token, app_credentials")
      .eq("active", true)
      .order("name")

    if (!stores?.length) {
      return NextResponse.json({ error: "No stores found" }, { status: 400 })
    }

    const results = []

    for (const store of stores) {
      const creds = { oauth_token: store.oauth_token, app_credentials: store.app_credentials }

      // Get all products for this store
      const pageSize = 1000
      const allProducts: { faire_product_id: string; raw_data: Record<string, unknown>; variant_count: number }[] = []
      let from = 0
      let hasMore = true
      while (hasMore) {
        const { data } = await getSupabase()
          .from("faire_products")
          .select("faire_product_id, raw_data, variant_count")
          .eq("store_id", store.id)
          .range(from, from + pageSize - 1)
        if (data && data.length > 0) {
          allProducts.push(...data)
          from += pageSize
          if (data.length < pageSize) hasMore = false
        } else {
          hasMore = false
        }
      }

      let variantsUpdated = 0
      let productsFailed = 0
      let productsProcessed = 0

      console.log(`[${store.name}] Processing ${allProducts.length} products...`)

      for (const product of allProducts) {
        const variants = (product.raw_data as Record<string, unknown>)?.variants as unknown[] ?? []

        for (const v of variants) {
          const variant = v as Record<string, unknown>
          const variantId = variant.id as string
          if (!variantId) continue

          try {
            await updateVariantInventory(creds, product.faire_product_id, variantId, TARGET_QUANTITY)
            variantsUpdated++
          } catch (err) {
            const msg = (err as Error).message
            if (msg.includes("429") || msg.includes("RATE_LIMITED")) {
              // Rate limited — wait longer and retry
              await delay(3000)
              try {
                await updateVariantInventory(creds, product.faire_product_id, variantId, TARGET_QUANTITY)
                variantsUpdated++
              } catch {
                productsFailed++
              }
            } else {
              console.error(`Failed: ${product.faire_product_id}/${variantId}: ${msg}`)
              productsFailed++
            }
          }

          await delay(DELAY_MS)
        }

        // Update local DB inventory
        await getSupabase()
          .from("faire_products")
          .update({ total_inventory: TARGET_QUANTITY * variants.length })
          .eq("faire_product_id", product.faire_product_id)

        productsProcessed++

        if (productsProcessed % 50 === 0) {
          console.log(`[${store.name}] Progress: ${productsProcessed}/${allProducts.length} products, ${variantsUpdated} variants updated`)
        }
      }

      results.push({
        store: store.name,
        products_total: allProducts.length,
        products_processed: productsProcessed,
        variants_updated: variantsUpdated,
        failed: productsFailed,
      })

      console.log(`[${store.name}] Done: ${variantsUpdated} variants updated, ${productsFailed} failed`)
    }

    return NextResponse.json({
      success: true,
      target_quantity: TARGET_QUANTITY,
      results,
      total_variants_updated: results.reduce((s, r) => s + r.variants_updated, 0),
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
