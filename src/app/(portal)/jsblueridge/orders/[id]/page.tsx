"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Package, Copy, Mail, Printer, ExternalLink, Truck, ChevronLeft, ChevronRight, Send, FileText, CheckCircle, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"

/* ------------------------------------------------------------------ */
/*  Types & API                                                        */
/* ------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JSBOrder = Record<string, any>

const API = "/api/jsblueridge/data"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function jsbFetch(params: Record<string, string>): Promise<{ data: any[] }> {
  const sp = new URLSearchParams(params)
  const res = await fetch(`${API}?${sp}`)
  return res.json()
}

/* ------------------------------------------------------------------ */
/*  State mappings                                                     */
/* ------------------------------------------------------------------ */

const STATE_BADGE: Record<string, string> = {
  NEW: "bg-amber-50 text-amber-700",
  PROCESSING: "bg-blue-50 text-blue-700",
  PRE_TRANSIT: "bg-blue-50 text-blue-700",
  IN_TRANSIT: "bg-emerald-50 text-emerald-700",
  DELIVERED: "bg-slate-100 text-slate-600",
  CANCELED: "bg-red-50 text-red-700",
}

const STATE_LABEL: Record<string, string> = {
  NEW: "New",
  PROCESSING: "Processing",
  PRE_TRANSIT: "Pre-Transit",
  IN_TRANSIT: "In Transit",
  DELIVERED: "Delivered",
  CANCELED: "Canceled",
}

const TIMELINE_STEPS = [
  { key: "NEW", label: "Placed" },
  { key: "PROCESSING", label: "Accepted" },
  { key: "IN_TRANSIT", label: "Shipped" },
  { key: "DELIVERED", label: "Delivered" },
]

const STATE_ORDER = ["NEW", "PROCESSING", "PRE_TRANSIT", "IN_TRANSIT", "DELIVERED"]

