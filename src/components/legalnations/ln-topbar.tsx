"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  Receipt,
  CreditCard,
  User,
  HelpCircle,
  ChevronDown,
  LogOut,
  Settings,
  Shield,
} from "lucide-react"
import { useState, useRef, useEffect } from "react"

const NAV_ITEMS = [
  { label: "Dashboard", href: "/legalnations/dashboard", icon: LayoutDashboard },
  { label: "Onboarding", href: "/legalnations/onboarding", icon: ClipboardList },
  { label: "Documents", href: "/legalnations/documents", icon: FileText },
  { label: "Tax Filings", href: "/legalnations/tax-filings", icon: Receipt },
  { label: "Payments", href: "/legalnations/payments", icon: CreditCard },
]

const USER_MENU = [
  { label: "My Profile", href: "/legalnations/profile", icon: User },
  { label: "Help & Support", href: "/legalnations/help", icon: HelpCircle },
]

/**
 * Demo client — later replaced with Supabase Auth context.
 * For now we hardcode the first client from the legal.clients table.
 */
const DEMO_CLIENT = {
  name: "Demo Client",
  email: "client@legalnations.com",
  plan: "Elite",
  initials: "DC",
}

export function LnTopbar() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [menuOpen])

  return (
    <header className="sticky top-0 z-40 border-b border-[hsl(40_10%_88%)] bg-white">
      <div className="mx-auto max-w-6xl flex items-center h-14 px-4 md:px-6">
        {/* Logo */}
        <Link
          href="/legalnations/dashboard"
          className="flex items-center gap-2.5 mr-8 shrink-0"
        >
          <div className="h-8 w-8 rounded-lg bg-[hsl(160_45%_22%)] flex items-center justify-center">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div className="hidden sm:block">
            <span className="text-sm font-semibold text-[hsl(200_15%_12%)] leading-none">
              LegalNations
            </span>
            <span className="block text-[10px] text-[hsl(200_8%_46%)] leading-tight">
              Client Portal
            </span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1 flex-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/")
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                  isActive
                    ? "bg-[hsl(160_45%_22%)] text-white"
                    : "text-[hsl(200_8%_46%)] hover:text-[hsl(200_15%_12%)] hover:bg-[hsl(40_8%_95%)]"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User menu */}
        <div className="relative ml-4" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className={cn(
              "flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-md transition-colors",
              menuOpen
                ? "bg-[hsl(40_8%_95%)]"
                : "hover:bg-[hsl(40_8%_95%)]"
            )}
          >
            <div className="h-7 w-7 rounded-full bg-[hsl(160_45%_22%)] flex items-center justify-center text-[10px] font-semibold text-white">
              {DEMO_CLIENT.initials}
            </div>
            <span className="hidden md:inline text-sm font-medium text-[hsl(200_15%_12%)]">
              {DEMO_CLIENT.name}
            </span>
            <ChevronDown className="h-3 w-3 text-[hsl(200_8%_46%)]" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-56 rounded-lg border border-[hsl(40_10%_88%)] bg-white shadow-lg overflow-hidden z-50">
              {/* User info */}
              <div className="px-3 py-2.5 border-b border-[hsl(40_10%_88%)] bg-[hsl(40_8%_97%)]">
                <p className="text-sm font-semibold text-[hsl(200_15%_12%)]">
                  {DEMO_CLIENT.name}
                </p>
                <p className="text-xs text-[hsl(200_8%_46%)]">
                  {DEMO_CLIENT.email}
                </p>
                <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold rounded bg-[hsl(42_80%_55%)] text-[hsl(30_50%_12%)]">
                  {DEMO_CLIENT.plan}
                </span>
              </div>
              {/* Links */}
              <div className="py-1">
                {USER_MENU.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-[hsl(200_15%_12%)] hover:bg-[hsl(40_8%_95%)] transition-colors"
                    >
                      <Icon className="h-3.5 w-3.5 text-[hsl(200_8%_46%)]" />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
              <div className="py-1 border-t border-[hsl(40_10%_88%)]">
                <button
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-[hsl(200_15%_12%)] hover:bg-[hsl(40_8%_95%)] transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5 text-[hsl(200_8%_46%)]" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
