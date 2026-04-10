"use client"

/**
 * Top utility bar — sits ABOVE the dark primary nav.
 *
 * Layout (left → right):
 *   [All Spaces grid] [B2B Ecommerce switcher]   [Search]   [+ New popover] [Notifications] [Help] [Avatar dropdown]
 *
 * On-brand light treatment — solid white background with soft border, slate
 * text, primary-color accents on hover/active. NEVER dark.
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
} from "lucide-react"

// Hardcoded for the first Space. When a second Space is added, this should
// be resolved from the URL / database (spaces table) instead of a literal.
const CURRENT_SPACE = {
  name: "B2B Ecommerce",
  tagline: "Wholesale operations",
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
    <div className="shrink-0 h-12 bg-white border-b border-slate-200 flex items-center gap-3 px-3">
      {/* === LEFT: Space switcher === */}
      <Link
        href="/"
        className="flex items-center justify-center h-8 w-8 rounded-md text-slate-500 hover:text-primary hover:bg-primary/5 transition-colors shrink-0"
        title="All Spaces"
      >
        <Grid3x3 className="h-4 w-4" />
      </Link>

      <div className="hidden sm:flex items-center gap-2 h-8 px-2.5 rounded-md bg-slate-50 ring-1 ring-slate-200/70 shrink-0">
        <span
          className="h-5 w-5 rounded flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${CURRENT_SPACE.color}33, ${CURRENT_SPACE.color}11)` }}
        >
          <ShoppingBag className="h-3 w-3" style={{ color: CURRENT_SPACE.color }} />
        </span>
        <span className="text-[12px] font-semibold text-slate-800 leading-none">
          {CURRENT_SPACE.name}
        </span>
        <span className="text-[11px] text-slate-400 leading-none hidden md:inline">
          {CURRENT_SPACE.tagline}
        </span>
      </div>

      {/* === CENTER: Search === */}
      <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            id="utility-search"
            type="search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search retailers, orders, products..."
            className="w-full h-8 pl-8 pr-12 rounded-md bg-slate-50 ring-1 ring-slate-200/70 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-white transition-colors"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center gap-0.5 h-5 px-1.5 rounded bg-white border border-slate-200 text-[10px] font-mono text-slate-400 pointer-events-none">
            <span>⌘</span>K
          </kbd>
        </div>
      </form>

      {/* === RIGHT: Actions === */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Quick action "+" popover */}
        <div className="relative" ref={newMenuRef}>
          <button
            onClick={() => setOpenMenu(openMenu === "new" ? null : "new")}
            className={`inline-flex items-center gap-1.5 h-8 pl-2.5 pr-2 rounded-md text-[12px] font-semibold transition-all ${
              openMenu === "new"
                ? "bg-primary text-white"
                : "bg-primary/95 text-white hover:bg-primary"
            } shadow-sm`}
            title="Create new"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden md:inline">New</span>
            <ChevronDown className="h-3 w-3 opacity-70" />
          </button>

          {openMenu === "new" && (
            <div className="absolute right-0 top-full mt-1.5 w-72 rounded-lg border border-slate-200 bg-white shadow-xl ring-1 ring-black/5 overflow-hidden z-50">
              <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
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
                      className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 transition-colors group"
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
                        <p className="text-[13px] font-semibold text-slate-900 leading-tight">
                          {action.label}
                        </p>
                        <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
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
          className="relative flex items-center justify-center h-8 w-8 rounded-md text-slate-500 hover:text-primary hover:bg-primary/5 transition-colors"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
        </Link>

        {/* Help */}
        <Link
          href="/workspace/knowledge"
          className="hidden sm:flex items-center justify-center h-8 w-8 rounded-md text-slate-500 hover:text-primary hover:bg-primary/5 transition-colors"
          title="Help & docs"
        >
          <HelpCircle className="h-4 w-4" />
        </Link>

        {/* Divider */}
        <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

        {/* User menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setOpenMenu(openMenu === "user" ? null : "user")}
            className="flex items-center gap-1.5 h-8 pl-1 pr-2 rounded-md hover:bg-slate-100 transition-colors"
            title="Lakshay — Sr. Manager"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://eeoesllyceegmzfqfbyu.supabase.co/storage/v1/object/public/images/team/lakshay.png"
              alt="Lakshay"
              className="h-6 w-6 rounded-full object-cover ring-1 ring-slate-200"
            />
            <span className="hidden md:inline text-[12px] font-semibold text-slate-800 leading-none">
              Lakshay
            </span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {openMenu === "user" && (
            <div className="absolute right-0 top-full mt-1.5 w-60 rounded-lg border border-slate-200 bg-white shadow-xl ring-1 ring-black/5 overflow-hidden z-50">
              <div className="px-3 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://eeoesllyceegmzfqfbyu.supabase.co/storage/v1/object/public/images/team/lakshay.png"
                  alt="Lakshay"
                  className="h-9 w-9 rounded-full object-cover ring-2 ring-white shadow-sm"
                />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-slate-900 leading-tight">
                    Lakshay
                  </p>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Sr. Manager
                  </p>
                </div>
              </div>
              <div className="py-1">
                <Link
                  href="/"
                  onClick={() => setOpenMenu(null)}
                  className="flex items-center gap-2.5 px-3 py-2 text-[12px] text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Grid3x3 className="h-3.5 w-3.5 text-slate-400" />
                  All Spaces
                </Link>
                <Link
                  href="/workspace/account"
                  onClick={() => setOpenMenu(null)}
                  className="flex items-center gap-2.5 px-3 py-2 text-[12px] text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  Account
                </Link>
                <Link
                  href="/workspace/settings"
                  onClick={() => setOpenMenu(null)}
                  className="flex items-center gap-2.5 px-3 py-2 text-[12px] text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Settings className="h-3.5 w-3.5 text-slate-400" />
                  Settings
                </Link>
              </div>
              <div className="py-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setOpenMenu(null)}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5 text-slate-400" />
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
