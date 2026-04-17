"use client"

import { useMemo, useState, type Dispatch, type SetStateAction } from "react"
import { Calculator } from "lucide-react"

import { Button } from "@/components/ui/button"
import { supabaseEts } from "@/lib/supabase"
import {
  computePricing,
  DEFAULT_MARGIN_PCT,
  formatInr,
} from "@/lib/pricing/ets-pricing"

import type { useProductPatch } from "./use-product-patch"
import type { StudioVariant } from "./types"

type Handle = ReturnType<typeof useProductPatch>

export function TabsPricing({
  handle,
  variants,
  setVariants,
  defaultFxRate,
}: {
  handle: Handle
  variants: StudioVariant[]
  setVariants: Dispatch<SetStateAction<StudioVariant[]>>
  defaultFxRate: number
}) {
  const { product, save, flipChecklist, error: saveError } = handle
  const [costCny, setCostCny] = useState<string>(
    product.cost_price_cny != null ? String(product.cost_price_cny) : "",
  )
  const [fxRate, setFxRate] = useState<string>(
    product.fx_rate_inr_cny != null ? String(product.fx_rate_inr_cny) : String(defaultFxRate),
  )
  const [marginPct, setMarginPct] = useState<string>(
    product.margin_pct != null ? String(product.margin_pct) : String(DEFAULT_MARGIN_PCT),
  )
  const [cartonQty, setCartonQty] = useState<string>(
    product.carton_qty != null ? String(product.carton_qty) : "",
  )
  const [boxQty, setBoxQty] = useState<string>(
    product.box_qty != null ? String(product.box_qty) : "",
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const computed = useMemo(() => {
    const cny = parseFloat(costCny || "0")
    const fx = parseFloat(fxRate || "0") || defaultFxRate
    const mp = parseFloat(marginPct || "0") || 0
    if (!Number.isFinite(cny) || cny <= 0) {
      return { costPriceCny: 0, costPriceInr: 0, sellingPriceInr: 0, fxRate: fx, marginPct: mp }
    }
    return computePricing({ costPriceCny: cny, fxRate: fx, marginPct: mp })
  }, [costCny, fxRate, marginPct, defaultFxRate])

  async function recompute() {
    setBusy(true)
    setError(null)
    try {
      await save({
        cost_price_cny: computed.costPriceCny || null,
        cost_price_inr: computed.costPriceInr || null,
        selling_price_inr: computed.sellingPriceInr || null,
        fx_rate_inr_cny: computed.fxRate,
        margin_pct: computed.marginPct,
        carton_qty: parseIntOrNull(cartonQty),
        box_qty: parseIntOrNull(boxQty),
      })
      await flipChecklist("prices_inr", computed.sellingPriceInr > 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function saveVariantField(
    id: string,
    column: "cost_price_inr" | "selling_price_inr",
    value: number | null,
  ) {
    setVariants((prev) => prev.map((v) => (v.id === id ? { ...v, [column]: value } : v)))
    const { error: err } = await supabaseEts
      .from("product_variants")
      .update({ [column]: value })
      .eq("id", id)
    if (err) setError(err.message)
  }

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h2 className="text-[0.9375rem] font-semibold tracking-tight">Pricing</h2>
        <p className="text-xs text-muted-foreground">
          Cost CNY × FX × (1 + margin) → INR selling price. Recompute saves all four
          plus carton sizes.
        </p>
      </header>

      <div className="grid grid-cols-12 gap-3 items-end">
        <FieldNum label="Cost CNY" value={costCny} onChange={setCostCny} className="col-span-3" />
        <FieldNum label="FX (INR/CNY)" value={fxRate} onChange={setFxRate} step="0.1" className="col-span-2" />
        <ReadOnlyMetric label="Cost INR" value={formatInr(computed.costPriceInr)} className="col-span-3" />
        <FieldNum label="Margin %" value={marginPct} onChange={setMarginPct} className="col-span-2" />
        <ReadOnlyMetric
          label="Selling INR"
          value={formatInr(computed.sellingPriceInr)}
          highlight
          className="col-span-2"
        />
      </div>

      <div className="grid grid-cols-12 gap-3 items-end">
        <FieldNum label="Carton qty" value={cartonQty} onChange={setCartonQty} className="col-span-3" />
        <FieldNum label="Box qty" value={boxQty} onChange={setBoxQty} className="col-span-3" />
        <div className="col-span-6 flex justify-end">
          <Button type="button" onClick={recompute} disabled={busy}>
            <Calculator /> {busy ? "Saving…" : "Recompute & save"}
          </Button>
        </div>
      </div>

      {(error || saveError) && (
        <div className="text-xs text-red-700 bg-red-50 ring-1 ring-red-200 rounded-md px-3 py-2">
          {error ?? saveError}
        </div>
      )}

      {variants.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold leading-snug">Per-variant pricing</h3>
          <div className="rounded-lg border border-border/80 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">SKU</th>
                  <th className="text-left px-3 py-2">Variant</th>
                  <th className="text-right px-3 py-2">Cost INR</th>
                  <th className="text-right px-3 py-2">Selling INR</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {variants.map((v) => (
                  <tr key={v.id}>
                    <td className="px-3 py-2 font-mono text-xs">{v.sku ?? "—"}</td>
                    <td className="px-3 py-2">{v.variant_name ?? "—"}</td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        defaultValue={v.cost_price_inr ?? ""}
                        onBlur={(e) =>
                          saveVariantField(v.id, "cost_price_inr", numOrNull(e.target.value))
                        }
                        className="h-7 w-24 px-2 text-xs text-right rounded-md border border-input bg-background"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        defaultValue={v.selling_price_inr ?? ""}
                        onBlur={(e) =>
                          saveVariantField(v.id, "selling_price_inr", numOrNull(e.target.value))
                        }
                        className="h-7 w-24 px-2 text-xs text-right rounded-md border border-input bg-background"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

function FieldNum({
  label,
  value,
  onChange,
  step,
  className,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  step?: string
  className?: string
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="block text-xs font-medium text-muted-foreground mb-1">{label}</span>
      <input
        type="number"
        value={value}
        step={step ?? "0.01"}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 px-3 text-sm rounded-md border border-input bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </label>
  )
}

function ReadOnlyMetric({
  label,
  value,
  highlight,
  className,
}: {
  label: string
  value: string
  highlight?: boolean
  className?: string
}) {
  return (
    <div className={className}>
      <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
      <div
        className={
          highlight
            ? "h-9 px-3 inline-flex items-center rounded-md bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 text-sm font-bold tabular-nums w-full"
            : "h-9 px-3 inline-flex items-center rounded-md bg-muted text-foreground text-sm font-semibold tabular-nums w-full"
        }
      >
        {value}
      </div>
    </div>
  )
}

function parseIntOrNull(s: string): number | null {
  if (!s) return null
  const n = parseInt(s, 10)
  return Number.isFinite(n) ? n : null
}

function numOrNull(s: string): number | null {
  if (!s) return null
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
}
