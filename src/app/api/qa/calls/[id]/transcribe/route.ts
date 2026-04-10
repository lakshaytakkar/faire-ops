import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { transcribeCallAudio } from "@/lib/gemini"

export const maxDuration = 300

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  )
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const supabase = getSupabase()

  // Get the call + check recording
  const { data: call, error: callErr } = await supabase
    .from("calls")
    .select("id, recording_url, recording_storage_path")
    .eq("id", id)
    .single()

  if (callErr || !call) {
    return NextResponse.json({ error: "Call not found" }, { status: 404 })
  }
  if (!call.recording_url && !call.recording_storage_path) {
    return NextResponse.json({ error: "No recording available for this call" }, { status: 400 })
  }

  // Mark transcription as processing
  await supabase
    .from("call_transcriptions")
    .upsert({
      call_id: call.id,
      transcript_status: "processing",
      transcript_started_at: new Date().toISOString(),
    }, { onConflict: "call_id" })

  try {
    // Fetch audio bytes
    let audioUrl = call.recording_url ?? ""
    if (call.recording_storage_path) {
      const { data: signed } = await supabase.storage
        .from("call-recordings")
        .createSignedUrl(call.recording_storage_path, 600)
      if (signed?.signedUrl) audioUrl = signed.signedUrl
    }

    const audioRes = await fetch(audioUrl)
    if (!audioRes.ok) throw new Error(`Failed to fetch audio: ${audioRes.status}`)
    const buffer = Buffer.from(await audioRes.arrayBuffer())
    const base64 = buffer.toString("base64")

    // Detect mime type from URL extension
    const ext = audioUrl.split(".").pop()?.toLowerCase().split("?")[0] ?? "mp3"
    const mimeMap: Record<string, string> = {
      mp3: "audio/mpeg",
      wav: "audio/wav",
      ogg: "audio/ogg",
      m4a: "audio/mp4",
      aac: "audio/aac",
    }
    const mimeType = mimeMap[ext] ?? "audio/mpeg"

    // Call Gemini
    const result = await transcribeCallAudio(base64, mimeType)

    // Save result
    await supabase
      .from("call_transcriptions")
      .update({
        transcript_text: result.transcript,
        transcript_status: "done",
        transcript_completed_at: new Date().toISOString(),
        ai_summary: result.summary,
        ai_key_points: result.key_points,
        ai_sentiment: result.sentiment,
        ai_topics: result.topics,
        ai_flag_severity: result.flag_severity,
        ai_flag_reasons: result.flag_reasons,
        ai_quality_score: result.quality_score,
        ai_action_items: result.action_items,
      })
      .eq("call_id", call.id)

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    const message = (error as Error).message
    await supabase
      .from("call_transcriptions")
      .update({
        transcript_status: "failed",
        transcript_error: message,
        transcript_completed_at: new Date().toISOString(),
      })
      .eq("call_id", call.id)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
