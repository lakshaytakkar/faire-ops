// FAL AI — Kling text-to-video wrapper.
//
// Usage (server-side only):
//   import { generateVideo } from "@/lib/video/fal-kling"
//   const { videoUrl, requestId } = await generateVideo({
//     prompt: "A minimalist office at sunset, slow camera pan, warm tones",
//     duration: 5,
//     aspectRatio: "16:9",
//   })
//
// Model: controlled by FAL_VIDEO_MODEL env. Default: fal-ai/kling-video/v2.1/master/text-to-video
// (latest Kling master-tier text-to-video as of 2026-04-17).
//
// Cost: Kling master-tier is ~$0.35–$0.70 per 5s clip (confirm current pricing at fal.ai/models).
// Every call is real money — do not loop without throttling.

import "server-only"
import { fal } from "@fal-ai/client"

const FAL_API_KEY = process.env.FAL_API_KEY ?? ""
const DEFAULT_MODEL =
  process.env.FAL_VIDEO_MODEL ?? "fal-ai/kling-video/v2.1/master/text-to-video"
const DEFAULT_I2V_MODEL =
  process.env.FAL_I2V_MODEL ?? "fal-ai/kling-video/v2.1/master/image-to-video"

if (FAL_API_KEY) {
  fal.config({ credentials: FAL_API_KEY })
}

export type AspectRatio = "16:9" | "9:16" | "1:1"

export interface GenerateVideoInput {
  prompt: string
  negativePrompt?: string
  duration?: 5 | 10 // Kling supports 5s or 10s
  aspectRatio?: AspectRatio
  cfgScale?: number // 0..1, default 0.5; higher = stricter prompt adherence
  model?: string // override default (fal-ai/kling-video/...)
}

export interface GenerateVideoResult {
  videoUrl: string
  requestId: string
  model: string
  contentType: string
  fileSize: number | null
  seed: number | null
  raw: unknown
}

/**
 * Synchronous text-to-video generation. Blocks until FAL returns the final URL.
 * For long prompts (10s video) this can take 1–2 minutes.
 *
 * Throws if FAL_API_KEY is missing or the model endpoint rejects the input.
 */
export async function generateVideo(
  input: GenerateVideoInput,
): Promise<GenerateVideoResult> {
  if (!FAL_API_KEY) {
    throw new Error(
      "[fal-kling] FAL_API_KEY is not set. Add it to team-portal/.env.local or the Vercel env.",
    )
  }
  if (!input.prompt || input.prompt.trim().length < 3) {
    throw new Error("[fal-kling] prompt must be at least 3 characters")
  }

  const model = input.model ?? DEFAULT_MODEL
  const payload: Record<string, unknown> = {
    prompt: input.prompt.trim(),
    duration: String(input.duration ?? 5),
    aspect_ratio: input.aspectRatio ?? "16:9",
  }
  if (input.negativePrompt) payload.negative_prompt = input.negativePrompt
  if (input.cfgScale != null) payload.cfg_scale = input.cfgScale

  const response = await fal.subscribe(model, {
    input: payload,
    logs: false,
  })

  const data = (response as { data?: Record<string, unknown>; requestId?: string })?.data
  const requestId = (response as { requestId?: string })?.requestId ?? ""
  const video = data && (data["video"] as Record<string, unknown> | undefined)

  const videoUrl = (video?.["url"] as string | undefined) ?? ""
  if (!videoUrl) {
    throw new Error(
      `[fal-kling] model ${model} returned no video URL. requestId=${requestId}`,
    )
  }

  return {
    videoUrl,
    requestId,
    model,
    contentType: (video?.["content_type"] as string | undefined) ?? "video/mp4",
    fileSize: (video?.["file_size"] as number | undefined) ?? null,
    seed: (data?.["seed"] as number | undefined) ?? null,
    raw: response,
  }
}

