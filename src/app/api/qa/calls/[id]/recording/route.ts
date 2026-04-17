import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  )
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const supabase = getSupabase()

  const { data: call, error } = await supabase
    .from("calls")
    .select("recording_url, recording_storage_path")
    .eq("id", id)
    .single()

  if (error || !call) {
    return NextResponse.json({ error: "Call not found" }, { status: 404 })
  }

  // If we have a stored recording, generate signed URL
  if (call.recording_storage_path) {
    const { data: signed } = await supabase.storage
      .from("call-recordings")
      .createSignedUrl(call.recording_storage_path, 3600)
    if (signed?.signedUrl) {
      return NextResponse.json({ url: signed.signedUrl, source: "supabase" })
    }
  }

  // Fall back to direct remote URL (legacy data)
  if (call.recording_url) {
    return NextResponse.json({ url: call.recording_url, source: "remote" })
  }

  return NextResponse.json({ error: "No recording available" }, { status: 404 })
}
