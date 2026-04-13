"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { Search, CreditCard } from "lucide-react"
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
  formatCurrency,
  formatDate,
} from "@/app/(portal)/ets/_components/ets-ui"

interface PaymentRow {
  id: string
  store_id: string | null
  client_id: string | null
  order_id: string | null
  type: string | null
  amount: number | null
  status: string | null
  payment_method: string | null
  payment_ref: string | null
  date: string | null
  notes: string | null
  created_at: string | null
}

interface ClientMini {
  id: string
  name: string
}

interface OrderMini {
  id: string
  order_number: string | null
}

export default function EtsFinancePaymentsPage() {
  const [rows, setRows] = useState<PaymentRow[]>([])
  const [clients, setClients] = useState<Map<string, string>>(new Map())
  const [orders, setOrders] = useState<Map<string, string>>(new Map())
  const [search, setSearch] = useState("")
  const [methodFilter, setMethodFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [{ data: payments }, { data: clientRows }, { data: orderRows }] =
        await Promise.all([
          supabaseEts
            .from("payments")
            .select(
              "id, store_id, client_id, order_id, type, amount, status, payment_method, payment_ref, date, notes, created_at",
            )
            .order("date", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false }),
          supabaseEts.from("clients").select("id, name"),
          supabaseEts.from("orders").select("id, order_number"),
        ])
      if (cancelled) return
      setRows((payments ?? []) as PaymentRow[])
      setClients(
        new Map(((clientRows ?? []) as ClientMini[]).map((c) => [c.id, c.name])),
      )
      setOrders(
        new Map(
          ((orderRows ?? []) as OrderMini[]).map((o) => [
            o.id,
            o.order_number ?? o.id.slice(0, 8),
          ]),
        ),
      )
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const methods = useMemo(() => {
    const set = new Set<string>()
    rows.forEach((r) => r.payment_method && set.add(r.payment_method))
    return Array.from(set).sort()
  }, [rows])

  const statuses = useMemo(() => {
    const set = new Set<string>()
    rows.forEach((r) => r.status && set.add(r.status))
    return Array.from(set).sort()
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (methodFilter !== "all" && r.payment_method !== methodFilter) return false
      if (statusFilter !== "all" && r.status !== statusFilter) return false
      if (search.trim()) {
        const term = search.trim().toLowerCase()
        const clientName = r.client_id ? clients.get(r.client_id) ?? "" : ""
        const orderNumber = r.order_id ? orders.get(r.order_id) ?? "" : ""
        const hay = [r.payment_ref, r.notes, r.type, clientName, orderNumber]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        if (!hay.includes(term)) return false
      }
      return true
    })
  }, [rows, search, methodFilter, statusFilter, clients, orders])

  const totals = useMemo(() => {
    let received = 0
    let pending = 0
    filtered.forEach((r) => {
      const amt = Number(r.amount ?? 0)
      if (r.status === "paid" || r.status === "completed") received += amt
      else if (r.status === "pending") pending += amt
    })
    return { received, pending }
  }, [filtered])

  return (
    <EtsListShell
      title="Payments"
      subtitle={
        loading
          ? "Loading…"
          : `${filtered.length} of ${rows.length} · ${formatCurrency(totals.received)} received · ${formatCurrency(totals.pending)} pending`
      }
      filters={
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search ref, notes, client, order…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-3 rounded-md border border-border bg-card text-sm"
            />
          </div>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="h-10 px-3 rounded-md border border-border bg-card text-sm"
          >
            <option value="all">All methods</option>
            {methods.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-md border border-border bg-card text-sm"
          >
            <option value="all">All statuses</option>
            {statuses.map((s) => (
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
          icon={CreditCard}
          title="No payments match"
          description="Try adjusting the filters or wait for new payment events."
        />
      ) : (
        <EtsTable>
          <EtsTHead>
            <EtsTH>Date</EtsTH>
            <EtsTH>Client</EtsTH>
            <EtsTH>Order</EtsTH>
            <EtsTH>Type</EtsTH>
            <EtsTH>Method</EtsTH>
            <EtsTH>Reference</EtsTH>
            <EtsTH className="text-right">Amount</EtsTH>
            <EtsTH>Status</EtsTH>
          </EtsTHead>
          <tbody>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              : filtered.map((p) => (
                  <EtsTR key={p.id}>
                    <EtsTD className="text-xs whitespace-nowrap">
                      {formatDate(p.date ?? p.created_at)}
                    </EtsTD>
                    <EtsTD className="text-sm">
                      {p.client_id ? (
                        <Link
                          href={`/ets/sales/clients/${p.client_id}`}
                          className="font-medium hover:text-primary"
                        >
                          {clients.get(p.client_id) ?? "—"}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </EtsTD>
                    <EtsTD className="text-xs">
                      {p.order_id ? (
                        <Link
                          href={`/ets/orders/${p.order_id}`}
                          className="font-mono hover:text-primary"
                        >
                          {orders.get(p.order_id) ?? "—"}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </EtsTD>
                    <EtsTD className="text-xs">{p.type ?? "—"}</EtsTD>
                    <EtsTD className="text-xs">{p.payment_method ?? "—"}</EtsTD>
                    <EtsTD className="text-xs font-mono text-muted-foreground truncate max-w-[180px]">
                      {p.payment_ref ?? "—"}
                    </EtsTD>
                    <EtsTD className="text-right font-mono text-xs">
                      {formatCurrency(p.amount)}
                    </EtsTD>
                    <EtsTD>
                      <EtsStatusBadge value={p.status} />
                    </EtsTD>
                  </EtsTR>
                ))}
          </tbody>
        </EtsTable>
      )}
    </EtsListShell>
  )
}
