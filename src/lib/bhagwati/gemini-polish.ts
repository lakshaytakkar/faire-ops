/**
 * Single-step Gemini image polish for product listings.
 *
 * Locked Apr 2026 by user:
 * - One Gemini call (no multi-step pipeline)
 * - Removes branding/text/watermarks AND regenerates a realistic high-quality
 *   product photograph of the SAME subject on a clean white background
 * - Skip if the source image is already good enough (vision pre-check)
 *
 * Vendor: Gemini only (no OpenRouter, no Replicate).
 */

import { GoogleGenerativeAI } from "@google/generative-ai"
import sharp from "sharp"
import type { PolishResult } from "./types"

const API_KEY = process.env.GEMINI_API_KEY ?? process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? ""
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null

const POLISH_PROMPT = [
  "Re-render this product as a clean, realistic high-resolution e-commerce photograph.",
  "Preserve the exact subject, shape, materials, and colors — do NOT invent a different product.",
  "Remove any watermarks, brand logos, supplier names, Chinese characters, price tags, hands, mannequins, packaging text, and background clutter.",
  "Place the product centered on a pure white seamless background with soft natural studio lighting and a subtle ground shadow.",
  "Square 1:1 aspect ratio. Sharp focus, no motion blur, no compression artifacts. No added text or labels.",
].join(" ")

const QUALITY_CHECK_PROMPT = `You are a strict product-photo QA reviewer for an e-commerce catalog.
Look at this product image and decide if it is ALREADY good enough to publish.

Good enough means ALL of:
- Pure or near-pure white/neutral background (no clutter, no studio props, no other items)
- No visible Chinese characters, watermarks, logos, supplier names, price tags, hands, mannequins
- Sharp focus, no blur, no heavy compression artifacts
- The product is clearly visible, well-lit, and centered

Reply with ONLY a single JSON object on one line, nothing else:
{"good": true|false, "reason": "<one short sentence>"}`

interface QualityVerdict {
  good: boolean
  reason: string
}

export async function checkImageQuality(
  imageBase64: string,
  mimeType: string
): Promise<QualityVerdict> {
  if (!genAI) return { good: false, reason: "gemini_not_configured" }
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
    const result = await model.generateContent([
      { inlineData: { data: imageBase64, mimeType } },
      QUALITY_CHECK_PROMPT,
    ])
    let text = result.response.text().trim()
    text = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "")
    const parsed = JSON.parse(text) as QualityVerdict
    return { good: !!parsed.good, reason: parsed.reason ?? "" }
  } catch (err) {
    console.error("[bhagwati/gemini-polish] quality check failed:", err)
    return { good: false, reason: "quality_check_failed" }
  }
}

/**
 * Polish a product image in a single Gemini call.
 * Returns the polished image as a PNG buffer (NOT uploaded — caller uploads to storage).
 *
 * If `forceRegen` is false (default), pre-checks quality and returns null if image is already good.
 */
export async function polishProductImage(args: {
  imageBuffer: Buffer
  mimeType: string
  forceRegen?: boolean
}): Promise<{ buffer: Buffer; mimeType: string; skipped?: false } | { skipped: true; reason: string }> {
  if (!genAI) {
    return { skipped: true, reason: "gemini_not_configured" }
  }
  const sourceB64 = args.imageBuffer.toString("base64")

  if (!args.forceRegen) {
    const verdict = await checkImageQuality(sourceB64, args.mimeType)
    if (verdict.good) {
      return { skipped: true, reason: `already_good:${verdict.reason}` }
    }
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-image",
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"] as unknown as undefined,
      } as Record<string, unknown>,
    })
    const result = await model.generateContent([
      { inlineData: { data: sourceB64, mimeType: args.mimeType } },
      { text: POLISH_PROMPT },
    ])
    const parts = result.response.candidates?.[0]?.content?.parts ?? []
    for (const part of parts) {
      const p = part as unknown as Record<string, unknown>
      if (p.inlineData) {
        const inline = p.inlineData as { data: string; mimeType: string }
        const raw = Buffer.from(inline.data, "base64")
        // Normalize to high-quality WebP at 2048px (4K-ish for product cards)
        const final = await sharp(raw)
          .resize(2048, 2048, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 92 })
          .toBuffer()
        return { buffer: final, mimeType: "image/webp" }
      }
    }
    return { skipped: true, reason: "gemini_returned_no_image" }
  } catch (err) {
    console.error("[bhagwati/gemini-polish] polish failed:", err)
    return { skipped: true, reason: `polish_failed:${(err as Error).message}` }
  }
}

/**
 * Convenience: polish + upload to Supabase storage.
 * Caller must pass a Supabase service-role client.
 */
export async function polishAndUpload(args: {
  imageBuffer: Buffer
  mimeType: string
  storagePath: string                        // e.g. "products/<id>.webp"
  bucket?: string                            // default "product-images"
  supabase: {
    storage: {
      from: (b: string) => {
        upload: (p: string, body: Buffer, opts: Record<string, unknown>) => Promise<{ error: unknown }>
        getPublicUrl: (p: string) => { data: { publicUrl: string } }
      }
    }
  }
  forceRegen?: boolean
}): Promise<PolishResult> {
  const polished = await polishProductImage({
    imageBuffer: args.imageBuffer,
    mimeType: args.mimeType,
    forceRegen: args.forceRegen,
  })
  if ("skipped" in polished && polished.skipped) {
    return { status: "skipped", reason: polished.reason }
  }
  const bucket = args.bucket ?? "product-images"
  const { error } = await args.supabase.storage.from(bucket).upload(args.storagePath, polished.buffer, {
    contentType: polished.mimeType,
    upsert: true,
  })
  if (error) {
    return { status: "failed", reason: `upload_failed:${String(error)}` }
  }
  const { data } = args.supabase.storage.from(bucket).getPublicUrl(args.storagePath)
  return {
    status: "done",
    publicUrl: data.publicUrl,
    storagePath: args.storagePath,
    bytesIn: args.imageBuffer.byteLength,
    bytesOut: polished.buffer.byteLength,
  }
}
