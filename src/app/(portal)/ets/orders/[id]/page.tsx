"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { AlertTriangle, Plus, Package, Receipt, ClipboardCheck } from "lucide-react"
import { supabaseEts } from "@/lib/supabase"
import {
  EtsDetailShell,
  EtsKpi,
  EtsTabsPanel,
  EtsStatusBadge,
  EtsEmptyState,
  EtsTable,
  EtsTHead,
  EtsTH,
  EtsTR,
  EtsTD,
  EtsEditDrawer,
  formatCurrency,
  formatDate,
} from "@/app/(portal)/ets/_components/ets-ui"

interface Order {
  id: string
  store_id: string | null
  client_id: string | null
  order_number: string | null
  order_type: string | null
  source: string | null
  status: string | null
  fulfillment_status: string | null
  payment_status: string | null
  payment_method: string | null
  total_items: number | null
  total_units: number | null
  total_amount: number | null
  advance_paid: number | null
  balance_due: number | null
  eta_days: number | null
  expected_delivery: string | null
  notes: string | null
  is_flagged: boolean | null
  created_at: string | null
  updated_at: string | null
}

interface OrderItem {
  id: string
  order_id: string
  product_name: string | null
  quantity: number | null
  unit_price: number | null
  line_total: number | null
  status: string | null
}

interface PaymentRow {
  id: string
  type: string | null
  amount: number | null
  status: string | null
  payment_method: string | null
  payment_ref: string | null
  date: string | null
}

interface FulfillmentRow {
  id: string
  status: string | null
  priority: number | null
  source: string | null
  notes: string | null
  created_at: string | null
}

interface QcRow {
  id: string
  inspection_date: string | null
  total_items: number | null
  passed_items: number | null
  failed_items: number | null
  status: string | null
  notes: string | null
}

const STATUS_OPTIONS = ["draft", "confirmed", "processing", "shipped", "delivered", "cancelled"]
const PAYMENT_OPTIONS = ["unpaid", "partial", "paid", "refunded"]
const FULFILLMENT_OPTIONS = ["pending", "queued", "in_progress", "shipped", "delivered", "on_hold"]

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [clientName, setClientName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabaseEts.from("orders").select("*").eq("id", id).maybeSingle()
    if (error) setErr(error.message)
    setOrder(data as Order | null)
    if (data?.client_id) {
      const { data: c } = await supabaseEts.from("clients").select("name").eq("id", data.client_id).maybeSingle()
      setClientName((c as { name: string } | null)?.name ?? null)
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    if (id) load()
  }, [id, load])

  async function patch(updates: Partial<Order>) {
    setBusy(true)
    const { error } = await supabaseEts.from("orders").update(updates).eq("id", id)
    setBusy(false)
    if (error) {
      setErr(error.message)
      return
    }
    setOrder((o) => (o ? { ...o, ...updates } : o))
  }

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <div className="h-5 w-20 rounded bg-muted animate-pulse" />
        <div className="h-24 rounded-lg bg-muted animate-pulse" />
        <div className="h-64 rounded-lg bg-muted animate-pulse" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <Link href="/ets/orders" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to orders
        </Link>
        <EtsEmptyState
          icon={AlertTriangle}
          title="Order not found"
          description={err ?? "The order doesn't exist or was deleted."}
        />
      </div>
    )
  }

  return (
    <EtsDetailShell
      backHref="/ets/orders"
      backLabel="All orders"
      title={order.order_number ?? order.id.slice(0, 8)}
      subtitle={clientName ?? "—"}
      badges={
        <div className="flex items-center gap-1.5 flex-wrap">
          <EtsStatusBadge value={order.status} />
          <EtsStatusBadge value={order.payment_status} />
          <EtsStatusBadge value={order.fulfillment_status} />
          {order.is_flagged && <EtsStatusBadge value="flagged" />}
        </div>
      }
      kpis={
        <>
          <EtsKpi label="Total amount" value={formatCurrency(order.total_amount)} />
          <EtsKpi label="Advance paid" value={formatCurrency(order.advance_paid)} />
          <EtsKpi label="Balance due" value={formatCurrency(order.balance_due)} />
          <EtsKpi label="Total units" value={order.total_units ?? "—"} />
          <EtsKpi label="Payment" value={<EtsStatusBadge value={order.payment_status} />} />
          <EtsKpi label="Fulfillment" value={<EtsStatusBadge value={order.fulfillment_status} />} />
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        <EtsTabsPanel
          tabs={[
            { id: "items", label: "Items" },
            { id: "payments", label: "Payments" },
            { id: "fulfillment", label: "Fulfillment" },
            { id: "notes", label: "Notes" },
          ]}
          render={(active) => {
            if (active === "items") return <ItemsTab orderId={order.id} />
            if (active === "payments") return <PaymentsTab orderId={order.id} />
            if (active === "fulfillment") return <FulfillmentTab orderId={order.id} />
            if (active === "notes") return <NotesTab order={order} patch={patch} busy={busy} />
            return null
          }}
        />
        <RightRail order={order} patch={patch} busy={busy} />
      </div>
    </EtsDetailShell>
  )
}

