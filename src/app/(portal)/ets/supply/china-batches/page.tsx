"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, Search, Ship, Trash2 } from "lucide-react"
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

interface BatchRow {
  id: string
  batch_name: string | null
  etd: string | null
  eta: string | null
  vessel_name: string | null
  bl_number: string | null
  route: string | null
  forwarder: string | null
  status: string | null
  total_cbm: number | null
  total_weight_kg: number | null
  total_cartons: number | null
  freight_cost_usd: number | null
  insurance_usd: number | null
  cha_charges_inr: number | null
  customs_duty_inr: number | null
  igst_inr: number | null
  total_india_cost_inr: number | null
}

const STATUSES = ["draft", "ordered", "in-transit", "at-port", "cleared", "delivered"]

export default function EtsChinaBatchesPage() {
  const [rows, setRows] = useState<BatchRow[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [drawer, setDrawer] = useState<{ open: boolean; row: BatchRow | null }>(
    { open: false, row: null },
  )

  async function load() {
    setLoading(true)
    const { data } = await supabaseEts
      .from("china_batches")
      .select("*")
      .order("created_at", { ascending: false })
    setRows((data ?? []) as BatchRow[])
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
        const hay = [r.batch_name, r.vessel_name, r.bl_number, r.forwarder, r.route]
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
    await supabaseEts.from("china_batches").delete().eq("id", id)
    load()
  }

  return (
    <EtsListShell
      title="China batches"
      subtitle={
        loading
          ? "Loading…"
          : `${filtered.length} of ${rows.length} batch${rows.length === 1 ? "" : "es"}`
      }
      action={
        <button
          onClick={() => setDrawer({ open: true, row: null })}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
        >
          <Plus className="size-4" /> New batch
        </button>
      }
      filters={
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search batch, vessel, BL, forwarder…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-3 rounded-md border border-border/80 bg-card text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-md border border-border/80 bg-card text-sm"
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
          icon={Ship}
          title="No China batches match"
          description="Adjust filters or create a new shipment manifest."
        />
      ) : (
        <EtsTable>
          <EtsTHead>
            <EtsTH>Batch</EtsTH>
            <EtsTH>ETD</EtsTH>
            <EtsTH>ETA</EtsTH>
            <EtsTH>Vessel</EtsTH>
            <EtsTH>BL #</EtsTH>
            <EtsTH>Forwarder</EtsTH>
            <EtsTH>Status</EtsTH>
            <EtsTH className="text-right">CBM</EtsTH>
            <EtsTH className="text-right">Total INR</EtsTH>
            <EtsTH className="text-right">Actions</EtsTH>
          </EtsTHead>
          <tbody>
            {filtered.map((r) => (
              <EtsTR key={r.id} onClick={() => setDrawer({ open: true, row: r })}>
                <EtsTD>
                  <div className="font-semibold text-sm">{r.batch_name ?? "—"}</div>
                </EtsTD>
                <EtsTD className="text-xs">{formatDate(r.etd)}</EtsTD>
                <EtsTD className="text-xs">{formatDate(r.eta)}</EtsTD>
                <EtsTD className="text-xs">{r.vessel_name ?? "—"}</EtsTD>
                <EtsTD className="text-xs font-mono">{r.bl_number ?? "—"}</EtsTD>
                <EtsTD className="text-xs">{r.forwarder ?? "—"}</EtsTD>
                <EtsTD>
                  <EtsStatusBadge value={r.status} />
                </EtsTD>
                <EtsTD className="text-right text-xs font-mono">
                  {r.total_cbm ?? "—"}
                </EtsTD>
                <EtsTD className="text-right text-xs font-mono">
                  {formatCurrency(r.total_india_cost_inr)}
                </EtsTD>
                <EtsTD className="text-right">
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
                </EtsTD>
              </EtsTR>
            ))}
          </tbody>
        </EtsTable>
      )}

      <BatchDrawer
        open={drawer.open}
        row={drawer.row}
        onClose={() => setDrawer({ open: false, row: null })}
        onSaved={() => {
          setDrawer({ open: false, row: null })
          load()
        }}
      />
    </EtsListShell>
  )
}

