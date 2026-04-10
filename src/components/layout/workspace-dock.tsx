"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { UserDockMenu } from "@/components/layout/user-dock-menu"
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

const WORKSPACE_ITEMS = [
  { href: "/workspace/calendar", icon: Calendar, label: "Calendar" },
  { href: "/operations/tasks", icon: ClipboardList, label: "Tasks" },
  { href: "/workspace/team", icon: Users, label: "Team" },
  { href: "/workspace/chat", icon: MessageCircle, label: "Chat" },
  { href: "/workspace/qa/dashboard", icon: ShieldCheck, label: "QA" },
  { href: "/workspace/emails/dashboard", icon: Megaphone, label: "Comms" },
  { href: "/workspace/tickets", icon: LifeBuoy, label: "Tickets" },
  { href: "/workspace/inbox", icon: Bell, label: "Inbox" },
  { href: "/workspace/research", icon: Telescope, label: "Research" },
  { href: "/workspace/training", icon: GraduationCap, label: "Learning" },
  { href: "/workspace/knowledge", icon: BookOpen, label: "Help" },
  { href: "/workspace/links", icon: Link2, label: "Links" },
  { href: "/workspace/files", icon: FolderOpen, label: "Files" },
  { href: "/automations/overview", icon: Zap, label: "Automations" },
  { href: "/analytics/revenue", icon: BarChart3, label: "Analytics" },
  { href: "/workspace/ai-tools", icon: Sparkles, label: "AI Tools" },
  { href: "/workspace/ai-team", icon: Users, label: "Remote" },
  { href: "/workspace/gmail", icon: Mail, label: "Gmail" },
  { href: "/workspace/settings", icon: Settings, label: "Settings" },
] as const

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
  const [collapsed, setCollapsed] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Load persisted preference once on mount
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

  // During SSR we don't know the persisted preference yet, so render the
  // expanded shell (the default) to match what the server produced.
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
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
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
              {/* Tooltip in collapsed mode only */}
              {isCollapsed && (
                <span className="absolute right-full mr-2 px-2 py-1 rounded-md bg-foreground text-background text-[10px] font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                  {item.label}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Collapse / expand toggle — LOCKED at the bottom of the dock,
          outside the scrolling nav so it stays reachable at all times. */}
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
