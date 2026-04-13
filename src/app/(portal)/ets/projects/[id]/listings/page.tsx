"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useParams } from "next/navigation"
import { Search, ShoppingBag } from "lucide-react"
import { supabaseEts } from "@/lib/supabase"
import {
  EtsEmptyState,
  EtsStatusBadge,
  formatCurrency,
} from "@/app/(portal)/ets/_components/ets-ui"

interface Product {
  id: string
  product_code: string | null
  name_en: string | null
  name_cn: string | null
  category: string | null
  cost_price: number | null
  suggested_mrp: number | null
  image_url: string | null
  is_active: boolean | null
  is_featured: boolean | null
}

interface Listing {
  product_id: string
  is_visible: boolean
  is_featured: boolean
}

const PAGE_SIZE = 60

export default function ProjectListingsPage() {
  const params = useParams<{ id: string }>()
  const clientId = params?.id as string
  const [products, setProducts] = useState<Product[]>([])
  const [listings, setListings] = useState<Map<string, Listing>>(new Map())
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "visible" | "hidden" | "featured">("all")
  const [page, setPage] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: prods }, { data: lst }] = await Promise.all([
      supabaseEts
        .from("products")
        .select("id, product_code, name_en, name_cn, category, cost_price, suggested_mrp, image_url, is_active, is_featured")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(2000),
      supabaseEts.from("client_listings").select("*").eq("client_id", clientId),
    ])
    setProducts((prods ?? []) as Product[])
    setListings(
      new Map(((lst ?? []) as Listing[]).map((l) => [l.product_id, l])),
    )
    setLoading(false)
  }, [clientId])

  useEffect(() => {
    if (clientId) load()
  }, [clientId, load])

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const l = listings.get(p.id)
      const isVisible = l ? l.is_visible : true
      const isFeatured = l?.is_featured ?? false
      if (filter === "visible" && !isVisible) return false
      if (filter === "hidden" && isVisible) return false
      if (filter === "featured" && !isFeatured) return false
      if (search.trim()) {
        const term = search.trim().toLowerCase()
        const hay = [p.name_en, p.name_cn, p.product_code, p.category]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        if (!hay.includes(term)) return false
      }
      return true
    })
  }, [products, listings, search, filter])

  const visible = filtered.slice(0, (page + 1) * PAGE_SIZE)

  async function toggleVisibility(productId: string) {
    const cur = listings.get(productId)
    const isVisible = cur ? cur.is_visible : true
    const nextVisible = !isVisible
    const isFeatured = cur?.is_featured ?? false
    setListings((m) => {
      const next = new Map(m)
      next.set(productId, { product_id: productId, is_visible: nextVisible, is_featured: isFeatured })
      return next
    })
    await supabaseEts
      .from("client_listings")
      .upsert(
        { client_id: clientId, product_id: productId, is_visible: nextVisible, is_featured: isFeatured },
        { onConflict: "client_id,product_id" },
      )
  }

  async function toggleFeatured(productId: string) {
    const cur = listings.get(productId)
    const isVisible = cur ? cur.is_visible : true
    const nextFeatured = !(cur?.is_featured ?? false)
    setListings((m) => {
      const next = new Map(m)
      next.set(productId, { product_id: productId, is_visible: isVisible, is_featured: nextFeatured })
      return next
    })
    await supabaseEts
      .from("client_listings")
      .upsert(
        { client_id: clientId, product_id: productId, is_visible: isVisible, is_featured: nextFeatured },
        { onConflict: "client_id,product_id" },
      )
  }

  if (loading) return <div className="h-64 rounded-lg bg-muted animate-pulse" />

  const counts = {
    total: products.length,
    visible: products.filter((p) => listings.get(p.id)?.is_visible !== false).length,
    hidden: products.filter((p) => listings.get(p.id)?.is_visible === false).length,
    featured: Array.from(listings.values()).filter((l) => l.is_featured).length,
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold">Storefront listings</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {counts.visible} visible · {counts.hidden} hidden · {counts.featured} featured
              · of {counts.total} total products
            </p>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by SKU, name, category…"
              className="w-full h-9 pl-10 pr-3 rounded-md border bg-background text-sm"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="h-9 px-3 rounded-md border bg-background text-sm"
          >
            <option value="all">All ({counts.total})</option>
            <option value="visible">Visible only ({counts.visible})</option>
            <option value="hidden">Hidden only ({counts.hidden})</option>
            <option value="featured">Featured only ({counts.featured})</option>
          </select>
        </div>
      </div>

      {visible.length === 0 ? (
        <EtsEmptyState
          icon={ShoppingBag}
          title="No products match"
          description="Adjust the search or filter to see products."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {visible.map((p) => {
              const l = listings.get(p.id)
              const isVisible = l ? l.is_visible : true
              const isFeatured = l?.is_featured ?? false
              return (
                <div
                  key={p.id}
                  className={`rounded-lg border bg-card overflow-hidden transition-opacity ${isVisible ? "" : "opacity-50"}`}
                >
                  <div className="aspect-square bg-muted">
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_url} alt={p.name_en ?? ""} className="size-full object-cover" loading="lazy" />
                    ) : (
                      <div className="size-full flex items-center justify-center text-muted-foreground">
                        <ShoppingBag className="size-8" />
                      </div>
                    )}
                  </div>
                  <div className="p-2 space-y-1.5">
                    <div className="text-xs font-semibold leading-tight line-clamp-2 min-h-[2rem]">
                      {p.name_en ?? p.name_cn ?? "Unnamed"}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-muted-foreground">{p.product_code}</span>
                      <span className="font-mono">{formatCurrency(p.cost_price)}</span>
                    </div>
                    {p.category && <EtsStatusBadge value={p.category} />}
                    <div className="flex items-center gap-1 pt-1">
                      <button
                        onClick={() => toggleVisibility(p.id)}
                        className={`flex-1 h-7 px-2 rounded text-xs font-medium border ${
                          isVisible
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-muted-foreground"
                        }`}
                      >
                        {isVisible ? "Visible" : "Hidden"}
                      </button>
                      <button
                        onClick={() => toggleFeatured(p.id)}
                        className={`size-7 rounded text-xs font-medium border ${
                          isFeatured ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-background text-muted-foreground"
                        }`}
                        aria-label="Featured"
                      >
                        ★
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {visible.length < filtered.length && (
            <div className="text-center pt-2">
              <button
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 h-9 px-3 rounded-md border bg-card text-sm font-medium hover:bg-muted/40"
              >
                Show {Math.min(PAGE_SIZE, filtered.length - visible.length)} more (of {filtered.length - visible.length} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
