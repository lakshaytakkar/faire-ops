"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, Search, Truck, Trash2, Package } from "lucide-react"
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

interface QueueRow {
  id: string
  order_id: string | null
  priority: number | null
  status: string | null
  source: string | null
  assigned_to: string | null
  notes: string | null
  created_at: string | null
  orders?: { order_number: string | null } | null
}

interface OrderOpt {
  id: string
  order_number: string | null
}

const STATUSES = [
  "queued",
  "in_progress",
  "ready_to_ship",
  "shipped",
  "delivered",
  "on_hold",
]

export default function EtsDispatchPage() {
  const [rows, setRows] = useState<QueueRow[]>([])
  const [orders, setOrders] = useState<OrderOpt[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [drawer, setDrawer] = useState<{ open: boolean; row: QueueRow | null }>(
    { open: false, row: null },
  )

  async function load() {
    setLoading(true)
    const [{ data: q }, { data: o }] = await Promise.all([
      supabaseEts
        .from("fulfillment_queue")
        .select(
          "id, order_id, priority, status, source, assigned_to, notes, created_at, orders:order_id(order_number)",
        )
        .order("created_at", { ascending: false }),
      supabaseEts
        .from("orders")
        .select("id, order_number")
        .order("created_at", { ascending: false })
        .limit(50),
    ])
    setRows((q ?? []) as unknown as QueueRow[])
    setOrders((o ?? []) as OrderOpt[])
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
        const hay = [r.orders?.order_number, r.source, r.assigned_to, r.notes]
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
    await supabaseEts.from("fulfillment_queue").delete().eq("id", id)
    load()
  }

  async function markShipped(id: string) {
    await supabaseEts
      .from("fulfillment_queue")
      .update({ status: "shipped" })
      .eq("id", id)
    load()
  }

  return (
    <EtsListShell
      title="Dispatch"
      subtitle={
        loading ? "Loading…" : `${filtered.length} of ${rows.length} queued`
      }
      action={
        <button
          onClick={() => setDrawer({ open: true, row: null })}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="size-4" /> New dispatch
        </button>
      }
      filters={
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search order #, source, assignee…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-3 rounded-md border border-border bg-card text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-md border border-border bg-card text-sm"
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
          icon={Truck}
          title="No dispatch jobs match"
          description="Adjust filters or queue a new dispatch."
        />
      ) : (
        <EtsTable>
          <EtsTHead>
            <EtsTH>Order #</EtsTH>
            <EtsTH>Priority</EtsTH>
            <EtsTH>Status</EtsTH>
            <EtsTH>Source</EtsTH>
            <EtsTH>Assigned</EtsTH>
            <EtsTH>Notes</EtsTH>
            <EtsTH>Created</EtsTH>
            <EtsTH className="text-right">Actions</EtsTH>
          </EtsTHead>
          <tbody>
            {filtered.map((r) => (
              <EtsTR key={r.id} onClick={() => setDrawer({ open: true, row: r })}>
                <EtsTD>
                  <div className="flex items-center gap-1.5 font-mono text-xs">
                    <Package className="size-3.5 text-muted-foreground" />
                    {r.orders?.order_number ?? r.order_id?.slice(0, 8) ?? "—"}
                  </div>
                </EtsTD>
                <EtsTD>
                  <EtsStatusBadge value={r.priority ? `P${r.priority}` : null} />
                </EtsTD>
                <EtsTD>
                  <EtsStatusBadge value={r.status} />
                </EtsTD>
                <EtsTD className="text-xs">{r.source ?? "—"}</EtsTD>
                <EtsTD className="text-xs">{r.assigned_to ?? "—"}</EtsTD>
                <EtsTD className="text-xs text-muted-foreground max-w-xs truncate">
                  {r.notes ?? "—"}
                </EtsTD>
                <EtsTD className="text-xs">{formatDate(r.created_at)}</EtsTD>
                <EtsTD className="text-right">
                  <div className="inline-flex items-center gap-1.5">
                    {r.status !== "shipped" && r.status !== "delivered" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          markShipped(r.id)
                        }}
                        className="h-8 px-2 rounded-md border border-border bg-card text-xs font-medium hover:bg-muted/40"
                      >
                        Mark shipped
                      </button>
                    )}
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
                  </div>
                </EtsTD>
              </EtsTR>
            ))}
          </tbody>
        </EtsTable>
      )}

      <DispatchDrawer
        open={drawer.open}
        row={drawer.row}
        orders={orders}
        onClose={() => setDrawer({ open: false, row: null })}
        onSaved={() => {
          setDrawer({ open: false, row: null })
          load()
        }}
      />
    </EtsListShell>
  )
}

function DispatchDrawer({
  open,
  row,
  orders,
  onClose,
  onSaved,
}: {
  open: boolean
  row: QueueRow | null
  orders: OrderOpt[]
  onClose: () => void
  onSaved: () => void
}) {
  const [orderId, setOrderId] = useState("")
  const [priority, setPriority] = useState(3)
  const [status, setStatus] = useState("queued")
  const [source, setSource] = useState("")
  const [notes, setNotes] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setOrderId(row?.order_id ?? "")
    setPriority(row?.priority ?? 3)
    setStatus(row?.status ?? "queued")
    setSource(row?.source ?? "")
    setNotes(row?.notes ?? "")
    setErr(null)
  }, [open, row])

  async function save() {
    setBusy(true)
    setErr(null)
    const payload = {
      order_id: orderId || null,
      priority,
      status,
      source: source.trim() || null,
      notes: notes.trim() || null,
    }
    const q = row
      ? supabaseEts.from("fulfillment_queue").update(payload).eq("id", row.id)
      : supabaseEts.from("fulfillment_queue").insert(payload)
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
      title={row ? "Edit dispatch" : "New dispatch"}
      subtitle="Queue an order for fulfillment."
      footer={
        <>
          <button
            onClick={onClose}
            className="h-9 px-3 rounded-md border border-border bg-card text-sm font-medium hover:bg-muted/40"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
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
            className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="">— select —</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.order_number ?? o.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Priority">
            <select
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value, 10))}
              className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  P{n}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Source">
          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
            placeholder="faire / shopify / manual"
          />
        </Field>
        <Field label="Notes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full min-h-[88px] rounded-md border border-border bg-background px-3 py-2 text-sm"
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
