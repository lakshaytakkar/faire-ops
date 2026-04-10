"use client"

/**
 * Left dock — space switcher.
 *
 * Vertical extension of the top nav, mirroring the right WorkspaceDock:
 *   - `bg-black` with white icons + text, `bg-primary` active state,
 *     `hover:bg-white/15` hover, `h-12` cells, `size-4` icons,
 *     `text-sm font-medium` labels.
 *   - Home button locked at the TOP (mirrors the user menu on the right).
 *   - Space list fills the middle and scrolls independently if overflow.
 *   - Collapse toggle locked at the BOTTOM; preference persisted to
 *     localStorage under `teamops:left-dock-collapsed`.
 *
 * Each cell represents an internal Space (B2B Ecommerce, Suprans HQ,
 * LegalNations, GoyoTours, USDrop AI). Active space = `bg-primary` plus a
 * 2px colored indicator using the space's brand color on the INNER (right)
 * edge. Coming-soon spaces are dimmed and not clickable.
 */

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import {
  ShoppingBag,
  Building2,
  Scale,
  Plane,
  Package,
  Home,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react"

interface SpaceItem {
  slug: string
  name: string
  shortName: string
  icon: LucideIcon
  color: string
  entryUrl: string
  isActive: boolean
  pathPrefixes: string[]
}

const SPACES: SpaceItem[] = [
  {
    slug: "b2b-ecommerce",
    name: "B2B Ecommerce",
    shortName: "B2B",
    icon: ShoppingBag,
    color: "#3b82f6",
    entryUrl: "/dashboard",
    isActive: true,
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
  return "b2b-ecommerce"
}

const STORAGE_KEY = "teamops:left-dock-collapsed"

export function SpaceDock() {
  const pathname = usePathname()
  const activeSlug = getActiveSpaceSlug(pathname)
  const { hasSpaceAccess, isSuperadmin, loading, user } = useAuth()

  const [collapsed, setCollapsed] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === "1") setCollapsed(true)
    } catch {
      /* ignore */
    }
    setHydrated(true)
  }, [])

  function toggle() {
    setCollapsed((c) => {
      const next = !c
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0")
      } catch {
        /* ignore */
      }
      return next
    })
  }

  const isCollapsed = hydrated ? collapsed : false

  const visibleSpaces = SPACES.filter((s) => {
    if (loading || isSuperadmin || !user) return true
    return hasSpaceAccess(s.slug)
  })

  return (
    <aside
      className={cn(
        "shrink-0 bg-black flex flex-col border-r border-white/10 transition-[width] duration-200",
        isCollapsed ? "w-12" : "w-44"
      )}
    >
      {/* Home — LOCKED at the top. Mirrors the user menu on the right dock. */}
      <Link
        href="/"
        className={cn(
          "relative flex items-center h-12 border-b border-white/10 text-white hover:bg-white/15 transition-colors group shrink-0",
          isCollapsed ? "justify-center" : "gap-2 px-3"
        )}
        title="Home"
      >
        <Home className="size-4 shrink-0" strokeWidth={2.25} />
        {!isCollapsed && (
          <span className="text-sm font-medium leading-none">Home</span>
        )}
        {isCollapsed && (
          <span className="absolute left-full ml-2 px-2 py-1 rounded-md bg-foreground text-background text-[10px] font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg">
            Home
          </span>
        )}
      </Link>

      {/* Scrollable space list fills remaining vertical space */}
      <nav className="flex-1 flex flex-col overflow-y-auto">
        {visibleSpaces.map((space) => {
          const isActive = activeSlug === space.slug
          const Icon = space.icon

          const inner = (
            <>
              <Icon className="size-4 shrink-0" />
              {!isCollapsed && (
                <span className="truncate leading-none">{space.name}</span>
              )}
              {isActive && (
                <span
                  className="absolute right-0 top-0 bottom-0 w-[2px]"
                  style={{ backgroundColor: space.color }}
                />
              )}
              {isCollapsed && (
                <span className="absolute left-full ml-2 px-2 py-1 rounded-md bg-foreground text-background text-[10px] font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                  {space.name}
                  {!space.isActive && " — coming soon"}
                </span>
              )}
            </>
          )

          if (space.isActive) {
            return (
              <Link
                key={space.slug}
                href={space.entryUrl}
                className={cn(
                  "relative flex items-center h-12 text-sm font-medium transition-colors group shrink-0",
                  isCollapsed ? "justify-center" : "gap-2 px-3",
                  isActive
                    ? "bg-primary text-white"
                    : "text-white hover:bg-white/15"
                )}
                title={space.name}
              >
                {inner}
              </Link>
            )
          }

          return (
            <div
              key={space.slug}
              className={cn(
                "relative flex items-center h-12 text-sm font-medium text-white opacity-40 cursor-not-allowed group shrink-0",
                isCollapsed ? "justify-center" : "gap-2 px-3"
              )}
              title={`${space.name} — coming soon`}
            >
              {inner}
              {isCollapsed && (
                <span
                  className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-amber-400"
                  aria-label="Coming soon"
                />
              )}
            </div>
          )
        })}
      </nav>

      {/* Collapse / expand toggle — LOCKED at the bottom of the dock. */}
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "flex items-center h-9 border-t border-white/10 text-white/60 hover:text-white hover:bg-white/15 transition-colors shrink-0",
          isCollapsed ? "justify-center" : "justify-start px-3 gap-1.5"
        )}
        title={isCollapsed ? "Expand dock" : "Collapse dock"}
        aria-label={isCollapsed ? "Expand dock" : "Collapse dock"}
      >
        {isCollapsed ? (
          <ChevronRight className="size-4" />
        ) : (
          <ChevronLeft className="size-4" />
        )}
        {!isCollapsed && (
          <span className="text-[10px] font-medium uppercase tracking-wider">
            Collapse
          </span>
        )}
      </button>
    </aside>
  )
}
