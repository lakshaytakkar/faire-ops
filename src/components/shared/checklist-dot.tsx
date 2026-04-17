import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Tiny status indicator used by publish-readiness checklists.
 *
 * - `done=true`  → green check disk
 * - `done=false` → red empty disk with an X
 *
 * Always renders at the same `size-4` footprint so it lines up cleanly inside
 * tables, lists, and detail rails.
 */
export function ChecklistDot({
  done,
  size = "md",
  label,
  className,
}: {
  done: boolean
  size?: "sm" | "md"
  label?: string
  className?: string
}) {
  const sz = size === "sm" ? "size-3.5" : "size-4"
  const ico = size === "sm" ? "size-2.5" : "size-3"
  return (
    <span
      title={label}
      aria-label={label ?? (done ? "done" : "not done")}
      className={cn(
        "inline-flex items-center justify-center rounded-full ring-1 ring-inset shrink-0",
        sz,
        done
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-red-50 text-red-700 ring-red-200",
        className,
      )}
    >
      {done ? <Check className={ico} /> : <X className={ico} />}
    </span>
  )
}
