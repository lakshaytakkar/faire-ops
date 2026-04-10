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

  const scores = [
    body.greeting_score,
    body.active_listening_score,
    body.product_knowledge_score,
    body.problem_resolution_score,
    body.closing_score,
    body.tone_professionalism_score,
  ].filter((s): s is number => typeof s === "number")

  // Each is 0-10, overall scaled to 0-100
  const overall_score = scores.length > 0
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10)
    : null

  const { data, error } = await supabase
    .from("call_qa_reviews")
    .insert({
      call_id: id,
      reviewer_user_id: body.reviewer_user_id ?? null,
      overall_score,
      greeting_score: body.greeting_score ?? null,
      active_listening_score: body.active_listening_score ?? null,
      product_knowledge_score: body.product_knowledge_score ?? null,
      problem_resolution_score: body.problem_resolution_score ?? null,
      closing_score: body.closing_score ?? null,
      tone_professionalism_score: body.tone_professionalism_score ?? null,
      passed: overall_score !== null ? overall_score >= 70 : null,
      feedback: body.feedback ?? null,
      coaching_notes: body.coaching_notes ?? null,
      follow_up_required: body.follow_up_required ?? false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, review: data })
}
