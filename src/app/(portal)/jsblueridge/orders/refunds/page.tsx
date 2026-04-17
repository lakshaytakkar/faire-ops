"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { RotateCcw, AlertTriangle, XCircle, Search, ChevronDown, ChevronRight, PackageX, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Types & helpers                                                    */
/* ------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JSBOrder = Record<string, any>

type IssueType = "returned" | "damaged" | "canceled" | "mixed" | "refunded"
type TabKey = "all" | "returned" | "damaged" | "canceled" | "refunded"

interface AffectedItem {
  name: string
  state: string
}

const API = "/api/jsblueridge/data"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function jsbFetch(params: Record<string, string>): Promise<{ data: any[] }> {
  const sp = new URLSearchParams(params)
  const res = await fetch(`${API}?${sp}`)
  return res.json()
}

function getIssueType(order: JSBOrder): IssueType {
  if (order.state === "CANCELED") return "canceled"
  const raw = JSON.stringify(order.raw_data)
  const hasRefund = raw.includes("REFUND") || raw.includes("refund")
  if (hasRefund) return "refunded"
  const hasReturned = raw.includes("RETURNED")
  const hasDamaged = raw.includes("DAMAGED")
  if (hasReturned && hasDamaged) return "mixed"
  if (hasReturned) return "returned"
  if (hasDamaged) return "damaged"
  return "mixed"
}

function getAffectedItems(order: JSBOrder): AffectedItem[] {
  const items = (order.raw_data as any)?.items ?? []
  return items
    .filter((i: any) => i.state === "RETURNED" || i.state === "DAMAGED_OR_MISSING" || i.state === "CANCELED" || i.state === "REFUNDED")
    .map((i: any) => ({ name: i.product_name || "Item", state: i.state }))
}

function getRetailerName(order: JSBOrder): string {
  const addr = order.shipping_address as Record<string, unknown> | null
  if (!addr) return "\u2014"
  return (addr.company_name as string) || (addr.name as string) || "\u2014"
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014"
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const ISSUE_BADGE: Record<IssueType, { label: string; style: string }> = {
  returned: { label: "Returned", style: "bg-amber-50 text-amber-700" },
  damaged: { label: "Damaged", style: "bg-red-50 text-red-700" },
  canceled: { label: "Canceled", style: "bg-slate-100 text-slate-600" },
  mixed: { label: "Mixed", style: "bg-blue-50 text-blue-700" },
  refunded: { label: "Refunded", style: "bg-purple-50 text-purple-700" },
}

const ITEM_STATE_BADGE: Record<string, string> = {
  RETURNED: "bg-amber-50 text-amber-700",
  DAMAGED_OR_MISSING: "bg-red-50 text-red-700",
  CANCELED: "bg-slate-100 text-slate-600",
  REFUNDED: "bg-purple-50 text-purple-700",
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function JSBRefundsPage() {
  const [allOrders, setAllOrders] = useState<JSBOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  type SortKey = "date" | "amount"
  type SortDir = "asc" | "desc"
  const [sortKey, setSortKey] = useState<SortKey>("date")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("desc") }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="size-3 opacity-30 ml-1" />
    return sortDir === "asc" ? <ArrowUp className="size-3 text-primary ml-1" /> : <ArrowDown className="size-3 text-primary ml-1" />
  }

  /* Fetch canceled orders via API */
  useEffect(() => {
    setLoading(true)
    jsbFetch({
      table: "faire_orders",
      select: "*",
      eq: JSON.stringify({ state: "CANCELED" }),
      order: "faire_created_at",
      orderDir: "desc",
      limit: "200",
    }).then(({ data }) => {
      const issueOrders = (data ?? []).filter((o: JSBOrder) => {
        if (o.state === "CANCELED") return true
        const raw = JSON.stringify(o.raw_data)
        return raw.includes("RETURNED") || raw.includes("DAMAGED") || raw.includes("REFUND") || raw.includes("refund")
      })
      setAllOrders(issueOrders)
      setLoading(false)
    })
  }, [])

  /* Stats */
  const orders = allOrders
  const totalIssues = orders.length
  const returnedCount = orders.filter((o) => {
    const t = getIssueType(o)
    return t === "returned" || t === "mixed"
  }).length
  const damagedCount = orders.filter((o) => {
    const t = getIssueType(o)
    return t === "damaged" || t === "mixed"
  }).length
  const canceledCount = orders.filter((o) => o.state === "CANCELED").length
  const refundedCount = orders.filter((o) => getIssueType(o) === "refunded").length

  /* Filtered list */
  const filteredOrders = useMemo(() => {
    let result = orders
    if (activeTab !== "all") {
      result = result.filter((o) => {
        const t = getIssueType(o)
        if (activeTab === "returned") return t === "returned" || t === "mixed"
        if (activeTab === "damaged") return t === "damaged" || t === "mixed"
        if (activeTab === "canceled") return t === "canceled"
        if (activeTab === "refunded") return t === "refunded"
        return true
      })
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter((o) => {
        const displayId = (o.display_id ?? o.faire_order_id).toLowerCase()
        const retailer = getRetailerName(o).toLowerCase()
        return displayId.includes(q) || retailer.includes(q)
      })
    }
    // Sort
    result = [...result].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1
      switch (sortKey) {
        case "date":
          return dir * ((new Date(a.faire_created_at ?? 0).getTime()) - (new Date(b.faire_created_at ?? 0).getTime()))
        case "amount":
          return dir * ((a.total_cents ?? 0) - (b.total_cents ?? 0))
        default:
          return 0
      }
    })
    return result
  }, [orders, activeTab, searchQuery, sortKey, sortDir])

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "all", label: "All", count: totalIssues },
    { key: "returned", label: "Returned", count: returnedCount },
    { key: "damaged", label: "Damaged", count: damagedCount },
    { key: "canceled", label: "Canceled", count: canceledCount },
    { key: "refunded", label: "Refunded", count: refundedCount },
  ]

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto w-full">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">Disputes</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Track disputes, returns, refunds, and canceled orders
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total Issues</p>
            <p className="text-2xl font-bold font-heading mt-2">{totalIssues}</p>
            <p className="text-xs text-muted-foreground mt-1">Orders with issues</p>
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(239,68,68,0.1)" }}>
            <PackageX className="h-4 w-4" style={{ color: "#ef4444" }} />
          </div>
        </div>

        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Returned Items</p>
            <p className="text-2xl font-bold font-heading mt-2">{returnedCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Orders with returns</p>
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(245,158,11,0.1)" }}>
            <RotateCcw className="h-4 w-4" style={{ color: "#f59e0b" }} />
          </div>
        </div>

        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Damaged Items</p>
            <p className="text-2xl font-bold font-heading mt-2">{damagedCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Damaged or missing</p>
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(239,68,68,0.1)" }}>
            <AlertTriangle className="h-4 w-4" style={{ color: "#ef4444" }} />
          </div>
        </div>

        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Canceled Orders</p>
            <p className="text-2xl font-bold font-heading mt-2">{canceledCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Fully canceled</p>
          </div>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(100,116,139,0.1)" }}>
            <XCircle className="h-4 w-4" style={{ color: "#64748b" }} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-60 pl-8 text-sm rounded-md border bg-transparent px-3 focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`h-8 px-3 text-xs font-medium rounded-md transition-colors ${
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {tab.label}{" "}
                <span className="ml-1 opacity-70">{tab.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-12 rounded bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left w-8" />
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Order ID</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Retailer</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left">Issue Type</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-center">Items Affected</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right cursor-pointer select-none" onClick={() => toggleSort("amount")}>
                    <span className="flex items-center justify-end">Total <SortIcon col="amount" /></span>
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-left cursor-pointer select-none" onClick={() => toggleSort("date")}>
                    <span className="flex items-center">Date <SortIcon col="date" /></span>
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No orders with issues found
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const issueType = getIssueType(order)
                    const affected = getAffectedItems(order)
                    const isExpanded = expandedId === order.id
                    const badge = ISSUE_BADGE[issueType]

                    return (
                      <IssueRow
                        key={order.id}
                        order={order}
                        issueType={issueType}
                        badge={badge}
                        affectedItems={affected}
                        isExpanded={isExpanded}
                        onToggle={() => setExpandedId(isExpanded ? null : order.id)}
                      />
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="border-t px-4 py-3 text-xs text-muted-foreground">
          Showing {filteredOrders.length} of {orders.length} orders with issues
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Row component                                                      */
/* ------------------------------------------------------------------ */

function IssueRow({
  order,
  issueType,
  badge,
  affectedItems,
  isExpanded,
  onToggle,
}: {
  order: JSBOrder
  issueType: IssueType
  badge: { label: string; style: string }
  affectedItems: AffectedItem[]
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className={`border-b hover:bg-muted/20 transition-colors cursor-pointer ${isExpanded ? "bg-muted/30" : ""}`}
      >
        <td className="pl-4 pr-1 py-3.5 text-sm text-muted-foreground">
          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </td>
        <td className="px-4 py-3.5 text-sm">
          <Link
            href={`/jsblueridge/orders/${order.faire_order_id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-primary hover:underline"
          >
            <span className="text-xs truncate max-w-[120px] inline-block align-bottom" title={order.faire_order_id}>
              {order.display_id ?? order.faire_order_id.slice(0, 12)}
            </span>
          </Link>
        </td>
        <td className="px-4 py-3.5 text-sm">{getRetailerName(order)}</td>
        <td className="px-4 py-3.5 text-sm">
          <span className={`inline-flex items-center border-0 text-xs font-medium px-2 py-0.5 rounded-full ${badge.style}`}>
            {badge.label}
          </span>
        </td>
        <td className="px-4 py-3.5 text-sm text-center">{affectedItems.length}</td>
        <td className="px-4 py-3.5 text-sm text-right">${formatCents(order.total_cents)}</td>
        <td className="px-4 py-3.5 text-sm text-muted-foreground">{formatDate(order.faire_created_at)}</td>
        <td className="px-4 py-3.5 text-sm text-right">
          <Link
            href={`/jsblueridge/orders/${order.faire_order_id}`}
            onClick={(e) => e.stopPropagation()}
            className="h-8 text-xs inline-flex items-center justify-center rounded-md border bg-transparent px-3 font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            View
          </Link>
        </td>
      </tr>

      {/* Expanded Detail */}
      {isExpanded && (
        <tr className="border-b bg-muted/10">
          <td colSpan={8} className="px-6 py-5">
            <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b text-sm font-semibold">Affected Items</div>
              <div className="p-5">
                {affectedItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {order.state === "CANCELED" ? "Entire order was canceled" : "No individual item details available"}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {affectedItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span>{item.name}</span>
                        <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${ITEM_STATE_BADGE[item.state] ?? "bg-slate-100 text-slate-600"}`}>
                          {item.state === "DAMAGED_OR_MISSING" ? "Damaged / Missing" : item.state}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
