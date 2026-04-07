"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import {
  BookOpen,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Plus,
  Pencil,
  Trash2,
  X,
  Receipt,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import { Dialog } from "@base-ui/react/dialog"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type EntryType = "invoice" | "payment" | "refund" | "expense" | "payout"
type EntryStatus = "pending" | "completed" | "canceled"

interface LedgerEntry {
  id: string
  entry_date: string
  entry_type: EntryType
  description: string
  amount_cents: number
  currency: string
  vendor_id: string | null
  store_id: string | null
  order_id: string | null
  status: EntryStatus
  notes: string | null
  created_at: string
}

interface VendorOption {
  id: string
  name: string
}

interface StoreOption {
  id: string
  name: string
}

type EntryForm = {
  entry_date: string
  entry_type: EntryType
  description: string
  amount: string
  currency: string
  vendor_id: string | null
  store_id: string | null
  order_id: string | null
  status: EntryStatus
  notes: string | null
}

const EMPTY_FORM: EntryForm = {
  entry_date: new Date().toISOString().slice(0, 10),
  entry_type: "invoice",
  description: "",
  amount: "",
  currency: "USD",
  vendor_id: null,
  store_id: null,
  order_id: null,
  status: "pending",
  notes: null,
}

const ENTRY_TYPES: EntryType[] = ["invoice", "payment", "refund", "expense", "payout"]
const STATUSES: EntryStatus[] = ["pending", "completed", "canceled"]

/* ------------------------------------------------------------------ */
/*  Badge colors                                                       */
/* ------------------------------------------------------------------ */

const TYPE_STYLES: Record<EntryType, string> = {
  invoice: "bg-blue-50 text-blue-700",
  payment: "bg-emerald-50 text-emerald-700",
  refund: "bg-amber-50 text-amber-700",
  expense: "bg-red-50 text-red-700",
  payout: "bg-gray-100 text-gray-700",
}

const STATUS_STYLES: Record<EntryStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  completed: "bg-emerald-50 text-emerald-700",
  canceled: "bg-gray-100 text-gray-500",
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatAmount(cents: number, type: EntryType): string {
  const abs = Math.abs(cents) / 100
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  if (type === "expense" || type === "refund" || cents < 0) {
    return `-$${formatted}`
  }
  return `+$${formatted}`
}

