"use client"

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
  Settings,
  BarChart3,
  Zap,
  Mail,
  Sparkles,
  Phone,
  Telescope,
  LifeBuoy,
} from "lucide-react"

const WORKSPACE_ITEMS = [
  { href: "/workspace/calendar", icon: Calendar, label: "Calendar", color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  { href: "/operations/tasks", icon: ClipboardList, label: "Tasks", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  { href: "/workspace/team", icon: Users, label: "Team", color: "#8b5cf6", bg: "rgba(139,92,246,0.15)" },
  { href: "/workspace/chat", icon: MessageCircle, label: "Chat", color: "#10b981", bg: "rgba(16,185,129,0.15)" },
  { href: "/workspace/qa/calls", icon: Phone, label: "Calls (QA)", color: "#0ea5e9", bg: "rgba(14,165,233,0.15)" },
  { href: "/workspace/tickets", icon: LifeBuoy, label: "Tickets", color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
  { href: "/workspace/inbox", icon: Bell, label: "Inbox", color: "#f43f5e", bg: "rgba(244,63,94,0.15)" },
  { href: "/workspace/research", icon: Telescope, label: "Research", color: "#6366f1", bg: "rgba(99,102,241,0.15)" },
  { href: "/workspace/training", icon: GraduationCap, label: "Learning", color: "#14b8a6", bg: "rgba(20,184,166,0.15)" },
  { href: "/workspace/knowledge", icon: BookOpen, label: "Help", color: "#06b6d4", bg: "rgba(6,182,212,0.15)" },
  { href: "/workspace/links", icon: Link2, label: "Links", color: "#a855f7", bg: "rgba(168,85,247,0.15)" },
  { href: "/workspace/files", icon: FolderOpen, label: "Files", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  { href: "/automations/overview", icon: Zap, label: "Automations", color: "#f97316", bg: "rgba(249,115,22,0.15)" },
  { href: "/analytics/revenue", icon: BarChart3, label: "Analytics", color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  { href: "/workspace/ai-tools", icon: Sparkles, label: "AI Tools", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  { href: "/workspace/ai-team", icon: Users, label: "Remote Team", color: "#8b5cf6", bg: "rgba(139,92,246,0.15)" },
  { href: "/workspace/gmail", icon: Mail, label: "Gmail", color: "#EA4335", bg: "rgba(234,67,53,0.15)" },
  { href: "/workspace/settings", icon: Settings, label: "Settings", color: "#64748b", bg: "rgba(100,116,139,0.15)" },
] as const

/**
 * Right workspace dock — vertical strip of 48px square cells, mirroring the
 * geometry of the left brand dock and the bottom utility bar.
 *
 * Cells are sharp `w-12 h-12` with `border-b border-white/10` between them.
 * The colored icon block (calendar blue, tasks amber, etc.) lives INSIDE
 * the cell as a smaller rounded square so the dock keeps its visual
 * character without breaking the uniform cell grid. Active state =
 * `bg-white/10` plus a 2px white indicator strip on the inner (left) edge.
 */
export function WorkspaceDock() {
  const pathname = usePathname()

  return (
    <aside className="shrink-0 w-12 bg-black flex flex-col border-l border-r border-white/15 overflow-y-auto">
      {WORKSPACE_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/")

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex items-center justify-center w-12 h-12 border-b border-white/15 group transition-all",
              isActive && "ring-1 ring-inset ring-white/50"
            )}
            title={item.label}
            style={{ backgroundColor: item.color }}
          >
            <item.icon className="size-4 text-white" strokeWidth={2} />
            {isActive && (
              <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-white" />
            )}
            {/* Hover overlay for visual feedback */}
            <span className="absolute inset-0 bg-white/0 group-hover:bg-white/15 transition-colors pointer-events-none" />
            {/* Tooltip */}
            <span className="absolute right-full mr-2 px-2 py-1 rounded-md bg-foreground text-background text-[10px] font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg">
              {item.label}
            </span>
          </Link>
        )
      })}
      {/* Spacer fills remaining height with the same dark background */}
      <div className="flex-1" />
    </aside>
  )
}
