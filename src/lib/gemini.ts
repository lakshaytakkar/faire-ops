import { GoogleGenerativeAI } from "@google/generative-ai"

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? ""

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null

export async function generateText(prompt: string): Promise<string> {
  if (!genAI) return "[Gemini API key not configured — add NEXT_PUBLIC_GEMINI_API_KEY to .env.local]"
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
    const result = await model.generateContent(prompt)
    return result.response.text()
  } catch (error) {
    console.error("Gemini error:", error)
    return "[Error generating content — check API key and quota]"
  }
}

/* ------------------------------------------------------------------ */
/*  Audio transcription + analysis                                     */
/* ------------------------------------------------------------------ */

export interface CallTranscriptionResult {
  transcript: string
  summary: string
  key_points: string[]
  sentiment: "positive" | "neutral" | "negative" | "escalated"
  topics: string[]
  flag_severity: "none" | "low" | "medium" | "high" | "critical"
  flag_reasons: string[]
  quality_score: number
  action_items: string[]
}

/**
 * Transcribe and analyze a call recording using Gemini 2.5 Flash audio input.
 * Returns transcript + AI summary, sentiment, flags, action items.
 */
export async function transcribeCallAudio(
  audioBase64: string,
  mimeType: string = "audio/mpeg"
): Promise<CallTranscriptionResult> {
  if (!genAI) {
    throw new Error("Gemini API key not configured")
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

  const prompt = `You are a call quality analyst. Listen to this call recording and respond with ONLY a valid JSON object (no markdown, no code fences) with this exact structure:

{
  "transcript": "Full verbatim transcript with speaker labels like 'Agent:' and 'Customer:'",
  "summary": "2-3 sentence summary of what the call was about",
  "key_points": ["Key point 1", "Key point 2", "..."],
  "sentiment": "positive | neutral | negative | escalated",
  "topics": ["topic1", "topic2"],
  "flag_severity": "none | low | medium | high | critical",
  "flag_reasons": ["Specific issues if any, e.g., rude_tone, unresolved_complaint, compliance_issue"],
  "quality_score": 0-100,
  "action_items": ["Concrete next steps mentioned in the call"]
}

Be honest in your scoring. If the call was professional and successful, score high. If there were issues, flag them clearly. For very short calls (under 10 seconds), return minimal data.`

  const result = await model.generateContent([
    { text: prompt },
    {
      inlineData: {
        mimeType,
        data: audioBase64,
      },
    },
  ])

  let text = result.response.text().trim()
  // Strip any markdown code fences if Gemini wraps response
  text = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "")

  try {
    const parsed = JSON.parse(text) as CallTranscriptionResult
    return parsed
  } catch (e) {
    console.error("Failed to parse Gemini transcription JSON:", text.slice(0, 500))
    throw new Error("Gemini returned invalid JSON for transcription")
  }
}

export async function generateProductDescription(
  productName: string,
  category: string,
  wholesalePrice: number
): Promise<string> {
  const prompt = `Write a compelling wholesale B2B product description for Faire marketplace listing.
Product: ${productName}
Category: ${category}
Wholesale Price: $${wholesalePrice.toFixed(2)}

Requirements:
- 2-3 sentences max
- Focus on retailer benefits (margin opportunity, customer appeal)
- Mention materials/quality if relevant
- Professional wholesale tone
- No emojis`
  return generateText(prompt)
}

export async function generateListingTitle(
  currentTitle: string,
  category: string
): Promise<string> {
  const prompt = `Rewrite this wholesale product title for better SEO on Faire marketplace.
Current title: ${currentTitle}
Category: ${category}

Requirements:
- Max 80 characters
- Include key search terms
- Professional, not clickbait
- Return ONLY the new title, nothing else`
  return generateText(prompt)
}

export async function generateImageDescription(
  productName: string
): Promise<string> {
  const prompt = `Describe an ideal product photography setup for this wholesale product listing on Faire:
Product: ${productName}

Give 3 bullet points for:
1. Main product shot (white background, angles)
2. Lifestyle/context shot (where it would be displayed in a retail store)
3. Detail/texture shot

Keep each bullet to one sentence.`
  return generateText(prompt)
}

export function isGeminiConfigured(): boolean {
  return API_KEY !== "" && API_KEY !== "your-gemini-api-key-here"
}

/* ------------------------------------------------------------------ */
/*  Image Generation via Gemini                                        */
/* ------------------------------------------------------------------ */

