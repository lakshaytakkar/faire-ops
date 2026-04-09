import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  )
}

const BASE_URL = process.env.FAIRE_API_BASE_URL || "https://www.faire.com/external-api/v2"

async function countFaireItems(
  path: string,
  itemKey: string,
  oauthToken: string,
  appCredentials: string
): Promise<number> {
  let total = 0
  let page = 1
  let hasMore = true

  while (hasMore) {
    try {
      const res = await fetch(`${BASE_URL}${path}?limit=50&page=${page}`, {
        headers: {
          "X-FAIRE-OAUTH-ACCESS-TOKEN": oauthToken,
          "X-FAIRE-APP-CREDENTIALS": appCredentials,
          "Content-Type": "application/json",
        },
      })

      if (!res.ok) {
        if (res.status === 429) {
          await new Promise((r) => setTimeout(r, 2000))
          continue
        }
        break
      }

      const data = await res.json()
      const items = data[itemKey] ?? []
      total += items.length

      if (items.length < 50) {
        hasMore = false
      } else {
        page++
      }
    } catch {
      hasMore = false
    }
  }

  return total
}

export async function GET() {
  try {
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
      // Count in DB
      const { count: dbOrders } = await getSupabase()
        .from("faire_orders")
        .select("*", { count: "exact", head: true })
        .eq("store_id", store.id)

      const { count: dbProducts } = await getSupabase()
        .from("faire_products")
        .select("*", { count: "exact", head: true })
        .eq("store_id", store.id)

      // Count from Faire API
      const faireOrders = await countFaireItems(
        "/orders",
        "orders",
        store.oauth_token,
        store.app_credentials
      )

      const faireProducts = await countFaireItems(
        "/products",
        "products",
        store.oauth_token,
        store.app_credentials
      )

      const orderMatch = (dbOrders ?? 0) >= faireOrders * 0.95 // allow 5% tolerance (deleted old ones)
      const productMatch = (dbProducts ?? 0) >= faireProducts * 0.95

      results.push({
        store: store.name,
        orders: {
          faire_api: faireOrders,
          in_db: dbOrders ?? 0,
          match: orderMatch,
          diff: (dbOrders ?? 0) - faireOrders,
        },
        products: {
          faire_api: faireProducts,
          in_db: dbProducts ?? 0,
          match: productMatch,
          diff: (dbProducts ?? 0) - faireProducts,
        },
      })
    }

    const { count: totalRetailers } = await getSupabase()
      .from("faire_retailers")
      .select("*", { count: "exact", head: true })

    return NextResponse.json({
      success: true,
      verified_at: new Date().toISOString(),
      total_orders_in_db: results.reduce((s, r) => s + r.orders.in_db, 0),
      total_products_in_db: results.reduce((s, r) => s + r.products.in_db, 0),
      total_retailers: totalRetailers ?? 0,
      stores: results,
      note: "Orders before June 20, 2024 were deleted per policy. DB count may be lower than Faire API total.",
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
