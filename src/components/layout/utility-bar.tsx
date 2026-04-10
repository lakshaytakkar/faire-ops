"use client"

/**
 * Bottom utility bar — pinned to the bottom of the portal viewport, full-width.
 *
 * Visual mirror of the top primary nav (h-12, text-sm font-medium, full-row
 * hit areas) but inverse: white card background with dark text and dark
 * primary accents instead of black with white. Each item is a full-height
 * h-12 cell so the row reads like a horizontal nav, not a status strip.
 */

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Grid3x3,
  Search,
  Plus,
  Bell,
  HelpCircle,
  ChevronDown,
  ShoppingBag,
  CheckSquare,
  Mail,
  Calendar,
  StickyNote,
  MessageSquare,
  LogOut,
  Settings,
  User,
  Sparkles,
  Home,
} from "lucide-react"

// Hardcoded for the first Space. When a second Space is added, this should
// be resolved from the URL / database (spaces table) instead of a literal.
const CURRENT_SPACE = {
  name: "B2B Ecommerce (USA)",
  tagline: "Wholesale ops · Faire",
  color: "#3b82f6",
}

interface QuickAction {
  label: string
  hint: string
  icon: React.ElementType
  href: string
  color: string
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: "Compose email", hint: "Write a new email", icon: Mail, href: "/workspace/gmail", color: "#3b82f6" },
  { label: "New task", hint: "Add to your task list", icon: CheckSquare, href: "/operations/tasks", color: "#f59e0b" },
  { label: "Schedule event", hint: "Add to calendar", icon: Calendar, href: "/workspace/calendar", color: "#8b5cf6" },
  { label: "New chat", hint: "Start a conversation", icon: MessageSquare, href: "/workspace/chat", color: "#10b981" },
  { label: "Create note", hint: "Quick knowledge note", icon: StickyNote, href: "/workspace/knowledge/articles", color: "#ec4899" },
]

