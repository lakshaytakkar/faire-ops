"use client"

import { useState, useEffect, useCallback } from "react"

const API = "/api/jsblueridge/data"

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>

/* ------------------------------------------------------------------ */
/*  Generic fetch helper                                               */
/* ------------------------------------------------------------------ */

async function jsbFetch(params: Record<string, string>): Promise<{ data: Row[]; count?: number }> {
  const sp = new URLSearchParams(params)
  const res = await fetch(`${API}?${sp}`)
  return res.json()
}

async function jsbCount(table: string, eq?: Record<string, string>): Promise<number> {
  const params: Record<string, string> = { table, count: "true" }
  if (eq) params.eq = JSON.stringify(eq)
  const { count } = await jsbFetch(params) as any
  return count ?? 0
}

/* ------------------------------------------------------------------ */
/*  Stores                                                             */
/* ------------------------------------------------------------------ */

export function useJSBStores() {
  const [stores, setStores] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    jsbFetch({
      table: "faire_stores",
      select: "id, faire_store_id, name, color, short, category, total_orders, total_products, last_synced_at, active, logo_url",
      order: "name",
      orderDir: "asc",
    }).then(({ data }) => {
      setStores(data ?? [])
      setLoading(false)
    })
  }, [])

  return { stores, loading }
}

/* ------------------------------------------------------------------ */
/*  Orders                                                             */
/* ------------------------------------------------------------------ */

export function useJSBOrders(state?: string, limit = 1000) {
  const [orders, setOrders] = useState<Row[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(() => {
    setLoading(true)
    async function load() {
      const eq = state ? { state } : undefined
      const [countRes, dataRes] = await Promise.all([
        jsbCount("faire_orders", eq),
        jsbFetch({
          table: "faire_orders",
          select: "*",
          order: "faire_created_at",
          orderDir: "desc",
          limit: String(limit),
          ...(eq ? { eq: JSON.stringify(eq) } : {}),
        }),
      ])
      setTotalCount(countRes)
      setOrders(dataRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [state, limit])

  useEffect(() => { refetch() }, [refetch])

  return { orders, totalCount, loading, refetch }
}

/* ------------------------------------------------------------------ */
/*  Order Stats                                                        */
/* ------------------------------------------------------------------ */

export interface JSBOrderStats {
  total: number
  newOrders: number
  processing: number
  inTransit: number
  delivered: number
  canceled: number
  totalRevenueCents: number
}

export function useJSBOrderStats() {
  const [stats, setStats] = useState<JSBOrderStats>({
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
    async function load() {
      const [total, newO, proc, preT, inT, del, can] = await Promise.all([
        jsbCount("faire_orders"),
        jsbCount("faire_orders", { state: "NEW" }),
        jsbCount("faire_orders", { state: "PROCESSING" }),
        jsbCount("faire_orders", { state: "PRE_TRANSIT" }),
        jsbCount("faire_orders", { state: "IN_TRANSIT" }),
        jsbCount("faire_orders", { state: "DELIVERED" }),
        jsbCount("faire_orders", { state: "CANCELED" }),
      ])

      // Revenue: server-side sum (avoids row-limit truncation)
      const revRes = await fetch(`${API}?table=faire_orders&sum=total_cents`)
      const revJson = await revRes.json()
      const revenue = revJson.sum ?? 0

      setStats({
        total,
        newOrders: newO,
        processing: proc,
        inTransit: inT + preT,
        delivered: del,
        canceled: can,
        totalRevenueCents: revenue,
      })
      setLoading(false)
    }
    load()
  }, [])

  return { stats, loading }
}

/* ------------------------------------------------------------------ */
/*  Products                                                           */
/* ------------------------------------------------------------------ */

export function useJSBProducts(limit = 1000) {
  const [products, setProducts] = useState<Row[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(() => {
    setLoading(true)
    async function load() {
      const [count, { data }] = await Promise.all([
        jsbCount("faire_products"),
        jsbFetch({
          table: "faire_products",
          select: "*",
          order: "name",
          orderDir: "asc",
          limit: String(limit),
        }),
      ])
      setTotalCount(count)
      setProducts(data ?? [])
      setLoading(false)
    }
    load()
  }, [limit])

  useEffect(() => { refetch() }, [refetch])

  return { products, totalCount, loading, refetch }
}

/* ------------------------------------------------------------------ */
/*  Retailers                                                          */
/* ------------------------------------------------------------------ */

export function useJSBRetailers(limit = 5000) {
  const [retailers, setRetailers] = useState<Row[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [count, { data }] = await Promise.all([
        jsbCount("faire_retailers"),
        jsbFetch({
          table: "faire_retailers",
          select: "*",
          order: "total_orders",
          orderDir: "desc",
          limit: String(limit),
        }),
      ])
      setTotalCount(count)
      setRetailers(data ?? [])
      setLoading(false)
    }
    load()
  }, [limit])

  return { retailers, totalCount, loading }
}

/* ------------------------------------------------------------------ */
/*  Sync                                                               */
/* ------------------------------------------------------------------ */

export function useJSBSync() {
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<unknown>(null)
  const [error, setError] = useState<string | null>(null)

  const triggerSync = useCallback(async () => {
    setSyncing(true)
    setError(null)
    try {
      const res = await fetch("/api/jsblueridge/sync", { method: "POST" })
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
