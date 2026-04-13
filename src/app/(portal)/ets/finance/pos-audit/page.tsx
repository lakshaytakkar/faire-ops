"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { Search, Wallet } from "lucide-react"
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

interface Session {
  id: string
  store_id: string | null
  cashier_id: string | null
  opened_at: string | null
  closed_at: string | null
  opening_cash: number | null
  closing_cash: number | null
  expected_cash: number | null
  cash_variance: number | null
  status: string | null
  notes: string | null
}

interface StoreMini {
  id: string
  name: string
}

export default function EtsFinancePosAuditPage() {
  const [rows, setRows] = useState<Session[]>([])
  const [stores, setStores] = useState<Map<string, string>>(new Map())
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [varianceFilter, setVarianceFilter] = useState("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [{ data: sessions }, { data: storeRows }] = await Promise.all([
        supabaseEts
          .from("pos_register_sessions")
          .select(
            "id, store_id, cashier_id, opened_at, closed_at, opening_cash, closing_cash, expected_cash, cash_variance, status, notes",
          )
          .order("opened_at", { ascending: false }),
        supabaseEts.from("stores").select("id, name"),
      ])
      if (cancelled) return
      setRows((sessions ?? []) as Session[])
      setStores(
        new Map(((storeRows ?? []) as StoreMini[]).map((s) => [s.id, s.name])),
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
    rows.forEach((r) => r.status && set.add(r.status))
    return Array.from(set).sort()
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false
      const variance = Number(r.cash_variance ?? 0)
      if (varianceFilter === "with" && variance === 0) return false
      if (varianceFilter === "short" && variance >= 0) return false
      if (varianceFilter === "over" && variance <= 0) return false
      if (search.trim()) {
        const term = search.trim().toLowerCase()
        const storeName = r.store_id ? stores.get(r.store_id) ?? "" : ""
        const hay = [storeName, r.notes].filter(Boolean).join(" ").toLowerCase()
        if (!hay.includes(term)) return false
      }
      return true
    })
  }, [rows, search, statusFilter, varianceFilter, stores])

  const totals = useMemo(() => {
    let shortage = 0
    let surplus = 0
    filtered.forEach((r) => {
      const v = Number(r.cash_variance ?? 0)
      if (v < 0) shortage += Math.abs(v)
      if (v > 0) surplus += v
    })
    return {
      shortage,
      surplus,
      withVariance: filtered.filter((r) => Number(r.cash_variance ?? 0) !== 0).length,
    }
  }, [filtered])

  return (
    <EtsListShell
      title="POS audit"
      subtitle={
        loading
          ? "Loading…"
          : `${filtered.length} sessions · ${totals.withVariance} with variance · ${formatCurrency(totals.shortage)} short · ${formatCurrency(totals.surplus)} over`
      }
      filters={
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search store or notes…"
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
          <select
            value={varianceFilter}
            onChange={(e) => setVarianceFilter(e.target.value)}
            className="h-10 px-3 rounded-md border border-border bg-card text-sm"
          >
            <option value="all">Any variance</option>
            <option value="with">Any variance (≠ 0)</option>
            <option value="short">Shortage only</option>
            <option value="over">Overage only</option>
          </select>
        </div>
      }
    >
      {!loading && filtered.length === 0 ? (
        <EtsEmptyState
          icon={Wallet}
          title="No sessions match"
          description="Cash register sessions appear here once stores begin operating."
        />
      ) : (
        <EtsTable>
          <EtsTHead>
            <EtsTH>Opened</EtsTH>
            <EtsTH>Store</EtsTH>
            <EtsTH className="text-right">Opening</EtsTH>
            <EtsTH className="text-right">Closing</EtsTH>
            <EtsTH className="text-right">Expected</EtsTH>
            <EtsTH className="text-right">Variance</EtsTH>
            <EtsTH>Closed</EtsTH>
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
              : filtered.map((s) => {
                  const variance = Number(s.cash_variance ?? 0)
                  const varianceTone =
                    variance === 0
                      ? "text-muted-foreground"
                      : variance > 0
                        ? "text-emerald-700"
                        : "text-rose-700"
                  return (
                    <EtsTR key={s.id}>
                      <EtsTD className="text-xs whitespace-nowrap">
                        {formatDate(s.opened_at)}
                      </EtsTD>
                      <EtsTD className="text-sm">
                        {s.store_id ? (
                          <Link
                            href={`/ets/stores/${s.store_id}`}
                            className="font-medium hover:text-primary"
                          >
                            {stores.get(s.store_id) ?? "—"}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </EtsTD>
                      <EtsTD className="text-right font-mono text-xs">
                        {formatCurrency(s.opening_cash)}
                      </EtsTD>
                      <EtsTD className="text-right font-mono text-xs">
                        {formatCurrency(s.closing_cash)}
                      </EtsTD>
                      <EtsTD className="text-right font-mono text-xs">
                        {formatCurrency(s.expected_cash)}
                      </EtsTD>
                      <EtsTD
                        className={`text-right font-mono text-xs font-semibold ${varianceTone}`}
                      >
                        {variance === 0
                          ? "—"
                          : `${variance > 0 ? "+" : ""}${formatCurrency(variance)}`}
                      </EtsTD>
                      <EtsTD className="text-xs whitespace-nowrap">
                        {formatDate(s.closed_at)}
                      </EtsTD>
                      <EtsTD>
                        <EtsStatusBadge value={s.status} />
                      </EtsTD>
                    </EtsTR>
                  )
                })}
          </tbody>
        </EtsTable>
      )}
    </EtsListShell>
  )
}
