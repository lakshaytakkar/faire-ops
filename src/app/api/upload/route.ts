import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ""
  return createClient(url, key)
}

/**
 * Generic file upload endpoint — uses the service-role key so that
 * Supabase storage RLS policies are bypassed.
 *
 * Form fields:
 *   file   – the file blob (required)
 *   bucket – storage bucket name (required)
 *   path   – destination path inside the bucket (required)
 *   upsert – "true" to overwrite (default "true")
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const bucket = formData.get("bucket") as string | null
    const path = formData.get("path") as string | null
    const upsert = (formData.get("upsert") as string) !== "false"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }
    if (!bucket || !path) {
      return NextResponse.json(
        { error: "bucket and path are required" },
        { status: 400 },
      )
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Max 10 MB." },
        { status: 400 },
      )
    }

    const supabase = getSupabase()
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
      cacheControl: "3600",
      upsert,
      contentType: file.type || undefined,
    })

    if (error) {
      console.error("Upload error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`

    return NextResponse.json({ url: publicUrl, path, bucket })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const bucket = searchParams.get("bucket")
    const path = searchParams.get("path")

    if (!bucket || !path) {
      return NextResponse.json(
        { error: "bucket and path are required" },
        { status: 400 },
      )
    }

    const supabase = getSupabase()
    const { error } = await supabase.storage.from(bucket).remove([path])

    if (error) {
      console.error("Delete error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    )
  }
}
