import { NextResponse } from "next/server"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

function getSupabase(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  )
}

type ResolveBody = {
  resolution_type?: string | null
  resolution_summary?: string | null
  actor_name?: string | null
  actor_user_id?: string | null
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = (await request.json()) as ResolveBody
    const supabase = getSupabase()

    const nowIso = new Date().toISOString()

    const { data: updated, error: updateError } = await supabase
      .from("tickets")
      .update({
        status: "resolved",
        resolved_at: nowIso,
        resolution_type: body.resolution_type ?? null,
        resolution_summary: body.resolution_summary ?? null,
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
      action: "resolved",
      to_value: "resolved",
      metadata: {
        resolution_type: body.resolution_type ?? null,
        resolution_summary: body.resolution_summary ?? null,
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
