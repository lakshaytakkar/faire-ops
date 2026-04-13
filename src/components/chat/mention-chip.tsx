"use client"

/**
 * Chat mention chips (admin portal).
 *
 *   User mentions render as a tiny inline pill (breaks inline with text).
 *   Order mentions render as a block-level card (~3x the old pill height)
 *   on its own line inside the chat message — Slack-style link unfurl.
 *
 * Admin portal shows retail totals. Vendor portal ships a parallel file
 * that hides them. Fetch cache is shared module-scope to dedupe.
 */

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Package,
  User as UserIcon,
  ArrowUpRight,
  MapPin,
  Clock,
  ShoppingBag,
} from "lucide-react"
import type { Mention } from "@/lib/mentions"
import { supabaseB2B } from "@/lib/supabase"

interface OrderSummary {
  id: string
  faire_order_id: string
  display_id: string | null
  item_count: number | null
  state: string
  quote_status: string | null
  total_cents: number | null
  faire_created_at: string | null
  shipping_address: Record<string, unknown> | null
}

const orderCache = new Map<string, OrderSummary | null>()
const inflight = new Map<string, Promise<OrderSummary | null>>()

async function fetchOrder(faireOrderId: string): Promise<OrderSummary | null> {
  if (orderCache.has(faireOrderId)) return orderCache.get(faireOrderId) ?? null
  const existing = inflight.get(faireOrderId)
  if (existing) return existing
  const promise = (async () => {
    const { data } = await supabaseB2B
      .from("faire_orders")
      .select(
        "id, faire_order_id, display_id, item_count, state, quote_status, total_cents, faire_created_at, shipping_address",
      )
      .eq("faire_order_id", faireOrderId)
      .maybeSingle()
    const result = (data ?? null) as OrderSummary | null
    orderCache.set(faireOrderId, result)
    inflight.delete(faireOrderId)
    return result
  })()
  inflight.set(faireOrderId, promise)
  return promise
}

export function MentionChip({ mention }: { mention: Mention }) {
  if (mention.kind === "user") {
    return (
      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium bg-primary/10 text-primary ring-1 ring-inset ring-primary/20 align-baseline">
        <UserIcon className="h-3 w-3" />
        {mention.label ?? mention.id}
      </span>
    )
  }
  if (mention.kind === "order") {
    return <OrderCard id={mention.id} label={mention.label} />
  }
  return null
}

function formatCents(cents: number | null | undefined): string {
  if (cents == null) return "—"
  return `$${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function shipToText(address: Record<string, unknown> | null): string | null {
  if (!address) return null
  const city = address.city as string | undefined
  const state = (address.state_code ?? address.state) as string | undefined
  if (!city && !state) return null
  return [city, state].filter(Boolean).join(", ")
}

function formatRelative(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  const now = new Date()
  const diffDay = Math.floor(
    (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
  )
  if (diffDay === 0) return "today"
  if (diffDay === 1) return "yesterday"
  if (diffDay < 7) return `${diffDay}d ago`
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function OrderCard({ id, label }: { id: string; label?: string }) {
  const [order, setOrder] = useState<OrderSummary | null | undefined>(undefined)
  useEffect(() => {
    let cancelled = false
    fetchOrder(id).then((o) => {
      if (!cancelled) setOrder(o)
    })
    return () => {
      cancelled = true
    }
  }, [id])

  if (order === null) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium bg-muted/60 text-muted-foreground ring-1 ring-inset ring-border/60 align-baseline"
        title={`Order ${id} not found`}
      >
        <Package className="h-3 w-3" />
        {label ?? id}
      </span>
    )
  }

  if (order === undefined) {
    return (
      <span className="block my-2 rounded-md border border-dashed border-border/60 bg-muted/20 px-4 py-3 animate-pulse max-w-md">
        <span className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-md bg-muted" />
          <span className="flex-1 space-y-1.5">
            <span className="block h-3 w-24 rounded bg-muted" />
            <span className="block h-3 w-40 rounded bg-muted/70" />
          </span>
        </span>
      </span>
    )
  }

  const displayId = order.display_id ?? order.faire_order_id
  const shipTo = shipToText(order.shipping_address)
  const created = formatRelative(order.faire_created_at)

  return (
    <Link
      href={`/orders/${order.faire_order_id}`}
      className="group block my-2 max-w-md rounded-md border border-border/80 bg-card shadow-sm hover:border-foreground/20 hover:shadow-md transition-all overflow-hidden no-underline"
      aria-label={`Open order ${displayId}`}
    >
      {/* Row 1 — title + action */}
      <div className="flex items-start gap-3 px-4 py-3 border-b border-border/60">
        <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Package className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold text-foreground truncate">
              #{displayId}
            </span>
            <StatusPill state={order.state} quote={order.quote_status} />
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Order · click to open
          </p>
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>

      {/* Row 2 — totals + ship-to + date */}
      <div className="px-4 py-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <ShoppingBag className="h-3 w-3" />
          <span className="text-foreground font-medium">
            {order.item_count ?? 0} {order.item_count === 1 ? "item" : "items"}
          </span>
          <span className="opacity-60">·</span>
          <span className="text-foreground font-medium tabular-nums">
            {formatCents(order.total_cents)}
          </span>
        </span>
        {shipTo && (
          <span className="inline-flex items-center gap-1.5 justify-end">
            <MapPin className="h-3 w-3" />
            <span className="truncate text-foreground">{shipTo}</span>
          </span>
        )}
        {created && (
          <span className="inline-flex items-center gap-1.5 col-span-2">
            <Clock className="h-3 w-3" />
            <span>Created {created}</span>
          </span>
        )}
      </div>
    </Link>
  )
}

function StatusPill({
  state,
  quote,
}: {
  state: string
  quote: string | null
}) {
  // Quote sub-status is the more actionable signal — show it when set,
  // fall back to Faire's state label otherwise.
  const active = quote && quote !== "none" ? quote : state
  const tone = pillTone(active)
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ring-1 ring-inset ${tone}`}
    >
      {active.replace(/_/g, " ")}
    </span>
  )
}

function pillTone(status: string): string {
  const s = status.toLowerCase()
  if (
    s === "delivered" ||
    s === "shipped" ||
    s === "ready_to_ship" ||
    s === "payment_confirmed"
  ) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200"
  }
  if (
    s === "canceled" ||
    s === "rejected" ||
    s === "substitution_needed"
  ) {
    return "bg-red-50 text-red-700 ring-red-200"
  }
  if (
    s === "requested" ||
    s === "payment_pending" ||
    s === "sourcing" ||
    s === "pre_transit" ||
    s === "in_transit"
  ) {
    return "bg-amber-50 text-amber-700 ring-amber-200"
  }
  return "bg-muted/60 text-muted-foreground ring-border/60"
}
