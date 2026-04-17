"use client"

import { useMemo, useState } from "react"
import { Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { suggestCategory, type CategorySuggestion } from "@/lib/bhagwati/studio-api"

import type { useProductPatch } from "./use-product-patch"
import type { StudioCategory } from "./types"

type Handle = ReturnType<typeof useProductPatch>

export function TabsCategory({
  handle,
  categories,
}: {
  handle: Handle
  categories: StudioCategory[]
}) {
  const { product, save, flipChecklist, error: saveError } = handle

  const byParent = useMemo(() => {
    const map = new Map<string | null, StudioCategory[]>()
    for (const c of categories) {
      const k = c.parent_id ?? null
      const arr = map.get(k) ?? []
      arr.push(c)
      map.set(k, arr)
    }
    return map
  }, [categories])

  const initialChain = useMemo(() => buildChain(categories, product.category_id), [
    categories,
    product.category_id,
  ])
  const [l1, setL1] = useState<string | null>(initialChain[0]?.id ?? null)
  const [l2, setL2] = useState<string | null>(initialChain[1]?.id ?? null)
  const [l3, setL3] = useState<string | null>(initialChain[2]?.id ?? null)

  const [suggestions, setSuggestions] = useState<CategorySuggestion[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const l1Options = byParent.get(null) ?? []
  const l2Options = l1 ? byParent.get(l1) ?? [] : []
  const l3Options = l2 ? byParent.get(l2) ?? [] : []

  async function saveCategory(id: string | null) {
    if (!id) return
    await save({ category_id: id, category_confidence: 1 })
    await flipChecklist("categorized", true)
  }

  async function runSuggest() {
    setBusy(true)
    setError(null)
    try {
      const res = await suggestCategory({ productId: product.id })
      setSuggestions(res.suggestions)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function applySuggestion(s: CategorySuggestion) {
    const chain = buildChain(categories, s.categoryId)
    setL1(chain[0]?.id ?? null)
    setL2(chain[1]?.id ?? null)
    setL3(chain[2]?.id ?? null)
    await save({ category_id: s.categoryId, category_confidence: s.confidence })
    await flipChecklist("categorized", true)
    setSuggestions(null)
  }

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <h2 className="text-[0.9375rem] font-semibold tracking-tight">Category</h2>
          <p className="text-xs text-muted-foreground">
            Drill L1 → L2 → L3, or take an AI suggestion.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={runSuggest} disabled={busy}>
          <Sparkles /> Suggest
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <CategorySelect
          label="Level 1"
          value={l1}
          options={l1Options}
          onChange={(v) => {
            setL1(v)
            setL2(null)
            setL3(null)
            void saveCategory(v)
          }}
        />
        <CategorySelect
          label="Level 2"
          value={l2}
          options={l2Options}
          disabled={!l1}
          onChange={(v) => {
            setL2(v)
            setL3(null)
            void saveCategory(v ?? l1)
          }}
        />
        <CategorySelect
          label="Level 3"
          value={l3}
          options={l3Options}
          disabled={!l2}
          onChange={(v) => {
            setL3(v)
            void saveCategory(v ?? l2 ?? l1)
          }}
        />
      </div>

      {(error || saveError) && (
        <div className="text-xs text-red-700 bg-red-50 ring-1 ring-red-200 rounded-md px-3 py-2">
          {error ?? saveError}
        </div>
      )}

      {suggestions && (
        <div className="rounded-lg border border-violet-200 bg-violet-50/40 p-3 space-y-2">
          <div className="text-xs font-semibold text-violet-800 inline-flex items-center gap-1.5">
            <Sparkles className="size-3.5" /> Top suggestions
          </div>
          <ul className="space-y-1.5">
            {suggestions.map((s) => (
              <li
                key={s.categoryId}
                className="flex items-center justify-between gap-3 rounded-md bg-white ring-1 ring-violet-200 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{s.path.join(" › ")}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {Math.round(s.confidence * 100)}% confidence
                  </div>
                </div>
                <Button type="button" size="xs" onClick={() => applySuggestion(s)}>
                  Apply
                </Button>
              </li>
            ))}
            {suggestions.length === 0 && (
              <li className="text-xs text-muted-foreground italic">No suggestions returned.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

function CategorySelect({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string
  value: string | null
  options: StudioCategory[]
  onChange: (v: string | null) => void
  disabled?: boolean
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted-foreground mb-1">{label}</span>
      <select
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background disabled:opacity-50 disabled:bg-muted/50"
      >
        <option value="">— select —</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  )
}

function buildChain(categories: StudioCategory[], leafId: string | null): StudioCategory[] {
  if (!leafId) return []
  const map = new Map(categories.map((c) => [c.id, c]))
  const chain: StudioCategory[] = []
  let cursor: StudioCategory | undefined = map.get(leafId)
  while (cursor) {
    chain.unshift(cursor)
    cursor = cursor.parent_id ? map.get(cursor.parent_id) : undefined
  }
  return chain
}
