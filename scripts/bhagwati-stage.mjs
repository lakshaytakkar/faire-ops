#!/usr/bin/env node
/**
 * Bhagwati-China bulk stager (Phase 1).
 *
 * Reads a single xlsx (or all xlsx in the supplier transfer folder),
 * extracts embedded images, autodetects headers, computes INR pricing,
 * and writes per-file staged.json + preview.html under
 *   tmp-images/bhagwati-staged/<file-slug>/
 *
 * Usage:
 *   node scripts/bhagwati-stage.mjs                 # all xlsx in default dir
 *   node scripts/bhagwati-stage.mjs <path-to-file>  # single file
 *   node scripts/bhagwati-stage.mjs <glob-or-dir>   # dir = all xlsx in it
 */

import path from "node:path"
import fs from "node:fs/promises"
import { parseSupplierXlsx, slugifyFilename } from "./lib/xlsx-parser.mjs"

const DEFAULT_DIR = path.resolve(
  process.cwd(),
  "tmp-images/TransferNow-20260414cb0aJeTt",
)
const STAGED_DIR = path.resolve(process.cwd(), "tmp-images/bhagwati-staged")

const FX = 13.8
const MARGIN = 0.20

function priceInr(cny) {
  if (cny == null) return { cost: null, sell: null }
  const cost = Math.round(cny * FX * 100) / 100
  const sell = Math.round(cost * (1 + MARGIN) * 100) / 100
  return { cost, sell }
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function fmtInr(n) {
  if (n == null) return "—"
  return "₹" + Math.round(n).toLocaleString("en-IN")
}

function fmtCny(n) {
  if (n == null) return "—"
  return "¥" + n
}

const GREEN = "\u2713"
const RED = "\u2717"

async function listInputFiles(arg) {
  if (!arg) {
    const entries = await fs.readdir(DEFAULT_DIR)
    return entries
      .filter((f) => /\.(xlsx|xls)$/i.test(f))
      .map((f) => path.join(DEFAULT_DIR, f))
  }
  // If arg points to a directory, read all xlsx in it.
  try {
    const stat = await fs.stat(arg)
    if (stat.isDirectory()) {
      const entries = await fs.readdir(arg)
      return entries
        .filter((f) => /\.(xlsx|xls)$/i.test(f))
        .map((f) => path.join(arg, f))
    }
    if (stat.isFile()) return [path.resolve(arg)]
  } catch (_) {
    // not a path on disk — fall through
  }
  // Treat as filename in the default dir
  const candidate = path.join(DEFAULT_DIR, arg)
  return [candidate]
}

function buildPreviewHtml({ file, fileSlug, batches }) {
  const totalRows = batches.reduce((s, b) => s + b.rows.length, 0)
  const totalImages = batches.reduce((s, b) => s + b.imagesExtracted, 0)
  const totalMatched = batches.reduce((s, b) => s + b.imagesMatched, 0)
  const warning =
    totalImages !== totalRows
      ? `<div class="warn">Image count (${totalImages}) does not match row count (${totalRows}). Matched ${totalMatched}.</div>`
      : ""

  const sections = batches
    .map((b) => {
      if (b.warning) {
        return `<section><h2>${escapeHtml(b.sheetName)}</h2><div class="warn">${escapeHtml(b.warning)}</div></section>`
      }
      const rowsHtml = b.rows
        .map((r) => {
          const { cost, sell } = priceInr(r.exw_rmb)
          const imgRel = r.image_ext ? `${encodeURIComponent(slugify(b.sheetName))}/row-${r.row_number}.${r.image_ext}` : null
          const imgCell = imgRel
            ? `<img src="${imgRel}" loading="lazy" alt="row ${r.row_number}" />`
            : '<span class="muted">no image</span>'
          return `<tr>
            <td class="imgcell">${imgCell}</td>
            <td>${r.row_number}</td>
            <td class="desc">${escapeHtml(r.description ?? "")}</td>
            <td>${fmtCny(r.exw_rmb)}</td>
            <td>${r.moq ?? "—"}</td>
            <td>${r.carton_qty ?? "—"}</td>
            <td>${r.box_qty ?? "—"}</td>
            <td>${fmtInr(cost)}</td>
            <td><strong>${fmtInr(sell)}</strong></td>
          </tr>`
        })
        .join("\n")
      const headerInfo = b.headerRow
        ? `header row ${b.headerRow} · cols ${JSON.stringify(b.columnMap)}`
        : "no header detected"
      return `<section>
        <h2>${escapeHtml(b.sheetName)} <span class="muted">— ${b.rows.length} rows · ${b.imagesExtracted} images (${b.imagesMatched} matched)</span></h2>
        <p class="muted">${escapeHtml(headerInfo)}</p>
        <table>
          <thead>
            <tr>
              <th>Image</th><th>Row</th><th>Description</th><th>EXW (¥)</th>
              <th>MOQ</th><th>Carton</th><th>Box</th><th>Cost (₹)</th><th>Selling (₹)</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </section>`
    })
    .join("\n")

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<title>${escapeHtml(file)} — Bhagwati staged preview</title>
<style>
  body { font: 14px/1.4 -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; margin: 24px; color: #111; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 24px 0 8px; }
  .muted { color: #666; font-weight: normal; font-size: 12px; }
  .warn { background: #fff3cd; border: 1px solid #ffe69c; padding: 8px 12px; border-radius: 6px; margin: 8px 0; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #e5e7eb; padding: 6px 8px; vertical-align: top; text-align: left; }
  th { background: #f9fafb; font-weight: 600; font-size: 12px; }
  td.desc { max-width: 320px; }
  td.imgcell { width: 110px; text-align: center; }
  img { max-width: 100px; max-height: 100px; object-fit: contain; }
</style>
</head><body>
<h1>${escapeHtml(file)}</h1>
<p class="muted">file-slug: <code>${escapeHtml(fileSlug)}</code> · ${batches.length} sheet(s) · ${totalRows} rows · ${totalImages} images (${totalMatched} matched) · FX ${FX} · margin ${MARGIN * 100}%</p>
${warning}
${sections}
</body></html>`
}

function slugify(name) {
  return String(name || "sheet")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "sheet"
}

async function stageOne(filePath) {
  const baseName = path.basename(filePath)
  process.stdout.write(`\n${baseName}\n`)
  let result
  try {
    result = await parseSupplierXlsx(filePath)
  } catch (err) {
    console.error(`  ${RED} parse failed: ${err.message}`)
    return { file: baseName, ok: false, error: err.message }
  }

  const { batches } = result
  const fileSlug = slugifyFilename(filePath)
  const stagedDir = path.join(STAGED_DIR, fileSlug)
  await fs.mkdir(stagedDir, { recursive: true })

  // Strip raw_row from JSON to keep file size sane
  const jsonBatches = batches.map((b) => ({
    sheetName: b.sheetName,
    headerRow: b.headerRow,
    columnMap: b.columnMap,
    imagesExtracted: b.imagesExtracted,
    imagesMatched: b.imagesMatched,
    warning: b.warning ?? null,
    rows: b.rows.map((r) => ({
      source_file: r.source_file,
      sheet_name: r.sheet_name,
      row_number: r.row_number,
      source_row_id: r.source_row_id,
      description: r.description,
      exw_rmb: r.exw_rmb,
      moq: r.moq,
      carton_qty: r.carton_qty,
      box_qty: r.box_qty,
      image_path: r.image_path,
      image_ext: r.image_ext,
      // headers-only raw_row (already trimmed by parser)
      raw_row: r.raw_row,
    })),
  }))

  await fs.writeFile(
    path.join(stagedDir, "staged.json"),
    JSON.stringify({ file: baseName, fileSlug, batches: jsonBatches }, null, 2),
    "utf8",
  )

  await fs.writeFile(
    path.join(stagedDir, "preview.html"),
    buildPreviewHtml({ file: baseName, fileSlug, batches }),
    "utf8",
  )

  // Console summary per sheet
  let totalRows = 0
  let totalImages = 0
  let totalMatched = 0
  let anyWarn = false
  for (const b of batches) {
    if (b.warning) {
      console.log(`  ${RED} sheet "${b.sheetName}": ${b.warning}`)
      anyWarn = true
      continue
    }
    totalRows += b.rows.length
    totalImages += b.imagesExtracted
    totalMatched += b.imagesMatched
    const mark = b.imagesExtracted === b.rows.length ? GREEN : RED
    console.log(
      `  ${mark} sheet "${b.sheetName}": ${b.rows.length} rows, ${b.imagesExtracted} images (${b.imagesMatched} matched, header row ${b.headerRow})`,
    )
  }
  console.log(
    `  -> staged at tmp-images/bhagwati-staged/${fileSlug}/  (${totalRows} rows, ${totalImages} images)`,
  )
  return {
    file: baseName,
    ok: !anyWarn || totalRows > 0,
    rows: totalRows,
    images: totalImages,
    matched: totalMatched,
    warned: anyWarn,
  }
}

async function main() {
  const arg = process.argv[2]
  await fs.mkdir(STAGED_DIR, { recursive: true })

  let files
  try {
    files = await listInputFiles(arg)
  } catch (err) {
    console.error(`Failed to list input files: ${err.message}`)
    process.exit(1)
  }
  if (files.length === 0) {
    console.error("No xlsx/xls files found.")
    process.exit(1)
  }

  console.log(`Staging ${files.length} file(s) -> ${STAGED_DIR}`)
  const results = []
  for (const f of files) {
    results.push(await stageOne(f))
  }

  console.log("\n=== summary ===")
  let okCount = 0
  let failCount = 0
  let warnCount = 0
  let totalRows = 0
  let totalImages = 0
  for (const r of results) {
    if (r.ok && !r.warned) okCount++
    else if (r.warned) warnCount++
    else failCount++
    if (r.rows) totalRows += r.rows
    if (r.images) totalImages += r.images
  }
  console.log(`  ${GREEN} ${okCount} clean / ${RED} ${warnCount} with warnings / ${RED} ${failCount} failed`)
  console.log(`  total: ${totalRows} rows, ${totalImages} images extracted`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
