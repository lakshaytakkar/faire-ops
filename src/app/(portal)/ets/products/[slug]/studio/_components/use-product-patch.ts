"use client"

import { useCallback, useState } from "react"
import { supabaseEts } from "@/lib/supabase"
import type { PublishChecklist } from "@/lib/bhagwati/types"
import type { StudioProduct } from "./types"

/**
 * Tiny shared hook for the Studio tabs.
 *
 * Holds the local product copy (server-loaded into the page, then mirrored
 * here for optimistic editing) and exposes:
 *   - `patch(partial)` — local-only merge
 *   - `save(partial)`  — local merge + Supabase update with optimistic UI
 *   - `flipChecklist(key, value=true)` — common one-key checklist mutation
 */
export function useProductPatch(initial: StudioProduct) {
  const [product, setProduct] = useState<StudioProduct>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const patch = useCallback((p: Partial<StudioProduct>) => {
    setProduct((prev) => ({ ...prev, ...p }))
  }, [])

  const save = useCallback(
    async (p: Partial<StudioProduct>) => {
      setProduct((prev) => ({ ...prev, ...p }))
      setSaving(true)
      setError(null)
      try {
        const { error: err } = await supabaseEts
          .from("products")
          .update({ ...p, updated_at: new Date().toISOString() })
          .eq("id", initial.id)
        if (err) throw err
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setSaving(false)
      }
    },
    [initial.id],
  )

  const flipChecklist = useCallback(
    async (key: keyof PublishChecklist, value = true) => {
      const next: PublishChecklist = {
        image_polished: false,
        name_normalized: false,
        variants_modeled: false,
        prices_inr: false,
        categorized: false,
        source_tagged: false,
        ...(product.publish_checklist ?? {}),
        [key]: value,
      }
      await save({ publish_checklist: next })
    },
    [product.publish_checklist, save],
  )

  return { product, patch, save, flipChecklist, saving, error }
}
