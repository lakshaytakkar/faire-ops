import { type ReactNode, type ElementType } from "react"
import { cn } from "@/lib/utils"

export function KPIGrid({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-3", className)}>
      {children}
    </div>
  )
}

const ICON_TONE: Record<string, string> = {
  emerald: "text-emerald-600 bg-emerald-50",
  amber: "text-amber-600 bg-amber-50",
  red: "text-red-600 bg-red-50",
  blue: "text-blue-600 bg-blue-50",
  violet: "text-violet-600 bg-violet-50",
  slate: "text-slate-600 bg-slate-50",
  pink: "text-pink-600 bg-pink-50",
  orange: "text-orange-600 bg-orange-50",
  cyan: "text-cyan-600 bg-cyan-50",
  teal: "text-teal-600 bg-teal-50",
}

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  iconTone = "slate",
  className,
}: {
  label: string
  value: string
  hint?: string
  icon?: ElementType
  iconTone?: string
  className?: string
}) {
  const tone = ICON_TONE[iconTone] ?? ICON_TONE.slate
  return (
    <div className={cn("rounded-xl border bg-white p-4 space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        {Icon && (
          <span className={cn("inline-flex items-center justify-center h-7 w-7 rounded-lg", tone)}>
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
