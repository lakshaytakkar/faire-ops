/**
 * Generate AI logos for Faire stores that are missing them.
 *
 * Usage:
 *   set -a && source .env.local && set +a && npx tsx scripts/generate-store-logos.ts
 */

import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient } from "@supabase/supabase-js"

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

const GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? ""
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""

if (!GEMINI_KEY) throw new Error("Missing NEXT_PUBLIC_GEMINI_API_KEY")
if (!SUPABASE_URL) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL")
if (!SUPABASE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY")

const genAI = new GoogleGenerativeAI(GEMINI_KEY)
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

/* ------------------------------------------------------------------ */
/*  Stores to process                                                  */
/* ------------------------------------------------------------------ */

interface StoreConfig {
  id: string
  name: string
  slug: string
  logoType: string
  colorScheme: string
  style: string
  notes: string
}

const STORES: StoreConfig[] = [
  {
    id: "3455f2c4-0ab5-4820-9224-807464e853ef",
    name: "Gullee Gadgets",
    slug: "gullee-gadgets",
    logoType: "icon-text",
    colorScheme: "Electric blue (#2563EB) with silver/gray metallic accents",
    style: "Modern tech",
    notes: "Gadgets and electronics wholesale brand. Use a circuit-board motif, gear, or stylized letter G. Clean, techy, innovative feel.",
  },
  {
    id: "1327aad7-0e46-4434-8dec-74d39b239eda",
    name: "Holiday Farm",
    slug: "holiday-farm",
    logoType: "emblem",
    colorScheme: "Warm red (#DC2626) and forest green (#16A34A) with cream accents",
    style: "Rustic festive",
    notes: "Holiday and seasonal products brand. Incorporate a barn or farmhouse silhouette with seasonal elements like snowflakes or leaves. Cozy, inviting, family-friendly feel.",
  },
  {
    id: "801db3da-7685-4010-bb53-63b4e7819674",
    name: "JSBlueRidge Toys",
    slug: "jsblueridge-toys",
    logoType: "badge",
    colorScheme: "Mountain blue (#1D4ED8) with sky blue (#38BDF8) and earthy brown accents",
    style: "Playful outdoor",
    notes: "Toys brand with Blue Ridge mountain heritage. Use mountain silhouette with playful toy elements like building blocks or a teddy bear. Fun yet trustworthy feel.",
  },
]

/* ------------------------------------------------------------------ */
/*  Generate & upload                                                  */
/* ------------------------------------------------------------------ */

async function generateLogo(config: StoreConfig): Promise<string | null> {
  console.log(`\n--- ${config.name} ---`)

  // Step 1: Generate optimized prompt via text model
  console.log("  Generating image prompt...")
  const promptModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
  const promptResult = await promptModel.generateContent(
    `Create a concise image generation prompt for a brand logo.
Brand: ${config.name}
Type: ${config.logoType} logo
Colors: ${config.colorScheme}
Style: ${config.style}
Notes: ${config.notes}

Requirements: Square format, clean background, scalable, professional wholesale brand. Return ONLY the prompt in 2-3 sentences.`
  )
  const imagePrompt = promptResult.response.text()
  console.log(`  Prompt: ${imagePrompt.slice(0, 120)}...`)

  // Step 2: Generate the actual image
  console.log("  Generating image...")
  const imageModel = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-image",
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    } as Record<string, unknown>,
  })

  const imageResult = await imageModel.generateContent(
    `Generate a professional brand logo: ${imagePrompt}. The logo should be on a clean white background, square format, high quality, suitable for a wholesale marketplace.`
  )

  const parts = imageResult.response.candidates?.[0]?.content?.parts ?? []
  let base64Data: string | null = null
  let mimeType = "image/png"

  for (const part of parts as Array<Record<string, unknown>>) {
    if (part.inlineData) {
      const inline = part.inlineData as { data: string; mimeType: string }
      base64Data = inline.data
      mimeType = inline.mimeType || "image/png"
      break
    }
  }

  if (!base64Data) {
    console.error(`  No image generated for ${config.name}`)
    return null
  }
  console.log(`  Image generated (${mimeType}, ${Math.round(base64Data.length * 0.75 / 1024)} KB)`)

  // Step 3: Upload to Supabase Storage
  const buffer = Buffer.from(base64Data, "base64")
  const ext = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg"
  const fileName = `stores/logos/${config.slug}.${ext}`

  console.log(`  Uploading to images/${fileName}...`)
  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(fileName, buffer, {
      contentType: mimeType,
      cacheControl: "3600",
      upsert: true,
    })

  if (uploadError) {
    console.error(`  Upload error:`, uploadError)
    return null
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/images/${fileName}`
  console.log(`  Uploaded: ${publicUrl}`)
  return publicUrl
}

async function updateStoreLogoUrl(storeId: string, logoUrl: string) {
  const { error } = await supabase
    .from("faire_stores")
    .update({ logo_url: logoUrl })
    .eq("id", storeId)

  if (error) {
    console.error(`  DB update error:`, error)
  } else {
    console.log(`  DB updated (logo_url set)`)
  }
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

async function main() {
  console.log("=== Faire Store Logo Generator ===")
  console.log(`Processing ${STORES.length} stores...\n`)

  const results: { name: string; status: string; url: string | null }[] = []

  for (const store of STORES) {
    try {
      const logoUrl = await generateLogo(store)
      if (logoUrl) {
        await updateStoreLogoUrl(store.id, logoUrl)
        results.push({ name: store.name, status: "success", url: logoUrl })
      } else {
        results.push({ name: store.name, status: "no image generated", url: null })
      }
    } catch (err) {
      console.error(`  Error for ${store.name}:`, err)
      results.push({ name: store.name, status: "error", url: null })
    }
  }

  console.log("\n=== Results ===")
  for (const r of results) {
    console.log(`  ${r.name}: ${r.status}${r.url ? ` -> ${r.url}` : ""}`)
  }
}

main().catch(console.error)
