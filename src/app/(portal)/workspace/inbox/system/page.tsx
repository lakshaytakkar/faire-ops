"use client"

import { useState } from "react"
import {
  AlertTriangle,
  Bell,
  Package,
  TrendingUp,
  Inbox,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NotificationType = "order" | "system" | "mention" | "alert"

interface Notification {
  id: string
  type: NotificationType
  title: string
  description: string
  timestamp: string
  read: boolean
  icon: "ShoppingCart" | "AlertTriangle" | "Bell" | "Users" | "Package" | "TrendingUp" | "MessageCircle"
  link?: string
}

// ---------------------------------------------------------------------------
// System + alert notifications subset
// ---------------------------------------------------------------------------

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: "n2",
    type: "alert",
    title: "Buddha Ayurveda late ship critical",
    description: "Late ship rate has exceeded 15% threshold. Immediate action required to avoid penalties.",
    timestamp: "12 min ago",
    read: false,
    icon: "AlertTriangle",
    link: "/orders?brand=buddha-ayurveda",
  },
  {
    id: "n3",
    type: "system",
    title: "Low stock alert: Toy Nest (4 SKUs)",
    description: "Wooden Train Set, Puzzle Cube, Stacking Rings, and Animal Blocks are below reorder point.",
    timestamp: "30 min ago",
    read: false,
    icon: "Package",
  },
  {
    id: "n6",
    type: "system",
    title: "Scheduled maintenance tonight",
    description: "Faire platform will undergo scheduled maintenance from 2:00 AM to 4:00 AM EST.",
    timestamp: "2 hours ago",
    read: true,
    icon: "Bell",
  },
  {
    id: "n9",
    type: "alert",
    title: "New retailer application from Portland",
    description: "Evergreen Boutique submitted a new retailer application. Review within 48 hours.",
    timestamp: "4 hours ago",
    read: true,
    icon: "TrendingUp",
    link: "/pipeline",
  },
  {
    id: "n11",
    type: "system",
    title: "New Faire platform update",
    description: "Faire has released v4.12 with improved analytics dashboard and bulk order management.",
    timestamp: "6 hours ago",
    read: true,
    icon: "Bell",
  },
  {
    id: "n13",
    type: "system",
    title: "Commission rate change notice",
    description: "Effective May 1st, Faire commission on new retailer orders will decrease from 25% to 20%.",
    timestamp: "Yesterday",
    read: true,
    icon: "TrendingUp",
  },
  {
    id: "n16",
    type: "alert",
    title: "Payment processing delay",
    description: "Faire payout for March cycle delayed by 2 business days. Expected April 5th.",
    timestamp: "2 days ago",
    read: true,
    icon: "AlertTriangle",
  },
  {
    id: "n17",
    type: "system",
    title: "Inventory sync completed",
    description: "All 6 brand inventories successfully synced with Faire catalog. 1,247 SKUs updated.",
    timestamp: "2 days ago",
    read: true,
    icon: "Package",
  },
  {
    id: "n20",
    type: "alert",
    title: "Quality flag: product listing issue",
    description: "Faire flagged 2 listings from Enchanted Shire for missing weight/dimensions data.",
    timestamp: "3 days ago",
    read: true,
    icon: "AlertTriangle",
    link: "/products?brand=enchanted-shire",
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, typeof AlertTriangle> = {
  AlertTriangle,
  Bell,
  Package,
  TrendingUp,
}

const TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  system: { bg: "bg-amber-50", text: "text-amber-600" },
  alert: { bg: "bg-red-50", text: "text-red-600" },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SystemNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS)

  function toggleRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n)))
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
            const IconComp = ICON_MAP[n.icon] ?? Bell
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
                  <p className={`text-sm font-medium ${!n.read ? "font-semibold" : ""}`}>{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{n.description}</p>
                </div>

                {/* Right */}
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{n.timestamp}</span>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-primary mt-1" />}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
