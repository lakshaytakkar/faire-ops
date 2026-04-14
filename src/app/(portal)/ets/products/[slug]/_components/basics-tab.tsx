"use client"

import { useEffect, useState } from "react"
import { X as XIcon, Plus } from "lucide-react"
import { supabaseEts } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/shared/status-badge"
import { Field } from "./field"
import { type ProductRow } from "./product-row"
import { type AutosaveHandle } from "./use-autosave"

export function BasicsTab({
  row,
  patch,
  autosave,
}: {
  row: ProductRow
  patch: (p: Partial<ProductRow>) => void
  autosave: AutosaveHandle
}) {
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabaseEts
        .from("products")
        .select("category")
        .not("category", "is", null)
        .limit(500)
      if (cancelled) return
      const set = new Set<string>()
      ;(data ?? []).forEach((r: { category: string | null }) => {
        if (r.category) set.add(r.category)
      })
      setCategories(Array.from(set).sort())
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <Field
        label="Name (EN)"
        state={autosave.statuses.name_en}
        onRetry={() => autosave.save("name_en", row.name_en)}
      >
        <Input
          defaultValue={row.name_en ?? ""}
          onChange={(e) => patch({ name_en: e.target.value })}
          onBlur={(e) => autosave.save("name_en", e.target.value || null)}
        />
      </Field>

      <Field
        label="Name (CN)"
        state={autosave.statuses.name_cn}
        onRetry={() => autosave.save("name_cn", row.name_cn)}
      >
        <Input
          defaultValue={row.name_cn ?? ""}
          onChange={(e) => patch({ name_cn: e.target.value })}
          onBlur={(e) => autosave.save("name_cn", e.target.value || null)}
        />
      </Field>

      <Field
        label="Category"
        state={autosave.statuses.category}
        onRetry={() => autosave.save("category", row.category)}
      >
        <input
          list="ets-category-list"
          defaultValue={row.category ?? ""}
          onChange={(e) => patch({ category: e.target.value })}
          onBlur={(e) => autosave.save("category", e.target.value || null)}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <datalist id="ets-category-list">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>

      <Field
        label="Material"
        state={autosave.statuses.material}
        onRetry={() => autosave.save("material", row.material)}
      >
        <Input
          defaultValue={row.material ?? ""}
          onChange={(e) => patch({ material: e.target.value })}
          onBlur={(e) => autosave.save("material", e.target.value || null)}
        />
      </Field>

      <Field
        label="Description"
        state={autosave.statuses.description}
        className="md:col-span-2"
        onRetry={() => autosave.save("description", row.description)}
      >
        <textarea
          defaultValue={row.description ?? ""}
          onChange={(e) => patch({ description: e.target.value })}
          onBlur={(e) => autosave.save("description", e.target.value || null)}
          rows={4}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </Field>

      <Field
        label="Tags"
        hint="Press Enter to add. Tags are stored as a JSONB array and shown on the client portal."
        state={autosave.statuses.tags}
        className="md:col-span-2"
        onRetry={() => autosave.save("tags", row.tags)}
      >
        <TagInput
          value={row.tags ?? []}
          onChange={(next) => {
            patch({ tags: next })
            autosave.save("tags", next)
          }}
        />
      </Field>
    </div>
  )
}

function TagInput({
  value,
  onChange,
}: {
  value: string[]
  onChange: (next: string[]) => void
}) {
  const [draft, setDraft] = useState("")

  function add() {
    const t = draft.trim()
    if (!t || value.includes(t)) {
      setDraft("")
      return
    }
    onChange([...value, t])
    setDraft("")
  }

  return (
    <div className="rounded-lg border border-input bg-transparent px-2 py-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {value.map((t) => (
          <StatusBadge key={t} tone="slate">
            <span className="inline-flex items-center gap-1">
              {t}
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x !== t))}
                className="hover:text-foreground"
                aria-label={`Remove ${t}`}
              >
                <XIcon className="size-3" />
              </button>
            </span>
          </StatusBadge>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              add()
            } else if (e.key === "Backspace" && !draft && value.length > 0) {
              onChange(value.slice(0, -1))
            }
          }}
          placeholder="Add tag…"
          className="flex-1 min-w-[120px] bg-transparent text-sm outline-none py-0.5"
        />
        {draft && (
          <button
            type="button"
            onClick={add}
            className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Plus className="size-3" /> Add
          </button>
        )}
      </div>
    </div>
  )
}
