"use client"

import Link from "next/link"
import { ArrowRight, Clock, type LucideIcon } from "lucide-react"

/**
 * Shared placeholder component for ETS-scoped universal modules that
 * aren't built yet. Navigation is handled by the top nav (7 sections
 * with sub-item rows) plus the right WorkspaceDock — no per-page SubNav
 * needed.
 */

export interface ModuleStubProps {
  icon: LucideIcon
  title: string
  /** Short line that describes what this module will do once built. */
  description: string
  /** The legacy cross-venture route (e.g. "/workspace/chat"). Rendered as a subtle escape hatch. */
  legacyHref: string
}

export function EtsModuleStub({
  icon: Icon,
  title,
  description,
  legacyHref,
}: ModuleStubProps) {
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
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 md:p-12 flex flex-col items-center justify-center text-center gap-4">
        <span className="inline-flex size-12 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700">
          <Icon className="size-6" />
        </span>
        <div>
          <h2 className="text-lg font-semibold">Coming soon</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
            An ETS-scoped <span className="font-medium text-foreground">{title}</span> is being built.
            It will filter to this venture's data only.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="size-3.5" />
          Scaffolded · route reserved · data wiring pending
        </div>
      </div>

      <div className="rounded-lg border border-border/80 bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">Need it now? Use the cross-venture view</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              The legacy route is unscoped (all ventures combined) but fully
              functional today.
            </p>
          </div>
          <Link
            href={legacyHref}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline shrink-0 whitespace-nowrap"
          >
            Open {title} <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}
