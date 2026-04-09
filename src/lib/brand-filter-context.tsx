"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { supabase } from "@/lib/supabase"
import type { FaireStore } from "@/lib/supabase"

interface BrandFilterContextValue {
  activeBrand: string
  setActiveBrand: (brand: string) => void
  stores: FaireStore[]
  inactiveStores: FaireStore[]
  storesLoading: boolean
  activeStore: FaireStore | null
}

const BrandFilterContext = createContext<BrandFilterContextValue>({
  activeBrand: "all",
  setActiveBrand: () => {},
  stores: [],
  inactiveStores: [],
  storesLoading: true,
  activeStore: null,
})

export function BrandFilterProvider({ children }: { children: ReactNode }) {
  const [activeBrand, setActiveBrand] = useState<string>("all")
  const [stores, setStores] = useState<FaireStore[]>([])
  const [inactiveStores, setInactiveStores] = useState<FaireStore[]>([])
  const [storesLoading, setStoresLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    // Set a timeout — if Supabase doesn't respond in 5s, stop loading state
    const timeout = setTimeout(() => {
      if (!cancelled) setStoresLoading(false)
    }, 5000)

    async function load() {
      try {
        const { data, error } = await supabase
          .from("faire_stores")
          .select("id, faire_store_id, name, color, short, category, total_orders, total_products, last_synced_at, active, logo_url")
          .order("name")
        if (cancelled) return
        clearTimeout(timeout)
        if (!error && data) {
          setStores(data.filter(s => s.active))
          setInactiveStores(data.filter(s => !s.active))
        }
      } catch {
        // Supabase unreachable — app still works with empty stores
      }
      if (!cancelled) setStoresLoading(false)
    }
    load()

    return () => { cancelled = true; clearTimeout(timeout) }
  }, [])

  const activeStore = activeBrand === "all" ? null : stores.find((s) => s.id === activeBrand) ?? null

  return (
    <BrandFilterContext.Provider value={{ activeBrand, setActiveBrand, stores, inactiveStores, storesLoading, activeStore }}>
      {children}
    </BrandFilterContext.Provider>
  )
}

export function useBrandFilter() {
  return useContext(BrandFilterContext)
}