function RightRail({
  order,
  patch,
  busy,
}: {
  order: Order
  patch: (u: Partial<Order>) => Promise<void>
  busy: boolean
}) {
  const [expected, setExpected] = useState(order.expected_delivery ?? "")

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/80 bg-card shadow-sm p-4 space-y-3">
        <h3 className="text-sm font-semibold">Status</h3>
        <Selector label="Status" value={order.status} options={STATUS_OPTIONS} onChange={(v) => patch({ status: v })} disabled={busy} />
        <Selector label="Payment status" value={order.payment_status} options={PAYMENT_OPTIONS} onChange={(v) => patch({ payment_status: v })} disabled={busy} />
        <Selector label="Fulfillment" value={order.fulfillment_status} options={FULFILLMENT_OPTIONS} onChange={(v) => patch({ fulfillment_status: v })} disabled={busy} />
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Expected delivery</label>
          <div className="flex gap-2">
            <input
              type="date"
              value={expected ?? ""}
              onChange={(e) => setExpected(e.target.value)}
              className="flex-1 h-9 rounded-md border border-border/80 bg-background px-2 text-sm"
            />
            <button
              onClick={() => patch({ expected_delivery: expected || null })}
              disabled={busy}
              className="h-9 px-3 rounded-md bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-60"
            >
              Save
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border/80 bg-card shadow-sm p-4 space-y-2">
        <h3 className="text-sm font-semibold">Meta</h3>
        <MetaRow label="Order #" value={order.order_number} />
        <MetaRow label="Type" value={order.order_type} />
        <MetaRow label="Source" value={order.source} />
        <MetaRow label="Created" value={formatDate(order.created_at)} />
        <MetaRow label="Updated" value={formatDate(order.updated_at)} />
      </div>
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value ?? "—"}</span>
    </div>
  )
}

function Selector({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string
  value: string | null
  options: string[]
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full h-9 rounded-md border border-border/80 bg-background px-2 text-sm"
      >
        <option value="">— Select —</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

// ─── Items tab ──────────────────────────────────────────────────────────────

function ItemsTab({ orderId }: { orderId: string }) {
  const [rows, setRows] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabaseEts
      .from("order_items")
      .select("id, order_id, product_name, quantity, unit_price, line_total, status")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })
    setRows((data ?? []) as OrderItem[])
    setLoading(false)
  }, [orderId])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="h-24 rounded bg-muted animate-pulse" />

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700"
        >
          <Plus className="size-3.5" /> Add item
        </button>
      </div>
      {rows.length === 0 ? (
        <EtsEmptyState icon={Package} title="No items yet" description="Add line items to this order." />
      ) : (
        <EtsTable>
          <EtsTHead>
            <EtsTH>Product</EtsTH>
            <EtsTH className="text-right">Qty</EtsTH>
            <EtsTH className="text-right">Unit price</EtsTH>
            <EtsTH className="text-right">Line total</EtsTH>
            <EtsTH>Status</EtsTH>
          </EtsTHead>
          <tbody>
            {rows.map((it) => (
              <EtsTR key={it.id}>
                <EtsTD className="text-sm">{it.product_name ?? "—"}</EtsTD>
                <EtsTD className="text-right text-xs font-mono">{it.quantity ?? "—"}</EtsTD>
                <EtsTD className="text-right text-xs font-mono">{formatCurrency(it.unit_price)}</EtsTD>
                <EtsTD className="text-right text-xs font-mono">{formatCurrency(it.line_total)}</EtsTD>
                <EtsTD><EtsStatusBadge value={it.status} /></EtsTD>
              </EtsTR>
            ))}
          </tbody>
        </EtsTable>
      )}
      <AddItemDrawer
        open={adding}
        onClose={() => setAdding(false)}
        onCreated={() => { setAdding(false); load() }}
        orderId={orderId}
      />
    </div>
  )
}

