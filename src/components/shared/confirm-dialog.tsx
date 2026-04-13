"use client"

/**
 * Reusable confirm dialog for destructive actions.
 * Portaled, backdrop-blur, Esc closes, focus trapped on the confirm button.
 *
 * Uses the portal's shared tokens — same sizing/spacing as the other
 * modals (CreateChannelModal, Cmd+K switcher) so it looks native.
 */

import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { AlertTriangle, X } from "lucide-react"

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  /** "destructive" renders the confirm button in destructive colors. */
  tone?: "destructive" | "default"
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void | Promise<void>
  onCancel: () => void
  /** While true, the confirm button shows a spinner + is disabled. */
  busy?: boolean
}

export function ConfirmDialog({
  open,
  title,
  description,
  tone = "default",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  busy,
}: ConfirmDialogProps) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    // Focus the confirm button so Enter triggers the default action.
    requestAnimationFrame(() => confirmBtnRef.current?.focus())
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault()
        if (!busy) onCancel()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onCancel, busy])

  if (!open || typeof window === "undefined") return null

  const isDestructive = tone === "destructive"

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby={description ? "confirm-dialog-desc" : undefined}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4 animate-[toolbarIn_120ms_ease-out]"
      onClick={() => {
        if (!busy) onCancel()
      }}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border/80 bg-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 px-5 pt-5 pb-3">
          {isDestructive ? (
            <div className="h-10 w-10 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2
              id="confirm-dialog-title"
              className="text-base font-bold font-heading text-foreground leading-tight"
            >
              {title}
            </h2>
            {description && (
              <p
                id="confirm-dialog-desc"
                className="mt-1 text-sm text-muted-foreground leading-snug"
              >
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label="Close dialog"
            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors active:scale-95 disabled:opacity-50 shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 pb-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="h-9 px-4 rounded-md border border-border/80 bg-background text-sm font-medium text-foreground hover:bg-muted/40 transition-colors active:scale-95 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={() => {
              if (!busy) onConfirm()
            }}
            disabled={busy}
            className={`h-9 px-4 rounded-md text-sm font-medium transition-colors active:scale-95 disabled:opacity-50 inline-flex items-center gap-2 ${
              isDestructive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {busy && (
              <div
                className={`w-3.5 h-3.5 rounded-full border-2 animate-spin ${
                  isDestructive
                    ? "border-destructive-foreground/30 border-t-destructive-foreground"
                    : "border-primary-foreground/30 border-t-primary-foreground"
                }`}
                aria-hidden="true"
              />
            )}
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
