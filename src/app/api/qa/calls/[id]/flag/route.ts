import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  )
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const body = await request.json()
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from("call_flags")
    .insert({
      call_id: id,
      flag_type: body.flag_type ?? "quality",
      severity: body.severity ?? "medium",
      description: body.description ?? null,
      flagged_by_user_id: body.flagged_by_user_id ?? null,
      status: "open",
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, flag: data })
}
