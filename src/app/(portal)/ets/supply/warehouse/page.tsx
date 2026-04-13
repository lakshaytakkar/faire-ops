"use client"

import { useEffect, useState } from "react"
import { Warehouse, Ship, Truck, Package } from "lucide-react"
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

interface BatchRow {
  id: string
  batch_name: string | null
  etd: string | null
  eta: string | null
  vessel_name: string | null
  status: string | null
  total_cbm: number | null
  total_india_cost_inr: number | null
}

const IN_TRANSIT = ["ordered", "in-transit", "at-port", "in_transit"]
const AT_WH = ["cleared", "delivered"]
const QUEUE = ["queued", "in_progress"]
const VISIBLE = ["in-transit", "at-port", "cleared", "delivered"]

export default function EtsWarehousePage() {
  const [batches, setBatches] = useState<BatchRow[]>([])
  const [counts, setCounts] = useState({ inTransit: 0, atWarehouse: 0, queue: 0 })
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const [
      { data: rows },
      { count: it },
      { count: aw },
      { count: dq },
    ] = await Promise.all([
      supabaseEts
        .from("china_batches")
        .select(
          "id, batch_name, etd, eta, vessel_name, status, total_cbm, total_india_cost_inr",
        )
        .in("status", VISIBLE)
        .order("eta", { ascending: true }),
      supabaseEts
        .from("china_batches")
        .select("id", { count: "exact", head: true })
        .in("status", IN_TRANSIT),
      supabaseEts
        .from("china_batches")
        .select("id", { count: "exact", head: true })
        .in("status", AT_WH),
      supabaseEts
        .from("fulfillment_queue")
        .select("id", { count: "exact", head: true })
        .in("status", QUEUE),
    ])
    setBatches((rows ?? []) as BatchRow[])
    setCounts({ inTransit: it ?? 0, atWarehouse: aw ?? 0, queue: dq ?? 0 })
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = batches.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false
    if (search.trim()) {
      const t = search.trim().toLowerCase()
      const hay = [r.batch_name, r.vessel_name].filter(Boolean).join(" ").toLowerCase()
      if (!hay.includes(t)) return false
    }
    return true
  })

  return (
    <EtsListShell
      title="Warehouse"
      subtitle={loading ? "Loading…" : "Inbound visibility + stock at hand."}
      filters={
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <input
              type="text"
              placeholder="Search batch / vessel…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-border bg-card text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-md border border-border bg-card text-sm"
          >
            <option value="all">All statuses</option>
            {VISIBLE.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard
          icon={Ship}
          label="In transit"
          value={counts.inTransit}
          hint="China batches en route"
        />
        <KpiCard
          icon={Warehouse}
          label="At warehouse"
          value={counts.atWarehouse}
          hint="Cleared + delivered"
        />
        <KpiCard
          icon={Truck}
          label="Dispatch queue"
          value={counts.queue}
          hint="Queued + in progress"
        />
      </div>

      {!loading && filtered.length === 0 ? (
        <EtsEmptyState
          icon={Package}
          title="Nothing inbound right now"
          description="China batches in transit / at port / cleared / delivered will appear here."
        />
      ) : (
        <EtsTable>
          <EtsTHead>
            <EtsTH>Batch</EtsTH>
            <EtsTH>Vessel</EtsTH>
            <EtsTH>ETD</EtsTH>
            <EtsTH>ETA</EtsTH>
            <EtsTH>Status</EtsTH>
            <EtsTH className="text-right">CBM</EtsTH>
            <EtsTH className="text-right">Total INR</EtsTH>
          </EtsTHead>
          <tbody>
            {filtered.map((r) => (
              <EtsTR key={r.id}>
                <EtsTD>
                  <div className="font-semibold text-sm">{r.batch_name ?? "—"}</div>
                </EtsTD>
                <EtsTD className="text-xs">{r.vessel_name ?? "—"}</EtsTD>
                <EtsTD className="text-xs">{formatDate(r.etd)}</EtsTD>
                <EtsTD className="text-xs">{formatDate(r.eta)}</EtsTD>
                <EtsTD>
                  <EtsStatusBadge value={r.status} />
                </EtsTD>
                <EtsTD className="text-right text-xs font-mono">
                  {r.total_cbm ?? "—"}
                </EtsTD>
                <EtsTD className="text-right text-xs font-mono">
                  {formatCurrency(r.total_india_cost_inr)}
                </EtsTD>
              </EtsTR>
            ))}
          </tbody>
        </EtsTable>
      )}
    </EtsListShell>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Ship
  label: string
  value: number
  hint?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card shadow-sm p-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex size-8 items-center justify-center rounded-md bg-muted text-foreground">
          <Icon className="size-4" />
        </span>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      {hint && (
        <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>
      )}
    </div>
  )
}
