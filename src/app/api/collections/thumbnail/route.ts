import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { generateImage, generateCollectionThumbnailPrompt } from "@/lib/gemini"
import { supabaseB2B } from "@/lib/supabase"

const BUCKET = "collection-thumbnails"

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  return createClient(url, key)
}

function backgroundForType(collectionType: string): string {
  const map: Record<string, string> = {
    category: "soft white",
    price_range: "gradient blue",
    curated: "warm gold",
    seasonal: "nature green",
    bestseller: "premium dark",
  }
  return map[collectionType] ?? "soft white"
}

async function ensureBucket(supabase: ReturnType<typeof getSupabase>) {
  const { error } = await supabase.storage.createBucket(BUCKET, { public: true })
  if (error && !error.message.includes("already exists")) {
    console.error("Bucket creation error:", error)
  }
}

async function generateAndUploadThumbnail(
  supabase: ReturnType<typeof getSupabase>,
  collectionId: string,
  name: string,
  collectionType: string
): Promise<string | null> {
  const prompt = await generateCollectionThumbnailPrompt({
    title: name,
    background: backgroundForType(collectionType),
    subject: name + " products",
    includeText: false,
    style: "modern minimalist",
  })

  const imageResult = await generateImage(prompt)
  if (!imageResult) return null

  const buffer = Buffer.from(imageResult.base64, "base64")
  const path = `${collectionId}.png`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: imageResult.mimeType,
      upsert: true,
    })

  if (uploadError) {
    console.error("Upload error:", uploadError)
    return null
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return urlData.publicUrl
}

export async function POST(request: Request) {
  try {
    const { collection_id, name, collection_type } = await request.json()

    if (!collection_id || !name || !collection_type) {
      return NextResponse.json(
        { error: "Missing required fields: collection_id, name, collection_type" },
        { status: 400 }
      )
    }

    const supabase = getSupabase()
    await ensureBucket(supabase)

    const publicUrl = await generateAndUploadThumbnail(
      supabase,
      collection_id,
      name,
      collection_type
    )

    if (!publicUrl) {
      return NextResponse.json(
        { error: "Failed to generate thumbnail image" },
        { status: 500 }
      )
    }

    const { error: updateError } = await supabaseB2B
      .from("collections")
      .update({ thumbnail_url: publicUrl })
      .eq("id", collection_id)

    if (updateError) {
      console.error("DB update error:", updateError)
      return NextResponse.json(
        { error: "Failed to update collection thumbnail_url" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, thumbnail_url: publicUrl })
  } catch (error) {
    console.error("Thumbnail generation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const supabase = getSupabase()
    await ensureBucket(supabase)

    const { data: collections, error: fetchError } = await supabaseB2B
      .from("collections")
      .select("id, name, collection_type")
      .is("thumbnail_url", null)

    if (fetchError) {
      console.error("Fetch error:", fetchError)
      return NextResponse.json(
        { error: "Failed to fetch collections" },
        { status: 500 }
      )
    }

    if (!collections || collections.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No collections without thumbnails found",
        generated: 0,
        total: 0,
      })
    }

    let generated = 0
    const errors: string[] = []

    for (const collection of collections) {
      try {
        const publicUrl = await generateAndUploadThumbnail(
          supabase,
          collection.id,
          collection.name,
          collection.collection_type
        )

        if (publicUrl) {
          const { error: updateError } = await supabaseB2B
            .from("collections")
            .update({ thumbnail_url: publicUrl })
            .eq("id", collection.id)

          if (updateError) {
            errors.push(`Failed to update ${collection.id}: ${updateError.message}`)
          } else {
            generated++
          }
        } else {
          errors.push(`Failed to generate image for ${collection.id}`)
        }
      } catch (err) {
        errors.push(`Error processing ${collection.id}: ${err}`)
      }

      // Small delay between generations to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    return NextResponse.json({
      success: true,
      generated,
      total: collections.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("Bulk thumbnail generation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
