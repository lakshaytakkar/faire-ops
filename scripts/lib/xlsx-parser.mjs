/**
 * Bhagwati-China supplier XLSX parser.
 *
 * Reads a single .xlsx (or .xls) file, autodetects the header row, extracts
 * embedded images, and produces a `StagedRow[]` per worksheet that can be
 * persisted as JSON for the import step.
 *
 * Image extraction notes (exceljs):
 *   - `ws.getImages()` returns `[{ imageId, range: { tl: { nativeRow, nativeCol }, ... } }]`
 *     where `nativeRow`/`nativeCol` are 0-indexed.
 *   - `wb.getImage(parseInt(imageId, 10))` returns `{ buffer, extension, name? }`.
 *   - We anchor each image by `nativeRow + 1` (1-indexed XLSX row).
 *
 * Header autodetect:
 *   - We scan rows 1..5 for a row that contains any of the known header tokens
 *     (PICTURE / PIC / DES / DESCRIPTION / PRICE / EXW / MOQ).
 *   - We then map cell column index → field by fuzzy substring match.
 */

import path from "node:path"
import fs from "node:fs/promises"
import ExcelJS from "exceljs"

const HEADER_SCAN_ROWS = 10

const FIELD_PATTERNS = [
  { field: "picture", patterns: [/\bpic(ture)?\b/i, /^image$/i, /图片/] },
  {
    field: "description",
    patterns: [
      /\bdes(c(ription)?)?\b/i,
      /\bproduct[\s_-]*name\b/i,
      /\bname\b/i,
      /\bitem\b/i,
      /品名/,
      /描述/,
      /产品/,
    ],
  },
  {
    field: "exw_rmb",
    patterns: [
      /\bexw\b/i,
      /\bprice\b/i,
      /\bunit[\s_-]*price\b/i,
      /\brmb\b/i,
      /\bcost\b/i,
      /价格/,
      /单价/,
      /出厂价/,
    ],
  },
  {
    field: "moq",
    patterns: [/\bmoq\b/i, /minimum.*order/i, /起订/, /min.*qty/i],
  },
  {
    field: "carton_qty",
    patterns: [/carton/i, /\bctn\b/i, /per[\s_-]*carton/i, /装箱/],
  },
  {
    field: "box_qty",
    patterns: [
      /\bbox\b/i,
      /per[\s_-]*box/i,
      /units?[\s_-]*\/?[\s_-]*box/i,
      /per[\s_-]*pack/i,
      /pack[\s_-]*qty/i,
      /\binner\b/i,
    ],
  },
]

/** Slugify a filename for use as a folder name. */
export function slugifyFilename(filePath) {
  const base = path.basename(filePath, path.extname(filePath))
  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "file"
}

function slugifySheet(name) {
  return String(name || "sheet")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "sheet"
}

/** Pull a string from a cell value (handles rich text + objects). */
function cellText(value) {
  if (value == null) return ""
  if (typeof value === "string") return value.trim()
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((p) => p.text || "").join("").trim()
    }
    if ("text" in value && typeof value.text === "string") return value.text.trim()
    if ("result" in value) return cellText(value.result)
    if ("formula" in value && "result" in value) return cellText(value.result)
    if ("hyperlink" in value && "text" in value) return cellText(value.text)
  }
  return String(value).trim()
}

/** Pull a number from a cell value, returning null if not numeric. */
function cellNumber(value) {
  if (value == null || value === "") return null
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "object") {
    if ("result" in value) return cellNumber(value.result)
    if ("text" in value) return cellNumber(value.text)
  }
  const txt = cellText(value)
  if (!txt) return null
  // Strip currency symbols, commas, "RMB", "CNY", "$", spaces
  const cleaned = txt.replace(/[¥$,\s]/g, "").replace(/(rmb|cny|usd|inr|pcs|pieces?)/gi, "")
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : null
}

/** Decide which field a header cell text maps to (or null). */
function classifyHeader(text) {
  if (!text) return null
  const trimmed = text.trim()
  if (!trimmed) return null
  for (const { field, patterns } of FIELD_PATTERNS) {
    for (const re of patterns) {
      if (re.test(trimmed)) return field
    }
  }
  return null
}

/**
 * Find the header row + column→field mapping.
 * Returns null if no plausible header found.
 */
function detectHeader(ws) {
  const maxRow = Math.min(ws.actualRowCount || ws.rowCount || 0, HEADER_SCAN_ROWS)
  let best = null
  for (let r = 1; r <= maxRow; r++) {
    const row = ws.getRow(r)
    const colMap = {} // colNumber (1-indexed) → field
    const headerNames = {} // colNumber → original header text
    let hits = 0
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const text = cellText(cell.value)
      const field = classifyHeader(text)
      if (field && !Object.values(colMap).includes(field)) {
        colMap[colNumber] = field
        headerNames[colNumber] = text
        hits++
      } else if (text) {
        headerNames[colNumber] = text
      }
    })
    // A plausible header has at least one of [description/exw_rmb/moq] AND >=2 fields
    const fields = Object.values(colMap)
    const score = hits + (fields.includes("description") ? 1 : 0) + (fields.includes("exw_rmb") ? 1 : 0)
    if (hits >= 2 && (!best || score > best.score)) {
      best = { rowNumber: r, colMap, headerNames, score }
    }
  }
  return best
}

