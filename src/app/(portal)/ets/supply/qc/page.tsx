"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Plus, Search, Trash2 } from "lucide-react"
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
  formatDate,
} from "@/app/(portal)/ets/_components/ets-ui"

interface QcRow {
  id: string
  inspection_date: string | null
  order_id: string | null
  store_id: string | null
  total_items: number | null
  passed_items: number | null
  failed_items: number | null
  notes: string | null
  status: string | null
  resolution: string | null
}

interface OrderOpt {
  id: string
  order_number: string | null
}
interface StoreOpt {
  id: string
  name: string | null
}

const STATUSES = ["pending", "pass", "fail", "partial"]

export default function EtsQcPage() {
  const [rows, setRows] = useState<QcRow[]>([])
  const [orders, setOrders] = useState<OrderOpt[]>([])
  const [stores, setStores] = useState<StoreOpt[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [drawer, setDrawer] = useState<{ open: boolean; row: QcRow | null }>({
    open: false,
    row: null,
  })

  async function load() {
    setLoading(true)
    const [{ data: r }, { data: o }, { data: s }] = await Promise.all([
      supabaseEts
        .from("qc_records")
        .select("*")
        .order("inspection_date", { ascending: false }),
      supabaseEts
        .from("orders")
        .select("id, order_number")
        .order("created_at", { ascending: false })
        .limit(100),
      supabaseEts
        .from("stores")
        .select("id, name")
        .order("name"),
    ])
    setRows((r ?? []) as QcRow[])
    setOrders((o ?? []) as OrderOpt[])
    setStores((s ?? []) as StoreOpt[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false
      if (search.trim()) {
        const t = search.trim().toLowerCase()
        const hay = [r.notes, r.resolution, r.order_id]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        if (!hay.includes(t)) return false
      }
      return true
    })
  }, [rows, search, statusFilter])

  async function del(id: string) {
    if (!confirm("Delete?")) return
    await supabaseEts.from("qc_records").delete().eq("id", id)
    load()
  }

  return (
    <EtsListShell
      title="Quality control"
      subtitle={
        loading
          ? "Loading…"
          : `${filtered.length} of ${rows.length} record${rows.length === 1 ? "" : "s"}`
      }
      action={
        <button
          onClick={() => setDrawer({ open: true, row: null })}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
        >
          <Plus className="size-4" /> New QC record
        </button>
      }
      filters={
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search notes, resolution, order…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-3 rounded-md border border-border/80 bg-card text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-md border border-border/80 bg-card text-sm"
          >
            <option value="all">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      }
    >
      {!loading && filtered.length === 0 ? (
        <EtsEmptyState
          icon={CheckCircle2}
          title="No QC records match"
          description="Adjust filters or log a new inspection."
        />
      ) : (
        <EtsTable>
          <EtsTHead>
            <EtsTH>Inspection</EtsTH>
            <EtsTH>Order</EtsTH>
            <EtsTH className="text-right">Total</EtsTH>
            <EtsTH className="text-right">Pass</EtsTH>
            <EtsTH className="text-right">Fail</EtsTH>
            <EtsTH>Status</EtsTH>
            <EtsTH>Resolution</EtsTH>
            <EtsTH className="text-right">Actions</EtsTH>
          </EtsTHead>
          <tbody>
            {filtered.map((r) => (
              <EtsTR key={r.id} onClick={() => setDrawer({ open: true, row: r })}>
                <EtsTD className="text-xs">{formatDate(r.inspection_date)}</EtsTD>
                <EtsTD className="font-mono text-xs">
                  {r.order_id?.slice(0, 8) ?? "—"}
                </EtsTD>
                <EtsTD className="text-right text-xs font-mono">
                  {r.total_items ?? "—"}
                </EtsTD>
                <EtsTD className="text-right text-xs font-mono text-emerald-700">
                  {r.passed_items ?? "—"}
                </EtsTD>
                <EtsTD className="text-right text-xs font-mono text-rose-600">
                  {r.failed_items ?? "—"}
                </EtsTD>
                <EtsTD>
                  <EtsStatusBadge value={r.status} />
                </EtsTD>
                <EtsTD className="text-xs max-w-xs truncate">
                  {r.resolution ?? "—"}
                </EtsTD>
                <EtsTD className="text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      del(r.id)
                    }}
                    className="inline-flex size-8 items-center justify-center rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50"
                    aria-label="Delete"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </EtsTD>
              </EtsTR>
            ))}
          </tbody>
        </EtsTable>
      )}

      <QcDrawer
        open={drawer.open}
        row={drawer.row}
        orders={orders}
        stores={stores}
        onClose={() => setDrawer({ open: false, row: null })}
        onSaved={() => {
          setDrawer({ open: false, row: null })
          load()
        }}
      />
    </EtsListShell>
  )
}

