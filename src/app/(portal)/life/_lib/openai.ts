import "server-only"

const OPENAI_KEY = process.env.OPENAI_API_KEY ?? ""

export type OpenAIResult<T> = { ok: true; data: T } | { ok: false; error: string }

export function openaiConfigured(): boolean {
  return Boolean(OPENAI_KEY)
}

/**
 * Whisper transcription. Accepts the raw bytes of an audio file. Returns
 * `{ ok: true, data: text }` on success or `{ ok: false, error }` on failure.
 */
export async function whisperTranscribe(
  audio: Blob,
  filename = "audio.webm",
): Promise<OpenAIResult<string>> {
  if (!OPENAI_KEY) return { ok: false, error: "OPENAI_API_KEY not configured" }
  const fd = new FormData()
  fd.append("file", audio, filename)
  fd.append("model", "whisper-1")
  fd.append("response_format", "text")
  try {
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_KEY}` },
      body: fd,
    })
    if (!res.ok) {
      const txt = await res.text()
      return { ok: false, error: `Whisper ${res.status}: ${txt.slice(0, 200)}` }
    }
    const text = await res.text()
    return { ok: true, data: text.trim() }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Whisper request failed" }
  }
}

/**
 * Chat-completions one-shot. Used for both summarisation and structured
 * extraction. `system` is the role prompt; `user` is the input.
 * If `jsonMode` is true, response_format is json_object and we JSON.parse.
 */
export async function chat<T = unknown>({
  system,
  user,
  jsonMode = false,
  model = "gpt-4o-mini",
  temperature = 0.2,
}: {
  system: string
  user: string
  jsonMode?: boolean
  model?: string
  temperature?: number
}): Promise<OpenAIResult<T extends string ? string : T>> {
  if (!OPENAI_KEY) return { ok: false, error: "OPENAI_API_KEY not configured" }
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    })
    if (!res.ok) {
      const txt = await res.text()
      return { ok: false, error: `Chat ${res.status}: ${txt.slice(0, 200)}` }
    }
    const json = await res.json()
    const content: string = json?.choices?.[0]?.message?.content ?? ""
    if (jsonMode) {
      try {
        return { ok: true, data: JSON.parse(content) as T extends string ? string : T }
      } catch (e) {
        return { ok: false, error: `Could not parse JSON from model: ${(e as Error).message}` }
      }
    }
    return { ok: true, data: content as T extends string ? string : T }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Chat request failed" }
  }
}
