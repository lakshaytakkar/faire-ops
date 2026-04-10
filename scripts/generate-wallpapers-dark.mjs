/**
 * One-shot script: generates 10 dark/moody wallpapers (realistic + cartoon
 * + abstract mix) via Gemini and uploads each to the `nexus-assets` Supabase
 * Storage bucket. Run with:
 *
 *   node scripts/generate-wallpapers-dark.mjs
 */

import { readFileSync } from "fs"
import { createClient } from "@supabase/supabase-js"
import { GoogleGenerativeAI } from "@google/generative-ai"

const env = readFileSync(".env.local", "utf8")
  .split("\n")
  .reduce((a, l) => {
    const [k, ...v] = l.split("=")
    if (k && v.length) a[k.trim()] = v.join("=").trim()
    return a
  }, {})

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
)
const genAI = new GoogleGenerativeAI(env.NEXT_PUBLIC_GEMINI_API_KEY)

// Common composition rules — ensures white text overlaid on the center
// stays legible regardless of style.
const BASE_RULES = `
Composition rules (CRITICAL for contrast):
- Even tonal balance across the image — no blown highlights, no pitch-black masses
- Subtle visual interest in the center but mostly dim/uniform there so white
  text overlaid on top stays legible
- Plenty of depth and atmosphere
- Cinematic 16:9 wide format
- High quality, premium look

Strict rules: no text, no logos, no people, no business objects, no UI elements.
Pure decorative background art.
`

const WALLPAPERS = [
  {
    slug: "aurora-snowfield",
    name: "Aurora Snowfield",
    style: "REALISTIC photograph",
    prompt: `A realistic photograph of vivid green and violet aurora borealis swirling across a deep navy sky. Below: a pristine snow-covered field with subtle wind ripples, distant snowy mountains on the horizon, and a few sparse pine silhouettes. Soft blue moonlight on the snow. Premium nature photography style, ethereal and calm.`,
  },
  {
    slug: "city-skyline-dusk",
    name: "City at Dusk",
    style: "CARTOON illustration",
    prompt: `A whimsical cartoon city skyline at deep dusk. Tall building silhouettes in dark navy and charcoal, hundreds of tiny glowing window squares in warm amber. Soft purple and indigo gradient sky with a few stars and a small crescent moon. A few cartoon clouds drifting low. Hand-illustrated doodle art with clean thick outlines, dreamy and playful, optimistic despite the dark palette.`,
  },
  {
    slug: "deep-sea-bioluminescence",
    name: "Bioluminescent Deep",
    style: "REALISTIC digital painting",
    prompt: `A realistic digital painting of the deep ocean at night. Inky deep-blue water with shafts of faint moonlight piercing from the surface above. Dozens of glowing bioluminescent jellyfish drifting gracefully, each emitting soft cyan and violet light. A few glowing plankton sparkles. Mysterious, calm, premium fine-art quality.`,
  },
  {
    slug: "indigo-geometric",
    name: "Indigo Geometric",
    style: "ABSTRACT design",
    prompt: `A premium abstract geometric composition. Layered translucent shapes — circles, soft squares, gentle waves — in deep indigo, navy, midnight violet, and accents of warm gold and dusty rose. Soft gradients, subtle grain texture, geometric balance. Modern editorial design meets bauhaus minimalism. Calm and sophisticated.`,
  },
  {
    slug: "firefly-forest",
    name: "Firefly Forest",
    style: "CARTOON illustration",
    prompt: `A whimsical cartoon midnight forest scene. Tall stylized pine trees in deep teal and navy. Hundreds of glowing yellow-green fireflies floating gently between the trunks, casting soft warm light. A small clearing in the middle with a faint glowing mushroom or two. A pale blue moon visible through the canopy gap. Dreamy, magical, hand-illustrated doodle art with clean outlines.`,
  },
  {
    slug: "nebula-galaxy",
    name: "Nebula Galaxy",
    style: "REALISTIC space photo",
    prompt: `A realistic deep-space nebula photograph. Swirling clouds of cosmic gas in deep magenta, indigo, teal, and rose. Thousands of bright stars scattered throughout. A subtle bright core in the upper-middle area. Premium NASA/Hubble photography style, awe-inspiring and serene.`,
  },
  {
    slug: "moonlit-lake",
    name: "Moonlit Lake",
    style: "REALISTIC photograph",
    prompt: `A realistic photograph of a calm mountain lake at night. Mirror-still water reflecting a large soft full moon and silver clouds. Dark silhouetted pine forests on either shore. Distant mountain peaks at the back. A faint mist drifting on the water surface. Deep navy and silver palette, premium landscape photography, peaceful.`,
  },
  {
    slug: "synthwave-grid",
    name: "Synthwave Grid",
    style: "ABSTRACT retro",
    prompt: `An abstract synthwave horizon. Deep navy and dark violet sky with a soft sun-like circle in the upper-middle in faded coral and rose gradient. A subtle perspective grid in faint cyan stretching toward the horizon at the bottom. A few mountain silhouettes in dark indigo. Retro 80s sci-fi aesthetic, premium vector quality, calm and atmospheric (not flashy).`,
  },
  {
    slug: "volcano-glow",
    name: "Volcano Glow",
    style: "CARTOON illustration",
    prompt: `A whimsical cartoon volcano scene at night. A large stylized cone-shaped volcano in dark charcoal and navy with a gentle warm orange glow at the crater. A few soft cartoon embers and ash drifting upward. Deep starry sky in midnight blue with a tiny crescent moon. Rolling dark hills around the base. Hand-illustrated doodle art, friendly despite the subject matter, optimistic and dreamy.`,
  },
  {
    slug: "liquid-marble",
    name: "Liquid Marble",
    style: "ABSTRACT fluid",
    prompt: `An abstract liquid marble pattern. Swirling fluid shapes in deep navy, midnight black, charcoal, with veins of soft teal, dusty gold, and pearl white. Premium luxury marble texture, organic flowing curves, depth and dimension. Modern editorial design, calm and sophisticated, not chaotic.`,
  },
]

