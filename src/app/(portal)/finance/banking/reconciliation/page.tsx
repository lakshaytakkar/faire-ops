"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import {
  CheckCircle2,
  AlertTriangle,
  Package,
  Zap,
  Loader2,
  Search,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type TxnType = "deposit" | "withdrawal" | "fee" | "payout" | "expense" | "conversion"

interface BankTransaction {
  id: string
  amount_cents: number
  transaction_type: TxnType
  description: string
  reference: string | null
  transaction_date: string
  is_reconciled: boolean
  matched_order_id: string | null
  category: string
}

interface DeliveredOrder {
  id: string
  display_id: string | null
  faire_order_id: string
  total_cents: number
  state: string
  faire_created_at: string | null
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmtMoney(cents: number): string {
  return (Math.abs(cents) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const TYPE_STYLES: Record<string, string> = {
  deposit: "bg-emerald-50 text-emerald-700",
  withdrawal: "bg-red-50 text-red-700",
  fee: "bg-amber-50 text-amber-700",
  payout: "bg-blue-50 text-blue-700",
  expense: "bg-gray-100 text-gray-700",
  conversion: "bg-gray-100 text-gray-700",
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ReconciliationPage() {
  const [unreconciledTxns, setUnreconciledTxns] = useState<BankTransaction[]>([])
  const [deliveredOrders, setDeliveredOrders] = useState<DeliveredOrder[]>([])
  const [reconciledCount, setReconciledCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [autoReconciling, setAutoReconciling] = useState(false)

  const [tab, setTab] = useState<"transactions" | "orders">("transactions")
  const [matchingId, setMatchingId] = useState<string | null>(null)
  const [matchSearch, setMatchSearch] = useState("")
  const [matchSaving, setMatchSaving] = useState(false)
  const [highlightAmount, setHighlightAmount] = useState<number | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [txnRes, ordersRes, reconciledRes] = await Promise.all([
      supabase
        .from("bank_transactions_v2")
        .select("id, amount_cents, transaction_type, description, reference, transaction_date, is_reconciled, matched_order_id, category")
        .eq("is_reconciled", false)
        .order("transaction_date", { ascending: false })
        .limit(200),
      supabase
        .from("faire_orders")
        .select("id, display_id, faire_order_id, total_cents, state, faire_created_at")
        .eq("state", "DELIVERED")
        .order("faire_created_at", { ascending: false })
        .limit(200),
      supabase
        .from("bank_transactions_v2")
        .select("id", { count: "exact", head: true })
        .eq("is_reconciled", true),
    ])
    setUnreconciledTxns(txnRes.data ?? [])
    setReconciledCount(reconciledRes.count ?? 0)

    /* filter out already matched orders */
    const matchedOrderIds = new Set(
      (txnRes.data ?? []).filter((t) => t.matched_order_id).map((t) => t.matched_order_id)
    )
    const unmatchedOrders = (ordersRes.data ?? []).filter(
      (o) => !matchedOrderIds.has(o.faire_order_id) && !matchedOrderIds.has(o.id)
    )
    setDeliveredOrders(unmatchedOrders)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  /* order search for inline matching */
  const orderResults = useMemo(() => {
    if (!matchSearch.trim()) return deliveredOrders.slice(0, 10)
    const q = matchSearch.toLowerCase()
    return deliveredOrders.filter(
      (o) => (o.display_id ?? "").toLowerCase().includes(q) || o.faire_order_id.toLowerCase().includes(q)
    ).slice(0, 10)
  }, [deliveredOrders, matchSearch])

  /* match transaction to order */
  async function handleMatch(txnId: string, order: DeliveredOrder) {
    setMatchSaving(true)
    await supabase
      .from("bank_transactions_v2")
      .update({ matched_order_id: order.faire_order_id, is_reconciled: true })
      .eq("id", txnId)
    setMatchingId(null)
    setMatchSearch("")
    setMatchSaving(false)
    fetchData()
  }

  /* auto-reconcile */
  async function handleAutoReconcile() {
    setAutoReconciling(true)
    try {
      const res = await fetch("/api/finance/auto-reconcile", { method: "POST" })
      await res.json()
      await fetchData()
    } catch { /* ignore */ }
    setAutoReconciling(false)
  }

  /* highlight matching amounts */
  function handleFindTransaction(order: DeliveredOrder) {
    setHighlightAmount(Math.round(order.total_cents * 0.85))
    setTab("transactions")
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-[48px] rounded-md bg-muted animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-[70px] rounded-md bg-muted animate-pulse" />)}
        </div>
        <div className="h-[400px] rounded-md bg-muted animate-pulse" />
      </div>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Reconciliation</h1>
          <p className="text-sm text-muted-foreground">Match transactions to Faire orders</p>
        </div>
        <Button size="sm" onClick={handleAutoReconcile} disabled={autoReconciling}>
          {autoReconciling ? <Loader2 className="h-3.5 w-3.5 animate-spin" data-icon="inline-start" /> : <Zap className="h-3.5 w-3.5" data-icon="inline-start" />}
          {autoReconciling ? "Running..." : "Auto-Reconcile"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-md border bg-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Matched</p>
            <p className="text-xl font-bold mt-0.5 text-emerald-600">{reconciledCount}</p>
          </div>
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        </div>
        <div className="rounded-md border bg-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Unmatched Transactions</p>
            <p className="text-xl font-bold mt-0.5 text-amber-600">{unreconciledTxns.length}</p>
          </div>
          <AlertTriangle className="h-5 w-5 text-amber-500" />
        </div>
        <div className="rounded-md border bg-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Unmatched Orders</p>
            <p className="text-xl font-bold mt-0.5 text-blue-600">{deliveredOrders.length}</p>
          </div>
          <Package className="h-5 w-5 text-blue-500" />
        </div>
      </div>

      {/* Tab toggle */}
      <div className="flex border-b">
        <button
          onClick={() => { setTab("transactions"); setHighlightAmount(null) }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "transactions" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Unmatched Transactions ({unreconciledTxns.length})
        </button>
        <button
          onClick={() => { setTab("orders"); setHighlightAmount(null) }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "orders" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Unmatched Orders ({deliveredOrders.length})
        </button>
      </div>

      {/* Tab content */}
      {tab === "transactions" && (
        <div className="rounded-md border bg-card overflow-hidden">
          {unreconciledTxns.length === 0 ? (
            <div className="p-10 text-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-medium">All transactions reconciled</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Date</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Description</th>
                    <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">Amount</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Type</th>
                    <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {unreconciledTxns.map((txn) => {
                    const isHighlighted = highlightAmount !== null && Math.abs(txn.amount_cents - highlightAmount) < 200
                    return (
                      <tr key={txn.id} className={`border-t transition-colors ${isHighlighted ? "bg-amber-50" : "hover:bg-muted/20"}`}>
                        <td className="px-3 py-2.5 text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(txn.transaction_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </td>
                        <td className="px-3 py-2.5 text-sm text-foreground max-w-[200px] truncate">{txn.description}</td>
                        <td className={`px-3 py-2.5 text-sm font-semibold text-right whitespace-nowrap ${txn.amount_cents < 0 ? "text-red-600" : "text-emerald-600"}`}>
                          {txn.amount_cents < 0 ? "-" : "+"}${fmtMoney(txn.amount_cents)}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`border-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${TYPE_STYLES[txn.transaction_type] ?? "bg-gray-100 text-gray-700"}`}>
                            {txn.transaction_type}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {matchingId === txn.id ? (
                            <div className="inline-flex items-center gap-1">
                              <div className="relative">
                                <Input
                                  value={matchSearch}
                                  onChange={(e) => setMatchSearch(e.target.value)}
                                  placeholder="Order ID..."
                                  className="w-40 h-7 text-xs pr-6"
                                  autoFocus
                                />
                                <Search className="h-3 w-3 text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2" />
                                {matchSearch.trim() && orderResults.length > 0 && (
                                  <div className="absolute z-10 right-0 mt-1 w-64 rounded-md border bg-card shadow-lg max-h-48 overflow-y-auto">
                                    {orderResults.map((o) => (
                                      <button
                                        key={o.id}
                                        onClick={() => handleMatch(txn.id, o)}
                                        disabled={matchSaving}
                                        className="w-full text-left px-3 py-2 hover:bg-muted/50 text-xs flex justify-between"
                                      >
                                        <span className="font-medium">{o.display_id ?? o.faire_order_id}</span>
                                        <span className="text-muted-foreground">${fmtMoney(o.total_cents)}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <Button variant="ghost" size="icon-xs" onClick={() => { setMatchingId(null); setMatchSearch("") }}>
                                <span className="text-xs">&times;</span>
                              </Button>
                            </div>
                          ) : (
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setMatchingId(txn.id)}>
                              Match
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "orders" && (
        <div className="rounded-md border bg-card overflow-hidden">
          {deliveredOrders.length === 0 ? (
            <div className="p-10 text-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-medium">All orders matched</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Order ID</th>
                    <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">Total</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Date</th>
                    <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">Expected Payout</th>
                    <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveredOrders.map((order) => (
                    <tr key={order.id} className="border-t hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2.5 text-sm font-medium">{order.display_id ?? order.faire_order_id}</td>
                      <td className="px-3 py-2.5 text-sm font-semibold text-right whitespace-nowrap">${fmtMoney(order.total_cents)}</td>
                      <td className="px-3 py-2.5 text-sm text-muted-foreground whitespace-nowrap">
                        {order.faire_created_at
                          ? new Date(order.faire_created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                          : "-"}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-muted-foreground text-right whitespace-nowrap">
                        ${fmtMoney(Math.round(order.total_cents * 0.85))}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleFindTransaction(order)}>
                          Find Transaction
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
