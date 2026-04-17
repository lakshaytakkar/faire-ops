import { NextResponse } from "next/server"
import {
  fetchAllOrders,
  fetchAllProducts,
  extractOrderFields,
  extractProductFields,
  extractRetailerFromOrder,
} from "@/lib/faire-api"
import { getSupabaseJSBlueridgeAdmin } from "@/lib/supabase"

/**
 * Sync JSBlueridge store data from the Faire API.
 * Uses service-role key to bypass PostgREST schema exposure.
 */
export async function POST() {
  const db = getSupabaseJSBlueridgeAdmin()

  try {
    const { data: stores, error: storesError } = await db
      .from("faire_stores")
      .select("id, faire_store_id, name, oauth_token, app_credentials")

    if (storesError || !stores?.length) {
      return NextResponse.json(
        { error: "No JSBlueridge stores found", details: storesError },
        { status: 400 },
      )
    }

    const results = []

    for (const store of stores) {
      const creds = {
        oauth_token: store.oauth_token,
        app_credentials: store.app_credentials,
      }

      // Log sync start
      const { data: logEntry } = await db
        .from("sync_log")
        .insert({ store_id: store.id, sync_type: "full", status: "started" })
        .select("id")
        .single()

      let ordersSynced = 0
      let productsSynced = 0
      let retailersSynced = 0
      let syncError: string | null = null

      try {
        // ---- Orders ----
        const rawOrders = await fetchAllOrders(creds)
        if (rawOrders.length > 0) {
          const orderRows = rawOrders.map((o) => ({
            ...extractOrderFields(o as Record<string, unknown>),
            store_id: store.id,
          }))

          const { error: orderErr } = await db
            .from("faire_orders")
            .upsert(orderRows, { onConflict: "faire_order_id" })

          if (orderErr) console.error(`[jsblueridge] Orders upsert error:`, orderErr)
          else ordersSynced = orderRows.length

          // Extract retailers from orders
          const retailerMap = new Map<string, ReturnType<typeof extractRetailerFromOrder>>()
          for (const o of rawOrders) {
            const r = extractRetailerFromOrder(o as Record<string, unknown>)
            if (r) retailerMap.set(r.faire_retailer_id, r)
          }

          if (retailerMap.size > 0) {
            const retailerRows = Array.from(retailerMap.values()).map((r) => ({
              ...r,
              raw_data: {},
              store_ids: [store.faire_store_id],
            }))

            const { error: retErr } = await db
              .from("faire_retailers")
              .upsert(retailerRows, { onConflict: "faire_retailer_id" })

            if (retErr) console.error(`[jsblueridge] Retailers upsert error:`, retErr)
            else retailersSynced = retailerRows.length
          }
        }

        // ---- Products ----
        const rawProducts = await fetchAllProducts(creds)
        if (rawProducts.length > 0) {
          const productRows = rawProducts.map((p) => ({
            ...extractProductFields(p as Record<string, unknown>),
            store_id: store.id,
          }))

          const { error: prodErr } = await db
            .from("faire_products")
            .upsert(productRows, { onConflict: "faire_product_id" })

          if (prodErr) console.error(`[jsblueridge] Products upsert error:`, prodErr)
          else productsSynced = productRows.length
        }

        // Update store counts
        await db
          .from("faire_stores")
          .update({
            total_orders: ordersSynced,
            total_products: productsSynced,
            last_synced_at: new Date().toISOString(),
          })
          .eq("id", store.id)
      } catch (err) {
        syncError = (err as Error).message
        console.error(`[jsblueridge] Sync failed for ${store.name}:`, err)
      }

      if (logEntry?.id) {
        await db
          .from("sync_log")
          .update({
            status: syncError ? "failed" : "completed",
            items_synced: ordersSynced + productsSynced,
            error_message: syncError,
            completed_at: new Date().toISOString(),
          })
          .eq("id", logEntry.id)
      }

      results.push({
        store: store.name,
        orders_synced: ordersSynced,
        products_synced: productsSynced,
        retailers_synced: retailersSynced,
        error: syncError,
      })
    }

    return NextResponse.json({ success: true, results })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
