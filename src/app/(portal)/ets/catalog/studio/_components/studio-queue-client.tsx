"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Sparkles, Rocket, TagsIcon, ListChecks } from "lucide-react"

import { Button } from "@/components/ui/button"
import { FilterBar } from "@/components/shared/filter-bar"
import { ChecklistDot } from "@/components/shared/checklist-dot"
import { ProductThumbnail } from "@/components/shared/product-thumbnail"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { formatInr } from "@/lib/pricing/ets-pricing"
import {
  bulkAutomate,
  polishImage,
  type BulkAction,
} from "@/lib/bhagwati/studio-api"
import type {
  ImagePolishStatus,
  ListingStatus,
  PublishChecklist,
} from "@/lib/bhagwati/types"

export interface StudioQueueRow {
  id: string
  product_code: string | null
  name_cn: string | null
  name_en: string | null
  name_en_raw: string | null
  image_url: string | null
  image_polish_status: ImagePolishStatus | null
  selling_price_inr: number | null
  cost_price_inr: number | null
  source: string | null
  source_file: string | null
  listing_status: ListingStatus | null
  publish_checklist: PublishChecklist
  created_at: string | null
}

type MissingFilter =
  | "all"
  | "image"
  | "name"
  | "variants"
  | "prices"
  | "category"
  | "ready"

const MISSING_TABS: Array<{ id: MissingFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "ready", label: "Ready" },
  { id: "image", label: "Need image" },
  { id: "name", label: "Need name" },
  { id: "variants", label: "Need variants" },
  { id: "prices", label: "Need prices" },
  { id: "category", label: "Need category" },
]

function isReady(c: PublishChecklist) {
  return (
    c.image_polished &&
    c.name_normalized &&
    c.variants_modeled &&
    c.prices_inr &&
    c.categorized &&
    c.source_tagged
  )
}

function rowMatchesFilter(row: StudioQueueRow, f: MissingFilter): boolean {
  const c = row.publish_checklist
  switch (f) {
    case "all":
      return true
    case "ready":
      return isReady(c)
    case "image":
      return !c.image_polished
    case "name":
      return !c.name_normalized
    case "variants":
      return !c.variants_modeled
    case "prices":
      return !c.prices_inr
    case "category":
      return !c.categorized
  }
}

export function StudioQueueClient({
  rows,
  sourceFiles,
}: {
  rows: StudioQueueRow[]
  sourceFiles: string[]
}) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [missing, setMissing] = useState<MissingFilter>("all")
  const [sourceFile, setSourceFile] = useState<string>("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [polishingId, setPolishingId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (sourceFile && r.source_file !== sourceFile) return false
      if (!rowMatchesFilter(r, missing)) return false
      if (!q) return true
      return (
        r.product_code?.toLowerCase().includes(q) ||
        r.name_en?.toLowerCase().includes(q) ||
        r.name_en_raw?.toLowerCase().includes(q) ||
        r.name_cn?.toLowerCase().includes(q)
      )
    })
  }, [rows, search, missing, sourceFile])

  const allChecked = filtered.length > 0 && filtered.every((r) => selected.has(r.id))

  function toggleAll() {
    if (allChecked) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map((r) => r.id)))
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function runBulk(action: BulkAction) {
    const ids = action === "publish-ready"
      ? filtered.filter((r) => isReady(r.publish_checklist)).map((r) => r.id)
      : Array.from(selected)
    if (ids.length === 0) {
      setError("Pick at least one product first.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await bulkAutomate({ action, productIds: ids })
      window.alert(`Queued ${res.queued} products (job ${res.jobId}).`)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function autoPolishOne(id: string) {
    setPolishingId(id)
    setError(null)
    try {
      await polishImage({ productId: id })
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setPolishingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <FilterBar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search SKU or name…",
        }}
        tabs={MISSING_TABS.map((t) => ({
          id: t.id,
          label: t.label,
          count: rows.filter((r) => rowMatchesFilter(r, t.id)).length,
        }))}
        activeTab={missing}
        onTabChange={(id) => setMissing(id as MissingFilter)}
        right={
          <>
            <select
              value={sourceFile}
              onChange={(e) => setSourceFile(e.target.value)}
              className="h-8 px-2 text-xs rounded-md border border-input bg-background"
            >
              <option value="">All files</option>
              {sourceFiles.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </>
        }
      />

      <div className="rounded-lg border border-border/80 bg-card shadow-sm flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
        <div className="text-xs text-muted-foreground">
          {selected.size > 0
            ? `${selected.size} selected`
            : `${filtered.length.toLocaleString()} of ${rows.length.toLocaleString()} drafts`}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => runBulk("auto-polish")}
            disabled={busy}
          >
            <Sparkles /> Auto-polish
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => runBulk("auto-categorize")}
            disabled={busy}
          >
            <TagsIcon /> Auto-categorize
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => runBulk("auto-normalize")}
            disabled={busy}
          >
            <ListChecks /> Auto-normalize
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => runBulk("publish-ready")}
            disabled={busy}
          >
            <Rocket /> Publish ready
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-700 bg-red-50 ring-1 ring-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5 text-left w-10">
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} />
                </th>
                <th className="px-3 py-2.5 text-left">Product</th>
                <th className="px-3 py-2.5 text-left">SKU</th>
                <th className="px-3 py-2.5 text-left whitespace-nowrap">Checklist</th>
                <th className="px-3 py-2.5 text-right whitespace-nowrap">Selling INR</th>
                <th className="px-3 py-2.5 text-right">Status</th>
                <th className="px-3 py-2.5 text-right whitespace-nowrap"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((r) => {
                const c = r.publish_checklist
                const ready = isReady(c)
                const name = r.name_en || r.name_en_raw || r.name_cn || "—"
                return (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2 align-middle">
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggleOne(r.id)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/ets/products/${encodeURIComponent(r.product_code ?? r.id)}/studio`}
                        className="flex items-center gap-3 group"
                      >
                        <ProductThumbnail src={r.image_url} alt={name} size={36} />
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate group-hover:underline max-w-xs">
                            {name}
                          </div>
                          {r.name_en_raw && r.name_en && r.name_en_raw !== r.name_en && (
                            <div className="text-[11px] text-muted-foreground truncate max-w-xs">
                              raw: {r.name_en_raw}
                            </div>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{r.product_code ?? "—"}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <ChecklistDot done={c.image_polished} size="sm" label="image polished" />
                        <ChecklistDot done={c.name_normalized} size="sm" label="name normalized" />
                        <ChecklistDot done={c.variants_modeled} size="sm" label="variants modeled" />
                        <ChecklistDot done={c.prices_inr} size="sm" label="prices in INR" />
                        <ChecklistDot done={c.categorized} size="sm" label="categorized" />
                        <ChecklistDot done={c.source_tagged} size="sm" label="source tagged" />
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">
                      {formatInr(r.selling_price_inr)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <StatusBadge tone={toneForStatus(ready ? "ready" : (r.listing_status ?? "draft"))}>
                        {ready ? "ready" : (r.listing_status ?? "draft")}
                      </StatusBadge>
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          onClick={() => autoPolishOne(r.id)}
                          disabled={polishingId === r.id}
                          title="Auto-polish image"
                        >
                          <Sparkles />
                        </Button>
                        <Link
                          href={`/ets/products/${encodeURIComponent(r.product_code ?? r.id)}/studio`}
                          className="inline-flex h-6 items-center rounded-md border border-border bg-background px-2 text-xs font-medium hover:bg-muted"
                        >
                          Open Studio
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    No products match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
