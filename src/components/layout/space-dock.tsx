"use client"

/**
 * Left dock — space switcher.
 *
 * Replaces BrandDock as the primary purpose of the left vertical strip.
 * Each cell represents an internal Space (B2B Ecommerce, Suprans HQ,
 * LegalNations, GoyoTours, USDrop AI). Active space is highlighted with
 * the same `bg-white/10` + 2px right-edge indicator pattern used by the
 * brand dock previously.
 *
 * For now we read the available spaces from a small hardcoded array — when
 * the spaces table grows or per-user permissions land, this should be
 * fetched from `user_space_roles` instead.
 *
 * Phase 5 of the master execution plan.
 */

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  ShoppingBag,
  Building2,
  Scale,
  Plane,
  Package,
  Grid3x3,
  type LucideIcon,
} from "lucide-react"

interface SpaceItem {
  slug: string
  name: string
  shortName: string
  icon: LucideIcon
  color: string
  entryUrl: string
  isActive: boolean // active = built and reachable
  // pathPrefix matches the routes that belong to this space — used to detect
  // which space the user is currently inside.
  pathPrefixes: string[]
}

const SPACES: SpaceItem[] = [
  {
    slug: "b2b-ecommerce",
    name: "B2B Ecommerce (USA)",
    shortName: "B2B",
    icon: ShoppingBag,
    color: "#3b82f6",
    entryUrl: "/dashboard",
    isActive: true,
    // The b2b space owns the entire current portal — every existing route is
    // implicitly under this space until we add another one.
    pathPrefixes: [
      "/dashboard",
      "/overview",
      "/orders",
      "/catalog",
      "/retailers",
      "/analytics",
      "/marketing",
      "/finance",
      "/reports",
      "/automations",
      "/operations",
      "/workspace",
    ],
  },
  {
    slug: "hq",
    name: "Suprans HQ",
    shortName: "HQ",
    icon: Building2,
    color: "#8b5cf6",
    entryUrl: "/hq/overview",
    isActive: false,
    pathPrefixes: ["/hq"],
  },
  {
    slug: "legal",
    name: "LegalNations",
    shortName: "Legal",
    icon: Scale,
    color: "#10b981",
    entryUrl: "/legal/clients",
    isActive: false,
    pathPrefixes: ["/legal"],
  },
  {
    slug: "goyo",
    name: "GoyoTours",
    shortName: "Goyo",
    icon: Plane,
    color: "#f59e0b",
    entryUrl: "/goyo/bookings",
    isActive: false,
    pathPrefixes: ["/goyo"],
  },
  {
    slug: "usdrop",
    name: "USDrop AI",
    shortName: "USDrop",
    icon: Package,
    color: "#ec4899",
    entryUrl: "/usdrop/orders",
    isActive: false,
    pathPrefixes: ["/usdrop"],
  },
]

export function getActiveSpaceSlug(pathname: string): string {
  for (const s of SPACES) {
    if (s.pathPrefixes.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
      return s.slug
    }
  }
  // Default to B2B since the existing portal routes are all under it.
  return "b2b-ecommerce"
}

export function SpaceDock() {
  const pathname = usePathname()
  const activeSlug = getActiveSpaceSlug(pathname)

  return (
    <aside className="shrink-0 w-12 bg-black flex flex-col border-r border-white/10">
      {/* All Spaces — back to homepage */}
      <Link
        href="/"
        className="relative flex items-center justify-center w-12 h-12 border-b border-white/10 group transition-colors text-white/60 hover:text-white hover:bg-white/10"
        title="All Spaces"
      >
        <Grid3x3 className="size-4" />
      </Link>

      {SPACES.map((space) => {
        const isActive = activeSlug === space.slug
        const Icon = space.icon
        const inner = (
          <span
            className="flex items-center justify-center w-7 h-7 rounded shrink-0"
            style={{ backgroundColor: space.color }}
          >
            <Icon className="size-[14px] text-white" />
          </span>
        )

        if (space.isActive) {
          return (
            <Link
              key={space.slug}
              href={space.entryUrl}
              className={cn(
                "relative flex items-center justify-center w-12 h-12 border-b border-white/10 group transition-colors",
                isActive ? "bg-white/10" : "hover:bg-white/10"
              )}
              title={space.name}
            >
              {inner}
              {isActive && (
                <span className="absolute right-0 top-0 bottom-0 w-[2px] bg-white" />
              )}
              <span className="absolute left-full ml-2 px-2 py-1 rounded-md bg-foreground text-background text-[10px] font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                {space.name}
              </span>
            </Link>
          )
        }

        // Coming-soon space — not clickable, dimmed
        return (
          <div
            key={space.slug}
            className="relative flex items-center justify-center w-12 h-12 border-b border-white/10 group cursor-not-allowed opacity-40"
            title={`${space.name} — coming soon`}
          >
            {inner}
            <span
              className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-amber-400"
              aria-label="Coming soon"
            />
            <span className="absolute left-full ml-2 px-2 py-1 rounded-md bg-foreground text-background text-[10px] font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg">
              {space.name} — coming soon
            </span>
          </div>
        )
      })}

      {/* Spacer fills remaining height with the same dark background */}
      <div className="flex-1" />
    </aside>
  )
}