function isExpenseType(type: EntryType): boolean {
  return type === "expense" || type === "refund"
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LedgerPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [vendors, setVendors] = useState<VendorOption[]>([])
  const [stores, setStores] = useState<StoreOption[]>([])
  const [loading, setLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null)
  const [form, setForm] = useState<EntryForm>(EMPTY_FORM)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

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

  /* filters */
  const [filterType, setFilterType] = useState<EntryType | "all">("all")
  const [filterStatus, setFilterStatus] = useState<EntryStatus | "all">("all")
  const [filterDateFrom, setFilterDateFrom] = useState("")
  const [filterDateTo, setFilterDateTo] = useState("")

  /* ---- fetch ---- */
  const fetchData = useCallback(async () => {
    setLoading(true)
    const [entriesRes, vendorsRes, storesRes] = await Promise.all([
      supabase
        .from("faire_ledger_entries")
        .select("*")
        .order("entry_date", { ascending: false }),
      supabase.from("faire_vendors").select("id, name").order("name"),
      supabase.from("faire_stores").select("id, name").order("name"),
    ])

    if (entriesRes.error) console.error("fetchEntries:", entriesRes.error)
    if (vendorsRes.error) console.error("fetchVendors:", vendorsRes.error)
    if (storesRes.error) console.error("fetchStores:", storesRes.error)

    setEntries(entriesRes.data ?? [])
    setVendors(vendorsRes.data ?? [])
    setStores(storesRes.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  /* ---- vendor / store lookup maps ---- */
  const vendorMap = useMemo(
    () => new Map(vendors.map((v) => [v.id, v.name])),
    [vendors]
  )
  const storeMap = useMemo(
    () => new Map(stores.map((s) => [s.id, s.name])),
    [stores]
  )

  /* ---- filtered entries ---- */
  const filtered = useMemo(() => {
    let result = entries
    if (filterType !== "all") result = result.filter((e) => e.entry_type === filterType)
    if (filterStatus !== "all") result = result.filter((e) => e.status === filterStatus)
    if (filterDateFrom) result = result.filter((e) => e.entry_date >= filterDateFrom)
    if (filterDateTo) result = result.filter((e) => e.entry_date <= filterDateTo)
    // Sort
    result = [...result].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1
      switch (sortKey) {
        case "date":
          return dir * (new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime())
        case "amount":
          return dir * (Math.abs(a.amount_cents) - Math.abs(b.amount_cents))
        default:
          return 0
      }
    })
    return result
  }, [entries, filterType, filterStatus, filterDateFrom, filterDateTo, sortKey, sortDir])

  /* ---- stats ---- */
  const totalEntries = filtered.length
  const totalIncome = filtered
    .filter((e) => !isExpenseType(e.entry_type) && e.amount_cents > 0)
    .reduce((s, e) => s + e.amount_cents, 0)
  const totalExpenses = filtered
    .filter((e) => isExpenseType(e.entry_type) || e.amount_cents < 0)
    .reduce((s, e) => s + Math.abs(e.amount_cents), 0)
  const netBalance = totalIncome - totalExpenses

  /* ---- dialog helpers ---- */
  function openAdd() {
    setEditingEntry(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(entry: LedgerEntry) {
    setEditingEntry(entry)
    setForm({
      entry_date: entry.entry_date,
      entry_type: entry.entry_type,
      description: entry.description,
      amount: (Math.abs(entry.amount_cents) / 100).toFixed(2),
      currency: entry.currency,
      vendor_id: entry.vendor_id,
      store_id: entry.store_id,
      order_id: entry.order_id,
      status: entry.status,
      notes: entry.notes,
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.description.trim() || !form.amount) return
    setSaving(true)

    const amountNum = parseFloat(form.amount)
    const cents = Math.round(amountNum * 100)
    const payload = {
      entry_date: form.entry_date,
      entry_type: form.entry_type,
      description: form.description,
      amount_cents: isExpenseType(form.entry_type) ? -Math.abs(cents) : Math.abs(cents),
      currency: form.currency,
      vendor_id: form.vendor_id || null,
      store_id: form.store_id || null,
      order_id: form.order_id || null,
      status: form.status,
      notes: form.notes || null,
    }

    if (editingEntry) {
      await supabase
        .from("faire_ledger_entries")
        .update(payload)
        .eq("id", editingEntry.id)
    } else {
      await supabase.from("faire_ledger_entries").insert(payload)
    }

    setSaving(false)
    setDialogOpen(false)
    fetchData()
  }

  async function handleDelete() {
    if (!deleteId) return
    await supabase.from("faire_ledger_entries").delete().eq("id", deleteId)
    setDeleteId(null)
    fetchData()
  }

  /* ---- loading skeleton ---- */
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-[48px] rounded-md bg-muted animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[70px] rounded-md bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-[400px] rounded-md bg-muted animate-pulse" />
      </div>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Ledger</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Financial tracking and accounting
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4" data-icon="inline-start" />
          Add Entry
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-md border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Entries</p>
          <p className="text-xl font-bold mt-1">{totalEntries}</p>
        </div>
        <div className="rounded-md border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Income</p>
          <p className="text-xl font-bold mt-1 text-emerald-600">
            +${(totalIncome / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-md border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Expenses</p>
          <p className="text-xl font-bold mt-1 text-red-600">
            -${(totalExpenses / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-md border bg-card p-4">
          <p className="text-xs text-muted-foreground">Net Balance</p>
          <p className={`text-xl font-bold mt-1 ${netBalance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {netBalance >= 0 ? "+" : "-"}${(Math.abs(netBalance) / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">From</label>
          <Input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="w-36"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">To</label>
          <Input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="w-36"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as EntryType | "all")}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="all">All Types</option>
          {ENTRY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as EntryStatus | "all")}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="all">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        {(filterType !== "all" ||
          filterStatus !== "all" ||
          filterDateFrom ||
          filterDateTo) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterType("all")
              setFilterStatus("all")
              setFilterDateFrom("")
              setFilterDateTo("")
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-md border bg-card p-12 text-center">
          <Receipt className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No entries found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {entries.length === 0
              ? "Add your first ledger entry to get started."
              : "Try adjusting your filters."}
          </p>
        </div>
      ) : (
        <div className="rounded-md border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("date")}>
                    <span className="flex items-center">Date <SortIcon col="date" /></span>
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Type</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Description</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("amount")}>
                    <span className="flex items-center justify-end">Amount <SortIcon col="amount" /></span>
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Vendor</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Store</th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-t hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-3 py-2.5 text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(entry.entry_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`border-0 text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_STYLES[entry.entry_type]}`}
                      >
                        {entry.entry_type}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-sm text-foreground max-w-[240px] truncate">
                      {entry.description}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-sm font-semibold text-right whitespace-nowrap ${
                        isExpenseType(entry.entry_type) || entry.amount_cents < 0
                          ? "text-red-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {formatAmount(entry.amount_cents, entry.entry_type)}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-muted-foreground whitespace-nowrap">
                      {entry.vendor_id ? vendorMap.get(entry.vendor_id) ?? "-" : "-"}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-muted-foreground whitespace-nowrap">
                      {entry.store_id ? storeMap.get(entry.store_id) ?? "-" : "-"}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`border-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[entry.status]}`}
                      >
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <div className="inline-flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openEdit(entry)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setDeleteId(entry.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card p-6 shadow-lg data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-semibold text-foreground">
                {editingEntry ? "Edit Entry" : "Add Entry"}
              </Dialog.Title>
              <Dialog.Close className="rounded-md p-1 hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Date</label>
                  <Input
                    type="date"
                    value={form.entry_date}
                    onChange={(e) => setForm({ ...form, entry_date: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Type</label>
                  <select
                    value={form.entry_type}
                    onChange={(e) =>
                      setForm({ ...form, entry_type: e.target.value as EntryType })
                    }
                    className="mt-1 h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {ENTRY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Description <span className="text-destructive">*</span>
                </label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Entry description"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Amount ($) <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="0.00"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as EntryStatus })
                    }
                    className="mt-1 h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Vendor</label>
                  <select
                    value={form.vendor_id ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, vendor_id: e.target.value || null })
                    }
                    className="mt-1 h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="">None</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Store</label>
                  <select
                    value={form.store_id ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, store_id: e.target.value || null })
                    }
                    className="mt-1 h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="">None</option>
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Order ID (optional)</label>
                <Input
                  value={form.order_id ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, order_id: e.target.value || null })
                  }
                  placeholder="e.g. bo_abc123"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Notes</label>
                <textarea
                  value={form.notes ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value || null })
                  }
                  placeholder="Additional notes..."
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5 pt-4 border-t">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !form.description.trim() || !form.amount}
              >
                {saving ? "Saving..." : editingEntry ? "Update" : "Create"}
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Confirmation Dialog */}
      <Dialog.Root open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card p-6 shadow-lg data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <Dialog.Title className="text-lg font-semibold text-foreground">
              Delete Entry
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete this ledger entry? This action cannot be undone.
            </Dialog.Description>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="outline" onClick={() => setDeleteId(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
