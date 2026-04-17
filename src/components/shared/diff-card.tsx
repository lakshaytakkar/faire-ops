"use client"

import { type ReactNode } from "react"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * Side-by-side diff card for AI-suggested replacements (e.g. ✨ Normalize name).
 *
 * Shows the original on the left, the suggestion on the right, with primary
 * Accept / Reject / (optional) Re-roll actions. Used by Studio Basics tab and
 * any future AI-assist field.
 */
export function DiffCard({
  label,
  original,
  suggestion,
  onAccept,
  onReject,
  onReroll,
  busy,
  extra,
}: {
  label: string
  original: ReactNode
  suggestion: ReactNode
  onAccept: () => void
  onReject: () => void
  onReroll?: () => void
  busy?: boolean
  extra?: ReactNode
}) {
  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/40 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-violet-200/70 bg-violet-50">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-800">
          <Sparkles className="size-3.5" /> {label}
        </span>
        <div className="flex items-center gap-1.5">
          {onReroll && (
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={onReroll}
              disabled={busy}
            >
              Re-roll
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={onReject}
            disabled={busy}
          >
            Reject
          </Button>
          <Button
            type="button"
            variant="default"
            size="xs"
            onClick={onAccept}
            disabled={busy}
          >
            Accept
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-violet-200/70">
        <div className="p-3 space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Original
          </div>
          <div className="text-sm text-foreground/80 whitespace-pre-wrap break-words">
            {original || <span className="text-muted-foreground italic">empty</span>}
          </div>
        </div>
        <div className="p-3 space-y-1 bg-white/70">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-violet-700">
            Suggestion
          </div>
          <div className="text-sm font-medium text-foreground whitespace-pre-wrap break-words">
            {suggestion || <span className="text-muted-foreground italic">empty</span>}
          </div>
        </div>
      </div>
      {extra && (
        <div className="px-4 py-2 border-t border-violet-200/70 bg-violet-50/60 text-xs text-muted-foreground">
          {extra}
        </div>
      )}
    </div>
  )
}
