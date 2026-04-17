import { NextResponse } from "next/server"
import { getSupabaseJSBlueridgeAdmin } from "@/lib/supabase"

/**
 * Generic data proxy for the jsblueridge schema.
 * Uses service-role key to bypass PostgREST schema exposure.
 *
 * Query params:
 *   table   – table name (required)
 *   select  – columns (default "*")
 *   eq      – JSON object of eq filters, e.g. {"state":"NEW"}
 *   order   – column to order by (default: created_at desc)
 *   orderDir – "asc" or "desc" (default "desc")
 *   limit   – max rows (default 1000)
 *   offset  – pagination offset (default 0)
 *   count   – "true" to return count only (head request)
 *   search  – text to ilike-search across name/display_id columns
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const table = url.searchParams.get("table")
  if (!table) {
    return NextResponse.json({ error: "table param required" }, { status: 400 })
  }

  const db = getSupabaseJSBlueridgeAdmin()
  const select = url.searchParams.get("select") ?? "*"
  const eqRaw = url.searchParams.get("eq")
  const orderParam = url.searchParams.get("order")
  const orderDir = url.searchParams.get("orderDir") === "asc"
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "1000", 10), 5000)
  const offset = parseInt(url.searchParams.get("offset") ?? "0", 10)
  const countOnly = url.searchParams.get("count") === "true"
  const search = url.searchParams.get("search")
  const idParam = url.searchParams.get("id")
  const sumCol = url.searchParams.get("sum") // e.g. "total_cents" — returns server-side sum

  try {
    if (countOnly) {
      let q = db.from(table).select("*", { count: "exact", head: true })
      if (eqRaw) {
        const eq = JSON.parse(eqRaw) as Record<string, string>
        for (const [k, v] of Object.entries(eq)) q = q.eq(k, v)
      }
      const { count, error } = await q
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ count })
    }

    // Server-side sum of a numeric column (avoids row-limit truncation)
    if (sumCol) {
      const eqFilters = eqRaw ? JSON.parse(eqRaw) as Record<string, string> : {}
      const allVals: number[] = []
      let from = 0
      let hasMore = true
      while (hasMore) {
        // Build a fresh query each iteration to avoid stacking .range() calls
        let pageQ = db.from(table).select(sumCol).range(from, from + 999)
        for (const [k, v] of Object.entries(eqFilters)) pageQ = pageQ.eq(k, v)
        const { data, error } = await pageQ
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        if (!data || data.length === 0) { hasMore = false; break }
        for (const row of data) {
          const v = (row as unknown as Record<string, unknown>)[sumCol]
          if (typeof v === "number") allVals.push(v)
        }
        if (data.length < 1000) hasMore = false
        else from += 1000
      }
      const total = allVals.reduce((a, b) => a + b, 0)
      return NextResponse.json({ sum: total, rows: allVals.length })
    }

    // Single row by ID
    if (idParam) {
      // Try faire_product_id, faire_order_id, faire_retailer_id, then id
      const idCols = ["faire_product_id", "faire_order_id", "faire_retailer_id", "id"]
      for (const col of idCols) {
        const { data, error } = await db.from(table).select(select).eq(col, idParam).maybeSingle()
        if (data) return NextResponse.json({ data })
        if (error && !error.message.includes("column")) continue
      }
      return NextResponse.json({ data: null })
    }

    let query = db.from(table).select(select).range(offset, offset + limit - 1)

    // Only add order if explicitly provided (avoids "column does not exist" on tables with different column names)
    if (orderParam) {
      query = query.order(orderParam, { ascending: orderDir })
    }

    if (eqRaw) {
      const eq = JSON.parse(eqRaw) as Record<string, string>
      for (const [k, v] of Object.entries(eq)) query = query.eq(k, v)
    }

    if (search) {
      // Table-aware search columns
      const searchCols: Record<string, string> = {
        faire_orders: `display_id.ilike.%${search}%`,
        faire_products: `name.ilike.%${search}%`,
        faire_retailers: `name.ilike.%${search}%,company_name.ilike.%${search}%`,
        collections: `name.ilike.%${search}%`,
        reports: `title.ilike.%${search}%`,
      }
      const orClause = searchCols[table] ?? `name.ilike.%${search}%`
      query = query.or(orClause)
    }

    const { data, error, count } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data, count })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

/**
 * POST — upsert or insert rows into a jsblueridge table.
 * Body: { table, rows, onConflict? }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { table, rows, onConflict } = body as {
      table: string
      rows: Record<string, unknown>[]
      onConflict?: string
    }

    if (!table || !rows?.length) {
      return NextResponse.json({ error: "table and rows required" }, { status: 400 })
    }

    const db = getSupabaseJSBlueridgeAdmin()
    const opts = onConflict ? { onConflict } : undefined
    const { error } = await db.from(table).upsert(rows, opts)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, count: rows.length })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
