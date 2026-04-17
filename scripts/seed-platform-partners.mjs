#!/usr/bin/env node
// Idempotently seed external platform partners (account managers, reps) per Space.
// Usage: node scripts/seed-platform-partners.mjs

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  const txt = readFileSync(join(__dirname, "..", ".env.local"), "utf8")
  const env = {}
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m) env[m[1]] = m[2]
  }
  return env
}

const env = loadEnv()
const sb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
)

const PARTNERS = [
  {
    space_slug: "b2b-ecommerce",
    platform: "faire",
    role: "account_manager",
    name: "Gabriel Fourari",
    title: "Account Manager",
    email: "gabe.fourari@faire.com",
    phone: "+14152129576",
    calendly_url: "https://calendly.com/gabriel-fourari",
    avatar_url:
      "https://d3v0px0pttie1i.cloudfront.net/uploads/user/avatar/9918977/3c8c918d.jpg",
    is_pinned: true,
    sort_order: 0,
  },
]

async function main() {
  let upserted = 0
  for (const p of PARTNERS) {
    const { error } = await sb
      .from("platform_partners")
      .upsert(p, { onConflict: "space_slug,platform,role,email" })
    if (error) {
      console.error(`  ✗ ${p.name}: ${error.message}`)
      continue
    }
    upserted++
    console.log(`  ✓ ${p.name} (${p.platform}/${p.role})`)
  }
  console.log(`\n✓ ${upserted} partner${upserted === 1 ? "" : "s"} upserted`)
}

main().catch((e) => {
  console.error("FATAL:", e)
  process.exit(1)
})
