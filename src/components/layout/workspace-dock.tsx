"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { UserDockMenu } from "@/components/layout/user-dock-menu"
import { useActiveSpace } from "@/lib/use-active-space"
import {
  Calendar,
  ClipboardList,
  Users,
  MessageCircle,
  Bell,
  BookOpen,
  Link2,
  FolderOpen,
  GraduationCap,
  Settings,
  BarChart3,
  Zap,
  Mail,
  Sparkles,
  Telescope,
  LifeBuoy,
  ShieldCheck,
  Megaphone,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

/**
 * Each workspace item has a universal `module` slug plus a `legacyHref`
 * that points at the route the B2B-ecommerce space uses today. When the
 * active space is `b2b-ecommerce` we keep `legacyHref` (current
 * behavior, zero regression). For every other space we route to
 * `/<space-slug>/<module>`, so each venture has its own scoped
 * chat / calendar / tasks / etc.
 */
const WORKSPACE_ITEMS = [
  { module: "calendar",    legacyHref: "/workspace/calendar",         icon: Calendar,       label: "Calendar" },
  { module: "tasks",       legacyHref: "/operations/tasks",           icon: ClipboardList,  label: "Tasks" },
  { module: "team",        legacyHref: "/workspace/team",             icon: Users,          label: "Team" },
  { module: "chat",        legacyHref: "/workspace/chat",             icon: MessageCircle,  label: "Chat" },
  { module: "qa",          legacyHref: "/workspace/qa/dashboard",     icon: ShieldCheck,    label: "QA" },
  { module: "emails",      legacyHref: "/workspace/emails/dashboard", icon: Megaphone,      label: "Comms" },
  { module: "tickets",     legacyHref: "/workspace/tickets",          icon: LifeBuoy,       label: "Tickets" },
  { module: "inbox",       legacyHref: "/workspace/inbox",            icon: Bell,           label: "Inbox" },
  { module: "research",    legacyHref: "/workspace/research",         icon: Telescope,      label: "Research" },
  { module: "training",    legacyHref: "/workspace/training",         icon: GraduationCap,  label: "Learning" },
  { module: "knowledge",   legacyHref: "/workspace/knowledge",        icon: BookOpen,       label: "Help" },
  { module: "links",       legacyHref: "/workspace/links",            icon: Link2,          label: "Links" },
  { module: "files",       legacyHref: "/workspace/files",            icon: FolderOpen,     label: "Files" },
  { module: "automations", legacyHref: "/automations/overview",       icon: Zap,            label: "Automations" },
  { module: "analytics",   legacyHref: "/analytics/revenue",          icon: BarChart3,      label: "Analytics" },
  { module: "ai-tools",    legacyHref: "/workspace/ai-tools",         icon: Sparkles,       label: "AI Tools" },
  { module: "ai-team",     legacyHref: "/workspace/ai-team",          icon: Users,          label: "Remote" },
  { module: "gmail",       legacyHref: "/workspace/gmail",            icon: Mail,           label: "Gmail" },
  { module: "settings",    legacyHref: "/workspace/settings",         icon: Settings,       label: "Settings" },
] as const

type WorkspaceItem = (typeof WORKSPACE_ITEMS)[number]

function resolveHref(item: WorkspaceItem, activeSlug: string): string {
  // Every universal module lives at its canonical route. Non-B2B spaces
  // carry their identity forward via a ?space= param so the shared page
  // knows which venture it's rendering for. Zero per-venture stubs needed.
  if (activeSlug === "b2b-ecommerce") return item.legacyHref
  const base = item.legacyHref
  const sep = base.includes("?") ? "&" : "?"
  return `${base}${sep}space=${activeSlug}`
}

const STORAGE_KEY = "teamops:right-dock-collapsed"

/**
 * Right workspace dock — vertical extension of the top nav.
 *
 * Visually mirrors the top navigation bar (`bg-black`, white icons + text,
 * `bg-primary` active state, `hover:bg-white/15`, `h-12` cells, `size-4`
 * icons, `text-sm font-medium`). Has a collapsed mode (`w-12`, icons only)
 * and an expanded mode (`w-44`, icon + label) toggled via a chevron pinned
 * to the BOTTOM of the dock; the choice is persisted to localStorage.
 *
 * Layout order is:
 *   1. UserDockMenu — locked at the top, mirrors the Home button on the left
 *   2. Nav list — fills remaining space and scrolls independently
 *   3. Collapse toggle — locked at the bottom, always reachable
 */
export function WorkspaceDock() {
  const pathname = usePathname()
  const { slug: activeSlug } = useActiveSpace()
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

  return (
    <aside
      className={cn(
        "shrink-0 bg-black flex flex-col border-l border-white/10 transition-[width] duration-200",
        isCollapsed ? "w-12" : "w-44"
      )}
    >
      {/* User menu — LOCKED at the top, mirroring the Home button on the
          left dock. Does not scroll with the nav list below. */}
      <UserDockMenu collapsed={isCollapsed} />

      {/* Scrollable nav list fills remaining vertical space */}
      <nav className="flex-1 flex flex-col overflow-y-auto">
        {WORKSPACE_ITEMS.map((item) => {
          const href = resolveHref(item, activeSlug)
          const isActive = pathname === href || pathname.startsWith(href + "/")
          const Icon = item.icon

          return (
            <Link
              key={item.module}
              href={href}
              className={cn(
                "relative flex items-center h-12 text-sm font-medium transition-colors group shrink-0",
                isCollapsed ? "justify-center" : "gap-2 px-3",
                isActive
                  ? "bg-primary text-white"
                  : "text-white hover:bg-white/15"
              )}
              title={item.label}
            >
              <Icon className="size-4 shrink-0" />
              {!isCollapsed && (
                <span className="truncate leading-none">{item.label}</span>
              )}
              {isCollapsed && (
                <span className="absolute right-full mr-2 px-2 py-1 rounded-md bg-foreground text-background text-[10px] font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                  {item.label}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Collapse / expand toggle — LOCKED at the bottom of the dock. */}
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "flex items-center h-9 border-t border-white/10 text-white/60 hover:text-white hover:bg-white/15 transition-colors shrink-0",
          isCollapsed ? "justify-center" : "justify-end px-3 gap-1.5"
        )}
        title={isCollapsed ? "Expand dock" : "Collapse dock"}
        aria-label={isCollapsed ? "Expand dock" : "Collapse dock"}
      >
        {!isCollapsed && (
          <span className="text-[10px] font-medium uppercase tracking-wider">
            Collapse
          </span>
        )}
        {isCollapsed ? (
          <ChevronLeft className="size-4" />
        ) : (
          <ChevronRight className="size-4" />
        )}
      </button>
    </aside>
  )
}
