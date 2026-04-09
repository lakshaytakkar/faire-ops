/**
 * Generate realistic Indian professional headshot photos for AI employees
 * using Gemini image generation.
 *
 * Usage:
 *   set -a && source .env.local && set +a && npx tsx scripts/generate-ai-headshots.ts
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
/*  Employee definitions                                               */
/* ------------------------------------------------------------------ */

interface EmployeeConfig {
  id: string
  name: string
  slug: string
  prompt: string
}

const EMPLOYEES: EmployeeConfig[] = [
  {
    id: "723844b5-6f5a-4200-890f-24b0b94b25dd",
    name: "Priya Sharma",
    slug: "priya-sharma",
    prompt:
      "Professional corporate headshot of a mid-30s Indian woman, confident and organized demeanor, warm smile, wearing business casual attire, neutral gray background, high quality portrait photography, realistic, not AI-looking, soft studio lighting, sharp focus on face",
  },
  {
    id: "66466b7f-e7e1-4fbf-a341-6ba8de724c8a",
    name: "Arjun Patel",
    slug: "arjun-patel",
    prompt:
      "Professional corporate headshot of a young Indian man in his late 20s, data-driven and confident expression, clean-shaven, wearing business casual attire, neutral gray background, high quality portrait photography, realistic, not AI-looking, soft studio lighting, sharp focus on face",
  },
  {
    id: "3392261a-78ee-4ede-92e5-e61959fc0a15",
    name: "Meera Reddy",
    slug: "meera-reddy",
    prompt:
      "Professional corporate headshot of a young Indian woman in her late 20s, creative and enthusiastic expression, bright friendly smile, wearing business casual attire, neutral gray background, high quality portrait photography, realistic, not AI-looking, soft studio lighting, sharp focus on face",
  },
  {
    id: "6d41ec5b-bdba-478d-bfa8-65a758ef127c",
    name: "Vikram Singh",
    slug: "vikram-singh",
    prompt:
      "Professional corporate headshot of a mid-30s Indian man, technical and precise demeanor, neatly groomed with short hair, wearing business casual attire, neutral gray background, high quality portrait photography, realistic, not AI-looking, soft studio lighting, sharp focus on face",
  },
  {
    id: "2b5c6c93-7993-4ce8-85d1-9ee2fca566ac",
    name: "Ananya Desai",
    slug: "ananya-desai",
    prompt:
      "Professional corporate headshot of a young Indian woman in her early 30s, empathetic and friendly expression, warm approachable smile, wearing business casual attire, neutral gray background, high quality portrait photography, realistic, not AI-looking, soft studio lighting, sharp focus on face",
  },
]

/* ------------------------------------------------------------------ */
/*  Generate & upload                                                  */
/* ------------------------------------------------------------------ */

async function generateHeadshot(employee: EmployeeConfig): Promise<string | null> {
  console.log(`\n--- ${employee.name} ---`)
  console.log(`  Prompt: ${employee.prompt.slice(0, 100)}...`)

  // Generate the image
  console.log("  Generating image...")
  const imageModel = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-image",
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    } as Record<string, unknown>,
  })

  const imageResult = await imageModel.generateContent(employee.prompt)

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
    console.error(`  No image generated for ${employee.name}`)
    return null
  }
  console.log(`  Image generated (${mimeType}, ${Math.round((base64Data.length * 0.75) / 1024)} KB)`)

  // Upload to Supabase Storage
  const buffer = Buffer.from(base64Data, "base64")
  const ext = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg"
  const fileName = `ai-employees/${employee.slug}.${ext}`

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

async function updateAvatarUrl(employeeId: string, avatarUrl: string) {
  const { error } = await supabase
    .from("ai_employees")
    .update({ avatar_url: avatarUrl })
    .eq("id", employeeId)

  if (error) {
    console.error(`  DB update error:`, error)
  } else {
    console.log(`  DB updated (avatar_url set)`)
  }
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

async function main() {
  console.log("=== AI Employee Headshot Generator ===")
  console.log(`Processing ${EMPLOYEES.length} employees...\n`)

  const results: { name: string; status: string; url: string | null }[] = []

  for (const employee of EMPLOYEES) {
    try {
      const avatarUrl = await generateHeadshot(employee)
      if (avatarUrl) {
        await updateAvatarUrl(employee.id, avatarUrl)
        results.push({ name: employee.name, status: "success", url: avatarUrl })
      } else {
        results.push({ name: employee.name, status: "no image generated", url: null })
      }
    } catch (err) {
      console.error(`  Error for ${employee.name}:`, err)
      results.push({ name: employee.name, status: "error", url: null })
    }
  }

  console.log("\n=== Results ===")
  for (const r of results) {
    console.log(`  ${r.name}: ${r.status}${r.url ? ` -> ${r.url}` : ""}`)
  }
}

main().catch(console.error)
