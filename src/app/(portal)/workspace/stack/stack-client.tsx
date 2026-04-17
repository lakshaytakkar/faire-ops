"use client"

import { useMemo, useState } from "react"
import { LayoutGrid, Search, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { AppTile } from "./_components/AppTile"

export interface AppRow {
  id: string
  name: string | null
  url: string | null
  logo_url: string | null
  category: string | null
  purpose: string | null
  usage_frequency: string | null
  is_favorite: boolean | null
  is_paid: boolean | null
  tags: string[] | null
  notes: string | null
}

export interface SubRow {
  id: string
  app_id: string
  plan_name: string | null
  billing_cycle: string | null
  amount: number | null
  currency: string | null
  next_renewal: string | null
  auto_renew: boolean | null
  payment_method: string | null
  status: string | null
  started_on: string | null
  notes: string | null
}

export interface CredRow {
  id: string
  app_id: string
  login_type: string | null
  identifier: string | null
  password_manager: string | null
  password_last_rotated: string | null
  two_factor_method: string | null
  recovery_email: string | null
  recovery_phone: string | null
  notes: string | null
}

export function StackClient({
  apps,
  subsByApp,
  credsByApp,
}: {
  apps: AppRow[]
  subsByApp: [string, SubRow][]
  credsByApp: [string, CredRow][]
}) {
  const subsMap = useMemo(() => new Map(subsByApp), [subsByApp])
  const credsMap = useMemo(() => new Map(credsByApp), [credsByApp])

  const [search, setSearch] = useState("")
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set())
  const [activeFrequency, setActiveFrequency] = useState<string>("all")
  const [favoritesOnly, setFavoritesOnly] = useState(false)

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const a of apps) if (a.category) set.add(a.category)
    return Array.from(set).sort()
  }, [apps])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return apps.filter((a) => {
      if (favoritesOnly && !a.is_favorite) return false
      if (activeFrequency !== "all" && a.usage_frequency !== activeFrequency) return false
      if (activeCategories.size > 0) {
        if (!a.category || !activeCategories.has(a.category)) return false
      }
      if (q) {
        const hay = `${a.name ?? ""} ${a.purpose ?? ""} ${a.category ?? ""} ${(a.tags ?? []).join(" ")}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [apps, search, activeCategories, activeFrequency, favoritesOnly])

  const grouped = useMemo(() => {
    const groups = new Map<string, AppRow[]>()
    for (const a of filtered) {
      const key = a.category ?? "uncategorised"
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(a)
    }
    return Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length)
  }, [filtered])

  function toggleCategory(cat: string) {
    setActiveCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const pillClass =
    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition capitalize"

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search apps…"
            className="h-9 rounded-md border bg-background pl-8 pr-3 text-sm w-56"
          />
        </div>

        <select
          value={activeFrequency}
          onChange={(e) => setActiveFrequency(e.target.value)}
          className="h-9 rounded-md border bg-background px-2.5 text-sm"
        >
          <option value="all">All frequencies</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="rarely">Rarely</option>
          <option value="archived">Archived</option>
        </select>

        <button
          type="button"
          onClick={() => setFavoritesOnly((v) => !v)}
          className={cn(
            pillClass,
            favoritesOnly
              ? "bg-amber-50 text-amber-700 border-amber-300"
              : "bg-background text-foreground hover:bg-muted",
          )}
        >
          <Star className={cn("size-3.5", favoritesOnly && "fill-amber-500 text-amber-500")} />
          Favorites
        </button>

        {categories.slice(0, 16).map((cat) => {
          const active = activeCategories.has(cat)
          return (
            <button
              key={cat}
              type="button"
              onClick={() => toggleCategory(cat)}
              className={cn(
                pillClass,
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground hover:bg-muted",
              )}
            >
              {cat}
            </button>
          )
        })}

        {(activeCategories.size > 0 || activeFrequency !== "all" || favoritesOnly || search) && (
          <button
            type="button"
            onClick={() => {
              setActiveCategories(new Set())
              setActiveFrequency("all")
              setFavoritesOnly(false)
              setSearch("")
            }}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Clear
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="No apps match"
          description="Adjust filters or clear the search to see your full stack."
        />
      ) : (
        <div className="space-y-5">
          {grouped.map(([cat, list]) => (
            <DetailCard
              key={cat}
              title={`${cat.charAt(0).toUpperCase() + cat.slice(1)} (${list.length})`}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {list.map((a) => (
                  <AppTile
                    key={a.id}
                    app={a}
                    sub={subsMap.get(a.id)}
                    cred={credsMap.get(a.id)}
                  />
                ))}
              </div>
            </DetailCard>
          ))}
        </div>
      )}
    </div>
  )
}
