import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  )
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = getSupabase()

    // Compute due_at from category SLA if provided
    let due_at: string | null = null
    if (body.category_id) {
      const { data: cat } = await supabase
        .from("ticket_categories")
        .select("default_sla_hours")
        .eq("id", body.category_id)
        .single()
      if (cat?.default_sla_hours) {
        due_at = new Date(Date.now() + cat.default_sla_hours * 3600 * 1000).toISOString()
      }
    }

    const { data, error } = await supabase
      .from("tickets")
      .insert({
        title: body.title,
        description: body.description ?? null,
        source: body.source,
        category_id: body.category_id ?? null,
        priority: body.priority ?? "medium",
        status: "open",
        reporter_user_id: body.reporter_user_id ?? null,
        reporter_name: body.reporter_name ?? null,
        reporter_email: body.reporter_email ?? null,
        reporter_phone: body.reporter_phone ?? null,
        assignee_user_id: body.assignee_user_id ?? null,
        assignee_team: body.assignee_team ?? null,
        retailer_id: body.retailer_id ?? null,
        retailer_name: body.retailer_name ?? null,
        related_order_id: body.related_order_id ?? null,
        related_product_id: body.related_product_id ?? null,
        related_task_id: body.related_task_id ?? null,
        due_at,
        tags: body.tags ?? [],
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Log activity
    await supabase.from("ticket_activity").insert({
      ticket_id: data.id,
      actor_name: body.reporter_name ?? "System",
      action: "created",
      to_value: "open",
    })

    return NextResponse.json({ success: true, ticket: data })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
