"use client"

import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

// Hero header used by detail pages — consistent title + subtitle + icon
// slot + right-side actions + optional meta row. See SPACE_PATTERN.md §4.
// Replaces hand-rolled hero boxes in development/usdrop detail pages.

export interface HeroCardProps {
  title: string
  subtitle?: string
  /** Optional leading icon (rendered in a rounded square). */
  icon?: LucideIcon
  /** Optional avatar / logo ReactNode in place of the icon. */
  avatar?: ReactNode
  /** Right-side action cluster (buttons, menus). */
  actions?: ReactNode
  /** Meta row below the title (status badges, breadcrumbs, tags). */
  meta?: ReactNode
  /** Tone for the icon background — matches MetricCard palette. */
  tone?: "blue" | "emerald" | "amber" | "red" | "violet" | "slate"
  className?: string
}

const TONE_BG: Record<NonNullable<HeroCardProps["tone"]>, string> = {
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  red: "bg-red-50 text-red-700 border-red-200",
  violet: "bg-violet-50 text-violet-700 border-violet-200",
  slate: "bg-slate-50 text-slate-700 border-slate-200",
}

export function HeroCard({
  title,
  subtitle,
  icon: Icon,
  avatar,
  actions,
  meta,
  tone = "slate",
  className,
}: HeroCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card px-5 py-4",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {avatar ? (
            <div className="shrink-0">{avatar}</div>
          ) : Icon ? (
            <div
              className={cn(
                "shrink-0 h-11 w-11 rounded-md border flex items-center justify-center",
                TONE_BG[tone],
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold font-heading text-foreground tracking-tight leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            )}
            {meta && <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div>}
          </div>
        </div>
        {actions && (
          <div className="shrink-0 flex items-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  )
}
