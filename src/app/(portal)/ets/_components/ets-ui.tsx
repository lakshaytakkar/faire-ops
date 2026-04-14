"use client"

import { ReactNode, useState } from "react"
import { ArrowLeft, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"

/**
 * Shared UI primitives for /ets/* admin pages.
 *
 * These are thin adapters over shadcn primitives so every ETS page renders in
 * the same visual language as the rest of the app — no venture-specific
 * branding, no hardcoded accent colors.
 */

// ─── <EtsListShell> ───────────────────────────────────────────────────────────

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
          <h1 className="font-heading text-2xl font-semibold">{title}</h1>
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

      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-4 flex items-start gap-4 border-b">
          {avatar}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-heading text-xl font-semibold truncate">
                {title}
              </h1>
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x border-b">
            {kpis}
          </div>
        )}
      </div>

      {children}
    </div>
  )
}

// ─── <EtsKpi> ─────────────────────────────────────────────────────────────────

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
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value ?? "—"}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}

// ─── <EtsTabsPanel> ───────────────────────────────────────────────────────────

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
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-0 border-b overflow-x-auto">
        {tabs.map((t) => {
          const isActive = active === t.id
          return (
            <button
              key={t.id}
              type="button"
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
                <Badge variant="outline" className="ml-1.5">
                  {t.count}
                </Badge>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-primary" />
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
// @deprecated — use `EditDrawer` from `@/components/shared/edit-drawer` in new
// code. This thin re-export keeps existing ETS callers compiling. New spaces
// must NOT import from this file (see SPACE_PATTERN.md §2).

import { EditDrawer as SharedEditDrawer } from "@/components/shared/edit-drawer"
export const EtsEditDrawer = SharedEditDrawer

// ─── <EtsEmptyState> ──────────────────────────────────────────────────────────

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
    <div className="rounded-lg border border-dashed bg-muted/20 p-8 md:p-10 flex flex-col items-center justify-center text-center gap-3">
      <span className="inline-flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
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

type BadgeVariant = "default" | "secondary" | "destructive" | "outline"

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  // danger / failure / terminal-negative states
  lost: "destructive",
  refund: "destructive",
  refunded: "destructive",
  overdue: "destructive",
  rejected: "destructive",
  qc_fail: "destructive",
  cancelled: "destructive",
  critical: "destructive",
  high: "destructive",
  failed: "destructive",

  // success / completed states
  paid: "secondary",
  completed: "secondary",
  delivered: "secondary",
  verified: "secondary",
  resolved: "secondary",
  onboarded: "secondary",
  qc_pass: "secondary",
  approved: "secondary",

  // active / live (highlighted default)
  launched: "default",
  active: "default",
  live: "default",

  // neutral / pending / draft / open — fall through to outline (default)
}

export function EtsStatusBadge({
  value,
  size: _size,
  className,
}: {
  value: string | null | undefined
  size?: "xs" | "sm"
  className?: string
}) {
  if (!value) return <span className="text-muted-foreground text-xs">—</span>
  const key = value.toLowerCase().replace(/\s+/g, "-").replace(/-/g, "_")
  const altKey = value.toLowerCase().replace(/\s+/g, "-")
  const variant: BadgeVariant =
    STATUS_VARIANTS[key] ?? STATUS_VARIANTS[altKey] ?? "outline"
  return (
    <Badge variant={variant} className={cn("capitalize", className)}>
      {value}
    </Badge>
  )
}

// ─── <EtsTable> + helpers (shadcn Table re-exports) ──────────────────────────

export function EtsTable({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      <Table>{children}</Table>
    </div>
  )
}

export function EtsTHead({ children }: { children: ReactNode }) {
  return (
    <TableHeader>
      <TableRow className="bg-muted/30 hover:bg-muted/30">{children}</TableRow>
    </TableHeader>
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
    <TableHead
      className={cn("text-xs font-medium text-muted-foreground", className)}
    >
      {children}
    </TableHead>
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
    <TableRow
      onClick={onClick}
      className={cn(onClick && "cursor-pointer")}
    >
      {children}
    </TableRow>
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
    <TableCell className={cn("px-4 py-3 text-sm", className)}>
      {children}
    </TableCell>
  )
}

// ─── Utility formatters ───────────────────────────────────────────────────────

// Formatters now live in @/lib/format.ts so non-ETS spaces can import them
// without cross-space pollution. Re-exported here for back-compat; prefer
// importing from @/lib/format directly. See SPACE_PATTERN.md.
export { formatCurrency, formatDate } from "@/lib/format"

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

// Re-export Button so pages can use the canonical CTA without an extra import.
export { Button }
