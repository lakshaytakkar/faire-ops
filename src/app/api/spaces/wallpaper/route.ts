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

const HERO_PROMPT = `A whimsical, hand-illustrated cartoon wallpaper for a modern business software homepage. Inspired by Google Doodles and editorial illustration.

Scene:
- Soft pastel sky in peach, lavender, and sky blue
- Fluffy cartoon clouds with simple curious faces drifting gently across the sky
- Pastel rolling hills at the bottom in mint green and butter yellow
- Tiny doodle plants and flowers dotting the hills
- A few small abstract shapes floating: a paper airplane, a tiny hot air balloon, a kite
- A whisper of a horizon line, optimistic and inviting
- Plenty of negative space in the upper-middle area for a centered title and card

Style:
- Whimsical hand-drawn doodle art with thick clean outlines
- Flat vibrant fill colors with subtle shading
- Friendly, playful, optimistic, premium-but-childlike charm
- Modern editorial illustration meets Google Doodle
- 16:9 wide cinematic format

Strict rules: no text, no logos, no people, no business objects, no UI elements. Purely a decorative scenic illustration.`

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
