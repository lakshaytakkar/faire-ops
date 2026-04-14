"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { FilterBar, type FilterTab } from "@/components/shared/filter-bar"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { Store } from "lucide-react"
import { ForceResyncButton } from "./_components/ForceResyncButton"

export type StoreRow = {
  id: string
  user_id: string | null
  shop_domain: string | null
  store_name: string | null
  store_email: string | null
  plan: string | null
  is_active: boolean | null
  last_synced_at: string | null
  currency: string | null
  created_at: string | null
}

export type OwnerLite = {
  id: string
  email: string | null
  full_name: string | null
}

function formatDate(v: string | null) {
  if (!v) return "—"
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
}

export function StoresClient({
  rows,
  profiles,
}: {
  rows: StoreRow[]
  profiles: OwnerLite[]
}) {
  const pMap = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles])
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState<string>("all")

  const now = Date.now()
  const day = 24 * 60 * 60 * 1000

  const tabs: FilterTab[] = useMemo(() => {
    const active = rows.filter((r) => r.is_active).length
    const inactive = rows.length - active
    const stale = rows.filter((r) => {
      if (!r.last_synced_at) return true
      return now - new Date(r.last_synced_at).getTime() > 7 * day
    }).length
    return [
      { id: "all", label: "All", count: rows.length },
      { id: "active", label: "Active", count: active },
      { id: "inactive", label: "Inactive", count: inactive },
      { id: "stale", label: "Stale sync", count: stale },
    ]
  }, [rows, now, day])

  const filtered = useMemo(() => {
    return rows.filter((s) => {
      if (activeTab === "active" && !s.is_active) return false
      if (activeTab === "inactive" && s.is_active) return false
      if (activeTab === "stale") {
        const stale = !s.last_synced_at || now - new Date(s.last_synced_at).getTime() > 7 * day
        if (!stale) return false
      }
      if (search) {
        const needle = search.toLowerCase()
        const owner = s.user_id ? pMap.get(s.user_id) : undefined
        const hay = [
          s.store_name,
          s.shop_domain,
          s.store_email,
          s.plan,
          s.currency,
          owner?.full_name,
          owner?.email,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [rows, activeTab, search, pMap, now, day])

  return (
    <>
      <FilterBar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search store, domain, owner…",
        }}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No stores match"
          description="Try clearing the search or switching tabs."
        />
      ) : (
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/30 border-b">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Owner</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Shop</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Plan</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Currency</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Last synced</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const owner = s.user_id ? pMap.get(s.user_id) : undefined
                return (
                  <tr
                    key={s.id}
                    className="border-b last:border-b-0 hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/usdrop/stores/${s.id}`}
                        className="block min-w-0 hover:text-primary"
                      >
                        <div className="text-sm font-medium truncate">
                          {owner?.full_name ?? "—"}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {owner?.email ?? s.store_email ?? "—"}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/usdrop/stores/${s.id}`}
                        className="block min-w-0 hover:text-primary"
                      >
                        <div className="text-sm font-medium truncate">
                          {s.store_name ?? "—"}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {s.shop_domain ?? "—"}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {s.plan ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {s.currency ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={toneForStatus(s.is_active ? "active" : "inactive")}>
                        {s.is_active ? "active" : "inactive"}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(s.last_synced_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ForceResyncButton storeId={s.id} />
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