function AddItemDrawer({
  open,
  onClose,
  onCreated,
  orderId,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
  orderId: string
}) {
  const [productName, setProductName] = useState("")
  const [quantity, setQuantity] = useState("")
  const [unitPrice, setUnitPrice] = useState("")
  const [status, setStatus] = useState("pending")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    if (!productName.trim()) {
      setErr("Product name is required.")
      return
    }
    setBusy(true)
    setErr(null)
    const qty = quantity ? Number(quantity) : null
    const price = unitPrice ? Number(unitPrice) : null
    const lineTotal = qty && price ? qty * price : null
    const { error } = await supabaseEts.from("order_items").insert({
      order_id: orderId,
      product_name: productName.trim(),
      quantity: qty,
      unit_price: price,
      line_total: lineTotal,
      status,
    })
    setBusy(false)
    if (error) {
      setErr(error.message)
      return
    }
    setProductName("")
    setQuantity("")
    setUnitPrice("")
    setStatus("pending")
    onCreated()
  }

  return (
    <EtsEditDrawer
      open={open}
      onClose={onClose}
      title="Add line item"
      footer={
        <>
          <button onClick={onClose} className="h-9 px-3 rounded-md border border-border/80 bg-card text-sm font-medium hover:bg-muted/40">Cancel</button>
          <button onClick={submit} disabled={busy} className="h-9 px-3 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
            {busy ? "Adding…" : "Add"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Product name<span className="text-rose-600 ml-0.5">*</span></label>
          <input value={productName} onChange={(e) => setProductName(e.target.value)} className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Quantity</label>
            <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Unit price (₹)</label>
            <input type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
          <input value={status} onChange={(e) => setStatus(e.target.value)} className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm" />
        </div>
        {err && <div className="rounded-md bg-rose-50 text-rose-700 px-3 py-2 text-xs">{err}</div>}
      </div>
    </EtsEditDrawer>
  )
}

// ─── Payments tab ───────────────────────────────────────────────────────────

function PaymentsTab({ orderId }: { orderId: string }) {
  const [rows, setRows] = useState<PaymentRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data } = await supabaseEts
        .from("payments")
        .select("id, type, amount, status, payment_method, payment_ref, date")
        .eq("order_id", orderId)
        .order("date", { ascending: false })
      setRows((data ?? []) as PaymentRow[])
      setLoading(false)
    })()
  }, [orderId])

  if (loading) return <div className="h-24 rounded bg-muted animate-pulse" />
  if (rows.length === 0) {
    return <EtsEmptyState icon={Receipt} title="No payments yet" description="Payments tied to this order will appear here." />
  }

  return (
    <EtsTable>
      <EtsTHead>
        <EtsTH>Date</EtsTH>
        <EtsTH>Type</EtsTH>
        <EtsTH>Method</EtsTH>
        <EtsTH>Reference</EtsTH>
        <EtsTH className="text-right">Amount</EtsTH>
        <EtsTH>Status</EtsTH>
      </EtsTHead>
      <tbody>
        {rows.map((p) => (
          <EtsTR key={p.id}>
            <EtsTD className="text-xs">{formatDate(p.date)}</EtsTD>
            <EtsTD className="text-xs">{p.type ?? "—"}</EtsTD>
            <EtsTD className="text-xs">{p.payment_method ?? "—"}</EtsTD>
            <EtsTD className="text-xs font-mono">{p.payment_ref ?? "—"}</EtsTD>
            <EtsTD className="text-right text-xs font-mono">{formatCurrency(p.amount)}</EtsTD>
            <EtsTD><EtsStatusBadge value={p.status} /></EtsTD>
          </EtsTR>
        ))}
      </tbody>
    </EtsTable>
  )
}

// ─── Fulfillment tab ────────────────────────────────────────────────────────

