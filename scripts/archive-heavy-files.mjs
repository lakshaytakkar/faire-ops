#!/usr/bin/env node
/**
 * One-off: upload heavy staged artifacts from the repo to Supabase storage.
 * Prints a manifest of { originalPath → storagePath } so the caller can
 * safely delete originals afterwards.
 */
import { readFileSync, statSync, existsSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, "..", ".env.local") })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const BUCKET = "repo-archives"
const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })

// (localPath, storageKey) pairs — keep storageKey human-friendly.
const repoRoot = resolve(__dirname, "..")
const uploads = [
  { local: ".claude/ets.zip",                              key: "2026-04/claude/ets.zip" },
  { local: ".claude/Suprans-20260416T103317Z-3-001.zip",   key: "2026-04/claude/Suprans-20260416T103317Z-3-001.zip" },
  { local: ".claude/life-ai-complete.zip",                 key: "2026-04/claude/life-ai-complete.zip" },
  { local: ".claude/files md.zip",                         key: "2026-04/claude/files-md.zip" },
  { local: ".claude/Recrutiment.xlsx",                     key: "2026-04/claude/Recrutiment.xlsx" },
  { local: ".claude/All Employee_s Record.xlsx",           key: "2026-04/claude/All-Employees-Record.xlsx" },
  { local: ".claude/Employee Salary Sheet.xlsx",           key: "2026-04/claude/Employee-Salary-Sheet.xlsx" },
  { local: ".claude/agents/Index Travel 2026.xlsx",        key: "2026-04/claude/Index-Travel-2026.xlsx" },
]

async function ensureBucket() {
  const { data: buckets, error } = await sb.storage.listBuckets()
  if (error) throw error
  if (!buckets?.some((b) => b.name === BUCKET)) {
    const { error: cErr } = await sb.storage.createBucket(BUCKET, { public: false })
    if (cErr) throw cErr
    console.log(`Created bucket: ${BUCKET}`)
  } else {
    console.log(`Bucket exists: ${BUCKET}`)
  }
}

async function uploadOne({ local, key }) {
  const abs = resolve(repoRoot, local)
  if (!existsSync(abs)) {
    console.log(`skip (missing): ${local}`)
    return { local, skipped: true }
  }
  const size = statSync(abs).size
  const bytes = readFileSync(abs)
  const { error } = await sb.storage.from(BUCKET).upload(key, bytes, { upsert: true })
  if (error) {
    console.error(`fail: ${local} -> ${key} :: ${error.message}`)
    return { local, failed: error.message }
  }
  console.log(`ok:   ${local} (${(size / 1024 / 1024).toFixed(2)} MB) -> ${BUCKET}/${key}`)
  return { local, key, bytes: size }
}

(async () => {
  await ensureBucket()
  const results = []
  for (const u of uploads) {
    results.push(await uploadOne(u))
  }
  console.log("\nSummary:")
  console.log(JSON.stringify(results, null, 2))
})()
