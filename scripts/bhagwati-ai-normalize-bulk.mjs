#!/usr/bin/env node
/**
 * Bulk AI name normalization for Bhagwati-China drafts.
 *
 * For each product where name_quality != 'ai_cleaned' AND source = 'Bhagwati-China',
 * ask Gemini to turn the raw supplier description (often Chinese, with model
 * codes/measurements) into a clean English product name + structured
 * description, and flip the `name_normalized` checklist flag.
 *
 * Idempotent. Re-running is a no-op for already-cleaned rows.
 *
 * Usage:
 *   node scripts/bhagwati-ai-normalize-bulk.mjs [--limit N] [--concurrency N] [--dry-run]
 */

import { createClient } from "@supabase/supabase-js"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

function loadDotEnvLocal() {
  try {
    const here = dirname(fileURLToPath(import.meta.url))
    const txt = readFileSync(join(here, "..", ".env.local"), "utf8")
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
    }
  } catch {}
}
loadDotEnvLocal()

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY
const GEMINI_KEY = process.env.GEMINI_API_KEY ?? process.env.NEXT_PUBLIC_GEMINI_API_KEY

if (!URL || !SVC) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}
if (!GEMINI_KEY) {
  console.error("Missing GEMINI_API_KEY / NEXT_PUBLIC_GEMINI_API_KEY")
  process.exit(1)
}

const args = process.argv.slice(2)
const DRY = args.includes("--dry-run")
const LIMIT = Number(args[args.indexOf("--limit") + 1]) || Infinity
const CONCURRENCY = Number(args[args.indexOf("--concurrency") + 1]) || 5

const sb = createClient(URL, SVC, { auth: { persistSession: false }, db: { schema: "ets" } })
const genAI = new GoogleGenerativeAI(GEMINI_KEY)
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: { responseMimeType: "application/json" },
})

const PROMPT_TMPL = (raw) => `You are cleaning a raw product name from a Chinese wholesale supplier catalog.
Raw: ${JSON.stringify(raw)}

Return ONLY a JSON object with this shape:
{"name_en": "<simple English name, Title Case, max 60 chars, no Chinese, no model numbers/SKUs/codes>", "description": "<one-sentence English description; include extracted model codes at end as 'Codes: X, Y' if any>", "extracted_codes": ["<any alphanumeric model codes removed from the name>"]}

Rules:
- Name must be understandable to an English retail buyer (e.g. "Toy Shark Gun", "Plastic Magnifying Glass", "Charm Pendant").
- Strip Chinese characters, SKU/model codes, measurements, numeric prefixes.
- If the raw text is only a model code like "80-11枪" or "001枪", infer the product type from the file context (e.g. toy gun, cap) and name it generically (e.g. "Toy Gun").
- If you genuinely cannot tell the product, set name_en to "Unidentified Product" and extracted_codes to the whole raw string.`

async function normalizeOne(row) {
  const raw = row.name_cn || row.name_en || ""
  if (!raw.trim()) return { id: row.id, skipped: true, reason: "empty" }
  try {
    const res = await model.generateContent(PROMPT_TMPL(raw))
    let txt = res.response.text().trim()
    txt = txt.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "")
    const parsed = JSON.parse(txt)
    const nameEn = String(parsed.name_en || "").trim().slice(0, 80)
    const desc = String(parsed.description || "").trim()
    if (!nameEn) return { id: row.id, skipped: true, reason: "empty_ai_name" }

    const currentChecklist = row.publish_checklist || {}
    const newChecklist = { ...currentChecklist, name_normalized: true }

    if (DRY) return { id: row.id, ok: true, dry: true, nameEn, desc }

    const { error } = await sb.from("products").update({
      name_en: nameEn,
      description: desc,
      name_quality: "ai_cleaned",
      name_en_raw: row.name_en_raw ?? raw,
      publish_checklist: newChecklist,
    }).eq("id", row.id)
    if (error) return { id: row.id, failed: true, error: error.message }
    return { id: row.id, ok: true, nameEn }
  } catch (e) {
    return { id: row.id, failed: true, error: String(e.message || e).slice(0, 200) }
  }
}

async function pool(items, n, fn) {
  const results = []
  const queue = [...items]
  const workers = Array.from({ length: Math.min(n, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift()
      if (!item) break
      results.push(await fn(item))
    }
  })
  await Promise.all(workers)
  return results
}

async function main() {
  console.log(`bhagwati-ai-normalize-bulk${DRY ? " [DRY]" : ""}  concurrency=${CONCURRENCY} limit=${LIMIT === Infinity ? "∞" : LIMIT}`)

  let processed = 0
  let ok = 0
  let failed = 0
  let skipped = 0
  const PAGE = 200

  while (processed < LIMIT) {
    const { data, error } = await sb.from("products")
      .select("id, name_cn, name_en, name_en_raw, publish_checklist")
      .eq("source", "Bhagwati-China")
      .neq("name_quality", "ai_cleaned")
      .limit(Math.min(PAGE, LIMIT - processed))

    if (error) { console.error("fetch error:", error.message); break }
    if (!data || data.length === 0) break

    const results = await pool(data, CONCURRENCY, normalizeOne)
    for (const r of results) {
      if (r.ok) ok++
      else if (r.skipped) skipped++
      else if (r.failed) { failed++; if (failed <= 10) console.warn("  fail", r.id, r.error) }
    }
    processed += data.length
    const sample = results.find((r) => r.ok && r.nameEn)
    process.stdout.write(`  processed=${processed} ok=${ok} skip=${skipped} fail=${failed}${sample ? ` e.g. "${sample.nameEn.slice(0, 40)}"` : ""}\n`)
    if (DRY) break   // dry-run only processes one page
  }
  console.log(`\ndone: processed=${processed} ok=${ok} skipped=${skipped} failed=${failed}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
