"use client"

import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import Link from "next/link"
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Wallet,
  Blocks,
  Target,
  ChevronDown,
  Layers,
  Check,
  Truck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useBrandFilter } from "@/lib/brand-filter-context"
import { supabaseB2B } from "@/lib/supabase"
import { useRef } from "react"
import { useActiveSpace } from "@/lib/use-active-space"

interface SubItem {
  title: string
  url: string
  countKey?: string // key for notification count
}

interface NavItem {
  title: string
  url: string
  icon: React.ElementType
  subItems?: SubItem[]
  centralOnly?: boolean
  countKey?: string
}

// ============================================================================
// Per-space top navigation. The nav switches based on which Space the user
// is currently inside (resolved via `getActiveSpaceSlug(pathname)`). The
// `b2b-ecommerce` space has the full Faire portal nav. Other spaces start
// with a small placeholder nav until they are built out.
// ============================================================================

const PLACEHOLDER_HQ: NavItem[] = [
  { title: "Overview", url: "/hq/overview", icon: LayoutDashboard },
  { title: "People", url: "/hq/people", icon: Users },
  { title: "Finance", url: "/hq/finance", icon: Wallet },
  { title: "Projects", url: "/hq/projects", icon: Blocks },
  { title: "Compliance", url: "/hq/compliance", icon: Target },
]

const PLACEHOLDER_LEGAL: NavItem[] = [
  { title: "Clients", url: "/legal/clients", icon: Users },
  { title: "Cases", url: "/legal/cases", icon: Blocks },
  { title: "Documents", url: "/legal/documents", icon: Package },
  { title: "Payments", url: "/legal/payments", icon: Wallet },
  { title: "Compliance", url: "/legal/compliance", icon: Target },
]

const PLACEHOLDER_GOYO: NavItem[] = [
  { title: "Bookings", url: "/goyo/bookings", icon: ShoppingCart },
  { title: "Tours", url: "/goyo/tours", icon: Package },
  { title: "Guides", url: "/goyo/guides", icon: Users },
  { title: "Payments", url: "/goyo/payments", icon: Wallet },
  { title: "Analytics", url: "/goyo/analytics", icon: LayoutDashboard },
]

const PLACEHOLDER_USDROP: NavItem[] = [
  { title: "Orders", url: "/usdrop/orders", icon: ShoppingCart },
  { title: "Products", url: "/usdrop/products", icon: Package },
  { title: "Vendors", url: "/usdrop/vendors", icon: Users },
  { title: "Analytics", url: "/usdrop/analytics", icon: LayoutDashboard },
]

// ETS (EazyToSell) — Store Launch + Supply Partner platform. Top nav is
// organised around the superadmin's workflow: pre-deal (Sales) → goods we
// sell partners (Catalog) → getting goods there (Supply) → running stores
// (Stores) → our supply-side (Vendors) → money flows (Finance). Overview
// is the daily KPI landing.
const PLACEHOLDER_ETS: NavItem[] = [
  {
    title: "Overview",
    url: "/ets/overview",
    icon: LayoutDashboard,
  },
  {
    title: "Sales",
    url: "/ets/sales/pipeline",
    icon: Target,
    subItems: [
      { title: "Pipeline", url: "/ets/sales/pipeline" },
      { title: "Clients", url: "/ets/sales/clients" },
      { title: "Proposals", url: "/ets/sales/proposals" },
      { title: "Calculator", url: "/ets/sales/calculator" },
      { title: "Milestones", url: "/ets/sales/milestones" },
      { title: "Activities", url: "/ets/sales/activities" },
    ],
  },
  {
    title: "Catalog",
    url: "/ets/catalog/products",
    icon: Package,
    subItems: [
      { title: "Products", url: "/ets/catalog/products" },
      { title: "Categories", url: "/ets/catalog/categories" },
      { title: "Collections", url: "/ets/catalog/collections" },
      { title: "Pricing", url: "/ets/catalog/pricing" },
      { title: "Bulk upload", url: "/ets/catalog/bulk-upload" },
      { title: "Setup kit", url: "/ets/catalog/setup-kit" },
    ],
  },
  {
    title: "Supply",
    url: "/ets/supply/launches",
    icon: Truck,
    subItems: [
      { title: "Launches", url: "/ets/supply/launches" },
      { title: "China batches", url: "/ets/supply/china-batches" },
      { title: "Dispatch", url: "/ets/supply/dispatch" },
      { title: "Warehouse", url: "/ets/supply/warehouse" },
      { title: "Stock", url: "/ets/supply/stock" },
      { title: "QC", url: "/ets/supply/qc" },
      { title: "Fulfillment", url: "/ets/supply/fulfillment" },
    ],
  },
  {
    title: "Stores",
    url: "/ets/stores",
    icon: Blocks,
    subItems: [
      { title: "All stores", url: "/ets/stores" },
      { title: "Staff", url: "/ets/stores/staff" },
      { title: "BOQ", url: "/ets/stores/boq" },
      { title: "Documents", url: "/ets/stores/documents" },
    ],
  },
  {
    title: "Vendors",
    url: "/ets/vendors",
    icon: Users,
    subItems: [
      { title: "All vendors", url: "/ets/vendors" },
      { title: "Orders", url: "/ets/vendors/orders" },
      { title: "Payouts", url: "/ets/vendors/payouts" },
      { title: "Vendor products", url: "/ets/vendors/products" },
      { title: "KYC", url: "/ets/vendors/kyc" },
    ],
  },
  {
    title: "Finance",
    url: "/ets/finance/payments",
    icon: Wallet,
    subItems: [
      { title: "Payments", url: "/ets/finance/payments" },
      { title: "Invoices", url: "/ets/finance/invoices" },
      { title: "Analytics", url: "/ets/finance/analytics" },
      { title: "POS Audit", url: "/ets/finance/pos-audit" },
    ],
  },
]

