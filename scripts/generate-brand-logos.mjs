/**
 * Generate distinct text + mascot brand logos via Gemini 2.5 Flash Image.
 * Each brand gets its own focused prompt — no batching, no shared context.
 *
 * Usage: NEXT_PUBLIC_GEMINI_API_KEY=... node scripts/generate-brand-logos.mjs
 */

import { GoogleGenerativeAI } from "@google/generative-ai"
import fs from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? process.env.GEMINI_API_KEY ?? ""
if (!API_KEY) {
  console.error("Set NEXT_PUBLIC_GEMINI_API_KEY env var")
  process.exit(1)
}

const genAI = new GoogleGenerativeAI(API_KEY)
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-image",
  generationConfig: {
    responseModalities: ["TEXT", "IMAGE"],
  },
})

const OUT_DIR = "public/logos"
await fs.mkdir(OUT_DIR, { recursive: true })

/* ------------------------------------------------------------------ */
/*  Logo briefs — each one independently crafted for distinction      */
/* ------------------------------------------------------------------ */

const BRANDS = [
  {
    slug: "legalnations",
    label: "LegalNations",
    prompt: `Modern flat vector logo for a brand called "LegalNations". Show a friendly cartoon mascot of a small smiling owl wearing a tiny lawyer's wig, holding a small balanced scale of justice. Beside the mascot, the wordmark "LegalNations" in a bold modern sans-serif font, deep emerald green color (#0d9668). The mascot uses earth tones — brown owl body, white wig, gold scale. Minimal, clean, professional. FULLY TRANSPARENT BACKGROUND — output a PNG with an alpha channel where the area around the mascot and wordmark is 100% transparent. NO white box, NO solid fill, NO gradient, NO shadow plate. Only the mascot and the wordmark are opaque pixels; everything else must be transparent. The whole logo should feel approachable and trustworthy. NO TEXT OTHER than "LegalNations". Aspect ratio square 1:1.`,
  },
  {
    slug: "goyotours",
    label: "GoyoTours",
    prompt: `Modern flat vector logo for a travel brand called "GoyoTours". Show a cute cartoon mascot of a smiling backpack with a tiny mountain peak sticking out of it, with two little legs walking. Beside the mascot, the wordmark "GoyoTours" in a friendly rounded sans-serif font, sunset orange color (#f97316). The mascot uses warm travel palette — orange backpack, brown straps, white mountain. FULLY TRANSPARENT BACKGROUND — output a PNG with an alpha channel where the area around the mascot and wordmark is 100% transparent. NO white box, NO solid fill, NO gradient, NO shadow plate. Only the mascot and the wordmark are opaque pixels; everything else must be transparent. Adventurous and cheerful feel. NO TEXT OTHER than "GoyoTours". Aspect ratio square 1:1.`,
  },
  {
    slug: "suprans",
    label: "Suprans",
    prompt: `Modern flat vector logo for an ecommerce wholesale brand called "Suprans". Show a friendly mascot of a stylized shopping bag character with a smiling face and tiny arms holding a small star. Beside the mascot, the wordmark "Suprans" in a bold modern sans-serif font, royal blue color (#3b82f6). The mascot uses blue and white tones with a yellow star. FULLY TRANSPARENT BACKGROUND — output a PNG with an alpha channel where the area around the mascot and wordmark is 100% transparent. NO white box, NO solid fill, NO gradient, NO shadow plate. Only the mascot and the wordmark are opaque pixels; everything else must be transparent. Premium and confident feel. NO TEXT OTHER than "Suprans". Aspect ratio square 1:1.`,
  },
  {
    slug: "usdrop-ai",
    label: "USDrop AI",
    prompt: `Modern flat vector logo for an AI dropshipping brand called "USDrop AI". Show a cute cartoon mascot of a delivery package box with a robot face — two glowing blue eyes and a small antenna on top. Beside the mascot, the wordmark "USDrop AI" in a futuristic geometric sans-serif font, hot pink color (#ec4899). The mascot uses pink, white, and a touch of cyan for the robot eyes. FULLY TRANSPARENT BACKGROUND — output a PNG with an alpha channel where the area around the mascot and wordmark is 100% transparent. NO white box, NO solid fill, NO gradient, NO shadow plate. Only the mascot and the wordmark are opaque pixels; everything else must be transparent. Tech-forward and fun feel. NO TEXT OTHER than "USDrop AI". Aspect ratio square 1:1.`,
  },
  {
    slug: "eazysell",
    label: "EazySell",
    prompt: `Modern flat vector logo for a sales platform called "EazySell". Show a cheerful mascot of a smiling cartoon thumbs-up hand wearing tiny round sunglasses, with little speed lines around it. Beside the mascot, the wordmark "EazySell" in a modern bold sans-serif font, teal color (#14b8a6). The mascot uses skin-tone for the hand and black sunglasses. FULLY TRANSPARENT BACKGROUND — output a PNG with an alpha channel where the area around the mascot and wordmark is 100% transparent. NO white box, NO solid fill, NO gradient, NO shadow plate. Only the mascot and the wordmark are opaque pixels; everything else must be transparent. Energetic and easy feel. NO TEXT OTHER than "EazySell". Aspect ratio square 1:1.`,
  },
  {
    slug: "teamsync-ai",
    label: "TeamSync AI",
    prompt: `Modern flat vector logo for an AI business operations platform called "TeamSync AI". Show a friendly mascot of a small purple octopus with a smile, each tentacle holding a different small icon (briefcase, clock, chart, gear, message bubble, lightbulb). Beside the mascot, the wordmark "TeamSync AI" in a bold modern sans-serif font, indigo violet color (#6366f1). The mascot is light purple with a darker outline. FULLY TRANSPARENT BACKGROUND — output a PNG with an alpha channel where the area around the mascot and wordmark is 100% transparent. NO white box, NO solid fill, NO gradient, NO shadow plate. Only the mascot and the wordmark are opaque pixels; everything else must be transparent. Multi-tasking and collaborative feel. NO TEXT OTHER than "TeamSync AI". Aspect ratio square 1:1.`,
  },
  {
    slug: "toysinbulk",
    label: "ToysInBulk",
    prompt: `Modern flat vector logo for a wholesale toys brand called "ToysInBulk". Show a fun mascot of a stack of three colorful building blocks (red, yellow, blue) with cartoon eyes and a smile on the top block. Beside the mascot, the wordmark "ToysInBulk" in a playful rounded sans-serif font, bright cherry red color (#ef4444). FULLY TRANSPARENT BACKGROUND — output a PNG with an alpha channel where the area around the mascot and wordmark is 100% transparent. NO white box, NO solid fill, NO gradient, NO shadow plate. Only the mascot and the wordmark are opaque pixels; everything else must be transparent. Playful and joyful feel. NO TEXT OTHER than "ToysInBulk". Aspect ratio square 1:1.`,
  },
]

