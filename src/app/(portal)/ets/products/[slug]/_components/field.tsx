"use client"

import { type ReactNode } from "react"
import { Check, AlertCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { type FieldState } from "./use-autosave"

/**
 * <Field> — label + inline save status indicator. Used for every editable field
 * on the product detail form.
 */
export function Field({
  label,
  hint,
  state,
  onRetry,
  children,
  className,
}: {
  label: string
  hint?: string
  state?: FieldState
  onRetry?: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-medium text-muted-foreground">
          {label}
        </label>
        <FieldSaveIndicator state={state} onRetry={onRetry} />
      </div>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function FieldSaveIndicator({
  state,
  onRetry,
}: {
  state?: FieldState
  onRetry?: () => void
}) {
  if (!state || state.status === "idle") return null
  if (state.status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Saving…
      </span>
    )
  }
  if (state.status === "saved") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 transition-opacity">
        <Check className="size-3" /> Saved
      </span>
    )
  }
  // error
  return (
    <span
      className="inline-flex items-center gap-1 text-xs text-red-600"
      title={state.error ?? "Save failed"}
    >
      <AlertCircle className="size-3" />
      Error —
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="underline hover:no-underline"
        >
          retry
        </button>
      ) : (
        <span>retry</span>
      )}
    </span>
  )
}