function FulfillmentTab({ orderId }: { orderId: string }) {
  const [fq, setFq] = useState<FulfillmentRow[]>([])
  const [qc, setQc] = useState<QcRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const [fqRes, qcRes] = await Promise.all([
        supabaseEts.from("fulfillment_queue").select("id, status, priority, source, notes, created_at").eq("order_id", orderId).order("created_at", { ascending: false }),
        supabaseEts.from("qc_records").select("id, inspection_date, total_items, passed_items, failed_items, status, notes").eq("order_id", orderId).order("inspection_date", { ascending: false }),
      ])
      setFq((fqRes.data ?? []) as FulfillmentRow[])
      setQc((qcRes.data ?? []) as QcRow[])
      setLoading(false)
    })()
  }, [orderId])

  if (loading) return <div className="h-24 rounded bg-muted animate-pulse" />

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Fulfillment queue</h3>
        {fq.length === 0 ? (
          <EtsEmptyState icon={Package} title="Not in queue" description="No fulfillment jobs queued for this order." />
        ) : (
          <EtsTable>
            <EtsTHead>
              <EtsTH>Created</EtsTH>
              <EtsTH>Status</EtsTH>
              <EtsTH>Priority</EtsTH>
              <EtsTH>Source</EtsTH>
              <EtsTH>Notes</EtsTH>
            </EtsTHead>
            <tbody>
              {fq.map((f) => (
                <EtsTR key={f.id}>
                  <EtsTD className="text-xs">{formatDate(f.created_at)}</EtsTD>
                  <EtsTD><EtsStatusBadge value={f.status} /></EtsTD>
                  <EtsTD className="text-xs">{f.priority ?? "—"}</EtsTD>
                  <EtsTD className="text-xs">{f.source ?? "—"}</EtsTD>
                  <EtsTD className="text-xs text-muted-foreground truncate max-w-[260px]">{f.notes ?? "—"}</EtsTD>
                </EtsTR>
              ))}
            </tbody>
          </EtsTable>
        )}
      </div>
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">QC records</h3>
        {qc.length === 0 ? (
          <EtsEmptyState icon={ClipboardCheck} title="No QC records" description="No inspections performed on this order yet." />
        ) : (
          <EtsTable>
            <EtsTHead>
              <EtsTH>Inspected</EtsTH>
              <EtsTH className="text-right">Items</EtsTH>
              <EtsTH className="text-right">Passed</EtsTH>
              <EtsTH className="text-right">Failed</EtsTH>
              <EtsTH>Status</EtsTH>
            </EtsTHead>
            <tbody>
              {qc.map((q) => (
                <EtsTR key={q.id}>
                  <EtsTD className="text-xs">{formatDate(q.inspection_date)}</EtsTD>
                  <EtsTD className="text-right text-xs">{q.total_items ?? "—"}</EtsTD>
                  <EtsTD className="text-right text-xs">{q.passed_items ?? "—"}</EtsTD>
                  <EtsTD className="text-right text-xs">{q.failed_items ?? "—"}</EtsTD>
                  <EtsTD><EtsStatusBadge value={q.status} /></EtsTD>
                </EtsTR>
              ))}
            </tbody>
          </EtsTable>
        )}
      </div>
    </div>
  )
}

// ─── Notes tab ──────────────────────────────────────────────────────────────

function NotesTab({
  order,
  patch,
  busy,
}: {
  order: Order
  patch: (u: Partial<Order>) => Promise<void>
  busy: boolean
}) {
  const [value, setValue] = useState(order.notes ?? "")
  const [editing, setEditing] = useState(false)

  if (!editing) {
    return (
      <div className="space-y-3">
        <div className="rounded-md border border-border/60 bg-muted/20 p-4 text-sm whitespace-pre-wrap min-h-[120px]">
          {order.notes ?? <span className="text-muted-foreground italic">No notes yet.</span>}
        </div>
        <button
          onClick={() => { setValue(order.notes ?? ""); setEditing(true) }}
          className="h-8 px-2.5 rounded-md border border-border/80 bg-card text-xs font-medium hover:bg-muted/40"
        >
          Edit notes
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={8}
        className="w-full rounded-md border border-border/80 bg-background px-3 py-2 text-sm"
      />
      <div className="flex gap-2 justify-end">
        <button onClick={() => setEditing(false)} className="h-8 px-2.5 rounded-md border border-border/80 bg-card text-xs font-medium hover:bg-muted/40">Cancel</button>
        <button
          onClick={async () => { await patch({ notes: value || null }); setEditing(false) }}
          disabled={busy}
          className="h-8 px-2.5 rounded-md bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-60"
        >
          Save
        </button>
      </div>
    </div>
  )
}