function BatchDrawer({
  open,
  row,
  onClose,
  onSaved,
}: {
  open: boolean
  row: BatchRow | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<Partial<BatchRow>>({})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setForm(row ?? { status: "draft" })
    setErr(null)
  }, [open, row])

  function num(v: string): number | null {
    if (!v.trim()) return null
    const n = parseFloat(v)
    return isNaN(n) ? null : n
  }

  async function save() {
    if (!form.batch_name?.toString().trim()) {
      setErr("Batch name is required.")
      return
    }
    setBusy(true)
    setErr(null)
    const payload = {
      batch_name: form.batch_name?.toString().trim(),
      etd: form.etd || null,
      eta: form.eta || null,
      vessel_name: form.vessel_name?.toString().trim() || null,
      bl_number: form.bl_number?.toString().trim() || null,
      route: form.route?.toString().trim() || null,
      forwarder: form.forwarder?.toString().trim() || null,
      status: form.status ?? "draft",
      total_cbm: form.total_cbm ?? null,
      total_weight_kg: form.total_weight_kg ?? null,
      total_cartons: form.total_cartons ?? null,
      freight_cost_usd: form.freight_cost_usd ?? null,
      insurance_usd: form.insurance_usd ?? null,
      cha_charges_inr: form.cha_charges_inr ?? null,
      customs_duty_inr: form.customs_duty_inr ?? null,
      igst_inr: form.igst_inr ?? null,
      total_india_cost_inr: form.total_india_cost_inr ?? null,
    }
    const q = row
      ? supabaseEts.from("china_batches").update(payload).eq("id", row.id)
      : supabaseEts.from("china_batches").insert(payload)
    const { error } = await q
    setBusy(false)
    if (error) {
      setErr(error.message)
      return
    }
    onSaved()
  }

  const set = <K extends keyof BatchRow>(k: K, v: BatchRow[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  return (
    <EtsEditDrawer
      open={open}
      onClose={onClose}
      title={row ? "Edit batch" : "New China batch"}
      subtitle="Shipment manifest with landed-cost breakdown."
      size="lg"
      footer={
        <>
          <button
            onClick={onClose}
            className="h-9 px-3 rounded-md border border-border/80 bg-card text-sm font-medium hover:bg-muted/40"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="h-9 px-3 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Batch name" required>
          <input
            value={form.batch_name ?? ""}
            onChange={(e) => set("batch_name", e.target.value)}
            className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ETD">
            <input
              type="date"
              value={form.etd ?? ""}
              onChange={(e) => set("etd", e.target.value)}
              className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
            />
          </Field>
          <Field label="ETA">
            <input
              type="date"
              value={form.eta ?? ""}
              onChange={(e) => set("eta", e.target.value)}
              className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Vessel name">
            <input
              value={form.vessel_name ?? ""}
              onChange={(e) => set("vessel_name", e.target.value)}
              className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
            />
          </Field>
          <Field label="BL number">
            <input
              value={form.bl_number ?? ""}
              onChange={(e) => set("bl_number", e.target.value)}
              className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Route">
            <input
              value={form.route ?? ""}
              onChange={(e) => set("route", e.target.value)}
              className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
              placeholder="Yantian → Nhava Sheva"
            />
          </Field>
          <Field label="Forwarder">
            <input
              value={form.forwarder ?? ""}
              onChange={(e) => set("forwarder", e.target.value)}
              className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
            />
          </Field>
        </div>
        <Field label="Status">
          <select
            value={form.status ?? "draft"}
            onChange={(e) => set("status", e.target.value)}
            className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>

        <div className="pt-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Volume
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Total CBM">
              <input
                type="number"
                step="0.01"
                value={form.total_cbm ?? ""}
                onChange={(e) => set("total_cbm", num(e.target.value))}
                className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
              />
            </Field>
            <Field label="Total weight (kg)">
              <input
                type="number"
                step="0.01"
                value={form.total_weight_kg ?? ""}
                onChange={(e) => set("total_weight_kg", num(e.target.value))}
                className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
              />
            </Field>
            <Field label="Total cartons">
              <input
                type="number"
                value={form.total_cartons ?? ""}
                onChange={(e) =>
                  set(
                    "total_cartons",
                    e.target.value ? parseInt(e.target.value, 10) : null,
                  )
                }
                className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
              />
            </Field>
          </div>
        </div>

        <div className="pt-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Costs
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Freight (USD)">
              <input
                type="number"
                step="0.01"
                value={form.freight_cost_usd ?? ""}
                onChange={(e) => set("freight_cost_usd", num(e.target.value))}
                className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
              />
            </Field>
            <Field label="Insurance (USD)">
              <input
                type="number"
                step="0.01"
                value={form.insurance_usd ?? ""}
                onChange={(e) => set("insurance_usd", num(e.target.value))}
                className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
              />
            </Field>
            <Field label="CHA charges (INR)">
              <input
                type="number"
                step="0.01"
                value={form.cha_charges_inr ?? ""}
                onChange={(e) => set("cha_charges_inr", num(e.target.value))}
                className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
              />
            </Field>
            <Field label="Customs duty (INR)">
              <input
                type="number"
                step="0.01"
                value={form.customs_duty_inr ?? ""}
                onChange={(e) => set("customs_duty_inr", num(e.target.value))}
                className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
              />
            </Field>
            <Field label="IGST (INR)">
              <input
                type="number"
                step="0.01"
                value={form.igst_inr ?? ""}
                onChange={(e) => set("igst_inr", num(e.target.value))}
                className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
              />
            </Field>
            <Field label="Total India cost (INR)">
              <input
                type="number"
                step="0.01"
                value={form.total_india_cost_inr ?? ""}
                onChange={(e) =>
                  set("total_india_cost_inr", num(e.target.value))
                }
                className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
              />
            </Field>
          </div>
        </div>

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
