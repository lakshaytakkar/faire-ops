"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Sparkles,
  ArrowLeft,
  Lightbulb,
  Save,
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabaseB2B } from "@/lib/supabase"
import { generateText, isGeminiConfigured } from "@/lib/gemini"

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface GeneratedVariant {
  headline: string
  primary_text: string
  description: string
  cta: string
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function AICreativeStudioPage() {
  const geminiReady = isGeminiConfigured()

  const [form, setForm] = useState({
    product: "",
    objective: "awareness",
    tone: "professional",
    audience: "",
  })
  const [generating, setGenerating] = useState(false)
  const [variants, setVariants] = useState<GeneratedVariant[]>([])
  const [prompt, setPrompt] = useState("")
  const [savingIdx, setSavingIdx] = useState<number | null>(null)
  const [savedSet, setSavedSet] = useState<Set<number>>(new Set())
  const [error, setError] = useState("")

  function set(k: keyof typeof form, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  async function handleGenerate() {
    if (!form.product.trim()) return
    setGenerating(true)
    setError("")
    setVariants([])
    setSavedSet(new Set())

    const builtPrompt = `You are an expert ad copywriter. Generate exactly 3 ad creative variants as a JSON array.

Product/Brand: ${form.product}
Objective: ${form.objective}
Tone: ${form.tone}
Target Audience: ${form.audience || "General audience"}

Each variant must have: headline (max 40 chars), primary_text (2-3 sentences), description (1 sentence), cta (call-to-action button text like "Shop Now", "Learn More", etc).

Return ONLY a valid JSON array with 3 objects, no markdown fences, no explanation. Example format:
[{"headline":"...","primary_text":"...","description":"...","cta":"..."}]`

    setPrompt(builtPrompt)

    try {
      const raw = await generateText(builtPrompt)
      // Try to extract JSON from the response
      const jsonMatch = raw.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        setError("Could not parse AI response. Please try again.")
        setGenerating(false)
        return
      }
      const parsed = JSON.parse(jsonMatch[0]) as GeneratedVariant[]
      if (!Array.isArray(parsed) || parsed.length === 0) {
        setError("AI returned an empty or invalid response. Please try again.")
        setGenerating(false)
        return
      }
      setVariants(parsed.slice(0, 3))
    } catch {
      setError("Failed to generate or parse creatives. Please try again.")
    }
    setGenerating(false)
  }

  async function handleSave(variant: GeneratedVariant, idx: number) {
    setSavingIdx(idx)
    const { error: err } = await supabaseB2B.from("meta_ad_creatives").insert({
      name: variant.headline,
      type: "image",
      status: "draft",
      headline: variant.headline,
      primary_text: variant.primary_text,
      description: variant.description,
      cta_type: variant.cta.toUpperCase().replace(/\s+/g, "_"),
      ai_generated: true,
      ai_prompt: prompt,
      tags: ["ai-generated", form.objective, form.tone],
    })
    if (!err) {
      setSavedSet((prev) => new Set(prev).add(idx))
    }
    setSavingIdx(null)
  }

  const labelCls = "text-xs font-semibold text-muted-foreground uppercase tracking-wider"
  const inputCls = "rounded-md border px-3 py-2 text-sm bg-background w-full"

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/marketing/creatives" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-violet-500" />
          <h1 className="text-xl font-bold tracking-tight">AI Creative Studio</h1>
        </div>
      </div>

      {/* Gemini not configured notice */}
      {!geminiReady && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Gemini API not configured</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Add <code className="bg-amber-100 px-1 rounded text-[0.6875rem]">NEXT_PUBLIC_GEMINI_API_KEY</code> to
              your <code className="bg-amber-100 px-1 rounded text-[0.6875rem]">.env.local</code> file to enable AI-powered creative generation.
            </p>
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left panel — Form */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
              Generation Settings
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className={labelCls}>Product / Brand Context *</label>
                <textarea
                  className={`${inputCls} min-h-[80px]`}
                  value={form.product}
                  onChange={(e) => set("product", e.target.value)}
                  placeholder="Describe the product, brand, or offering you want to create ads for..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Objective</label>
                  <select className={inputCls} value={form.objective} onChange={(e) => set("objective", e.target.value)}>
                    <option value="awareness">Awareness</option>
                    <option value="traffic">Traffic</option>
                    <option value="conversions">Conversions</option>
                    <option value="engagement">Engagement</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Tone</label>
                  <select className={inputCls} value={form.tone} onChange={(e) => set("tone", e.target.value)}>
                    <option value="professional">Professional</option>
                    <option value="playful">Playful</option>
                    <option value="urgent">Urgent</option>
                    <option value="luxurious">Luxurious</option>
                    <option value="friendly">Friendly</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Target Audience</label>
                <textarea
                  className={`${inputCls} min-h-[60px]`}
                  value={form.audience}
                  onChange={(e) => set("audience", e.target.value)}
                  placeholder="Describe your ideal customer (demographics, interests, pain points)..."
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={handleGenerate}
                  disabled={generating || !form.product.trim() || !geminiReady}
                >
                  {generating ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  {generating ? "Generating..." : "Generate Creatives"}
                </Button>
                {variants.length > 0 && (
                  <Button variant="outline" onClick={handleGenerate} disabled={generating}>
                    <RefreshCw className="size-4" />
                    Regenerate
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right panel — Tips */}
        <div>
          <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight flex items-center gap-2">
              <Lightbulb className="size-4 text-amber-500" />
              Best Practices
            </div>
            <div className="p-5 space-y-3 text-xs text-muted-foreground">
              <div>
                <p className="font-medium text-foreground mb-0.5">Headlines</p>
                <p>Keep under 40 characters. Lead with a benefit, not a feature.</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-0.5">Primary Text</p>
                <p>First sentence is critical — it shows before "See More". Hook the reader immediately.</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-0.5">Call to Action</p>
                <p>Match CTA to your objective. "Shop Now" for conversions, "Learn More" for awareness.</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-0.5">A/B Testing</p>
                <p>Generate multiple variants and test them. Even small copy changes can impact CTR by 20-50%.</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-0.5">Audience Alignment</p>
                <p>The more specific your audience description, the more tailored the generated copy will be.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Results */}
      {variants.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Generated Variants</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {variants.map((v, i) => (
              <div key={i} className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b text-[0.9375rem] font-semibold tracking-tight">
                  Variant {i + 1}
                </div>
                <div className="p-5 space-y-3">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Headline</span>
                    <p className="text-sm font-bold text-foreground mt-0.5">{v.headline}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Primary Text</span>
                    <p className="text-sm text-foreground mt-0.5">{v.primary_text}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</span>
                    <p className="text-sm text-muted-foreground mt-0.5">{v.description}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">CTA</span>
                    <p className="text-sm mt-0.5">
                      <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {v.cta}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="px-5 py-3 border-t">
                  <Button
                    variant={savedSet.has(i) ? "outline" : "default"}
                    className="w-full"
                    onClick={() => handleSave(v, i)}
                    disabled={savingIdx === i || savedSet.has(i)}
                  >
                    {savingIdx === i ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : savedSet.has(i) ? (
                      "Saved"
                    ) : (
                      <>
                        <Save className="size-4" />
                        Save to Library
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generating skeleton */}
      {generating && variants.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border/80 bg-card shadow-sm p-5 space-y-3">
              <div className="animate-pulse rounded bg-muted h-4 w-24" />
              <div className="animate-pulse rounded bg-muted h-5 w-full" />
              <div className="animate-pulse rounded bg-muted h-4 w-20" />
              <div className="animate-pulse rounded bg-muted h-16 w-full" />
              <div className="animate-pulse rounded bg-muted h-4 w-20" />
              <div className="animate-pulse rounded bg-muted h-4 w-full" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