export function UtilityBar() {
  const router = useRouter()
  const [searchValue, setSearchValue] = useState("")
  const [openMenu, setOpenMenu] = useState<"new" | "user" | null>(null)
  const newMenuRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Click-outside handling for the popovers
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (
        openMenu === "new" &&
        newMenuRef.current &&
        !newMenuRef.current.contains(target)
      ) {
        setOpenMenu(null)
      }
      if (
        openMenu === "user" &&
        userMenuRef.current &&
        !userMenuRef.current.contains(target)
      ) {
        setOpenMenu(null)
      }
    }
    if (openMenu) {
      document.addEventListener("mousedown", handleClick)
      return () => document.removeEventListener("mousedown", handleClick)
    }
  }, [openMenu])

  // Cmd/Ctrl-K focuses the search input
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        const input = document.getElementById("utility-search") as HTMLInputElement | null
        input?.focus()
        input?.select()
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [])

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = searchValue.trim()
    if (!q) return
    // Naive global search routes to retailers directory with the query —
    // a real federated search comes later.
    router.push(`/retailers/directory?q=${encodeURIComponent(q)}`)
  }

  return (
    <div className="shrink-0 h-12 w-full bg-card border-t border-slate-300 flex items-stretch z-30">
      {/* === LEFT: Home === */}
      <Link
        href="/"
        className="flex items-center justify-center w-12 h-12 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0 border-r border-slate-300"
        title="Home"
      >
        <Home className="size-4" />
      </Link>

      <Link
        href="/"
        className="hidden sm:flex items-center gap-2 h-12 px-4 hover:bg-muted/60 transition-colors shrink-0 border-r border-slate-300"
        title="Switch space"
      >
        <span
          className="h-5 w-5 rounded flex items-center justify-center shrink-0"
          style={{ background: `linear-gradient(135deg, ${CURRENT_SPACE.color}33, ${CURRENT_SPACE.color}11)` }}
        >
          <ShoppingBag className="size-3" style={{ color: CURRENT_SPACE.color }} />
        </span>
        <span className="text-sm font-medium text-foreground leading-none">
          {CURRENT_SPACE.name}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </Link>

      {/* === CENTER: Search === */}
      <form onSubmit={handleSearchSubmit} className="flex-1 max-w-2xl flex items-center px-3">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            id="utility-search"
            type="search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search retailers, orders, products..."
            className="w-full h-9 pl-8 pr-12 rounded-md bg-muted/40 border border-slate-300 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-background focus:border-border transition-colors"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center gap-0.5 h-5 px-1.5 rounded bg-background border border-slate-300 text-[10px] font-mono text-muted-foreground pointer-events-none">
            <span>⌘</span>K
          </kbd>
        </div>
      </form>

      {/* spacer */}
      <div className="flex-1" />

      {/* === RIGHT: Actions === */}
      <div className="flex items-stretch shrink-0 border-l border-slate-300">
        {/* Quick action "+" popover */}
        <div className="relative" ref={newMenuRef}>
          <button
            onClick={() => setOpenMenu(openMenu === "new" ? null : "new")}
            className={`flex items-center justify-center gap-1.5 h-12 px-4 text-sm font-medium transition-colors border-r border-slate-300 ${
              openMenu === "new"
                ? "bg-primary/10 text-primary"
                : "text-foreground hover:bg-muted/60"
            }`}
            title="Create new"
          >
            <Plus className="size-4" />
            <span className="hidden md:inline">New</span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>

          {openMenu === "new" && (
            <div className="absolute right-0 bottom-full mb-1.5 w-72 rounded-md border border-slate-300 bg-card shadow-xl ring-1 ring-black/5 overflow-hidden z-50">
              <div className="px-3 py-2 border-b border-slate-300 bg-muted/30">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Quick actions
                  </span>
                </div>
              </div>
              <div className="py-1">
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon
                  return (
                    <Link
                      key={action.label}
                      href={action.href}
                      onClick={() => setOpenMenu(null)}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-muted/60 transition-colors"
                    >
                      <span
                        className="h-8 w-8 rounded-md flex items-center justify-center shrink-0 ring-1 ring-black/[0.04]"
                        style={{
                          background: `linear-gradient(135deg, ${action.color}22, ${action.color}10)`,
                        }}
                      >
                        <Icon className="h-4 w-4" style={{ color: action.color }} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground leading-tight">
                          {action.label}
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                          {action.hint}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Notifications */}
        <Link
          href="/workspace/inbox"
          className="flex items-center justify-center w-12 h-12 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors border-r border-slate-300"
          title="Notifications"
        >
          <Bell className="size-4" />
        </Link>

        {/* Help */}
        <Link
          href="/workspace/knowledge"
          className="hidden sm:flex items-center justify-center w-12 h-12 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors border-r border-slate-300"
          title="Help & docs"
        >
          <HelpCircle className="size-4" />
        </Link>

        {/* User menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setOpenMenu(openMenu === "user" ? null : "user")}
            className={`flex items-center gap-2 h-12 px-3 transition-colors ${
              openMenu === "user"
                ? "bg-primary/10 text-primary"
                : "text-foreground hover:bg-muted/60"
            }`}
            title="Lakshay — Sr. Manager"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://eeoesllyceegmzfqfbyu.supabase.co/storage/v1/object/public/images/team/lakshay.png"
              alt="Lakshay"
              className="h-7 w-7 rounded-full object-cover ring-1 ring-border/80"
            />
            <span className="hidden md:inline text-sm font-medium leading-none">
              Lakshay
            </span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>

          {openMenu === "user" && (
            <div className="absolute right-0 bottom-full mb-1.5 w-60 rounded-md border border-slate-300 bg-card shadow-xl ring-1 ring-black/5 overflow-hidden z-50">
              <div className="px-3 py-3 border-b border-slate-300 bg-muted/30 flex items-center gap-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://eeoesllyceegmzfqfbyu.supabase.co/storage/v1/object/public/images/team/lakshay.png"
                  alt="Lakshay"
                  className="h-9 w-9 rounded-full object-cover ring-2 ring-card shadow-sm"
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground leading-tight">
                    Lakshay
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    Sr. Manager
                  </p>
                </div>
              </div>
              <div className="py-1">
                <Link
                  href="/"
                  onClick={() => setOpenMenu(null)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-muted/60 transition-colors"
                >
                  <Grid3x3 className="h-3.5 w-3.5 text-muted-foreground" />
                  All Spaces
                </Link>
                <Link
                  href="/workspace/account"
                  onClick={() => setOpenMenu(null)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-muted/60 transition-colors"
                >
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  Account
                </Link>
                <Link
                  href="/workspace/settings"
                  onClick={() => setOpenMenu(null)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-muted/60 transition-colors"
                >
                  <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                  Settings
                </Link>
              </div>
              <div className="py-1 border-t border-slate-300">
                <button
                  type="button"
                  onClick={() => setOpenMenu(null)}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-foreground hover:bg-muted/60 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
