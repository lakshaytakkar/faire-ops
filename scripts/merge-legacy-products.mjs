#!/usr/bin/env node
// One-shot import of products from the legacy eazytosell Supabase project
// (cnzzmbddkurnztfjhxpp) into our ets.products table.
//
// Re-runnable: uses upsert on legacy_id so incremental runs are idempotent.
//
// Usage:
//   node scripts/merge-legacy-products.mjs
//
// Reads:
//   LEGACY_SUPABASE_URL (optional, defaults to hardcoded legacy)
//   LEGACY_SUPABASE_SERVICE_KEY (required — hardcoded fallback for this one-shot)
//   NEXT_PUBLIC_SUPABASE_URL (from .env.local)
//   SUPABASE_SERVICE_ROLE_KEY (from .env.local)

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  const envPath = join(__dirname, "..", ".env.local")
  const txt = readFileSync(envPath, "utf8")
  const env = {}
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m) env[m[1]] = m[2]
  }
  return env
}

const env = loadEnv()

const LEGACY_URL =
  process.env.LEGACY_SUPABASE_URL || "https://cnzzmbddkurnztfjhxpp.supabase.co"
const LEGACY_KEY =
  process.env.LEGACY_SUPABASE_SERVICE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuenptYmRka3Vybnp0ZmpoeHBwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTMxNzYyNywiZXhwIjoyMDg2ODkzNjI3fQ.oCx5fUF_1-RfCHpzhQKFzgLdifmE_OhE-stVTmfqnQ8"

const OURS_URL = env.NEXT_PUBLIC_SUPABASE_URL
const OURS_KEY = env.SUPABASE_SERVICE_ROLE_KEY

if (!OURS_URL || !OURS_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

const legacy = createClient(LEGACY_URL, LEGACY_KEY, {
  auth: { persistSession: false },
})
const ours = createClient(OURS_URL, OURS_KEY, {
  auth: { persistSession: false },
  db: { schema: "ets" },
})

const HAODUOBAO_VENDOR_ID = "32abc93f-8efa-4c9d-9fc6-964026d425cf"

async function main() {
  console.log("→ Fetching legacy categories…")
  const { data: catRows, error: catErr } = await legacy
    .from("categories")
    .select("id, name, gst_percent, igst_percent, hs_code")
  if (catErr) throw catErr
  const categoryMap = new Map(catRows.map((c) => [c.id, c.name]))
  console.log(`  ${catRows.length} categories`)

  console.log("→ Fetching legacy products (paginated)…")
  const pageSize = 1000
  let offset = 0
  let total = 0
  let upserted = 0

  for (;;) {
    const { data, error } = await legacy
      .from("products")
      .select("*")
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    total += data.length

    const rows = data.map((r) => {
      const categoryName = r.category_id ? categoryMap.get(r.category_id) : null
      const imageUrl = r.image
        ? r.image
        : `${LEGACY_URL}/storage/v1/object/public/product-images/products/${r.id}.jpg`
      const supply_meta = {
        exw_price_yuan: r.exw_price_yuan,
        fob_price_yuan: r.fob_price_yuan,
        fob_price_inr: r.fob_price_inr,
        cbm_per_unit: r.cbm_per_unit,
        freight_per_unit: r.freight_per_unit,
        cif_price_inr: r.cif_price_inr,
        customs_duty: r.customs_duty,
        sw_surcharge: r.sw_surcharge,
        igst: r.igst,
        total_landed_cost: r.total_landed_cost,
        store_landing_price: r.store_landing_price,
        store_margin_percent: r.store_margin_percent,
        store_margin_rs: r.store_margin_rs,
        cha_port_handling: r.cha_port_handling,
        domestic_freight: r.domestic_freight,
        mrp_sticker_cost: r.mrp_sticker_cost,
        supplier_name: r.supplier_name,
        legacy_category_id: r.category_id,
        legacy_mrp: r.mrp,
      }
      return {
        legacy_id: r.id,
        product_code: `HDB-${r.id}`,
        name_cn: r.name,
        name_en: r.name, // legacy has a single name; keep mirrored
        category: categoryName,
        vendor_id: HAODUOBAO_VENDOR_ID,
        source: r.source ?? "china_haoduobao",
        cost_price: r.cost_price,
        wholesale_price_inr: r.fob_price_inr,
        suggested_mrp: r.suggested_mrp,
        units_per_carton: r.units_per_carton,
        moq: r.moq,
        hs_code: r.hs_code,
        box_length_cm: r.carton_length_cm,
        box_width_cm: r.carton_width_cm,
        box_height_cm: r.carton_height_cm,
        weight_kg: r.carton_weight_kg,
        compliance_status: r.compliance_status,
        label_status: r.label_status,
        tags: r.tags ?? [],
        image_url: imageUrl,
        is_active: r.status === "Active",
        is_published: false,
        supply_meta,
      }
    })

    // batched upsert in chunks of 500
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500)
      const { error: upErr } = await ours
        .from("products")
        .upsert(chunk, { onConflict: "legacy_id" })
      if (upErr) {
        console.error(`  ✗ chunk ${i}..${i + chunk.length} failed:`, upErr.message)
        throw upErr
      }
      upserted += chunk.length
    }

    console.log(`  processed ${total} · upserted ${upserted}`)

    if (data.length < pageSize) break
    offset += pageSize
  }

  console.log(`\n✓ Done. ${total} legacy rows processed, ${upserted} upserted.`)
}

main().catch((e) => {
  console.error("FATAL:", e)
  process.exit(1)
})
