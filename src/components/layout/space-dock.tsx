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
 * Each cell represents a Space row from the public.spaces table. Ordering
 * is sort_order asc (company tier pinned to the top via sort_order=10,
 * ventures below starting at 20). Active space gets `bg-primary` + a 2px
 * colored indicator on the inner (right) edge using the space's brand
 * color. Inactive (`is_active=false`) spaces are dimmed and not clickable
 * ("coming soon"). Spaces whose entry_url starts with http render a tiny
 * external-link badge to distinguish them from internal routes.
 */

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { listSpaces, type Space } from "@/lib/spaces"
import {
  ShoppingBag,
  Building2,
  Scale,
  Plane,
  Package,
  Zap,
  Inbox,
  Store,
  Home,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Box,
  type LucideIcon,
} from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Icon + path-prefix mapping                                         */
/* ------------------------------------------------------------------ */

const ICON_MAP: Record<string, LucideIcon> = {
  ShoppingBag,
  Building2,
  Scale,
  Plane,
  Package,
  Zap,
  Inbox,
  Store,
}

/**
 * Fallback icon for spaces whose `icon` string doesn't match a known
 * lucide export. Keeps the dock visually stable when the DB adds a new
 * space the frontend hasn't mapped yet.
 */
const FALLBACK_ICON: LucideIcon = Box

function iconFor(spaceIconName: string | null): LucideIcon {
  if (!spaceIconName) return FALLBACK_ICON
  return ICON_MAP[spaceIconName] ?? FALLBACK_ICON
}

/**
 * Path prefixes that identify which space the user is currently inside.
 *
 * The b2b-ecommerce space is special: its admin routes (/overview,
 * /orders, /catalog, /retailers, /analytics, /marketing, /finance,
 * /reports, /automations, /operations) live at the root today rather
 * than under /b2b/*. They'll migrate later — until then this explicit
 * list keeps active-state detection correct. Other spaces match a
 * single `/<slug>` prefix.
 */
const B2B_PREFIXES = [
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
]

const PATH_PREFIXES_BY_SLUG: Record<string, string[]> = {
  "b2b-ecommerce": B2B_PREFIXES,
  "hq": ["/hq"],
  "legal": ["/legal", "/legalnations"],
  "goyo": ["/goyo"],
  "usdrop": ["/usdrop"],
  "eazysell": ["/eazysell"],
  "ets": ["/ets"],
  "toysinbulk": ["/toysinbulk"],
  "suprans-app": ["/suprans-app"],
}

function prefixesFor(slug: string): string[] {
  return PATH_PREFIXES_BY_SLUG[slug] ?? [`/${slug}`]
}

/**
 * Determine which space the current pathname belongs to. Falls back to
 * b2b-ecommerce (today's default landing for internal users).
 *
 * Exported for use by top-navigation and brand-filter-pill.
 */
export function getActiveSpaceSlug(pathname: string): string {
  for (const [slug, prefixes] of Object.entries(PATH_PREFIXES_BY_SLUG)) {
    if (prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
      return slug
    }
  }
  return "b2b-ecommerce"
}

const STORAGE_KEY = "teamops:left-dock-collapsed"

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SpaceDock() {
  const pathname = usePathname()
  const activeSlug = getActiveSpaceSlug(pathname)
  const { hasSpaceAccess, isSuperadmin, loading: authLoading, user } = useAuth()

  const [spaces, setSpaces] = useState<Space[]>([])
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

  useEffect(() => {
    let cancelled = false
    listSpaces().then((rows) => {
      if (cancelled) return
      setSpaces(rows)
    })
    return () => {
      cancelled = true
    }
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

  const visibleSpaces = spaces.filter((s) => {
    if (authLoading || isSuperadmin || !user) return true
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
          const Icon = iconFor(space.icon)
          const isExternal = space.entry_url.startsWith("http")

          const inner = (
            <>
              <Icon className="size-4 shrink-0" />
              {!isCollapsed && (
                <span className="truncate leading-none flex-1">{space.name}</span>
              )}
              {!isCollapsed && isExternal && (
                <ExternalLink className="size-3 shrink-0 opacity-60" />
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
                  {!space.is_active && " — coming soon"}
                  {isExternal && " ↗"}
                </span>
              )}
            </>
          )

          if (space.is_active) {
            const linkProps = isExternal
              ? { target: "_blank" as const, rel: "noopener noreferrer" }
              : {}
            return (
              <Link
                key={space.slug}
                href={space.entry_url}
                {...linkProps}
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
