"use client"

/**
 * Compact user-menu cell that lives at the TOP of the WorkspaceDock
 * (right dock). Opens a popover to the LEFT (since it's pinned to the right
 * edge of the viewport).
 *
 * Accepts a `collapsed` prop so it can adapt to the dock's two widths:
 *   - collapsed (`w-12`): avatar-only, centered
 *   - expanded  (`w-44`): avatar + display name + subtitle
 *
 * Styled dark to match the rest of the dock and the top navigation.
 */

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { Grid3x3, User, Settings, LogOut } from "lucide-react"

interface UserDockMenuProps {
  collapsed?: boolean
}

export function UserDockMenu({ collapsed = false }: UserDockMenuProps) {
  const { user, isSuperadmin } = useAuth()
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

  const displayName = user?.display_name || user?.full_name || user?.email || "User"
  const avatarUrl =
    user?.avatar_url ||
    "https://eeoesllyceegmzfqfbyu.supabase.co/storage/v1/object/public/images/team/lakshay.png"
  const subtitle = isSuperadmin
    ? "Superadmin"
    : user?.job_title || user?.user_type || "Member"

  return (
    <div ref={wrapperRef} className="relative border-b border-white/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center w-full h-12 group hover:bg-white/15 transition-colors text-left",
          collapsed ? "justify-center" : "gap-2 px-3"
        )}
        title={displayName}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl}
          alt={displayName}
          className="h-7 w-7 rounded-full object-cover ring-1 ring-white/30 shrink-0"
        />
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white leading-tight truncate">
              {displayName}
            </p>
            <p className="text-[10px] text-white/60 leading-tight truncate mt-0.5">
              {subtitle}
            </p>
          </div>
        )}
        {open && (
          <span className="absolute right-0 top-0 bottom-0 w-[2px] bg-white" />
        )}
      </button>

      {open && (
        <div className="absolute right-full mr-2 top-0 w-60 rounded-md border border-border/80 bg-card shadow-xl ring-1 ring-black/5 overflow-hidden z-50">
          <div className="px-3 py-3 border-b border-border/80 bg-muted/30 flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-9 w-9 rounded-full object-cover ring-2 ring-card shadow-sm"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground leading-tight truncate">
                {displayName}
              </p>
              <p className="text-[11px] text-muted-foreground leading-tight truncate">
                {subtitle}
              </p>
            </div>
          </div>
          <div className="py-1">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-muted/60 transition-colors"
            >
              <Grid3x3 className="h-3.5 w-3.5 text-muted-foreground" />
              All Apps
            </Link>
            <Link
              href="/workspace/account"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-muted/60 transition-colors"
            >
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              Account
            </Link>
            <Link
              href="/workspace/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-muted/60 transition-colors"
            >
              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
              Settings
            </Link>
          </div>
          <div className="py-1 border-t border-border/80">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-foreground hover:bg-muted/60 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
