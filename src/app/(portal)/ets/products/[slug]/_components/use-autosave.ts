"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { supabaseEts } from "@/lib/supabase"

export type SaveStatus = "idle" | "pending" | "saved" | "error"

export interface FieldState {
  status: SaveStatus
  error?: string | null
}

export interface AutosaveHandle {
  /** Save a single column. Debounced. */
  save: (column: string, value: unknown) => void
  /** Flush all pending debounced saves immediately. */
  flush: () => Promise<void>
  /** Per-field save status — rerenders on change. */
  statuses: Record<string, FieldState>
  /** True if any field is pending. */
  hasPending: boolean
  /** Called after a successful save with the fresh updated_at. */
  onSaved: (handler: (updatedAt: string | null) => void) => void
}

/**
 * Per-field debounced autosave for a single ets.products row.
 *
 * - Each `save(col, value)` resets a 300ms timer keyed by column.
 * - On fire, it performs `.update({ [col]: value }).eq("id", id)` and returns
 *   the fresh `updated_at`.
 * - Optimistic UI: caller owns the value; we expose status for inline feedback.
 */
export function useAutosave(productId: string | null | undefined): AutosaveHandle {
  const [statuses, setStatuses] = useState<Record<string, FieldState>>({})
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const pendingValuesRef = useRef<Record<string, unknown>>({})
  const savedHandlerRef = useRef<((updatedAt: string | null) => void) | null>(null)

  const hasPending = Object.values(statuses).some((s) => s.status === "pending")

  const runSave = useCallback(
    async (column: string) => {
      if (!productId) return
      const value = pendingValuesRef.current[column]
      delete pendingValuesRef.current[column]
      try {
        const { data, error } = await supabaseEts
          .from("products")
          .update({ [column]: value, updated_at: new Date().toISOString() })
          .eq("id", productId)
          .select("updated_at")
          .maybeSingle()
        if (error) throw error
        setStatuses((prev) => ({
          ...prev,
          [column]: { status: "saved", error: null },
        }))
        if (data?.updated_at && savedHandlerRef.current) {
          savedHandlerRef.current(data.updated_at)
        }
        // Fade the "Saved ✓" after 1.5s.
        setTimeout(() => {
          setStatuses((prev) => {
            if (prev[column]?.status !== "saved") return prev
            return { ...prev, [column]: { status: "idle" } }
          })
        }, 1500)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        setStatuses((prev) => ({
          ...prev,
          [column]: { status: "error", error: msg },
        }))
      }
    },
    [productId],
  )

  const save = useCallback(
    (column: string, value: unknown) => {
      pendingValuesRef.current[column] = value
      setStatuses((prev) => ({
        ...prev,
        [column]: { status: "pending", error: null },
      }))
      const existing = timersRef.current[column]
      if (existing) clearTimeout(existing)
      timersRef.current[column] = setTimeout(() => {
        delete timersRef.current[column]
        void runSave(column)
      }, 300)
    },
    [runSave],
  )

  const flush = useCallback(async () => {
    const cols = Object.keys(timersRef.current)
    for (const col of cols) {
      const t = timersRef.current[col]
      if (t) clearTimeout(t)
      delete timersRef.current[col]
    }
    await Promise.all(cols.map((col) => runSave(col)))
  }, [runSave])

  const onSaved = useCallback((handler: (updatedAt: string | null) => void) => {
    savedHandlerRef.current = handler
  }, [])

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach((t) => clearTimeout(t))
    }
  }, [])

  return { save, flush, statuses, hasPending, onSaved }
}
