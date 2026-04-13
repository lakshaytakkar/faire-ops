"use client"

import { useEffect, useState, useMemo } from "react"
import { Search, Plus, Banknote, CheckCircle2 } from "lucide-react"
import { supabaseEts } from "@/lib/supabase"
import {
  EtsListShell,
  EtsTable,
  EtsTHead,
  EtsTH,
  EtsTR,
  EtsTD,
  EtsStatusBadge,
  EtsEmptyState,
  EtsEditDrawer,
  formatCurrency,
  formatDate,
} from "@/app/(portal)/ets/_components/ets-ui"

interface PayoutRow {
  id: string
  vendor_id: string | null
  amount: number | null
  currency: string | null
  payment_method: string | null
  reference_number: string | null
  status: string | null
  paid_at: string | null
  notes: string | null
  created_at: string | null
}

interface VendorOption {
  id: string
  name: string
}

const STATUS_OPTIONS = ["pending", "paid", "failed", "cancelled"]

export default function EtsVendorsPayoutsPage() {
  const [rows, setRows] = useState<PayoutRow[]>([])
  const [vendorsById, setVendorsById] = useState<Map<string, string>>(new Map())
  const [vendors, setVendors] = useState<VendorOption[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [vendorFilter, setVendorFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<PayoutRow | null>(null)
  const [creating, setCreating] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabaseEts
      .from("vendor_payouts")
      .select("id, vendor_id, amount, currency, payment_method, reference_number, status, paid_at, notes, created_at")
      .order("created_at", { ascending: false })
    const payoutRows = (data ?? []) as PayoutRow[]
    setRows(payoutRows)

    const ids = Array.from(new Set(payoutRows.map((r) => r.vendor_id).filter(Boolean) as string[]))
    if (ids.length) {
      const { data: vs } = await supabaseEts.from("vendors").select("id,name").in("id", ids)
      setVendorsById(new Map((vs ?? []).map((v: VendorOption) => [v.id, v.name])))
    } else {
      setVendorsById(new Map())
    }
    setLoading(false)
  }

  async function loadVendorOptions() {
    const { data } = await supabaseEts.from("vendors").select("id,name").order("name").limit(500)
    setVendors((data ?? []) as VendorOption[])
  }

  useEffect(() => {
    load()
    loadVendorOptions()
  }, [])

  const kpis = useMemo(() => {
    const totalPending = rows.filter((r) => r.status === "pending").reduce((s, r) => s + (r.amount ?? 0), 0)
    const totalPaid = rows.filter((r) => r.status === "paid").reduce((s, r) => s + (r.amount ?? 0), 0)
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const countThisMonth = rows.filter((r) => r.paid_at && new Date(r.paid_at) >= monthStart).length
    return { totalPending, totalPaid, countThisMonth }
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false
      if (vendorFilter !== "all" && r.vendor_id !== vendorFilter) return false
      if (search.trim()) {
        const term = search.trim().toLowerCase()
        if (!(r.reference_number ?? "").toLowerCase().includes(term)) return false
      }
      return true
    })
  }, [rows, search, statusFilter, vendorFilter])

  async function markPaid(p: PayoutRow) {
    const { error } = await supabaseEts
      .from("vendor_payouts")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", p.id)
    if (error) { alert(error.message); return }
    load()
  }

  return (
    <EtsListShell
      title="Vendor payouts"
      subtitle={loading ? "Loading…" : `${filtered.length} of ${rows.length} payout${rows.length === 1 ? "" : "s"}`}
      action={
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
        >
          <Plus className="size-4" /> New payout
        </button>
      }
      filters={
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search reference number…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-3 rounded-md border border-border/80 bg-card text-sm"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 px-3 rounded-md border border-border/80 bg-card text-sm">
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)} className="h-10 px-3 rounded-md border border-border/80 bg-card text-sm">
            <option value="all">All vendors</option>
            {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KpiCard label="Total pending" value={formatCurrency(kpis.totalPending)} />
        <KpiCard label="Total paid" value={formatCurrency(kpis.totalPaid)} />
        <KpiCard label="Paid this month" value={String(kpis.countThisMonth)} />
      </div>

      {!loading && filtered.length === 0 ? (
        <EtsEmptyState icon={Banknote} title="No payouts match" description="Adjust filters or create a new payout." />
      ) : (
        <EtsTable>
          <EtsTHead>
            <EtsTH>Vendor</EtsTH>
            <EtsTH className="text-right">Amount</EtsTH>
            <EtsTH>Currency</EtsTH>
            <EtsTH>Method</EtsTH>
            <EtsTH>Reference</EtsTH>
            <EtsTH>Status</EtsTH>
            <EtsTH>Paid at</EtsTH>
            <EtsTH>Created</EtsTH>
            <EtsTH></EtsTH>
          </EtsTHead>
          <tbody>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 w-full animate-pulse rounded bg-muted" /></td>
                    ))}
                  </tr>
                ))
              : filtered.map((p) => (
                  <EtsTR key={p.id} onClick={() => setEditing(p)}>
                    <EtsTD className="text-sm font-medium">{p.vendor_id ? vendorsById.get(p.vendor_id) ?? "—" : "—"}</EtsTD>
                    <EtsTD className="text-right text-xs font-mono">{formatCurrency(p.amount, p.currency === "USD" ? "$" : "₹")}</EtsTD>
                    <EtsTD className="text-xs">{p.currency ?? "—"}</EtsTD>
                    <EtsTD className="text-xs">{p.payment_method ?? "—"}</EtsTD>
                    <EtsTD className="text-xs font-mono">{p.reference_number ?? "—"}</EtsTD>
                    <EtsTD><EtsStatusBadge value={p.status} /></EtsTD>
                    <EtsTD className="text-xs">{formatDate(p.paid_at)}</EtsTD>
                    <EtsTD className="text-xs">{formatDate(p.created_at)}</EtsTD>
                    <EtsTD>
                      {p.status !== "paid" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); markPaid(p) }}
                          className="inline-flex items-center gap-1 h-7 px-2 rounded border border-emerald-300 text-emerald-700 text-[11px] font-medium hover:bg-emerald-50"
                        >
                          <CheckCircle2 className="size-3" /> Mark paid
                        </button>
                      )}
                    </EtsTD>
                  </EtsTR>
                ))}
          </tbody>
        </EtsTable>
      )}

      <PayoutDrawer
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={() => { setCreating(false); load() }}
        vendors={vendors}
      />
      <PayoutDrawer
        open={!!editing}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); load() }}
        vendors={vendors}
        existing={editing}
      />
    </EtsListShell>
  )
}

function KpiCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  )
}

function PayoutDrawer({
  open,
  onClose,
  onSaved,
  vendors,
  existing,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  vendors: VendorOption[]
  existing?: PayoutRow | null
}) {
  const [vendorId, setVendorId] = useState("")
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState("INR")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [referenceNumber, setReferenceNumber] = useState("")
  const [status, setStatus] = useState("pending")
  const [paidAt, setPaidAt] = useState("")
  const [notes, setNotes] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setVendorId(existing?.vendor_id ?? "")
      setAmount(existing?.amount != null ? String(existing.amount) : "")
      setCurrency(existing?.currency ?? "INR")
      setPaymentMethod(existing?.payment_method ?? "")
      setReferenceNumber(existing?.reference_number ?? "")
      setStatus(existing?.status ?? "pending")
      setPaidAt(existing?.paid_at ? existing.paid_at.slice(0, 10) : "")
      setNotes(existing?.notes ?? "")
      setErr(null)
    }
  }, [open, existing])

  async function submit() {
    if (!vendorId) { setErr("Vendor is required."); return }
    if (!amount) { setErr("Amount is required."); return }
    setBusy(true)
    setErr(null)
    const payload = {
      vendor_id: vendorId,
      amount: Number(amount),
      currency,
      payment_method: paymentMethod.trim() || null,
      reference_number: referenceNumber.trim() || null,
      status,
      paid_at: paidAt ? new Date(paidAt).toISOString() : null,
      notes: notes.trim() || null,
    }
    const { error } = existing
      ? await supabaseEts.from("vendor_payouts").update(payload).eq("id", existing.id)
      : await supabaseEts.from("vendor_payouts").insert(payload)
    setBusy(false)
    if (error) { setErr(error.message); return }
    onSaved()
  }

  async function remove() {
    if (!existing) return
    if (!confirm(`Delete payout ${existing.reference_number ?? existing.id.slice(0, 8)}?`)) return
    setBusy(true)
    const { error } = await supabaseEts.from("vendor_payouts").delete().eq("id", existing.id)
    setBusy(false)
    if (error) { setErr(error.message); return }
    onSaved()
  }

  return (
    <EtsEditDrawer
      open={open}
      onClose={onClose}
      title={existing ? "Edit payout" : "New payout"}
      footer={
        <>
          {existing && (
            <button onClick={remove} disabled={busy} className="h-9 px-3 rounded-md border border-rose-300 text-rose-700 bg-card text-sm font-medium hover:bg-rose-50 mr-auto disabled:opacity-60">
              Delete
            </button>
          )}
          <button onClick={onClose} className="h-9 px-3 rounded-md border border-border/80 bg-card text-sm font-medium hover:bg-muted/40">Cancel</button>
          <button onClick={submit} disabled={busy} className="h-9 px-3 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
            {busy ? "Saving…" : existing ? "Save" : "Create"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Vendor" required>
          <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm">
            <option value="">— Select vendor —</option>
            {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount" required>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm" />
          </Field>
          <Field label="Currency">
            <input value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm" />
          </Field>
        </div>
        <Field label="Payment method">
          <input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm" placeholder="bank-transfer / UPI / cheque" />
        </Field>
        <Field label="Reference number">
          <input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm">
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Paid at">
            <input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm" />
          </Field>
        </div>
        <Field label="Notes">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-md border border-border/80 bg-background px-3 py-2 text-sm" />
        </Field>
        {err && <div className="rounded-md bg-rose-50 text-rose-700 px-3 py-2 text-xs">{err}</div>}
      </div>
    </EtsEditDrawer>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">
        {label}
        {required && <span className="text-rose-600 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
