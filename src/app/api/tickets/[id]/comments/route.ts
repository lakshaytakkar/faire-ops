import { NextResponse } from "next/server"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

function getSupabase(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  )
}

type CommentBody = {
  body: string
  author_name?: string | null
  author_user_id?: string | null
  is_internal?: boolean
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from("ticket_comments")
      .select("*")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, comments: data ?? [] })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = (await request.json()) as CommentBody

    if (!body.body || !body.body.trim()) {
      return NextResponse.json(
        { error: "Comment body is required" },
        { status: 400 }
      )
    }

    const supabase = getSupabase()
    const nowIso = new Date().toISOString()

    const { data: comment, error: insertError } = await supabase
      .from("ticket_comments")
      .insert({
        ticket_id: id,
        author_user_id: body.author_user_id ?? null,
        author_name: body.author_name ?? "System",
        body: body.body,
        is_internal: body.is_internal ?? false,
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
      ticket_id: id,
      actor_user_id: body.author_user_id ?? null,
      actor_name: body.author_name ?? "System",
      action: "commented",
      metadata: {
        comment_id: comment.id,
        is_internal: body.is_internal ?? false,
      },
    })

    // Update ticket.updated_at and first_responded_at if not set
    const { data: ticket } = await supabase
      .from("tickets")
      .select("first_responded_at")
      .eq("id", id)
      .single()

    const ticketUpdate: Record<string, unknown> = { updated_at: nowIso }
    if (ticket && !ticket.first_responded_at) {
      ticketUpdate.first_responded_at = nowIso
    }

    await supabase.from("tickets").update(ticketUpdate).eq("id", id)

    return NextResponse.json({ success: true, comment })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}
