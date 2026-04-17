import { cn } from "@/lib/utils"

export type PerformanceTag = "dark_green" | "green" | "yellow" | "red"

const DOT_CLASSES: Record<PerformanceTag, string> = {
  dark_green: "bg-emerald-700 ring-emerald-700/20",
  green: "bg-emerald-500 ring-emerald-500/20",
  yellow: "bg-amber-500 ring-amber-500/20",
  red: "bg-rose-500 ring-rose-500/20",
}

const LABELS: Record<PerformanceTag, string> = {
  dark_green: "Standout",
  green: "On track",
  yellow: "Watch",
  red: "Non-performance flag",
}

export function PerformanceDot({
  tag,
  size = "sm",
  className,
  showRing = true,
}: {
  tag: PerformanceTag | null | undefined
  size?: "xs" | "sm" | "md"
  className?: string
  showRing?: boolean
}) {
  if (!tag) return null
  const sizeCls = size === "xs" ? "size-1.5" : size === "md" ? "size-2.5" : "size-2"
  return (
    <span
      aria-label={LABELS[tag]}
      title={LABELS[tag]}
      className={cn(
        "inline-block rounded-full",
        sizeCls,
        DOT_CLASSES[tag],
        showRing && "ring-2 ring-white/70",
        className,
      )}
    />
  )
}

export function performanceLabel(tag: PerformanceTag | null | undefined): string {
  return tag ? LABELS[tag] : ""
}
