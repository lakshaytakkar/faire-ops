#!/usr/bin/env node
/**
 * One-time data migration: source `rnuomvecynmiiayprakl` Supabase → our `ets.*` schema.
 *
 * Read from source via REST (public schema). Write to target via REST
 * with `Content-Profile: ets`. Preserves UUIDs. Skips rows that would
 * break FKs by inserting parent-first (tables listed in FK-safe order).
 *
 * Usage (NEVER commit credentials — export from your shell):
 *   export ETS_SOURCE_URL=https://rnuomvecynmiiayprakl.supabase.co
 *   export ETS_SOURCE_KEY=...                         (source service-role key)
 *   export ETS_TARGET_URL=https://eeoesllyceegmzfqfbyu.supabase.co
 *   export ETS_TARGET_KEY=...                         (our service-role key)
 *   node scripts/import-ets.mjs
 */

const SRC = process.env.ETS_SOURCE_URL
const SRC_KEY = process.env.ETS_SOURCE_KEY
const TGT = process.env.ETS_TARGET_URL
const TGT_KEY = process.env.ETS_TARGET_KEY

if (!SRC || !SRC_KEY || !TGT || !TGT_KEY) {
  console.error("Missing env: ETS_SOURCE_URL / ETS_SOURCE_KEY / ETS_TARGET_URL / ETS_TARGET_KEY")
  process.exit(1)
}

// FK-safe order — parents first. Empty tables included so the script's exit status covers them too.
const TABLES = [
  "stores",
  "clients",
  "vendors",
  "categories",
  "collections",
  "products",
  "users",
  "store_staff",
  "store_boq",
  "setup_kit_items",
  "collection_items",
  "vendor_products",
  "launch_batches",
  "launch_batch_stores",
  "china_batches",
  "china_batch_items",
  "document_templates",
  "document_instances",
  "milestone_payments",
  "lead_activities",
  "customers",
  "cart_items",
  "orders",
  "order_items",
  "vendor_orders",
  "vendor_order_items",
  "vendor_payouts",
  "payments",
  "pos_register_sessions",
  "pos_inventory",
  "pos_stock_receives",
  "pos_stock_receive_items",
  "pos_stock_movements",
  "pos_sales",
  "pos_sale_items",
  "pos_returns",
  "pos_return_items",
  "pos_held_bills",
  "fulfillment_queue",
  "qc_records",
  "tickets",
  "ticket_comments",
  "dev_tasks",
  "dev_task_comments",
  "price_settings",
  "prompt_library",
]

const PAGE_SIZE = 500

async function fetchAll(table) {
  const all = []
  let from = 0
  while (true) {
    const to = from + PAGE_SIZE - 1
    const res = await fetch(`${SRC}/rest/v1/${table}?select=*&order=id.asc`, {
      headers: {
        apikey: SRC_KEY,
        Authorization: `Bearer ${SRC_KEY}`,
        Range: `${from}-${to}`,
        "Range-Unit": "items",
        Prefer: "count=exact",
      },
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`GET ${table} ${res.status}: ${body.slice(0, 200)}`)
    }
    const rows = await res.json()
    all.push(...rows)
    if (rows.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return all
}

async function insertBatch(table, rows) {
  if (rows.length === 0) return { inserted: 0, skipped: 0 }
  let ok = 0
  let skip = 0
  for (let i = 0; i < rows.length; i += PAGE_SIZE) {
    const chunk = rows.slice(i, i + PAGE_SIZE)
    const res = await fetch(`${TGT}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        apikey: TGT_KEY,
        Authorization: `Bearer ${TGT_KEY}`,
        "Content-Type": "application/json",
        "Content-Profile": "ets",
        Prefer: "return=minimal,resolution=ignore-duplicates",
      },
      body: JSON.stringify(chunk),
    })
    if (!res.ok) {
      const body = await res.text()
      // Fall back row-by-row on batch failure
      console.warn(`  batch ${i}-${i + chunk.length} rejected (${res.status}), falling back to row-by-row: ${body.slice(0, 160)}`)
      for (const row of chunk) {
        const one = await fetch(`${TGT}/rest/v1/${table}`, {
          method: "POST",
          headers: {
            apikey: TGT_KEY,
            Authorization: `Bearer ${TGT_KEY}`,
            "Content-Type": "application/json",
            "Content-Profile": "ets",
            Prefer: "return=minimal,resolution=ignore-duplicates",
          },
          body: JSON.stringify(row),
        })
        if (one.ok) ok++
        else {
          skip++
          const err = await one.text()
          console.warn(`    skip ${row.id}: ${err.slice(0, 140)}`)
        }
      }
    } else {
      ok += chunk.length
    }
  }
  return { inserted: ok, skipped: skip }
}

async function main() {
  console.log(`Source : ${SRC}`)
  console.log(`Target : ${TGT} (schema=ets)`)
  console.log("---")
  let totalIn = 0
  let totalSkip = 0
  for (const t of TABLES) {
    process.stdout.write(`  ${t.padEnd(28)} `)
    const rows = await fetchAll(t)
    const { inserted, skipped } = await insertBatch(t, rows)
    totalIn += inserted
    totalSkip += skipped
    console.log(`source=${rows.length} inserted=${inserted} skipped=${skipped}`)
  }
  console.log("---")
  console.log(`TOTAL inserted=${totalIn} skipped=${totalSkip}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
