"use client"

import { usePathname } from "next/navigation"
import { useBrandFilter } from "@/lib/brand-filter-context"
import { cn } from "@/lib/utils"
import { Layers } from "lucide-react"

export function BrandDock() {
  const { activeBrand, setActiveBrand, stores, inactiveStores, storesLoading } = useBrandFilter()
  const pathname = usePathname()

  if (storesLoading) {
    return (
      <aside className="shrink-0 w-[52px] bg-black flex flex-col items-center py-2 gap-2">
        <div className="w-10 h-10 rounded bg-white/5 animate-pulse" />
        <div className="w-6 h-px bg-white/10" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="w-10 h-10 rounded bg-white/5 animate-pulse" />
        ))}
      </aside>
    )
  }

  return (
    <aside className="shrink-0 w-[52px] bg-black flex flex-col items-center py-2 gap-0.5">
      {/* All Brands */}
      <button
        onClick={() => setActiveBrand("all")}
        className={cn(
          "relative flex items-center justify-center w-10 h-10 transition-colors",
          activeBrand === "all"
            ? "bg-primary text-white"
            : "text-white/50 hover:bg-white/10 hover:text-white"
        )}
        title="All Stores"
      >
        <Layers className="size-[18px]" />
        {activeBrand === "all" && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-white rounded-r-sm" />
        )}
      </button>

      <div className="w-6 h-px bg-white/10 my-1" />

      {/* Store entries */}
      {stores.map((store) => {
        const isActive = activeBrand === store.id
        return (
          <button
            key={store.id}
            onClick={() => setActiveBrand(store.id)}
            className={cn(
              "relative flex items-center justify-center w-10 h-10 transition-colors",
              isActive ? "bg-white/12" : "hover:bg-white/8"
            )}
            title={store.name}
          >
            {store.logo_url ? (
              <img
                src={store.logo_url}
                alt={store.name}
                className={cn(
                  "w-[30px] h-[30px] rounded object-cover transition-transform",
                  isActive && "ring-[2px] ring-white/50 scale-105"
                )}
                loading="lazy"
              />
            ) : (
              <span
                className={cn(
                  "flex items-center justify-center w-[30px] h-[30px] text-[10px] font-bold text-white rounded transition-transform",
                  isActive && "ring-[2px] ring-white/50 scale-105"
                )}
                style={{ backgroundColor: store.color }}
              >
                {store.short}
              </span>
            )}
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-white rounded-r-sm" />
            )}
          </button>
        )
      })}

      {/* Inactive stores (grayed) */}
      {inactiveStores.length > 0 && (
        <>
          <div className="w-6 h-px bg-white/10 my-1" />
          {inactiveStores.map((store) => (
            <div
              key={store.id}
              className="relative flex items-center justify-center w-10 h-10 opacity-35 cursor-not-allowed"
              title={`${store.name} (inactive)`}
            >
              <span
                className="flex items-center justify-center w-[30px] h-[30px] text-[10px] font-bold text-white/60 rounded grayscale"
                style={{ backgroundColor: store.color }}
              >
                {store.short}
              </span>
            </div>
          ))}
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />
    </aside>
  )
}
