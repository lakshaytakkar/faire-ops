/**
 * Generate distinct text + mascot brand logos via Gemini 2.5 Flash Image.
 * Each brand gets its own focused prompt — no batching, no shared context.
 *
 * Usage: NEXT_PUBLIC_GEMINI_API_KEY=... node scripts/generate-brand-logos.mjs
 */

import { GoogleGenerativeAI } from "@google/generative-ai"
import fs from "node:fs/promises"
import path from "node:path"

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
    prompt: `Modern flat vector logo for a brand called "LegalNations". Show a friendly cartoon mascot of a small smiling owl wearing a tiny lawyer's wig, holding a small balanced scale of justice. Beside the mascot, the wordmark "LegalNations" in a bold modern sans-serif font, deep emerald green color (#0d9668). The mascot uses earth tones — brown owl body, white wig, gold scale. Minimal, clean, professional. PURE WHITE BACKGROUND with no shading, no gradient. The whole logo should feel approachable and trustworthy. NO TEXT OTHER than "LegalNations". Aspect ratio square 1:1.`,
  },
  {
    slug: "goyotours",
    label: "GoyoTours",
    prompt: `Modern flat vector logo for a travel brand called "GoyoTours". Show a cute cartoon mascot of a smiling backpack with a tiny mountain peak sticking out of it, with two little legs walking. Beside the mascot, the wordmark "GoyoTours" in a friendly rounded sans-serif font, sunset orange color (#f97316). The mascot uses warm travel palette — orange backpack, brown straps, white mountain. PURE WHITE BACKGROUND with no shading, no gradient. Adventurous and cheerful feel. NO TEXT OTHER than "GoyoTours". Aspect ratio square 1:1.`,
  },
  {
    slug: "suprans",
    label: "Suprans",
    prompt: `Modern flat vector logo for an ecommerce wholesale brand called "Suprans". Show a friendly mascot of a stylized shopping bag character with a smiling face and tiny arms holding a small star. Beside the mascot, the wordmark "Suprans" in a bold modern sans-serif font, royal blue color (#3b82f6). The mascot uses blue and white tones with a yellow star. PURE WHITE BACKGROUND with no shading, no gradient. Premium and confident feel. NO TEXT OTHER than "Suprans". Aspect ratio square 1:1.`,
  },
  {
    slug: "usdrop-ai",
    label: "USDrop AI",
    prompt: `Modern flat vector logo for an AI dropshipping brand called "USDrop AI". Show a cute cartoon mascot of a delivery package box with a robot face — two glowing blue eyes and a small antenna on top. Beside the mascot, the wordmark "USDrop AI" in a futuristic geometric sans-serif font, hot pink color (#ec4899). The mascot uses pink, white, and a touch of cyan for the robot eyes. PURE WHITE BACKGROUND with no shading, no gradient. Tech-forward and fun feel. NO TEXT OTHER than "USDrop AI". Aspect ratio square 1:1.`,
  },
  {
    slug: "eazysell",
    label: "EazySell",
    prompt: `Modern flat vector logo for a sales platform called "EazySell". Show a cheerful mascot of a smiling cartoon thumbs-up hand wearing tiny round sunglasses, with little speed lines around it. Beside the mascot, the wordmark "EazySell" in a modern bold sans-serif font, teal color (#14b8a6). The mascot uses skin-tone for the hand and black sunglasses. PURE WHITE BACKGROUND with no shading, no gradient. Energetic and easy feel. NO TEXT OTHER than "EazySell". Aspect ratio square 1:1.`,
  },
  {
    slug: "teamsync-ai",
    label: "TeamSync AI",
    prompt: `Modern flat vector logo for an AI business operations platform called "TeamSync AI". Show a friendly mascot of a small purple octopus with a smile, each tentacle holding a different small icon (briefcase, clock, chart, gear, message bubble, lightbulb). Beside the mascot, the wordmark "TeamSync AI" in a bold modern sans-serif font, indigo violet color (#6366f1). The mascot is light purple with a darker outline. PURE WHITE BACKGROUND with no shading, no gradient. Multi-tasking and collaborative feel. NO TEXT OTHER than "TeamSync AI". Aspect ratio square 1:1.`,
  },
  {
    slug: "toysinbulk",
    label: "ToysInBulk",
    prompt: `Modern flat vector logo for a wholesale toys brand called "ToysInBulk". Show a fun mascot of a stack of three colorful building blocks (red, yellow, blue) with cartoon eyes and a smile on the top block. Beside the mascot, the wordmark "ToysInBulk" in a playful rounded sans-serif font, bright cherry red color (#ef4444). PURE WHITE BACKGROUND with no shading, no gradient. Playful and joyful feel. NO TEXT OTHER than "ToysInBulk". Aspect ratio square 1:1.`,
  },
]

/* ------------------------------------------------------------------ */
/*  Sleep helper to avoid hammering rate limits                        */
/* ------------------------------------------------------------------ */
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

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
