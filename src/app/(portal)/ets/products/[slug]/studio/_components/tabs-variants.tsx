"use client"

import { useState, type Dispatch, type SetStateAction } from "react"
import { Plus, Sparkles, Trash2, ImageOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"
import { supabaseEts } from "@/lib/supabase"
import {
  bulkCreateVariants,
  suggestVariants,
  type VariantSuggestion,
} from "@/lib/bhagwati/studio-api"
import { formatInr } from "@/lib/pricing/ets-pricing"

import type { useProductPatch } from "./use-product-patch"
import type { StudioVariant } from "./types"

type Handle = ReturnType<typeof useProductPatch>

export function TabsVariants({
  handle,
  variants,
  setVariants,
}: {
  handle: Handle
  variants: StudioVariant[]
  setVariants: Dispatch<SetStateAction<StudioVariant[]>>
}) {
  const { product, flipChecklist } = handle
  const [suggestions, setSuggestions] = useState<VariantSuggestion[] | null>(null)
  const [picked, setPicked] = useState<Record<number, boolean>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [noVariants, setNoVariants] = useState(
    handle.product.publish_checklist?.variants_modeled === true && variants.length === 0,
  )

  // Inline add-new row state.
  const [newRow, setNewRow] = useState({
    sku: "",
    variant_name: "",
    cost_price_inr: "",
    selling_price_inr: "",
    stock_qty: "",
  })

  async function runSuggest() {
    setBusy(true)
    setError(null)
    try {
      const res = await suggestVariants({ productId: product.id })
      setSuggestions(res.variants)
      setPicked(Object.fromEntries(res.variants.map((_, i) => [i, true])))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function applyPicked() {
    if (!suggestions) return
    const chosen = suggestions.filter((_, i) => picked[i])
    if (chosen.length === 0) return
    setBusy(true)
    setError(null)
    try {
      await bulkCreateVariants(product.id, chosen)
      // refetch
      const { data } = await supabaseEts
        .from("product_variants")
        .select(
          "id, product_id, sku, variant_name, attributes, cost_price_cny, cost_price_inr, selling_price_inr, stock_qty, image_url, sort_order, is_active",
        )
        .eq("product_id", product.id)
        .order("sort_order", { ascending: true })
      setVariants((data ?? []) as unknown as StudioVariant[])
      setSuggestions(null)
      await flipChecklist("variants_modeled", true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function addRow() {
    if (!newRow.sku && !newRow.variant_name) return
    setBusy(true)
    setError(null)
    try {
      const insert = {
        product_id: product.id,
        sku: newRow.sku || null,
        variant_name: newRow.variant_name || null,
        cost_price_inr: numOrNull(newRow.cost_price_inr),
        selling_price_inr: numOrNull(newRow.selling_price_inr),
        stock_qty: numOrNull(newRow.stock_qty),
        sort_order: variants.length,
        is_active: true,
      }
      const { data, error: err } = await supabaseEts
        .from("product_variants")
        .insert(insert)
        .select(
          "id, product_id, sku, variant_name, attributes, cost_price_cny, cost_price_inr, selling_price_inr, stock_qty, image_url, sort_order, is_active",
        )
        .single()
      if (err) throw err
      setVariants((prev) => [...prev, data as unknown as StudioVariant])
      setNewRow({ sku: "", variant_name: "", cost_price_inr: "", selling_price_inr: "", stock_qty: "" })
      await flipChecklist("variants_modeled", true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function deleteRow(id: string) {
    if (!window.confirm("Delete this variant?")) return
    const { error: err } = await supabaseEts.from("product_variants").delete().eq("id", id)
    if (err) {
      setError(err.message)
      return
    }
    setVariants((prev) => prev.filter((v) => v.id !== id))
  }

  async function toggleNoVariants(value: boolean) {
    setNoVariants(value)
    await flipChecklist("variants_modeled", value || variants.length > 0)
  }

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <h2 className="text-[0.9375rem] font-semibold tracking-tight">Variants</h2>
          <p className="text-xs text-muted-foreground">
            Capture every sellable variant. Use ✨ Detect to mine variants out of the
            description.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={noVariants}
              onChange={(e) => toggleNoVariants(e.target.checked)}
            />
            This product has no variants
          </label>
          <Button type="button" size="sm" variant="outline" onClick={runSuggest} disabled={busy}>
            <Sparkles /> Detect
          </Button>
        </div>
      </header>

      {variants.length === 0 && !noVariants && !suggestions && (
        <EmptyState
          title="No variants yet"
          description="Add one inline below or run ✨ Detect to seed from the description."
        />
      )}

      {variants.length > 0 && (
        <div className="rounded-lg border border-border/80 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <Th>Img</Th>
                <Th>SKU</Th>
                <Th>Variant</Th>
                <Th>Attributes</Th>
                <Th className="text-right">Cost INR</Th>
                <Th className="text-right">Selling INR</Th>
                <Th className="text-right">Stock</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {variants.map((v) => (
                <tr key={v.id}>
                  <Td>
                    {v.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={v.image_url}
                        alt={v.variant_name ?? ""}
                        className="size-10 rounded object-cover bg-muted"
                      />
                    ) : (
                      <div className="size-10 rounded bg-muted flex items-center justify-center text-muted-foreground">
                        <ImageOff className="size-4" />
                      </div>
                    )}
                  </Td>
                  <Td className="font-mono text-xs">{v.sku ?? "—"}</Td>
                  <Td>{v.variant_name ?? "—"}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {v.attributes
                        ? Object.entries(v.attributes).map(([k, val]) => (
                            <span
                              key={k}
                              className="inline-flex items-center rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200 px-1.5 py-0.5 text-[10px] text-slate-700"
                            >
                              {k}: {String(val)}
                            </span>
                          ))
                        : null}
                    </div>
                  </Td>
                  <Td className="text-right tabular-nums">{formatInr(v.cost_price_inr)}</Td>
                  <Td className="text-right tabular-nums font-semibold">
                    {formatInr(v.selling_price_inr)}
                  </Td>
                  <Td className="text-right tabular-nums">{v.stock_qty ?? 0}</Td>
                  <Td className="text-right">
                    <button
                      type="button"
                      onClick={() => deleteRow(v.id)}
                      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-red-700 hover:bg-red-50"
                      title="Delete variant"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Inline add */}
      <div className="rounded-lg border border-dashed bg-muted/20 p-3">
        <div className="grid grid-cols-12 gap-2 items-center">
          <input
            type="text"
            placeholder="SKU"
            value={newRow.sku}
            onChange={(e) => setNewRow({ ...newRow, sku: e.target.value })}
            className="col-span-2 h-8 px-2 text-xs rounded-md border border-input bg-background"
          />
          <input
            type="text"
            placeholder="Variant name"
            value={newRow.variant_name}
            onChange={(e) => setNewRow({ ...newRow, variant_name: e.target.value })}
            className="col-span-3 h-8 px-2 text-xs rounded-md border border-input bg-background"
          />
          <input
            type="number"
            placeholder="Cost ₹"
            value={newRow.cost_price_inr}
            onChange={(e) => setNewRow({ ...newRow, cost_price_inr: e.target.value })}
            className="col-span-2 h-8 px-2 text-xs rounded-md border border-input bg-background text-right"
          />
          <input
            type="number"
            placeholder="Sell ₹"
            value={newRow.selling_price_inr}
            onChange={(e) => setNewRow({ ...newRow, selling_price_inr: e.target.value })}
            className="col-span-2 h-8 px-2 text-xs rounded-md border border-input bg-background text-right"
          />
          <input
            type="number"
            placeholder="Stock"
            value={newRow.stock_qty}
            onChange={(e) => setNewRow({ ...newRow, stock_qty: e.target.value })}
            className="col-span-2 h-8 px-2 text-xs rounded-md border border-input bg-background text-right"
          />
          <Button
            type="button"
            size="xs"
            onClick={addRow}
            disabled={busy}
            className="col-span-1"
          >
            <Plus />
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-700 bg-red-50 ring-1 ring-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {suggestions && (
        <div className="rounded-lg border border-violet-200 bg-violet-50/40 p-3 space-y-2">
          <div className="text-xs font-semibold text-violet-800 inline-flex items-center gap-1.5">
            <Sparkles className="size-3.5" /> Detected variants
          </div>
          <ul className="divide-y divide-violet-200/70">
            {suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-2 py-2">
                <input
                  type="checkbox"
                  checked={!!picked[i]}
                  onChange={(e) => setPicked({ ...picked, [i]: e.target.checked })}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{s.variant_name}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(s.attributes).map(([k, v]) => (
                      <span
                        key={k}
                        className="inline-flex items-center rounded-full bg-white ring-1 ring-inset ring-violet-200 px-1.5 py-0.5 text-[10px] text-violet-700"
                      >
                        {k}: {String(v)}
                      </span>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setSuggestions(null)}>
              Discard
            </Button>
            <Button type="button" size="sm" onClick={applyPicked} disabled={busy}>
              Create selected
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={`text-left px-3 py-2 ${className ?? ""}`}
    >
      {children}
    </th>
  )
}

function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 align-middle ${className ?? ""}`}>{children}</td>
}

function numOrNull(s: string): number | null {
  if (!s) return null
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
}
