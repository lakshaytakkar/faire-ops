"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { supabase } from "@/lib/supabase"
import type { FaireStore } from "@/lib/supabase"

interface BrandFilterContextValue {
  activeBrand: string // "all" or store UUID
  setActiveBrand: (brand: string) => void
  stores: FaireStore[]
  storesLoading: boolean
  activeStore: FaireStore | null
}

const BrandFilterContext = createContext<BrandFilterContextValue>({
  activeBrand: "all",
  setActiveBrand: () => {},
  stores: [],
  storesLoading: true,
  activeStore: null,
})

export function BrandFilterProvider({ children }: { children: ReactNode }) {
  const [activeBrand, setActiveBrand] = useState<string>("all")
  const [stores, setStores] = useState<FaireStore[]>([])
  const [storesLoading, setStoresLoading] = useState(true)

  useEffect(() => {
    supabase
      .from("faire_stores")
      .select("id, faire_store_id, name, color, short, category, total_orders, total_products, last_synced_at, active, logo_url")
      .eq("active", true)
      .order("name")
      .then(({ data }) => {
        setStores(data ?? [])
        setStoresLoading(false)
      })
  }, [])

  const activeStore = activeBrand === "all" ? null : stores.find((s) => s.id === activeBrand) ?? null

  return (
    <BrandFilterContext.Provider value={{ activeBrand, setActiveBrand, stores, storesLoading, activeStore }}>
      {children}
    </BrandFilterContext.Provider>
  )
}

export function useBrandFilter() {
  return useContext(BrandFilterContext)
}
