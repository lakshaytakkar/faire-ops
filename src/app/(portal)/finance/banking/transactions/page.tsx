"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import {
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Plus,
  X,
} from "lucide-react"
import { Dialog } from "@base-ui/react/dialog"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type TxnType = "deposit" | "withdrawal" | "fee" | "payout" | "expense" | "conversion"
type TxnCategory = "payout" | "vendor_payment" | "shipping" | "subscription" | "refund" | "salary" | "other"

interface BankTransaction {
  id: string
  account_id: string | null
  amount_cents: number
  currency: string
  transaction_type: TxnType
  description: string
  reference: string | null
  transaction_date: string
  is_reconciled: boolean
  matched_order_id: string | null
  category: TxnCategory
  notes: string | null
}

type TxnForm = {
  transaction_date: string
  transaction_type: TxnType
  description: string
  amount: string
  category: TxnCategory
  reference: string
  notes: string
}

const EMPTY_FORM: TxnForm = {
  transaction_date: new Date().toISOString().slice(0, 10),
  transaction_type: "deposit",
  description: "",
  amount: "",
  category: "other",
  reference: "",
  notes: "",
}

const TXN_TYPES: TxnType[] = ["deposit", "withdrawal", "fee", "payout", "expense", "conversion"]
const CATEGORIES: TxnCategory[] = ["payout", "vendor_payment", "shipping", "subscription", "refund", "salary", "other"]

const TYPE_STYLES: Record<string, string> = {
  deposit: "bg-emerald-50 text-emerald-700",
  withdrawal: "bg-red-50 text-red-700",
  fee: "bg-amber-50 text-amber-700",
  payout: "bg-blue-50 text-blue-700",
  expense: "bg-gray-100 text-gray-700",
  conversion: "bg-gray-100 text-gray-700",
}

