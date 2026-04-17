#!/usr/bin/env node
/**
 * Bhagwati-China bulk importer (Phase 2).
 *
 * Consumes staged folders produced by `bhagwati-stage.mjs` and writes:
 *   - product images to Storage bucket `product-images` at
 *       raw/bhagwati/<file-slug>/<sheet-slug>/row-<n>.<ext>
 *   - product rows to `ets.products` (upsert by source + source_row_id)
 *   - one `ets.import_batches` row per staged folder
 *
 * Idempotent: re-running with the same staged data does not duplicate
 * because of the `products_source_row_id_uq` unique index.
 *
 * Usage:
 *   node scripts/bhagwati-import.mjs               # all staged folders
 *   node scripts/bhagwati-import.mjs <file-slug>   # single folder
 *   node scripts/bhagwati-import.mjs --dry-run     # preview only
 */

import dotenv from "dotenv"
import path from "node:path"
import fs from "node:fs/promises"
import { createClient } from "@supabase/supabase-js"

dotenv.config({ path: ".env.local" })
dotenv.config()

const STAGED_ROOT = path.resolve(process.cwd(), "../_staging/bhagwati-staged")
const BUCKET = "product-images"
const SOURCE = "Bhagwati-China"

const FX = 13.8
const MARGIN_PCT = 20

function priceInr(cny) {
  if (cny == null) return { cost: null, sell: null }
  const cost = Math.round(cny * FX * 100) / 100
  const sell = Math.round(cost * (1 + MARGIN_PCT / 100) * 100) / 100
  return { cost, sell }
}

function loadEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error(
      "Missing env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (looked in .env.local)",
    )
    process.exit(1)
  }
  return { url, key }
}

function parseArgs(argv) {
  const args = argv.slice(2)
  const dryRun = args.includes("--dry-run")
  const slugs = args.filter((a) => !a.startsWith("--"))
  return { dryRun, slugs }
}

function contentTypeFor(ext) {
  const e = (ext || "").toLowerCase()
  if (e === "jpg" || e === "jpeg") return "image/jpeg"
  if (e === "png") return "image/png"
  if (e === "gif") return "image/gif"
  if (e === "webp") return "image/webp"
  if (e === "bmp") return "image/bmp"
  return "application/octet-stream"
}

function makeProductCode(fileSlug, rowNumber, sheetIndex = 0) {
  // Compress slug to a short-ish prefix
  const prefix = fileSlug
    .split("-")
    .filter(Boolean)
    .slice(0, 3)
    .map((p) => p.slice(0, 6))
    .join("-")
    .toUpperCase()
  // Multi-sheet files suffix the sheet index (S2, S3, ...) so product codes
  // stay unique across sheets. First sheet keeps the legacy "BHG-PREFIX-<row>"
  // format for backwards compatibility with the already-imported rows.
  const sheetPart = sheetIndex > 0 ? `-S${sheetIndex + 1}` : ""
  return `BHG-${prefix || "FILE"}${sheetPart}-${rowNumber}`
}

function sheetSlug(name) {
  return String(name || "sheet")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "sheet"
}

async function listStagedFolders(filterSlugs) {
  let entries
  try {
    entries = await fs.readdir(STAGED_ROOT, { withFileTypes: true })
  } catch (err) {
    console.error(`Staged root ${STAGED_ROOT} not found. Run bhagwati-stage.mjs first.`)
    process.exit(1)
  }
  const folders = entries.filter((e) => e.isDirectory()).map((e) => e.name)
  if (filterSlugs.length === 0) return folders
  return folders.filter((f) => filterSlugs.includes(f))
}

/**
 * Upload a buffer to Supabase Storage. Returns publicUrl or null on failure.
 */
async function uploadImage(supabase, storagePath, buffer, contentType, dryRun) {
  if (dryRun) return `[dry-run] ${BUCKET}/${storagePath}`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType, upsert: true })
  if (error) {
    console.warn(`    upload failed (${storagePath}): ${error.message}`)
    return null
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  return data?.publicUrl ?? null
}

/**
 * Upsert a product row via PostgREST with `Content-Profile: ets`.
 * Uses the (source, source_row_id) unique to merge duplicates.
 */
