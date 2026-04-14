"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowLeft,
  Save,
  Send,
  Search,
  X,
  Package,
} from "lucide-react"
import { supabaseEts } from "@/lib/supabase"
import {
  EtsStatusBadge,
  EtsEmptyState,
  EtsTable,
  EtsTHead,
  EtsTH,
  EtsTR,
  EtsTD,
  formatCurrency,
  formatDate,
} from "@/app/(portal)/ets/_components/ets-ui"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Order {
  id: string
  client_id: string | null
  order_number: string | null
  order_type: string | null
  source: string | null
  status: string | null
  total_amount: number | null
  advance_pct: number | null
  requirement_notes: string | null
  packing_list_notes: string | null
  packing_list_json: PackingLine[] | null
  diff_from_requirement: DiffEntry[] | null
  submitted_at: string | null
  packing_list_ready_at: string | null
  approved_at: string | null
  advance_paid_at: string | null
  created_at: string | null
}

interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  product_name: string | null
  quantity: number | null
  unit_price: number | null
  line_total: number | null
}

interface ClientRow {
  id: string
  name: string | null
  email: string | null
}

// PackingLine is the admin's edited view of a single requirement row.
type PackingAction = "keep" | "qty_changed" | "oos" | "substituted"

interface PackingLine {
  requirement_item_id: string
  original_product_id: string | null
  original_product_name: string | null
  original_quantity: number
  original_unit_price: number
  action: PackingAction
  // For "keep" and "qty_changed"
  final_quantity: number
  // For "substituted"
  substitute_product_id?: string | null
  substitute_product_name?: string | null
  substitute_unit_price?: number | null
  substitute_quantity?: number | null
}

interface DiffEntry {
  product_id: string | null
  kind: "kept" | "qty_changed" | "removed" | "substituted"
  before: { product_id: string | null; product_name: string | null; quantity: number; unit_price: number }
  after:
    | { product_id: string | null; product_name: string | null; quantity: number; unit_price: number }
    | null
}