const ACTION_MAP: Record<string, string> = {
  NEW: "Accept Order",
  PROCESSING: "Mark Shipped",
  IN_TRANSIT: "Mark Delivered",
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getRetailerName(order: JSBOrder): string {
  const addr = order.shipping_address as Record<string, unknown> | null
  if (!addr) return "\u2014"
  return (addr.company_name as string) || (addr.name as string) || "\u2014"
}

function getCity(order: JSBOrder): string {
  const addr = order.shipping_address as Record<string, unknown> | null
  if (!addr) return "\u2014"
  return (addr.city as string) || "\u2014"
}

function getState(order: JSBOrder): string {
  const addr = order.shipping_address as Record<string, unknown> | null
  if (!addr) return ""
  return (addr.state as string) || (addr.state_code as string) || ""
}

function getZip(order: JSBOrder): string {
  const addr = order.shipping_address as Record<string, unknown> | null
  if (!addr) return ""
  return (addr.postal_code as string) || (addr.zip as string) || ""
}

function getLine1(order: JSBOrder): string {
  const addr = order.shipping_address as Record<string, unknown> | null
  if (!addr) return ""
  return (addr.address1 as string) || (addr.line1 as string) || ""
}

function getLine2(order: JSBOrder): string {
  const addr = order.shipping_address as Record<string, unknown> | null
  if (!addr) return ""
  return (addr.address2 as string) || (addr.line2 as string) || ""
}

function getPhone(order: JSBOrder): string {
  const addr = order.shipping_address as Record<string, unknown> | null
  if (!addr) return ""
  return (addr.phone_number as string) || (addr.phone as string) || ""
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014"
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function timelineState(orderState: string, stepKey: string) {
  const orderIdx = STATE_ORDER.indexOf(orderState)
  const stepOrderIdx = STATE_ORDER.indexOf(stepKey)
  if (orderIdx >= stepOrderIdx) return "done"
  if (orderIdx === stepOrderIdx - 1) return "current"
  return "upcoming"
}

/* ------------------------------------------------------------------ */
/*  Line items from raw_data                                           */
/* ------------------------------------------------------------------ */

interface LineItem {
  name: string
  sku: string
  qty: number
  unitPriceCents: number
  productId: string
}

function extractLineItems(order: JSBOrder): LineItem[] {
  const raw = order.raw_data as Record<string, unknown> | null
  if (!raw) return []
  const items = (raw.items as unknown[]) || (raw.order_items as unknown[]) || []
  return items.map((item: unknown) => {
    const i = item as Record<string, unknown>
    const qty = (i.quantity as number) || 1
    const priceCents = (i.price_cents as number) || (i.unit_price_cents as number) || 0
    return {
      name: (i.product_name as string) || (i.name as string) || "Item",
      sku: (i.sku as string) || (i.product_id as string) || "",
      qty,
      unitPriceCents: priceCents,
      productId: (i.product_id as string) || "",
    }
  })
}

/* ------------------------------------------------------------------ */
/*  Financials from payout_costs                                       */
/* ------------------------------------------------------------------ */

interface Financials {
  subtotalCents: number
  shippingCents: number
  commissionCents: number
  netPayoutCents: number
}

function extractFinancials(order: JSBOrder): Financials {
  const payout = order.payout_costs as Record<string, unknown> | null
  const subtotalCents = order.total_cents || 0
  if (!payout) {
    return { subtotalCents, shippingCents: 0, commissionCents: 0, netPayoutCents: subtotalCents }
  }
  const commissionCents = (payout.commission_cents as number) || (payout.commission_amount_cents as number) || 0
  const shippingCents = (payout.shipping_cents as number) || (payout.shipping_cost_cents as number) || 0
  const netPayoutCents = (payout.payout_total_cents as number) || (payout.net_payout_cents as number) || subtotalCents - commissionCents
  return { subtotalCents, shippingCents, commissionCents, netPayoutCents }
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function JSBOrderDetailPage() {
  const params = useParams<{ id: string }>()
  const [order, setOrder] = useState<JSBOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [productImages, setProductImages] = useState<Record<string, string>>({})
  const [adjacentIds, setAdjacentIds] = useState<{prev: string | null, next: string | null}>({prev: null, next: null})
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [vendorQuotes, setVendorQuotes] = useState<any[]>([])
  const [requestingQuotes, setRequestingQuotes] = useState(false)
  const [quotesRequested, setQuotesRequested] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [trackingData, setTrackingData] = useState<any>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Fetch order
  useEffect(() => {
    jsbFetch({
      table: "faire_orders",
      select: "*",
      eq: JSON.stringify({ faire_order_id: params.id }),
      limit: "1",
    }).then(({ data }) => {
      if (!data || data.length === 0) {
        setNotFound(true)
      } else {
        setOrder(data[0])
      }
      setLoading(false)
    })
  }, [params.id])

  // Fetch adjacent order IDs for prev/next nav
  useEffect(() => {
    if (!order) return
    jsbFetch({
      table: "faire_orders",
      select: "faire_order_id",
      order: "faire_created_at",
      orderDir: "desc",
      limit: "5000",
    }).then(({ data }) => {
      if (!data) return
      const idx = data.findIndex((o) => o.faire_order_id === params.id)
      setAdjacentIds({
        prev: idx > 0 ? data[idx - 1].faire_order_id : null,
        next: idx < data.length - 1 ? data[idx + 1].faire_order_id : null,
      })
    })
  }, [order, params.id])

  // Fetch product images
  useEffect(() => {
    if (!order) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = (order.raw_data as any)?.items ?? []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const productIds = items.map((i: any) => i.product_id).filter(Boolean)
    if (productIds.length === 0) return
    jsbFetch({
      table: "faire_products",
      select: "faire_product_id, primary_image_url",
      in: JSON.stringify({ faire_product_id: productIds }),
    }).then(({ data }) => {
      const map: Record<string, string> = {}
      for (const p of data ?? []) {
        if (p.primary_image_url) map[p.faire_product_id] = p.primary_image_url
      }
      setProductImages(map)
    })
  }, [order])

  // Fetch vendor quotes
  useEffect(() => {
    if (!order) return
    const quoteStatus = order.quote_status as string | undefined
    if (!quoteStatus || quoteStatus === "none") return
    jsbFetch({
      table: "vendor_quotes",
      select: "*",
      eq: JSON.stringify({ order_id: order.faire_order_id }),
    }).then(({ data }) => {
      setVendorQuotes(data ?? [])
    })
  }, [order])

  // Fetch tracking data
  useEffect(() => {
    if (!order) return
    jsbFetch({
      table: "shipment_tracking",
      select: "*",
      eq: JSON.stringify({ order_id: order.faire_order_id }),
      limit: "1",
    }).then(({ data }) => setTrackingData(data?.[0] ?? null))
  }, [order])

  // Request quotes handler
  async function handleRequestQuotes() {
    if (!order) return
    setRequestingQuotes(true)
    try {
      await fetch("/api/jsblueridge/orders/request-quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: order.faire_order_id }),
      })
      setQuotesRequested(true)
      // Refetch order
      const { data } = await jsbFetch({
        table: "faire_orders",
        select: "*",
        eq: JSON.stringify({ faire_order_id: order.faire_order_id }),
        limit: "1",
      })
      if (data?.[0]) setOrder(data[0])
    } finally {
      setRequestingQuotes(false)
    }
  }

  // Accept / Ship action
  async function handleAction() {
    if (!order) return
    setActionLoading(true)
    try {
      if (order.state === "NEW") {
        await fetch(`/api/jsblueridge/orders/${order.faire_order_id}/accept`, { method: "POST" })
      } else if (order.state === "PROCESSING") {
        await fetch(`/api/jsblueridge/orders/${order.faire_order_id}/ship`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tracking_code: "", carrier: "" }),
        })
      }
      // Refetch order
      const { data } = await jsbFetch({
        table: "faire_orders",
        select: "*",
        eq: JSON.stringify({ faire_order_id: order.faire_order_id }),
        limit: "1",
      })
      if (data?.[0]) setOrder(data[0])
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <div className="h-6 w-16 bg-muted animate-pulse rounded" />
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="h-48 bg-muted animate-pulse rounded-md" />
            <div className="h-64 bg-muted animate-pulse rounded-md" />
          </div>
          <div className="space-y-5">
            <div className="h-40 bg-muted animate-pulse rounded-md" />
            <div className="h-40 bg-muted animate-pulse rounded-md" />
          </div>
        </div>
      </div>
    )
  }

  if (notFound || !order) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-lg font-medium">Order not found</p>
          <Link href="/jsblueridge/orders" className="text-sm text-primary hover:underline mt-2 inline-block">&larr; Back to Orders</Link>
        </div>
      </div>
    )
  }

  const retailerName = getRetailerName(order)
  const lineItems = extractLineItems(order)
  const financials = extractFinancials(order)
  const actionLabel = ACTION_MAP[order.state]
  const itemsTotal = lineItems.reduce((s, i) => s + i.qty * i.unitPriceCents, 0)

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header with actions */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/jsblueridge/orders" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
            <ArrowLeft className="size-3" /> Orders
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-heading">{order.display_id ?? order.faire_order_id}</h1>
            <span className={`border-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATE_BADGE[order.state] ?? "bg-slate-100 text-slate-600"}`}>
              {STATE_LABEL[order.state] ?? order.state}
            </span>
            {order.source && (
              <span className="border-0 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {order.source === "FAIRE_DIRECT" ? "Direct" : "Marketplace"}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {retailerName} &middot; JSBlueRidge &middot; Placed {formatDate(order.faire_created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 mr-2">
            <Link
              href={adjacentIds.prev ? `/jsblueridge/orders/${adjacentIds.prev}` : "#"}
              className={`h-8 w-8 flex items-center justify-center rounded-md border transition-colors ${adjacentIds.prev ? "hover:bg-muted" : "opacity-30 pointer-events-none"}`}
              title="Previous order"
            >
              <ChevronLeft className="size-4" />
            </Link>
            <Link
              href={adjacentIds.next ? `/jsblueridge/orders/${adjacentIds.next}` : "#"}
              className={`h-8 w-8 flex items-center justify-center rounded-md border transition-colors ${adjacentIds.next ? "hover:bg-muted" : "opacity-30 pointer-events-none"}`}
              title="Next order"
            >
              <ChevronRight className="size-4" />
            </Link>
          </div>
          {actionLabel && (
            <Button size="sm" className="h-8 text-xs" disabled={actionLoading} onClick={handleAction}>
              {actionLoading ? "Processing..." : actionLabel}
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-8 text-xs"><Printer className="size-3 mr-1" />Packing Slip</Button>
          <Button variant="outline" size="sm" className="h-8 text-xs"><Mail className="size-3 mr-1" />Contact</Button>
          {(order.state === "NEW" || order.state === "PROCESSING") && (
            quotesRequested || (order.quote_status && order.quote_status !== "none") ? (
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-50 text-amber-700">Quotes requested</span>
            ) : (
              <Button variant="outline" size="sm" className="h-8 text-xs" disabled={requestingQuotes} onClick={handleRequestQuotes}>
                <Send className="size-3 mr-1" />{requestingQuotes ? "Requesting..." : "Request Quotes"}
              </Button>
            )
          )}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT COL (span 2) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Row: Timeline + Summary side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Timeline */}
            <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b"><span className="text-[0.9375rem] font-semibold tracking-tight">Fulfillment</span></div>
              <div className="p-4">
                <div className="space-y-5">
                  {TIMELINE_STEPS.map((step, i) => {
                    const state = timelineState(order.state, step.key)
                    return (
                      <div key={step.key} className="flex items-start gap-3 relative">
                        <div className="relative flex flex-col items-center shrink-0">
                          <span className={`w-2.5 h-2.5 rounded-full mt-0.5 ${state === "done" ? "bg-emerald-500" : state === "current" ? "bg-blue-500 ring-[3px] ring-blue-500/20" : "bg-muted"}`} />
                          {i < TIMELINE_STEPS.length - 1 && (
                            <span className={`absolute left-[4.5px] top-3.5 w-px ${state === "done" ? "bg-emerald-500" : "bg-border"}`} style={{ height: 28 }} />
                          )}
                        </div>
                        <div className="flex-1 flex items-center justify-between">
                          <span className="text-sm font-medium">{step.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {step.key === "NEW" ? formatDate(order.faire_created_at) : step.key === "DELIVERED" && order.state === "DELIVERED" ? formatDate(order.faire_updated_at) : state === "done" ? formatDate(order.faire_updated_at) : "\u2014"}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Financials */}
            <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b"><span className="text-[0.9375rem] font-semibold tracking-tight">Financials</span></div>
              <div className="p-4 space-y-0">
                <div className="py-1.5 flex justify-between"><span className="text-sm text-muted-foreground">Subtotal</span><span className="text-sm font-medium">${formatCents(financials.subtotalCents)}</span></div>
                <div className="py-1.5 flex justify-between"><span className="text-sm text-muted-foreground">Shipping</span><span className="text-sm font-medium">${formatCents(financials.shippingCents)}</span></div>
                {financials.commissionCents > 0 && (
                  <div className="py-1.5 flex justify-between"><span className="text-sm text-muted-foreground">Commission</span><span className="text-sm font-medium text-red-600">&minus;${formatCents(financials.commissionCents)}</span></div>
                )}
                <div className="border-t my-1.5" />
                <div className="py-1.5 flex justify-between"><span className="text-sm font-bold">Net Payout</span><span className="text-sm font-bold text-emerald-600">${formatCents(financials.netPayoutCents)}</span></div>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b flex items-center justify-between">
              <span className="text-[0.9375rem] font-semibold tracking-tight">Items ({lineItems.length || order.item_count})</span>
              {itemsTotal > 0 && <span className="text-[0.9375rem] font-semibold tracking-tight">${formatCents(itemsTotal)}</span>}
            </div>
            <div className="divide-y">
              {lineItems.length > 0 ? lineItems.map((item, i) => {
                const imgUrl = productImages[item.productId] || productImages[item.sku]
                return (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 group">
                    <div className="relative shrink-0">
                      {imgUrl ? (
                        <img src={imgUrl} alt={item.name} className="w-10 h-10 rounded-md object-cover bg-muted" loading="lazy" />
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                          <Package className="size-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      {item.sku && <p className="text-sm text-muted-foreground">{item.sku}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm text-muted-foreground">{item.qty} x {"$" + formatCents(item.unitPriceCents)}</p>
                      <p className="text-sm font-medium">{"$" + formatCents(item.qty * item.unitPriceCents)}</p>
                    </div>
                  </div>
                )
              }) : (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  {order.item_count} items - {"$" + formatCents(order.total_cents)}
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b"><span className="text-[0.9375rem] font-semibold tracking-tight">Notes &amp; Activity</span></div>
            <div className="p-4 space-y-3">
              <textarea className="w-full rounded-md border p-3 text-sm min-h-[80px] resize-none" placeholder="Add internal notes..." defaultValue={order.notes ?? ""} />
              <div className="space-y-0">
                {order.state === "DELIVERED" && (
                  <div className="flex items-center gap-2 py-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-sm">Delivered</span>
                    <span className="text-xs text-muted-foreground ml-auto">{formatDate(order.faire_updated_at)}</span>
                  </div>
                )}
                {(order.state === "IN_TRANSIT" || order.state === "PRE_TRANSIT" || order.state === "DELIVERED") && (
                  <div className="flex items-center gap-2 py-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-sm">Shipped</span>
                    <span className="text-xs text-muted-foreground ml-auto">{formatDate(order.faire_updated_at)}</span>
                  </div>
                )}
                {(order.state === "PROCESSING" || order.state === "IN_TRANSIT" || order.state === "PRE_TRANSIT" || order.state === "DELIVERED") && (
                  <div className="flex items-center gap-2 py-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-sm">Accepted</span>
                    <span className="text-xs text-muted-foreground ml-auto">{formatDate(order.faire_updated_at)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 py-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-sm">Order placed by {retailerName}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{formatDate(order.faire_created_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COL */}
        <div className="space-y-5">
          {/* Shipping Address */}
          <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b"><span className="text-[0.9375rem] font-semibold tracking-tight">Shipping Address</span></div>
            <div className="p-4">
              <p className="text-sm font-medium">{retailerName}</p>
              {getLine1(order) && <p className="text-sm text-muted-foreground mt-0.5">{getLine1(order)}</p>}
              {getLine2(order) && <p className="text-sm text-muted-foreground">{getLine2(order)}</p>}
              <p className="text-sm text-muted-foreground">{getCity(order)}, {getState(order)} {getZip(order)}</p>
              {getPhone(order) && <p className="text-sm text-muted-foreground">{getPhone(order)}</p>}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${retailerName}\n${getLine1(order)}\n${getCity(order)}, ${getState(order)} ${getZip(order)}`)
                }}
                className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Copy className="size-2.5" /> Copy
              </button>
            </div>
          </div>

          {/* Retailer */}
          <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b"><span className="text-[0.9375rem] font-semibold tracking-tight">Retailer</span></div>
            <div className="p-4 space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                  {retailerName.split(" ").map(w => w[0]).slice(0, 2).join("")}
                </div>
                <div>
                  <p className="text-sm font-medium">{retailerName}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{getCity(order)}</p>
            </div>
          </div>

          {/* Tracking */}
          {(() => {
            const raw = order.raw_data as Record<string, unknown> | null
            const trackingNumber = (raw?.tracking_number as string) || (raw?.tracking_code as string) || null
            const carrier = (raw?.carrier as string) || (raw?.shipping_carrier as string) || null
            if (!trackingNumber && !trackingData && (order.state === "NEW" || order.state === "PROCESSING")) return null

            const trackingStatusStyles: Record<string, string> = {
              pending: "bg-slate-100 text-slate-600",
              in_transit: "bg-blue-50 text-blue-700",
              delivered: "bg-emerald-50 text-emerald-700",
              exception: "bg-red-50 text-red-700",
            }
            const trackingStatusLabel: Record<string, string> = {
              pending: "Pending",
              in_transit: "In Transit",
              delivered: "Delivered",
              exception: "Exception",
            }

            if (trackingData) {
              return (
                <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className="size-3.5 text-muted-foreground" />
                      <span className="text-[0.9375rem] font-semibold tracking-tight">Tracking</span>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${trackingStatusStyles[trackingData.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {trackingStatusLabel[trackingData.status] ?? trackingData.status}
                    </span>
                  </div>
                  <div className="p-4 space-y-2">
                    {trackingData.is_delayed && (
                      <div className="flex items-center gap-2 p-2 rounded-md bg-red-50 border border-red-200">
                        <span className="text-xs font-semibold text-red-700">Shipment appears delayed</span>
                      </div>
                    )}
                    {trackingData.carrier && (
                      <div className="flex justify-between"><span className="text-xs text-muted-foreground">Carrier</span><span className="text-xs font-medium">{trackingData.carrier}</span></div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Tracking #</span>
                      <span className="flex items-center gap-1">
                        <span className="text-xs font-medium">{trackingData.tracking_code}</span>
                        <button onClick={() => navigator.clipboard.writeText(trackingData.tracking_code)} className="text-muted-foreground hover:text-foreground"><Copy className="size-2.5" /></button>
                      </span>
                    </div>
                    {(trackingData.origin_country || trackingData.destination_country) && (
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Route</span>
                        <span className="text-xs font-medium">{trackingData.origin_country ?? "?"} &rarr; {trackingData.destination_country ?? "?"}</span>
                      </div>
                    )}
                    {trackingData.transit_days > 0 && (
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Transit Days</span>
                        <span className="text-xs font-medium">{trackingData.transit_days}d</span>
                      </div>
                    )}
                    {trackingData.last_event && (
                      <div className="pt-1 border-t">
                        <p className="text-xs text-muted-foreground mb-0.5">Last Event</p>
                        <p className="text-xs font-medium">{trackingData.last_event}</p>
                        {trackingData.last_event_time && (
                          <p className="text-[10px] text-muted-foreground">{new Date(trackingData.last_event_time).toLocaleString()}</p>
                        )}
                      </div>
                    )}
                    {trackingData.delivered_at && (
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Delivered</span>
                        <span className="text-xs font-medium">{new Date(trackingData.delivered_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>
                    )}
                    {trackingData.last_checked_at && (
                      <p className="text-[10px] text-muted-foreground pt-1">Last checked: {new Date(trackingData.last_checked_at).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              )
            }

            return (
              <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b flex items-center gap-2"><Truck className="size-3.5 text-muted-foreground" /><span className="text-[0.9375rem] font-semibold tracking-tight">Tracking</span></div>
                <div className="p-4 space-y-1.5">
                  {carrier && <div className="flex justify-between"><span className="text-xs text-muted-foreground">Carrier</span><span className="text-xs font-medium">{carrier}</span></div>}
                  {trackingNumber && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Tracking #</span>
                      <span className="flex items-center gap-1">
                        <span className="text-xs font-medium">{trackingNumber}</span>
                        <button onClick={() => navigator.clipboard.writeText(trackingNumber)} className="text-muted-foreground hover:text-foreground"><Copy className="size-2.5" /></button>
                      </span>
                    </div>
                  )}
                  {!trackingNumber && <p className="text-sm text-muted-foreground">No tracking info yet</p>}
                </div>
              </div>
            )
          })()}

          {/* Vendor Quotes */}
          {(() => {
            const quoteStatus = order.quote_status as string | undefined
            if (!quoteStatus || quoteStatus === "none") return null
            const statusBadge: Record<string, string> = {
              requested: "bg-amber-50 text-amber-700",
              quoted: "bg-blue-50 text-blue-700",
              approved: "bg-emerald-50 text-emerald-700",
              shipped: "bg-purple-50 text-purple-700",
              rejected: "bg-red-50 text-red-700",
            }
            const approvedQuote = vendorQuotes.find((q) => q.status === "approved")
            const shippedQuote = vendorQuotes.find((q) => q.status === "shipped")
            return (
              <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="size-3.5 text-muted-foreground" />
                    <span className="text-[0.9375rem] font-semibold tracking-tight">Vendor Quotes</span>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge[quoteStatus] ?? "bg-slate-100 text-slate-600"}`}>
                    {quoteStatus.charAt(0).toUpperCase() + quoteStatus.slice(1)}
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  {approvedQuote && (
                    <div className="flex items-center gap-2 p-2 rounded-md bg-emerald-50/50 border border-emerald-200">
                      <CheckCircle className="size-3.5 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-emerald-800">
                          Approved: {approvedQuote.vendor_id}
                        </p>
                        {approvedQuote.total_cost_cents != null && (
                          <p className="text-xs text-emerald-700">${(approvedQuote.total_cost_cents / 100).toFixed(2)}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {shippedQuote && shippedQuote.tracking_code && (
                    <div className="flex items-center gap-2 p-2 rounded-md bg-purple-50/50 border border-purple-200">
                      <Truck className="size-3.5 text-purple-600 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-purple-800">
                          Shipped{shippedQuote.carrier ? ` via ${shippedQuote.carrier}` : ""}
                        </p>
                        <p className="text-xs text-purple-700 font-mono">{shippedQuote.tracking_code}</p>
                      </div>
                    </div>
                  )}
                  {vendorQuotes.length > 0 ? (
                    <div className="space-y-2">
                      {vendorQuotes.map((vq: any) => (
                        <div key={vq.id} className="flex items-center justify-between py-1.5 border-b last:border-b-0">
                          <div>
                            <p className="text-xs font-medium">{vq.vendor_id}</p>
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusBadge[vq.status] ?? "bg-slate-100 text-slate-600"}`}>
                              {vq.status.charAt(0).toUpperCase() + vq.status.slice(1)}
                            </span>
                          </div>
                          <div className="text-right">
                            {vq.total_cost_cents != null && (
                              <p className="text-xs font-medium">${(vq.total_cost_cents / 100).toFixed(2)}</p>
                            )}
                            {vq.shipping_cost_cents != null && (
                              <p className="text-[10px] text-muted-foreground">+${(vq.shipping_cost_cents / 100).toFixed(2)} ship</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Waiting for vendor responses...</p>
                  )}
                </div>
              </div>
            )
          })()}

          {/* Payout Status */}
          {order.state === "DELIVERED" && (
            <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b">
                <span className="text-[0.9375rem] font-semibold tracking-tight">Payout</span>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-amber-500" />
                  <span className="text-sm text-muted-foreground">Payout pending</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
