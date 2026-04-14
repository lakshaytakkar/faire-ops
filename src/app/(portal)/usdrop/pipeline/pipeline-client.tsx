"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Sparkles } from "lucide-react"
import { FilterBar, type FilterTab } from "@/components/shared/filter-bar"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import { PipelineRowActions } from "./_components/PipelineRowActions"

export interface SourceRow {
  product_id: string
  source_type: string | null
  source_id: string | null
  standardized_at: string | null
  standardized_by: string | null
  tradelle_id: string | null
}

export interface ProductLite {
  id: string
  title: string | null
  image: string | null
  buy_price: number | null
  sell_price: number | null
}

export interface MetadataLite {
  product_id: string
  is_winning: boolean | null
  is_trending: boolean | null
  profit_margin: number | null
  scrape_depth: string | null
  found_date: string | null
}

function formatCurrency(n: number | null | undefined, currency = "$") {
  if (n === null || n === undefined) return "—"
  const num = typeof n === "string" ? parseFloat(n) : n
  if (isNaN(num)) return "—"
  return `${currency}${num.toLocaleString("en-IN")}`
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—"
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return d
  }
}

export function PipelineClient({
  rows,
  products,
  meta,
}: {
  rows: SourceRow[]
  products: ProductLite[]
  meta: MetadataLite[]
}) {
  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])
  const metaMap = useMemo(() => new Map(meta.map((m) => [m.product_id, m])), [meta])

  const [search, setSearch] = useState("")
  const [activeSource, setActiveSource] = useState<string>("all")
  const [activeFlag, setActiveFlag] = useState<string>("all")

  const sourceTabs: FilterTab[] = useMemo(() => {
    const counts = rows.reduce<Record<string, number>>((acc, r) => {
      const k = (r.source_type ?? "unknown").toLowerCase()
      acc[k] = (acc[k] ?? 0) + 1
      return acc
    }, {})
    const out: FilterTab[] = [{ id: "all", label: "All", count: rows.length }]
    Object.entries(counts).forEach(([k, v]) => {
      out.push({ id: k, label: k, count: v })
    })
    return out
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (activeSource !== "all" && (r.source_type ?? "unknown").toLowerCase() !== activeSource)
        return false
      const m = metaMap.get(r.product_id)
      if (activeFlag === "winning" && !m?.is_winning) return false
      if (activeFlag === "trending" && !m?.is_trending) return false
      if (search) {
        const p = productMap.get(r.product_id)
        const hay = [p?.title, r.tradelle_id, r.source_id, r.product_id]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        if (!hay.includes(search.toLowerCase())) return false
      }
      return true
    })
  }, [rows, activeSource, activeFlag, search, productMap, metaMap])

  return (
    <>
      <FilterBar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search title, tradelle id…",
        }}
        tabs={sourceTabs}
        activeTab={activeSource}
        onTabChange={setActiveSource}
        right={
          <select
            value={activeFlag}
            onChange={(e) => setActiveFlag(e.target.value)}
            className="h-8 rounded-md border border-input bg-transparent px-2.5 text-xs"
          >
            <option value="all">All flags</option>
            <option value="winning">Winning</option>
            <option value="trending">Trending</option>
          </select>
        }
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No items match"
          description="Adjust the search or filter to see more queued products."
        />
      ) : (
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/30 border-b">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Product</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Source</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Flags</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Buy</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Sell</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Margin</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Found</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const p = productMap.get(r.product_id)
                const m = metaMap.get(r.product_id)
                return (
                  <tr
                    key={r.product_id}
                    className="border-b last:border-b-0 hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/usdrop/products/${r.product_id}`}
                        className="flex items-center gap-3 hover:text-primary"
                      >
                        {p?.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.image}
                            alt=""
                            className="size-9 rounded-lg object-cover bg-muted shrink-0 border border-border/60"
                            loading="lazy"
                          />
                        ) : (
                          <span className="size-9 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                            <Sparkles className="size-4" />
                          </span>
                        )}
                        <div className="text-sm font-medium line-clamp-2">
                          {p?.title ?? r.product_id.slice(0, 8)}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone="slate">{r.source_type ?? "—"}</StatusBadge>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {r.tradelle_id ?? r.source_id ?? "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {m?.is_winning && <StatusBadge tone="emerald">Winning</StatusBadge>}
                        {m?.is_trending && <StatusBadge tone="blue">Trending</StatusBadge>}
                        {m?.scrape_depth && <StatusBadge tone="slate">{m.scrape_depth}</StatusBadge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums">
                      {formatCurrency(p?.buy_price)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums">
                      {formatCurrency(p?.sell_price)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums">
                      {m?.profit_margin !== null && m?.profit_margin !== undefined
                        ? `${Number(m.profit_margin).toFixed(1)}%`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(m?.found_date)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <PipelineRowActions productId={r.product_id} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
