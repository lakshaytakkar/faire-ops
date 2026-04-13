"use client"

import { useEffect, useMemo, useState } from "react"
import { PackageSearch, Search } from "lucide-react"
import { supabaseEts } from "@/lib/supabase"
import {
  EtsListShell,
  EtsTable,
  EtsTHead,
  EtsTH,
  EtsTR,
  EtsTD,
  EtsEmptyState,
  formatCurrency,
} from "@/app/(portal)/ets/_components/ets-ui"

interface ItemRow {
  id: string
  china_batch_id: string | null
  product_id: string | null
  quantity: number | null
  unit_cost_cny: number | null
  total_cost_cny: number | null
  cartons: number | null
  cbm: number | null
}

interface BatchOpt {
  id: string
  batch_name: string | null
}

export default function EtsStockPage() {
  const [rows, setRows] = useState<ItemRow[]>([])
  const [batches, setBatches] = useState<BatchOpt[]>([])
  const [batchFilter, setBatchFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const [{ data: items }, { data: bs }] = await Promise.all([
      supabaseEts
        .from("china_batch_items")
        .select("*")
        .order("created_at", { ascending: false }),
      supabaseEts
        .from("china_batches")
        .select("id, batch_name")
        .order("created_at", { ascending: false }),
    ])
    setRows((items ?? []) as ItemRow[])
    setBatches((bs ?? []) as BatchOpt[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const batchName = (id: string | null) =>
    batches.find((b) => b.id === id)?.batch_name ?? "—"

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (batchFilter !== "all" && r.china_batch_id !== batchFilter) return false
      if (search.trim()) {
        const t = search.trim().toLowerCase()
        const hay = [r.product_id, batchName(r.china_batch_id)]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        if (!hay.includes(t)) return false
      }
      return true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, batchFilter, search, batches])

  return (
    <EtsListShell
      title="Stock"
      subtitle={
        loading
          ? "Loading…"
          : `${filtered.length} of ${rows.length} line item${rows.length === 1 ? "" : "s"}`
      }
      filters={
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search product / batch…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-3 rounded-md border border-border bg-card text-sm"
            />
          </div>
          <select
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            className="h-10 px-3 rounded-md border border-border bg-card text-sm"
          >
            <option value="all">All batches</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.batch_name ?? b.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </div>
      }
    >
      {!loading && filtered.length === 0 ? (
        <EtsEmptyState
          icon={PackageSearch}
          title="No stock items"
          description="China batch items will appear here as batches are received."
        />
      ) : (
        <EtsTable>
          <EtsTHead>
            <EtsTH>Batch</EtsTH>
            <EtsTH>Product</EtsTH>
            <EtsTH className="text-right">Qty</EtsTH>
            <EtsTH className="text-right">Cartons</EtsTH>
            <EtsTH className="text-right">CBM</EtsTH>
            <EtsTH className="text-right">Unit (CNY)</EtsTH>
            <EtsTH className="text-right">Total (CNY)</EtsTH>
          </EtsTHead>
          <tbody>
            {filtered.map((r) => (
              <EtsTR key={r.id}>
                <EtsTD className="text-xs">{batchName(r.china_batch_id)}</EtsTD>
                <EtsTD className="font-mono text-xs">
                  {r.product_id?.slice(0, 8) ?? "—"}
                </EtsTD>
                <EtsTD className="text-right text-xs font-mono">
                  {r.quantity ?? "—"}
                </EtsTD>
                <EtsTD className="text-right text-xs font-mono">
                  {r.cartons ?? "—"}
                </EtsTD>
                <EtsTD className="text-right text-xs font-mono">
                  {r.cbm ?? "—"}
                </EtsTD>
                <EtsTD className="text-right text-xs font-mono">
                  {formatCurrency(r.unit_cost_cny, "¥")}
                </EtsTD>
                <EtsTD className="text-right text-xs font-mono">
                  {formatCurrency(r.total_cost_cny, "¥")}
                </EtsTD>
              </EtsTR>
            ))}
          </tbody>
        </EtsTable>
      )}
    </EtsListShell>
  )
}
