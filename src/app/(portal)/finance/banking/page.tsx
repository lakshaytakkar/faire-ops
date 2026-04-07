"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import Link from "next/link"
import {
  Landmark,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BankAccount {
  id: string
  name: string
  currency: string
  balance_cents: number
  account_type: string
  provider: string
  last_synced_at: string | null
}

type TxnType = "deposit" | "withdrawal" | "fee" | "payout" | "conversion" | "expense"

interface BankTransaction {
  id: string
  amount_cents: number
  currency: string
  transaction_type: TxnType
  description: string
  transaction_date: string
  is_reconciled: boolean
  matched_order_id: string | null
  category: string | null
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "\u20AC", GBP: "\u00A3", CAD: "C$", AUD: "A$", CNY: "\u00A5", INR: "\u20B9",
}

const USD_RATES: Record<string, number> = {
  USD: 1, CNY: 0.14, AUD: 0.65, EUR: 1.08, GBP: 1.27, CAD: 0.74, INR: 0.012,
}

const TYPE_STYLES: Record<string, string> = {
  deposit: "bg-emerald-50 text-emerald-700",
  withdrawal: "bg-red-50 text-red-700",
  fee: "bg-amber-50 text-amber-700",
  payout: "bg-blue-50 text-blue-700",
  conversion: "bg-gray-100 text-gray-700",
  expense: "bg-gray-100 text-gray-700",
}

function toUSD(cents: number, currency: string): number {
  return Math.round(cents * (USD_RATES[currency] ?? 1))
}

function fmtMoney(cents: number, currency = "USD"): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? "$"
  return symbol + (Math.abs(cents) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never"
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function FinanceDashboard() {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [recentTxns, setRecentTxns] = useState<BankTransaction[]>([])
  const [allTxns, setAllTxns] = useState<BankTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [autoReconciling, setAutoReconciling] = useState(false)
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [acctRes, recentRes, allRes] = await Promise.all([
      supabase.from("bank_accounts").select("*").order("name"),
      supabase.from("bank_transactions_v2").select("*").order("transaction_date", { ascending: false }).limit(15),
      supabase.from("bank_transactions_v2").select("id, is_reconciled", { count: "exact" }),
    ])
    setAccounts(acctRes.data ?? [])
    setRecentTxns(recentRes.data ?? [])
    setAllTxns((allRes.data ?? []) as BankTransaction[])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  /* computed */
  const usdAccount = accounts.find((a) => a.currency === "USD")
  const usdBalance = usdAccount?.balance_cents ?? 0
  const totalBalanceUSD = useMemo(() => accounts.reduce((s, a) => s + toUSD(a.balance_cents, a.currency), 0), [accounts])
  const totalCount = allTxns.length
  const reconciledCount = useMemo(() => allTxns.filter((t) => t.is_reconciled).length, [allTxns])
  const unreconciledCount = totalCount - reconciledCount
  const reconciledPct = totalCount > 0 ? Math.round((reconciledCount / totalCount) * 100) : 0

  /* sync */
  async function handleSync() {
    setSyncing(true)
    setBanner(null)
    try {
      const res = await fetch("/api/wise/sync", { method: "POST" })
      const data = await res.json()
      if (!res.ok) setBanner({ type: "error", text: data.error ?? "Sync failed" })
      else setBanner({ type: "success", text: `Synced ${data.accounts_synced} account(s), ${data.transactions_synced} transaction(s)` })
      await fetchData()
    } catch (err) {
      setBanner({ type: "error", text: (err as Error).message })
    } finally {
      setSyncing(false)
    }
  }

  /* auto-reconcile */
  async function handleAutoReconcile() {
    setAutoReconciling(true)
    setBanner(null)
    try {
      const res = await fetch("/api/finance/auto-reconcile", { method: "POST" })
      const data = await res.json()
      if (res.ok) setBanner({ type: "success", text: `${data.auto_matched} matched, ${data.manual_review} need review` })
      else setBanner({ type: "error", text: data.error ?? "Auto-reconcile failed" })
      await fetchData()
    } catch (err) {
      setBanner({ type: "error", text: (err as Error).message })
    } finally {
      setAutoReconciling(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-[48px] rounded-md bg-muted animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-[80px] rounded-md bg-muted animate-pulse" />)}
        </div>
        <div className="h-[300px] rounded-md bg-muted animate-pulse" />
      </div>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Finance</h1>
          <p className="text-sm text-muted-foreground">Banking, payouts, and reconciliation overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSync} disabled={syncing} size="sm">
            {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" data-icon="inline-start" /> : <RefreshCw className="h-3.5 w-3.5" data-icon="inline-start" />}
            {syncing ? "Syncing..." : "Sync Wise"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleAutoReconcile} disabled={autoReconciling}>
            {autoReconciling ? <Loader2 className="h-3.5 w-3.5 animate-spin" data-icon="inline-start" /> : <CheckCircle2 className="h-3.5 w-3.5" data-icon="inline-start" />}
            {autoReconciling ? "Reconciling..." : "Auto-Reconcile"}
          </Button>
        </div>
      </div>

      {/* Banner */}
      {banner && (
        <div className={`rounded-md border p-3 flex items-center justify-between text-sm ${banner.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
          <span>{banner.text}</span>
          <button onClick={() => setBanner(null)} className="p-0.5 rounded hover:bg-black/5"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-md border bg-card p-4">
          <p className="text-xs text-muted-foreground">USD Balance</p>
          <p className="text-xl font-bold mt-1">{fmtMoney(usdBalance)}</p>
        </div>
        <div className="rounded-md border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Balance (USD equiv.)</p>
          <p className="text-xl font-bold mt-1">{fmtMoney(totalBalanceUSD)}</p>
        </div>
        <div className="rounded-md border bg-card p-4">
          <p className="text-xs text-muted-foreground">Reconciled</p>
          <p className="text-xl font-bold mt-1 text-emerald-600">{reconciledPct}%</p>
          <p className="text-xs text-muted-foreground">{reconciledCount}/{totalCount}</p>
        </div>
        <div className="rounded-md border bg-card p-4">
          <p className="text-xs text-muted-foreground">Pending Review</p>
          <p className="text-xl font-bold mt-1 text-amber-600">{unreconciledCount}</p>
        </div>
      </div>

      {/* Accounts */}
      <div className="rounded-md border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/40">
          <h3 className="text-sm font-semibold">Accounts</h3>
          <span className="text-xs text-muted-foreground">{accounts.length} account{accounts.length !== 1 ? "s" : ""}</span>
        </div>
        {accounts.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">No accounts connected. Sync with Wise to get started.</div>
        ) : (
          <div className="divide-y">
            {accounts.map((acct) => (
              <div key={acct.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex items-center justify-center h-7 w-7 rounded bg-primary/10 text-xs font-bold text-primary">
                    {CURRENCY_SYMBOLS[acct.currency] ?? acct.currency.slice(0, 2)}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{acct.name}</p>
                    <p className="text-xs text-muted-foreground">{acct.currency}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-sm font-semibold">{fmtMoney(acct.balance_cents, acct.currency)}</p>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(acct.last_synced_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="rounded-md border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/40">
          <h3 className="text-sm font-semibold">Recent Transactions</h3>
          <Link href="/finance/banking/transactions" className="text-xs font-medium text-primary hover:underline">View All &rarr;</Link>
        </div>
        {recentTxns.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">No transactions yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Date</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Description</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">Amount</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Type</th>
                  <th className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground">Reconciled</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Matched Order</th>
                </tr>
              </thead>
              <tbody>
                {recentTxns.map((txn) => (
                  <tr key={txn.id} className="border-t hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2.5 text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(txn.transaction_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-foreground max-w-[200px] truncate">{txn.description}</td>
                    <td className={`px-3 py-2.5 text-sm font-semibold text-right whitespace-nowrap ${txn.amount_cents < 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {txn.amount_cents < 0 ? "-" : "+"}{fmtMoney(txn.amount_cents, txn.currency)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`border-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${TYPE_STYLES[txn.transaction_type] ?? "bg-gray-100 text-gray-700"}`}>
                        {txn.transaction_type}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-sm">
                      {txn.is_reconciled ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mx-auto" /> : <span className="text-muted-foreground">&mdash;</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{txn.matched_order_id ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reconciliation Summary */}
      <div className="rounded-md border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Reconciliation</h3>
          <Link href="/finance/banking/reconciliation" className="text-xs font-medium text-primary hover:underline">View &rarr;</Link>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${reconciledPct}%` }} />
          </div>
          <span className="text-sm font-medium whitespace-nowrap">{reconciledCount}/{totalCount}</span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-muted-foreground">
            {unreconciledCount > 0 ? (
              <Link href="/finance/banking/reconciliation" className="text-amber-600 hover:underline">{unreconciledCount} need review</Link>
            ) : "All transactions reconciled"}
          </p>
          <Button variant="outline" size="sm" onClick={handleAutoReconcile} disabled={autoReconciling}>
            {autoReconciling ? "Running..." : "Run Auto-Reconcile"}
          </Button>
        </div>
      </div>
    </div>
  )
}