function fmtMoney(cents: number): string {
  return (Math.abs(cents) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function isDebit(type: TxnType): boolean {
  return type === "withdrawal" || type === "fee" || type === "expense"
}

const PAGE_SIZE = 20
const SEL_CLASS = "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<BankTransaction[]>([])
  const [accounts, setAccounts] = useState<{ id: string }[]>([])
  const [loading, setLoading] = useState(true)

  const [filterType, setFilterType] = useState<TxnType | "all">("all")
  const [filterStatus, setFilterStatus] = useState<"all" | "yes" | "no">("all")
  const [search, setSearch] = useState("")
  const [sortField, setSortField] = useState<"date" | "amount">("date")
  const [sortAsc, setSortAsc] = useState(false)
  const [page, setPage] = useState(0)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<TxnForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [txnRes, acctRes] = await Promise.all([
      supabase.from("bank_transactions_v2").select("*").order("transaction_date", { ascending: false }).limit(500),
      supabase.from("bank_accounts").select("id").limit(1),
    ])
    setTransactions(txnRes.data ?? [])
    setAccounts(acctRes.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = useMemo(() => {
    let result = transactions
    if (filterType !== "all") result = result.filter((t) => t.transaction_type === filterType)
    if (filterStatus === "yes") result = result.filter((t) => t.is_reconciled)
    if (filterStatus === "no") result = result.filter((t) => !t.is_reconciled)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((t) => t.description.toLowerCase().includes(q) || (t.reference ?? "").toLowerCase().includes(q))
    }
    result = [...result].sort((a, b) => {
      if (sortField === "date") return sortAsc ? a.transaction_date.localeCompare(b.transaction_date) : b.transaction_date.localeCompare(a.transaction_date)
      return sortAsc ? a.amount_cents - b.amount_cents : b.amount_cents - a.amount_cents
    })
    return result
  }, [transactions, filterType, filterStatus, search, sortField, sortAsc])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  useEffect(() => { setPage(0) }, [filterType, filterStatus, search, sortField, sortAsc])

  function toggleSort(field: "date" | "amount") {
    if (sortField === field) setSortAsc(!sortAsc)
    else { setSortField(field); setSortAsc(false) }
  }

  async function handleSave() {
    if (!form.description.trim() || !form.amount) return
    setSaving(true)
    const cents = Math.round(parseFloat(form.amount) * 100)
    await supabase.from("bank_transactions_v2").insert({
      account_id: accounts[0]?.id ?? null,
      transaction_date: form.transaction_date,
      transaction_type: form.transaction_type,
      description: form.description,
      amount_cents: isDebit(form.transaction_type) ? -Math.abs(cents) : Math.abs(cents),
      category: form.category,
      reference: form.reference || null,
      notes: form.notes || null,
    })
    setSaving(false)
    setDialogOpen(false)
    setForm(EMPTY_FORM)
    fetchData()
  }

  const hasFilters = filterType !== "all" || filterStatus !== "all" || search.trim()

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-[48px] rounded-md bg-muted animate-pulse" />
        <div className="h-[400px] rounded-md bg-muted animate-pulse" />
      </div>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Transactions</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} transaction{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        <Button size="sm" onClick={() => { setForm(EMPTY_FORM); setDialogOpen(true) }}>
          <Plus className="h-3.5 w-3.5" data-icon="inline-start" />
          Add Transaction
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select value={filterType} onChange={(e) => setFilterType(e.target.value as TxnType | "all")} className={SEL_CLASS}>
          <option value="all">All Types</option>
          {TXN_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as "all" | "yes" | "no")} className={SEL_CLASS}>
          <option value="all">All Status</option>
          <option value="yes">Reconciled</option>
          <option value="no">Unreconciled</option>
        </select>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="w-48 h-8" />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterType("all"); setFilterStatus("all"); setSearch("") }}>Clear</Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card overflow-hidden">
        {paged.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {transactions.length === 0 ? "No transactions yet." : "No matches for current filters."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    <button className="inline-flex items-center gap-1" onClick={() => toggleSort("date")}>
                      Date {sortField === "date" && (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                    </button>
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Description</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Type</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">
                    <button className="inline-flex items-center gap-1" onClick={() => toggleSort("amount")}>
                      Amount {sortField === "amount" && (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                    </button>
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Currency</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Category</th>
                  <th className="px-3 py-2.5 text-center text-xs font-medium text-muted-foreground">Reconciled</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Matched Order</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((txn) => (
                  <tr key={txn.id} className="border-t hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2.5 text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(txn.transaction_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-foreground max-w-[220px] truncate">{txn.description}</td>
                    <td className="px-3 py-2.5">
                      <span className={`border-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${TYPE_STYLES[txn.transaction_type] ?? "bg-gray-100 text-gray-700"}`}>
                        {txn.transaction_type}
                      </span>
                    </td>
                    <td className={`px-3 py-2.5 text-sm font-semibold text-right whitespace-nowrap ${txn.amount_cents < 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {txn.amount_cents < 0 ? "-" : "+"}${fmtMoney(txn.amount_cents)}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-muted-foreground">{txn.currency}</td>
                    <td className="px-3 py-2.5 text-sm text-muted-foreground whitespace-nowrap">{txn.category?.replace("_", " ") ?? "-"}</td>
                    <td className="px-3 py-2.5 text-center">
                      {txn.is_reconciled ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mx-auto" /> : <span className="text-muted-foreground">&mdash;</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{txn.matched_order_id ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t px-3 py-2.5">
            <p className="text-xs text-muted-foreground">
              {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon-xs" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => (
                <Button key={i} variant={page === i ? "default" : "outline"} size="xs" onClick={() => setPage(i)}>
                  {i + 1}
                </Button>
              )).slice(Math.max(0, page - 2), page + 3)}
              <Button variant="outline" size="icon-xs" onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page === totalPages - 1}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add Transaction Dialog */}
      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card p-6 shadow-lg data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-semibold text-foreground">Add Transaction</Dialog.Title>
              <Dialog.Close className="rounded-md p-1 hover:bg-muted transition-colors"><X className="h-4 w-4" /></Dialog.Close>
            </div>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Date</label>
                  <Input type="date" value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Type</label>
                  <select value={form.transaction_type} onChange={(e) => setForm({ ...form, transaction_type: e.target.value as TxnType })} className={`mt-1 w-full ${SEL_CLASS}`}>
                    {TXN_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Description <span className="text-destructive">*</span></label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Transaction description" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Amount ($) <span className="text-destructive">*</span></label>
                  <Input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as TxnCategory })} className={`mt-1 w-full ${SEL_CLASS}`}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Reference</label>
                <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="e.g. PO-12345" className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." rows={2} className="mt-1 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5 pt-4 border-t">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.description.trim() || !form.amount}>{saving ? "Saving..." : "Create"}</Button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
