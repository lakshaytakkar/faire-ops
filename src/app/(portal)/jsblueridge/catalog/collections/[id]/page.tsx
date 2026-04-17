"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft, Tag, DollarSign, Star, Leaf, Award, Package, Image as ImageIcon, Edit3, X, Calendar, Loader2, ExternalLink,
} from "lucide-react"

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>

const API = "/api/jsblueridge/data"

async function jsbFetch(params: Record<string, string>): Promise<{ data: Row[]; count?: number }> {
  const sp = new URLSearchParams(params)
  const res = await fetch(`${API}?${sp}`)
  return res.json()
}

interface Collection {
  id: string; name: string; description: string | null; store_id: string; collection_type: string
  filter_rules: Record<string, unknown>; thumbnail_url: string | null; product_count: number
  is_active: boolean; sort_order: number; created_at?: string
}

const TYPE_ICON: Record<string, React.ElementType> = { category: Tag, price_range: DollarSign, curated: Star, seasonal: Leaf, bestseller: Award }
const TYPE_BADGE: Record<string, string> = {
  category: "bg-blue-50 text-blue-700", price_range: "bg-emerald-50 text-emerald-700",
  curated: "bg-amber-50 text-amber-700", seasonal: "bg-pink-50 text-pink-700", bestseller: "bg-purple-50 text-purple-700",
}

function parseCategoryName(cat: string | null): string {
  if (!cat) return "\u2014"
  try { const parsed = JSON.parse(cat); if (parsed?.name) return parsed.name } catch {}
  return cat
}

function fmt(cents: number): string { return `$${(cents / 100).toFixed(2)}` }

function Skeleton() {
  return (<div className="space-y-6 max-w-[1440px] mx-auto w-full animate-pulse"><div className="h-6 w-24 rounded bg-muted" /><div className="h-8 w-64 rounded bg-muted" /><div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2"><div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="rounded-lg border bg-card shadow-sm overflow-hidden h-[220px]" />)}</div></div><div className="space-y-4"><div className="rounded-md border bg-card p-5 h-[300px]" /></div></div></div>)
}

function EditDialog({ collection, onClose, onSaved }: { collection: Collection; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(collection.name); const [description, setDescription] = useState(collection.description ?? "")
  const [isActive, setIsActive] = useState(collection.is_active); const [filterRulesStr, setFilterRulesStr] = useState(JSON.stringify(collection.filter_rules, null, 2))
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    let filterRules: Record<string, unknown> = collection.filter_rules
    try { filterRules = JSON.parse(filterRulesStr) } catch {}
    await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ table: "collections", rows: [{ id: collection.id, name: name.trim(), description: description.trim() || null, is_active: isActive, filter_rules: filterRules }], onConflict: "id" }) })
    setSaving(false); onSaved(); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}><div className="w-full max-w-md rounded-lg border bg-card shadow-lg" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between border-b px-5 py-4"><h2 className="text-lg font-semibold">Edit Collection</h2><button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="size-4" /></button></div>
      <div className="space-y-4 p-5">
        <div><label className="text-sm font-medium">Name</label><input value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full h-9 rounded-md border bg-background px-3 text-sm" /></div>
        <div><label className="text-sm font-medium">Description</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-none" /></div>
        <div><label className="text-sm font-medium">Filter Rules (JSON)</label><textarea value={filterRulesStr} onChange={e => setFilterRulesStr(e.target.value)} rows={4} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm font-mono resize-none" /></div>
        <div className="flex items-center gap-2"><button onClick={() => setIsActive(!isActive)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isActive ? "bg-primary" : "bg-muted"}`}><span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${isActive ? "translate-x-4" : "translate-x-0.5"}`} /></button><span className="text-sm text-muted-foreground">Active</span></div>
      </div>
      <div className="flex justify-end gap-2 border-t px-5 py-4"><button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md border hover:bg-muted">Cancel</button><button onClick={handleSave} disabled={saving || !name.trim()} className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">{saving ? "Saving..." : "Save Changes"}</button></div>
    </div></div>
  )
}

