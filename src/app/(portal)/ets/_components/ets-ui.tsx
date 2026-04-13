"use client"

import { ReactNode, useEffect, useState } from "react"
import { X, ArrowLeft, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

/**
 * Shared UI primitives for /ets/* admin pages.
 *
 * All of them follow the faire-b2b visual language:
 *   - container: max-w-[1440px] mx-auto w-full, space-y-5
 *   - cards: rounded-lg border border-border/80 bg-card shadow-sm
 *   - rows: hover:bg-muted/30, border-b border-border/60, py-3
 *   - badges: bg-<color>-50 text-<color>-700 text-[10px] font-medium
 *   - ETS accent: emerald (green)
 */

// ─── <EtsListShell> ───────────────────────────────────────────────────────────
// Standard list-page skeleton: title, subtitle, primary action, filters slot,
// and a content slot that usually holds a table or grid.

export function EtsListShell({
  title,
  subtitle,
  action,
  filters,
  children,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  filters?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{title}</h1>
            <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 ring-1 ring-inset ring-emerald-200">
              Ets
            </span>
          </div>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      {filters}
      {children}
    </div>
  )
}

// ─── <EtsDetailShell> ─────────────────────────────────────────────────────────
// Detail-page header band: back link, avatar slot, title, meta/badges row,
// actions slot (right side), optional KPI strip, then children.

export function EtsDetailShell({
  backHref,
  backLabel = "Back",
  avatar,
  title,
  subtitle,
  badges,
  actions,
  kpis,
  children,
}: {
  backHref: string
  backLabel?: string
  avatar?: ReactNode
  title: string
  subtitle?: string
  badges?: ReactNode
  actions?: ReactNode
  kpis?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {backLabel}
      </Link>

      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-4 flex items-start gap-4 border-b border-border/60">
          {avatar}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold truncate">{title}</h1>
              {badges}
            </div>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 shrink-0">{actions}</div>
          )}
        </div>
        {kpis && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-border/60 border-b border-border/60">
            {kpis}
          </div>
        )}
      </div>

      {children}
    </div>
  )
}

// ─── <EtsKpi> ─────────────────────────────────────────────────────────────────
// One cell inside the EtsDetailShell.kpis grid.

export function EtsKpi({
  label,
  value,
  hint,
}: {
  label: string
  value: ReactNode
  hint?: string
}) {
  return (
    <div className="px-5 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold">{value ?? "—"}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  )
}

// ─── <EtsTabsPanel> ───────────────────────────────────────────────────────────
// Tabs that live under the detail header. Content for the active tab is
// rendered via `render(activeTab)`.

export interface EtsTab {
  id: string
  label: string
  count?: number
}

export function EtsTabsPanel({
  tabs,
  initial,
  render,
}: {
  tabs: EtsTab[]
  initial?: string
  render: (active: string) => ReactNode
}) {
  const [active, setActive] = useState(initial ?? tabs[0]?.id)
  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-0 border-b border-border/60 overflow-x-auto">
        {tabs.map((t) => {
          const isActive = active === t.id
          return (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={cn(
                "relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              {typeof t.count === "number" && (
                <span className="ml-1.5 inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {t.count}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-emerald-500" />
              )}
            </button>
          )
        })}
      </div>
      <div className="p-5">{render(active)}</div>
    </div>
  )
}

// ─── <EtsEditDrawer> ──────────────────────────────────────────────────────────
// Slide-over panel from the right for create/edit forms. Locks body scroll.

export function EtsEditDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  size?: "md" | "lg"
}) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40"
      onClick={onClose}
    >
      <div
        className={cn(
          "h-full bg-card shadow-xl flex flex-col animate-in slide-in-from-right duration-200",
          size === "md" ? "w-full max-w-md" : "w-full max-w-xl",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 border-b border-border/60 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && (
          <div className="border-t border-border/60 px-5 py-3 flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── <EtsEmptyState> ──────────────────────────────────────────────────────────
// Graceful zero-state with icon + message + optional CTA. Use inside list
// containers or tab panels when a fetch returns no rows.

export function EtsEmptyState({
  icon: Icon,
  title,
  description,
  cta,
}: {
  icon: LucideIcon
  title: string
  description?: string
  cta?: ReactNode
}) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 md:p-10 flex flex-col items-center justify-center text-center gap-3">
      <span className="inline-flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700">
        <Icon className="size-5" />
      </span>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground max-w-md mx-auto">
            {description}
          </p>
        )}
      </div>
      {cta}
    </div>
  )
}

