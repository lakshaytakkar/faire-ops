"use client"

import { useCallback } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { FilterBar, type FilterTab } from "@/components/shared/filter-bar"

// Small client wrapper around FilterBar that syncs search + status tab
// back to the URL query string so the server component can re-render
// with filtered data. Department dropdown is a plain <select>.

interface DirectoryFilterBarProps {
  q: string
  status: string
  dept: string
  departments: Array<{ id: string; label: string }>
  counts: {
    all: number
    active: number
    probation: number
    on_leave: number
    terminated: number
  }
}

const TABS: FilterTab[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "probation", label: "Probation" },
  { id: "on_leave", label: "On Leave" },
  { id: "terminated", label: "Terminated" },
]

export function DirectoryFilterBar({
  q,
  status,
  dept,
  departments,
  counts,
}: DirectoryFilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const push = useCallback(
    (patch: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams.toString())
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === "" || v === "all") next.delete(k)
        else next.set(k, v)
      }
      const qs = next.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams],
  )

  const tabs: FilterTab[] = TABS.map((t) => ({
    ...t,
    count:
      t.id === "all"
        ? counts.all
        : t.id === "active"
          ? counts.active
          : t.id === "probation"
            ? counts.probation
            : t.id === "on_leave"
              ? counts.on_leave
              : counts.terminated,
  }))

  return (
    <FilterBar
      search={{
        value: q,
        onChange: (v) => push({ q: v }),
        placeholder: "Search name or role…",
      }}
      tabs={tabs}
      activeTab={status}
      onTabChange={(id) => push({ status: id })}
      right={
        <select
          value={dept}
          onChange={(e) => push({ dept: e.target.value })}
          className="h-8 px-2.5 text-xs rounded-md border border-input bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
      }
    />
  )
}
