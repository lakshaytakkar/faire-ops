"use client"

import { useEffect, useState, useMemo } from "react"
import { TrendingUp } from "lucide-react"
import { supabaseEts } from "@/lib/supabase"
import {
  EtsListShell,
  EtsEmptyState,
  formatCurrency,
} from "@/app/(portal)/ets/_components/ets-ui"

interface PaymentMini {
  id: string
  amount: number | null
  status: string | null
  payment_method: string | null
  type: string | null
  date: string | null
  created_at: string | null
}

interface OrderMini {
  id: string
  total_amount: number | null
  advance_paid: number | null
  balance_due: number | null
  payment_status: string | null
  status: string | null
  created_at: string | null
}

export default function EtsFinanceAnalyticsPage() {
  const [payments, setPayments] = useState<PaymentMini[]>([])
  const [orders, setOrders] = useState<OrderMini[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [{ data: paymentRows }, { data: orderRows }] = await Promise.all([
        supabaseEts
          .from("payments")
          .select("id, amount, status, payment_method, type, date, created_at"),
        supabaseEts
          .from("orders")
          .select(
            "id, total_amount, advance_paid, balance_due, payment_status, status, created_at",
          ),
      ])
      if (cancelled) return
      setPayments((paymentRows ?? []) as PaymentMini[])
      setOrders((orderRows ?? []) as OrderMini[])
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const metrics = useMemo(() => {
    const totalReceived = payments
      .filter((p) => p.status === "paid" || p.status === "completed")
      .reduce((s, p) => s + Number(p.amount ?? 0), 0)
    const totalPending = payments
      .filter((p) => p.status === "pending")
      .reduce((s, p) => s + Number(p.amount ?? 0), 0)
    const orderValue = orders.reduce(
      (s, o) => s + Number(o.total_amount ?? 0),
      0,
    )
    const orderDue = orders.reduce(
      (s, o) => s + Number(o.balance_due ?? 0),
      0,
    )
    return {
      totalReceived,
      totalPending,
      orderValue,
      orderDue,
      activeOrders: orders.filter((o) => o.status !== "cancelled").length,
      paidCount: payments.filter(
        (p) => p.status === "paid" || p.status === "completed",
      ).length,
    }
  }, [payments, orders])

  const byMethod = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>()
    payments
      .filter((p) => p.status === "paid" || p.status === "completed")
      .forEach((p) => {
        const key = p.payment_method ?? "—"
        const entry = map.get(key) ?? { count: 0, total: 0 }
        entry.count += 1
        entry.total += Number(p.amount ?? 0)
        map.set(key, entry)
      })
    return Array.from(map.entries())
      .map(([method, v]) => ({ method, ...v }))
      .sort((a, b) => b.total - a.total)
  }, [payments])

  const byType = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>()
    payments.forEach((p) => {
      const key = p.type ?? "—"
      const entry = map.get(key) ?? { count: 0, total: 0 }
      entry.count += 1
      entry.total += Number(p.amount ?? 0)
      map.set(key, entry)
    })
    return Array.from(map.entries())
      .map(([type, v]) => ({ type, ...v }))
      .sort((a, b) => b.total - a.total)
  }, [payments])

  const byMonth = useMemo(() => {
    const map = new Map<string, number>()
    payments
      .filter((p) => p.status === "paid" || p.status === "completed")
      .forEach((p) => {
        const d = p.date ?? p.created_at
        if (!d) return
        const key = new Date(d).toISOString().slice(0, 7)
        map.set(key, (map.get(key) ?? 0) + Number(p.amount ?? 0))
      })
    return Array.from(map.entries())
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => a.month.localeCompare(b.month))
  }, [payments])

  const maxMonthTotal = Math.max(1, ...byMonth.map((m) => m.total))

  if (!loading && payments.length === 0 && orders.length === 0) {
    return (
      <EtsListShell title="Finance analytics" subtitle="No data yet">
        <EtsEmptyState
          icon={TrendingUp}
          title="No financial activity yet"
          description="Once payments and orders start flowing, this dashboard aggregates them automatically."
        />
      </EtsListShell>
    )
  }

  return (
    <EtsListShell
      title="Finance analytics"
      subtitle={
        loading
          ? "Loading…"
          : `Rolled up from ${payments.length} payments and ${orders.length} orders`
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi
          label="Received"
          value={formatCurrency(metrics.totalReceived)}
          hint={`${metrics.paidCount} payments`}
          tone="emerald"
        />
        <Kpi
          label="Pending"
          value={formatCurrency(metrics.totalPending)}
          tone="amber"
        />
        <Kpi
          label="Order value"
          value={formatCurrency(metrics.orderValue)}
          hint={`${metrics.activeOrders} active`}
        />
        <Kpi
          label="Outstanding"
          value={formatCurrency(metrics.orderDue)}
          tone="rose"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Revenue by month">
          {byMonth.length === 0 ? (
            <p className="text-xs text-muted-foreground">No paid events yet.</p>
          ) : (
            <div className="space-y-2">
              {byMonth.map((m) => (
                <div key={m.month} className="flex items-center gap-3">
                  <div className="text-xs w-16 shrink-0 font-mono">{m.month}</div>
                  <div className="flex-1 h-2 rounded bg-muted overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${(m.total / maxMonthTotal) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs font-mono w-24 text-right">
                    {formatCurrency(m.total)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="By payment method">
          {byMethod.length === 0 ? (
            <p className="text-xs text-muted-foreground">No paid events yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-[10px] uppercase text-muted-foreground tracking-wider">
                  <th className="py-2 text-left">Method</th>
                  <th className="py-2 text-right">Count</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {byMethod.map((m) => (
                  <tr key={m.method} className="border-b border-border/60 last:border-0">
                    <td className="py-2 capitalize">{m.method}</td>
                    <td className="py-2 text-right font-mono text-xs">{m.count}</td>
                    <td className="py-2 text-right font-mono text-xs">
                      {formatCurrency(m.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="By payment type">
          {byType.length === 0 ? (
            <p className="text-xs text-muted-foreground">No payments yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-[10px] uppercase text-muted-foreground tracking-wider">
                  <th className="py-2 text-left">Type</th>
                  <th className="py-2 text-right">Count</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {byType.map((t) => (
                  <tr key={t.type} className="border-b border-border/60 last:border-0">
                    <td className="py-2 capitalize">{t.type}</td>
                    <td className="py-2 text-right font-mono text-xs">{t.count}</td>
                    <td className="py-2 text-right font-mono text-xs">
                      {formatCurrency(t.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Collection efficiency">
          <div className="space-y-2 text-sm">
            <Row label="Billed" value={formatCurrency(metrics.orderValue)} mono />
            <Row
              label="Received"
              value={formatCurrency(metrics.totalReceived)}
              mono
              tone="emerald"
            />
            <Row
              label="Outstanding"
              value={formatCurrency(metrics.orderDue)}
              mono
              tone="rose"
            />
            <Row
              label="Pending events"
              value={formatCurrency(metrics.totalPending)}
              mono
              tone="amber"
            />
          </div>
        </Card>
      </div>
    </EtsListShell>
  )
}

function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint?: string
  tone?: "emerald" | "amber" | "rose"
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-700"
      : tone === "amber"
        ? "text-amber-700"
        : tone === "rose"
          ? "text-rose-700"
          : "text-foreground"
  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 text-lg font-bold font-mono ${toneClass}`}>{value}</div>
      {hint && (
        <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>
      )}
    </div>
  )
}

function Card({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm p-4">
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      {children}
    </div>
  )
}

function Row({
  label,
  value,
  mono,
  tone,
}: {
  label: string
  value: string
  mono?: boolean
  tone?: "emerald" | "amber" | "rose"
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-700"
      : tone === "amber"
        ? "text-amber-700"
        : tone === "rose"
          ? "text-rose-700"
          : "text-foreground"
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm ${mono ? "font-mono" : ""} ${toneClass}`}>
        {value}
      </span>
    </div>
  )
}
