"use client"

import { useCallback } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { ChevronDown, LayoutGrid, List, Search } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FilterOption {
  value: string
  label: string
}

interface DirectoryFiltersProps {
  q: string
  activeStatus: string
  activeOffice: string
  activeType: string
  activeDept: string
  activeView: string
  statusOptions: FilterOption[]
  officeOptions: FilterOption[]
  typeOptions: FilterOption[]
  deptOptions: FilterOption[]
}

export function DirectoryFilters({
  q,
  activeStatus,
  activeOffice,
  activeType,
  activeDept,
  activeView,
  statusOptions,
  officeOptions,
  typeOptions,
  deptOptions,
}: DirectoryFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const navigate = useCallback(
    (patch: Record<string, string>) => {
      const next = new URLSearchParams(searchParams.toString())
      for (const [k, v] of Object.entries(patch)) {
        if (v === "all" || v === "") next.delete(k)
        else next.set(k, v)
      }
      const qs = next.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams],
  )

  const handleSearch = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const fd = new FormData(e.currentTarget)
      navigate({ q: (fd.get("q") as string) ?? "" })
    },
    [navigate],
  )

  const filters = [
    { key: "status", value: activeStatus, options: statusOptions, label: "Status" },
    { key: "office", value: activeOffice, options: officeOptions, label: "Office" },
    { key: "type", value: activeType, options: typeOptions, label: "Type" },
    { key: "dept", value: activeDept, options: deptOptions, label: "Department" },
  ]

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 min-w-[200px] flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name, role, phone, email..."
            className="w-full rounded-md border border-border bg-background pl-8 pr-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <Button type="submit" variant="outline" size="sm">Search</Button>
      </form>

      {/* Compact dropdown filters */}
      {filters.map(({ key, value, options }) => {
        const isFiltered = value !== "all"
        return (
          <div key={key} className="relative">
            <select
              value={value}
              onChange={(e) => navigate({ [key]: e.target.value })}
              className={`appearance-none h-8 pl-2.5 pr-7 text-xs font-medium rounded-md border cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isFiltered
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input bg-background text-foreground"
              }`}
            >
              {options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          </div>
        )
      })}

      {/* View toggle */}
      <div className="flex items-center rounded-md border border-border overflow-hidden ml-auto">
        <button
          onClick={() => navigate({ view: "grid" })}
          className={`inline-flex items-center justify-center size-8 transition-colors ${
            activeView === "grid"
              ? "bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground hover:text-foreground"
          }`}
        >
          <LayoutGrid className="size-4" />
        </button>
        <button
          onClick={() => navigate({ view: "table" })}
          className={`inline-flex items-center justify-center size-8 transition-colors ${
            activeView === "table"
              ? "bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground hover:text-foreground"
          }`}
        >
          <List className="size-4" />
        </button>
      </div>
    </div>
  )
}
