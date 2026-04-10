import { NextResponse } from "next/server"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

function getSupabase(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  )
}

type StatusBody = {
  status: string
  actor_name?: string | null
  actor_user_id?: string | null
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = (await request.json()) as StatusBody

    if (!body.status) {
      return NextResponse.json(
        { error: "status is required" },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    // Fetch current status (and reopen_count, needed if reopening)
    const { data: current, error: fetchError } = await supabase
      .from("tickets")
      .select("id, status, reopen_count")
      .eq("id", id)
      .single()

    if (fetchError || !current) {
      return NextResponse.json(
        { error: fetchError?.message ?? "Ticket not found" },
        { status: 404 }
      )
    }

    const nowIso = new Date().toISOString()
    const update: Record<string, unknown> = {
      status: body.status,
      updated_at: nowIso,
    }

    if (body.status === "resolved") {
      update.resolved_at = nowIso
    } else if (body.status === "closed") {
      update.closed_at = nowIso
    } else if (body.status === "reopened") {
      update.reopened_at = nowIso
      update.reopen_count = (current.reopen_count ?? 0) + 1
      update.resolved_at = null
      update.closed_at = null
    }

    const { data: updated, error: updateError } = await supabase
      .from("tickets")
      .update(update)
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    // Log activity
    await supabase.from("ticket_activity").insert({
      ticket_id: id,
      actor_user_id: body.actor_user_id ?? null,
      actor_name: body.actor_name ?? "System",
      action: "status_changed",
      from_value: current.status,
      to_value: body.status,
    })

    return NextResponse.json({ success: true, ticket: updated })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}
