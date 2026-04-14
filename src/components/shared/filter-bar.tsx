"use client"

import { type ReactNode } from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface FilterTab {
  id: string
  label: string
  count?: number
}

export function FilterBar({
  search,
  tabs,
  activeTab,
  onTabChange,
  right,
  className,
}: {
  search?: {
    value: string
    onChange: (v: string) => void
    placeholder?: string
  }
  tabs?: FilterTab[]
  activeTab?: string
  onTabChange?: (id: string) => void
  right?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border/80 bg-card shadow-sm flex flex-wrap items-center justify-between gap-3 px-4 py-3",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {search && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              type="search"
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              placeholder={search.placeholder ?? "Search…"}
              className="h-8 pl-8 pr-7 text-sm rounded-md border border-input bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-56"
            />
            {search.value && (
              <button
                type="button"
                onClick={() => search.onChange("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 size-5 inline-flex items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        )}
        {tabs && tabs.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange?.(tab.id)}
                  className={cn(
                    "h-7 px-2.5 text-xs font-medium rounded-md transition-colors inline-flex items-center gap-1.5",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                >
                  <span>{tab.label}</span>
                  {typeof tab.count === "number" && (
                    <span
                      className={cn(
                        "inline-flex min-w-4 h-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold",
                        isActive ? "bg-primary-foreground/20" : "bg-muted-foreground/15",
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
      {right && <div className="flex items-center gap-2 flex-wrap">{right}</div>}
    </div>
  )
}
