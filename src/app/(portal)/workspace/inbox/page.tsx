"use client"

import { useState, useEffect } from "react"
import {
  ShoppingCart,
  AlertTriangle,
  Bell,
  Users,
  Package,
  TrendingUp,
  MessageCircle,
  Inbox,
  CheckCheck,
  Calendar,
  CalendarDays,
  Hash,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NotificationType = "order" | "system" | "mention" | "alert" | "success" | "info" | "warning"

interface Notification {
  id: string
  type: NotificationType
  title: string
  description: string
  category?: string
  created_at: string
  is_read: boolean
  link?: string
  store_id?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TYPE_ICON_MAP: Record<string, typeof ShoppingCart> = {
  order: ShoppingCart,
  system: Bell,
  mention: MessageCircle,
  alert: AlertTriangle,
  success: Package,
  info: Bell,
  warning: AlertTriangle,
}

const TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  order: { bg: "bg-blue-50", text: "text-blue-600" },
  system: { bg: "bg-amber-50", text: "text-amber-600" },
  mention: { bg: "bg-purple-50", text: "text-purple-600" },
  alert: { bg: "bg-red-50", text: "text-red-600" },
  success: { bg: "bg-emerald-50", text: "text-emerald-600" },
  info: { bg: "bg-sky-50", text: "text-sky-600" },
  warning: { bg: "bg-amber-50", text: "text-amber-600" },
}

type FilterTab = "all" | "order" | "system" | "mention"

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return "Just now"
  if (diffMin < 60) return `${diffMin} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
  if (diffDays === 1) return "Yesterday"
  return `${diffDays} days ago`
}

export default function InboxPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [activeTab, setActiveTab] = useState<FilterTab>("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchNotifications() {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50)
      if (!error && data) {
        setNotifications(data as Notification[])
      }
      setLoading(false)
    }
    fetchNotifications()
  }, [])

  // Derived counts
  const unreadCount = notifications.filter((n) => !n.is_read).length
  const now = new Date()
  const todayCount = notifications.filter((n) => {
    const diff = now.getTime() - new Date(n.created_at).getTime()
    return diff < 86400000
  }).length
  const weekCount = notifications.filter((n) => {
    const diff = now.getTime() - new Date(n.created_at).getTime()
    return diff < 7 * 86400000
  }).length
  const totalCount = notifications.length

  const tabCounts: Record<FilterTab, number> = {
    all: notifications.length,
    order: notifications.filter((n) => n.type === "order").length,
    system: notifications.filter((n) => ["system", "alert", "success", "info", "warning"].includes(n.type)).length,
    mention: notifications.filter((n) => n.type === "mention").length,
  }

  const filtered =
    activeTab === "all"
      ? notifications
      : activeTab === "system"
        ? notifications.filter((n) => ["system", "alert", "success", "info", "warning"].includes(n.type))
        : notifications.filter((n) => n.type === activeTab)

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id)
    if (unreadIds.length === 0) return
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unreadIds)
    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    }
  }

  async function toggleRead(id: string) {
    const notification = notifications.find((n) => n.id === id)
    if (!notification) return
    const newReadState = !notification.is_read
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: newReadState })
      .eq("id", id)
    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: newReadState } : n))
      )
    }
  }

  // Stat cards data
  const stats = [
    { label: "Unread", value: unreadCount, icon: Inbox, color: "bg-primary/10 text-primary" },
    { label: "Today", value: todayCount, icon: Calendar, color: "bg-blue-50 text-blue-600" },
    { label: "This Week", value: weekCount, icon: CalendarDays, color: "bg-emerald-50 text-emerald-600" },
    { label: "Total", value: totalCount, icon: Hash, color: "bg-slate-100 text-slate-600" },
  ]

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "order", label: "Orders" },
    { key: "system", label: "System" },
    { key: "mention", label: "Mentions" },
  ]

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto w-full py-10 text-center text-sm text-muted-foreground">
        Loading notifications...
      </div>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Inbox</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Notifications and activity</p>
        </div>
        <button
          onClick={markAllRead}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 h-9 text-sm font-medium hover:bg-muted/50 transition-colors"
        >
          <CheckCheck className="h-4 w-4" />
          Mark all read
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border/80 bg-card shadow-sm p-5 flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold font-heading mt-2">{s.value}</p>
            </div>
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${s.color}`}>
              <s.icon className="h-4 w-4" />
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {tab.label} ({tabCounts[tab.key]})
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden divide-y">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No notifications</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Nothing to show for this filter right now.
            </p>
          </div>
        ) : (
          filtered.map((n) => {
            const IconComp = TYPE_ICON_MAP[n.type] ?? Bell
            const style = TYPE_STYLES[n.type] ?? { bg: "bg-slate-50", text: "text-slate-600" }
            return (
              <div
                key={n.id}
                onClick={() => toggleRead(n.id)}
                className="flex items-start gap-4 px-5 py-4 hover:bg-muted/20 transition-colors cursor-pointer"
              >
                {/* Icon */}
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${style.bg} ${style.text}`}>
                  <IconComp className="h-4 w-4" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${!n.is_read ? "font-semibold" : ""}`}>{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{n.description}</p>
                </div>

                {/* Right */}
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{formatTimestamp(n.created_at)}</span>
                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary mt-1" />}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
