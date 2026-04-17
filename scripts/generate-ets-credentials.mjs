#!/usr/bin/env node
// One-shot: generate a fresh password for every ETS client (auth.users) +
// upsert one admin account. Outputs CSV to stdout AND to scripts/ets-credentials.csv.
//
// Reads our project from .env.local. Uses the Supabase Admin API to set passwords.
//
// Usage: node scripts/generate-ets-credentials.mjs

import { createClient } from "@supabase/supabase-js"
import { randomBytes } from "node:crypto"
import { writeFileSync, readFileSync } from "node:fs"
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
const URL = env.NEXT_PUBLIC_SUPABASE_URL
const SVC = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !SVC) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

const sb = createClient(URL, SVC, { auth: { persistSession: false } })
const sbEts = createClient(URL, SVC, { auth: { persistSession: false }, db: { schema: "ets" } })

const ADMIN_PORTAL_URL = "https://faire-ops-flax.vercel.app"
const CLIENT_PORTAL_URL = "https://ets-client.vercel.app"

const CONSONANTS = "BCDFGHJKLMNPQRSTVWXYZ"
const VOWELS = "AEIOU"
const DIGITS = "23456789"

function pickFrom(s) {
  const buf = randomBytes(1)
  return s[buf[0] % s.length]
}

function generatePassword() {
  // Format: Ets-{Cv}{Cv}-{4 digits}  e.g., Ets-Ba-Tu-7392
  // Readable, no ambiguous chars (0/O/1/I/l), satisfies "min 8 char + complexity"
  let p = "Ets-"
  for (let i = 0; i < 2; i++) {
    p += pickFrom(CONSONANTS) + pickFrom(VOWELS).toLowerCase()
  }
  p += "-"
  for (let i = 0; i < 4; i++) p += pickFrom(DIGITS)
  return p
}

async function main() {
  console.log("→ Loading ETS clients…")
  const { data: clients, error: cErr } = await sbEts
    .from("clients")
    .select("id, name, email, phone, city, stage")
    .not("email", "is", null)
    .order("name", { ascending: true })
  if (cErr) throw cErr
  console.log(`  ${clients.length} clients`)

  const rows = []
  let done = 0
  for (const c of clients) {
    const password = generatePassword()
    // Look up auth user by email
    const { data: list, error: listErr } = await sb.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })
    if (listErr) throw listErr
    let authUser = list.users.find((u) => u.email?.toLowerCase() === c.email.toLowerCase())
    if (!authUser) {
      // create one
      const { data: created, error: cErr } = await sb.auth.admin.createUser({
        email: c.email,
        password,
        email_confirm: true,
        user_metadata: { role: "client", name: c.name, client_id: c.id },
      })
      if (cErr) {
        console.error(`  ✗ create ${c.email}: ${cErr.message}`)
        continue
      }
      authUser = created.user
    } else {
      const { error: uErr } = await sb.auth.admin.updateUserById(authUser.id, {
        password,
        user_metadata: { ...authUser.user_metadata, role: "client", name: c.name, client_id: c.id },
      })
      if (uErr) {
        console.error(`  ✗ update ${c.email}: ${uErr.message}`)
        continue
      }
    }
    rows.push({
      role: "client",
      name: c.name,
      email: c.email,
      password,
      phone: c.phone ?? "",
      city: c.city ?? "",
      stage: c.stage ?? "",
      app_url: CLIENT_PORTAL_URL,
    })
    done++
    if (done % 5 === 0) console.log(`  ${done}/${clients.length}`)
  }

  // Admin user
  console.log("→ Upserting admin account…")
  const adminEmail = "admin@eazytosell.com"
  const adminPassword = generatePassword()
  const { data: list2 } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const existingAdmin = list2.users.find((u) => u.email?.toLowerCase() === adminEmail)
  if (existingAdmin) {
    await sb.auth.admin.updateUserById(existingAdmin.id, {
      password: adminPassword,
      user_metadata: { ...existingAdmin.user_metadata, role: "admin", name: "Admin" },
    })
  } else {
    await sb.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { role: "admin", name: "Admin" },
    })
  }
  rows.unshift({
    role: "admin",
    name: "Admin",
    email: adminEmail,
    password: adminPassword,
    phone: "",
    city: "",
    stage: "",
    app_url: ADMIN_PORTAL_URL,
  })

  // CSV write
  const header = ["role", "name", "email", "password", "phone", "city", "stage", "app_url"]
  const csv = [
    header.join(","),
    ...rows.map((r) =>
      header
        .map((h) => {
          const v = String(r[h] ?? "")
          return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
        })
        .join(","),
    ),
  ].join("\n")
  const outPath = join(__dirname, "ets-credentials.csv")
  writeFileSync(outPath, csv, "utf8")
  console.log(`\n✓ Wrote ${rows.length} credentials to ${outPath}`)
  console.log("\n" + csv)
}

main().catch((e) => {
  console.error("FATAL:", e)
  process.exit(1)
})
