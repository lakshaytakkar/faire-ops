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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { useBrandFilter } from "@/lib/brand-filter-context"
import { supabaseB2B, type FaireProduct } from "@/lib/supabase"

/* ------------------------------------------------------------------ */
/*  Local pipeline types                                               */
/* ------------------------------------------------------------------ */

type PipelineStatus = "sourced" | "pending" | "approved" | "live"

interface PipelineProduct {
  id: string
  name: string
  status: PipelineStatus
  brand: string
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

/* ------------------------------------------------------------------ */
/*  Column definitions                                                 */
/* ------------------------------------------------------------------ */

const COLUMNS: { key: PipelineStatus; label: string }[] = [
  { key: "sourced", label: "Sourced" },
  { key: "pending", label: "Drafting" },
  { key: "approved", label: "Ready to List" },
  { key: "live", label: "Live" },
]

/* ------------------------------------------------------------------ */
/*  Mock pipeline products (local state, no external imports)          */
/* ------------------------------------------------------------------ */

const INITIAL_PIPELINE_PRODUCTS: PipelineProduct[] = [
  { id: "pp1", name: "Boho Rattan Table Lamp", status: "sourced", brand: "", source: "Minea", cogs: 8.50, wsPrice: 24.00, margin: 64.6, tags: ["home"], notes: null, sourceUrl: "minea.com/product/rattan-lamp", addedDate: "Apr 1, 2026", isNew: true },
  { id: "pp2", name: "Silicone Utensil Set", status: "sourced", brand: "", source: "AliExpress", cogs: 4.20, wsPrice: 14.00, margin: 70.0, tags: ["kitchen"], notes: null, sourceUrl: null, addedDate: "Mar 30, 2026", isNew: false },
  { id: "pp3", name: "Magnetic Fidget Cube", status: "pending", brand: "", source: "ToyNetwork", cogs: 3.00, wsPrice: 9.00, margin: 66.7, tags: ["toys"], notes: "Needs images", sourceUrl: "toynetwork.com/fidget", addedDate: "Mar 28, 2026", isNew: false },
  { id: "pp4", name: "Vitamin C Serum", status: "pending", brand: "", source: "Alibaba", cogs: 2.80, wsPrice: 12.00, margin: 76.7, tags: ["beauty"], notes: null, sourceUrl: null, addedDate: "Mar 27, 2026", isNew: false },
  { id: "pp5", name: "Eco Pet Waste Bags", status: "approved", brand: "", source: "WonATrading", cogs: 1.50, wsPrice: 6.00, margin: 75.0, tags: ["pet"], notes: null, sourceUrl: null, addedDate: "Mar 25, 2026", isNew: false },
  { id: "pp6", name: "Washi Tape Variety Pack", status: "approved", brand: "", source: "AliExpress", cogs: 1.80, wsPrice: 7.00, margin: 74.3, tags: ["stationery"], notes: null, sourceUrl: null, addedDate: "Mar 24, 2026", isNew: false },
]

/* ------------------------------------------------------------------ */
/*  Column label mapping                                               */
/* ------------------------------------------------------------------ */

const PQ_LABELS: Record<PipelineStatus, string> = {
  sourced: "Sourced",
  pending: "Drafting",
  approved: "Ready to List",
  live: "Live",
}

/* ------------------------------------------------------------------ */
/*  Simulated image counts                                             */
/* ------------------------------------------------------------------ */

const IMAGE_COUNTS: Record<string, number> = {
  pp1: 3,
  pp2: 0,
  pp3: 2,
  pp4: 5,
  pp5: 4,
  pp6: 0,
  pp7: 6,
}

function getImageCount(id: string): number {
  return IMAGE_COUNTS[id] ?? 0
}

/* ------------------------------------------------------------------ */
/*  Icons & Colors per status                                         */
/* ------------------------------------------------------------------ */

const STATUS_ICONS: Record<PipelineStatus, React.ReactNode> = {
  sourced: <Search className="h-4 w-4" />,
  pending: <ClipboardCheck className="h-4 w-4" />,
  approved: <CheckCircle2 className="h-4 w-4" />,
  live: <Rocket className="h-4 w-4" />,
}

const STATUS_ICON_BG: Record<PipelineStatus, string> = {
  sourced: "bg-slate-100 text-slate-600",
  pending: "bg-amber-100 text-amber-600",
  approved: "bg-emerald-100 text-emerald-600",
  live: "bg-blue-100 text-blue-600",
}

const STATUS_BADGE_STYLE: Record<PipelineStatus, string> = {
  sourced: "bg-slate-100 text-slate-700",
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  live: "bg-blue-100 text-blue-700",
}

/* ------------------------------------------------------------------ */
/*  Stat card config                                                   */
/* ------------------------------------------------------------------ */

const STAT_CARD_META: {
  key: PipelineStatus
  label: string
  trend: string
  icon: React.ReactNode
  bg: string
  color: string
}[] = [
  {
    key: "sourced",
    label: "Sourced",
    trend: "Awaiting review",
    icon: <Search className="h-4 w-4" />,
    bg: "rgba(148,163,184,0.1)",
    color: "#94A3B8",
  },
  {
    key: "pending",
    label: "Drafting",
    trend: "In progress",
    icon: <ClipboardCheck className="h-4 w-4" />,
    bg: "rgba(245,158,11,0.1)",
    color: "#F59E0B",
  },
  {
    key: "approved",
    label: "Ready to List",
    trend: "Awaiting publish",
    icon: <CheckCircle2 className="h-4 w-4" />,
    bg: "rgba(16,185,129,0.1)",
    color: "#10B981",
  },
  {
    key: "live",
    label: "Live",
    trend: "Currently listed",
    icon: <Rocket className="h-4 w-4" />,
    bg: "rgba(59,130,246,0.1)",
    color: "#3B82F6",
  },
]

/* ------------------------------------------------------------------ */
/*  Empty-state CTAs per column                                       */
/* ------------------------------------------------------------------ */

const EMPTY_STATE: Record<
  PipelineStatus,
  { icon: React.ReactNode; text: string; cta: string; href?: string }
> = {
  sourced: {
    icon: <Search className="h-8 w-8 text-muted-foreground/40" />,
    text: "No sourced products",
    cta: "Run Sourcing",
    href: "/catalog/sourcing",
  },
  pending: {
    icon: <ClipboardCheck className="h-8 w-8 text-muted-foreground/40" />,
    text: "No products in drafting",
    cta: "Submit from Sourced",
  },
  approved: {
    icon: <CheckCircle2 className="h-8 w-8 text-muted-foreground/40" />,
    text: "No products ready",
    cta: "Approve in Drafting",
  },
  live: {
    icon: <Rocket className="h-8 w-8 text-muted-foreground/40" />,
    text: "No live products yet",
    cta: "Push from Ready",
  },
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function PublishingQueuePage() {
  const { activeBrand, stores } = useBrandFilter()

  // Local pipeline state
  const [pipelineProducts, setPipelineProducts] = useState<PipelineProduct[]>(INITIAL_PIPELINE_PRODUCTS)

  const moveProduct = useCallback((id: string, newStatus: PipelineStatus) => {
    setPipelineProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p)),
    )
  }, [])

  // ---- Live products from Supabase ----
  const [liveProducts, setLiveProducts] = useState<FaireProduct[]>([])
  // Real live count — `liveProducts` is intentionally capped at 10 for display
  // in the Kanban column, so we need a separate count query for the stat card.
  const [liveTotalCount, setLiveTotalCount] = useState(0)

  useEffect(() => {
    async function fetchLive() {
      let listQuery = supabaseB2B
        .from("faire_products")
        .select("id, name, wholesale_price_cents, retail_price_cents, primary_image_url, category, store_id, total_inventory, faire_product_id")
        .order("faire_updated_at", { ascending: false })
        .limit(10)

      let countQuery = supabaseB2B
        .from("faire_products")
        .select("*", { count: "exact", head: true })

      if (activeBrand !== "all") {
        listQuery = listQuery.eq("store_id", activeBrand)
        countQuery = countQuery.eq("store_id", activeBrand)
      }

      const [{ data }, { count }] = await Promise.all([listQuery, countQuery])
      setLiveProducts((data ?? []) as FaireProduct[])
      setLiveTotalCount(count ?? 0)
    }
    fetchLive()
  }, [activeBrand])

  // ---- Filtered products ----
  const products = useMemo(
    () =>
      activeBrand === "all"
        ? pipelineProducts
        : pipelineProducts.filter((p) => p.brand === activeBrand),
    [pipelineProducts, activeBrand],
  )

  const counts: Record<PipelineStatus, number> = useMemo(
    () => ({
      sourced: products.filter((p) => p.status === "sourced").length,
      pending: products.filter((p) => p.status === "pending").length,
      approved: products.filter((p) => p.status === "approved").length,
      // Use the server-side count; `liveProducts` is capped at 10.
      live: liveTotalCount,
    }),
    [products, liveTotalCount],
  )

  // ---- Avg margin per column ----
  const avgMargins: Record<PipelineStatus, number> = useMemo(() => {
    const result: Record<PipelineStatus, number> = {
      sourced: 0,
      pending: 0,
      approved: 0,
      live: 0,
    }
    for (const key of ["sourced", "pending", "approved", "live"] as PipelineStatus[]) {
      const col = products.filter((p) => p.status === key)
      if (col.length > 0) {
        result[key] = Math.round(col.reduce((s, p) => s + p.margin, 0) / col.length)
      }
    }
    return result
  }, [products])

  // ---- Drawer state ----
  const [selectedProduct, setSelectedProduct] = useState<PipelineProduct | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // ---- Drawer edit fields ----
  const [editName, setEditName] = useState("")
  const [editCogs, setEditCogs] = useState("")
  const [editWsPrice, setEditWsPrice] = useState("")
  const [editBrand, setEditBrand] = useState("")
  const [editTags, setEditTags] = useState("")
  const [editNotes, setEditNotes] = useState("")
  const [approvalNotes, setApprovalNotes] = useState("")

  // ---- Confirm dialog state ----
  const [confirmDialog, setConfirmDialog] = useState<{
    type: "publish" | "reject"
    product: PipelineProduct
  } | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  // ---- Open drawer ----
  const openDrawer = useCallback((product: PipelineProduct) => {
    setSelectedProduct(product)
    setEditName(product.name)
    setEditCogs(product.cogs.toFixed(2))
    setEditWsPrice(product.wsPrice.toFixed(2))
    setEditBrand(product.brand ?? "")
    setEditTags(product.tags.join(", "))
    setEditNotes(product.notes ?? "")
    setApprovalNotes("")
    setDrawerOpen(true)
  }, [])

  // ---- Move actions ----
  const handleSubmitForReview = useCallback(
    (product: PipelineProduct) => {
      moveProduct(product.id, "pending")
    },
    [moveProduct],
  )

  const handleApprove = useCallback(
    (product: PipelineProduct) => {
      moveProduct(product.id, "approved")
    },
    [moveProduct],
  )

  const handlePublishClick = useCallback((product: PipelineProduct) => {
    setConfirmDialog({ type: "publish", product })
  }, [])

  const handleConfirmPublish = useCallback(() => {
    if (!confirmDialog || confirmDialog.type !== "publish") return
    moveProduct(confirmDialog.product.id, "live")
    setConfirmDialog(null)
    setDrawerOpen(false)
  }, [confirmDialog, moveProduct])

  const handleRejectClick = useCallback((product: PipelineProduct) => {
    setRejectReason("")
    setConfirmDialog({ type: "reject", product })
  }, [])

  const handleConfirmReject = useCallback(() => {
    if (!confirmDialog || confirmDialog.type !== "reject") return
    moveProduct(confirmDialog.product.id, "sourced")
    setConfirmDialog(null)
    setDrawerOpen(false)
  }, [confirmDialog, moveProduct])

  // ---- Drawer primary action ----
  const handleDrawerAction = useCallback(() => {
    if (!selectedProduct) return
    switch (selectedProduct.status) {
      case "sourced":
        handleSubmitForReview(selectedProduct)
        setDrawerOpen(false)
        break
      case "pending":
        handleApprove(selectedProduct)
        setDrawerOpen(false)
        break
      case "approved":
        handlePublishClick(selectedProduct)
        break
    }
  }, [selectedProduct, handleSubmitForReview, handleApprove, handlePublishClick])

  // Helper to get brand info from stores
  const getBrandFromStores = useCallback(
    (brandId: string) => stores.find((s) => s.id === brandId) ?? null,
    [stores],
  )

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto w-full">
      {/* ============================================================ */}
      {/* Page Header                                                   */}
      {/* ============================================================ */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">
          Publishing Queue
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Track products from discovery to listing
        </p>
      </div>

      {/* ============================================================ */}
      {/* Stat Cards                                                    */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARD_META.map((card) => (
          <div
            key={card.key}
            className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between"
          >
            <div>
              <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
              <p className="text-2xl font-bold font-heading mt-2">{counts[card.key]}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.trend}</p>
            </div>
            <div
              className="h-9 w-9 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: card.bg, color: card.color }}
            >
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {/* ============================================================ */}
      {/* Kanban Board                                                  */}
      {/* ============================================================ */}
      <div className="grid grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const isLiveCol = col.key === "live"
          const colProducts = isLiveCol ? [] : products.filter((p) => p.status === col.key)
          const colCount = isLiveCol ? liveTotalCount : colProducts.length
          const empty = EMPTY_STATE[col.key]

          return (
            <div key={col.key} className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
              {/* Column Header */}
              <div className="px-4 py-3 border-b bg-muted/40 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
                    {PQ_LABELS[col.key]}
                  </h3>
                  <span className="text-xs font-medium rounded-full bg-slate-100 text-slate-600 px-2 py-0.5">
                    {colCount}
                  </span>
                </div>
                {!isLiveCol && colProducts.length > 0 && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    avg {avgMargins[col.key]}%
                  </span>
                )}
              </div>

              {/* Column Body */}
              <div className="p-2 space-y-2 min-h-[250px]">
                {isLiveCol ? (
                  /* ---- Live column: real Supabase products ---- */
                  liveProducts.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-10 text-center">
                      {empty.icon}
                      <p className="text-sm text-muted-foreground">{empty.text}</p>
                      <p className="text-xs text-muted-foreground/60">{empty.cta}</p>
                    </div>
                  ) : (
                    liveProducts.map((lp) => {
                      const store = stores.find((s) => s.id === lp.store_id)
                      return (
                        <div
                          key={lp.id}
                          className="rounded-lg border border-border/80 bg-card shadow-sm p-3 space-y-2 hover:shadow-sm transition-shadow"
                        >
                          {/* Row 1: Thumbnail + Name */}
                          <div className="flex items-center gap-2">
                            {lp.primary_image_url ? (
                              <img
                                src={lp.primary_image_url}
                                alt={lp.name}
                                className="w-8 h-8 rounded object-cover shrink-0"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shrink-0">
                                <Package className="size-3.5 text-primary/40" />
                              </div>
                            )}
                            <p className="text-sm font-medium truncate flex-1">{lp.name}</p>
                          </div>

                          {/* Row 2: Price + Brand dot */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-foreground">
                              ${(lp.wholesale_price_cents / 100).toFixed(2)}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {store && (
                                <>
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: store.color }}
                                  />
                                  <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                                    {store.name}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Row 3: Live badge */}
                          <div className="flex items-center">
                            <span className="text-xs font-medium rounded-full px-2.5 py-0.5 bg-emerald-100 text-emerald-700 flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              Live on Faire
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )
                ) : (
                  /* ---- Non-live columns: pipeline products ---- */
                  colProducts.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-10 text-center">
                      {empty.icon}
                      <p className="text-sm text-muted-foreground">{empty.text}</p>
                      {empty.href ? (
                        <Link href={empty.href}>
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                            {empty.cta} <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      ) : (
                        <p className="text-xs text-muted-foreground/60">{empty.cta}</p>
                      )}
                    </div>
                  ) : (
                    colProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        brandInfo={getBrandFromStores(product.brand)}
                        onClick={() => openDrawer(product)}
                        onSubmitForReview={() => handleSubmitForReview(product)}
                        onApprove={() => handleApprove(product)}
                        onReject={() => handleRejectClick(product)}
                        onPublish={() => handlePublishClick(product)}
                      />
                    ))
                  )
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ============================================================ */}
      {/* Product Detail Drawer                                         */}
      {/* ============================================================ */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-[400px] sm:max-w-[400px] overflow-y-auto">
          {selectedProduct && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <SheetTitle className="flex-1 truncate">{selectedProduct.name}</SheetTitle>
                  <span
                    className={`text-xs font-medium rounded-full px-2 py-0.5 ${STATUS_BADGE_STYLE[selectedProduct.status]}`}
                  >
                    {PQ_LABELS[selectedProduct.status]}
                  </span>
                </div>
                <SheetDescription>Added {selectedProduct.addedDate}</SheetDescription>
              </SheetHeader>

              <div className="px-4 space-y-5 pb-4">
                {/* Editable Fields */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Name</label>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">COGS ($)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editCogs}
                        onChange={(e) => setEditCogs(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">WS Price ($)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editWsPrice}
                        onChange={(e) => setEditWsPrice(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Brand</label>
                    <Select
                      value={editBrand}
                      onValueChange={(val) => setEditBrand(val ?? "")}
                    >
                      <SelectTrigger className="mt-1 w-full">
                        <SelectValue placeholder="Select brand..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No brand</SelectItem>
                        {stores.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Tags (comma separated)</label>
                    <Input
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      placeholder="e.g. Home, Trending"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Notes</label>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                      placeholder="Product notes..."
                    />
                  </div>
                </div>

                {/* Source URL */}
                {selectedProduct.sourceUrl && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Source URL</label>
                    <a
                      href={`https://${selectedProduct.sourceUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      {selectedProduct.sourceUrl}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {/* Image Section */}
                <div className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {getImageCount(selectedProduct.id)} image{getImageCount(selectedProduct.id) !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <Link href="/catalog/image-studio">
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                        <ImageIcon className="h-3 w-3" />
                        Open Image Studio
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Approval Section (Drafting only) */}
                {selectedProduct.status === "pending" && (
                  <div className="rounded-md border p-3 space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Approval Notes</label>
                    <textarea
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                      placeholder="Notes for approval review..."
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2">
                  {selectedProduct.status === "sourced" && (
                    <Button
                      size="sm"
                      className="flex-1 h-8 gap-1.5"
                      onClick={handleDrawerAction}
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                      Submit for Review
                    </Button>
                  )}
                  {selectedProduct.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        className="flex-1 h-8 gap-1.5"
                        disabled={!editBrand}
                        onClick={handleDrawerAction}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRejectClick(selectedProduct)}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {selectedProduct.status === "approved" && (
                    <Button
                      size="sm"
                      className="flex-1 h-8 gap-1.5"
                      onClick={handleDrawerAction}
                    >
                      <Rocket className="h-3.5 w-3.5" />
                      Push to Faire
                    </Button>
                  )}
                  {selectedProduct.status === "live" && (
                    <span className="text-xs font-medium rounded-full px-3 py-1 bg-emerald-100 text-emerald-700 flex items-center gap-1.5">
                      <Eye className="h-3 w-3" />
                      Live on Faire
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ============================================================ */}
      {/* Confirmation Dialogs                                          */}
      {/* ============================================================ */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 supports-backdrop-filter:backdrop-blur-xs"
            onClick={() => setConfirmDialog(null)}
          />

          {/* Dialog */}
          <div className="relative bg-popover rounded-lg border shadow-xl p-6 w-full max-w-md mx-4 space-y-4 animate-in fade-in-0 zoom-in-95">
            {confirmDialog.type === "publish" ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Rocket className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">
                      Publish to Faire?
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      This will list{" "}
                      <span className="font-medium text-foreground">
                        {confirmDialog.product.name}
                      </span>
                      {confirmDialog.product.brand
                        ? (() => {
                            const brand = getBrandFromStores(confirmDialog.product.brand)
                            return brand ? ` on ${brand.name}'s store.` : "."
                          })()
                        : "."}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmDialog(null)}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleConfirmPublish}>
                    Confirm
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">
                      Reject Product?
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      This will move{" "}
                      <span className="font-medium text-foreground">
                        {confirmDialog.product.name}
                      </span>{" "}
                      back to Sourced.
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Rejection Reason
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                    placeholder="Why is this product being rejected?"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmDialog(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleConfirmReject}
                  >
                    Reject
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Product Card Component                                             */
/* ------------------------------------------------------------------ */

function ProductCard({
  product,
  brandInfo,
  onClick,
  onSubmitForReview,
  onApprove,
  onReject,
  onPublish,
}: {
  product: PipelineProduct
  brandInfo: { name: string; color: string } | null
  onClick: () => void
  onSubmitForReview: () => void
  onApprove: () => void
  onReject: () => void
  onPublish: () => void
}) {
  const imgCount = getImageCount(product.id)

  return (
    <div
      className="rounded-lg border border-border/80 bg-card shadow-sm p-3 space-y-2 hover:shadow-sm cursor-pointer transition-shadow"
      onClick={onClick}
    >
      {/* Row 1: Thumbnail + Name + isNew badge */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-md bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shrink-0">
          <Package className="size-3.5 text-primary/40" />
        </div>
        <p className="text-sm font-medium truncate flex-1">{product.name}</p>
        {product.isNew && (
          <span className="text-xs font-medium rounded-full px-2 py-0.5 bg-blue-100 text-blue-700 animate-pulse shrink-0">
            New
          </span>
        )}
      </div>

      {/* Row 2: Source badge + Image count badge */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium rounded-full px-2 py-0.5 bg-slate-100 text-slate-600">
          {product.source}
        </span>
        {imgCount > 0 ? (
          <span className="text-xs font-medium rounded-full px-2 py-0.5 bg-slate-100 text-slate-600">
            {imgCount} img
          </span>
        ) : (
          <span className="text-xs font-medium rounded-full px-2 py-0.5 bg-slate-50 text-muted-foreground">
            No images
          </span>
        )}
      </div>

      {/* Row 3: Stats mini-grid */}
      <div className="grid grid-cols-3 gap-1 text-center">
        <div>
          <p className="text-xs text-muted-foreground">COGS</p>
          <p className="text-xs font-medium">${product.cogs.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">WS Price</p>
          <p className="text-xs font-medium">${product.wsPrice.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Margin</p>
          <p className="text-xs font-medium">{product.margin}%</p>
        </div>
      </div>

      {/* Row 4: Brand */}
      <div className="flex items-center gap-1.5">
        {brandInfo ? (
          <>
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: brandInfo.color }}
            />
            <span className="text-xs text-foreground truncate">{brandInfo.name}</span>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">No brand</span>
        )}
      </div>

      {/* Row 5: Action buttons per status */}
      <div
        className="flex items-center gap-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        {product.status === "sourced" && (
          <Button
            size="sm"
            className="h-7 gap-1.5 text-xs flex-1"
            onClick={onSubmitForReview}
          >
            <ArrowRight className="h-3 w-3" />
            Submit for Review
          </Button>
        )}

        {product.status === "pending" && (
          <>
            <Button
              size="sm"
              className="h-7 gap-1.5 text-xs flex-1"
              disabled={!product.brand}
              onClick={onApprove}
            >
              <CheckCircle2 className="h-3 w-3" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={onReject}
            >
              Reject
            </Button>
            <Link href="/catalog/image-studio" onClick={(e) => e.stopPropagation()}>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs px-2"
              >
                <ImageIcon className="h-3 w-3" />
              </Button>
            </Link>
          </>
        )}

        {product.status === "approved" && (
          <>
            <Button
              size="sm"
              className="h-7 gap-1.5 text-xs flex-1"
              onClick={onPublish}
            >
              <Rocket className="h-3 w-3" />
              Push to Faire
            </Button>
            {product.sourceUrl && (
              <a
                href={`https://${product.sourceUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <Button size="sm" variant="ghost" className="h-7 text-xs px-2">
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </a>
            )}
          </>
        )}

        {product.status === "live" && (
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-medium rounded-full px-2.5 py-0.5 bg-emerald-100 text-emerald-700 flex items-center gap-1">
              <Eye className="h-3 w-3" />
              Live on Faire
            </span>
            <span className="text-xs text-muted-foreground">
              since {product.addedDate}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
