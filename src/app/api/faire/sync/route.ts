import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import {
  fetchAllOrders,
  fetchAllProducts,
  extractOrderFields,
  extractProductFields,
  extractRetailerFromOrder,
} from "@/lib/faire-api"
import { supabaseB2B } from "@/lib/supabase"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  )
}

export async function POST() {
  try {
    // Get all active stores
    const { data: stores, error: storesError } = await supabaseB2B
      .from("faire_stores")
      .select("id, faire_store_id, name, oauth_token, app_credentials")
      .eq("active", true)

    if (storesError || !stores?.length) {
      return NextResponse.json({ error: "No stores found", details: storesError }, { status: 400 })
    }

    const results = []

    for (const store of stores) {
      const creds = { oauth_token: store.oauth_token, app_credentials: store.app_credentials }

      // Log sync start
      const { data: logEntry } = await supabaseB2B
        .from("sync_log")
        .insert({ store_id: store.id, sync_type: "full", status: "started" })
        .select("id")
        .single()

      let ordersSynced = 0
      let productsSynced = 0
      let retailersSynced = 0
      let syncError: string | null = null

      try {
        // Sync Orders
        const rawOrders = await fetchAllOrders(creds)
        if (rawOrders.length > 0) {
          // Filter out orders before June 20, 2024
          const cutoffDate = new Date("2024-06-20T00:00:00Z")
          const filteredOrders = rawOrders.filter((o) => {
            const rec = o as Record<string, unknown>
            const created = (rec.created_at ?? rec.creation_date) as string | undefined
            return created ? new Date(created) >= cutoffDate : true
          })

          const orderRows = filteredOrders.map((o) => ({
            ...extractOrderFields(o as Record<string, unknown>),
            store_id: store.id,
          }))

          const { error: orderErr } = await supabaseB2B
            .from("faire_orders")
            .upsert(orderRows, { onConflict: "faire_order_id" })

          if (orderErr) console.error(`Orders upsert error for ${store.name}:`, orderErr)
          else ordersSynced = orderRows.length

          // Extract retailers from orders
          const retailerMap = new Map<string, ReturnType<typeof extractRetailerFromOrder>>()
          for (const o of filteredOrders) {
            const r = extractRetailerFromOrder(o as Record<string, unknown>)
            if (r) retailerMap.set(r.faire_retailer_id, r)
          }

          if (retailerMap.size > 0) {
            const retailerRows = Array.from(retailerMap.values()).map((r) => ({
              ...r,
              raw_data: {},
              store_ids: [store.faire_store_id],
            }))

            const { error: retErr } = await supabaseB2B
              .from("faire_retailers")
              .upsert(retailerRows, { onConflict: "faire_retailer_id" })

            if (retErr) console.error(`Retailers upsert error for ${store.name}:`, retErr)
            else retailersSynced = retailerRows.length
          }

          // Compute retailer aggregates — done after sync via direct SQL
          try {
            await getSupabase().rpc("exec_sql", { query: "SELECT 1" })
          } catch {
            // RPC not available — aggregates will be computed separately
          }
        }

        // Sync Products
        const rawProducts = await fetchAllProducts(creds)
        if (rawProducts.length > 0) {
          const productRows = rawProducts.map((p) => ({
            ...extractProductFields(p as Record<string, unknown>),
            store_id: store.id,
          }))

          const { error: prodErr } = await supabaseB2B
            .from("faire_products")
            .upsert(productRows, { onConflict: "faire_product_id" })

          if (prodErr) console.error(`Products upsert error for ${store.name}:`, prodErr)
          else productsSynced = productRows.length
        }

        // Update store counts and sync time
        await supabaseB2B
          .from("faire_stores")
          .update({
            total_orders: ordersSynced,
            total_products: productsSynced,
            last_synced_at: new Date().toISOString(),
          })
          .eq("id", store.id)

      } catch (err) {
        syncError = (err as Error).message
        console.error(`Sync failed for ${store.name}:`, err)
      }

      // Update sync log
      if (logEntry?.id) {
        await supabaseB2B
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

    // Auto-request quotes for all NEW orders that don't have quotes yet
    try {
      const { data: newOrders } = await supabaseB2B
        .from("faire_orders")
        .select("faire_order_id")
        .eq("state", "NEW")
        .or("quote_status.is.null,quote_status.eq.none")

      if (newOrders && newOrders.length > 0) {
        const { data: vendors } = await supabaseB2B.from("faire_vendors").select("id")
        if (vendors && vendors.length > 0) {
          let quotesCreated = 0
          for (const order of newOrders) {
            // Check if quotes already exist for this order
            const { count } = await supabaseB2B
              .from("vendor_quotes")
              .select("*", { count: "exact", head: true })
              .eq("order_id", order.faire_order_id)
            if ((count ?? 0) > 0) continue

            // Get order items
            const { data: orderData } = await supabaseB2B
              .from("faire_orders")
              .select("raw_data")
              .eq("faire_order_id", order.faire_order_id)
              .single()

            const rawItems = ((orderData?.raw_data as Record<string, unknown>)?.items as Record<string, unknown>[]) ?? []
            const items = rawItems.map((item) => ({
              product_name: (item.product_name as string) ?? "",
              quantity: (item.quantity as number) ?? 1,
            }))

            const quoteRows = vendors.map((v) => ({
              order_id: order.faire_order_id,
              vendor_id: v.id,
              status: "requested",
              items,
            }))

            await supabaseB2B.from("vendor_quotes").insert(quoteRows)
            await supabaseB2B.from("faire_orders").update({ quote_status: "requested" }).eq("faire_order_id", order.faire_order_id)
            quotesCreated += vendors.length
          }
          if (quotesCreated > 0) console.log(`Auto-requested ${quotesCreated} quotes for ${newOrders.length} new orders`)
        }
      }
    } catch { /* auto-quote is best-effort */ }

    return NextResponse.json({ success: true, results })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
