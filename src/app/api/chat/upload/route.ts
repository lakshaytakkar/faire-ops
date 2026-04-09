import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const BUCKET = "chat-attachments"
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ""
  return createClient(url, key)
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Max 10MB." },
        { status: 400 }
      )
    }

    const ext = file.name.split(".").pop() ?? "bin"
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const fileName = `chat/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safeName}`

    const supabase = getSupabase()
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error } = await supabase.storage.from(BUCKET).upload(fileName, buffer, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    })

    if (error) {
      console.error("Chat upload error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${fileName}`

    return NextResponse.json({
      url: publicUrl,
      path: fileName,
      name: file.name,
      size: file.size,
      type: file.type,
    })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}
