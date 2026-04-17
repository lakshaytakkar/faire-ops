import "server-only"
import { lifeAdmin } from "../_actions/_client"

/**
 * Non-action server helper. Safe to call from server components during
 * render. Generates a 1-hour signed URL for a voice-note path. Returns
 * null on any error so pages never crash if a file is missing.
 */
export async function resolveSignedAudioUrl(audioPath: string): Promise<string | null> {
  try {
    const { data, error } = await lifeAdmin().storage
      .from("life-voice-notes")
      .createSignedUrl(audioPath, 60 * 60)
    if (error) {
      console.warn("signed URL error:", error.message, "for", audioPath)
      return null
    }
    return data?.signedUrl ?? null
  } catch (e) {
    console.warn("signed URL exception:", e instanceof Error ? e.message : String(e))
    return null
  }
}
