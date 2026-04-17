"use server"

import { revalidatePath } from "next/cache"
import { lifeAdmin, type ActionResult } from "./_client"

const MAX_AUDIO_BYTES = 15 * 1024 * 1024 // 15 MB ceiling — typical voice note is << 1 MB

/**
 * Single-hop voice capture — receives the audio blob as FormData, uploads
 * via service-role (bypasses storage RLS entirely), then inserts the
 * capture row. Browser never needs storage permissions.
 */
export async function uploadVoiceNote(formData: FormData): Promise<ActionResult> {
  try {
    const file = formData.get("audio")
    const durationRaw = formData.get("duration")
    const contentHint = formData.get("content") as string | null

    if (!(file instanceof File)) return { ok: false, error: "No audio file in request" }
    if (file.size === 0) return { ok: false, error: "Empty audio file" }
    if (file.size > MAX_AUDIO_BYTES) {
      return { ok: false, error: `Audio too large (${Math.round(file.size / 1024)} KB > ${MAX_AUDIO_BYTES / 1024 / 1024} MB)` }
    }
    const durationSecs = Math.max(0, Math.round(Number(durationRaw ?? 0)))

    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, "0")
    const dd = String(now.getDate()).padStart(2, "0")
    const uuid = crypto.randomUUID()
    const ext = file.type.includes("mp4") ? "mp4" : "webm"
    const path = `${yyyy}/${mm}/${dd}/${uuid}.${ext}`

    const admin = lifeAdmin()
    const { error: upErr } = await admin.storage
      .from("life-voice-notes")
      .upload(path, file, {
        contentType: file.type || "audio/webm",
        upsert: false,
      })
    if (upErr) return { ok: false, error: `Upload failed: ${upErr.message}` }

    const { data: row, error: insErr } = await admin
      .from("captures")
      .insert({
        kind: "voice",
        status: "inbox",
        source: "voice-recorder",
        audio_url: path,
        audio_duration_secs: durationSecs,
        captured_at: now.toISOString(),
        content: contentHint && contentHint.trim() ? contentHint.trim() : null,
      })
      .select("id")
      .maybeSingle()

    if (insErr) {
      // Try to clean up the orphaned file so the bucket doesn't bloat.
      await admin.storage.from("life-voice-notes").remove([path])
      return { ok: false, error: `DB insert failed: ${insErr.message}` }
    }

    revalidatePath("/life")
    revalidatePath("/life/inbox")
    return { ok: true, id: row?.id as string | undefined }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "uploadVoiceNote failed" }
  }
}

/**
 * Create a `life.captures` row for a quick text capture from the Today page.
 */
export async function createTextCapture(args: {
  content: string
  category?: string
}): Promise<ActionResult> {
  try {
    const trimmed = args.content.trim()
    if (!trimmed) return { ok: false, error: "Empty capture" }
    const { data, error } = await lifeAdmin()
      .from("captures")
      .insert({
        kind: "text",
        status: "inbox",
        source: "today-page",
        content: trimmed,
        category: args.category ?? null,
        captured_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle()
    if (error) return { ok: false, error: error.message }
    revalidatePath("/life")
    revalidatePath("/life/inbox")
    return { ok: true, id: data?.id as string | undefined }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "createTextCapture failed" }
  }
}
