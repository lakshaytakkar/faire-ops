import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  )
}

// GET — fetch views for a date range
export async function GET(request: Request) {
  const url = new URL(request.url)
  const from = url.searchParams.get("from")
  const to = url.searchParams.get("to")
  const storeId = url.searchParams.get("store_id")

  let query = getSupabase()
    .from("store_daily_views")
    .select("*, faire_stores!inner(name, color)")
    .order("view_date", { ascending: true })

  if (from) query = query.gte("view_date", from)
  if (to) query = query.lte("view_date", to)
  if (storeId) query = query.eq("store_id", storeId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST — upsert views for a date + store
export async function POST(request: Request) {
  const body = await request.json()
  const { entries } = body as { entries: Array<{ store_id: string; view_date: string; view_count: number }> }

  if (!entries || entries.length === 0) {
    return NextResponse.json({ error: "entries array required" }, { status: 400 })
  }

  const { error } = await getSupabase()
    .from("store_daily_views")
    .upsert(
      entries.map(e => ({
        store_id: e.store_id,
        view_date: e.view_date,
        view_count: e.view_count,
      })),
      { onConflict: "store_id,view_date" }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, count: entries.length })
}
