"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react"
import { Slider } from "@base-ui/react/slider"
import { supabaseEts } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/shared/status-badge"
import { cn } from "@/lib/utils"
import { Field } from "./field"
import {
  MARKET_FIT_OPTIONS,
  type ProductRow,
  type VendorMini,
} from "./product-row"
import { type AutosaveHandle, type FieldState } from "./use-autosave"
import { formatDate } from "@/app/(portal)/ets/_components/ets-ui"

export function MetaTab({
  row,
  vendor,
  patch,
  autosave,
  onVendorChange,
}: {
  row: ProductRow
  vendor: VendorMini | null
  patch: (p: Partial<ProductRow>) => void
  autosave: AutosaveHandle
  onVendorChange: (v: VendorMini | null) => void
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Created">
          <div className="h-8 w-full rounded-lg border border-input bg-muted/40 px-2.5 py-1 text-sm flex items-center">
            {formatDate(row.created_at)}
          </div>
        </Field>

        <Field label="Updated">
          <div className="h-8 w-full rounded-lg border border-input bg-muted/40 px-2.5 py-1 text-sm flex items-center">
            {formatDate(row.updated_at)}
          </div>
        </Field>

        <Field
          label="Legacy ID"
          hint="Imported from the legacy inventory system."
        >
          <div className="h-8 w-full rounded-lg border border-input bg-muted/40 px-2.5 py-1 text-sm flex items-center gap-2 font-mono tabular-nums">
            {row.legacy_id ?? "—"}
            {row.legacy_id != null && (
              <StatusBadge tone="slate">deprecated</StatusBadge>
            )}
          </div>
        </Field>

        <Field
          label="Source"
          state={autosave.statuses.source}
          onRetry={() => autosave.save("source", row.source)}
        >
          <Input
            defaultValue={row.source ?? ""}
            onChange={(e) => patch({ source: e.target.value })}
            onBlur={(e) => autosave.save("source", e.target.value || null)}
          />
        </Field>

        <Field label="Source file">
          <div className="h-8 w-full rounded-lg border border-input bg-muted/40 px-2.5 py-1 text-sm flex items-center font-mono truncate">
            {row.source_file ?? "—"}
          </div>
        </Field>

        <VendorPicker
          vendor={vendor}
          selectedId={row.vendor_id}
          onChange={(v) => {
            onVendorChange(v)
            patch({ vendor_id: v?.id ?? null })
            autosave.save("vendor_id", v?.id ?? null)
          }}
          state={autosave.statuses.vendor_id}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field
          label="Market fit"
          state={autosave.statuses.market_fit}
          onRetry={() => autosave.save("market_fit", row.market_fit)}
        >
          <select
            value={row.market_fit ?? ""}
            onChange={(e) => {
              const v = e.target.value || null
              patch({ market_fit: v })
              autosave.save("market_fit", v)
            }}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {MARKET_FIT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Sellability score"
          state={autosave.statuses.sellability_score}
          onRetry={() =>
            autosave.save("sellability_score", row.sellability_score)
          }
        >
          <SellabilitySlider
            value={row.sellability_score ?? 0}
            onChange={(v) => patch({ sellability_score: v })}
            onCommit={(v) => autosave.save("sellability_score", v)}
          />
        </Field>

        <Field
          label="Market fit reason"
          className="md:col-span-2"
          state={autosave.statuses.market_fit_reason}
          onRetry={() =>
            autosave.save("market_fit_reason", row.market_fit_reason)
          }
        >
          <textarea
            defaultValue={row.market_fit_reason ?? ""}
            rows={3}
            onChange={(e) => patch({ market_fit_reason: e.target.value })}
            onBlur={(e) =>
              autosave.save("market_fit_reason", e.target.value || null)
            }
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </Field>
      </div>

      <SupplyMetaEditor
        value={row.supply_meta}
        onSave={(parsed) => {
          patch({ supply_meta: parsed })
          autosave.save("supply_meta", parsed)
        }}
        state={autosave.statuses.supply_meta}
      />
    </div>
  )
}

function VendorPicker({
  vendor,
  selectedId,
  onChange,
  state,
}: {
  vendor: VendorMini | null
  selectedId: string | null
  onChange: (v: VendorMini | null) => void
  state?: FieldState
}) {
  const [vendors, setVendors] = useState<VendorMini[]>([])
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")

  useEffect(() => {
    if (!open || vendors.length > 0) return
    let cancelled = false
    async function load() {
      const { data } = await supabaseEts
        .from("vendors")
        .select("id, name")
        .order("name")
        .limit(500)
      if (!cancelled) setVendors((data ?? []) as VendorMini[])
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [open, vendors.length])

  const filtered = q
    ? vendors.filter((v) => v.name.toLowerCase().includes(q.toLowerCase()))
    : vendors

  return (
    <Field label="Vendor" state={state}>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {vendor ? (
            <Link
              href={`/ets/vendors/${vendor.id}`}
              className="inline-flex items-center gap-1 text-sm hover:text-primary"
            >
              {vendor.name} <ExternalLink className="size-3" />
            </Link>
          ) : selectedId ? (
            <span className="text-sm font-mono text-muted-foreground truncate">
              {selectedId}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">— unset —</span>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="ml-auto text-xs text-primary hover:underline"
          >
            {open ? "Close" : "Change vendor"}
          </button>
        </div>
        {open && (
          <div className="rounded-lg border bg-card">
            <Input
              placeholder="Search vendors…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="border-0 border-b rounded-none"
            />
            <div className="max-h-48 overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  onChange(null)
                  setOpen(false)
                }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted/40 text-muted-foreground"
              >
                — clear —
              </button>
              {filtered.map((v) => (
                <button
                  type="button"
                  key={v.id}
                  onClick={() => {
                    onChange(v)
                    setOpen(false)
                  }}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-sm hover:bg-muted/40",
                    v.id === selectedId && "bg-primary/5",
                  )}
                >
                  {v.name}
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  No vendors match.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Field>
  )
}

function SellabilitySlider({
  value,
  onChange,
  onCommit,
}: {
  value: number
  onChange: (v: number) => void
  onCommit: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-3">
      <Slider.Root
        value={value}
        min={0}
        max={100}
        onValueChange={(v: number | number[]) =>
          onChange(Array.isArray(v) ? v[0] : v)
        }
        onValueCommitted={(v: number | number[]) =>
          onCommit(Array.isArray(v) ? v[0] : v)
        }
        className="flex-1"
      >
        <Slider.Control className="relative flex h-8 w-full items-center">
          <Slider.Track className="relative h-1.5 w-full rounded-full bg-muted">
            <Slider.Indicator className="absolute h-full rounded-full bg-primary" />
            <Slider.Thumb className="block size-4 rounded-full border-2 border-primary bg-background shadow outline-none focus-visible:ring-3 focus-visible:ring-ring/50" />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
      <span className="text-sm font-mono tabular-nums min-w-[3ch] text-right">
        {value}
      </span>
    </div>
  )
}

function SupplyMetaEditor({
  value,
  onSave,
  state,
}: {
  value: Record<string, unknown> | null
  onSave: (parsed: Record<string, unknown> | null) => void
  state?: FieldState
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(() =>
    value ? JSON.stringify(value, null, 2) : "{}",
  )
  const [err, setErr] = useState<string | null>(null)

  function save() {
    const raw = draft.trim()
    try {
      const parsed = raw === "" ? null : JSON.parse(raw)
      if (parsed !== null && typeof parsed !== "object") {
        setErr("JSON must be an object.")
        return
      }
      setErr(null)
      onSave(parsed as Record<string, unknown> | null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="rounded-lg border border-border/80">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-2.5"
      >
        <span className="inline-flex items-center gap-2 text-sm font-medium">
          {open ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
          Supply meta (JSONB) — admin only
        </span>
        <span className="text-xs text-muted-foreground">
          {value ? `${Object.keys(value).length} keys` : "empty"}
        </span>
      </button>
      {open && (
        <div className="border-t p-4 space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={10}
            spellCheck={false}
            className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-mono outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          {err && <p className="text-xs text-red-600">{err}</p>}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={save}
              className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
            >
              Save JSON
            </button>
            <button
              type="button"
              onClick={() =>
                setDraft(value ? JSON.stringify(value, null, 2) : "{}")
              }
              className="h-8 px-3 rounded-lg border border-border text-sm font-medium hover:bg-muted/40"
            >
              Reset
            </button>
            {state?.status === "saved" && (
              <span className="text-xs text-emerald-600">Saved</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
