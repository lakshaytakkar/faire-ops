"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { Search, Plus, ShoppingCart } from "lucide-react"
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

interface OrderRow {
  id: string
  order_number: string | null
  client_id: string | null
  order_type: string | null
  status: string | null
  payment_status: string | null
  fulfillment_status: string | null
  total_units: number | null
  total_amount: number | null
  created_at: string | null
}

interface ClientOption {
  id: string
  name: string
}

const STATUS_OPTIONS = ["draft", "confirmed", "processing", "shipped", "delivered", "cancelled"]
const PAYMENT_OPTIONS = ["unpaid", "partial", "paid", "refunded"]
const TYPE_OPTIONS = ["initial", "replenishment", "custom"]

export default function EtsOrdersPage() {
  const [rows, setRows] = useState<OrderRow[]>([])
  const [clientsById, setClientsById] = useState<Map<string, string>>(new Map())
  const [clients, setClients] = useState<ClientOption[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [paymentFilter, setPaymentFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabaseEts
      .from("orders")
      .select(
        "id, order_number, client_id, order_type, status, payment_status, fulfillment_status, total_units, total_amount, created_at",
      )
      .order("created_at", { ascending: false })
    const orderRows = (data ?? []) as OrderRow[]
    setRows(orderRows)

    const ids = Array.from(new Set(orderRows.map((r) => r.client_id).filter(Boolean) as string[]))
    if (ids.length) {
      const { data: cs } = await supabaseEts.from("clients").select("id,name").in("id", ids)
      setClientsById(new Map((cs ?? []).map((c: ClientOption) => [c.id, c.name])))
    } else {
      setClientsById(new Map())
    }
    setLoading(false)
  }

  async function loadClientOptions() {
    const { data } = await supabaseEts
      .from("clients")
      .select("id,name")
      .order("name")
      .limit(500)
    setClients((data ?? []) as ClientOption[])
  }

  useEffect(() => {
    load()
    loadClientOptions()
  }, [])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false
      if (paymentFilter !== "all" && r.payment_status !== paymentFilter) return false
      if (typeFilter !== "all" && r.order_type !== typeFilter) return false
      if (search.trim()) {
        const term = search.trim().toLowerCase()
        if (!(r.order_number ?? "").toLowerCase().includes(term)) return false
      }
      return true
    })
  }, [rows, search, statusFilter, paymentFilter, typeFilter])

  return (
    <EtsListShell
      title="Orders"
      subtitle={
        loading ? "Loading…" : `${filtered.length} of ${rows.length} order${rows.length === 1 ? "" : "s"}`
      }
      action={
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="size-4" /> New order
        </button>
      }
      filters={
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search order number…"
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
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="h-10 px-3 rounded-md border border-border bg-card text-sm"
          >
            <option value="all">All payments</option>
            {PAYMENT_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 px-3 rounded-md border border-border bg-card text-sm"
          >
            <option value="all">All types</option>
            {TYPE_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      }
    >
      {!loading && filtered.length === 0 ? (
        <EtsEmptyState
          icon={ShoppingCart}
          title="No orders match"
          description="Adjust filters or create a new order."
        />
      ) : (
        <EtsTable>
          <EtsTHead>
            <EtsTH>Order #</EtsTH>
            <EtsTH>Created</EtsTH>
            <EtsTH>Client</EtsTH>
            <EtsTH>Type</EtsTH>
            <EtsTH>Status</EtsTH>
            <EtsTH>Payment</EtsTH>
            <EtsTH>Fulfillment</EtsTH>
            <EtsTH className="text-right">Units</EtsTH>
            <EtsTH className="text-right">Total</EtsTH>
          </EtsTHead>
          <tbody>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              : filtered.map((o) => (
                  <EtsTR key={o.id}>
                    <EtsTD>
                      <Link href={`/ets/orders/${o.id}`} className="font-semibold text-sm hover:text-primary">
                        {o.order_number ?? o.id.slice(0, 8)}
                      </Link>
                    </EtsTD>
                    <EtsTD className="text-xs">{formatDate(o.created_at)}</EtsTD>
                    <EtsTD className="text-xs">
                      {o.client_id ? clientsById.get(o.client_id) ?? "—" : "—"}
                    </EtsTD>
                    <EtsTD className="text-xs">{o.order_type ?? "—"}</EtsTD>
                    <EtsTD><EtsStatusBadge value={o.status} /></EtsTD>
                    <EtsTD><EtsStatusBadge value={o.payment_status} /></EtsTD>
                    <EtsTD><EtsStatusBadge value={o.fulfillment_status} /></EtsTD>
                    <EtsTD className="text-right text-xs font-mono">{o.total_units ?? "—"}</EtsTD>
                    <EtsTD className="text-right text-xs font-mono">{formatCurrency(o.total_amount)}</EtsTD>
                  </EtsTR>
                ))}
          </tbody>
        </EtsTable>
      )}

      <NewOrderDrawer
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false)
          load()
        }}
        clients={clients}
      />
    </EtsListShell>
  )
}

function NewOrderDrawer({
  open,
  onClose,
  onCreated,
  clients,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
  clients: ClientOption[]
}) {
  const [clientId, setClientId] = useState("")
  const [orderType, setOrderType] = useState("initial")
  const [source, setSource] = useState("")
  const [status, setStatus] = useState("draft")
  const [paymentStatus, setPaymentStatus] = useState("unpaid")
  const [totalAmount, setTotalAmount] = useState("")
  const [notes, setNotes] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    if (!clientId) {
      setErr("Client is required.")
      return
    }
    setBusy(true)
    setErr(null)
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`
    const { error } = await supabaseEts.from("orders").insert({
      client_id: clientId,
      order_number: orderNumber,
      order_type: orderType,
      source: source.trim() || null,
      status,
      payment_status: paymentStatus,
      total_amount: totalAmount ? Number(totalAmount) : null,
      notes: notes.trim() || null,
    })
    setBusy(false)
    if (error) {
      setErr(error.message)
      return
    }
    setClientId("")
    setOrderType("initial")
    setSource("")
    setStatus("draft")
    setPaymentStatus("unpaid")
    setTotalAmount("")
    setNotes("")
    onCreated()
  }

  return (
    <EtsEditDrawer
      open={open}
      onClose={onClose}
      title="New order"
      subtitle="Create a new client order."
      footer={
        <>
          <button onClick={onClose} className="h-9 px-3 rounded-md border border-border bg-card text-sm font-medium hover:bg-muted/40">
            Cancel
          </button>
          <button onClick={submit} disabled={busy} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
            {busy ? "Creating…" : "Create"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Client" required>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm">
            <option value="">— Select client —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Order type">
          <select value={orderType} onChange={(e) => setOrderType(e.target.value)} className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm">
            {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Source">
          <input value={source} onChange={(e) => setSource(e.target.value)} className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm" placeholder="E.g. POS, app, manual" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm">
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Payment status">
            <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm">
              {PAYMENT_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Total amount (₹)">
          <input type="number" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm" />
        </Field>
        <Field label="Notes">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
        </Field>
        {err && (
          <div className="rounded-md bg-rose-50 text-rose-700 px-3 py-2 text-xs">{err}</div>
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
