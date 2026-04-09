import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  )
}

export const maxDuration = 300 // 5 min timeout for Vercel

export async function GET(request: Request) {
  // Verify Vercel cron secret
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const startedAt = new Date().toISOString()

  try {
    // Call the existing sync endpoint internally
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"

    const res = await fetch(`${baseUrl}/api/faire/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })

    const result = await res.json()

    // Log the run
    await getSupabase().from("automation_runs").insert({
      automation_id: null,
      status: res.ok ? "success" : "failed",
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - new Date(startedAt).getTime(),
      result: result,
      triggered_by: "cron",
    })

    await getSupabase()
      .from("automations")
      .update({ last_run_at: new Date().toISOString(), last_status: res.ok ? "success" : "failed" })
      .eq("name", "Faire Data Sync")

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
