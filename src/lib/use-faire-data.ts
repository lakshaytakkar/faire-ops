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

export function useOrders(storeId?: string, state?: string, limit = 50) {
  const [orders, setOrders] = useState<FaireOrder[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(() => {
    setLoading(true)
    async function fetchAll() {
      // Fetch total count separately
      let countQuery = supabase.from("faire_orders").select("*", { count: "exact", head: true })
      if (storeId) countQuery = countQuery.eq("store_id", storeId)
      if (state) countQuery = countQuery.eq("state", state)
      const { count } = await countQuery
      setTotalCount(count ?? 0)

      // Fetch only the requested number of rows
      const pageSize = Math.min(limit, 1000)
      const all: FaireOrder[] = []
      let from = 0
      let hasMore = true
      while (hasMore && from < limit) {
        const batchSize = Math.min(pageSize, limit - from)
        let query = supabase
          .from("faire_orders")
          .select("*")
          .order("faire_created_at", { ascending: false })
          .range(from, from + batchSize - 1)
        if (storeId) query = query.eq("store_id", storeId)
        if (state) query = query.eq("state", state)
        const { data } = await query
        if (data && data.length > 0) {
          all.push(...data)
          from += batchSize
          if (data.length < batchSize) hasMore = false
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

  return { orders, totalCount, loading, refetch }
}

/* ------------------------------------------------------------------ */
/*  Order Stats                                                        */
/* ------------------------------------------------------------------ */

/** Compute the ISO date string for the start of a date-filter period */
function getDateFilterStart(dateFilter: string): string | null {
  if (dateFilter === "All Time") return null
  const now = new Date()
  if (dateFilter === "Today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return start.toISOString()
  }
  if (dateFilter === "This Month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return start.toISOString()
  }
  if (dateFilter === "3 Months") {
    const start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
    return start.toISOString()
  }
  return null
}

export interface OrderStats {
  total: number
  newOrders: number
  processing: number
  inTransit: number
  delivered: number
  canceled: number
  totalRevenueCents: number
}

/**
 * Computes order stats using parallel count queries (one per state) plus a
 * separate totals fetch for revenue. This avoids the prior bug where counts
 * were derived from a row-limited batch fetch and therefore capped at ~1000.
 *
 * - Counts: `Promise.all` of per-state `count: "exact", head: true` queries.
 * - Revenue: single `select("total_cents")` with a wide `.range(0, 50000)` cap
 *   so we can sum client-side (Supabase has no native SUM without an RPC).
 */
export function useOrderStats(storeId?: string, dateFilter: string = "All Time") {
  const [stats, setStats] = useState<OrderStats>({
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
      setLoading(true)
      const dateStart = getDateFilterStart(dateFilter)

      const countForState = (state: string) => {
        let q = supabase
          .from("faire_orders")
          .select("*", { count: "exact", head: true })
          .eq("state", state)
        if (storeId) q = q.eq("store_id", storeId)
        if (dateStart) q = q.gte("faire_created_at", dateStart)
        return q.then(({ count }) => count ?? 0)
      }

      const totalCountPromise = (() => {
        let q = supabase.from("faire_orders").select("*", { count: "exact", head: true })
        if (storeId) q = q.eq("store_id", storeId)
        if (dateStart) q = q.gte("faire_created_at", dateStart)
        return q.then(({ count }) => count ?? 0)
      })()

      const revenuePromise = (() => {
        let q = supabase.from("faire_orders").select("total_cents").range(0, 50000)
        if (storeId) q = q.eq("store_id", storeId)
        if (dateStart) q = q.gte("faire_created_at", dateStart)
        return q.then(({ data }) =>
          (data ?? []).reduce(
            (sum: number, o: { total_cents: number | null }) => sum + (o.total_cents ?? 0),
            0
          )
        )
      })()

      const [
        total,
        newOrders,
        processing,
        preTransit,
        inTransit,
        delivered,
        canceled,
        totalRevenueCents,
      ] = await Promise.all([
        totalCountPromise,
        countForState("NEW"),
        countForState("PROCESSING"),
        countForState("PRE_TRANSIT"),
        countForState("IN_TRANSIT"),
        countForState("DELIVERED"),
        countForState("CANCELED"),
        revenuePromise,
      ])

      setStats({
        total,
        newOrders,
        processing,
        inTransit: inTransit + preTransit,
        delivered,
        canceled,
        totalRevenueCents,
      })
      setLoading(false)
    }
    fetchStats()
  }, [storeId, dateFilter])

  return { stats, loading }
}

/* ------------------------------------------------------------------ */
/*  Products                                                           */
/* ------------------------------------------------------------------ */

export function useProducts(storeId?: string, limit = 50) {
  const [products, setProducts] = useState<FaireProduct[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(() => {
    setLoading(true)
    async function fetchAll() {
      // Fetch total count separately
      let countQuery = supabase.from("faire_products").select("*", { count: "exact", head: true })
      if (storeId) countQuery = countQuery.eq("store_id", storeId)
      const { count } = await countQuery
      setTotalCount(count ?? 0)

      // Fetch only the requested number of rows
      const pageSize = Math.min(limit, 1000)
      const all: FaireProduct[] = []
      let from = 0
      let hasMore = true
      while (hasMore && from < limit) {
        const batchSize = Math.min(pageSize, limit - from)
        let query = supabase
          .from("faire_products")
          .select("*")
          .order("faire_updated_at", { ascending: false })
          .range(from, from + batchSize - 1)
        if (storeId) query = query.eq("store_id", storeId)
        const { data } = await query
        if (data && data.length > 0) {
          all.push(...data)
          from += batchSize
          if (data.length < batchSize) hasMore = false
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

  return { products, totalCount, loading, refetch }
}

/* ------------------------------------------------------------------ */
/*  Retailers                                                          */
/* ------------------------------------------------------------------ */

export function useRetailers(limit = 5000, faireStoreId?: string) {
  const [retailers, setRetailers] = useState<FaireRetailer[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch count separately (not affected by row limit)
    let countQuery = supabase
      .from("faire_retailers")
      .select("*", { count: "exact", head: true })
    if (faireStoreId) countQuery = countQuery.contains("store_ids", [faireStoreId])
    countQuery.then(({ count }) => {
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
        let query = supabase
          .from("faire_retailers")
          .select("*")
          .order("total_orders", { ascending: false })
          .range(from, to)
        if (faireStoreId) query = query.contains("store_ids", [faireStoreId])

        const { data } = await query

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
  }, [limit, faireStoreId])

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

/* ------------------------------------------------------------------ */
/*  Generic count helper                                               */
/* ------------------------------------------------------------------ */

/**
 * Fetches a row count from a Supabase table with an optional set of equality
 * filters. Returns 0 on error. Use this for stat-card counters instead of
 * fetching rows and calling .length.
 *
 * Filter semantics:
 * - `null` value  → translated to `.is(col, null)`
 * - any other     → translated to `.eq(col, value)`
 */
export async function countRows(
  table: string,
  filters?: Record<string, string | number | boolean | null>
): Promise<number> {
  try {
    let query = supabase.from(table).select("*", { count: "exact", head: true })
    if (filters) {
      for (const [col, value] of Object.entries(filters)) {
        if (value === null) {
          query = query.is(col, null)
        } else {
          query = query.eq(col, value)
        }
      }
    }
    const { count, error } = await query
    if (error) {
      console.error(`countRows(${table}) error:`, error)
      return 0
    }
    return count ?? 0
  } catch (err) {
    console.error(`countRows(${table}) exception:`, err)
    return 0
  }
}