const NAV_ITEMS: NavItem[] = [
  {
    title: "Overview",
    url: "/overview",
    icon: LayoutDashboard,
    subItems: [
      { title: "Dashboard", url: "/overview" },
      { title: "Analytics", url: "/overview/analytics" },
      { title: "Reports", url: "/overview/reports" },
    ],
  },
  {
    title: "Orders",
    url: "/orders",
    icon: ShoppingCart,
    countKey: "pendingOrders",
    subItems: [
      { title: "All Orders", url: "/orders/all" },
      { title: "Pending", url: "/orders/pending", countKey: "pendingOrders" },
      { title: "Fulfillment", url: "/orders/fulfillment", countKey: "processingOrders" },
      { title: "Shipments", url: "/orders/shipments" },
      { title: "Disputes", url: "/orders/refunds" },
      { title: "Quotes", url: "/orders/quotes" },
    ],
  },
  {
    title: "Products",
    url: "/catalog",
    icon: Package,
    subItems: [
      { title: "Listings", url: "/catalog/listings" },
      { title: "Collections", url: "/catalog/collections" },
      { title: "Inventory", url: "/catalog/inventory" },
      { title: "Pricing", url: "/catalog/pricing" },
      { title: "Sourcing", url: "/catalog/sourcing" },
      { title: "Review", url: "/catalog/sourcing/review", countKey: "newScraped" },
      { title: "Queue", url: "/catalog/publishing-queue" },
      { title: "Images", url: "/catalog/image-studio" },
    ],
  },
  {
    title: "Retailers",
    url: "/retailers",
    icon: Users,
    subItems: [
      { title: "All Retailers", url: "/retailers/directory" },
      { title: "Campaigns", url: "/retailers/campaigns" },
      { title: "Follow-ups", url: "/retailers/follow-ups" },
      { title: "WhatsApp", url: "/retailers/whatsapp" },
      { title: "Faire Direct", url: "/retailers/faire-direct" },
    ],
  },
  {
    title: "Finance",
    url: "/finance",
    icon: Wallet,
    centralOnly: true,
    subItems: [
      { title: "Overview", url: "/finance/banking" },
      { title: "Transactions", url: "/finance/banking/transactions" },
      { title: "Reconcile", url: "/finance/banking/reconciliation" },
      { title: "Ledger", url: "/workspace/ledger" },
    ],
  },
  {
    title: "Stores",
    url: "/workspace/stores",
    icon: Blocks,
    centralOnly: true,
    subItems: [
      { title: "All Stores", url: "/workspace/stores/all" },
      { title: "Applications", url: "/workspace/applications", countKey: "draftApps" },
    ],
  },
  {
    title: "Marketing",
    url: "/marketing",
    icon: Target,
    centralOnly: true,
    subItems: [
      { title: "Dashboard", url: "/marketing/dashboard" },
      { title: "Campaigns", url: "/marketing/campaigns" },
      { title: "Ad Sets", url: "/marketing/ad-sets" },
      { title: "Ads", url: "/marketing/ads" },
      { title: "Creatives", url: "/marketing/creatives" },
      { title: "Reports", url: "/marketing/reports" },
    ],
  },
]

function getActiveNavItem(pathname: string, items: NavItem[]): NavItem | null {
  for (const item of items) {
    if (item.subItems) {
      for (const sub of item.subItems) {
        if (pathname === sub.url || pathname.startsWith(sub.url + "/")) {
          return item
        }
      }
    }
    if (pathname === item.url || pathname.startsWith(item.url + "/")) {
      return item
    }
  }
  return null
}

