import { NextResponse } from "next/server"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const BUCKET = "ticket-attachments"

function getSupabase(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  )
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_")
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ticketId } = await context.params
    const formData = await request.formData()

    const file = formData.get("file")
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "file is required" },
        { status: 400 }
      )
    }

    const commentIdRaw = formData.get("comment_id")
    const commentId =
      typeof commentIdRaw === "string" && commentIdRaw.length > 0
        ? commentIdRaw
        : null

    const uploadedByRaw = formData.get("uploaded_by_user_id")
    const uploadedByUserId =
      typeof uploadedByRaw === "string" && uploadedByRaw.length > 0
        ? uploadedByRaw
        : null

    const actorNameRaw = formData.get("actor_name")
    const actorName =
      typeof actorNameRaw === "string" && actorNameRaw.length > 0
        ? actorNameRaw
        : "System"

    const supabase = getSupabase()
    const timestamp = Date.now()
    const safeName = sanitizeFilename(file.name)
    const storagePath = `tickets/${ticketId}/${timestamp}_${safeName}`

    const arrayBuffer = await file.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, bytes, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      )
    }

    const { data: attachment, error: insertError } = await supabase
      .from("ticket_attachments")
      .insert({
        ticket_id: ticketId,
        comment_id: commentId,
        filename: file.name,
        storage_path: storagePath,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
        uploaded_by_user_id: uploadedByUserId,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      )
    }

    // Log activity
    await supabase.from("ticket_activity").insert({
      ticket_id: ticketId,
      actor_user_id: uploadedByUserId,
      actor_name: actorName,
      action: "attachment_added",
      metadata: {
        attachment_id: attachment.id,
        filename: file.name,
        storage_path: storagePath,
        size_bytes: file.size,
        mime_type: file.type || "application/octet-stream",
        comment_id: commentId,
      },
    })

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(storagePath)

    return NextResponse.json({
      success: true,
      attachment,
      public_url: publicUrlData.publicUrl,
    })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}