async function upsertProduct(env, payload, dryRun) {
  if (dryRun) return { ok: true, dryRun: true }
  const url = `${env.url}/rest/v1/products?on_conflict=source,source_row_id`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: env.key,
      Authorization: `Bearer ${env.key}`,
      "Content-Type": "application/json",
      "Content-Profile": "ets",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = await res.text()
    return { ok: false, status: res.status, body: body.slice(0, 300) }
  }
  const data = await res.json()
  return { ok: true, row: Array.isArray(data) ? data[0] : data }
}

async function createImportBatch(env, sourceFile, sheetName, dryRun) {
  if (dryRun) return null
  const res = await fetch(`${env.url}/rest/v1/import_batches`, {
    method: "POST",
    headers: {
      apikey: env.key,
      Authorization: `Bearer ${env.key}`,
      "Content-Type": "application/json",
      "Content-Profile": "ets",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      source: SOURCE,
      source_file: sourceFile,
      sheet_name: sheetName,
      status: "pending",
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    console.warn(`  could not create import_batches row: ${res.status} ${body.slice(0, 200)}`)
    return null
  }
  const data = await res.json()
  return Array.isArray(data) ? data[0]?.id : data?.id
}

async function finishImportBatch(env, id, summary, dryRun) {
  if (dryRun || !id) return
  try {
    await fetch(`${env.url}/rest/v1/import_batches?id=eq.${id}`, {
      method: "PATCH",
      headers: {
        apikey: env.key,
        Authorization: `Bearer ${env.key}`,
        "Content-Type": "application/json",
        "Content-Profile": "ets",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        ...summary,
        finished_at: new Date().toISOString(),
      }),
    })
  } catch (e) {
    console.warn(`  finishImportBatch network error (non-fatal): ${e.message}`)
  }
}

async function importFolder(env, supabase, fileSlug, dryRun) {
  const folderPath = path.join(STAGED_ROOT, fileSlug)
  const stagedJsonPath = path.join(folderPath, "staged.json")
  let staged
  try {
    staged = JSON.parse(await fs.readFile(stagedJsonPath, "utf8"))
  } catch (err) {
    console.warn(`  ${fileSlug}: missing staged.json (${err.message})`)
    return { fileSlug, imported: 0, skipped: 0, failed: 1 }
  }

  console.log(`\n${fileSlug}  (file: ${staged.file})`)
  let imported = 0
  let skipped = 0
  let failed = 0

  for (let sheetIdx = 0; sheetIdx < staged.batches.length; sheetIdx++) {
    const batch = staged.batches[sheetIdx]
    if (!batch.rows || batch.rows.length === 0) {
      if (batch.warning) console.log(`  · sheet "${batch.sheetName}" skipped: ${batch.warning}`)
      continue
    }
    const sheetSlugStr = sheetSlug(batch.sheetName)
    const batchId = await createImportBatch(env, staged.file, batch.sheetName, dryRun)
    let bImported = 0
    let bSkipped = 0
    let bImagesUploaded = 0

    // Concurrent processing with bounded parallelism for speed.
    const CONCURRENCY = 24
    const processRow = async (row) => {
      const cny = row.exw_rmb
      if (!row.description && cny == null) {
        return { skipped: true }
      }
      let imageUrl = null
      let imageUploaded = false
      let imageLocalMissing = false
      if (row.image_path && row.image_ext) {
        try {
          const buf = await fs.readFile(row.image_path)
          const storagePath = `raw/bhagwati/${fileSlug}/${sheetSlugStr}/row-${row.row_number}.${row.image_ext}`
          imageUrl = await uploadImage(
            supabase,
            storagePath,
            buf,
            contentTypeFor(row.image_ext),
            dryRun,
          )
          if (imageUrl) imageUploaded = true
        } catch (err) {
          if (err.code === "ENOENT") imageLocalMissing = true
          else console.warn(`    row ${row.row_number}: image read failed (${err.message})`)
        }
      }
      const { cost: costInr, sell: sellInr } = priceInr(cny)
      const desc = (row.description ?? "").trim() || `Item row ${row.row_number}`
      const toInt = (v) => (v == null || v === "" ? null : Math.round(Number(v)))
      const moqInt = toInt(row.moq)
      const cartonInt = toInt(row.carton_qty)
      const boxInt = toInt(row.box_qty)
      const payload = {
        product_code: makeProductCode(fileSlug, row.row_number, sheetIdx),
        name_cn: desc,
        name_en: desc,
        name_en_raw: desc,
        name_quality: "raw",
        unit_price: cny,
        currency: "CNY",
        cost_price_cny: cny,
        cost_price_inr: costInr,
        selling_price_inr: sellInr,
        fx_rate_inr_cny: FX,
        margin_pct: MARGIN_PCT,
        moq: moqInt,
        carton_qty: cartonInt,
        box_qty: boxInt,
        is_active: true,
        is_published: false,
        listing_status: "draft",
        image_polish_status: "pending",
        source: SOURCE,
        source_file: staged.file,
        source_row_id: row.source_row_id,
        publish_checklist: {
          image_polished: false,
          name_normalized: false,
          variants_modeled: false,
          prices_inr: true,
          categorized: false,
          source_tagged: true,
        },
      }
      // Only set image_raw_url when we actually uploaded — avoids nulling out
      // an already-imported row's URL just because the local staging file
      // moved or was deleted.
      if (imageUrl) payload.image_raw_url = imageUrl
      if (dryRun) {
        return { ok: true, imageUploaded, dryRun: true, desc, cny, sellInr, row }
      }
      const res = await upsertProduct(env, payload, dryRun)
      if (res.ok) return { ok: true, imageUploaded }
      return { failed: true, row, status: res.status, body: res.body }
    }

    let cursor = 0
    const total = batch.rows.length
    const tick = Math.max(1, Math.floor(total / 20))
    let dryPreviewShown = 0
    while (cursor < total) {
      const slice = batch.rows.slice(cursor, cursor + CONCURRENCY)
      const results = await Promise.all(slice.map((r) => processRow(r).catch((e) => ({ failed: true, row: r, status: "exception", body: String(e) }))))
      for (const r of results) {
        if (r.skipped) { bSkipped++; skipped++; continue }
        if (r.ok) {
          bImported++; imported++
          if (r.imageUploaded) bImagesUploaded++
          if (r.dryRun && dryPreviewShown < 2) {
            console.log(`    [dry-run] would upsert row ${r.row.row_number}: ${r.desc.slice(0, 40)} | ¥${r.cny} -> ₹${r.sellInr}`)
            dryPreviewShown++
          }
        } else if (r.failed) {
          failed++
          if (failed <= 5) console.warn(`    row ${r.row.row_number} failed: ${r.status} ${String(r.body).slice(0, 200)}`)
        }
      }
      cursor += CONCURRENCY
      if (cursor % (tick * CONCURRENCY) < CONCURRENCY) {
        process.stdout.write(`    progress: ${Math.min(cursor, total)}/${total}\r`)
      }
    }
    process.stdout.write("\n")

    console.log(
      `  sheet "${batch.sheetName}": imported=${bImported} skipped=${bSkipped} images=${bImagesUploaded}`,
    )

    await finishImportBatch(env, batchId, {
      rows_total: batch.rows.length,
      rows_imported: bImported,
      rows_skipped: bSkipped,
      images_extracted: batch.imagesExtracted ?? 0,
      images_matched: batch.imagesMatched ?? 0,
      status: "imported",
    }, dryRun)
  }

  return { fileSlug, imported, skipped, failed }
}

async function main() {
  const { dryRun, slugs } = parseArgs(process.argv)
  const env = loadEnv()
  const supabase = createClient(env.url, env.key, {
    auth: { persistSession: false },
  })

  const folders = await listStagedFolders(slugs)
  if (folders.length === 0) {
    console.error("No staged folders to import.")
    process.exit(1)
  }

  console.log(`Importing ${folders.length} folder(s) ${dryRun ? "(DRY RUN)" : ""}`)
  let totalIn = 0
  let totalSkip = 0
  let totalFail = 0
  for (const folder of folders) {
    const r = await importFolder(env, supabase, folder, dryRun)
    totalIn += r.imported
    totalSkip += r.skipped
    totalFail += r.failed
  }

  console.log("\n=== summary ===")
  console.log(`  imported=${totalIn}  skipped=${totalSkip}  failed=${totalFail}`)
  if (dryRun) console.log("  (dry-run — nothing was written to Storage or DB)")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
