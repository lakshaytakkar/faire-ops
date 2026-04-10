"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import {
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  ListPlus,
  Package,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ScrapedStatus = "new" | "reviewed" | "rejected"

interface ScrapedProduct {
  id: string
  source: string
  source_url: string | null
  name: string
  image_url: string | null
  price_cents: number
  category: string | null
  trend_score: number
  status: ScrapedStatus
  notes: string | null
  queued_to_pipeline: boolean
  scraped_at: string
  reviewed_by: string | null
  reviewed_at: string | null
}

/* ------------------------------------------------------------------ */
/*  Badge styles                                                       */
/* ------------------------------------------------------------------ */

const STATUS_STYLES: Record<ScrapedStatus, string> = {
  new: "bg-blue-50 text-blue-700",
  reviewed: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmtPrice(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ScrapingReviewPage() {
  const [products, setProducts] = useState<ScrapedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"all" | "new" | "reviewed" | "queued" | "rejected">("all")
  const [counts, setCounts] = useState({
    total: 0,
    new: 0,
    reviewed: 0,
    rejected: 0,
    queued: 0,
  })

  type SortKey = "score" | "price"
  type SortDir = "asc" | "desc"
  const [sortKey, setSortKey] = useState<SortKey>("score")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("desc") }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="size-3 opacity-30 ml-1" />
    return sortDir === "asc" ? <ArrowUp className="size-3 text-primary ml-1" /> : <ArrowDown className="size-3 text-primary ml-1" />
  }

  /* ---- fetch ---- */
  const fetchData = useCallback(async () => {
    setLoading(true)
    const [
      listRes,
      totalRes,
      newRes,
      reviewedRes,
      rejectedRes,
      queuedRes,
    ] = await Promise.all([
      supabase
        .from("scraped_products")
        .select("*")
        .order("scraped_at", { ascending: false }),
      supabase
        .from("scraped_products")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("scraped_products")
        .select("*", { count: "exact", head: true })
        .eq("status", "new"),
      supabase
        .from("scraped_products")
        .select("*", { count: "exact", head: true })
        .eq("status", "reviewed"),
      supabase
        .from("scraped_products")
        .select("*", { count: "exact", head: true })
        .eq("status", "rejected"),
      supabase
        .from("scraped_products")
        .select("*", { count: "exact", head: true })
        .eq("queued_to_pipeline", true),
    ])
    if (listRes.error) console.error("fetchScraped:", listRes.error)
    setProducts(listRes.data ?? [])
    setCounts({
      total: totalRes.count ?? 0,
      new: newRes.count ?? 0,
      reviewed: reviewedRes.count ?? 0,
      rejected: rejectedRes.count ?? 0,
      queued: queuedRes.count ?? 0,
    })
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  /* ---- filtered ---- */
  const filtered = useMemo(() => {
    let result = products
    if (activeTab === "new") result = result.filter((p) => p.status === "new")
    if (activeTab === "reviewed") result = result.filter((p) => p.status === "reviewed")
    if (activeTab === "rejected") result = result.filter((p) => p.status === "rejected")
    if (activeTab === "queued") result = result.filter((p) => p.queued_to_pipeline)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.source && p.source.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q))
      )
    }
    // Sort
    result = [...result].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1
      switch (sortKey) {
        case "score":
          return dir * (a.trend_score - b.trend_score)
        case "price":
          return dir * (a.price_cents - b.price_cents)
        default:
          return 0
      }
    })
    return result
  }, [products, activeTab, searchQuery, sortKey, sortDir])

  /* ---- stats (real counts, not capped by the list fetch above) ---- */
  const totalScraped = counts.total
  const newCount = counts.new
  const approvedCount = counts.reviewed
  const rejectedCount = counts.rejected
  const queuedCount = counts.queued

  /* ---- actions ---- */
  async function handleApprove(id: string) {
    await supabase
      .from("scraped_products")
      .update({ status: "reviewed", reviewed_by: "Lakshay", reviewed_at: new Date().toISOString() })
      .eq("id", id)
    fetchData()
  }

  async function handleReject(id: string) {
    await supabase
      .from("scraped_products")
      .update({ status: "rejected", reviewed_by: "Lakshay", reviewed_at: new Date().toISOString() })
      .eq("id", id)
    fetchData()
  }

  async function handleQueue(id: string) {
    await supabase
      .from("scraped_products")
      .update({ queued_to_pipeline: true })
      .eq("id", id)
    fetchData()
  }

  /* ---- loading ---- */
  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <div className="h-[60px] rounded-md bg-muted animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[100px] rounded-md bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-[500px] rounded-md bg-muted animate-pulse" />
      </div>
    )
  }

  const TABS = [
    { key: "all" as const, label: "All", count: totalScraped },
    { key: "new" as const, label: "New", count: newCount },
    { key: "reviewed" as const, label: "Reviewed", count: approvedCount },
    { key: "queued" as const, label: "Queued", count: queuedCount },
    { key: "rejected" as const, label: "Rejected", count: rejectedCount },
  ]

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">Scraping Review</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Review and queue discovered products
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-md border bg-card p-5 flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total Scraped</p>
            <p className="text-2xl font-bold mt-1">{totalScraped}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Search className="h-4 w-4 text-primary" />
          </div>
        </div>
        <div className="rounded-md border bg-card p-5 flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">New (Unreviewed)</p>
            <p className="text-2xl font-bold mt-1 text-blue-600">{newCount}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Eye className="h-4 w-4 text-blue-500" />
          </div>
        </div>
        <div className="rounded-md border bg-card p-5 flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Approved</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{approvedCount}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
        </div>
        <div className="rounded-md border bg-card p-5 flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Rejected</p>
            <p className="text-2xl font-bold mt-1 text-red-600">{rejectedCount}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-red-500/10 flex items-center justify-center">
            <XCircle className="h-4 w-4 text-red-500" />
          </div>
        </div>
      </div>

      {/* Filter tabs + search */}
      <div className="rounded-md border bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {tab.label}
                <span className="ml-1.5 text-xs">({tab.count})</span>
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              className="h-8 w-60 pl-8 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No products found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {products.length === 0
                ? "No scraped products yet."
                : "Try adjusting your filters."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-3.5 text-left text-xs font-medium text-muted-foreground">Product</th>
                  <th className="px-4 py-3.5 text-left text-xs font-medium text-muted-foreground">Source</th>
                  <th className="px-4 py-3.5 text-left text-xs font-medium text-muted-foreground">Image</th>
                  <th className="px-4 py-3.5 text-right text-xs font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("price")}>
                    <span className="flex items-center justify-end">Price <SortIcon col="price" /></span>
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-medium text-muted-foreground">Category</th>
                  <th className="px-4 py-3.5 text-left text-xs font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("score")}>
                    <span className="flex items-center">Trend Score <SortIcon col="score" /></span>
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3.5 text-right text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr key={product.id} className="border-t hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3.5 text-sm">
                      <div>
                        <p className="font-medium text-foreground">{product.name}</p>
                        {product.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
                            {product.notes}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="border-0 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                        {product.source}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-10 h-10 rounded-md object-cover bg-muted"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-right whitespace-nowrap">
                      ${fmtPrice(product.price_cents)}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground whitespace-nowrap">
                      {product.category ?? "-"}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              product.trend_score >= 80
                                ? "bg-emerald-500"
                                : product.trend_score >= 60
                                ? "bg-amber-500"
                                : "bg-gray-400"
                            }`}
                            style={{ width: `${product.trend_score}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-7 text-right">
                          {product.trend_score}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`border-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                            STATUS_STYLES[product.status]
                          }`}
                        >
                          {product.status}
                        </span>
                        {product.queued_to_pipeline && (
                          <span className="border-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700">
                            queued
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex gap-1">
                        {product.status !== "reviewed" && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleApprove(product.id)}
                            title="Approve"
                          >
                            <ThumbsUp className="h-3.5 w-3.5 text-emerald-600" />
                          </Button>
                        )}
                        {product.status !== "rejected" && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleReject(product.id)}
                            title="Reject"
                          >
                            <ThumbsDown className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        )}
                        {!product.queued_to_pipeline && product.status !== "rejected" && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleQueue(product.id)}
                            title="Queue to pipeline"
                          >
                            <ArrowRight className="h-3.5 w-3.5 text-violet-600" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
