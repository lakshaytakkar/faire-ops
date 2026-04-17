"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import Link from "next/link"
import {
  Search,
  Package,
  ClipboardCheck,
  CheckCircle2,
  Rocket,
  ArrowRight,
  ExternalLink,
  ImageIcon,
  AlertTriangle,
  Eye,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>

const API = "/api/jsblueridge/data"

/* ------------------------------------------------------------------ */
/*  Local pipeline types                                               */
/* ------------------------------------------------------------------ */

type PipelineStatus = "sourced" | "pending" | "approved" | "live"

interface PipelineProduct {
  id: string
  name: string
  status: PipelineStatus
  source: string
  cogs: number
  wsPrice: number
  margin: number
  tags: string[]
  notes: string | null
  sourceUrl: string | null
  addedDate: string
  isNew: boolean
}

const COLUMNS: { key: PipelineStatus; label: string }[] = [
  { key: "sourced", label: "Sourced" },
  { key: "pending", label: "Drafting" },
  { key: "approved", label: "Ready to List" },
  { key: "live", label: "Live" },
]

const INITIAL_PIPELINE_PRODUCTS: PipelineProduct[] = [
  { id: "pp1", name: "Boho Rattan Table Lamp", status: "sourced", source: "Minea", cogs: 8.50, wsPrice: 24.00, margin: 64.6, tags: ["home"], notes: null, sourceUrl: "minea.com/product/rattan-lamp", addedDate: "Apr 1, 2026", isNew: true },
  { id: "pp2", name: "Silicone Utensil Set", status: "sourced", source: "AliExpress", cogs: 4.20, wsPrice: 14.00, margin: 70.0, tags: ["kitchen"], notes: null, sourceUrl: null, addedDate: "Mar 30, 2026", isNew: false },
  { id: "pp3", name: "Magnetic Fidget Cube", status: "pending", source: "ToyNetwork", cogs: 3.00, wsPrice: 9.00, margin: 66.7, tags: ["toys"], notes: "Needs images", sourceUrl: "toynetwork.com/fidget", addedDate: "Mar 28, 2026", isNew: false },
  { id: "pp4", name: "Vitamin C Serum", status: "pending", source: "Alibaba", cogs: 2.80, wsPrice: 12.00, margin: 76.7, tags: ["beauty"], notes: null, sourceUrl: null, addedDate: "Mar 27, 2026", isNew: false },
  { id: "pp5", name: "Eco Pet Waste Bags", status: "approved", source: "WonATrading", cogs: 1.50, wsPrice: 6.00, margin: 75.0, tags: ["pet"], notes: null, sourceUrl: null, addedDate: "Mar 25, 2026", isNew: false },
  { id: "pp6", name: "Washi Tape Variety Pack", status: "approved", source: "AliExpress", cogs: 1.80, wsPrice: 7.00, margin: 74.3, tags: ["stationery"], notes: null, sourceUrl: null, addedDate: "Mar 24, 2026", isNew: false },
]

const PQ_LABELS: Record<PipelineStatus, string> = {
  sourced: "Sourced", pending: "Drafting", approved: "Ready to List", live: "Live",
}

const STATUS_BADGE_STYLE: Record<PipelineStatus, string> = {
  sourced: "bg-slate-100 text-slate-700", pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700", live: "bg-blue-100 text-blue-700",
}

const STAT_CARD_META: { key: PipelineStatus; label: string; trend: string; icon: React.ReactNode; bg: string; color: string }[] = [
  { key: "sourced", label: "Sourced", trend: "Awaiting review", icon: <Search className="h-4 w-4" />, bg: "rgba(148,163,184,0.1)", color: "#94A3B8" },
  { key: "pending", label: "Drafting", trend: "In progress", icon: <ClipboardCheck className="h-4 w-4" />, bg: "rgba(245,158,11,0.1)", color: "#F59E0B" },
  { key: "approved", label: "Ready to List", trend: "Awaiting publish", icon: <CheckCircle2 className="h-4 w-4" />, bg: "rgba(16,185,129,0.1)", color: "#10B981" },
  { key: "live", label: "Live", trend: "Currently listed", icon: <Rocket className="h-4 w-4" />, bg: "rgba(59,130,246,0.1)", color: "#3B82F6" },
]

const EMPTY_STATE: Record<PipelineStatus, { icon: React.ReactNode; text: string; cta: string; href?: string }> = {
  sourced: { icon: <Search className="h-8 w-8 text-muted-foreground/40" />, text: "No sourced products", cta: "Run Sourcing", href: "/jsblueridge/catalog/sourcing" },
  pending: { icon: <ClipboardCheck className="h-8 w-8 text-muted-foreground/40" />, text: "No products in drafting", cta: "Submit from Sourced" },
  approved: { icon: <CheckCircle2 className="h-8 w-8 text-muted-foreground/40" />, text: "No products ready", cta: "Approve in Drafting" },
  live: { icon: <Rocket className="h-8 w-8 text-muted-foreground/40" />, text: "No live products yet", cta: "Push from Ready" },
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function JSBlueridgePublishingQueuePage() {
  const [pipelineProducts, setPipelineProducts] = useState<PipelineProduct[]>(INITIAL_PIPELINE_PRODUCTS)

  const moveProduct = useCallback((id: string, newStatus: PipelineStatus) => {
    setPipelineProducts((prev) => prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p)))
  }, [])

  const [liveProducts, setLiveProducts] = useState<Row[]>([])
  const [liveTotalCount, setLiveTotalCount] = useState(0)

  useEffect(() => {
    async function fetchLive() {
      const [listRes, countRes] = await Promise.all([
        fetch(`${API}?${new URLSearchParams({ table: "faire_products", select: "id, name, wholesale_price_cents, retail_price_cents, primary_image_url, category, total_inventory, faire_product_id", order: "faire_updated_at", orderDir: "desc", limit: "10" })}`).then(r => r.json()),
        fetch(`${API}?${new URLSearchParams({ table: "faire_products", count: "true" })}`).then(r => r.json()),
      ])
      setLiveProducts(listRes.data ?? [])
      setLiveTotalCount(countRes.count ?? 0)
    }
    fetchLive()
  }, [])

  const products = pipelineProducts

  const counts: Record<PipelineStatus, number> = useMemo(() => ({
    sourced: products.filter((p) => p.status === "sourced").length,
    pending: products.filter((p) => p.status === "pending").length,
    approved: products.filter((p) => p.status === "approved").length,
    live: liveTotalCount,
  }), [products, liveTotalCount])

  const [selectedProduct, setSelectedProduct] = useState<PipelineProduct | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const [confirmDialog, setConfirmDialog] = useState<{ type: "publish" | "reject"; product: PipelineProduct } | null>(null)

  const openDrawer = useCallback((product: PipelineProduct) => {
    setSelectedProduct(product)
    setDrawerOpen(true)
  }, [])

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">Publishing Queue</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">JS Blueridge product pipeline</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARD_META.map((card) => (
          <div key={card.key} className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
              <p className="text-2xl font-bold font-heading mt-2">{counts[card.key]}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.trend}</p>
            </div>
            <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: card.bg, color: card.color }}>{card.icon}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const isLiveCol = col.key === "live"
          const colProducts = isLiveCol ? [] : products.filter((p) => p.status === col.key)
          const colCount = isLiveCol ? liveTotalCount : colProducts.length
          const empty = EMPTY_STATE[col.key]

          return (
            <div key={col.key} className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/40 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="text-xs font-medium text-muted-foreground tracking-wide uppercase">{PQ_LABELS[col.key]}</h3>
                  <span className="text-xs font-medium rounded-full bg-slate-100 text-slate-600 px-2 py-0.5">{colCount}</span>
                </div>
              </div>
              <div className="p-2 space-y-2 min-h-[250px]">
                {isLiveCol ? (
                  liveProducts.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-10 text-center">{empty.icon}<p className="text-sm text-muted-foreground">{empty.text}</p></div>
                  ) : (
                    liveProducts.map((lp: Row) => (
                      <div key={lp.id} className="rounded-lg border border-border/80 bg-card shadow-sm p-3 space-y-2 hover:shadow-sm transition-shadow">
                        <div className="flex items-center gap-2">
                          {lp.primary_image_url ? (
                            <img src={lp.primary_image_url} alt={lp.name} className="w-8 h-8 rounded object-cover shrink-0" loading="lazy" />
                          ) : (
                            <div className="w-8 h-8 rounded bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shrink-0"><Package className="size-3.5 text-primary/40" /></div>
                          )}
                          <p className="text-sm font-medium truncate flex-1">{lp.name}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-foreground">${((lp.wholesale_price_cents ?? 0) / 100).toFixed(2)}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-xs font-medium rounded-full px-2.5 py-0.5 bg-emerald-100 text-emerald-700 flex items-center gap-1"><Eye className="h-3 w-3" />Live on Faire</span>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  colProducts.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-10 text-center">
                      {empty.icon}
                      <p className="text-sm text-muted-foreground">{empty.text}</p>
                      {empty.href ? (
                        <Link href={empty.href}><Button variant="ghost" size="sm" className="h-7 text-xs gap-1">{empty.cta} <ArrowRight className="h-3 w-3" /></Button></Link>
                      ) : (
                        <p className="text-xs text-muted-foreground/60">{empty.cta}</p>
                      )}
                    </div>
                  ) : (
                    colProducts.map((product) => (
                      <div key={product.id} onClick={() => openDrawer(product)} className="rounded-lg border border-border/80 bg-card shadow-sm p-3 space-y-2 hover:shadow-sm cursor-pointer transition-shadow">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shrink-0"><Package className="size-3.5 text-primary/40" /></div>
                          <p className="text-sm font-medium truncate flex-1">{product.name}</p>
                          {product.isNew && <span className="text-xs font-medium rounded-full px-2 py-0.5 bg-blue-100 text-blue-700 animate-pulse shrink-0">New</span>}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium rounded-full px-2 py-0.5 bg-slate-100 text-slate-600">{product.source}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-center">
                          <div><p className="text-xs text-muted-foreground">COGS</p><p className="text-xs font-medium">${product.cogs.toFixed(2)}</p></div>
                          <div><p className="text-xs text-muted-foreground">WS Price</p><p className="text-xs font-medium">${product.wsPrice.toFixed(2)}</p></div>
                          <div><p className="text-xs text-muted-foreground">Margin</p><p className="text-xs font-medium">{product.margin}%</p></div>
                        </div>
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {product.status === "sourced" && (
                            <Button size="sm" className="h-7 gap-1.5 text-xs flex-1" onClick={() => moveProduct(product.id, "pending")}><ArrowRight className="h-3 w-3" />Submit for Review</Button>
                          )}
                          {product.status === "pending" && (
                            <Button size="sm" className="h-7 gap-1.5 text-xs flex-1" onClick={() => moveProduct(product.id, "approved")}><CheckCircle2 className="h-3 w-3" />Approve</Button>
                          )}
                          {product.status === "approved" && (
                            <Button size="sm" className="h-7 gap-1.5 text-xs flex-1" onClick={() => moveProduct(product.id, "live")}><Rocket className="h-3 w-3" />Push to Faire</Button>
                          )}
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>
            </div>
          )
        })}
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-[400px] sm:max-w-[400px] overflow-y-auto">
          {selectedProduct && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <SheetTitle className="flex-1 truncate">{selectedProduct.name}</SheetTitle>
                  <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${STATUS_BADGE_STYLE[selectedProduct.status]}`}>{PQ_LABELS[selectedProduct.status]}</span>
                </div>
                <SheetDescription>Added {selectedProduct.addedDate}</SheetDescription>
              </SheetHeader>
              <div className="px-4 space-y-5 pb-4">
                <div className="space-y-3">
                  <div><label className="text-xs font-medium text-muted-foreground">Source</label><p className="text-sm mt-1">{selectedProduct.source}</p></div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className="text-xs font-medium text-muted-foreground">COGS</label><p className="text-sm font-medium mt-1">${selectedProduct.cogs.toFixed(2)}</p></div>
                    <div><label className="text-xs font-medium text-muted-foreground">WS Price</label><p className="text-sm font-medium mt-1">${selectedProduct.wsPrice.toFixed(2)}</p></div>
                    <div><label className="text-xs font-medium text-muted-foreground">Margin</label><p className="text-sm font-medium mt-1">{selectedProduct.margin}%</p></div>
                  </div>
                  {selectedProduct.notes && <div><label className="text-xs font-medium text-muted-foreground">Notes</label><p className="text-sm mt-1 text-muted-foreground">{selectedProduct.notes}</p></div>}
                </div>
                <div className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><ImageIcon className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">Images</span></div>
                    <Link href="/jsblueridge/catalog/image-studio"><Button variant="outline" size="sm" className="h-7 text-xs gap-1.5"><ImageIcon className="h-3 w-3" />Open Image Studio</Button></Link>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
