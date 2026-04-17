import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import sharp from "sharp"
import { IMAGE_SLOTS } from "@/lib/landing-image-slots"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""

const BUCKET = "suprans-landing-images"
const MAX_BYTES = 25 * 1024 * 1024 // 25 MB hard cap on the upload before resize

/**
 * POST /api/team/upload-image
 * multipart/form-data:
 *   - slot: string (one of IMAGE_SLOTS[].key)
 *   - file: image/jpeg | image/png | image/webp
 *
 * Resizes via sharp to the slot's target dimensions (cover, center) and
 * uploads to Supabase Storage at <slot>. Returns the public URL.
 */
export async function POST(req: NextRequest) {
  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json(
      { error: "Server is missing Supabase credentials. Check SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 },
    )
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: "Could not parse upload." }, { status: 400 })
  }

  const slotKey = String(form.get("slot") ?? "")
  const file = form.get("file")

  if (!slotKey) {
    return NextResponse.json({ error: "Missing slot." }, { status: 400 })
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 25 MB.` },
      { status: 413 },
    )
  }

  const slot = IMAGE_SLOTS.find((s) => s.key === slotKey)
  if (!slot) {
    return NextResponse.json({ error: `Unknown slot ${slotKey}.` }, { status: 400 })
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer())

  let outputBuffer: Buffer
  let contentType: string
  try {
    const pipeline = sharp(inputBuffer).resize(slot.width, slot.height, {
      fit: "cover",
      position: "center",
    })
    if (slot.format === "jpg") {
      outputBuffer = await pipeline.jpeg({ quality: 88, mozjpeg: true }).toBuffer()
      contentType = "image/jpeg"
    } else {
      outputBuffer = await pipeline.png({ compressionLevel: 9 }).toBuffer()
      contentType = "image/png"
    }
  } catch (e: any) {
    return NextResponse.json(
      { error: `Could not process image: ${e?.message ?? "unknown"}` },
      { status: 400 },
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(slot.key, outputBuffer, {
      contentType,
      upsert: true,
      cacheControl: "60",
    })

  if (uploadErr) {
    return NextResponse.json(
      { error: `Upload failed: ${uploadErr.message}` },
      { status: 500 },
    )
  }

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${slot.key}?t=${Date.now()}`
  return NextResponse.json({
    ok: true,
    slot: slot.key,
    bytes: outputBuffer.length,
    width: slot.width,
    height: slot.height,
    url: publicUrl,
  })
}