function isSubItemActive(pathname: string, subUrl: string, isFirst: boolean, parentUrl: string): boolean {
  if (pathname === subUrl) return true
  // When a sub-item's url equals the parent url (e.g. first sub pointing at the
  // parent route), it should only be active on the exact parent path — otherwise
  // it would light up for every descendant route.
  if (subUrl === parentUrl) return false
  if (pathname.startsWith(subUrl + "/")) return true
  return false
}

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
      {count > 99 ? "99+" : count}
    </span>
  )
}

/**
 * Brand filter cell — pinned as the FIRST item in the dark top nav.
 * Renders the active brand (or "All Brands") with a chevron, opens a dark
 * dropdown matching the nav theme. UX-friendly: shows brand logo + name,
 * plus All Brands option at top, and inactive stores at bottom.
 */
function BrandFilterCell() {
  const { activeBrand, setActiveBrand, stores, inactiveStores, activeStore } =
    useBrandFilter()
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [open])

  const isAll = activeBrand === "all"
  const label = isAll ? "All Brands" : activeStore?.name ?? "All Brands"

  return (
    <div ref={wrapperRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2 h-12 px-4 text-sm font-medium border-r border-white/10 transition-colors min-w-[180px]",
          open ? "bg-white/15 text-white" : "text-white hover:bg-white/15"
        )}
      >
        {isAll ? (
          <span className="flex items-center justify-center h-6 w-6 rounded bg-white/10 text-white shrink-0">
            <Layers className="h-3.5 w-3.5" />
          </span>
        ) : activeStore?.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activeStore.logo_url}
            alt=""
            className="h-6 w-6 rounded object-cover ring-1 ring-white/30 shrink-0"
          />
        ) : (
          <span
            className="flex items-center justify-center h-6 w-6 rounded text-[10px] font-bold text-white shrink-0"
            style={{ backgroundColor: activeStore?.color ?? "#64748b" }}
          >
            {activeStore?.short ?? "?"}
          </span>
        )}
        <span className="flex-1 text-left truncate leading-none">{label}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-0 w-72 rounded-b-md border border-border/80 bg-card shadow-xl ring-1 ring-black/10 overflow-hidden z-50">
          <div className="px-3 py-2 border-b border-border/80 bg-muted/30">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Filter by brand
            </p>
          </div>
          <div className="py-1 max-h-[60vh] overflow-y-auto">
            {/* All Brands */}
            <button
              type="button"
              onClick={() => {
                setActiveBrand("all")
                setOpen(false)
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/60 transition-colors",
                isAll && "bg-muted/40"
              )}
            >
              <span className="flex items-center justify-center h-8 w-8 rounded-md bg-primary/10 text-primary shrink-0">
                <Layers className="h-4 w-4" />
              </span>
              <div className="flex-1 text-left min-w-0">
                <p className="font-semibold text-foreground leading-tight">All Brands</p>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  {stores.length} active store{stores.length !== 1 ? "s" : ""}
                </p>
              </div>
              {isAll && <Check className="h-4 w-4 text-primary shrink-0" />}
            </button>

            {/* Active stores */}
            {stores.length > 0 && (
              <div className="border-t border-border/60 mt-1 pt-1">
                <p className="px-3 pb-1 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                  Stores
                </p>
                {stores.map((store) => {
                  const isActiveStore = activeBrand === store.id
                  return (
                    <button
                      key={store.id}
                      type="button"
                      onClick={() => {
                        setActiveBrand(store.id)
                        setOpen(false)
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/60 transition-colors",
                        isActiveStore && "bg-muted/40"
                      )}
                    >
                      {store.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={store.logo_url}
                          alt=""
                          className="h-8 w-8 rounded-md object-cover shrink-0 ring-1 ring-border/60"
                        />
                      ) : (
                        <span
                          className="flex items-center justify-center h-8 w-8 rounded-md text-[11px] font-bold text-white shrink-0"
                          style={{ backgroundColor: store.color }}
                        >
                          {store.short}
                        </span>
                      )}
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-semibold text-foreground leading-tight truncate">
                          {store.name}
                        </p>
                        {store.category && (
                          <p className="text-[11px] text-muted-foreground leading-tight truncate">
                            {store.category}
                          </p>
                        )}
                      </div>
                      {isActiveStore && (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Inactive stores */}
            {inactiveStores.length > 0 && (
              <div className="border-t border-border/60 mt-1 pt-1">
                <p className="px-3 pb-1 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                  Inactive
                </p>
                {inactiveStores.map((store) => (
                  <div
                    key={store.id}
                    className="flex items-center gap-3 px-3 py-2 text-sm opacity-50 cursor-not-allowed"
                  >
                    {store.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={store.logo_url}
                        alt=""
                        className="h-8 w-8 rounded-md object-cover shrink-0 grayscale"
                      />
                    ) : (
                      <span
                        className="flex items-center justify-center h-8 w-8 rounded-md text-[11px] font-bold text-white shrink-0 grayscale"
                        style={{ backgroundColor: store.color }}
                      >
                        {store.short}
                      </span>
                    )}
                    <span className="flex-1 text-left text-muted-foreground truncate">
                      {store.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function TopNavigation() {
  const pathname = usePathname()
  const { activeBrand } = useBrandFilter()
  const [counts, setCounts] = useState<Record<string, number>>({})

  // Fetch notification counts — deferred so nav renders instantly
  useEffect(() => {
    const timer = setTimeout(async () => {
      const filterByStore = activeBrand !== "all"

      let pendingQuery = supabaseB2B.from("faire_orders").select("*", { count: "exact", head: true }).eq("state", "NEW")
      let processingQuery = supabaseB2B.from("faire_orders").select("*", { count: "exact", head: true }).eq("state", "PROCESSING")
      if (filterByStore) {
        pendingQuery = pendingQuery.eq("store_id", activeBrand)
        processingQuery = processingQuery.eq("store_id", activeBrand)
      }

      const [pendingRes, processingRes] = await Promise.all([
        pendingQuery,
        processingQuery,
      ])
      setCounts({
        pendingOrders: pendingRes.count ?? 0,
        processingOrders: processingRes.count ?? 0,
      })
    }, 500) // Defer 500ms so page renders first
    return () => clearTimeout(timer)
  }, [activeBrand])

  // Pick the nav set based on which Space the user is currently in.
  // The b2b-ecommerce space gets the full Faire portal nav; other spaces
  // get their lightweight placeholder nav until they're built.
  const activeSpaceSlug = useActiveSpace().slug
  const spaceNavItems: NavItem[] = (() => {
    switch (activeSpaceSlug) {
      case "hq":     return PLACEHOLDER_HQ
      case "legal":  return PLACEHOLDER_LEGAL
      case "goyo":   return PLACEHOLDER_GOYO
      case "usdrop": return PLACEHOLDER_USDROP
      case "ets":    return PLACEHOLDER_ETS
      case "b2b-ecommerce":
      default:       return NAV_ITEMS
    }
  })()

  const isB2BSpace = activeSpaceSlug === "b2b-ecommerce"

  const visibleItems = isB2BSpace && activeBrand !== "all"
    ? spaceNavItems.filter((item) => !item.centralOnly)
    : spaceNavItems

  const activeItem = getActiveNavItem(pathname, visibleItems)
  const subItems = activeItem?.subItems

  return (
    <div className="shrink-0">
      {/* Primary nav bar — brand filter pinned as first cell (B2B only), modules fill remaining width */}
      <nav className="flex bg-black">
        {isB2BSpace && <BrandFilterCell />}
        <div
          className="flex-1 grid"
          style={{ gridTemplateColumns: `repeat(${visibleItems.length}, 1fr)` }}
        >
        {visibleItems.map((item) => {
          const isActive = activeItem?.url === item.url
          const Icon = item.icon
          const count = item.countKey ? counts[item.countKey] ?? 0 : 0
          return (
            <Link
              key={item.url}
              href={item.url}
              className={cn(
                "flex items-center justify-center gap-1.5 h-12 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-white"
                  : "text-white hover:bg-white/15"
              )}
            >
              <Icon className="size-4" />
              {item.title}
              {count > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
                  {count}
                </span>
              )}
            </Link>
          )
        })}
        </div>
      </nav>

      {/* Sub-nav bar */}
      {subItems && subItems.length > 0 && (
        <div
          className="grid border-b border-border bg-background"
          style={{ gridTemplateColumns: `repeat(${subItems.length}, 1fr)` }}
        >
          {subItems.map((sub, i) => {
            const active = isSubItemActive(pathname, sub.url, i === 0, activeItem!.url)
            const subCount = sub.countKey ? counts[sub.countKey] ?? 0 : 0
            return (
              <Link
                key={sub.url}
                href={sub.url}
                className={cn(
                  "flex items-center justify-center gap-1.5 h-11 text-sm transition-colors",
                  i < subItems.length - 1 && "border-r border-border",
                  active
                    ? "bg-primary/8 text-foreground font-bold border-b-2 border-b-primary"
                    : "text-foreground font-medium hover:bg-muted/50"
                )}
              >
                {sub.title}
                <CountBadge count={subCount} />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
