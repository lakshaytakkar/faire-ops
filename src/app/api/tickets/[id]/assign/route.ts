import { NextResponse } from "next/server"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

function getSupabase(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  )
}

type AssignBody = {
  assignee_user_id?: string | null
  assignee_team?: string | null
  actor_name?: string | null
  actor_user_id?: string | null
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = (await request.json()) as AssignBody
    const supabase = getSupabase()

    // Fetch current assignee to decide "assigned" vs "reassigned"
    const { data: current, error: fetchError } = await supabase
      .from("tickets")
      .select("id, assignee_user_id, assignee_team")
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
      assignee_user_id: body.assignee_user_id ?? null,
      assignee_team: body.assignee_team ?? null,
      updated_at: nowIso,
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

    const action = current.assignee_user_id == null ? "assigned" : "reassigned"

    await supabase.from("ticket_activity").insert({
      ticket_id: id,
      actor_user_id: body.actor_user_id ?? null,
      actor_name: body.actor_name ?? "System",
      action,
      from_value: current.assignee_user_id ?? null,
      to_value: body.assignee_user_id ?? null,
      metadata: {
        from_team: current.assignee_team ?? null,
        to_team: body.assignee_team ?? null,
      },
    })

    return NextResponse.json({ success: true, ticket: updated })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}