// ─── <EtsStatusBadge> ─────────────────────────────────────────────────────────
// Consistent colored badge for stage / status / payment_status across pages.

const BADGE_COLORS: Record<string, string> = {
  // stage (clients)
  "new-lead": "bg-slate-100 text-slate-700",
  "qualified": "bg-blue-50 text-blue-700",
  "token-paid": "bg-amber-50 text-amber-700",
  "onboarding": "bg-indigo-50 text-indigo-700",
  "onboarded": "bg-emerald-50 text-emerald-700",
  "launched": "bg-emerald-100 text-emerald-800",
  "lost": "bg-rose-50 text-rose-700",
  "refund": "bg-rose-50 text-rose-700",

  // payment status
  paid: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  overdue: "bg-rose-50 text-rose-700",
  refunded: "bg-rose-50 text-rose-700",

  // generic status
  active: "bg-emerald-50 text-emerald-700",
  inactive: "bg-zinc-100 text-zinc-600",
  open: "bg-blue-50 text-blue-700",
  closed: "bg-zinc-100 text-zinc-600",
  resolved: "bg-emerald-50 text-emerald-700",

  // supply chain
  draft: "bg-zinc-100 text-zinc-600",
  ordered: "bg-blue-50 text-blue-700",
  in_transit: "bg-indigo-50 text-indigo-700",
  shipped: "bg-indigo-50 text-indigo-700",
  delivered: "bg-emerald-50 text-emerald-700",
  qc_pass: "bg-emerald-50 text-emerald-700",
  qc_fail: "bg-rose-50 text-rose-700",

  // priority
  low: "bg-slate-100 text-slate-700",
  medium: "bg-amber-50 text-amber-700",
  high: "bg-rose-50 text-rose-700",
  critical: "bg-rose-100 text-rose-800",
}

export function EtsStatusBadge({
  value,
  size = "sm",
  className,
}: {
  value: string | null | undefined
  size?: "xs" | "sm"
  className?: string
}) {
  if (!value) return <span className="text-muted-foreground text-xs">—</span>
  const v = value.toLowerCase().replace(/\s+/g, "-")
  const color = BADGE_COLORS[v] ?? "bg-zinc-100 text-zinc-600"
  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded",
        size === "xs"
          ? "text-[10px] px-1.5 py-0.5"
          : "text-xs px-2 py-0.5",
        color,
        className,
      )}
    >
      {value}
    </span>
  )
}

// ─── <EtsTable> + helpers ─────────────────────────────────────────────────────
// Plain HTML <table> with consistent chrome. Rows pass children; header passes
// column labels.

export function EtsTable({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">{children}</table>
      </div>
    </div>
  )
}

export function EtsTHead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-border/60 bg-muted/30">{children}</tr>
    </thead>
  )
}

export function EtsTH({
  children,
  className,
}: {
  children?: ReactNode
  className?: string
}) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider",
        className,
      )}
    >
      {children}
    </th>
  )
}

export function EtsTR({
  children,
  onClick,
}: {
  children: ReactNode
  onClick?: () => void
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        "border-b border-border/60 last:border-0",
        onClick && "hover:bg-muted/30 cursor-pointer",
      )}
    >
      {children}
    </tr>
  )
}

export function EtsTD({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <td className={cn("px-4 py-3 text-sm align-middle", className)}>
      {children}
    </td>
  )
}

// ─── Utility formatters ───────────────────────────────────────────────────────

export function formatCurrency(n: number | null | undefined, currency = "₹") {
  if (n === null || n === undefined) return "—"
  const num = typeof n === "string" ? parseFloat(n) : n
  if (isNaN(num)) return "—"
  return `${currency}${num.toLocaleString("en-IN")}`
}

export function formatDate(d: string | null | undefined) {
  if (!d) return "—"
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return d
  }
}

export function formatInitials(name: string | null | undefined) {
  if (!name) return "??"
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}
