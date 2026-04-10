import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { generateImage } from "@/lib/gemini"

const BUCKET = "nexus-assets"
const PATH = "homepage-hero.png"

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ""
  return createClient(url, key)
}

async function ensureBucket(supabase: ReturnType<typeof getSupabase>) {
  const { error } = await supabase.storage.createBucket(BUCKET, { public: true })
  if (error && !error.message.includes("already exists")) {
    console.error("[wallpaper] bucket create error:", error)
  }
}

const HERO_PROMPT = `An ultra-premium, light-themed abstract wallpaper for a high-end business software homepage.

Composition:
- Soft dreamy gradient mesh in pastel blue (#dbeafe), lavender (#ede9fe), and warm cream (#fff7ed)
- Large blurred glass-morphism shapes floating gently across the canvas — translucent rounded squares and soft circles
- Subtle bokeh light particles
- Elegant negative space, calm, inviting
- High-key lighting, no harsh shadows
- Faint geometric grid hint at the bottom for a tech feel
- 16:9 ultrawide aspect, cinematic depth of field

Style: minimal, premium fintech aesthetic, soft, optimistic, professional. Like the cover of a modern SaaS marketing page. Light, airy, never dark or heavy.

No text, no logos, no people, no objects — purely abstract.`

/**
 * Generates the homepage hero wallpaper using Gemini and uploads it to
 * Supabase Storage. POST forces re-generation; GET returns the existing
 * public URL (and lazily generates if missing).
 */
async function generateAndUpload(): Promise<string | null> {
  const supabase = getSupabase()
  await ensureBucket(supabase)

  const result = await generateImage(HERO_PROMPT)
  if (!result) {
    console.error("[wallpaper] Gemini returned null")
    return null
  }

  const buffer = Buffer.from(result.base64, "base64")
  const { error } = await supabase.storage.from(BUCKET).upload(PATH, buffer, {
    contentType: result.mimeType,
    upsert: true,
  })
  if (error) {
    console.error("[wallpaper] upload error:", error)
    return null
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(PATH)
  return data.publicUrl
}

export async function POST() {
  try {
    const url = await generateAndUpload()
    if (!url) {
      return NextResponse.json(
        { error: "Failed to generate wallpaper" },
        { status: 500 }
      )
    }
    return NextResponse.json({ success: true, url })
  } catch (err) {
    console.error("[wallpaper] error:", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = getSupabase()
    await ensureBucket(supabase)
    // Check if it already exists
    const { data: list } = await supabase.storage
      .from(BUCKET)
      .list("", { search: PATH })
    const exists = (list ?? []).some((f) => f.name === PATH)
    if (exists) {
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(PATH)
      return NextResponse.json({ success: true, url: data.publicUrl, cached: true })
    }
    const url = await generateAndUpload()
    if (!url) {
      return NextResponse.json(
        { error: "Failed to generate wallpaper" },
        { status: 500 }
      )
    }
    return NextResponse.json({ success: true, url, cached: false })
  } catch (err) {
    console.error("[wallpaper] GET error:", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
