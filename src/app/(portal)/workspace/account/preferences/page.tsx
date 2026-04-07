"use client"

import { useState } from "react"

type DisplayRow = { label: string; key: string; value: string }
type DefaultRow = { label: string; key: string; value: string; toggle: boolean }
type NotificationRow = { label: string; key: string; defaultEnabled: boolean }

const DISPLAY_ROWS: DisplayRow[] = [
  { label: "Theme", key: "theme", value: "Light" },
  { label: "Language", key: "language", value: "English" },
  { label: "Date Format", key: "dateFormat", value: "MMM DD, YYYY" },
  { label: "Number Format", key: "numberFormat", value: "1,234.56" },
]

const DEFAULTS_ROWS: DefaultRow[] = [
  { label: "Default Currency", key: "currency", value: "USD", toggle: false },
  { label: "Commission Rate", key: "commission", value: "15%", toggle: false },
  {
    label: "Auto-accept Orders",
    key: "autoAccept",
    value: "Enabled",
    toggle: true,
  },
  {
    label: "Late Shipment Threshold",
    key: "lateShipment",
    value: "48 hours",
    toggle: false,
  },
  {
    label: "Low Stock Alert Level",
    key: "lowStock",
    value: "10 units",
    toggle: false,
  },
]

const NOTIFICATION_ROWS: NotificationRow[] = [
  { label: "New order received", key: "newOrder", defaultEnabled: true },
  { label: "Order status changes", key: "orderStatus", defaultEnabled: true },
  { label: "Low stock alerts", key: "lowStockAlert", defaultEnabled: true },
  { label: "New retailer signup", key: "retailerSignup", defaultEnabled: true },
  { label: "Weekly digest", key: "weeklyDigest", defaultEnabled: true },
  { label: "Monthly report", key: "monthlyReport", defaultEnabled: false },
]

function ToggleBadge({
  enabled,
  onToggle,
}: {
  enabled: boolean
  onToggle: () => void
}) {
  return (
    <span
      onClick={onToggle}
      className={`border-0 text-xs font-medium px-2 py-0.5 rounded-full cursor-pointer select-none ${
        enabled
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      {enabled ? "Enabled" : "Disabled"}
    </span>
  )
}

export default function PreferencesPage() {
  const [autoAccept, setAutoAccept] = useState(true)

  const [notifications, setNotifications] = useState<Record<string, boolean>>(
    () =>
      Object.fromEntries(
        NOTIFICATION_ROWS.map((r) => [r.key, r.defaultEnabled])
      )
  )

  function toggleNotification(key: string) {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-heading text-foreground">
          Preferences
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Customize your experience
        </p>
      </div>

      <div className="space-y-6">
        {/* Display */}
        <div className="rounded-md border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b text-sm font-semibold">
            Display
          </div>
          <div className="divide-y">
            {DISPLAY_ROWS.map((row) => (
              <div
                key={row.key}
                className="flex justify-between items-center px-5 py-3.5"
              >
                <span className="text-sm text-muted-foreground">
                  {row.label}
                </span>
                <span className="text-sm font-medium">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Defaults */}
        <div className="rounded-md border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b text-sm font-semibold">
            Defaults
          </div>
          <div className="divide-y">
            {DEFAULTS_ROWS.map((row) => (
              <div
                key={row.key}
                className="flex justify-between items-center px-5 py-3.5"
              >
                <span className="text-sm text-muted-foreground">
                  {row.label}
                </span>
                {row.toggle ? (
                  <ToggleBadge
                    enabled={autoAccept}
                    onToggle={() => setAutoAccept((v) => !v)}
                  />
                ) : (
                  <span className="text-sm font-medium">{row.value}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Email Notifications */}
        <div className="rounded-md border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b text-sm font-semibold">
            Email Notifications
          </div>
          <div className="divide-y">
            {NOTIFICATION_ROWS.map((row) => (
              <div
                key={row.key}
                className="flex justify-between items-center px-5 py-3.5"
              >
                <span className="text-sm text-muted-foreground">
                  {row.label}
                </span>
                <ToggleBadge
                  enabled={notifications[row.key]}
                  onToggle={() => toggleNotification(row.key)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
