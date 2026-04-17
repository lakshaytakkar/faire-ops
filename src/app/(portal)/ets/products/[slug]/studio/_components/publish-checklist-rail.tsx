"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Rocket } from "lucide-react"

import { DetailCard } from "@/components/shared/detail-views"
import { ChecklistDot } from "@/components/shared/checklist-dot"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { publishProduct } from "@/lib/bhagwati/studio-api"
import type { ListingStatus, PublishChecklist } from "@/lib/bhagwati/types"

interface ChecklistRow {
  key: keyof PublishChecklist
  label: string
  hint: string
}

const ROWS: ChecklistRow[] = [
  { key: "image_polished", label: "Image polished", hint: "AI cleanup or manual upload" },
  { key: "name_normalized", label: "Name normalized", hint: "English name + clean description" },
  { key: "variants_modeled", label: "Variants modeled", hint: "All sellable variants captured" },
  { key: "prices_inr", label: "Prices in INR", hint: "Cost CNY → INR → selling price" },
  { key: "categorized", label: "Categorized", hint: "L1/L2/L3 category assigned" },
  { key: "source_tagged", label: "Source tagged", hint: "Linked back to supplier file" },
]

export function PublishChecklistRail({
  productId,
  checklist,
  listingStatus,
}: {
  productId: string
  checklist: PublishChecklist
  listingStatus: ListingStatus
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allDone = ROWS.every((r) => checklist[r.key])
  const completed = ROWS.filter((r) => checklist[r.key]).length

  async function onPublish() {
    if (!allDone || busy) return
    setBusy(true)
    setError(null)
    try {
      await publishProduct({ productId })
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <DetailCard
      title="Publish checklist"
      actions={
        <StatusBadge tone={toneForStatus(listingStatus)}>{listingStatus}</StatusBadge>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{completed} of {ROWS.length} ready</span>
          <span className="font-mono">{Math.round((completed / ROWS.length) * 100)}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${(completed / ROWS.length) * 100}%` }}
          />
        </div>

        <ul className="divide-y">
          {ROWS.map((row) => {
            const done = checklist[row.key]
            return (
              <li key={row.key} className="flex items-start gap-3 py-2.5">
                <ChecklistDot done={done} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium leading-tight">{row.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{row.hint}</div>
                </div>
              </li>
            )
          })}
        </ul>

        {error && (
          <div className="text-xs text-red-700 bg-red-50 ring-1 ring-red-200 rounded-md px-2.5 py-1.5">
            {error}
          </div>
        )}

        <Button
          type="button"
          onClick={onPublish}
          disabled={!allDone || busy}
          className="w-full"
        >
          <Rocket />
          {busy ? "Publishing…" : allDone ? "Publish" : "Complete checklist"}
        </Button>
      </div>
    </DetailCard>
  )
}
