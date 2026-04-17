#!/usr/bin/env node
// Smoke test: generate a sample video via FAL Kling.
// Usage:
//   cd team-portal && node scripts/test-fal-kling.mjs
// Requires FAL_API_KEY in team-portal/.env.local.
//
// NOTE: each run costs real money (~$0.35+). Do not loop.

import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { fal } from "@fal-ai/client"

const here = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(here, "..", ".env.local")

function readEnvKey(key) {
  try {
    const content = readFileSync(envPath, "utf8")
    for (const line of content.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && m[1] === key) {
        let v = m[2]
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1)
        }
        return v
      }
    }
  } catch {
    // ignore
  }
  return ""
}

const apiKey = process.env.FAL_API_KEY || readEnvKey("FAL_API_KEY")
if (!apiKey) {
  console.error("FAL_API_KEY missing")
  process.exit(1)
}
fal.config({ credentials: apiKey })

const model = process.env.FAL_VIDEO_MODEL || "fal-ai/kling-video/v2.1/master/text-to-video"
const prompt =
  process.argv.slice(2).join(" ") ||
  "Minimalist modern office at sunset, warm golden light streaming through tall windows, slow forward camera push through an open collaborative workspace with plants and empty desks, cinematic, 4k"

console.log(`[fal-kling] model: ${model}`)
console.log(`[fal-kling] prompt: ${prompt}`)
console.log("[fal-kling] submitting…")

const start = Date.now()
const response = await fal.subscribe(model, {
  input: {
    prompt,
    duration: "5",
    aspect_ratio: "16:9",
  },
  logs: false,
})
const elapsed = ((Date.now() - start) / 1000).toFixed(1)

const data = response?.data ?? {}
const video = data.video ?? {}
const url = video.url ?? ""

console.log("")
console.log(`[fal-kling] elapsed: ${elapsed}s`)
console.log(`[fal-kling] request: ${response?.requestId ?? "—"}`)
console.log(`[fal-kling] url:     ${url}`)
console.log(`[fal-kling] type:    ${video.content_type ?? "—"}`)
console.log(`[fal-kling] size:    ${video.file_size ?? "—"} bytes`)
console.log(`[fal-kling] seed:    ${data.seed ?? "—"}`)

if (!url) {
  console.error("no video URL in response:", JSON.stringify(response, null, 2))
  process.exit(2)
}