/**
 * Async kickoff — returns a request id immediately; poll with `pollVideoStatus`.
 * Use for longer videos or when you don't want the request to block.
 */
export async function kickoffVideo(
  input: GenerateVideoInput,
): Promise<{ requestId: string; model: string }> {
  if (!FAL_API_KEY) throw new Error("[fal-kling] FAL_API_KEY is not set")
  const model = input.model ?? DEFAULT_MODEL
  const payload: Record<string, unknown> = {
    prompt: input.prompt.trim(),
    duration: String(input.duration ?? 5),
    aspect_ratio: input.aspectRatio ?? "16:9",
  }
  if (input.negativePrompt) payload.negative_prompt = input.negativePrompt
  if (input.cfgScale != null) payload.cfg_scale = input.cfgScale

  const { request_id } = await fal.queue.submit(model, { input: payload })
  return { requestId: request_id, model }
}

export interface GenerateImageToVideoInput {
  prompt: string
  imageUrl: string
  tailImageUrl?: string
  negativePrompt?: string
  duration?: 5 | 10
  aspectRatio?: AspectRatio
  cfgScale?: number
  model?: string
}

/**
 * Kling image-to-video: animates a reference image. Ideal for UGC product videos —
 * pass the product photo, describe the desired motion in the prompt, get a short
 * cinematic clip back. Master tier can take 1–3 minutes.
 */
export async function generateImageToVideo(
  input: GenerateImageToVideoInput,
): Promise<GenerateVideoResult> {
  if (!FAL_API_KEY) {
    throw new Error("[fal-kling] FAL_API_KEY is not set")
  }
  if (!input.prompt || input.prompt.trim().length < 3) {
    throw new Error("[fal-kling] prompt must be at least 3 characters")
  }
  if (!input.imageUrl) {
    throw new Error("[fal-kling] imageUrl is required for image-to-video")
  }
  const model = input.model ?? DEFAULT_I2V_MODEL
  const payload: Record<string, unknown> = {
    prompt: input.prompt.trim(),
    image_url: input.imageUrl,
    duration: String(input.duration ?? 5),
  }
  if (input.aspectRatio) payload.aspect_ratio = input.aspectRatio
  if (input.tailImageUrl) payload.tail_image_url = input.tailImageUrl
  if (input.negativePrompt) payload.negative_prompt = input.negativePrompt
  if (input.cfgScale != null) payload.cfg_scale = input.cfgScale

  const response = await fal.subscribe(model, { input: payload, logs: false })

  const data = (response as { data?: Record<string, unknown>; requestId?: string })?.data
  const requestId = (response as { requestId?: string })?.requestId ?? ""
  const video = data && (data["video"] as Record<string, unknown> | undefined)
  const videoUrl = (video?.["url"] as string | undefined) ?? ""
  if (!videoUrl) {
    throw new Error(`[fal-kling] image-to-video returned no URL. requestId=${requestId}`)
  }

  return {
    videoUrl,
    requestId,
    model,
    contentType: (video?.["content_type"] as string | undefined) ?? "video/mp4",
    fileSize: (video?.["file_size"] as number | undefined) ?? null,
    seed: (data?.["seed"] as number | undefined) ?? null,
    raw: response,
  }
}

export async function pollVideoStatus(
  model: string,
  requestId: string,
): Promise<{ status: string; videoUrl: string | null; raw: unknown }> {
  const status = await fal.queue.status(model, { requestId, logs: false })
  const statusStr = (status as { status?: string })?.status ?? "UNKNOWN"

  if (statusStr !== "COMPLETED") {
    return { status: statusStr, videoUrl: null, raw: status }
  }

  const result = await fal.queue.result(model, { requestId })
  const data = (result as { data?: Record<string, unknown> })?.data
  const video = data && (data["video"] as Record<string, unknown> | undefined)
  return {
    status: "COMPLETED",
    videoUrl: (video?.["url"] as string | undefined) ?? null,
    raw: result,
  }
}
