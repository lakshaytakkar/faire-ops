"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Rocket } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ChecklistDot } from "@/components/shared/checklist-dot"
import { publishProduct } from "@/lib/bhagwati/studio-api"
import type { PublishChecklist } from "@/lib/bhagwati/types"

import type { useProductPatch } from "./use-product-patch"
import type { StudioVariant } from "./types"

type Handle = ReturnType<typeof useProductPatch>

const ROWS: Array<{ key: keyof PublishChecklist; label: string }> = [
  { key: "image_polished", label: "Image polished" },
  { key: "name_normalized", label: "Name normalized" },
  { key: "variants_modeled", label: "Variants modeled" },
  { key: "prices_inr", label: "Prices in INR" },
  { key: "categorized", label: "Categorized" },
  { key: "source_tagged", label: "Source tagged" },
]

export function TabsPublish({
  handle,
  variants,
}: {
  handle: Handle
  variants: StudioVariant[]
}) {
  const { product, save } = handle
  const router = useRouter()
  const [notes, setNotes] = useState<string>(
    typeof product.tags?.publish_notes === "string"
      ? (product.tags.publish_notes as string)
      : "",
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checklist = product.publish_checklist ?? ({} as PublishChecklist)
  const allDone = ROWS.every((r) => checklist[r.key])

  async function onPublish() {
    setBusy(true)
    setError(null)
    try {
      // Persist notes onto tags JSONB before flipping listing_status.
      const nextTags = { ...(product.tags ?? {}), publish_notes: notes || null }
      await save({ tags: nextTags })
      await publishProduct({ productId: product.id, notes })
      router.push("/ets/catalog/studio")
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5" id="publish">
      <header className="space-y-1">
        <h2 className="text-[0.9375rem] font-semibold tracking-tight">Publish</h2>
        <p className="text-xs text-muted-foreground">
          Final review before flipping the product to live.
        </p>
      </header>

      <div className="rounded-lg border border-border/80 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">Step</th>
              <th className="text-right px-3 py-2 w-20">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {ROWS.map((r) => (
              <tr key={r.key}>
                <td className="px-3 py-2">{r.label}</td>
                <td className="px-3 py-2 text-right">
                  <ChecklistDot done={!!checklist[r.key]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs">
        <Stat label="Variants" value={String(variants.length)} />
        <Stat
          label="Cost INR"
          value={product.cost_price_inr != null ? `₹${Math.round(product.cost_price_inr)}` : "—"}
        />
        <Stat
          label="Selling INR"
          value={product.selling_price_inr != null ? `₹${Math.round(product.selling_price_inr)}` : "—"}
          highlight
        />
      </div>

      <label className="block">
        <span className="block text-xs font-medium text-muted-foreground mb-1">
          Notes (optional, saved to tags.publish_notes)
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 text-sm rounded-md border border-input bg-transparent resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      {error && (
        <div className="text-xs text-red-700 bg-red-50 ring-1 ring-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <Button type="button" onClick={onPublish} disabled={!allDone || busy} className="w-full">
        <Rocket /> {busy ? "Publishing…" : allDone ? "Publish to client portal" : "Complete checklist first"}
      </Button>
    </div>
  )
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={
          highlight
            ? "mt-1 text-base font-bold text-emerald-700 tabular-nums"
            : "mt-1 text-base font-semibold tabular-nums"
        }
      >
        {value}
      </div>
    </div>
  )
}
