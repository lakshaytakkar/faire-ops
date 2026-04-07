"use client"

import { useState } from "react"
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
// Mock data (20 notifications)
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
    id: "n4",
    type: "mention",
    title: "@Lakshay assigned task: Review product listing",
    description: "You were assigned to review the new Enchanted Shire candle collection listing before publish.",
    timestamp: "45 min ago",
    read: false,
    icon: "Users",
    link: "/tasks/review-listing-42",
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
    id: "n6",
    type: "system",
    title: "Scheduled maintenance tonight",
    description: "Faire platform will undergo scheduled maintenance from 2:00 AM to 4:00 AM EST.",
    timestamp: "2 hours ago",
    read: true,
    icon: "Bell",
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
    id: "n8",
    type: "mention",
    title: "@Lakshay mentioned in CRM note",
    description: "Sarah added a note on Coast & Craft account: \"@Lakshay please follow up on return request.\"",
    timestamp: "3 hours ago",
    read: true,
    icon: "MessageCircle",
    link: "/crm/coast-craft",
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
    id: "n11",
    type: "system",
    title: "New Faire platform update",
    description: "Faire has released v4.12 with improved analytics dashboard and bulk order management.",
    timestamp: "6 hours ago",
    read: true,
    icon: "Bell",
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
    id: "n13",
    type: "system",
    title: "Commission rate change notice",
    description: "Effective May 1st, Faire commission on new retailer orders will decrease from 25% to 20%.",
    timestamp: "Yesterday",
    read: true,
    icon: "TrendingUp",
  },
  {
    id: "n14",
    type: "mention",
    title: "@Lakshay tagged in product review",
    description: "New 5-star review on Wooden Train Set — customer mentioned gift packaging quality.",
    timestamp: "Yesterday",
    read: true,
    icon: "MessageCircle",
    link: "/products/reviews",
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
    id: "n18",
    type: "order",
    title: "Reorder from The Craft Collective",
    description: "Repeat order #CC-3021 for top-selling items. Auto-confirmed based on existing terms.",
    timestamp: "2 days ago",
    read: true,
    icon: "ShoppingCart",
    link: "/orders/CC-3021",
  },
  {
    id: "n19",
    type: "mention",
    title: "@Lakshay assigned to onboard new brand",
    description: "You have been assigned to onboard \"Willow & Sage\" — complete brand setup by April 10.",
    timestamp: "3 days ago",
    read: true,
    icon: "Users",
    link: "/tasks/onboard-willow-sage",
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

const ICON_MAP = {
  ShoppingCart,
  AlertTriangle,
  Bell,
  Users,
  Package,
  TrendingUp,
  MessageCircle,
} as const

const TYPE_STYLES: Record<NotificationType, { bg: string; text: string }> = {
  order: { bg: "bg-blue-50", text: "text-blue-600" },
  system: { bg: "bg-amber-50", text: "text-amber-600" },
  mention: { bg: "bg-purple-50", text: "text-purple-600" },
  alert: { bg: "bg-red-50", text: "text-red-600" },
}

type FilterTab = "all" | "order" | "system" | "mention"

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InboxPage() {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS)
  const [activeTab, setActiveTab] = useState<FilterTab>("all")

  // Derived counts
  const unreadCount = notifications.filter((n) => !n.read).length
  const todayCount = notifications.filter((n) =>
    ["min ago", "hour ago", "hours ago"].some((k) => n.timestamp.includes(k))
  ).length
  const weekCount = notifications.filter((n) => !n.timestamp.includes("days ago")).length
  const totalCount = notifications.length

  const tabCounts: Record<FilterTab, number> = {
    all: notifications.length,
    order: notifications.filter((n) => n.type === "order").length,
    system: notifications.filter((n) => n.type === "system" || n.type === "alert").length,
    mention: notifications.filter((n) => n.type === "mention").length,
  }

  const filtered =
    activeTab === "all"
      ? notifications
      : activeTab === "system"
        ? notifications.filter((n) => n.type === "system" || n.type === "alert")
        : notifications.filter((n) => n.type === activeTab)

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  function toggleRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n)))
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
          <div key={s.label} className="rounded-md border bg-card p-5 flex items-start justify-between">
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
      <div className="rounded-md border bg-card overflow-hidden divide-y">
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
            const IconComp = ICON_MAP[n.icon]
            const style = TYPE_STYLES[n.type]
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