export default function JSBlueridgeCollectionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [collection, setCollection] = useState<Collection | null>(null)
  const [products, setProducts] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Row | null>(null)
  const [generatingThumb, setGeneratingThumb] = useState(false)

  const fetchCollection = async () => {
    const { data } = await jsbFetch({ table: "collections", select: "*", eq: JSON.stringify({ id }), limit: "1" })
    const col = data?.[0] as Collection | null
    setCollection(col)
    return col
  }

  const fetchProducts = async () => {
    const { data } = await jsbFetch({ table: "faire_products", select: "*", order: "faire_updated_at", orderDir: "desc", limit: "50" })
    setProducts(data ?? [])
  }

  useEffect(() => {
    async function load() { setLoading(true); await fetchCollection(); await fetchProducts(); setLoading(false) }
    load()
  }, [id])

  const handleGenerateThumbnail = useCallback(async () => {
    if (!collection || generatingThumb) return; setGeneratingThumb(true)
    try { const res = await fetch("/api/collections/thumbnail", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collection_id: collection.id, name: collection.name, collection_type: collection.collection_type }) }); if (res.ok) { const data = await res.json(); if (data.thumbnail_url) setCollection(prev => prev ? { ...prev, thumbnail_url: data.thumbnail_url } : prev) } } finally { setGeneratingThumb(false) }
  }, [collection, generatingThumb])

  if (loading) return <Skeleton />
  if (!collection) {
    return (<div className="max-w-[1440px] mx-auto w-full py-12 text-center"><p className="text-sm text-muted-foreground">Collection not found.</p><button onClick={() => router.push("/jsblueridge/catalog/collections")} className="mt-4 text-sm text-primary hover:underline">Back to Collections</button></div>)
  }

  const Icon = TYPE_ICON[collection.collection_type] ?? Tag
  const badgeCls = TYPE_BADGE[collection.collection_type] ?? "bg-zinc-100 text-zinc-600"

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto w-full">
      <div>
        <button onClick={() => router.push("/jsblueridge/catalog/collections")} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"><ArrowLeft className="size-3.5" />Collections</button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2"><h1 className="text-2xl font-bold font-heading text-foreground">{collection.name}</h1><span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${badgeCls}`}>{collection.collection_type.replace("_", " ")}</span></div>
            <p className="mt-1 text-sm text-muted-foreground">{products.length} product{products.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowEdit(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md border hover:bg-muted"><Edit3 className="size-3.5" />Edit</button>
            <button onClick={handleGenerateThumbnail} disabled={generatingThumb} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md border hover:bg-muted disabled:opacity-50">{generatingThumb ? <Loader2 className="size-3.5 animate-spin" /> : <ImageIcon className="size-3.5" />}{generatingThumb ? "Generating..." : "Generate Thumbnail"}</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {products.length === 0 ? (
            <div className="rounded-lg border bg-card shadow-sm p-12 text-center"><Package className="size-10 mx-auto text-muted-foreground/40" /><p className="mt-3 text-sm text-muted-foreground">No products match this collection&apos;s filters.</p></div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product: Row) => (
                <div key={product.id} onClick={() => setSelectedProduct(product)} className="rounded-lg border bg-card shadow-sm overflow-hidden hover:shadow-sm cursor-pointer transition-shadow">
                  <div className="aspect-square relative">{product.primary_image_url ? <img src={product.primary_image_url} alt={product.name} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center"><Package className="size-6 text-muted-foreground/40" /></div>}</div>
                  <div className="p-3"><h3 className="text-sm font-medium truncate">{product.name}</h3><p className="text-sm font-semibold mt-1">{fmt(product.wholesale_price_cents ?? 0)}</p><div className="flex items-center gap-1.5 mt-1.5"><span className="inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground truncate max-w-[100px]">{parseCategoryName(product.category)}</span><span className={`inline-block w-2 h-2 rounded-full shrink-0 ${(product.total_inventory ?? 0) === 0 ? "bg-red-500" : (product.total_inventory ?? 0) < 10 ? "bg-amber-500" : "bg-emerald-500"}`} title={`${product.total_inventory ?? 0} in stock`} /></div></div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border bg-card shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-1.5"><Icon className="size-4" />Collection Info</h3>
            <div className="space-y-3">
              <div><p className="text-xs font-medium text-muted-foreground">Name</p><p className="text-sm mt-0.5">{collection.name}</p></div>
              {collection.description && <div><p className="text-xs font-medium text-muted-foreground">Description</p><p className="text-sm mt-0.5">{collection.description}</p></div>}
              <div><p className="text-xs font-medium text-muted-foreground">Type</p><span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 ${badgeCls}`}>{collection.collection_type.replace("_", " ")}</span></div>
              <div><p className="text-xs font-medium text-muted-foreground">Filter Rules</p><pre className="text-xs mt-1 p-2 rounded bg-muted/50 overflow-auto font-mono">{JSON.stringify(collection.filter_rules, null, 2)}</pre></div>
              {collection.created_at && <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Calendar className="size-3" />Created {new Date(collection.created_at).toLocaleDateString()}</div>}
              <div className="flex items-center gap-1.5"><span className={`inline-block w-2 h-2 rounded-full ${collection.is_active ? "bg-emerald-500" : "bg-zinc-300"}`} /><span className="text-sm text-muted-foreground">{collection.is_active ? "Active" : "Inactive"}</span></div>
            </div>
          </div>

          <div className="rounded-lg border bg-card shadow-sm p-5 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-1.5"><ImageIcon className="size-4" />Thumbnail</h3>
            {collection.thumbnail_url ? <img src={collection.thumbnail_url} alt={collection.name} className="w-full h-32 object-cover rounded-md" /> : <p className="text-sm text-muted-foreground">No thumbnail set.</p>}
            <button onClick={handleGenerateThumbnail} disabled={generatingThumb} className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md border hover:bg-muted disabled:opacity-50">{generatingThumb ? <Loader2 className="size-3.5 animate-spin" /> : <ImageIcon className="size-3.5" />}{generatingThumb ? "Generating..." : "Generate Thumbnail"}</button>
          </div>
        </div>
      </div>

      {showEdit && collection && <EditDialog collection={collection} onClose={() => setShowEdit(false)} onSaved={async () => { await fetchCollection(); await fetchProducts() }} />}

      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedProduct(null)}>
          <div className="w-full max-w-lg rounded-lg border bg-card shadow-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-5 py-4"><h2 className="text-lg font-semibold truncate pr-4">{selectedProduct.name}</h2><button onClick={() => setSelectedProduct(null)} className="p-1 rounded hover:bg-muted shrink-0"><X className="size-4" /></button></div>
            <div className="overflow-y-auto max-h-[70vh]">
              {selectedProduct.primary_image_url ? <div className="aspect-square relative w-full"><img src={selectedProduct.primary_image_url} alt={selectedProduct.name} className="w-full h-full object-cover" /></div> : <div className="aspect-square w-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center"><Package className="size-12 text-muted-foreground/40" /></div>}
              <div className="p-5 space-y-3">
                <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{parseCategoryName(selectedProduct.category)}</span>
                <div className="grid grid-cols-2 gap-3"><div><p className="text-xs font-medium text-muted-foreground">Wholesale Price</p><p className="text-sm font-semibold mt-0.5">{fmt(selectedProduct.wholesale_price_cents ?? 0)}</p></div><div><p className="text-xs font-medium text-muted-foreground">Retail Price</p><p className="text-sm font-semibold mt-0.5">{fmt(selectedProduct.retail_price_cents ?? 0)}</p></div></div>
                <div><p className="text-xs font-medium text-muted-foreground">Inventory</p><div className="flex items-center gap-1.5 mt-0.5"><span className={`inline-block w-2 h-2 rounded-full ${(selectedProduct.total_inventory ?? 0) === 0 ? "bg-red-500" : (selectedProduct.total_inventory ?? 0) < 10 ? "bg-amber-500" : "bg-emerald-500"}`} /><span className="text-sm">{(selectedProduct.total_inventory ?? 0) === 0 ? "Out of stock" : `${selectedProduct.total_inventory} in stock`}</span></div></div>
                <div><p className="text-xs font-medium text-muted-foreground">Faire Product ID</p><p className="text-sm mt-0.5 font-mono">{selectedProduct.faire_product_id}</p></div>
              </div>
            </div>
            <div className="border-t px-5 py-4"><a href={`/jsblueridge/catalog/listings/${selectedProduct.faire_product_id}`} className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"><ExternalLink className="size-3.5" />View Listing</a></div>
          </div>
        </div>
      )}
    </div>
  )
}
