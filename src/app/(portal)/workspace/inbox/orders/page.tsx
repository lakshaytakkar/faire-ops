"use client"

import { useState } from "react"
import {
  ShoppingCart,
  Package,
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
// Order notifications subset
// ---------------------------------------------------------------------------

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    type: "order",
    title: "New order from Twilight House",
    description: "Order #TH-4491 placed for 12 units across 3 SKUs. Review and confirm shipment.",
    timestamp: "5 min ago",
    read: false,
    icon: "ShoppingCart",
    link: "/orders/TH-4491",
  },
  {
    id: "n5",
    type: "order",
    title: "Order VXTKE5DRYW shipped",
    description: "Shipment confirmed via FedEx Ground. Tracking number provided to retailer.",
    timestamp: "1 hour ago",
    read: false,
    icon: "Package",
    link: "/orders/VXTKE5DRYW",
  },
  {
    id: "n7",
    type: "order",
    title: "Order accepted for Enchanted Shire",
    description: "Retailer Bloom & Vine accepted order #ES-2287. Prepare for shipment within 3 days.",
    timestamp: "2 hours ago",
    read: false,
    icon: "ShoppingCart",
    link: "/orders/ES-2287",
  },
  {
    id: "n10",
    type: "order",
    title: "Return requested by Coast & Craft",
    description: "Return request for order #CC-1893 — 3 items, reason: damaged in transit.",
    timestamp: "5 hours ago",
    read: false,
    icon: "ShoppingCart",
    link: "/orders/CC-1893",
  },
  {
    id: "n12",
    type: "order",
    title: "Bulk order inquiry from Meadow & Stone",
    description: "Retailer is interested in a 200-unit wholesale order for Q3. Respond with pricing.",
    timestamp: "8 hours ago",
    read: true,
    icon: "ShoppingCart",
    link: "/orders/inquiry/MS-001",
  },
  {
    id: "n15",
    type: "order",
    title: "Order #TN-7812 delivered",
    description: "All 8 items confirmed delivered to Sunshine Home Goods. No issues reported.",
    timestamp: "Yesterday",
    read: true,
    icon: "Package",
    link: "/orders/TN-7812",
  },
  {
    id: "n18",
    type: "order",
    title: "Reorder from The Craft Collective",
    description: "Repeat order #CC-3021 for top-selling items. Auto-confirmed based on existing terms.",
    timestamp: "2 days ago",
    read: true,
    icon: "ShoppingCart",
    link: "/orders/CC-3021",
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, typeof ShoppingCart> = {
  ShoppingCart,
  Package,
}

const STYLE = { bg: "bg-blue-50", text: "text-blue-600" }

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OrderNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS)

  function toggleRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n)))
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">Order Notifications</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          All order-related notifications ({notifications.length})
        </p>
      </div>

      {/* Notification list */}
      <div className="rounded-md border bg-card overflow-hidden divide-y">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No order notifications</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              You're all caught up on orders.
            </p>
          </div>
        ) : (
          notifications.map((n) => {
            const IconComp = ICON_MAP[n.icon] ?? ShoppingCart
            return (
              <div
                key={n.id}
                onClick={() => toggleRead(n.id)}
                className="flex items-start gap-4 px-5 py-4 hover:bg-muted/20 transition-colors cursor-pointer"
              >
                {/* Icon */}
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${STYLE.bg} ${STYLE.text}`}>
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