/* ------------------------------------------------------------------ */
/*  Sleep helper to avoid hammering rate limits                        */
/* ------------------------------------------------------------------ */
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

/**
 * Post-process: convert near-white pixels to transparent.
 *
 * Gemini 2.5 Flash Image often ignores "transparent background" requests
 * and bakes a white background into the PNG. We compensate by reading the
 * raw RGBA buffer and setting alpha=0 for any pixel whose RGB values are
 * all above WHITE_THRESHOLD. The threshold is generous (240) so off-white
 * pixels near anti-aliased edges also get keyed out, with linear feathering
 * for the 240-255 range so edges stay smooth instead of jagged.
 */
// Pixels with minRgb >= FEATHER_START enter the feather; minRgb >= FULL_KEY
// becomes fully transparent. The feather exists so anti-aliased edges stay
// smooth instead of jagged when keyed against the body of a colored mascot.
const FEATHER_START = 230
const FULL_KEY = 250 // anything 250..255 → alpha 0, even with minor noise

async function keyOutWhite(filePath) {
  const img = sharp(filePath).ensureAlpha()
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  if (channels !== 4) {
    throw new Error(`Unexpected channel count: ${channels}`)
  }
  let keyed = 0
  const featherSpan = FULL_KEY - FEATHER_START
  for (let i = 0; i < data.length; i += 4) {
    const minRgb = Math.min(data[i], data[i + 1], data[i + 2])
    if (minRgb >= FULL_KEY) {
      data[i + 3] = 0
      keyed++
    } else if (minRgb >= FEATHER_START) {
      const t = (minRgb - FEATHER_START) / featherSpan
      data[i + 3] = Math.round(data[i + 3] * (1 - t))
    }
  }
  await sharp(data, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(filePath)
  const pct = ((keyed / (width * height)) * 100).toFixed(1)
  console.log(`[${path.basename(filePath)}] keyed ${pct}% of pixels to transparent`)
}

async function generateOne(brand) {
  console.log(`\n[${brand.slug}] Generating logo...`)
  try {
    const result = await model.generateContent(brand.prompt)
    const parts = result.response.candidates?.[0]?.content?.parts ?? []
    for (const part of parts) {
      if (part.inlineData?.data) {
        const buf = Buffer.from(part.inlineData.data, "base64")
        const ext = part.inlineData.mimeType?.includes("png") ? "png" : "jpg"
        const out = path.join(OUT_DIR, `${brand.slug}.${ext}`)
        await fs.writeFile(out, buf)
        console.log(`[${brand.slug}] ✓ saved → ${out} (${(buf.length / 1024).toFixed(1)} KB)`)
        if (ext === "png") {
          try {
            await keyOutWhite(out)
          } catch (e) {
            console.error(`[${brand.slug}] ✗ alpha-key failed:`, e.message)
          }
        }
        return out
      }
    }
    console.error(`[${brand.slug}] ✗ no image data in response`)
    return null
  } catch (e) {
    console.error(`[${brand.slug}] ✗ error:`, e.message)
    return null
  }
}

/* ------------------------------------------------------------------ */
/*  Main                                                                */
/* ------------------------------------------------------------------ */

console.log(`Generating ${BRANDS.length} brand logos...`)
const results = []
for (const brand of BRANDS) {
  const out = await generateOne(brand)
  results.push({ ...brand, file: out })
  await sleep(2000) // gentle rate limiting
}

console.log("\n=== Summary ===")
results.forEach(r => console.log(`  ${r.file ? "✓" : "✗"} ${r.slug}`))
console.log(`\nDone. Logos saved to ${OUT_DIR}/`)
