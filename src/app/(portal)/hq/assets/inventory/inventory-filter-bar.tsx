"use client"

import { useCallback } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { FilterBar, type FilterTab } from "@/components/shared/filter-bar"

// Client wrapper around FilterBar that syncs search + status tab + type
// dropdown back to the URL query string so the server component can
// re-render with filtered data.

interface InventoryFilterBarProps {
  q: string
  type: string
  status: string
  counts: {
    all: number
    assigned: number
    available: number
    under_repair: number
    retired: number
  }
}

const STATUS_TABS: FilterTab[] = [
  { id: "all", label: "All" },
  { id: "assigned", label: "Assigned" },
  { id: "available", label: "In stock" },
  { id: "under_repair", label: "Under repair" },
  { id: "retired", label: "Retired" },
]

const TYPE_OPTIONS: Array<{ id: string; label: string }> = [
  { id: "all", label: "All types" },
  { id: "Laptop", label: "Laptop" },
  { id: "Desktop", label: "Desktop" },
  { id: "Phone", label: "Phone" },
  { id: "Tablet", label: "Tablet" },
  { id: "Printer", label: "Printer" },
  { id: "Camera", label: "Camera" },
  { id: "Monitor", label: "Monitor" },
  { id: "Furniture", label: "Furniture" },
  { id: "Consumable", label: "Consumable" },
  { id: "Stationery", label: "Stationery" },
  { id: "Accessory", label: "Accessory" },
  { id: "Other", label: "Other" },
]

export function InventoryFilterBar({ q, type, status, counts }: InventoryFilterBarProps) {
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

  const tabs: FilterTab[] = STATUS_TABS.map((t) => ({
    ...t,
    count:
      t.id === "all"
        ? counts.all
        : t.id === "assigned"
          ? counts.assigned
          : t.id === "available"
            ? counts.available
            : t.id === "under_repair"
              ? counts.under_repair
              : counts.retired,
  }))

  return (
    <FilterBar
      search={{
        value: q,
        onChange: (v) => push({ q: v }),
        placeholder: "Search code, brand, serial, or item…",
      }}
      tabs={tabs}
      activeTab={status}
      onTabChange={(id) => push({ status: id })}
      right={
        <select
          value={type}
          onChange={(e) => push({ type: e.target.value })}
          className="h-8 px-2.5 text-xs rounded-md border border-input bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      }
    />
  )
}
