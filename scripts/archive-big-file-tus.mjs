#!/usr/bin/env node
/**
 * Upload a single big file via Supabase TUS resumable endpoint.
 * Use for files >50MB where the standard upload fails.
 */
import { readFileSync, statSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { config } from "dotenv"

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, "..", ".env.local") })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

const BUCKET = "repo-archives"
const LOCAL = ".claude/ets.zip"
const KEY = "2026-04/claude/ets.zip"

const abs = resolve(__dirname, "..", LOCAL)
const size = statSync(abs).size
console.log(`Uploading ${LOCAL} (${(size / 1024 / 1024).toFixed(2)} MB) via TUS…`)

const base = `${SUPABASE_URL}/storage/v1/upload/resumable`

// 1. CREATE
const createRes = await fetch(base, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${SERVICE_ROLE}`,
    "Tus-Resumable": "1.0.0",
    "Upload-Length": String(size),
    "Content-Type": "application/offset+octet-stream",
    "Upload-Metadata": [
      `bucketName ${Buffer.from(BUCKET).toString("base64")}`,
      `objectName ${Buffer.from(KEY).toString("base64")}`,
      `contentType ${Buffer.from("application/zip").toString("base64")}`,
      `cacheControl ${Buffer.from("3600").toString("base64")}`,
    ].join(","),
  },
})
if (createRes.status !== 201) {
  console.error("Create failed:", createRes.status, await createRes.text())
  process.exit(1)
}
const location = createRes.headers.get("location")
console.log("Upload URL:", location)

// 2. PATCH chunks
const bytes = readFileSync(abs)
const CHUNK = 6 * 1024 * 1024 // 6 MiB
let offset = 0
while (offset < size) {
  const end = Math.min(offset + CHUNK, size)
  const chunk = bytes.subarray(offset, end)
  const patchRes = await fetch(location, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE}`,
      "Tus-Resumable": "1.0.0",
      "Upload-Offset": String(offset),
      "Content-Type": "application/offset+octet-stream",
    },
    body: chunk,
  })
  if (patchRes.status !== 204) {
    console.error("Patch failed at offset", offset, patchRes.status, await patchRes.text())
    process.exit(1)
  }
  offset = end
  process.stdout.write(`\r  progress: ${((offset / size) * 100).toFixed(1)}%`)
}
console.log(`\nok: ${BUCKET}/${KEY}`)
