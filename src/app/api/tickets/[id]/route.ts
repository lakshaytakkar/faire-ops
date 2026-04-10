import { NextResponse } from "next/server"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

function getSupabase(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  )
}

type PatchBody = {
  title?: string
  description?: string | null
  priority?: string
  assignee_user_id?: string | null
  due_at?: string | null
  tags?: string[]
  actor_user_id?: string | null
  actor_name?: string | null
}

const TRACKED_FIELDS: (keyof PatchBody)[] = [
  "title",
  "description",
  "priority",
  "assignee_user_id",
  "due_at",
  "tags",
]

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = (await request.json()) as PatchBody
    const supabase = getSupabase()

    // Fetch current ticket to compare before/after for activity logging
    const { data: current, error: fetchError } = await supabase
      .from("tickets")
      .select("id, title, description, priority, assignee_user_id, due_at, tags")
      .eq("id", id)
      .single()

    if (fetchError || !current) {
      return NextResponse.json(
        { error: fetchError?.message ?? "Ticket not found" },
        { status: 404 }
      )
    }

    // Build update payload with only provided fields
    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    for (const field of TRACKED_FIELDS) {
      if (field in body) {
        update[field] = body[field] ?? null
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from("tickets")
      .update(update)
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Log activity for each changed field
    const activityRows: Array<Record<string, unknown>> = []
    const actorName = body.actor_name ?? "System"
    const actorUserId = body.actor_user_id ?? null

    for (const field of TRACKED_FIELDS) {
      if (!(field in body)) continue
      const oldValue = (current as Record<string, unknown>)[field]
      const newValue = body[field] ?? null
      const oldSerialized = oldValue == null ? null : JSON.stringify(oldValue)
      const newSerialized = newValue == null ? null : JSON.stringify(newValue)
      if (oldSerialized === newSerialized) continue

      activityRows.push({
        ticket_id: id,
        actor_user_id: actorUserId,
        actor_name: actorName,
        action: `${field}_changed`,
        from_value:
          typeof oldValue === "string" ? oldValue : oldSerialized,
        to_value:
          typeof newValue === "string" ? newValue : newSerialized,
        metadata: { field },
      })
    }

    if (activityRows.length > 0) {
      await supabase.from("ticket_activity").insert(activityRows)
    }

    return NextResponse.json({ success: true, ticket: updated })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const supabase = getSupabase()

    const { error } = await supabase.from("tickets").delete().eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}
