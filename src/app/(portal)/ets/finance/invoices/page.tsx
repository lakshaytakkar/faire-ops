"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { Search, Receipt } from "lucide-react"
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

interface OrderInvoice {
  id: string
  order_number: string | null
  client_id: string | null
  store_id: string | null
  total_amount: number | null
  advance_paid: number | null
  balance_due: number | null
  payment_status: string | null
  status: string | null
  created_at: string | null
}

interface ClientMini {
  id: string
  name: string
}

export default function EtsFinanceInvoicesPage() {
  const [rows, setRows] = useState<OrderInvoice[]>([])
  const [clients, setClients] = useState<Map<string, string>>(new Map())
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [{ data: orders }, { data: clientRows }] = await Promise.all([
        supabaseEts
          .from("orders")
          .select(
            "id, order_number, client_id, store_id, total_amount, advance_paid, balance_due, payment_status, status, created_at",
          )
          .order("created_at", { ascending: false }),
        supabaseEts.from("clients").select("id, name"),
      ])
      if (cancelled) return
      setRows((orders ?? []) as OrderInvoice[])
      setClients(
        new Map(((clientRows ?? []) as ClientMini[]).map((c) => [c.id, c.name])),
      )
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const statuses = useMemo(() => {
    const set = new Set<string>()
    rows.forEach((r) => r.payment_status && set.add(r.payment_status))
    return Array.from(set).sort()
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.payment_status !== statusFilter) return false
      if (search.trim()) {
        const term = search.trim().toLowerCase()
        const clientName = r.client_id ? clients.get(r.client_id) ?? "" : ""
        const hay = [r.order_number, clientName].filter(Boolean).join(" ").toLowerCase()
        if (!hay.includes(term)) return false
      }
      return true
    })
  }, [rows, search, statusFilter, clients])

  const totals = useMemo(() => {
    let billed = 0
    let collected = 0
    let due = 0
    filtered.forEach((r) => {
      billed += Number(r.total_amount ?? 0)
      collected += Number(r.advance_paid ?? 0)
      due += Number(r.balance_due ?? 0)
    })
    return { billed, collected, due }
  }, [filtered])

  return (
    <EtsListShell
      title="Invoices"
      subtitle={
        loading
          ? "Loading…"
          : `${filtered.length} invoices · ${formatCurrency(totals.billed)} billed · ${formatCurrency(totals.collected)} collected · ${formatCurrency(totals.due)} due`
      }
      filters={
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search invoice number or client…"
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
          icon={Receipt}
          title="No invoices match"
          description="Invoices are generated from orders. Try creating an order first."
        />
      ) : (
        <EtsTable>
          <EtsTHead>
            <EtsTH>Invoice #</EtsTH>
            <EtsTH>Client</EtsTH>
            <EtsTH>Date</EtsTH>
            <EtsTH className="text-right">Total</EtsTH>
            <EtsTH className="text-right">Paid</EtsTH>
            <EtsTH className="text-right">Balance</EtsTH>
            <EtsTH>Payment</EtsTH>
            <EtsTH>Order</EtsTH>
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
              : filtered.map((o) => (
                  <EtsTR key={o.id}>
                    <EtsTD className="font-mono text-xs font-semibold">
                      {o.order_number ?? o.id.slice(0, 8)}
                    </EtsTD>
                    <EtsTD className="text-sm">
                      {o.client_id ? (
                        <Link
                          href={`/ets/sales/clients/${o.client_id}`}
                          className="font-medium hover:text-primary"
                        >
                          {clients.get(o.client_id) ?? "—"}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </EtsTD>
                    <EtsTD className="text-xs whitespace-nowrap">
                      {formatDate(o.created_at)}
                    </EtsTD>
                    <EtsTD className="text-right font-mono text-xs">
                      {formatCurrency(o.total_amount)}
                    </EtsTD>
                    <EtsTD className="text-right font-mono text-xs text-emerald-700">
                      {formatCurrency(o.advance_paid)}
                    </EtsTD>
                    <EtsTD className="text-right font-mono text-xs text-rose-700">
                      {formatCurrency(o.balance_due)}
                    </EtsTD>
                    <EtsTD>
                      <EtsStatusBadge value={o.payment_status} />
                    </EtsTD>
                    <EtsTD>
                      <Link
                        href={`/ets/orders/${o.id}`}
                        className="text-xs text-emerald-700 hover:underline"
                      >
                        view →
                      </Link>
                    </EtsTD>
                  </EtsTR>
                ))}
          </tbody>
        </EtsTable>
      )}
    </EtsListShell>
  )
}
