/**
 * One-shot script: generates 10 themed wallpapers via Gemini and uploads
 * each to the `nexus-assets` Supabase Storage bucket. Run with:
 *
 *   node scripts/generate-wallpapers.mjs
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * NEXT_PUBLIC_GEMINI_API_KEY from .env.local.
 */

import { readFileSync } from "fs"
import { createClient } from "@supabase/supabase-js"
import { GoogleGenerativeAI } from "@google/generative-ai"

// --- Load .env.local --------------------------------------------------
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

// --- Wallpaper themes -------------------------------------------------
// Every prompt insists on:
//   - light/pastel CENTER area for text contrast
//   - hand-drawn cartoon style
//   - soft, optimistic, no text/people/logos
const BASE_RULES = `
Style: hand-illustrated cartoon, doodle art with thick clean outlines, flat
fill colors with subtle shading, pastel palette, optimistic, friendly,
premium-but-playful editorial illustration. Inspired by Google Doodles.

Composition rules (CRITICAL for contrast):
- The CENTER of the image must be LIGHT — soft pastel sky / open space — so
  dark text overlaid on top stays legible.
- NO heavy shadows or dark masses in the upper-middle area.
- Plenty of negative space.
- Cinematic 16:9 wide format.

Strict: no text, no logos, no people, no business objects, no UI elements.
Purely a decorative scenic illustration.
`

const WALLPAPERS = [
  {
    slug: "sunrise-hills",
    name: "Sunrise Hills",
    prompt: `A soft pastel sunrise over rolling green hills. Peach, cream, and butter-yellow sky. A single cartoon hot-air balloon drifts gently on the right side. A small cottage on the distant hills. Tiny doodle flowers and grass tufts in the foreground.`,
  },
  {
    slug: "magical-forest",
    name: "Magical Forest",
    prompt: `A whimsical pastel forest scene. Soft mint and sage trees with rounded canopies, glowing mushrooms with cheerful faces at the base. A winding path through the middle. Pastel pink and lavender sky peeking through the canopy at the top center. Friendly fireflies floating around.`,
  },
  {
    slug: "underwater-reef",
    name: "Coral Reef",
    prompt: `A cheerful pastel underwater reef. Soft coral pink and mint coral shapes, friendly cartoon fish with simple smiling faces, gentle bubbles rising. The top area is light pastel-blue water surface with sunlight beams streaming down. Cute starfish and sea urchins on the sandy bottom.`,
  },
  {
    slug: "cherry-blossom",
    name: "Cherry Blossom Park",
    prompt: `A pastel cherry blossom park scene. Soft pink and white blossoming trees on either side, a winding stone path through the middle. Distant rolling hills and a pale blue sky with a few wispy clouds in the center. Tiny flower petals drifting in the air. Calm, dreamy, optimistic.`,
  },
  {
    slug: "desert-oasis",
    name: "Desert Oasis",
    prompt: `A pastel desert oasis scene. Warm sand-colored ground, friendly cartoon cacti with simple faces, a few palm trees with rounded leaves. Soft peach and lavender sky in the upper area. A small reflective pond on the right. Distant mesas in the background.`,
  },
  {
    slug: "floating-islands",
    name: "Sky Islands",
    prompt: `Pastel floating sky islands. Three or four small grassy islands hovering in a soft pastel sky (peach, lavender, sky blue). Each island has a tiny cartoon tree or cottage. Gentle waterfalls falling from the islands into clouds. A faint rainbow arcing across the right side. Dreamy and optimistic.`,
  },
  {
    slug: "cozy-village",
    name: "Cozy Village",
    prompt: `A pastel cartoon village on rolling hills. Six or seven small cottages with steeply pitched roofs in soft pink, mint, and butter-yellow. Tiny chimneys puffing soft cartoon smoke. Small trees and flowers around them. Pale pastel sky with a few cheerful clouds in the upper center.`,
  },
  {
    slug: "spring-meadow",
    name: "Spring Meadow",
    prompt: `A pastel spring meadow scene. Soft mint-green grass, scattered wildflowers in pink, yellow, and lavender. A few cartoon butterflies and bumblebees. Distant pastel mountains in the background. Open, light pastel sky in the top half. Whimsical and optimistic.`,
  },
  {
    slug: "autumn-grove",
    name: "Autumn Grove",
    prompt: `A soft autumn grove with pastel orange, peach, and rose-colored trees. Falling cartoon leaves drifting through the air. A winding path through the middle. Distant rolling hills in soft sage. Pale cream sky in the upper middle. Cozy, inviting, gentle.`,
  },
  {
    slug: "snowy-cabin",
    name: "Snowy Cabin",
    prompt: `A pastel winter scene with a small cartoon log cabin nestled at the base of soft pastel-blue mountains. Gentle snow drifts in the foreground, a few rounded pine trees with soft snow caps. Pale blue and lavender sky in the upper area with a few large fluffy snowflakes. Cozy chimney smoke rising. Calm and optimistic, never gloomy.`,
  },
]

// --- Helpers ----------------------------------------------------------
async function generateImage(prompt) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-image",
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    },
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

// --- Main loop --------------------------------------------------------
const results = []
for (const w of WALLPAPERS) {
  process.stdout.write(`[${w.slug}] generating... `)
  try {
    const img = await generateImage(BASE_RULES + "\n\nScene: " + w.prompt)
    if (!img) {
      console.log("FAILED (no image returned)")
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
  // Tiny delay between generations to be polite to the API
  await new Promise((r) => setTimeout(r, 1500))
}

console.log("\n=== Summary ===")
for (const r of results) {
  console.log(`${r.status === "ok" ? "✓" : "✗"} ${r.slug}${r.url ? " — " + r.url : ""}`)
}
console.log(`\n${results.filter((r) => r.status === "ok").length}/${results.length} succeeded`)