/**
 * Parse one supplier xlsx file.
 * @param {string} filePath
 * @returns {Promise<{ batches: Array<{sheetName: string, headerRow: number|null, columnMap: Record<number,string>, rows: object[], imagesExtracted: number, imagesMatched: number, warning?: string}> }>}
 */
export async function parseSupplierXlsx(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  if (ext !== ".xlsx") {
    return {
      batches: [
        {
          sheetName: "(skipped)",
          headerRow: null,
          columnMap: {},
          rows: [],
          imagesExtracted: 0,
          imagesMatched: 0,
          warning: `Unsupported extension '${ext}' — exceljs only reads .xlsx (skipped, please re-save as .xlsx)`,
        },
      ],
    }
  }

  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(filePath)

  const fileSlug = slugifyFilename(filePath)
  const stagedRoot = path.resolve(
    path.dirname(filePath),
    "..",
    "bhagwati-staged",
    fileSlug,
  )

  const batches = []

  for (const ws of wb.worksheets) {
    const sheetSlug = slugifySheet(ws.name)
    const imageDir = path.join(stagedRoot, sheetSlug)
    await fs.mkdir(imageDir, { recursive: true })

    // ---- 1. Extract embedded images ----
    const imagesByRow = new Map() // 1-indexed row → {ext, buffer, name}
    let imagesExtracted = 0
    const wsImages = ws.getImages?.() || []
    for (const img of wsImages) {
      try {
        const idNum = parseInt(img.imageId, 10)
        const media = wb.getImage(idNum)
        if (!media) continue
        const ext = media.extension || "png"
        // Anchor row = top-left native row + 1 (nativeRow is 0-indexed)
        const anchorRow = (img.range?.tl?.nativeRow ?? 0) + 1
        const fileName = `row-${anchorRow}.${ext}`
        const filePath = path.join(imageDir, fileName)
        await fs.writeFile(filePath, media.buffer)
        imagesByRow.set(anchorRow, { ext, fileName, anchorRow })
        imagesExtracted++
      } catch (err) {
        // continue; one bad image shouldn't fail the sheet
      }
    }

    // ---- 2. Detect headers ----
    const header = detectHeader(ws)
    if (!header) {
      batches.push({
        sheetName: ws.name,
        headerRow: null,
        columnMap: {},
        rows: [],
        imagesExtracted,
        imagesMatched: 0,
        warning: `No recognizable header row found in rows 1-${HEADER_SCAN_ROWS} (skipped)`,
      })
      continue
    }

    // Build inverse: field → colNumber (first match wins)
    const fieldToCol = {}
    for (const [col, field] of Object.entries(header.colMap)) {
      const c = Number(col)
      if (!(field in fieldToCol)) fieldToCol[field] = c
    }

    // ---- 3. Iterate data rows ----
    const stagedRows = []
    let imagesMatched = 0
    const baseName = path.basename(filePath)

    const lastRow = ws.actualRowCount || ws.rowCount || 0
    for (let r = header.rowNumber + 1; r <= lastRow; r++) {
      const row = ws.getRow(r)
      const description = fieldToCol.description ? cellText(row.getCell(fieldToCol.description).value) : ""
      const exwRaw = fieldToCol.exw_rmb ? row.getCell(fieldToCol.exw_rmb).value : null
      const exw = cellNumber(exwRaw)
      const moq = fieldToCol.moq ? cellNumber(row.getCell(fieldToCol.moq).value) : null
      const cartonQty = fieldToCol.carton_qty ? cellNumber(row.getCell(fieldToCol.carton_qty).value) : null
      const boxQty = fieldToCol.box_qty ? cellNumber(row.getCell(fieldToCol.box_qty).value) : null

      // Skip subtotal / blank rows
      if (!description && exw == null && moq == null) continue
      // Skip rows that look like header echoes
      if (description && /^(picture|pic|des(c(ription)?)?|price|exw|moq)$/i.test(description.trim())) continue

      const img = imagesByRow.get(r)
      if (img) imagesMatched++

      // Build a compact raw_row of header columns only (avoid bloat)
      const rawRow = {}
      for (const [colStr, headerName] of Object.entries(header.headerNames)) {
        const col = Number(colStr)
        rawRow[headerName] = cellText(row.getCell(col).value) || null
      }

      stagedRows.push({
        source_file: baseName,
        sheet_name: ws.name,
        row_number: r,
        source_row_id: `${baseName}:${ws.name}:${r}`,
        description: description || null,
        exw_rmb: exw,
        moq: moq,
        carton_qty: cartonQty,
        box_qty: boxQty,
        image_path: img ? path.join(imageDir, img.fileName).replace(/\\/g, "/") : null,
        image_ext: img?.ext || null,
        raw_row: rawRow,
      })
    }

    batches.push({
      sheetName: ws.name,
      headerRow: header.rowNumber,
      columnMap: header.colMap,
      rows: stagedRows,
      imagesExtracted,
      imagesMatched,
    })
  }

  return { batches, fileSlug, stagedRoot }
}
