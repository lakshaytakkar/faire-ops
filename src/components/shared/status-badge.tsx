import { type ReactNode } from "react"
import { cn } from "@/lib/utils"

export type StatusTone = "emerald" | "amber" | "red" | "blue" | "slate" | "violet"

const TONE_CLASSES: Record<StatusTone, string> = {
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
}

export function StatusBadge({
  tone = "slate",
  children,
  className,
}: {
  tone?: StatusTone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset capitalize",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

const DEFAULT_MAP: Record<string, StatusTone> = {
  // emerald
  live: "emerald",
  active: "emerald",
  ready: "emerald",
  shipped: "emerald",
  completed: "emerald",
  done: "emerald",
  resolved: "emerald",
  approved: "emerald",
  paid: "emerald",
  // amber
  building: "amber",
  "in-progress": "amber",
  in_progress: "amber",
  pending: "amber",
  queued: "amber",
  planned: "amber",
  // red
  error: "red",
  failed: "red",
  at_risk: "red",
  blocked: "red",
  critical: "red",
  cancelled: "red",
  canceled: "red",
  // blue
  planning: "blue",
  "in-review": "blue",
  review: "blue",
  // violet
  deferred: "violet",
  // slate
  inactive: "slate",
  archived: "slate",
  deprecated: "slate",
  "on-hold": "slate",
  "not-started": "slate",
}

export function toneForStatus(value: string | null | undefined): StatusTone {
  if (!value) return "slate"
  const key = value.toLowerCase().replace(/\s+/g, "-")
  return DEFAULT_MAP[key] ?? DEFAULT_MAP[key.replace(/-/g, "_")] ?? "slate"
}
