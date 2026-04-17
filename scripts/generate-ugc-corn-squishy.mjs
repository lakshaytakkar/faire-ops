#!/usr/bin/env node
// UGC-style video for Toyarina "Yellow Corn Squishy Fidget Kids Toy" — Faire listing.
// Uses Kling v2.1 master image-to-video with the product photo as reference.
// Usage:  cd team-portal && node scripts/generate-ugc-corn-squishy.mjs

import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { fal } from "@fal-ai/client"

const here = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(here, "..", ".env.local")

function readEnvKey(key) {
  try {
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && m[1] === key) {
        let v = m[2]
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
        return v
      }
    }
  } catch {}
  return ""
}

const apiKey = process.env.FAL_API_KEY || readEnvKey("FAL_API_KEY")
if (!apiKey) { console.error("FAL_API_KEY missing"); process.exit(1) }
fal.config({ credentials: apiKey })

const MODEL = "fal-ai/kling-video/v2.1/master/image-to-video"
const IMAGE_URL =
  "https://cdn.faire.com/fastly/685a8b194155e5b3d027938dea16d068cd763ff1d3332e8956124664952d9c31.jpeg"

// UGC product-demo prompt — Kling prompting best practices:
//   * describe subject + camera + lighting + motion + end state
//   * name the material (soft silicone, squishy) so motion looks believable
//   * keep it short, concrete, action-driven
//   * negative prompt kills common failure modes (face, logos, extra fingers)
const PROMPT = [
  "Close-up UGC product video: a hand enters frame from the right and picks up the yellow corn squishy fidget toy from a clean pastel surface.",
  "Fingers gently squeeze it — the soft silicone deforms with a satisfying give, then stretches to roughly double length and snaps back with a little bounce.",
  "Handheld iPhone feel with subtle natural camera shake. Bright natural window light, soft shadows, shallow depth of field.",
  "Cinematic ASMR product demo, 4k, hyper-real textures, no text overlays.",
].join(" ")

const NEGATIVE = "text, watermark, logo, blurry, deformed fingers, extra fingers, face, plastic artificial look, melting, warping, glitch, cartoon"

console.log(`[ugc] model: ${MODEL}`)
console.log(`[ugc] image: ${IMAGE_URL}`)
console.log(`[ugc] duration: 5s  aspect: 9:16`)
console.log("[ugc] submitting…")

const start = Date.now()
const response = await fal.subscribe(MODEL, {
  input: {
    prompt: PROMPT,
    image_url: IMAGE_URL,
    duration: "5",
    // Kling image-to-video often preserves the source image aspect; setting 9:16 nudges
    // toward a vertical render for Reels/TikTok distribution.
    aspect_ratio: "9:16",
    negative_prompt: NEGATIVE,
    cfg_scale: 0.6,
  },
  logs: false,
})
const elapsed = ((Date.now() - start) / 1000).toFixed(1)

const data = response?.data ?? {}
const video = data.video ?? {}
const url = video.url ?? ""
console.log("")
console.log(`[ugc] elapsed: ${elapsed}s`)
console.log(`[ugc] request: ${response?.requestId ?? "—"}`)
console.log(`[ugc] url:     ${url}`)
console.log(`[ugc] type:    ${video.content_type ?? "—"}`)
console.log(`[ugc] size:    ${video.file_size ?? "—"} bytes`)
console.log(`[ugc] seed:    ${data.seed ?? "—"}`)

if (!url) { console.error("no video URL:", JSON.stringify(response, null, 2)); process.exit(2) }
