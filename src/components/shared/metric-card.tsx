import { type ReactNode } from "react"
import Link from "next/link"
import { type LucideIcon, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

type Trend = "up" | "down" | "flat"

const TREND_META: Record<Trend, { icon: LucideIcon; className: string }> = {
  up: { icon: ArrowUpRight, className: "text-emerald-600" },
  down: { icon: ArrowDownRight, className: "text-red-600" },
  flat: { icon: Minus, className: "text-muted-foreground" },
}

export function MetricCard({
  label,
  value,
  delta,
  trend,
  icon: Icon,
  iconTone = "slate",
  href,
  hint,
}: {
  label: string
  value: ReactNode
  delta?: string
  trend?: Trend
  icon?: LucideIcon
  iconTone?: "emerald" | "amber" | "red" | "blue" | "slate" | "violet"
  href?: string
  hint?: string
}) {
  const TrendIcon = trend ? TREND_META[trend].icon : null
  const iconBg: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    blue: "bg-blue-50 text-blue-600",
    slate: "bg-slate-100 text-slate-600",
    violet: "bg-violet-50 text-violet-600",
  }

  const body = (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between gap-3 h-full">
      <div className="min-w-0 space-y-1">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold font-heading text-foreground leading-tight">
          {value ?? "—"}
        </div>
        {(delta || hint) && (
          <div className="flex items-center gap-1 text-xs">
            {TrendIcon && trend && (
              <TrendIcon className={cn("size-3.5", TREND_META[trend].className)} />
            )}
            {delta && <span className={cn("font-medium", trend && TREND_META[trend].className)}>{delta}</span>}
            {hint && <span className="text-muted-foreground">{hint}</span>}
          </div>
        )}
      </div>
      {Icon && (
        <span className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", iconBg[iconTone])}>
          <Icon className="size-4" />
        </span>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block transition-shadow hover:shadow-md">
        {body}
      </Link>
    )
  }
  return body
}
