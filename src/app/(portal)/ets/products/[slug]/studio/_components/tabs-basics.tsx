"use client"

import { useState } from "react"
import { Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DiffCard } from "@/components/shared/diff-card"
import { normalizeName, type NormalizeNameResponse } from "@/lib/bhagwati/studio-api"

import type { useProductPatch } from "./use-product-patch"

type Handle = ReturnType<typeof useProductPatch>

export function TabsBasics({ handle }: { handle: Handle }) {
  const { product, patch, save, flipChecklist, saving, error } = handle
  const [suggestion, setSuggestion] = useState<NormalizeNameResponse | null>(null)
  const [busy, setBusy] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  async function runNormalize() {
    setBusy(true)
    setAiError(null)
    try {
      const res = await normalizeName({
        productId: product.id,
        name: product.name_en ?? product.name_cn,
        description: product.description,
      })
      setSuggestion(res)
    } catch (e) {
      setAiError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function acceptSuggestion() {
    if (!suggestion) return
    await save({
      name_en: suggestion.name_en,
      description: suggestion.description ?? product.description,
      name_quality: "ai_cleaned",
    })
    await flipChecklist("name_normalized", true)
    setSuggestion(null)
  }

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h2 className="text-[0.9375rem] font-semibold tracking-tight">Basics</h2>
        <p className="text-xs text-muted-foreground">
          Tidy the English name and description. Use ✨ Normalize for an AI-cleaned
          rewrite, then accept or reject it.
        </p>
      </header>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="name_en">
            English name
          </label>
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={runNormalize}
            disabled={busy}
          >
            <Sparkles /> {busy ? "Thinking…" : "Normalize"}
          </Button>
        </div>
        <input
          id="name_en"
          type="text"
          value={product.name_en ?? ""}
          onChange={(e) => patch({ name_en: e.target.value })}
          onBlur={(e) => save({ name_en: e.target.value })}
          placeholder={product.name_cn ?? "Untitled"}
          className="w-full h-9 px-3 text-sm rounded-md border border-input bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {product.name_en_raw && (
          <div className="text-[11px] text-muted-foreground">
            <span className="font-semibold uppercase tracking-wider">Original:</span>{" "}
            <span className="font-mono">{product.name_en_raw}</span>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="description">
          Description
        </label>
        <textarea
          id="description"
          value={product.description ?? ""}
          onChange={(e) => patch({ description: e.target.value })}
          onBlur={(e) => save({ description: e.target.value })}
          rows={5}
          className="w-full px-3 py-2 text-sm rounded-md border border-input bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
        />
      </section>

      {(aiError || error) && (
        <div className="text-xs text-red-700 bg-red-50 ring-1 ring-red-200 rounded-md px-3 py-2">
          {aiError ?? error}
        </div>
      )}

      {suggestion && (
        <DiffCard
          label="Name + description rewrite"
          original={`${product.name_en ?? product.name_cn ?? ""}\n\n${product.description ?? ""}`.trim()}
          suggestion={`${suggestion.name_en}\n\n${suggestion.description ?? ""}`.trim()}
          onAccept={acceptSuggestion}
          onReject={() => setSuggestion(null)}
          onReroll={runNormalize}
          busy={busy || saving}
          extra={
            suggestion.extracted_codes.length > 0 ? (
              <span>Lifted codes: {suggestion.extracted_codes.join(", ")}</span>
            ) : null
          }
        />
      )}
    </div>
  )
}
