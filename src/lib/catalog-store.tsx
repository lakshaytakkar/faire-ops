"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import type { BrandId } from "@/lib/data"
import { PIPELINE_PRODUCTS, SCRAPER_PRODUCTS } from "@/lib/pipeline-data"
import type { PipelineProduct, ScraperProduct } from "@/lib/pipeline-data"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CatalogProduct {
  id: string
  name: string
  sku: string
  brand: BrandId
  category: string
  wholesalePrice: number
  msrp: number
  cogs: number
  stock: number
  minStock: number
  maxStock: number
  status: "active" | "draft" | "out_of_stock"
  imageCount: number
  lastRestocked: string
  faireMarkup: number
  createdAt: string
}

export interface StockAdjustment {
  id: string
  productId: string
  change: number
  reason: string
  notes: string
  date: string
  by: string
}

export interface PriceChange {
  id: string
  productId: string
  field: string
  oldValue: number
  newValue: number
  reason: string
  date: string
}

export type ToastMessage = {
  id: string
  message: string
  link?: string
  linkLabel?: string
  type: "success" | "info" | "warning" | "error"
}

/* ------------------------------------------------------------------ */
/*  Initial Data                                                       */
/* ------------------------------------------------------------------ */

const INITIAL_PRODUCTS: CatalogProduct[] = [
  { id: "cp-01", name: "3D LED Butterfly Wall Lights", sku: "SKU-BA-001", brand: "b1", category: "Home Decor", wholesalePrice: 8.99, msrp: 19.99, cogs: 3.60, stock: 142, minStock: 20, maxStock: 500, status: "active", imageCount: 4, lastRestocked: "Mar 28, 2026", faireMarkup: 1.22, createdAt: "Jan 15, 2026" },
  { id: "cp-02", name: "Crystal Deer Ornament 15cm", sku: "SKU-BA-002", brand: "b1", category: "Home Decor", wholesalePrice: 12.49, msrp: 27.99, cogs: 5.00, stock: 86, minStock: 15, maxStock: 300, status: "active", imageCount: 3, lastRestocked: "Mar 25, 2026", faireMarkup: 1.24, createdAt: "Jan 20, 2026" },
  { id: "cp-03", name: "Constellation Star Map Print 12x16", sku: "SKU-LG-001", brand: "b2", category: "Gifts & Novelty", wholesalePrice: 7.99, msrp: 18.00, cogs: 3.20, stock: 210, minStock: 30, maxStock: 600, status: "active", imageCount: 5, lastRestocked: "Mar 30, 2026", faireMarkup: 1.25, createdAt: "Feb 1, 2026" },
  { id: "cp-04", name: "Lunar Phase Wall Calendar", sku: "SKU-LG-002", brand: "b2", category: "Gifts & Novelty", wholesalePrice: 12.99, msrp: 28.00, cogs: 5.20, stock: 54, minStock: 10, maxStock: 200, status: "active", imageCount: 3, lastRestocked: "Mar 20, 2026", faireMarkup: 1.15, createdAt: "Feb 5, 2026" },
  { id: "cp-05", name: "Felt Ball Wreath Colorful Boho 14in", sku: "SKU-LG-003", brand: "b2", category: "Gifts & Novelty", wholesalePrice: 11.50, msrp: 25.99, cogs: 4.60, stock: 0, minStock: 10, maxStock: 150, status: "out_of_stock", imageCount: 2, lastRestocked: "Feb 15, 2026", faireMarkup: 1.26, createdAt: "Feb 10, 2026" },
  { id: "cp-06", name: "Glow-in-Dark Dinosaur Toy Set 12pc", sku: "SKU-TN-001", brand: "b3", category: "Toys & Games", wholesalePrice: 12.99, msrp: 29.99, cogs: 5.20, stock: 318, minStock: 50, maxStock: 800, status: "active", imageCount: 6, lastRestocked: "Apr 1, 2026", faireMarkup: 1.31, createdAt: "Feb 15, 2026" },
  { id: "cp-07", name: "Magnetic Puzzle Tiles 100pc", sku: "SKU-TN-002", brand: "b3", category: "Toys & Games", wholesalePrice: 18.50, msrp: 39.99, cogs: 7.40, stock: 7, minStock: 20, maxStock: 400, status: "active", imageCount: 4, lastRestocked: "Mar 10, 2026", faireMarkup: 1.16, createdAt: "Feb 20, 2026" },
  { id: "cp-08", name: "Magnetic Wooden Building Blocks", sku: "SKU-TN-003", brand: "b3", category: "Toys & Games", wholesalePrice: 9.40, msrp: 21.99, cogs: 3.76, stock: 163, minStock: 25, maxStock: 500, status: "active", imageCount: 3, lastRestocked: "Mar 28, 2026", faireMarkup: 1.34, createdAt: "Mar 1, 2026" },
  { id: "cp-09", name: "Macrame Wall Art Boho 24in", sku: "SKU-BD-001", brand: "b4", category: "Home & Garden", wholesalePrice: 15.99, msrp: 34.99, cogs: 6.40, stock: 91, minStock: 15, maxStock: 250, status: "active", imageCount: 5, lastRestocked: "Mar 22, 2026", faireMarkup: 1.19, createdAt: "Mar 5, 2026" },
  { id: "cp-10", name: "Balloon Garland Kit 100pc Rose Gold", sku: "SKU-SN-001", brand: "b5", category: "Party & Events", wholesalePrice: 22.99, msrp: 49.99, cogs: 9.20, stock: 45, minStock: 10, maxStock: 200, status: "active", imageCount: 4, lastRestocked: "Mar 18, 2026", faireMarkup: 1.17, createdAt: "Mar 8, 2026" },
  { id: "cp-11", name: "Balloon Arch Kit 40pc Assorted", sku: "SKU-SN-002", brand: "b5", category: "Party & Events", wholesalePrice: 14.50, msrp: 32.00, cogs: 5.80, stock: 120, minStock: 20, maxStock: 400, status: "active", imageCount: 3, lastRestocked: "Mar 25, 2026", faireMarkup: 1.21, createdAt: "Mar 10, 2026" },
  { id: "cp-12", name: "Bamboo Aromatherapy Diffuser", sku: "SKU-CB-001", brand: "b6", category: "Bedding & Bath", wholesalePrice: 24.99, msrp: 54.99, cogs: 10.00, stock: 67, minStock: 10, maxStock: 200, status: "active", imageCount: 5, lastRestocked: "Mar 20, 2026", faireMarkup: 1.20, createdAt: "Mar 12, 2026" },
  { id: "cp-13", name: "Cotton Rope Basket 3-Piece Set", sku: "SKU-CB-002", brand: "b6", category: "Bedding & Bath", wholesalePrice: 12.00, msrp: 28.00, cogs: 4.80, stock: 0, minStock: 15, maxStock: 300, status: "out_of_stock", imageCount: 2, lastRestocked: "Feb 28, 2026", faireMarkup: 1.33, createdAt: "Mar 15, 2026" },
  { id: "cp-14", name: "Mini Wool Penguin Plush", sku: "SKU-BA-003", brand: "b1", category: "Home Decor", wholesalePrice: 6.99, msrp: 15.99, cogs: 2.80, stock: 230, minStock: 40, maxStock: 600, status: "active", imageCount: 4, lastRestocked: "Apr 1, 2026", faireMarkup: 1.29, createdAt: "Mar 18, 2026" },
  { id: "cp-15", name: "LED Flameless Candle Set 3pc", sku: "SKU-BD-002", brand: "b4", category: "Home & Garden", wholesalePrice: 11.99, msrp: 26.99, cogs: 4.80, stock: 5, minStock: 15, maxStock: 250, status: "draft", imageCount: 1, lastRestocked: "Mar 15, 2026", faireMarkup: 1.25, createdAt: "Mar 20, 2026" },
]

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