export async function generateImage(prompt: string): Promise<{ base64: string; mimeType: string } | null> {
  if (!genAI) return null
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-image",
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"] as unknown as undefined,
      } as Record<string, unknown>,
    })
    const result = await model.generateContent(prompt)
    const response = result.response
    const parts = response.candidates?.[0]?.content?.parts ?? []
    for (const part of parts) {
      const p = part as unknown as Record<string, unknown>
      if (p.inlineData) {
        const inline = p.inlineData as { data: string; mimeType: string }
        return { base64: inline.data, mimeType: inline.mimeType }
      }
    }
    return null
  } catch (error) {
    console.error("Gemini image gen error:", error)
    return null
  }
}

export async function optimizeProductImagePrompt(
  productName: string,
  category: string,
  imageDescription?: string
): Promise<string> {
  const prompt = `You are a Faire marketplace product photography expert. Write a detailed prompt to optimize a product listing image.

Product: ${productName}
Category: ${category}
${imageDescription ? `Current image: ${imageDescription}` : ""}

Create a professional image optimization prompt that would:
1. Place the product on a clean white background
2. Apply professional studio lighting
3. Show the product at the best angle for a wholesale buyer
4. Ensure the image is square (1:1 ratio) and high resolution
5. Remove any distracting elements

Return ONLY the optimized image prompt (1-2 sentences), nothing else.`
  return generateText(prompt)
}

export async function generateCollectionThumbnailPrompt(args: {
  title: string
  background: string
  subject: string
  includeText: boolean
  style: string
}): Promise<string> {
  const prompt = `Create a prompt for generating a wholesale product collection thumbnail for Faire marketplace.

Collection Title: ${args.title}
Background: ${args.background}
Subject/Theme: ${args.subject}
Include text overlay: ${args.includeText ? "Yes, add '" + args.title + "' as text" : "No text"}
Style: ${args.style}

Requirements:
- Square format (1:1 ratio)
- Clean, professional, wholesale-appropriate
- Eye-catching at small sizes (200x200px thumbnail)
- Should represent a group of products, not a single item

Return ONLY the image generation prompt (2-3 sentences), nothing else.`
  return generateText(prompt)
}

export async function generateLogoPrompt(args: {
  brandName: string
  logoType: string
  colorScheme: string
  style: string
  additionalNotes?: string
}): Promise<string> {
  const prompt = `Create a prompt for generating a brand logo for a Faire wholesale store.

Brand Name: ${args.brandName}
Logo Type: ${args.logoType} (e.g., text-only, mascot, icon, badge, monogram)
Color Scheme: ${args.colorScheme}
Style: ${args.style} (e.g., modern, vintage, playful, minimal, luxury)
${args.additionalNotes ? `Notes: ${args.additionalNotes}` : ""}

Requirements:
- Clean, scalable, works at small sizes
- Professional wholesale brand appearance
- Transparent background preferred
- Simple and memorable

Return ONLY the image generation prompt (2-3 sentences), nothing else.`
  return generateText(prompt)
}

export async function generateBannerPrompt(args: {
  storeName: string
  message: string
  occasion: string
  style: string
  productNames?: string[]
}): Promise<string> {
  const prompt = `Create a prompt for generating a store banner for Faire marketplace.

Store Name: ${args.storeName}
Central Message: ${args.message}
Occasion/Event: ${args.occasion}
Style: ${args.style}
${args.productNames?.length ? `Featured Products: ${args.productNames.join(", ")}` : ""}

Requirements:
- Panoramic aspect ratio (4:1, like 1600x400px)
- Central text/message prominent
- If products mentioned, show them subtly on left and right sides
- Professional wholesale appearance
- Seasonal/event-appropriate if occasion specified

Return ONLY the image generation prompt (2-3 sentences), nothing else.`
  return generateText(prompt)
}

/* ------------------------------------------------------------------ */
/*  Vision API — Analyze actual images                                 */
/* ------------------------------------------------------------------ */

export async function analyzeProductImage(
  imageBase64: string,
  mimeType: string,
  productName: string
): Promise<string> {
  if (!genAI) return "[Gemini API key not configured]"
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
    const result = await model.generateContent([
      {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType,
        },
      },
      `Analyze this product image for a Faire wholesale marketplace listing.
Product: ${productName}

Provide a brief assessment (3-4 lines):
1. Image quality score (1-10) and why
2. Is the background clean/white? Any issues?
3. Is the product clearly visible and well-lit?
4. One specific improvement suggestion

Be concise and direct.`,
    ])
    return result.response.text()
  } catch (error) {
    console.error("Gemini Vision error:", error)
    return "[Error analyzing image — check API key and quota]"
  }
}

