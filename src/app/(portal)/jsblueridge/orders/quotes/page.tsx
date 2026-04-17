"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { FileText, Clock, CheckCircle, Package, ChevronLeft, ChevronRight, Send, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface VendorQuote {
  id: string
  order_id: string
  vendor_id: string
  status: string
  items: QuoteItem[] | null
  shipping_cost_cents: number | null
  total_cost_cents: number | null
  notes: string | null
  tracking_code: string | null
  carrier: string | null
  shipped_at: string | null
  created_at: string
}

interface QuoteItem {
  name: string
  qty: number
  price_cents: number
}

interface Vendor {
  id: string
  name: string
}

interface OrderInfo {
  faire_order_id: string
  display_id: string | null
  total_cents: number
  shipping_address: Record<string, unknown> | null
  store_id: string | null
  quote_status: string | null
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const API = "/api/jsblueridge/data"

const STATUS_BADGE: Record<string, string> = {
  requested: "bg-amber-50 text-amber-700",
  quoted:    "bg-blue-50 text-blue-700",
  approved:  "bg-emerald-50 text-emerald-700",
  shipped:   "bg-purple-50 text-purple-700",
  rejected:  "bg-red-50 text-red-700",
}

const QUOTE_STATUS_BADGE: Record<string, string> = {
  none:      "bg-slate-100 text-slate-600",
  requested: "bg-amber-50 text-amber-700",
  quoted:    "bg-blue-50 text-blue-700",
  approved:  "bg-emerald-50 text-emerald-700",
  shipped:   "bg-purple-50 text-purple-700",
  rejected:  "bg-red-50 text-red-700",
}

const TABS = ["all", "requested", "quoted", "approved", "shipped", "rejected"] as const

const PAGE_SIZE = 10

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function jsbFetch(params: Record<string, string>): Promise<{ data: any[] }> {
  const sp = new URLSearchParams(params)
  const res = await fetch(`${API}?${sp}`)
  return res.json()
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getRetailerName(order: OrderInfo): string {
  const addr = order.shipping_address
  if (!addr) return "\u2014"
  return (addr.company_name as string) || (addr.name as string) || "\u2014"
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function JSBQuotesPage() {
  const [quotes, setQuotes] = useState<VendorQuote[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [orders, setOrders] = useState<OrderInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("all")
  const [page, setPage] = useState(0)
  const [bulkRequesting, setBulkRequesting] = useState(false)
  const [requestingOrderIds, setRequestingOrderIds] = useState<Set<string>>(new Set())
  const [approvingQuoteIds, setApprovingQuoteIds] = useState<Set<string>>(new Set())
  const [rejectingQuoteIds, setRejectingQuoteIds] = useState<Set<string>>(new Set())

  /* ---- Fetch data via API ---- */
  const fetchData = useCallback(async () => {
    const [quotesRes, vendorsRes, ordersRes] = await Promise.all([
      jsbFetch({ table: "vendor_quotes", select: "*", order: "created_at", orderDir: "desc" }),
      jsbFetch({ table: "faire_vendors", select: "id, name" }),
      jsbFetch({ table: "faire_orders", select: "faire_order_id, display_id, total_cents, shipping_address, store_id, quote_status" }),
    ])
    setQuotes(quotesRes.data ?? [])
    setVendors(vendorsRes.data ?? [])
    setOrders(ordersRes.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  /* ---- Lookup maps ---- */
  const vendorMap = useMemo(() => {
    const m: Record<string, string> = {}
    for (const v of vendors) m[v.id] = v.name
    return m
  }, [vendors])

  const orderMap = useMemo(() => {
    const m: Record<string, OrderInfo> = {}
    for (const o of orders) m[o.faire_order_id] = o
    return m
  }, [orders])

  /* ---- Group quotes by order ---- */
  const groupedByOrder = useMemo(() => {
    const filtered = activeTab === "all" ? quotes : quotes.filter((q) => q.status === activeTab)

    const groups: Record<string, VendorQuote[]> = {}
    for (const q of filtered) {
      if (!groups[q.order_id]) groups[q.order_id] = []
      groups[q.order_id].push(q)
    }

    const sortedKeys = Object.keys(groups).sort((a, b) => {
      const aDate = new Date(groups[a][0].created_at).getTime()
      const bDate = new Date(groups[b][0].created_at).getTime()
      return bDate - aDate
    })

    return sortedKeys.map((orderId) => ({ orderId, quotes: groups[orderId] }))
  }, [quotes, activeTab])

  /* ---- Pagination ---- */
  const totalPages = Math.max(1, Math.ceil(groupedByOrder.length / PAGE_SIZE))
  const pagedGroups = groupedByOrder.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  /* ---- Stats ---- */
  const pendingCount = quotes.filter((q) => q.status === "requested").length
  const receivedCount = quotes.filter((q) => q.status === "quoted").length
  const approvedCount = quotes.filter((q) => q.status === "approved").length
  const pipelineCount = new Set(quotes.map((q) => q.order_id)).size

  const STATS = [
    { label: "Pending Quotes",       value: String(pendingCount),  sub: "Requested",            icon: Clock,       iconBg: "bg-amber-50",   iconColor: "text-amber-600" },
    { label: "Received",             value: String(receivedCount), sub: "Awaiting approval",     icon: FileText,    iconBg: "bg-blue-50",    iconColor: "text-blue-600" },
    { label: "Approved",             value: String(approvedCount), sub: "Vendor selected",       icon: CheckCircle, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
    { label: "Orders in Pipeline",   value: String(pipelineCount), sub: "With vendor quotes",    icon: Package,     iconBg: "bg-purple-50",  iconColor: "text-purple-600" },
  ]

  /* ---- Find cheapest quote per order ---- */
  function cheapestQuoteId(orderQuotes: VendorQuote[]): string | null {
    const quotedOnes = orderQuotes.filter((q) => q.status === "quoted" && q.total_cost_cents != null)
    if (quotedOnes.length === 0) return null
    return quotedOnes.reduce((min, q) => (q.total_cost_cents! < min.total_cost_cents! ? q : min)).id
  }

  /* ---- Actions ---- */
  async function handleBulkRequestQuotes() {
    setBulkRequesting(true)
    try {
      const noneOrders = orders.filter((o) => !o.quote_status || o.quote_status === "none")
      await Promise.all(
        noneOrders.map((o) =>
          fetch("/api/jsblueridge/orders/request-quotes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order_id: o.faire_order_id }),
          })
        )
      )
      await fetchData()
    } finally {
      setBulkRequesting(false)
    }
  }

  async function handleRequestQuotes(orderId: string) {
    setRequestingOrderIds((prev) => new Set(prev).add(orderId))
    try {
      await fetch("/api/jsblueridge/orders/request-quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId }),
      })
      await fetchData()
    } finally {
      setRequestingOrderIds((prev) => { const s = new Set(prev); s.delete(orderId); return s })
    }
  }

  async function handleApproveQuote(quoteId: string) {
    setApprovingQuoteIds((prev) => new Set(prev).add(quoteId))
    try {
      await fetch("/api/jsblueridge/orders/approve-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quote_id: quoteId }),
      })
      await fetchData()
    } finally {
      setApprovingQuoteIds((prev) => { const s = new Set(prev); s.delete(quoteId); return s })
    }
  }

  async function handleRejectQuote(quoteId: string) {
    setRejectingQuoteIds((prev) => new Set(prev).add(quoteId))
    try {
      await fetch("/api/jsblueridge/orders/reject-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quote_id: quoteId }),
      })
      await fetchData()
    } finally {
      setRejectingQuoteIds((prev) => { const s = new Set(prev); s.delete(quoteId); return s })
    }
  }

  /* ---- Loading skeleton ---- */
  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-muted animate-pulse rounded-md" />
          ))}
        </div>
        <div className="h-64 bg-muted animate-pulse rounded-md" />
      </div>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Vendor Quotes</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Compare and approve vendor quotations</p>
        </div>
        <Button size="sm" className="h-8 text-xs" disabled={bulkRequesting} onClick={handleBulkRequestQuotes}>
          <Send className="size-3 mr-1" />
          {bulkRequesting ? "Requesting..." : "Request All Quotes"}
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold font-heading mt-2">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
            </div>
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${s.iconBg}`}>
              <s.icon className={`h-4 w-4 ${s.iconColor}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setPage(0) }}
            className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {capitalize(tab)}
          </button>
        ))}
      </div>

      {/* Grouped Orders + Quotes */}
      {pagedGroups.length === 0 ? (
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-12 text-center">
          <p className="text-sm text-muted-foreground">No quotes found{activeTab !== "all" ? ` with status "${activeTab}"` : ""}.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {pagedGroups.map(({ orderId, quotes: orderQuotes }) => {
            const order = orderMap[orderId]
            const cheapest = cheapestQuoteId(orderQuotes)
            const quoteStatus = order?.quote_status || "none"
            const canRequestQuotes = !quoteStatus || quoteStatus === "none"
            const totalItems = orderQuotes.reduce((sum, q) => {
              if (!q.items) return sum
              return sum + q.items.reduce((s, item) => s + item.qty, 0)
            }, 0)

            return (
              <div key={orderId} className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
                {/* Order Header */}
                <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{order?.display_id ?? orderId}</span>
                    <span className="text-xs text-muted-foreground">{order ? getRetailerName(order) : "\u2014"}</span>
                    {totalItems > 0 && <span className="text-xs text-muted-foreground">{totalItems} items</span>}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${QUOTE_STATUS_BADGE[quoteStatus] ?? "bg-slate-100 text-slate-600"}`}>
                      {capitalize(quoteStatus)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {order && order.total_cents > 0 && (
                      <span className="text-xs text-muted-foreground">Order total: ${formatCents(order.total_cents)}</span>
                    )}
                    {canRequestQuotes && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={requestingOrderIds.has(orderId)}
                        onClick={() => handleRequestQuotes(orderId)}
                      >
                        <Send className="size-3 mr-1" />
                        {requestingOrderIds.has(orderId) ? "Requesting..." : "Request Quotes"}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Vendor Quote Rows */}
                <div className="divide-y">
                  {orderQuotes.map((quote) => {
                    const isCheapest = quote.id === cheapest
                    return (
                      <div
                        key={quote.id}
                        className={`p-4 ${isCheapest ? "ring-1 ring-inset ring-emerald-200 bg-emerald-50/30" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          {/* Left: vendor info + items */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium">{vendorMap[quote.vendor_id] ?? quote.vendor_id}</span>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[quote.status] ?? "bg-slate-100 text-slate-600"}`}>
                                {capitalize(quote.status)}
                              </span>
                              {isCheapest && (
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Lowest</span>
                              )}
                            </div>

                            {/* Items table */}
                            {quote.items && quote.items.length > 0 && (
                              <table className="text-xs w-full max-w-md mb-2">
                                <thead>
                                  <tr className="text-muted-foreground">
                                    <th className="text-left font-medium py-1 pr-4">Item</th>
                                    <th className="text-right font-medium py-1 px-2">Qty</th>
                                    <th className="text-right font-medium py-1 pl-2">Price</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {quote.items.map((item, idx) => (
                                    <tr key={idx}>
                                      <td className="py-0.5 pr-4">{item.name}</td>
                                      <td className="py-0.5 px-2 text-right tabular-nums">{item.qty}</td>
                                      <td className="py-0.5 pl-2 text-right tabular-nums">${formatCents(item.price_cents)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}

                            {/* Shipping + tracking */}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              {quote.shipping_cost_cents != null && (
                                <span>Shipping: ${formatCents(quote.shipping_cost_cents)}</span>
                              )}
                              {quote.tracking_code && (
                                <span className="flex items-center gap-1">
                                  <Truck className="size-3" />
                                  {quote.carrier && <span>{quote.carrier}</span>}
                                  <span className="font-mono">{quote.tracking_code}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Right: total + actions */}
                          <div className="text-right shrink-0 flex flex-col items-end gap-2">
                            {quote.total_cost_cents != null && (
                              <span className="text-sm font-bold">${formatCents(quote.total_cost_cents)}</span>
                            )}
                            {quote.notes && (
                              <p className="text-xs text-muted-foreground max-w-[200px] text-right">{quote.notes}</p>
                            )}
                            <div className="flex items-center gap-1.5">
                              {quote.status === "quoted" && (
                                <>
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                    disabled={approvingQuoteIds.has(quote.id)}
                                    onClick={() => handleApproveQuote(quote.id)}
                                  >
                                    {approvingQuoteIds.has(quote.id) ? "Approving..." : "Approve"}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                    disabled={rejectingQuoteIds.has(quote.id)}
                                    onClick={() => handleRejectQuote(quote.id)}
                                  >
                                    {rejectingQuoteIds.has(quote.id) ? "Rejecting..." : "Reject"}
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-xs text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}&ndash;{Math.min((page + 1) * PAGE_SIZE, groupedByOrder.length)} of {groupedByOrder.length} orders
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-xs px-2">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
