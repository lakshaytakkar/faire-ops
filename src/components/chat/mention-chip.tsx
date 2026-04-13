"use client"

/**
 * Mention chip for the admin portal. Mirrors the vendor portal's
 * implementation but links into faire-ops's /orders/[id] route rather
 * than the vendor portal's scoped view. Shared cache keyed by
 * faire_order_id so the same mention mentioned in multiple messages
 * fetches once per session.
 */

import { useEffect, useState } from "react"
import Link from "next/link"
import { Package, User as UserIcon } from "lucide-react"
import type { Mention } from "@/lib/mentions"
import { supabaseB2B } from "@/lib/supabase"

interface OrderSummary {
  id: string
  faire_order_id: string
  display_id: string | null
  item_count: number | null
  state: string
  quote_status: string | null
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
      .select("id, faire_order_id, display_id, item_count, state, quote_status")
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
    return <OrderChip id={mention.id} label={mention.label} />
  }
  return null
}

function OrderChip({ id, label }: { id: string; label?: string }) {
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
      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium bg-primary/5 text-primary/60 ring-1 ring-inset ring-primary/10 align-baseline animate-pulse">
        <Package className="h-3 w-3" />
        {label ?? id}
      </span>
    )
  }

  const status = order.quote_status ?? order.state
  const displayId = order.display_id ?? order.faire_order_id

  return (
    <Link
      href={`/orders/${order.id}`}
      className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs font-medium bg-primary/10 text-primary ring-1 ring-inset ring-primary/20 hover:bg-primary/15 hover:underline transition-colors align-baseline"
      title={`Open order ${displayId}`}
    >
      <Package className="h-3 w-3" />
      <span>#{displayId}</span>
      {order.item_count != null && (
        <>
          <span className="opacity-60">·</span>
          <span className="opacity-80">{order.item_count} items</span>
        </>
      )}
      {status && (
        <>
          <span className="opacity-60">·</span>
          <span className="opacity-80 truncate max-w-[120px]">{status}</span>
        </>
      )}
    </Link>
  )
}
