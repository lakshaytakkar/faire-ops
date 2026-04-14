"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react"
import { supabaseEts } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import { Field } from "./field"
import { type ProductRow, type PriceSettingMini } from "./product-row"
import { type AutosaveHandle } from "./use-autosave"

export function PricingTab({
  row,
  patch,
  autosave,
}: {
  row: ProductRow
  patch: (p: Partial<ProductRow>) => void
  autosave: AutosaveHandle
}) {
  const [showLegacy, setShowLegacy] = useState(
    !!row.wholesale_price_inr && row.wholesale_price_inr > 0,
  )
  const [settings, setSettings] = useState<PriceSettingMini[]>([])
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabaseEts
        .from("price_settings")
        .select("key, label, value, unit")
        .order("key")
      if (!cancelled) setSettings((data ?? []) as PriceSettingMini[])
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const mrp = row.suggested_mrp ?? 0
  const cost = row.cost_price ?? 0
  const margin = mrp > 0 ? ((mrp - cost) / mrp) * 100 : null

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field
          label="Cost price (₹)"
          state={autosave.statuses.cost_price}
          onRetry={() => autosave.save("cost_price", row.cost_price)}
        >
          <Input
            type="number"
            step="0.01"
            defaultValue={row.cost_price ?? ""}
            onChange={(e) =>
              patch({
                cost_price: e.target.value === "" ? null : Number(e.target.value),
              })
            }
            onBlur={(e) =>
              autosave.save(
                "cost_price",
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
          />
        </Field>

        <Field
          label="Suggested MRP (₹)"
          state={autosave.statuses.suggested_mrp}
          onRetry={() => autosave.save("suggested_mrp", row.suggested_mrp)}
        >
          <Input
            type="number"
            step="0.01"
            defaultValue={row.suggested_mrp ?? ""}
            onChange={(e) =>
              patch({
                suggested_mrp:
                  e.target.value === "" ? null : Number(e.target.value),
              })
            }
            onBlur={(e) =>
              autosave.save(
                "suggested_mrp",
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
          />
        </Field>

        <Field label="Margin %" hint="Computed (mrp − cost) / mrp × 100.">
          <div className="h-8 w-full rounded-lg border border-input bg-muted/40 px-2.5 py-1 text-sm flex items-center font-mono tabular-nums">
            {margin === null ? "—" : `${margin.toFixed(1)}%`}
          </div>
        </Field>

        <Field
          label="Unit price (₹)"
          state={autosave.statuses.unit_price}
          onRetry={() => autosave.save("unit_price", row.unit_price)}
        >
          <Input
            type="number"
            step="0.01"
            defaultValue={row.unit_price ?? ""}
            onChange={(e) =>
              patch({
                unit_price:
                  e.target.value === "" ? null : Number(e.target.value),
              })
            }
            onBlur={(e) =>
              autosave.save(
                "unit_price",
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
          />
        </Field>

        <div className="md:col-span-2">
          <button
            type="button"
            onClick={() => setShowLegacy((v) => !v)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {showLegacy ? (
              <ChevronDown className="size-3" />
            ) : (
              <ChevronRight className="size-3" />
            )}
            {showLegacy ? "Hide" : "Show"} legacy wholesale price
          </button>
          {showLegacy && (
            <div className="mt-3">
              <Field
                label="Wholesale (INR) — legacy"
                hint="Populated on ~94% of rows. New pricing flow uses cost × markup."
                state={autosave.statuses.wholesale_price_inr}
                onRetry={() =>
                  autosave.save(
                    "wholesale_price_inr",
                    row.wholesale_price_inr,
                  )
                }
              >
                <Input
                  type="number"
                  step="0.01"
                  defaultValue={row.wholesale_price_inr ?? ""}
                  onChange={(e) =>
                    patch({
                      wholesale_price_inr:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  onBlur={(e) =>
                    autosave.save(
                      "wholesale_price_inr",
                      e.target.value === "" ? null : Number(e.target.value),
                    )
                  }
                />
              </Field>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border/80 bg-muted/20">
        <button
          type="button"
          onClick={() => setSettingsOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-3 px-4 py-2.5"
        >
          <span className="inline-flex items-center gap-2 text-sm font-medium">
            {settingsOpen ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
            Global pricing settings
            <span className="text-xs text-muted-foreground">
              ({settings.length})
            </span>
          </span>
          <Link
            href="/ets/catalog/pricing"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Manage globally <ExternalLink className="size-3" />
          </Link>
        </button>
        {settingsOpen && (
          <div className="border-t divide-y">
            {settings.length === 0 ? (
              <div className="px-4 py-3 text-sm text-muted-foreground">
                No price settings configured yet.
              </div>
            ) : (
              settings.map((s) => (
                <div
                  key={s.key}
                  className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
                >
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="font-mono tabular-nums">
                    {s.value}
                    {s.unit ? (
                      <span className="ml-1 text-xs text-muted-foreground">
                        {s.unit}
                      </span>
                    ) : null}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
