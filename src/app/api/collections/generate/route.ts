import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { supabaseB2B } from "@/lib/supabase"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  )
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function parseCategoryName(cat: string | null): string | null {
  if (!cat) return null
  try {
    const parsed = JSON.parse(cat)
    if (parsed && typeof parsed === "object" && parsed.name) return parsed.name
  } catch {
    /* not JSON */
  }
  return null
}

/** Title-case a string: "pet chew toy - dog" → "Pet Chew Toy - Dog" */
function titleCase(str: string): string {
  return str
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Clean up category name: trim, title-case, strip JSON artifacts */
function cleanCategoryName(raw: string): string {
  let name = raw.trim()
  // Strip stray JSON artifacts like leading/trailing braces, quotes
  name = name.replace(/^[\s{"\[]+/, "").replace(/[\s}"\]]+$/, "")
  // If it still looks like a JSON key:value, extract the value
  const kvMatch = name.match(/name["']?\s*:\s*["']?([^"'}]+)/)
  if (kvMatch) name = kvMatch[1]
  return titleCase(name)
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

interface PriceRange {
  name: string
  filter_rules: Record<string, number>
}

const PRICE_RANGES: PriceRange[] = [
  { name: "Under $5", filter_rules: { max_price_cents: 500 } },
  { name: "Under $10", filter_rules: { max_price_cents: 1000 } },
  { name: "$10-$25", filter_rules: { min_price_cents: 1000, max_price_cents: 2500 } },
  { name: "$25+", filter_rules: { min_price_cents: 2500 } },
]

/* ------------------------------------------------------------------ */
/*  Step 1: Deduplicate existing collections                           */
/* ------------------------------------------------------------------ */

async function deduplicateCollections(): Promise<number> {
  // Find duplicate groups (same store_id + collection_type + name)
  const { data: dupes } = await getSupabase().rpc("get_duplicate_collections").select()

  // Fallback: query manually if RPC doesn't exist
  if (!dupes) {
    const { data: all } = await supabaseB2B
      .from("collections")
      .select("id, store_id, collection_type, name, created_at")
      .order("created_at", { ascending: true })

    if (!all || all.length === 0) return 0

    const seen = new Map<string, string>() // key → first id
    const toDelete: string[] = []

    for (const row of all) {
      const key = `${row.store_id}|${row.collection_type}|${row.name}`
      if (seen.has(key)) {
        toDelete.push(row.id)
      } else {
        seen.set(key, row.id)
      }
    }

    if (toDelete.length > 0) {
      await supabaseB2B.from("collections").delete().in("id", toDelete)
    }
    return toDelete.length
  }

  return 0
}

/* ------------------------------------------------------------------ */
/*  Step 2: Standardize names on existing collections                  */
/* ------------------------------------------------------------------ */

async function standardizeNames(): Promise<number> {
  const { data: cats } = await supabaseB2B
    .from("collections")
    .select("id, name")
    .eq("collection_type", "category")

  if (!cats) return 0

  let updated = 0
  for (const row of cats) {
    const cleaned = cleanCategoryName(row.name)
    if (cleaned !== row.name) {
      await supabaseB2B.from("collections").update({ name: cleaned }).eq("id", row.id)
      updated++
    }
  }
  return updated
}

/* ------------------------------------------------------------------ */
/*  POST handler                                                       */
/* ------------------------------------------------------------------ */

