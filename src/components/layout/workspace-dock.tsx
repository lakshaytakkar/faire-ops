"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
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
  FileText,
  Settings,
  BarChart3,
  Zap,
  Mail,
  Sparkles,
} from "lucide-react"

const WORKSPACE_ITEMS = [
  { href: "/workspace/calendar", icon: Calendar, label: "Calendar", color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  { href: "/operations/tasks", icon: ClipboardList, label: "Tasks", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  { href: "/workspace/team", icon: Users, label: "Team", color: "#8b5cf6", bg: "rgba(139,92,246,0.15)" },
  { href: "/workspace/chat", icon: MessageCircle, label: "Chat", color: "#10b981", bg: "rgba(16,185,129,0.15)" },
  { href: "/workspace/inbox", icon: Bell, label: "Inbox", color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
  null, // separator
  { href: "/workspace/training", icon: GraduationCap, label: "Learning", color: "#14b8a6", bg: "rgba(20,184,166,0.15)" },
  { href: "/workspace/knowledge", icon: BookOpen, label: "Help", color: "#06b6d4", bg: "rgba(6,182,212,0.15)" },
  { href: "/workspace/links", icon: Link2, label: "Links", color: "#a855f7", bg: "rgba(168,85,247,0.15)" },
  { href: "/workspace/files", icon: FolderOpen, label: "Files", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  null, // separator
  { href: "/automations/overview", icon: Zap, label: "Automations", color: "#f97316", bg: "rgba(249,115,22,0.15)" },
  { href: "/analytics/revenue", icon: BarChart3, label: "Analytics", color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  { href: "/workspace/ai-tools", icon: Sparkles, label: "AI Tools", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  { href: "/workspace/gmail", icon: Mail, label: "Gmail", color: "#EA4335", bg: "rgba(234,67,53,0.15)" },
  { href: "/workspace/settings", icon: Settings, label: "Settings", color: "#64748b", bg: "rgba(100,116,139,0.15)" },
]

export function WorkspaceDock() {
  const pathname = usePathname()
  const [showProfile, setShowProfile] = useState(false)

  return (
    <aside className="shrink-0 w-[48px] bg-black flex flex-col items-center py-2 gap-1 border-l border-white/5">
      {/* User profile at top */}
      <div className="relative">
        <button
          onClick={() => setShowProfile(!showProfile)}
          className="flex items-center justify-center w-8 h-8 rounded-md bg-primary group"
          title="Lakshay — Sr. Manager"
        >
          <span className="text-[10px] font-bold text-white">LK</span>
          <span className="absolute right-full mr-2 px-2 py-1 rounded-md bg-foreground text-background text-[10px] font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
            Lakshay
          </span>
        </button>
        {showProfile && (
          <div className="absolute right-full mr-2 top-0 w-48 rounded-lg border bg-card shadow-xl z-50 overflow-hidden">
            <div className="p-3 border-b bg-muted/30">
              <p className="text-sm font-semibold">Lakshay</p>
              <p className="text-[11px] text-muted-foreground">Sr. Manager</p>
              <p className="text-[10px] text-muted-foreground">lakshay@suprans.in</p>
            </div>
            <div className="py-1">
              <Link href="/workspace/account" onClick={() => setShowProfile(false)} className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors">
                <Settings className="size-3" /> Account
              </Link>
              <Link href="/workspace/settings" onClick={() => setShowProfile(false)} className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors">
                <Settings className="size-3" /> Settings
              </Link>
            </div>
          </div>
        )}
      </div>
      <div className="w-5 h-px bg-white/10 my-0.5" />

      {WORKSPACE_ITEMS.map((item, i) => {
        if (item === null) {
          return <div key={`sep-${i}`} className="w-5 h-px bg-white/10 my-0.5" />
        }

        const isActive = pathname === item.href || pathname.startsWith(item.href + "/")

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex items-center justify-center w-8 h-8 rounded-md group",
              isActive ? "ring-1.5 ring-white/50 shadow-sm scale-105" : "hover:scale-105 hover:shadow-sm"
            )}
            style={{ backgroundColor: item.color }}
            title={item.label}
          >
            <item.icon className="size-[14px] text-white" />
            {isActive && (
              <span
                className="absolute right-0 top-1/2 -translate-y-1/2 w-[2.5px] h-4 rounded-l-sm bg-white"
              />
            )}
            {/* Tooltip */}
            <span className="absolute right-full mr-2 px-2 py-1 rounded-md bg-foreground text-background text-[10px] font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg">
              {item.label}
            </span>
          </Link>
        )
      })}
    </aside>
  )
}
