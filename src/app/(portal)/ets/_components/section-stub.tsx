"use client"

import { Clock, type LucideIcon } from "lucide-react"

/**
 * Shared placeholder for ETS admin sub-pages that are scaffolded but
 * not yet built. Navigation is handled by the top nav (section +
 * sub-item row) — no per-page SubNav here.
 *
 * Used by routes like /ets/sales/proposals, /ets/supply/launches,
 * /ets/catalog/collections, etc.
 */

export interface SectionStubProps {
  icon: LucideIcon
  title: string
  description: string
  /** e.g. "ets.launch_batches + ets.launch_batch_stores" */
  tableHint?: string
}

export function EtsSectionStub({
  icon: Icon,
  title,
  description,
  tableHint,
}: SectionStubProps) {
  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{title}</h1>
          <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 ring-1 ring-inset ring-emerald-200">
            Ets
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 md:p-12 flex flex-col items-center justify-center text-center gap-4">
        <span className="inline-flex size-12 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700">
          <Icon className="size-6" />
        </span>
        <div>
          <h2 className="text-lg font-semibold">Coming soon</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
            {description}
          </p>
        </div>
        {tableHint && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            Data source: <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px]">{tableHint}</code>
          </div>
        )}
      </div>
    </div>
  )
}
