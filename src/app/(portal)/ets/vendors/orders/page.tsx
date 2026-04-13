"use client"

import { useEffect, useState, useMemo } from "react"
import { Search, Plus, ScrollText } from "lucide-react"
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

interface VendorOrderRow {
  id: string
  vendor_id: string | null
  po_number: string | null
  status: string | null
  total_inr: number | null
  expected_delivery: string | null
  actual_delivery: string | null
  notes: string | null
  created_at: string | null
}

interface VendorOption {
  id: string
  name: string
}

const STATUS_OPTIONS = ["draft", "sent", "confirmed", "in_production", "shipped", "received", "cancelled"]

export default function EtsVendorsOrdersPage() {
  const [rows, setRows] = useState<VendorOrderRow[]>([])
  const [vendorsById, setVendorsById] = useState<Map<string, string>>(new Map())
  const [vendors, setVendors] = useState<VendorOption[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [vendorFilter, setVendorFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<VendorOrderRow | null>(null)
  const [creating, setCreating] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabaseEts
      .from("vendor_orders")
      .select("id, vendor_id, po_number, status, total_inr, expected_delivery, actual_delivery, notes, created_at")
      .order("created_at", { ascending: false })
    const orderRows = (data ?? []) as VendorOrderRow[]
    setRows(orderRows)

    const ids = Array.from(new Set(orderRows.map((r) => r.vendor_id).filter(Boolean) as string[]))
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

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false
      if (vendorFilter !== "all" && r.vendor_id !== vendorFilter) return false
      if (search.trim()) {
        const term = search.trim().toLowerCase()
        if (!(r.po_number ?? "").toLowerCase().includes(term)) return false
      }
      return true
    })
  }, [rows, search, statusFilter, vendorFilter])

  return (
    <EtsListShell
      title="Vendor orders"
      subtitle={
        loading ? "Loading…" : `${filtered.length} of ${rows.length} purchase order${rows.length === 1 ? "" : "s"}`
      }
      action={
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
        >
          <Plus className="size-4" /> New vendor order
        </button>
      }
      filters={
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search PO number…"
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
      {!loading && filtered.length === 0 ? (
        <EtsEmptyState icon={ScrollText} title="No vendor orders match" description="Adjust filters or create a new PO." />
      ) : (
        <EtsTable>
          <EtsTHead>
            <EtsTH>PO #</EtsTH>
            <EtsTH>Vendor</EtsTH>
            <EtsTH>Status</EtsTH>
            <EtsTH className="text-right">Total (INR)</EtsTH>
            <EtsTH>Expected</EtsTH>
            <EtsTH>Actual</EtsTH>
            <EtsTH>Created</EtsTH>
          </EtsTHead>
          <tbody>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 w-full animate-pulse rounded bg-muted" /></td>
                    ))}
                  </tr>
                ))
              : filtered.map((vo) => (
                  <EtsTR key={vo.id} onClick={() => setEditing(vo)}>
                    <EtsTD><div className="font-semibold text-sm">{vo.po_number ?? vo.id.slice(0, 8)}</div></EtsTD>
                    <EtsTD className="text-xs">{vo.vendor_id ? vendorsById.get(vo.vendor_id) ?? "—" : "—"}</EtsTD>
                    <EtsTD><EtsStatusBadge value={vo.status} /></EtsTD>
                    <EtsTD className="text-right text-xs font-mono">{formatCurrency(vo.total_inr)}</EtsTD>
                    <EtsTD className="text-xs">{formatDate(vo.expected_delivery)}</EtsTD>
                    <EtsTD className="text-xs">{formatDate(vo.actual_delivery)}</EtsTD>
                    <EtsTD className="text-xs">{formatDate(vo.created_at)}</EtsTD>
                  </EtsTR>
                ))}
          </tbody>
        </EtsTable>
      )}

      <VendorOrderDrawer
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={() => { setCreating(false); load() }}
        vendors={vendors}
      />
      <VendorOrderDrawer
        open={!!editing}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); load() }}
        vendors={vendors}
        existing={editing}
      />
    </EtsListShell>
  )
}

function VendorOrderDrawer({
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
  existing?: VendorOrderRow | null
}) {
  const [vendorId, setVendorId] = useState("")
  const [poNumber, setPoNumber] = useState("")
  const [status, setStatus] = useState("draft")
  const [totalInr, setTotalInr] = useState("")
  const [expected, setExpected] = useState("")
  const [notes, setNotes] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setVendorId(existing?.vendor_id ?? "")
      setPoNumber(existing?.po_number ?? "")
      setStatus(existing?.status ?? "draft")
      setTotalInr(existing?.total_inr != null ? String(existing.total_inr) : "")
      setExpected(existing?.expected_delivery ?? "")
      setNotes(existing?.notes ?? "")
      setErr(null)
    }
  }, [open, existing])

  async function submit() {
    if (!vendorId) {
      setErr("Vendor is required.")
      return
    }
    setBusy(true)
    setErr(null)
    const payload = {
      vendor_id: vendorId,
      po_number: poNumber.trim() || null,
      status,
      total_inr: totalInr ? Number(totalInr) : null,
      expected_delivery: expected || null,
      notes: notes.trim() || null,
    }
    const { error } = existing
      ? await supabaseEts.from("vendor_orders").update(payload).eq("id", existing.id)
      : await supabaseEts.from("vendor_orders").insert(payload)
    setBusy(false)
    if (error) {
      setErr(error.message)
      return
    }
    onSaved()
  }

  async function remove() {
    if (!existing) return
    if (!confirm(`Delete vendor order ${existing.po_number ?? existing.id.slice(0, 8)}?`)) return
    setBusy(true)
    const { error } = await supabaseEts.from("vendor_orders").delete().eq("id", existing.id)
    setBusy(false)
    if (error) { setErr(error.message); return }
    onSaved()
  }

  return (
    <EtsEditDrawer
      open={open}
      onClose={onClose}
      title={existing ? `Edit ${existing.po_number ?? "vendor order"}` : "New vendor order"}
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
        <Field label="PO number">
          <input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm" placeholder="PO-…" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm">
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Total (INR)">
            <input type="number" value={totalInr} onChange={(e) => setTotalInr(e.target.value)} className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm" />
          </Field>
        </div>
        <Field label="Expected delivery">
          <input type="date" value={expected} onChange={(e) => setExpected(e.target.value)} className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm" />
        </Field>
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
