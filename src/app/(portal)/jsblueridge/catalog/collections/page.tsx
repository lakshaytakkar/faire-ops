"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  Layers,
  Plus,
  Sparkles,
  Tag,
  DollarSign,
  Star,
  Leaf,
  Award,
  Package,
  Store,
  X,
  Loader2,
} from "lucide-react"

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>

const API = "/api/jsblueridge/data"

async function jsbFetch(params: Record<string, string>): Promise<{ data: Row[]; count?: number }> {
  const sp = new URLSearchParams(params)
  const res = await fetch(`${API}?${sp}`)
  return res.json()
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Collection {
  id: string
  name: string
  description: string | null
  store_id: string
  collection_type: string
  filter_rules: Record<string, unknown>
  thumbnail_url: string | null
  product_count: number
  is_active: boolean
  sort_order: number
  created_at?: string
}

type FilterTab = "all" | "category" | "price_range" | "curated" | "bestseller" | "seasonal"

const COLLECTION_TYPES = [
  { value: "category", label: "Category" },
  { value: "price_range", label: "Price Range" },
  { value: "curated", label: "Curated" },
  { value: "seasonal", label: "Seasonal" },
  { value: "bestseller", label: "Bestseller" },
]

const TYPE_ICON: Record<string, React.ElementType> = {
  category: Tag,
  price_range: DollarSign,
  curated: Star,
  seasonal: Leaf,
  bestseller: Award,
}

const TYPE_GRADIENT: Record<string, string> = {
  category: "from-blue-500/20 to-indigo-500/20",
  price_range: "from-emerald-500/20 to-teal-500/20",
  curated: "from-amber-500/20 to-orange-500/20",
  seasonal: "from-pink-500/20 to-rose-500/20",
  bestseller: "from-purple-500/20 to-violet-500/20",
}

const TYPE_BADGE: Record<string, string> = {
  category: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  price_range: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  curated: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  seasonal: "bg-pink-50 text-pink-700 dark:bg-pink-950 dark:text-pink-400",
  bestseller: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
}

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */

function Skeleton() {
  return (
    <div className="space-y-6 max-w-[1440px] mx-auto w-full animate-pulse">
      <div className="h-8 w-48 rounded bg-muted" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border/80 bg-card shadow-sm p-5 h-[108px]" />
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden h-[220px]" />
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  New Collection Dialog                                              */
/* ------------------------------------------------------------------ */

function NewCollectionDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [collectionType, setCollectionType] = useState("curated")
  const [filterRulesStr, setFilterRulesStr] = useState("{}")
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    let filterRules: Record<string, unknown> = {}
    try { filterRules = JSON.parse(filterRulesStr) } catch { /* use empty */ }

    await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "collections",
        rows: [{
          name: name.trim(),
          description: description.trim() || null,
          collection_type: collectionType,
          filter_rules: filterRules,
          product_count: 0,
          is_active: isActive,
          sort_order: 0,
        }],
      }),
    })

    setSaving(false)
    onCreated()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg border bg-card shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-lg font-semibold">New Collection</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors"><X className="size-4" /></button>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <label className="text-sm font-medium text-foreground">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Collection name" className="mt-1 w-full h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" rows={2} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Type</label>
            <select value={collectionType} onChange={(e) => setCollectionType(e.target.value)} className="mt-1 w-full h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              {COLLECTION_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Filter Rules (JSON)</label>
            <textarea value={filterRulesStr} onChange={(e) => setFilterRulesStr(e.target.value)} rows={3} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsActive(!isActive)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isActive ? "bg-primary" : "bg-muted"}`}>
              <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${isActive ? "translate-x-4" : "translate-x-0.5"}`} />
            </button>
            <span className="text-sm text-muted-foreground">Active</span>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t px-5 py-4">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md border hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving || !name.trim()} className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
            {saving ? "Creating..." : "Create Collection"}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function JSBlueridgeCollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTab, setFilterTab] = useState<FilterTab>("all")
  const [showNewDialog, setShowNewDialog] = useState(false)

  const [totalCount, setTotalCount] = useState(0)
  const [activeCount, setActiveCount] = useState(0)

  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
  const [collectionProducts, setCollectionProducts] = useState<Row[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)

  const [page, setPage] = useState(1)
  const ITEMS_PER_PAGE = 20

  const fetchCollections = async () => {
    setLoading(true)
    const [listRes, totalRes, activeRes] = await Promise.all([
      jsbFetch({ table: "collections", select: "*", order: "sort_order", orderDir: "asc", limit: "2000" }),
      jsbFetch({ table: "collections", count: "true" }),
      jsbFetch({ table: "collections", count: "true", eq: JSON.stringify({ is_active: true }) }),
    ])
    setCollections((listRes.data ?? []) as Collection[])
    setTotalCount((totalRes as any).count ?? 0)
    setActiveCount((activeRes as any).count ?? 0)
    setPage(1)
    setLoading(false)
  }

  useEffect(() => { fetchCollections() }, [])

  const openCollectionModal = useCallback(async (col: Collection) => {
    setSelectedCollection(col)
    setCollectionProducts([])
    setLoadingProducts(true)
    const { data } = await jsbFetch({
      table: "faire_products",
      select: "*",
      limit: "20",
      order: "faire_updated_at",
      orderDir: "desc",
    })
    setCollectionProducts(data ?? [])
    setLoadingProducts(false)
  }, [])

  const filtered = useMemo(() => {
    if (filterTab === "all") return collections
    return collections.filter((c) => c.collection_type === filterTab)
  }, [collections, filterTab])

  const visibleCount = page * ITEMS_PER_PAGE
  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  const totalCollections = totalCount
  const activeCollections = activeCount
  const totalProducts = collections.reduce((s, c) => s + c.product_count, 0)

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "category", label: "Category" },
    { key: "price_range", label: "Price Range" },
    { key: "curated", label: "Curated" },
    { key: "bestseller", label: "Bestseller" },
    { key: "seasonal", label: "Seasonal" },
  ]

  if (loading) return <Skeleton />

  const statCards = [
    { label: "Total Collections", value: String(totalCollections), icon: <Layers className="h-4 w-4" />, bg: "rgba(59,130,246,0.1)", color: "#3B82F6" },
    { label: "Active", value: String(activeCollections), icon: <Sparkles className="h-4 w-4" />, bg: "rgba(16,185,129,0.1)", color: "#10B981" },
    { label: "Products in Collections", value: totalProducts.toLocaleString(), icon: <Package className="h-4 w-4" />, bg: "rgba(245,158,11,0.1)", color: "#F59E0B" },
    { label: "Types", value: String(new Set(collections.map((c) => c.collection_type)).size), icon: <Store className="h-4 w-4" />, bg: "rgba(139,92,246,0.1)", color: "#8B5CF6" },
  ]

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto w-full">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Collections</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">JS Blueridge product collections</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowNewDialog(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="size-3.5" /> New Collection
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
              <p className="text-2xl font-bold font-heading mt-2">{card.value}</p>
            </div>
            <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: card.bg, color: card.color }}>{card.icon}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1">
        {filterTabs.map((t) => (
          <button key={t.key} onClick={() => { setFilterTab(t.key); setPage(1) }} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterTab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-border/80 bg-card shadow-sm p-12 text-center">
          <Layers className="size-10 mx-auto text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">No collections found.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {visible.map((col) => {
              const Icon = TYPE_ICON[col.collection_type] ?? Tag
              const gradient = TYPE_GRADIENT[col.collection_type] ?? "from-zinc-500/20 to-zinc-400/20"
              const badgeCls = TYPE_BADGE[col.collection_type] ?? "bg-zinc-100 text-zinc-600"

              return (
                <div key={col.id} onClick={() => openCollectionModal(col)} className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden hover:shadow-sm cursor-pointer transition-shadow">
                  <div className={`aspect-square w-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                    <Icon className="size-8 text-muted-foreground/40" />
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-semibold truncate">{col.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{col.product_count} product{col.product_count !== 1 ? "s" : ""}</span>
                      <span className={`inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full ${badgeCls}`}>{col.collection_type.replace("_", " ")}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">JS Blueridge</span>
                      <span className={`inline-block w-2 h-2 rounded-full ${col.is_active ? "bg-emerald-500" : "bg-zinc-300"}`} title={col.is_active ? "Active" : "Inactive"} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {hasMore && (
            <div className="flex justify-center pt-4">
              <button onClick={() => setPage((p) => p + 1)} className="px-6 py-2 text-sm font-medium rounded-md border hover:bg-muted transition-colors">
                Show More ({filtered.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </>
      )}

      {showNewDialog && <NewCollectionDialog onClose={() => setShowNewDialog(false)} onCreated={fetchCollections} />}

      {selectedCollection && (() => {
        const col = selectedCollection
        const badgeCls = TYPE_BADGE[col.collection_type] ?? "bg-zinc-100 text-zinc-600"
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedCollection(null)}>
            <div className="w-full max-w-6xl max-h-[85vh] rounded-lg border bg-card shadow-lg flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b px-5 py-4 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <h2 className="text-lg font-semibold truncate">{col.name}</h2>
                  <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${badgeCls}`}>{col.collection_type.replace("_", " ")}</span>
                </div>
                <button onClick={() => setSelectedCollection(null)} className="p-1 rounded hover:bg-muted transition-colors shrink-0"><X className="size-4" /></button>
              </div>
              <div className="px-5 py-3 border-b shrink-0">
                <p className="text-sm text-muted-foreground">{loadingProducts ? "Loading products..." : `${collectionProducts.length} product${collectionProducts.length !== 1 ? "s" : ""}`}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                {loadingProducts ? (
                  <div className="flex items-center justify-center py-16"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
                ) : collectionProducts.length === 0 ? (
                  <div className="text-center py-16"><Package className="size-10 mx-auto text-muted-foreground/40" /><p className="mt-3 text-sm text-muted-foreground">No products found.</p></div>
                ) : (
                  <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {collectionProducts.map((product: Row) => (
                      <div key={product.id} className="group">
                        <div className="aspect-square rounded-md overflow-hidden bg-muted">
                          {product.primary_image_url ? (
                            <img src={product.primary_image_url} alt={product.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Package className="size-6 text-muted-foreground/40" /></div>
                          )}
                        </div>
                        <p className="mt-1.5 text-sm font-medium truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">${((product.wholesale_price_cents ?? 0) / 100).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
