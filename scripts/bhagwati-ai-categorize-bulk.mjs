#!/usr/bin/env node
/**
 * Bulk AI category assignment for Bhagwati-China drafts.
 *
 * For each product where category_id IS NULL AND source = 'Bhagwati-China',
 * ask Gemini to pick a leaf category from ets.categories (3-level tree).
 * If Gemini's top confidence ≥ THRESHOLD, apply it and flip the `categorized`
 * checklist flag. Otherwise leave for manual review via Studio.
 *
 * Usage:
 *   node scripts/bhagwati-ai-categorize-bulk.mjs [--limit N] [--concurrency N] [--threshold 0.75] [--dry-run]
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
if (!URL || !SVC || !GEMINI_KEY) {
  console.error("Missing env")
  process.exit(1)
}

const args = process.argv.slice(2)
const DRY = args.includes("--dry-run")
const LIMIT = Number(args[args.indexOf("--limit") + 1]) || Infinity
const CONCURRENCY = Number(args[args.indexOf("--concurrency") + 1]) || 5
const THRESHOLD = Number(args[args.indexOf("--threshold") + 1]) || 0.75

const sb = createClient(URL, SVC, { auth: { persistSession: false }, db: { schema: "ets" } })
const genAI = new GoogleGenerativeAI(GEMINI_KEY)
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: { responseMimeType: "application/json" },
})

async function loadCategoryTree() {
  const { data, error } = await sb.from("categories").select("id, name, parent_id, level").order("level").limit(5000)
  if (error) throw error
  // Build a map of id -> {..., children: []}
  const nodes = Object.fromEntries(data.map((c) => [c.id, { ...c, children: [] }]))
  const roots = []
  for (const n of Object.values(nodes)) {
    if (n.parent_id && nodes[n.parent_id]) nodes[n.parent_id].children.push(n)
    else roots.push(n)
  }
  // Flat list of leaves with their full path
  const leaves = []
  const walk = (node, path) => {
    const here = [...path, { id: node.id, name: node.name }]
    if (node.children.length === 0) leaves.push(here)
    else node.children.forEach((c) => walk(c, here))
  }
  roots.forEach((r) => walk(r, []))
  return leaves
}

function renderLeavesForPrompt(leaves) {
  return leaves.map((path) => `${path.map((p) => p.name).join(" > ")}  [id:${path[path.length - 1].id}]`).join("\n")
}

const PROMPT_TMPL = (product, leafList) => `You classify wholesale products into a fixed category taxonomy.

Product name: ${JSON.stringify(product.name_en || product.name_cn)}
Description: ${JSON.stringify(product.description || "")}
Source file: ${product.source_file || ""}

Category options (leaf categories with full path):
${leafList}

Return ONLY a JSON object:
{"category_id": "<id from options above or null if no good match>", "path": ["L1","L2","L3"], "confidence": 0.0-1.0, "reason": "<one short sentence>"}

Be honest: use null + low confidence if nothing fits.`

async function categorizeOne(row, leafList) {
  try {
    const res = await model.generateContent(PROMPT_TMPL(row, leafList))
    let txt = res.response.text().trim()
    txt = txt.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "")
    const parsed = JSON.parse(txt)
    const catId = parsed.category_id
    const conf = Number(parsed.confidence) || 0
    if (!catId || conf < THRESHOLD) {
      return { id: row.id, skipped: true, reason: `low_confidence:${conf}` }
    }
    const currentChecklist = row.publish_checklist || {}
    const newChecklist = { ...currentChecklist, categorized: true }
    if (DRY) return { id: row.id, ok: true, dry: true, catId, conf }
    const { error } = await sb.from("products").update({
      category_id: catId,
      category_confidence: conf,
      publish_checklist: newChecklist,
    }).eq("id", row.id)
    if (error) return { id: row.id, failed: true, error: error.message }
    return { id: row.id, ok: true, conf, path: parsed.path }
  } catch (e) {
    return { id: row.id, failed: true, error: String(e.message || e).slice(0, 200) }
  }
}

async function pool(items, n, fn) {
  const results = []
  const queue = [...items]
  await Promise.all(Array.from({ length: Math.min(n, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift()
      if (!item) break
      results.push(await fn(item))
    }
  }))
  return results
}

async function main() {
  console.log(`bhagwati-ai-categorize-bulk${DRY ? " [DRY]" : ""}  concurrency=${CONCURRENCY} threshold=${THRESHOLD}`)

  const leaves = await loadCategoryTree()
  const leafList = renderLeavesForPrompt(leaves)
  console.log(`  loaded ${leaves.length} leaf categories`)

  let processed = 0
  let ok = 0
  let skip = 0
  let fail = 0
  const PAGE = 200
  while (processed < LIMIT) {
    const { data, error } = await sb.from("products")
      .select("id, name_en, name_cn, description, source_file, publish_checklist")
      .eq("source", "Bhagwati-China")
      .is("category_id", null)
      .limit(Math.min(PAGE, LIMIT - processed))
    if (error) { console.error("fetch error:", error.message); break }
    if (!data || data.length === 0) break

    const results = await pool(data, CONCURRENCY, (r) => categorizeOne(r, leafList))
    for (const r of results) {
      if (r.ok) ok++
      else if (r.skipped) skip++
      else if (r.failed) { fail++; if (fail <= 10) console.warn("  fail", r.id, r.error) }
    }
    processed += data.length
    process.stdout.write(`  processed=${processed} applied=${ok} low_conf=${skip} fail=${fail}\n`)
    if (DRY) break
  }
  console.log(`\ndone: processed=${processed} applied=${ok} low_conf=${skip} failed=${fail}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