interface CatalogStoreValue {
  // Data
  products: CatalogProduct[]
  pipelineProducts: PipelineProduct[]
  scraperProducts: ScraperProduct[]
  stockAdjustments: StockAdjustment[]
  priceChanges: PriceChange[]
  toasts: ToastMessage[]

  // Product CRUD
  addProduct: (product: Omit<CatalogProduct, "id" | "createdAt">) => void
  updateProduct: (id: string, updates: Partial<CatalogProduct>) => void
  deleteProduct: (id: string) => void

  // Pipeline
  movePipelineProduct: (id: string, newStatus: PipelineProduct["status"]) => void
  queueScraperProduct: (id: string) => void
  queuedIds: Set<string>

  // Inventory
  adjustStock: (productId: string, change: number, reason: string, notes: string) => void

  // Pricing
  updatePrice: (productId: string, field: string, oldValue: number, newValue: number, reason: string) => void

  // Toasts
  addToast: (message: string, type?: ToastMessage["type"], link?: string, linkLabel?: string) => void
  dismissToast: (id: string) => void
}

const CatalogStoreContext = createContext<CatalogStoreValue>(null as unknown as CatalogStoreValue)

export function CatalogStoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<CatalogProduct[]>(INITIAL_PRODUCTS)
  const [pipelineProducts, setPipelineProducts] = useState<PipelineProduct[]>(PIPELINE_PRODUCTS)
  const [scraperProducts] = useState<ScraperProduct[]>(SCRAPER_PRODUCTS)
  const [queuedIds, setQueuedIds] = useState<Set<string>>(new Set())
  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustment[]>([])
  const [priceChanges, setPriceChanges] = useState<PriceChange[]>([])
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = useCallback((message: string, type: ToastMessage["type"] = "success", link?: string, linkLabel?: string) => {
    const id = Date.now().toString()
    setToasts((prev) => [...prev, { id, message, type, link, linkLabel }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addProduct = useCallback((product: Omit<CatalogProduct, "id" | "createdAt">) => {
    const newProduct: CatalogProduct = {
      ...product,
      id: `cp-${Date.now()}`,
      createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    }
    setProducts((prev) => [newProduct, ...prev])
    addToast(`Product "${product.name}" added`, "success", "/catalog/listings", "View")
  }, [addToast])

  const updateProduct = useCallback((id: string, updates: Partial<CatalogProduct>) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)))
    addToast("Product updated", "success")
  }, [addToast])

  const deleteProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id))
    addToast("Product deleted", "info")
  }, [addToast])

  const movePipelineProduct = useCallback((id: string, newStatus: PipelineProduct["status"]) => {
    setPipelineProducts((prev) => prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p)))
    if (newStatus === "live") {
      addToast("Product is now live on Faire!", "success", "/catalog/listings", "View in Listings")
    }
  }, [addToast])

  const queueScraperProduct = useCallback((id: string) => {
    setQueuedIds((prev) => new Set(prev).add(id))
    addToast("Added to Publishing Queue", "success", "/catalog/publishing-queue", "View Queue")
  }, [addToast])

  const adjustStock = useCallback((productId: string, change: number, reason: string, notes: string) => {
    setProducts((prev) => prev.map((p) => {
      if (p.id !== productId) return p
      const newStock = Math.max(0, p.stock + change)
      return { ...p, stock: newStock, status: newStock === 0 ? "out_of_stock" : p.status === "out_of_stock" && newStock > 0 ? "active" : p.status }
    }))
    const adj: StockAdjustment = {
      id: `sa-${Date.now()}`,
      productId,
      change,
      reason,
      notes,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      by: "Lakshay",
    }
    setStockAdjustments((prev) => [adj, ...prev])
    addToast(`Stock ${change > 0 ? "+" : ""}${change} — ${reason}`, change > 0 ? "success" : "warning")
  }, [addToast])

  const updatePrice = useCallback((productId: string, field: string, oldValue: number, newValue: number, reason: string) => {
    const change: PriceChange = {
      id: `pc-${Date.now()}`,
      productId,
      field,
      oldValue,
      newValue,
      reason,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    }
    setPriceChanges((prev) => [change, ...prev])
    addToast(`${field} updated: $${oldValue.toFixed(2)} → $${newValue.toFixed(2)}`, "success")
  }, [addToast])

  return (
    <CatalogStoreContext.Provider
      value={{
        products, pipelineProducts, scraperProducts, stockAdjustments, priceChanges, toasts,
        addProduct, updateProduct, deleteProduct,
        movePipelineProduct, queueScraperProduct, queuedIds,
        adjustStock, updatePrice,
        addToast, dismissToast,
      }}
    >
      {children}
      {/* Toast Container */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-md shadow-lg text-sm font-medium animate-in slide-in-from-bottom-2 ${
                toast.type === "success" ? "bg-emerald-600 text-white" :
                toast.type === "warning" ? "bg-amber-600 text-white" :
                toast.type === "error" ? "bg-red-600 text-white" :
                "bg-blue-600 text-white"
              }`}
            >
              <span>{toast.message}</span>
              {toast.link && (
                <a href={toast.link} className="underline text-white/80 hover:text-white text-xs">
                  {toast.linkLabel ?? "View"}
                </a>
              )}
              <button onClick={() => dismissToast(toast.id)} className="ml-2 text-white/60 hover:text-white text-xs">×</button>
            </div>
          ))}
        </div>
      )}
    </CatalogStoreContext.Provider>
  )
}

export function useCatalogStore() {
  const ctx = useContext(CatalogStoreContext)
  if (!ctx) throw new Error("useCatalogStore must be used within CatalogStoreProvider")
  return ctx
}
