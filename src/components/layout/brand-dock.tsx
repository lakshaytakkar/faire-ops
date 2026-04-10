"use client"

import { useBrandFilter } from "@/lib/brand-filter-context"
import { cn } from "@/lib/utils"
import { Layers } from "lucide-react"

/**
 * Left brand dock — vertical strip of 48px square cells, sharp corners,
 * matching the geometry of the workspace dock and the bottom utility bar.
 *
 * Each cell is `w-12 h-12` with `border-b border-white/10` so the cells
 * read as a connected grid. Active state is `bg-white/10` with a 2px white
 * indicator strip on the inner (right) edge. Content (store logos / brand
 * marks) keeps its own rounded shape inside the square cell.
 */
export function BrandDock() {
  const { activeBrand, setActiveBrand, stores, inactiveStores, storesLoading } = useBrandFilter()

  if (storesLoading) {
    return (
      <aside className="shrink-0 w-12 bg-black flex flex-col">
        <div className="w-12 h-12 border-b border-white/10 bg-white/[0.04] animate-pulse" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="w-12 h-12 border-b border-white/10 bg-white/[0.04] animate-pulse" />
        ))}
      </aside>
    )
  }

  return (
    <aside className="shrink-0 w-12 bg-black flex flex-col">
      {/* All Brands */}
      <button
        onClick={() => setActiveBrand("all")}
        className={cn(
          "relative flex items-center justify-center w-12 h-12 border-b border-white/10 transition-colors",
          activeBrand === "all"
            ? "bg-white/10 text-white"
            : "text-white/60 hover:bg-white/10 hover:text-white"
        )}
        title="All Stores"
      >
        <Layers className="size-4" />
        {activeBrand === "all" && (
          <span className="absolute right-0 top-0 bottom-0 w-[2px] bg-white" />
        )}
      </button>

      {/* Store entries */}
      {stores.map((store) => {
        const isActive = activeBrand === store.id
        return (
          <button
            key={store.id}
            onClick={() => setActiveBrand(store.id)}
            className={cn(
              "relative flex items-center justify-center w-12 h-12 border-b border-white/10 transition-colors",
              isActive ? "bg-white/10" : "hover:bg-white/10"
            )}
            title={store.name}
          >
            {store.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={store.logo_url}
                alt={store.name}
                className="w-7 h-7 rounded object-cover"
                loading="lazy"
              />
            ) : (
              <span
                className="flex items-center justify-center w-7 h-7 text-[10px] font-bold text-white rounded"
                style={{ backgroundColor: store.color }}
              >
                {store.short}
              </span>
            )}
            {isActive && (
              <span className="absolute right-0 top-0 bottom-0 w-[2px] bg-white" />
            )}
          </button>
        )
      })}

      {/* Inactive stores (grayed) */}
      {inactiveStores.length > 0 && (
        <>
          {inactiveStores.map((store) => (
            <div
              key={store.id}
              className="relative flex items-center justify-center w-12 h-12 border-b border-white/10 opacity-35 cursor-not-allowed"
              title={`${store.name} (inactive)`}
            >
              <span
                className="flex items-center justify-center w-7 h-7 text-[10px] font-bold text-white/60 rounded grayscale"
                style={{ backgroundColor: store.color }}
              >
                {store.short}
              </span>
            </div>
          ))}
        </>
      )}

      {/* Spacer fills remaining height with the same dark background */}
      <div className="flex-1" />
    </aside>
  )
}
