import { NextResponse } from "next/server"
import { generateVideo, type AspectRatio } from "@/lib/video/fal-kling"

export const dynamic = "force-dynamic"
export const maxDuration = 300 // 5 min — Kling master can take 1–2 min per clip

const ALLOWED_ASPECTS: AspectRatio[] = ["16:9", "9:16", "1:1"]
const ALLOWED_DURATIONS = [5, 10] as const

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      prompt?: unknown
      negativePrompt?: unknown
      duration?: unknown
      aspectRatio?: unknown
      cfgScale?: unknown
      model?: unknown
    }

    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : ""
    if (prompt.length < 3) {
      return NextResponse.json(
        { error: "prompt must be at least 3 characters" },
        { status: 400 },
      )
    }

    const duration =
      typeof body.duration === "number" && ALLOWED_DURATIONS.includes(body.duration as 5 | 10)
        ? (body.duration as 5 | 10)
        : 5

    const aspectRatio =
      typeof body.aspectRatio === "string" &&
      (ALLOWED_ASPECTS as string[]).includes(body.aspectRatio)
        ? (body.aspectRatio as AspectRatio)
        : "16:9"

    const result = await generateVideo({
      prompt,
      negativePrompt: typeof body.negativePrompt === "string" ? body.negativePrompt : undefined,
      duration,
      aspectRatio,
      cfgScale: typeof body.cfgScale === "number" ? body.cfgScale : undefined,
      model: typeof body.model === "string" ? body.model : undefined,
    })

    return NextResponse.json({
      videoUrl: result.videoUrl,
      requestId: result.requestId,
      model: result.model,
      contentType: result.contentType,
      fileSize: result.fileSize,
      seed: result.seed,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