function QcDrawer({
  open,
  row,
  orders,
  stores,
  onClose,
  onSaved,
}: {
  open: boolean
  row: QcRow | null
  orders: OrderOpt[]
  stores: StoreOpt[]
  onClose: () => void
  onSaved: () => void
}) {
  const [orderId, setOrderId] = useState("")
  const [storeId, setStoreId] = useState("")
  const [total, setTotal] = useState("")
  const [passed, setPassed] = useState("")
  const [failed, setFailed] = useState("")
  const [notes, setNotes] = useState("")
  const [status, setStatus] = useState("pending")
  const [resolution, setResolution] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setOrderId(row?.order_id ?? "")
    setStoreId(row?.store_id ?? "")
    setTotal(row?.total_items?.toString() ?? "")
    setPassed(row?.passed_items?.toString() ?? "")
    setFailed(row?.failed_items?.toString() ?? "")
    setNotes(row?.notes ?? "")
    setStatus(row?.status ?? "pending")
    setResolution(row?.resolution ?? "")
    setErr(null)
  }, [open, row])

  function intVal(v: string): number | null {
    if (!v.trim()) return null
    const n = parseInt(v, 10)
    return isNaN(n) ? null : n
  }

  async function save() {
    setBusy(true)
    setErr(null)
    const payload = {
      order_id: orderId || null,
      store_id: storeId || null,
      total_items: intVal(total),
      passed_items: intVal(passed),
      failed_items: intVal(failed),
      notes: notes.trim() || null,
      status,
      resolution: resolution.trim() || null,
    }
    const q = row
      ? supabaseEts.from("qc_records").update(payload).eq("id", row.id)
      : supabaseEts.from("qc_records").insert(payload)
    const { error } = await q
    setBusy(false)
    if (error) {
      setErr(error.message)
      return
    }
    onSaved()
  }

  return (
    <EtsEditDrawer
      open={open}
      onClose={onClose}
      title={row ? "Edit QC record" : "New QC record"}
      subtitle="Log inspection results."
      footer={
        <>
          <button
            onClick={onClose}
            className="h-9 px-3 rounded-md border border-border/80 bg-card text-sm font-medium hover:bg-muted/40"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="h-9 px-3 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Order">
          <select
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
          >
            <option value="">— select —</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.order_number ?? o.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Store">
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
          >
            <option value="">— select —</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name ?? s.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Total">
            <input
              type="number"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
            />
          </Field>
          <Field label="Passed">
            <input
              type="number"
              value={passed}
              onChange={(e) => setPassed(e.target.value)}
              className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
            />
          </Field>
          <Field label="Failed">
            <input
              type="number"
              value={failed}
              onChange={(e) => setFailed(e.target.value)}
              className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
            />
          </Field>
        </div>
        <Field label="Status">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Resolution">
          <input
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
            placeholder="Returned to vendor / accepted / replaced"
          />
        </Field>
        <Field label="Notes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full min-h-[88px] rounded-md border border-border/80 bg-background px-3 py-2 text-sm"
          />
        </Field>
        {err && (
          <div className="rounded-md bg-rose-50 text-rose-700 px-3 py-2 text-xs">
            {err}
          </div>
        )}
      </div>
    </EtsEditDrawer>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
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