interface ProductHit {
  id: string
  name: string | null
  product_code: string | null
  cost_price: number | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [client, setClient] = useState<ClientRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const [lines, setLines] = useState<PackingLine[]>([])
  const [notes, setNotes] = useState("")
  const [savingDraft, setSavingDraft] = useState(false)
  const [sending, setSending] = useState(false)
  const [flash, setFlash] = useState<{ kind: "ok" | "err"; msg: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [orderRes, itemsRes] = await Promise.all([
      supabaseEts.from("orders").select("*").eq("id", id).maybeSingle(),
      supabaseEts
        .from("order_items")
        .select("id, order_id, product_id, product_name, quantity, unit_price, line_total")
        .eq("order_id", id)
        .order("id", { ascending: true }),
    ])
    if (orderRes.error) setErr(orderRes.error.message)
    const o = orderRes.data as Order | null
    setOrder(o)
    const rows = (itemsRes.data ?? []) as OrderItem[]
    setItems(rows)

    if (o?.client_id) {
      const { data: c } = await supabaseEts
        .from("clients")
        .select("id, name, email")
        .eq("id", o.client_id)
        .maybeSingle()
      setClient((c as ClientRow | null) ?? null)
    }

    // Hydrate packing-list editor state: prefer existing packing_list_json,
    // otherwise initialize from order_items (default = keep + original qty).
    const existing = o?.packing_list_json
    if (existing && Array.isArray(existing) && existing.length > 0) {
      setLines(existing)
    } else {
      setLines(
        rows.map((r) => ({
          requirement_item_id: r.id,
          original_product_id: r.product_id,
          original_product_name: r.product_name,
          original_quantity: Number(r.quantity ?? 0),
          original_unit_price: Number(r.unit_price ?? 0),
          action: "keep",
          final_quantity: Number(r.quantity ?? 0),
        })),
      )
    }
    setNotes(o?.packing_list_notes ?? "")
    setLoading(false)
  }, [id])

  useEffect(() => {
    if (id) load()
  }, [id, load])

  const isEditable = useMemo(() => {
    const s = order?.status
    // Admin can edit the packing list while order is pre-approval.
    return s === "submitted" || s === "packing_list_ready"
  }, [order?.status])

  function updateLine(idx: number, patch: Partial<PackingLine>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)))
  }

  function computeDiff(current: PackingLine[]): DiffEntry[] {
    return current.map<DiffEntry>((l) => {
      const before = {
        product_id: l.original_product_id,
        product_name: l.original_product_name,
        quantity: l.original_quantity,
        unit_price: l.original_unit_price,
      }
      if (l.action === "keep") {
        return { product_id: l.original_product_id, kind: "kept", before, after: before }
      }
      if (l.action === "qty_changed") {
        return {
          product_id: l.original_product_id,
          kind: "qty_changed",
          before,
          after: { ...before, quantity: Number(l.final_quantity) },
        }
      }
      if (l.action === "oos") {
        return { product_id: l.original_product_id, kind: "removed", before, after: null }
      }
      // substituted
      return {
        product_id: l.substitute_product_id ?? null,
        kind: "substituted",
        before,
        after: {
          product_id: l.substitute_product_id ?? null,
          product_name: l.substitute_product_name ?? null,
          quantity: Number(l.substitute_quantity ?? l.original_quantity),
          unit_price: Number(l.substitute_unit_price ?? l.original_unit_price),
        },
      }
    })
  }

  async function saveDraft() {
    if (!order) return
    setSavingDraft(true)
    setFlash(null)
    const diff = computeDiff(lines)
    const { error } = await supabaseEts
      .from("orders")
      .update({
        packing_list_json: lines,
        packing_list_notes: notes || null,
        diff_from_requirement: diff,
      })
      .eq("id", order.id)
    setSavingDraft(false)
    if (error) {
      setFlash({ kind: "err", msg: error.message })
      return
    }
    setFlash({ kind: "ok", msg: "Draft saved." })
  }

  async function sendToClient() {
    if (!order) return
    setSending(true)
    setFlash(null)
    const diff = computeDiff(lines)
    const nowIso = new Date().toISOString()
    const { error, data } = await supabaseEts
      .from("orders")
      .update({
        packing_list_json: lines,
        packing_list_notes: notes || null,
        diff_from_requirement: diff,
        status: "packing_list_ready",
        packing_list_ready_at: nowIso,
      })
      .eq("id", order.id)
      .select("*")
      .maybeSingle()
    setSending(false)
    if (error) {
      setFlash({ kind: "err", msg: error.message })
      return
    }
    setOrder((data as Order | null) ?? order)
    setFlash({ kind: "ok", msg: "Sent to client for approval." })
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
        <Link
          href="/ets/orders"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to orders
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
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <Link
        href="/ets/orders"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to orders
      </Link>

      {/* Header */}
      <div className="rounded-lg border bg-card shadow-sm px-5 py-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-heading text-2xl font-bold truncate">
              {order.order_number ?? order.id.slice(0, 8)}
            </h1>
            <EtsStatusBadge value={order.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {client?.name ?? "—"}
            {client?.email ? ` · ${client.email}` : ""} · Submitted{" "}
            {formatDate(order.submitted_at ?? order.created_at)}
          </p>
        </div>
        <div className="text-right shrink-0 text-xs text-muted-foreground">
          <div>
            Total:{" "}
            <span className="font-semibold text-foreground">
              {formatCurrency(order.total_amount)}
            </span>
          </div>
          {order.advance_pct != null && (
            <div>Advance: {order.advance_pct}%</div>
          )}
          {order.approved_at && (
            <div>Approved {formatDate(order.approved_at)}</div>
          )}
          {order.advance_paid_at && (
            <div>Advance paid {formatDate(order.advance_paid_at)}</div>
          )}
        </div>
      </div>

      {!isEditable && (
        <div className="rounded-md border border-amber-200 bg-amber-50 text-amber-900 px-4 py-2 text-xs">
          This order is in <span className="font-semibold">{order.status}</span>{" "}
          state — the packing list is locked. Original + adjustments are shown
          for reference.
        </div>
      )}

      {/* Two-column: requirement (left) + editor (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: original requirement */}
        <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b flex items-center justify-between">
            <div>
              <h2 className="text-[0.9375rem] font-semibold tracking-tight">
                Original requirement
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                What the client submitted — read-only.
              </p>
            </div>
            {order.requirement_notes && (
              <span className="text-xs text-muted-foreground italic truncate max-w-[40%]">
                Note: {order.requirement_notes}
              </span>
            )}
          </div>
          {items.length === 0 ? (
            <div className="p-6">
              <EtsEmptyState
                icon={Package}
                title="No items"
                description="The client didn't include any SKUs."
              />
            </div>
          ) : (
            <EtsTable>
              <EtsTHead>
                <EtsTH>Product</EtsTH>
                <EtsTH className="text-right">Qty</EtsTH>
                <EtsTH className="text-right">Unit ₹</EtsTH>
                <EtsTH className="text-right">Line total</EtsTH>
              </EtsTHead>
              <tbody>
                {items.map((it) => (
                  <EtsTR key={it.id}>
                    <EtsTD className="text-sm">
                      {it.product_name ?? "—"}
                      {it.product_id && (
                        <div className="text-[10px] font-mono text-muted-foreground">
                          {it.product_id}
                        </div>
                      )}
                    </EtsTD>
                    <EtsTD className="text-right text-xs font-mono">
                      {it.quantity ?? "—"}
                    </EtsTD>
                    <EtsTD className="text-right text-xs font-mono">
                      {formatCurrency(it.unit_price)}
                    </EtsTD>
                    <EtsTD className="text-right text-xs font-mono">
                      {formatCurrency(it.line_total)}
                    </EtsTD>
                  </EtsTR>
                ))}
              </tbody>
            </EtsTable>
          )}
        </div>

        {/* Right: packing-list editor */}
        <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b">
            <h2 className="text-[0.9375rem] font-semibold tracking-tight">
              Packing list
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Adjust qty, mark OOS, or substitute. Diff is auto-computed on save.
            </p>
          </div>
          <div className="divide-y">
            {lines.length === 0 && (
              <div className="p-6">
                <EtsEmptyState
                  icon={Package}
                  title="Nothing to pack"
                  description="No requirement lines found."
                />
              </div>
            )}
            {lines.map((line, idx) => (
              <PackingLineEditor
                key={line.requirement_item_id}
                line={line}
                disabled={!isEditable}
                onChange={(patch) => updateLine(idx, patch)}
              />
            ))}
          </div>

          <div className="border-t px-5 py-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Packing list notes (visible to client)
              </label>
              <textarea
                disabled={!isEditable}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm disabled:opacity-60"
                placeholder="E.g. Substituted 2 SKUs that went OOS — closest alternates selected."
              />
            </div>
            {flash && (
              <div
                className={
                  flash.kind === "ok"
                    ? "rounded-md bg-emerald-50 text-emerald-700 px-3 py-2 text-xs"
                    : "rounded-md bg-rose-50 text-rose-700 px-3 py-2 text-xs"
                }
              >
                {flash.msg}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={saveDraft}
                disabled={!isEditable || savingDraft || sending}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-card text-sm font-medium hover:bg-muted/40 disabled:opacity-60"
              >
                <Save className="size-4" />
                {savingDraft ? "Saving…" : "Save draft"}
              </button>
              <button
                onClick={sendToClient}
                disabled={!isEditable || savingDraft || sending || lines.length === 0}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
              >
                <Send className="size-4" />
                {sending ? "Sending…" : "Send to client"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Packing line editor row
// ─────────────────────────────────────────────────────────────────────────────

function PackingLineEditor({
  line,
  onChange,
  disabled,
}: {
  line: PackingLine
  onChange: (patch: Partial<PackingLine>) => void
  disabled?: boolean
}) {
  return (
    <div className="px-5 py-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">
            {line.original_product_name ?? "Unnamed product"}
          </div>
          <div className="text-[10px] font-mono text-muted-foreground">
            Requested: {line.original_quantity} ×{" "}
            {formatCurrency(line.original_unit_price)}
          </div>
        </div>
        <div className="shrink-0">
          <select
            disabled={disabled}
            value={line.action}
            onChange={(e) => {
              const action = e.target.value as PackingAction
              if (action === "keep") {
                onChange({ action, final_quantity: line.original_quantity })
              } else if (action === "qty_changed") {
                onChange({ action })
              } else if (action === "oos") {
                onChange({ action, final_quantity: 0 })
              } else {
                onChange({ action })
              }
            }}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs disabled:opacity-60"
          >
            <option value="keep">Keep</option>
            <option value="qty_changed">Change qty</option>
            <option value="oos">Mark OOS</option>
            <option value="substituted">Substitute with…</option>
          </select>
        </div>
      </div>

      {(line.action === "keep" || line.action === "qty_changed") && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Qty:</label>
          <input
            type="number"
            min={0}
            disabled={disabled || line.action === "keep"}
            value={line.final_quantity}
            onChange={(e) =>
              onChange({ final_quantity: Number(e.target.value || 0) })
            }
            className="h-8 w-24 rounded-md border border-border bg-background px-2 text-xs disabled:opacity-60"
          />
        </div>
      )}

      {line.action === "oos" && (
        <div className="text-xs text-rose-700 italic">
          Will be removed from the shipment.
        </div>
      )}

      {line.action === "substituted" && (
        <div className="rounded-md border bg-muted/30 p-2 space-y-2">
          {line.substitute_product_id ? (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-medium truncate">
                  ↪ {line.substitute_product_name}
                </div>
                <div className="text-[10px] font-mono text-muted-foreground">
                  {line.substitute_product_id} ·{" "}
                  {formatCurrency(line.substitute_unit_price ?? null)}
                </div>
              </div>
              {!disabled && (
                <button
                  onClick={() =>
                    onChange({
                      substitute_product_id: null,
                      substitute_product_name: null,
                      substitute_unit_price: null,
                      substitute_quantity: null,
                    })
                  }
                  className="shrink-0 h-7 w-7 rounded-md border border-border bg-background text-muted-foreground hover:text-foreground"
                  aria-label="Clear substitute"
                >
                  <X className="size-3.5 mx-auto" />
                </button>
              )}
            </div>
          ) : (
            <ProductPicker
              disabled={disabled}
              onPick={(p) =>
                onChange({
                  substitute_product_id: p.id,
                  substitute_product_name: p.name,
                  substitute_unit_price: p.cost_price ?? null,
                  substitute_quantity: line.original_quantity,
                })
              }
            />
          )}
          {line.substitute_product_id && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Qty:</label>
              <input
                type="number"
                min={0}
                disabled={disabled}
                value={line.substitute_quantity ?? line.original_quantity}
                onChange={(e) =>
                  onChange({ substitute_quantity: Number(e.target.value || 0) })
                }
                className="h-8 w-24 rounded-md border border-border bg-background px-2 text-xs disabled:opacity-60"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Product picker — debounced Supabase search against ets.products
// ─────────────────────────────────────────────────────────────────────────────

function ProductPicker({
  onPick,
  disabled,
}: {
  onPick: (p: ProductHit) => void
  disabled?: boolean
}) {
  const [q, setQ] = useState("")
  const [results, setResults] = useState<ProductHit[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const term = q.trim()
    if (!term || term.length < 2) {
      setResults([])
      return
    }
    let cancelled = false
    setSearching(true)
    const timer = setTimeout(async () => {
      const { data } = await supabaseEts
        .from("products")
        .select("id, name_en, name_cn, product_code, cost_price")
        .or(
          `name_en.ilike.%${term}%,name_cn.ilike.%${term}%,product_code.ilike.%${term}%`,
        )
        .eq("is_active", true)
        .limit(10)
      if (cancelled) return
      setResults(
        ((data ?? []) as Array<{
          id: string
          name_en: string | null
          name_cn: string | null
          product_code: string | null
          cost_price: number | null
        }>).map((r) => ({
          id: r.id,
          name: r.name_en || r.name_cn || "Unnamed",
          product_code: r.product_code,
          cost_price: r.cost_price,
        })),
      )
      setSearching(false)
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [q])

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <input
          disabled={disabled}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products (name or SKU)…"
          className="w-full h-8 pl-7 pr-3 rounded-md border border-border bg-background text-xs disabled:opacity-60"
        />
      </div>
      {q.trim().length >= 2 && (
        <div className="max-h-48 overflow-y-auto rounded-md border bg-background">
          {searching && (
            <div className="px-2 py-2 text-xs text-muted-foreground">
              Searching…
            </div>
          )}
          {!searching && results.length === 0 && (
            <div className="px-2 py-2 text-xs text-muted-foreground">
              No matches.
            </div>
          )}
          {!searching &&
            results.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  onPick(r)
                  setQ("")
                  setResults([])
                }}
                className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted/40 flex items-center justify-between gap-2"
              >
                <span className="truncate">{r.name}</span>
                <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                  {r.product_code ?? r.id.slice(0, 6)}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
