import { NextResponse } from "next/server"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

function getSupabase(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  )
}

type ReopenBody = {
  reason?: string | null
  actor_name?: string | null
  actor_user_id?: string | null
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = (await request.json()) as ReopenBody
    const supabase = getSupabase()

    // Fetch current reopen_count
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

    const { data: updated, error: updateError } = await supabase
      .from("tickets")
      .update({
        status: "reopened",
        reopened_at: nowIso,
        reopen_count: (current.reopen_count ?? 0) + 1,
        resolved_at: null,
        closed_at: null,
        updated_at: nowIso,
      })
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    await supabase.from("ticket_activity").insert({
      ticket_id: id,
      actor_user_id: body.actor_user_id ?? null,
      actor_name: body.actor_name ?? "System",
      action: "reopened",
      from_value: current.status,
      to_value: "reopened",
      metadata: {
        reason: body.reason ?? null,
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
