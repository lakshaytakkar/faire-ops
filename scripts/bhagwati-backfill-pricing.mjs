#!/usr/bin/env node
/**
 * Bhagwati-China pricing backfill (Phase 5).
 *
 * Populates new pricing columns on ets.products from legacy fields and
 * normalises listing_status so the client-portal publish gate
 * (listing_status = 'published') matches the existing is_published boolean.
 *
 * Idempotent — safe to re-run. Pass --dry-run to print the counts of rows
 * that WOULD be updated without touching the DB.
 *
 * Usage:
 *   node scripts/bhagwati-backfill-pricing.mjs [--dry-run]
 *
 * Env (from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * ──────────────────────────────────────────────────────────────────
 * Equivalent SQL (reference — apply via psql / supabase migration):
 * ──────────────────────────────────────────────────────────────────
 *
 *   -- Step 1: seed cost_price_cny from legacy columns
 *   UPDATE ets.products
 *      SET cost_price_cny = unit_price
 *    WHERE cost_price_cny IS NULL
 *      AND currency = 'CNY'
 *      AND unit_price IS NOT NULL;
 *
 *   UPDATE ets.products
 *      SET cost_price_cny = cost_price
 *    WHERE cost_price_cny IS NULL
 *      AND cost_price IS NOT NULL;
 *
 *   -- Step 2: derive INR pricing + flip prices_inr checklist flag
 *   UPDATE ets.products
 *      SET cost_price_inr    = cost_price_cny * 13.8,
 *          selling_price_inr = (cost_price_cny * 13.8) * 1.20,
 *          fx_rate_inr_cny   = 13.8,
 *          margin_pct        = 20,
 *          publish_checklist = jsonb_set(
 *            COALESCE(publish_checklist, '{}'::jsonb),
 *            '{prices_inr}',
 *            'true'::jsonb,
 *            true
 *          )
 *    WHERE cost_price_cny IS NOT NULL
 *      AND cost_price_inr IS NULL;
 *
 *   -- Step 3: normalise listing_status against legacy is_published
 *   UPDATE ets.products
 *      SET listing_status = 'published'
 *    WHERE is_published = true
 *      AND (listing_status IS NULL OR listing_status <> 'published');
 *
 *   UPDATE ets.products
 *      SET listing_status = 'draft'
 *    WHERE (is_published IS NULL OR is_published = false)
 *      AND listing_status IS NULL;
 */

import "dotenv/config"
import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const DRY_RUN = process.argv.includes("--dry-run")

// dotenv/config reads .env — also merge .env.local so the same env file the
// Next.js dev server uses works here (mirrors generate-ets-credentials.mjs).
function loadDotEnvLocal() {
  try {
    const here = dirname(fileURLToPath(import.meta.url))
    const txt = readFileSync(join(here, "..", ".env.local"), "utf8")
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
    }
  } catch (_) {
    // optional
  }
}
loadDotEnvLocal()

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!URL || !SVC) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  )
  process.exit(1)
}

const FX = 13.8
const MARGIN_PCT = 20
const MARGIN_MULT = 1 + MARGIN_PCT / 100

const sb = createClient(URL, SVC, {
  auth: { persistSession: false },
  db: { schema: "ets" },
})

const PAGE_SIZE = 1000

