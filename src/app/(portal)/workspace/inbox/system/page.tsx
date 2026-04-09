"use client"

import { useState, useEffect } from "react"
import {
  AlertTriangle,
  Bell,
  Package,
  TrendingUp,
  Inbox,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Notification {
  id: string
  type: string
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

const TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  system: { bg: "bg-amber-50", text: "text-amber-600" },
  alert: { bg: "bg-red-50", text: "text-red-600" },
}

const TYPE_ICON: Record<string, typeof Bell> = {
  system: Bell,
  alert: AlertTriangle,
}

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SystemNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchNotifications() {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .in("type", ["system", "alert"])
        .order("created_at", { ascending: false })
        .limit(50)
      if (!error && data) {
        setNotifications(data as Notification[])
      }
      setLoading(false)
    }
    fetchNotifications()
  }, [])

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

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto w-full py-10 text-center text-sm text-muted-foreground">
        Loading system notifications...
      </div>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">System Notifications</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          System updates and alerts ({notifications.length})
        </p>
      </div>

      {/* Notification list */}
      <div className="rounded-md border bg-card overflow-hidden divide-y">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No system notifications</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              All systems running smoothly.
            </p>
          </div>
        ) : (
          notifications.map((n) => {
            const IconComp = TYPE_ICON[n.type] ?? Bell
            const style = TYPE_STYLES[n.type] ?? TYPE_STYLES.system
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
