"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { FolderTree } from "lucide-react"
import { FilterBar, type FilterTab } from "@/components/shared/filter-bar"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { EditCategoryRow } from "./_components/EditCategoryRow"

export interface CategoryRow {
  id: string
  name: string | null
  slug: string | null
  parent_category_id: string | null
  trending: boolean | null
  product_count: number | null
  avg_profit_margin: number | null
  growth_percentage: number | null
}

export function CategoriesClient({
  rows,
  nameMap,
}: {
  rows: CategoryRow[]
  nameMap: Record<string, string>
}) {
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState<string>("all")

  const tabs: FilterTab[] = useMemo(() => {
    const parents = rows.filter((r) => !r.parent_category_id).length
    const subs = rows.length - parents
    const trending = rows.filter((r) => r.trending).length
    return [
      { id: "all", label: "All", count: rows.length },
      { id: "parents", label: "Parents", count: parents },
      { id: "children", label: "Subcategories", count: subs },
      { id: "trending", label: "Trending", count: trending },
    ]
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (activeTab === "parents" && r.parent_category_id) return false
      if (activeTab === "children" && !r.parent_category_id) return false
      if (activeTab === "trending" && !r.trending) return false
      if (search) {
        const needle = search.toLowerCase()
        const hay = [r.name, r.slug].filter(Boolean).join(" ").toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [rows, activeTab, search])

  return (
    <>
      <FilterBar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search name or slug…",
        }}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="No categories match"
          description="Try a different search term or tab."
        />
      ) : (
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/30 border-b">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Name</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Parent</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Slug</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Products</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Trending</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Margin %</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">Growth %</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b last:border-b-0 hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/usdrop/categories/${c.id}`}
                      className="text-sm font-medium hover:text-primary"
                    >
                      {c.name ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {c.parent_category_id ? nameMap[c.parent_category_id] ?? "—" : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                    {c.slug ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-sm tabular-nums">
                    {(c.product_count ?? 0).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={toneForStatus(c.trending ? "active" : "inactive")}>
                      {c.trending ? "Trending" : "Off"}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-right text-sm tabular-nums">
                    {c.avg_profit_margin !== null && c.avg_profit_margin !== undefined
                      ? `${Number(c.avg_profit_margin).toFixed(1)}%`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-sm tabular-nums">
                    {c.growth_percentage !== null && c.growth_percentage !== undefined
                      ? `${Number(c.growth_percentage).toFixed(1)}%`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <EditCategoryRow category={c} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
