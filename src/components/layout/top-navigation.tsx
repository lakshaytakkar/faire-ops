"use client"

import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import Link from "next/link"
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  BarChart2,
  Wallet,
  Blocks,
  Megaphone,
  FileBarChart,
  Target,
  Phone,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useBrandFilter } from "@/lib/brand-filter-context"
import { supabase } from "@/lib/supabase"

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

const NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
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
    title: "Analytics",
    url: "/analytics",
    icon: BarChart2,
    subItems: [
      { title: "Revenue", url: "/analytics/revenue" },
      { title: "Stores", url: "/analytics/stores" },
      { title: "Products", url: "/analytics/products" },
      { title: "Traffic", url: "/analytics/traffic" },
      { title: "Geography", url: "/analytics/geography" },
    ],
  },
  {
    title: "Comms",
    url: "/workspace/emails",
    icon: Megaphone,
    centralOnly: true,
    subItems: [
      { title: "Dashboard", url: "/workspace/emails/dashboard" },
      { title: "Compose", url: "/workspace/emails/compose" },
      { title: "Email Templates", url: "/workspace/emails/templates" },
      { title: "Email Logs", url: "/workspace/emails/logs" },
      { title: "SMS", url: "/workspace/messaging/sms" },
      { title: "WhatsApp", url: "/workspace/messaging/whatsapp" },
      { title: "MSG Templates", url: "/workspace/messaging/templates" },
      { title: "MSG Logs", url: "/workspace/messaging/logs" },
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
    title: "QA",
    url: "/workspace/qa",
    icon: Phone,
    centralOnly: true,
    subItems: [
      { title: "Dashboard", url: "/workspace/qa/dashboard" },
      { title: "Calls", url: "/workspace/qa/calls" },
      { title: "Reviews", url: "/workspace/qa/reviews" },
      { title: "Flags", url: "/workspace/qa/flags" },
      { title: "Employees", url: "/workspace/qa/employees" },
      { title: "Sync", url: "/workspace/qa/sync" },
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
  {
    title: "Reports",
    url: "/reports",
    icon: FileBarChart,
    centralOnly: true,
    subItems: [
      { title: "All Reports", url: "/reports/all" },
      { title: "Day Close", url: "/reports/day-close" },
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
  if (pathname.startsWith(subUrl + "/")) return true
  return false
}

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white leading-none">
      {count > 99 ? "99+" : count}
    </span>
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

      let pendingQuery = supabase.from("faire_orders").select("*", { count: "exact", head: true }).eq("state", "NEW")
      let processingQuery = supabase.from("faire_orders").select("*", { count: "exact", head: true }).eq("state", "PROCESSING")
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

  const visibleItems = activeBrand === "all"
    ? NAV_ITEMS
    : NAV_ITEMS.filter((item) => !item.centralOnly)

  const activeItem = getActiveNavItem(pathname, visibleItems)
  const subItems = activeItem?.subItems

  return (
    <div className="shrink-0">
      {/* Primary nav bar */}
      <nav
        className="grid bg-black"
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
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white leading-none">
                  {count}
                </span>
              )}
            </Link>
          )
        })}
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