export async function POST() {
  try {
    // --- Pre-generation cleanup ---
    const dupesRemoved = await deduplicateCollections()
    const namesStandardized = await standardizeNames()

    // Get all active stores
    const { data: stores, error: storesError } = await supabaseB2B
      .from("faire_stores")
      .select("id, name")
      .eq("active", true)

    if (storesError || !stores?.length) {
      return NextResponse.json(
        { error: "No active stores found", details: storesError },
        { status: 400 }
      )
    }

    const summary: Record<
      string,
      {
        categories: number
        priceRanges: number
        bestsellers: number
        newArrivals: number
        allProducts: number
        premiumCollection: number
        valuePicks: number
        skipped: number
        emptiesRemoved: number
        countsUpdated: number
      }
    > = {}

    for (const store of stores) {
      const storeResult = {
        categories: 0,
        priceRanges: 0,
        bestsellers: 0,
        newArrivals: 0,
        allProducts: 0,
        premiumCollection: 0,
        valuePicks: 0,
        skipped: 0,
        emptiesRemoved: 0,
        countsUpdated: 0,
      }

      // Fetch all products for this store
      const { data: products } = await supabaseB2B
        .from("faire_products")
        .select("id, category, wholesale_price_cents, faire_created_at, name")
        .eq("store_id", store.id)

      if (!products || products.length === 0) {
        summary[store.name] = storeResult
        continue
      }

      // Fetch existing collections for this store to avoid duplicates
      const { data: existingCollections } = await supabaseB2B
        .from("collections")
        .select("id, name, collection_type")
        .eq("store_id", store.id)

      // Build a dedup key set: "type|name"
      const existingKeys = new Set(
        (existingCollections ?? []).map((c) => `${c.collection_type}|${c.name}`)
      )

      /** Check if collection already exists by type+name */
      function collectionExists(type: string, name: string): boolean {
        return existingKeys.has(`${type}|${name}`)
      }

      /** Register a newly created collection */
      function registerCollection(type: string, name: string): void {
        existingKeys.add(`${type}|${name}`)
      }

      // --- 1) "All Products" collection (curated) ---
      if (!collectionExists("curated", "All Products")) {
        const { error } = await supabaseB2B.from("collections").insert({
          name: "All Products",
          description: "Browse our complete product catalog",
          store_id: store.id,
          collection_type: "curated",
          filter_rules: {},
          product_count: products.length,
          is_active: true,
          sort_order: 0,
        })
        if (!error) {
          storeResult.allProducts++
          registerCollection("curated", "All Products")
        }
      } else {
        storeResult.skipped++
      }

      // --- 2) Category collections ---
      const categoryMap = new Map<string, number>()
      for (const p of products) {
        const rawName = parseCategoryName(p.category)
        if (rawName) {
          const catName = cleanCategoryName(rawName)
          categoryMap.set(catName, (categoryMap.get(catName) ?? 0) + 1)
        }
      }

      for (const [catName, count] of categoryMap) {
        if (collectionExists("category", catName)) {
          storeResult.skipped++
          continue
        }
        const { error } = await supabaseB2B.from("collections").insert({
          name: catName,
          description: `All products in the ${catName} category`,
          store_id: store.id,
          collection_type: "category",
          filter_rules: { category_name: catName },
          product_count: count,
          is_active: true,
          sort_order: storeResult.categories + 10,
        })
        if (!error) {
          storeResult.categories++
          registerCollection("category", catName)
        }
      }

      // --- 3) Price-range collections ---
      for (const range of PRICE_RANGES) {
        if (collectionExists("price_range", range.name)) {
          storeResult.skipped++
          continue
        }

        let matchCount = 0
        for (const p of products) {
          const price = p.wholesale_price_cents ?? 0
          const min = range.filter_rules.min_price_cents ?? 0
          const max = range.filter_rules.max_price_cents ?? Infinity
          if (price >= min && price < max) matchCount++
        }

        if (matchCount === 0) continue

        const { error } = await supabaseB2B.from("collections").insert({
          name: range.name,
          description: `Products priced ${range.name.toLowerCase()}`,
          store_id: store.id,
          collection_type: "price_range",
          filter_rules: range.filter_rules,
          product_count: matchCount,
          is_active: true,
          sort_order: 100 + PRICE_RANGES.indexOf(range),
        })
        if (!error) {
          storeResult.priceRanges++
          registerCollection("price_range", range.name)
        }
      }

      // --- 4) Premium Collection & Value Picks (median-based) ---
      const prices = products
        .map((p) => p.wholesale_price_cents ?? 0)
        .filter((p) => p > 0)

      if (prices.length > 0) {
        const medianPrice = median(prices)

        // Premium Collection: above median
        if (!collectionExists("price_range", "Premium Collection")) {
          const premiumCount = prices.filter((p) => p >= medianPrice).length
          if (premiumCount > 0) {
            const { error } = await supabaseB2B.from("collections").insert({
              name: "Premium Collection",
              description: `Our finest products, priced above the median ($${(medianPrice / 100).toFixed(2)})`,
              store_id: store.id,
              collection_type: "price_range",
              filter_rules: { min_price_cents: medianPrice },
              product_count: premiumCount,
              is_active: true,
              sort_order: 110,
            })
            if (!error) {
              storeResult.premiumCollection++
              registerCollection("price_range", "Premium Collection")
            }
          }
        } else {
          storeResult.skipped++
        }

        // Value Picks: below median
        if (!collectionExists("price_range", "Value Picks")) {
          const valueCount = prices.filter((p) => p < medianPrice).length
          if (valueCount > 0) {
            const { error } = await supabaseB2B.from("collections").insert({
              name: "Value Picks",
              description: `Great finds at accessible prices, under $${(medianPrice / 100).toFixed(2)}`,
              store_id: store.id,
              collection_type: "price_range",
              filter_rules: { max_price_cents: medianPrice },
              product_count: valueCount,
              is_active: true,
              sort_order: 111,
            })
            if (!error) {
              storeResult.valuePicks++
              registerCollection("price_range", "Value Picks")
            }
          }
        } else {
          storeResult.skipped++
        }
      }

      // --- 5) Bestsellers collection ---
      if (!collectionExists("bestseller", "Bestsellers")) {
        const { data: orders } = await supabaseB2B
          .from("faire_orders")
          .select("raw_data")
          .eq("store_id", store.id)

        const productOrderCount = new Map<string, number>()
        if (orders) {
          for (const order of orders) {
            const rawData = order.raw_data as Record<string, unknown> | null
            const items = (rawData?.items ?? rawData?.line_items ?? []) as Array<
              Record<string, unknown>
            >
            for (const item of items) {
              const productId = (item.product_id ?? item.product_token ?? "") as string
              if (productId) {
                productOrderCount.set(
                  productId,
                  (productOrderCount.get(productId) ?? 0) + 1
                )
              }
            }
          }
        }

        const bestsellersCount = Math.min(20, productOrderCount.size)

        const { error } = await supabaseB2B.from("collections").insert({
          name: "Bestsellers",
          description: "Products with the most orders",
          store_id: store.id,
          collection_type: "bestseller",
          filter_rules: { top_n: 20 },
          product_count: bestsellersCount,
          is_active: true,
          sort_order: 200,
        })
        if (!error) {
          storeResult.bestsellers++
          registerCollection("bestseller", "Bestsellers")
        }
      } else {
        storeResult.skipped++
      }

      // --- 6) New Arrivals collection ---
      if (!collectionExists("curated", "New Arrivals")) {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const recentCount = products.filter((p) => {
          if (!p.faire_created_at) return false
          return new Date(p.faire_created_at) >= thirtyDaysAgo
        }).length

        const { error } = await supabaseB2B.from("collections").insert({
          name: "New Arrivals",
          description: "Most recently added products",
          store_id: store.id,
          collection_type: "curated",
          filter_rules: { sort_by: "faire_created_at", sort_dir: "desc", limit: 20 },
          product_count: Math.min(20, recentCount || products.length),
          is_active: true,
          sort_order: 201,
        })
        if (!error) {
          storeResult.newArrivals++
          registerCollection("curated", "New Arrivals")
        }
      } else {
        storeResult.skipped++
      }

      // --- Post-generation: Update product_count for ALL collections ---
      const { data: allCollections } = await supabaseB2B
        .from("collections")
        .select("id, name, collection_type, filter_rules")
        .eq("store_id", store.id)

      if (allCollections) {
        for (const col of allCollections) {
          const rules = (col.filter_rules ?? {}) as Record<string, unknown>
          let actualCount = 0

          if (col.collection_type === "category") {
            const catName = (rules.category_name as string) ?? ""
            actualCount = products.filter((p) => {
              const parsed = parseCategoryName(p.category)
              if (!parsed) return false
              return cleanCategoryName(parsed) === catName
            }).length
          } else if (col.collection_type === "price_range") {
            const minP = (rules.min_price_cents as number) ?? 0
            const maxP = (rules.max_price_cents as number) ?? Infinity
            actualCount = products.filter((p) => {
              const price = p.wholesale_price_cents ?? 0
              return price >= minP && price < maxP
            }).length
          } else if (col.collection_type === "bestseller") {
            // Keep existing count (based on order data already computed)
            continue
          } else if (
            col.collection_type === "curated" &&
            col.name === "All Products"
          ) {
            actualCount = products.length
          } else if (
            col.collection_type === "curated" &&
            col.name === "New Arrivals"
          ) {
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
            const recentCount = products.filter((p) => {
              if (!p.faire_created_at) return false
              return new Date(p.faire_created_at) >= thirtyDaysAgo
            }).length
            actualCount = Math.min(20, recentCount || products.length)
          } else {
            // Unknown type — skip
            continue
          }

          await supabaseB2B
            .from("collections")
            .update({ product_count: actualCount })
            .eq("id", col.id)
          storeResult.countsUpdated++
        }
      }

      // --- Post-generation: Remove empty collections (product_count = 0) ---
      const { data: empties } = await supabaseB2B
        .from("collections")
        .select("id")
        .eq("store_id", store.id)
        .eq("product_count", 0)

      if (empties && empties.length > 0) {
        const emptyIds = empties.map((e) => e.id)
        await supabaseB2B.from("collections").delete().in("id", emptyIds)
        storeResult.emptiesRemoved = empties.length
      }

      summary[store.name] = storeResult
    }

    return NextResponse.json({
      success: true,
      cleanup: { duplicatesRemoved: dupesRemoved, namesStandardized },
      summary,
    })
  } catch (err) {
    console.error("Collections generate error:", err)
    return NextResponse.json(
      { error: "Failed to generate collections", details: String(err) },
      { status: 500 }
    )
  }
}
