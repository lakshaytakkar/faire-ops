import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  )
}

export const maxDuration = 120

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const startedAt = new Date().toISOString()

  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"

    const res = await fetch(`${baseUrl}/api/wise/sync`, { method: "POST" })
    const result = await res.json()

    await getSupabase().from("automation_runs").insert({
      status: res.ok ? "success" : "failed",
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - new Date(startedAt).getTime(),
      result,
      triggered_by: "cron",
    })

    await getSupabase()
      .from("automations")
      .update({ last_run_at: new Date().toISOString(), last_status: res.ok ? "success" : "failed" })
      .eq("name", "Wise Banking Sync")

    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    await getSupabase().from("automation_runs").insert({
      status: "failed",
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - new Date(startedAt).getTime(),
      error_message: (err as Error).message,
      triggered_by: "cron",
    })
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
