import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { generateImage, generateLogoPrompt } from "@/lib/gemini"

// We import from gemini.ts not faire-api — let me use direct imports
const { GoogleGenerativeAI } = require("@google/generative-ai")

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
)

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? ""

const STORE_LOGO_CONFIGS = [
  {
    name: "Buddha Ayurveda",
    logoType: "emblem",
    colorScheme: "Deep red (#EF4444) with gold accents, warm earthy tones",
    style: "Handcrafted",
    notes: "Home decor and wellness brand. Include a lotus or bodhi tree motif. Elegant and spiritual feel.",
  },
  {
    name: "Buddha Yoga",
    logoType: "icon-text",
    colorScheme: "Calming blue (#3B82F6) with white, serene palette",
    style: "Minimal",
    notes: "Yoga and wellness brand. Use a meditation figure or yoga pose silhouette. Clean and peaceful.",
  },
  {
    name: "Super Santa",
    logoType: "mascot",
    colorScheme: "Festive green (#10B981) with red and white holiday colors",
    style: "Playful",
    notes: "Holiday and party supplies brand. Fun, festive Santa character or holiday motif. Kid-friendly and cheerful.",
  },
  {
    name: "Toyarina",
    logoType: "badge",
    colorScheme: "Vibrant purple (#8B5CF6) with bright accents, playful palette",
    style: "Playful",
    notes: "Toys and games brand. Use toy-related imagery like blocks, stars, or a toy box. Fun and energetic.",
  },
]

async function generateAndUploadLogo(
  storeName: string,
  config: (typeof STORE_LOGO_CONFIGS)[0]
): Promise<string | null> {
  try {
    if (!API_KEY) return null

    const genAI = new GoogleGenerativeAI(API_KEY)

    // Step 1: Generate optimized prompt
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

    // Step 2: Generate the actual image
    const imageModel = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-image",
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    })

    const imageResult = await imageModel.generateContent(
      `Generate a professional brand logo: ${imagePrompt}. The logo should be on a clean white background, square format, high quality, suitable for a wholesale marketplace.`
    )

    const parts = imageResult.response.candidates?.[0]?.content?.parts ?? []
    let base64Data: string | null = null
    let mimeType = "image/png"

    for (const part of parts) {
      if (part.inlineData) {
        base64Data = part.inlineData.data
        mimeType = part.inlineData.mimeType || "image/png"
        break
      }
    }

    if (!base64Data) {
      console.log(`No image generated for ${storeName}, prompt was: ${imagePrompt}`)
      return null
    }

    // Step 3: Convert base64 to blob and upload
    const buffer = Buffer.from(base64Data, "base64")
    const ext = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg"
    const fileName = `stores/logos/${storeName.toLowerCase().replace(/\s+/g, "-")}_${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(fileName, buffer, {
        contentType: mimeType,
        cacheControl: "3600",
        upsert: true,
      })

    if (uploadError) {
      console.error(`Upload error for ${storeName}:`, uploadError)
      return null
    }

    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/${fileName}`
    return publicUrl
  } catch (err) {
    console.error(`Logo generation failed for ${storeName}:`, err)
    return null
  }
}

export async function POST() {
  try {
    const { data: stores } = await supabase
      .from("faire_stores")
      .select("id, name, short, color, category")
      .eq("active", true)
      .order("name")

    if (!stores?.length) {
      return NextResponse.json({ error: "No stores found" }, { status: 400 })
    }

    const results = []

    for (let i = 0; i < stores.length; i++) {
      const store = stores[i]
      const config = STORE_LOGO_CONFIGS[i] ?? STORE_LOGO_CONFIGS[0]

      console.log(`Generating logo for ${store.name}...`)
      const logoUrl = await generateAndUploadLogo(store.name, {
        ...config,
        name: store.name,
      })

      if (logoUrl) {
        await supabase
          .from("faire_stores")
          .update({ logo_url: logoUrl })
          .eq("id", store.id)

        // Also save as store asset
        await supabase.from("store_assets").insert({
          store_id: store.id,
          asset_type: "logo",
          storage_path: logoUrl.split("/images/")[1] ?? "",
          public_url: logoUrl,
          file_name: `${store.name} Logo`,
          description: `Generated ${config.logoType} logo`,
        })

        results.push({ store: store.name, status: "success", url: logoUrl })
      } else {
        results.push({ store: store.name, status: "failed", url: null })
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