async function generateImage(prompt) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-image",
    generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
  })
  const result = await model.generateContent(prompt)
  const parts = result.response.candidates?.[0]?.content?.parts ?? []
  for (const p of parts) {
    if (p.inlineData) return { base64: p.inlineData.data, mime: p.inlineData.mimeType }
  }
  return null
}

async function uploadWallpaper(slug, base64, mime) {
  const buf = Buffer.from(base64, "base64")
  const path = `wallpaper-${slug}.png`
  const { error } = await supabase.storage
    .from("nexus-assets")
    .upload(path, buf, { contentType: mime, upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from("nexus-assets").getPublicUrl(path)
  return data.publicUrl
}

const results = []
for (const w of WALLPAPERS) {
  process.stdout.write(`[${w.slug}] ${w.style}... `)
  try {
    const fullPrompt = `${w.style} wallpaper for a premium business software homepage.\n\nScene: ${w.prompt}\n\n${BASE_RULES}`
    const img = await generateImage(fullPrompt)
    if (!img) {
      console.log("FAILED (no image)")
      results.push({ ...w, status: "fail" })
      continue
    }
    const url = await uploadWallpaper(w.slug, img.base64, img.mime)
    console.log("OK")
    results.push({ ...w, status: "ok", url })
  } catch (e) {
    console.log("FAILED:", e.message)
    results.push({ ...w, status: "fail", error: e.message })
  }
  await new Promise((r) => setTimeout(r, 1500))
}

console.log("\n=== Summary ===")
for (const r of results) {
  console.log(`${r.status === "ok" ? "✓" : "✗"} ${r.slug}${r.url ? " — " + r.url : ""}`)
}
console.log(`\n${results.filter((r) => r.status === "ok").length}/${results.length} succeeded`)