export async function generateListingImageSuggestions(
  imageBase64: string,
  mimeType: string,
  productName: string,
  imageType: string
): Promise<string> {
  if (!genAI) return "[Gemini API key not configured]"
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

    const typeInstructions: Record<string, string> = {
      listing: "This is a product listing image for Faire. Should be on white background, well-lit, showing the product clearly.",
      logo: "This is a store logo. Should be clean, memorable, work at small sizes, represent the brand well.",
      banner: "This is a store banner (panoramic). Should be visually appealing, represent the brand, work at 16:9 aspect ratio.",
      collection_thumb: "This is a collection thumbnail. Should represent a group of products, be eye-catching at small sizes.",
    }

    const result = await model.generateContent([
      {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType,
        },
      },
      `Analyze this ${imageType} image for a Faire wholesale store.
Product/Brand: ${productName}
Context: ${typeInstructions[imageType] ?? typeInstructions.listing}

Provide:
1. Quality score (1-10)
2. What works well
3. What needs improvement
4. Specific optimization suggestion

Be concise (4 lines max).`,
    ])
    return result.response.text()
  } catch (error) {
    console.error("Gemini Vision error:", error)
    return "[Error analyzing image]"
  }
}

/* ------------------------------------------------------------------ */
/*  AI Tools Hub — Prompt Functions                                    */
/* ------------------------------------------------------------------ */

export async function suggestPricing(productName: string, cogs: number, category: string): Promise<string> {
  return generateText(`You are a wholesale pricing expert for Faire marketplace.\nProduct: ${productName}\nCategory: ${category}\nCOGS: $${cogs.toFixed(2)}\n\nSuggest optimal pricing:\n1. Wholesale Price (what retailers pay) — aim for 50-60% margin\n2. MSRP (suggested retail) — typically 2-2.5x wholesale\n3. MOQ recommendation\n4. Brief justification\n\nFormat as clear bullet points.`)
}

export async function composeRetailerEmail(retailerName: string, storeName: string, context: string): Promise<string> {
  return generateText(`Write a personalized wholesale outreach email.\nRetailer: ${retailerName}\nBrand: ${storeName}\nContext: ${context}\n\nRequirements:\n- Professional B2B tone\n- Short (3-4 paragraphs max)\n- Include a clear CTA\n- Mention Faire as the platform\n- No emojis\n\nReturn the complete email with subject line.`)
}

export async function generateProductTags(productName: string, description: string, category: string): Promise<string> {
  return generateText(`Generate 10 SEO-optimized tags for this Faire wholesale product.\nProduct: ${productName}\nDescription: ${description}\nCategory: ${category}\n\nRequirements:\n- Relevant to wholesale/B2B buyers\n- Include category, material, style, use-case tags\n- Mix of broad and specific tags\n- Return as comma-separated list, nothing else`)
}

export async function auditListing(productName: string, description: string, imageCount: number, price: number, tags: string[]): Promise<string> {
  return generateText(`Audit this Faire product listing and score it.\nProduct: ${productName}\nDescription: ${description || "MISSING"}\nImages: ${imageCount}\nWholesale Price: $${price.toFixed(2)}\nTags: ${tags.length > 0 ? tags.join(", ") : "NONE"}\n\nScore each (1-10):\n1. Title quality (SEO, clarity, length)\n2. Description quality (B2B tone, detail, keywords)\n3. Image count (Faire recommends 4+)\n4. Pricing competitiveness\n5. Tag coverage\n\nOverall score: X/50\nTop 3 improvements needed.\n\nBe specific and actionable.`)
}

export async function analyzeTrends(category: string): Promise<string> {
  return generateText(`You are a wholesale market analyst for Faire marketplace.\nCategory: ${category}\n\nProvide:\n1. Top 5 trending keywords in this category for wholesale\n2. 3 emerging product types retailers are looking for\n3. Seasonal considerations for the next 3 months\n4. Price range sweet spot for this category\n5. One actionable recommendation\n\nBe specific to wholesale/B2B market. Keep concise.`)
}
