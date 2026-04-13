"use client"

import { useEffect, useState } from "react"
import { IndianRupee, Plus, Check, X as XIcon } from "lucide-react"
import { supabaseEts } from "@/lib/supabase"
import {
  EtsListShell,
  EtsTable,
  EtsTHead,
  EtsTH,
  EtsTR,
  EtsTD,
  EtsEmptyState,
  EtsEditDrawer,
  formatDate,
} from "@/app/(portal)/ets/_components/ets-ui"

interface PriceSetting {
  id: string
  key: string
  label: string
  value: number
  unit: string | null
  updated_at: string | null
  updated_by: string | null
}

const DEFAULTS: Array<Omit<PriceSetting, "id" | "updated_at" | "updated_by">> = [
  { key: "USD_CNY_RATE", label: "USD to CNY exchange rate", value: 7.2, unit: "CNY/USD" },
  { key: "INR_USD_RATE", label: "INR to USD exchange rate", value: 84, unit: "INR/USD" },
  { key: "SOURCING_COMMISSION_PCT", label: "Sourcing commission", value: 3, unit: "%" },
  { key: "SEA_FREIGHT_PER_CBM_USD", label: "Sea freight per CBM", value: 120, unit: "USD/CBM" },
  { key: "INSURANCE_PCT", label: "Insurance", value: 0.5, unit: "%" },
  { key: "BCD_PCT_DEFAULT", label: "Basic customs duty (default)", value: 60, unit: "%" },
  { key: "MARKUP_OPENING_PCT", label: "Markup — opening order", value: 20, unit: "%" },
  { key: "MARKUP_REPLENISHMENT_PCT", label: "Markup — replenishment", value: 35, unit: "%" },
]

export default function EtsCatalogPricingPage() {
  const [rows, setRows] = useState<PriceSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<string>("")
  const [seeding, setSeeding] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabaseEts
      .from("price_settings")
      .select("id, key, label, value, unit, updated_at, updated_by")
      .order("key", { ascending: true })
    setRows((data ?? []) as PriceSetting[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function startEdit(r: PriceSetting) {
    setEditingId(r.id)
    setDraft(String(r.value))
  }

  async function saveEdit(r: PriceSetting) {
    const num = parseFloat(draft)
    if (isNaN(num)) {
      setEditingId(null)
      return
    }
    const { error } = await supabaseEts
      .from("price_settings")
      .update({ value: num, updated_at: new Date().toISOString() })
      .eq("id", r.id)
    if (error) {
      alert(error.message)
      return
    }
    setEditingId(null)
    load()
  }

  async function seedDefaults() {
    setSeeding(true)
    const now = new Date().toISOString()
    const { error } = await supabaseEts
      .from("price_settings")
      .insert(DEFAULTS.map((d) => ({ ...d, updated_at: now })))
    setSeeding(false)
    if (error) {
      alert(error.message)
      return
    }
    load()
  }

  return (
    <EtsListShell
      title="Pricing rules"
      subtitle={loading ? "Loading…" : `${rows.length} setting${rows.length === 1 ? "" : "s"}`}
      action={
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
        >
          <Plus className="size-4" /> New setting
        </button>
      }
    >
      {!loading && rows.length === 0 ? (
        <EtsEmptyState
          icon={IndianRupee}
          title="No pricing rules yet"
          description="Seed the 8 defaults to get started, or create one manually."
          cta={
            <button
              onClick={seedDefaults}
              disabled={seeding}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
            >
              {seeding ? "Seeding…" : "Initialize defaults"}
            </button>
          }
        />
      ) : (
        <EtsTable>
          <EtsTHead>
            <EtsTH>Key</EtsTH>
            <EtsTH>Label</EtsTH>
            <EtsTH className="text-right">Value</EtsTH>
            <EtsTH>Unit</EtsTH>
            <EtsTH>Updated</EtsTH>
            <EtsTH>By</EtsTH>
          </EtsTHead>
          <tbody>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((r) => (
                  <EtsTR key={r.id}>
                    <EtsTD className="font-mono text-xs">{r.key}</EtsTD>
                    <EtsTD>{r.label}</EtsTD>
                    <EtsTD className="text-right font-mono">
                      {editingId === r.id ? (
                        <span className="inline-flex items-center gap-1">
                          <input
                            type="number"
                            step="0.01"
                            value={draft}
                            autoFocus
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit(r)
                              if (e.key === "Escape") setEditingId(null)
                            }}
                            className="h-7 w-24 rounded border border-border bg-background px-2 text-sm text-right"
                          />
                          <button onClick={() => saveEdit(r)} className="p-1 rounded hover:bg-emerald-50 text-emerald-600">
                            <Check className="size-3.5" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-1 rounded hover:bg-rose-50 text-rose-600">
                            <XIcon className="size-3.5" />
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => startEdit(r)}
                          className="font-mono hover:bg-muted/50 px-2 py-0.5 rounded"
                        >
                          {r.value}
                        </button>
                      )}
                    </EtsTD>
                    <EtsTD className="text-xs text-muted-foreground">{r.unit ?? "—"}</EtsTD>
                    <EtsTD className="text-xs text-muted-foreground">{formatDate(r.updated_at)}</EtsTD>
                    <EtsTD className="text-xs text-muted-foreground">{r.updated_by ?? "—"}</EtsTD>
                  </EtsTR>
                ))}
          </tbody>
        </EtsTable>
      )}

      <NewSettingDrawer
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false)
          load()
        }}
      />
    </EtsListShell>
  )
}

function NewSettingDrawer({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [key, setKey] = useState("")
  const [label, setLabel] = useState("")
  const [value, setValue] = useState("")
  const [unit, setUnit] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setKey("")
      setLabel("")
      setValue("")
      setUnit("")
      setErr(null)
    }
  }, [open])

  async function submit() {
    if (!key.trim() || !label.trim() || !value) {
      setErr("Key, label and value are required.")
      return
    }
    const num = parseFloat(value)
    if (isNaN(num)) {
      setErr("Value must be a number.")
      return
    }
    setBusy(true)
    setErr(null)
    const { error } = await supabaseEts.from("price_settings").insert({
      key: key.trim().toUpperCase(),
      label: label.trim(),
      value: num,
      unit: unit.trim() || null,
      updated_at: new Date().toISOString(),
    })
    setBusy(false)
    if (error) {
      setErr(error.message)
      return
    }
    onCreated()
  }

  return (
    <EtsEditDrawer
      open={open}
      onClose={onClose}
      title="New pricing rule"
      footer={
        <>
          <button
            onClick={onClose}
            className="h-9 px-3 rounded-md border border-border/80 bg-card text-sm font-medium hover:bg-muted/40"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="h-9 px-3 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy ? "Creating…" : "Create"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Key" required>
          <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="USD_CNY_RATE" className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm font-mono" />
        </Field>
        <Field label="Label" required>
          <input value={label} onChange={(e) => setLabel(e.target.value)} className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Value" required>
            <input type="number" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm" />
          </Field>
          <Field label="Unit">
            <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="%, USD/CBM…" className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm" />
          </Field>
        </div>
        {err && <div className="rounded-md bg-rose-50 text-rose-700 px-3 py-2 text-xs">{err}</div>}
      </div>
    </EtsEditDrawer>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
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
