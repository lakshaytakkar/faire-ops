"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { FaireStore, FaireOrder, FaireProduct, FaireRetailer } from "@/lib/supabase"

/* ------------------------------------------------------------------ */
/*  Stores                                                             */
/* ------------------------------------------------------------------ */

export function useStores() {
  const [stores, setStores] = useState<FaireStore[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from("faire_stores")
      .select("id, faire_store_id, name, color, short, category, total_orders, total_products, last_synced_at, active, logo_url")
      .eq("active", true)
      .order("name")
      .then(({ data }) => {
        setStores(data ?? [])
        setLoading(false)
      })
  }, [])

  return { stores, loading }
}

/* ------------------------------------------------------------------ */
/*  Orders                                                             */
/* ------------------------------------------------------------------ */

export function useOrders(storeId?: string, state?: string, limit = 10000) {
  const [orders, setOrders] = useState<FaireOrder[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(() => {
    setLoading(true)
    async function fetchAll() {
      const pageSize = 1000
      const all: FaireOrder[] = []
      let from = 0
      let hasMore = true
      while (hasMore && from < limit) {
        let query = supabase
          .from("faire_orders")
          .select("*")
          .order("faire_created_at", { ascending: false })
          .range(from, from + pageSize - 1)
        if (storeId) query = query.eq("store_id", storeId)
        if (state) query = query.eq("state", state)
        const { data } = await query
        if (data && data.length > 0) {
          all.push(...data)
          from += pageSize
          if (data.length < pageSize) hasMore = false
        } else {
          hasMore = false
        }
      }
      setOrders(all)
      setLoading(false)
    }
    fetchAll()
  }, [storeId, state, limit])

  useEffect(() => { refetch() }, [refetch])

  return { orders, loading, refetch }
}

/* ------------------------------------------------------------------ */
/*  Order Stats                                                        */
/* ------------------------------------------------------------------ */

export function useOrderStats(storeId?: string) {
  const [stats, setStats] = useState({
    total: 0,
    newOrders: 0,
    processing: 0,
    inTransit: 0,
    delivered: 0,
    canceled: 0,
    totalRevenueCents: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      // Fetch all in batches to avoid 1000-row limit
      const pageSize = 1000
      const all: { state: string; total_cents: number }[] = []
      let from = 0
      let hasMore = true
      while (hasMore) {
        let query = supabase.from("faire_orders").select("state, total_cents").range(from, from + pageSize - 1)
        if (storeId) query = query.eq("store_id", storeId)
        const { data } = await query
        if (data && data.length > 0) {
          all.push(...data)
          from += pageSize
          if (data.length < pageSize) hasMore = false
        } else {
          hasMore = false
        }
      }
      setStats({
        total: all.length,
        newOrders: all.filter((o) => o.state === "NEW").length,
        processing: all.filter((o) => o.state === "PROCESSING").length,
        inTransit: all.filter((o) => o.state === "IN_TRANSIT" || o.state === "PRE_TRANSIT").length,
        delivered: all.filter((o) => o.state === "DELIVERED").length,
        canceled: all.filter((o) => o.state === "CANCELED").length,
        totalRevenueCents: all.reduce((sum, o) => sum + (o.total_cents ?? 0), 0),
      })
      setLoading(false)
    }
    fetchStats()
  }, [storeId])

  return { stats, loading }
}

/* ------------------------------------------------------------------ */
/*  Products                                                           */
/* ------------------------------------------------------------------ */

export function useProducts(storeId?: string, limit = 10000) {
  const [products, setProducts] = useState<FaireProduct[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(() => {
    setLoading(true)
    async function fetchAll() {
      const pageSize = 1000
      const all: FaireProduct[] = []
      let from = 0
      let hasMore = true
      while (hasMore && from < limit) {
        let query = supabase
          .from("faire_products")
          .select("*")
          .order("faire_updated_at", { ascending: false })
          .range(from, from + pageSize - 1)
        if (storeId) query = query.eq("store_id", storeId)
        const { data } = await query
        if (data && data.length > 0) {
          all.push(...data)
          from += pageSize
          if (data.length < pageSize) hasMore = false
        } else {
          hasMore = false
        }
      }
      setProducts(all)
      setLoading(false)
    }
    fetchAll()
  }, [storeId, limit])

  useEffect(() => { refetch() }, [refetch])

  return { products, loading, refetch }
}

/* ------------------------------------------------------------------ */
/*  Retailers                                                          */
/* ------------------------------------------------------------------ */

export function useRetailers(limit = 5000) {
  const [retailers, setRetailers] = useState<FaireRetailer[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch count separately (not affected by row limit)
    supabase
      .from("faire_retailers")
      .select("*", { count: "exact", head: true })
      .then(({ count }) => {
        setTotalCount(count ?? 0)
      })

    // Fetch data in batches if needed
    async function fetchAll() {
      const pageSize = 1000
      const allRetailers: FaireRetailer[] = []
      let from = 0
      let hasMore = true

      while (hasMore && from < limit) {
        const to = Math.min(from + pageSize - 1, limit - 1)
        const { data } = await supabase
          .from("faire_retailers")
          .select("*")
          .order("total_orders", { ascending: false })
          .range(from, to)

        if (data && data.length > 0) {
          allRetailers.push(...data)
          from += pageSize
          if (data.length < pageSize) hasMore = false
        } else {
          hasMore = false
        }
      }

      setRetailers(allRetailers)
      setLoading(false)
    }

    fetchAll()
  }, [limit])

  return { retailers, totalCount, loading }
}

/* ------------------------------------------------------------------ */
/*  Sync                                                               */
/* ------------------------------------------------------------------ */

export function useSync() {
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<unknown>(null)
  const [error, setError] = useState<string | null>(null)

  const triggerSync = useCallback(async () => {
    setSyncing(true)
    setError(null)
    try {
      const res = await fetch("/api/faire/sync", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Sync failed")
      setResult(data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSyncing(false)
    }
  }, [])

  return { syncing, result, error, triggerSync }
}

/* ------------------------------------------------------------------ */
/*  Sync Logs                                                          */
/* ------------------------------------------------------------------ */

export function useSyncLogs(storeId?: string) {
  const [logs, setLogs] = useState<{ id: string; sync_type: string; status: string; items_synced: number; started_at: string; completed_at: string | null; error_message: string | null }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let query = supabase
      .from("sync_log")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(20)
    if (storeId) query = query.eq("store_id", storeId)
    query.then(({ data }) => {
      setLogs(data ?? [])
      setLoading(false)
    })
  }, [storeId])

  return { logs, loading }
}
