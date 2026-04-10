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
      <aside className="shrink-0 w-12 bg-black flex flex-col border-r border-white/10">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="w-12 h-12 border-b border-white/10 bg-white/[0.04] animate-pulse" />
        ))}
      </aside>
    )
  }

  return (
    <aside className="shrink-0 w-12 bg-black flex flex-col border-r border-white/10">
      {/* All Brands */}
      <button
        onClick={() => setActiveBrand("all")}
        className={cn(
          "relative flex items-center justify-center w-12 h-12 border-b border-white/10 group transition-all bg-zinc-800",
          activeBrand === "all" && "ring-1 ring-inset ring-white/40"
        )}
        title="All Stores"
      >
        <Layers className="size-7 text-white" strokeWidth={2.25} />
        {activeBrand === "all" && (
          <span className="absolute right-0 top-0 bottom-0 w-[2px] bg-white" />
        )}
        <span className="absolute inset-0 bg-white/0 group-hover:bg-white/15 transition-colors pointer-events-none" />
      </button>

      {/* Store entries */}
      {stores.map((store) => {
        const isActive = activeBrand === store.id
        return (
          <button
            key={store.id}
            onClick={() => setActiveBrand(store.id)}
            className={cn(
              "relative flex items-center justify-center w-12 h-12 border-b border-white/10 group transition-all overflow-hidden",
              isActive && "ring-1 ring-inset ring-white/40"
            )}
            title={store.name}
            style={{ backgroundColor: store.color }}
          >
            {store.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={store.logo_url}
                alt={store.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <span className="text-base font-bold text-white">
                {store.short}
              </span>
            )}
            {isActive && (
              <span className="absolute right-0 top-0 bottom-0 w-[2px] bg-white z-10" />
            )}
            <span className="absolute inset-0 bg-white/0 group-hover:bg-white/15 transition-colors pointer-events-none" />
          </button>
        )
      })}

      {/* Inactive stores (grayed) */}
      {inactiveStores.length > 0 && (
        <>
          {inactiveStores.map((store) => (
            <div
              key={store.id}
              className="relative flex items-center justify-center w-12 h-12 border-b border-white/10 opacity-35 cursor-not-allowed grayscale"
              title={`${store.name} (inactive)`}
              style={{ backgroundColor: store.color }}
            >
              {store.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={store.logo_url}
                  alt={store.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <span className="text-base font-bold text-white/80">
                  {store.short}
                </span>
              )}
            </div>
          ))}
        </>
      )}

      {/* Spacer fills remaining height with the same dark background */}
      <div className="flex-1" />
    </aside>
  )
}
