"use client"

/**
 * B2B brand filter pill — pinned overlay above the page content area.
 *
 * Replaces the visual purpose of the old `BrandDock` (vertical store icons
 * on the left) with a horizontal dropdown pill that lives inline above each
 * B2B page. The underlying `useBrandFilter` context is unchanged — every
 * existing page that consumes `useBrandFilter()` keeps working without any
 * code changes. Only the rendering location moves.
 *
 * Visible only inside the b2b space — when the user navigates to a future
 * /hq, /legal, /goyo, /usdrop route the pill hides itself.
 *
 * Phase 6 of the master execution plan.
 */

import { useState, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { useBrandFilter } from "@/lib/brand-filter-context"
import { useActiveSpace } from "@/lib/use-active-space"
import { ChevronDown, Layers, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export function BrandFilterPill() {
  const pathname = usePathname()
  const { activeBrand, setActiveBrand, stores, inactiveStores, storesLoading, activeStore } =
    useBrandFilter()
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Close on click-outside
  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [open])

  // Only render inside the B2B space
  const activeSlug = useActiveSpace().slug
  if (activeSlug !== "b2b-ecommerce") return null

  // Hide on the homepage and the spaces directory (already there)
  if (pathname === "/") return null

  if (storesLoading) {
    return (
      <div className="h-7 w-32 rounded-md bg-muted/50 animate-pulse" />
    )
  }

  const isAll = activeBrand === "all"
  const triggerLabel = isAll ? "All Brands" : activeStore?.name ?? "All Brands"

  return (
    <div className="relative inline-block" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 h-7 pl-1.5 pr-2 rounded-full border border-border/80 bg-card shadow-sm text-xs font-medium text-foreground hover:bg-muted/40 transition-colors",
          open && "bg-muted/40"
        )}
        title="Switch brand"
      >
        {isAll ? (
          <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary">
            <Layers className="h-3 w-3" />
          </span>
        ) : activeStore?.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activeStore.logo_url}
            alt=""
            className="h-5 w-5 rounded-full object-cover ring-1 ring-border/60"
          />
        ) : (
          <span
            className="flex items-center justify-center h-5 w-5 rounded-full text-[9px] font-bold text-white"
            style={{ backgroundColor: activeStore?.color ?? "#64748b" }}
          >
            {activeStore?.short ?? "?"}
          </span>
        )}
        <span className="leading-none">{triggerLabel}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-64 rounded-md border border-border/80 bg-card shadow-xl ring-1 ring-black/5 overflow-hidden z-50">
          <div className="py-1 max-h-[60vh] overflow-y-auto">
            {/* All Brands option */}
            <button
              type="button"
              onClick={() => {
                setActiveBrand("all")
                setOpen(false)
              }}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted/60 transition-colors",
                isAll && "bg-muted/40"
              )}
            >
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary shrink-0">
                <Layers className="h-3.5 w-3.5" />
              </span>
              <div className="flex-1 text-left">
                <p className="font-semibold text-foreground leading-tight">All Brands</p>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  {stores.length} active store{stores.length !== 1 ? "s" : ""}
                </p>
              </div>
              {isAll && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
            </button>

            {/* Active stores */}
            {stores.length > 0 && (
              <div className="border-t border-border/60 mt-1 pt-1">
                <p className="px-3 pb-1 text-[9px] uppercase tracking-wider font-bold text-muted-foreground">
                  Stores
                </p>
                {stores.map((store) => {
                  const isActive = activeBrand === store.id
                  return (
                    <button
                      key={store.id}
                      type="button"
                      onClick={() => {
                        setActiveBrand(store.id)
                        setOpen(false)
                      }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted/60 transition-colors",
                        isActive && "bg-muted/40"
                      )}
                    >
                      {store.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={store.logo_url}
                          alt=""
                          className="h-6 w-6 rounded-full object-cover shrink-0 ring-1 ring-border/60"
                        />
                      ) : (
                        <span
                          className="flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-bold text-white shrink-0"
                          style={{ backgroundColor: store.color }}
                        >
                          {store.short}
                        </span>
                      )}
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-semibold text-foreground leading-tight truncate">
                          {store.name}
                        </p>
                        {store.category && (
                          <p className="text-[10px] text-muted-foreground leading-tight truncate">
                            {store.category}
                          </p>
                        )}
                      </div>
                      {isActive && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Inactive stores (greyed) */}
            {inactiveStores.length > 0 && (
              <div className="border-t border-border/60 mt-1 pt-1">
                <p className="px-3 pb-1 text-[9px] uppercase tracking-wider font-bold text-muted-foreground">
                  Inactive
                </p>
                {inactiveStores.map((store) => (
                  <div
                    key={store.id}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs opacity-50 cursor-not-allowed"
                  >
                    {store.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={store.logo_url}
                        alt=""
                        className="h-6 w-6 rounded-full object-cover shrink-0 grayscale"
                      />
                    ) : (
                      <span
                        className="flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-bold text-white shrink-0 grayscale"
                        style={{ backgroundColor: store.color }}
                      >
                        {store.short}
                      </span>
                    )}
                    <span className="flex-1 text-left text-muted-foreground truncate">
                      {store.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
