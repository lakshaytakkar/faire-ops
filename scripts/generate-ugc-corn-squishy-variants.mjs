#!/usr/bin/env node
// Two retail-buyer-facing UGC variations of the corn squishy, in parallel.
// 1. Retailer shop counter context (point-of-sale impulse buy)
// 2. Wholesale unboxing / product review (buyer evaluation mode)

import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { fal } from "@fal-ai/client"

const here = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(here, "..", ".env.local")
function readEnvKey(k) {
  try {
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && m[1] === k) {
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
const IMAGE_URL = "https://cdn.faire.com/fastly/685a8b194155e5b3d027938dea16d068cd763ff1d3332e8956124664952d9c31.jpeg"
const NEGATIVE = "text, watermark, logo, blurry, deformed fingers, extra fingers, face, plastic artificial look, melting, warping, glitch, cartoon"

const VARIANTS = [
  {
    id: "shop-counter",
    aspect: "9:16",
    prompt: [
      "Close-up retail product shot: the yellow corn squishy fidget toy sits on a bright wooden checkout counter in a small boutique toy store, next to a wire display basket filled with other colorful fidgets.",
      "Warm afternoon sunlight streams through a shop window in the softly-blurred background, with pastel shelves and plush toys out of focus.",
      "A small child's hand reaches in from the right, picks up the squishy and gently squeezes it — the soft corn deforms and snaps back with a satisfying wobble.",
      "Handheld iPhone aesthetic with subtle camera shake, shallow depth of field, cinematic 4k. No text overlays.",
    ].join(" "),
  },
  {
    id: "unboxing",
    aspect: "9:16",
    prompt: [
      "Overhead top-down shot: a pair of adult hands pulls the yellow corn squishy fidget toy out of a brown kraft wholesale mailer box onto a clean white table surface alongside soft crinkle paper.",
      "Hands pick up the squishy, squeeze it between fingers — the soft silicone deforms with a satisfying give, stretches slightly, then springs back.",
      "Natural diffused daylight, minimalist white background, slight handheld camera drift.",
      "Professional wholesale unboxing product-review aesthetic, shot on phone, 4k, ASMR quality. No text overlays.",
    ].join(" "),
  },
]

console.log(`[variants] model: ${MODEL}`)
console.log(`[variants] image: ${IMAGE_URL}`)
console.log(`[variants] kicking off ${VARIANTS.length} generations in parallel…\n`)

const start = Date.now()
const results = await Promise.allSettled(
  VARIANTS.map(async (v) => {
    const t0 = Date.now()
    const res = await fal.subscribe(MODEL, {
      input: {
        prompt: v.prompt,
        image_url: IMAGE_URL,
        duration: "5",
        aspect_ratio: v.aspect,
        negative_prompt: NEGATIVE,
        cfg_scale: 0.6,
      },
      logs: false,
    })
    const dt = ((Date.now() - t0) / 1000).toFixed(1)
    const video = res?.data?.video ?? {}
    return {
      id: v.id,
      elapsed: dt,
      requestId: res?.requestId ?? "",
      url: video.url ?? "",
      contentType: video.content_type ?? "",
      fileSize: video.file_size ?? null,
    }
  }),
)

const totalDt = ((Date.now() - start) / 1000).toFixed(1)
console.log(`[variants] total elapsed (parallel): ${totalDt}s\n`)

for (const [i, r] of results.entries()) {
  const v = VARIANTS[i]
  if (r.status === "fulfilled") {
    const x = r.value
    console.log(`[${v.id}] ✓  ${x.elapsed}s  ${x.fileSize ?? "?"}B`)
    console.log(`[${v.id}]    ${x.url}`)
    console.log(`[${v.id}]    req=${x.requestId}`)
  } else {
    console.log(`[${v.id}] ✗  ${r.reason?.message ?? r.reason}`)
  }
  console.log("")
}