async function fetchAll(query, label) {
  // Supabase caps select to 1000 rows by default. Paginate.
  const all = []
  let from = 0
  for (;;) {
    const { data, error } = await query.range(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`[${label}] ${error.message}`)
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return all
}

async function countBeforeAfter(label) {
  const { count: total, error: e1 } = await sb
    .from("products")
    .select("id", { count: "exact", head: true })
  if (e1) throw new Error(`[count:total] ${e1.message}`)

  const { count: cnyNull, error: e2 } = await sb
    .from("products")
    .select("id", { count: "exact", head: true })
    .is("cost_price_cny", null)
  if (e2) throw new Error(`[count:cny_null] ${e2.message}`)

  const { count: inrNull, error: e3 } = await sb
    .from("products")
    .select("id", { count: "exact", head: true })
    .is("cost_price_inr", null)
  if (e3) throw new Error(`[count:inr_null] ${e3.message}`)

  const { count: published, error: e4 } = await sb
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("listing_status", "published")
  if (e4) throw new Error(`[count:published] ${e4.message}`)

  const { count: draft, error: e5 } = await sb
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("listing_status", "draft")
  if (e5) throw new Error(`[count:draft] ${e5.message}`)

  const { count: isPub, error: e6 } = await sb
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("is_published", true)
  if (e6) throw new Error(`[count:is_published] ${e6.message}`)

  console.log(`\n── ${label} ──`)
  console.log(`  total products          : ${total}`)
  console.log(`  cost_price_cny IS NULL  : ${cnyNull}`)
  console.log(`  cost_price_inr IS NULL  : ${inrNull}`)
  console.log(`  listing_status=published: ${published}`)
  console.log(`  listing_status=draft    : ${draft}`)
  console.log(`  is_published=true       : ${isPub}`)
}

async function step1SeedCostCny() {
  // Candidates: cost_price_cny IS NULL AND (currency=CNY with unit_price) OR cost_price IS NOT NULL.
  // Fetch in two batches so we can preserve priority: unit_price first, cost_price fallback.
  const fromCny = await fetchAll(
    sb
      .from("products")
      .select("id, unit_price")
      .is("cost_price_cny", null)
      .eq("currency", "CNY")
      .not("unit_price", "is", null),
    "step1:cny_unit_price",
  )

  const fromCost = await fetchAll(
    sb
      .from("products")
      .select("id, cost_price")
      .is("cost_price_cny", null)
      .not("cost_price", "is", null),
    "step1:cost_price",
  )

  // De-dupe: prefer unit_price when a product matches both queries.
  const seen = new Set(fromCny.map((r) => r.id))
  const updates = [
    ...fromCny.map((r) => ({ id: r.id, cost_price_cny: Number(r.unit_price) })),
    ...fromCost
      .filter((r) => !seen.has(r.id))
      .map((r) => ({ id: r.id, cost_price_cny: Number(r.cost_price) })),
  ].filter((u) => Number.isFinite(u.cost_price_cny))

  console.log(
    `\nstep 1 — seed cost_price_cny: ${updates.length} row(s) ` +
      `(${fromCny.length} via unit_price + ${updates.length - fromCny.length} via cost_price fallback)`,
  )

  if (DRY_RUN || updates.length === 0) return updates.length

  let done = 0
  for (const u of updates) {
    const { error } = await sb
      .from("products")
      .update({ cost_price_cny: u.cost_price_cny })
      .eq("id", u.id)
    if (error) throw new Error(`[step1:update ${u.id}] ${error.message}`)
    done++
    if (done % 200 === 0) console.log(`  … ${done}/${updates.length}`)
  }
  console.log(`  step 1 done: ${done} updated`)
  return done
}

async function step2DeriveInr() {
  const rows = await fetchAll(
    sb
      .from("products")
      .select("id, cost_price_cny, publish_checklist")
      .not("cost_price_cny", "is", null)
      .is("cost_price_inr", null),
    "step2:inr_null",
  )

  console.log(`\nstep 2 — derive INR pricing: ${rows.length} row(s)`)

  if (DRY_RUN || rows.length === 0) return rows.length

  let done = 0
  for (const r of rows) {
    const cny = Number(r.cost_price_cny)
    if (!Number.isFinite(cny)) continue
    const costInr = Math.round(cny * FX * 100) / 100
    const sellInr = Math.round(costInr * MARGIN_MULT * 100) / 100
    const checklist = {
      ...(r.publish_checklist && typeof r.publish_checklist === "object"
        ? r.publish_checklist
        : {}),
      prices_inr: true,
    }
    const { error } = await sb
      .from("products")
      .update({
        cost_price_inr: costInr,
        selling_price_inr: sellInr,
        fx_rate_inr_cny: FX,
        margin_pct: MARGIN_PCT,
        publish_checklist: checklist,
      })
      .eq("id", r.id)
    if (error) throw new Error(`[step2:update ${r.id}] ${error.message}`)
    done++
    if (done % 200 === 0) console.log(`  … ${done}/${rows.length}`)
  }
  console.log(`  step 2 done: ${done} updated`)
  return done
}

async function step3SyncListingStatus() {
  // 3a: is_published=true but listing_status != 'published'
  const toPublished = await fetchAll(
    sb
      .from("products")
      .select("id")
      .eq("is_published", true)
      .or("listing_status.is.null,listing_status.neq.published"),
    "step3:to_published",
  )

  // 3b: is_published=false (or null) AND listing_status IS NULL → draft
  const toDraft = await fetchAll(
    sb
      .from("products")
      .select("id, is_published")
      .is("listing_status", null),
    "step3:to_draft_candidates",
  )
  const toDraftIds = toDraft
    .filter((r) => r.is_published !== true)
    .map((r) => r.id)

  console.log(
    `\nstep 3 — sync listing_status: ` +
      `${toPublished.length} → 'published', ${toDraftIds.length} → 'draft'`,
  )

  if (DRY_RUN) return toPublished.length + toDraftIds.length

  let done = 0
  for (let i = 0; i < toPublished.length; i += 200) {
    const slice = toPublished.slice(i, i + 200).map((r) => r.id)
    const { error } = await sb
      .from("products")
      .update({ listing_status: "published" })
      .in("id", slice)
    if (error) throw new Error(`[step3a:update] ${error.message}`)
    done += slice.length
  }
  for (let i = 0; i < toDraftIds.length; i += 200) {
    const slice = toDraftIds.slice(i, i + 200)
    const { error } = await sb
      .from("products")
      .update({ listing_status: "draft" })
      .in("id", slice)
    if (error) throw new Error(`[step3b:update] ${error.message}`)
    done += slice.length
  }
  console.log(`  step 3 done: ${done} updated`)
  return done
}

async function main() {
  console.log(
    `bhagwati-backfill-pricing.mjs${DRY_RUN ? " [DRY RUN]" : ""}`,
  )
  console.log(`  FX = ${FX}, margin = ${MARGIN_PCT}%`)

  await countBeforeAfter("BEFORE")
  await step1SeedCostCny()
  await step2DeriveInr()
  await step3SyncListingStatus()

  if (!DRY_RUN) await countBeforeAfter("AFTER")
  else console.log("\n(dry run — no rows modified)")
}

main().catch((err) => {
  console.error("FAILED:", err.message)
  process.exit(1)
})
