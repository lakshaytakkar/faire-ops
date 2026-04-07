"use client"

import { useState } from "react"
import { Monitor, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"

type Session = {
  device: string
  icon: "monitor" | "smartphone"
  location: string
  time: string
  current: boolean
}

const SESSIONS: Session[] = [
  {
    device: "Chrome on Windows",
    icon: "monitor",
    location: "Los Angeles, CA",
    time: "Active now",
    current: true,
  },
  {
    device: "Safari on macOS",
    icon: "monitor",
    location: "New York, NY",
    time: "2 hours ago",
    current: false,
  },
  {
    device: "Mobile App",
    icon: "smartphone",
    location: "Denver, CO",
    time: "Yesterday",
    current: false,
  },
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

function DeviceIcon({ type }: { type: "monitor" | "smartphone" }) {
  const cls = "h-4 w-4 text-muted-foreground"
  return type === "monitor" ? (
    <Monitor className={cls} />
  ) : (
    <Smartphone className={cls} />
  )
}

export default function SecurityPage() {
  const [twoFactor, setTwoFactor] = useState(true)

  return (
    <div className="max-w-[1440px] mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-heading text-foreground">
          Security
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Manage your account security
        </p>
      </div>

      <div className="space-y-6">
        {/* Password */}
        <div className="rounded-md border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b text-sm font-semibold">
            Password
          </div>
          <div className="p-5">
            <p className="text-sm text-muted-foreground">
              Last changed 30 days ago
            </p>
            <Button variant="outline" className="mt-3">
              Change Password
            </Button>
          </div>
        </div>

        {/* Two-Factor Authentication */}
        <div className="rounded-md border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b text-sm font-semibold">
            Two-Factor Authentication
          </div>
          <div className="flex justify-between items-center p-5">
            <p className="text-sm text-muted-foreground">
              Add an extra layer of security to your account
            </p>
            <ToggleBadge
              enabled={twoFactor}
              onToggle={() => setTwoFactor((v) => !v)}
            />
          </div>
        </div>

        {/* Active Sessions */}
        <div className="rounded-md border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b text-sm font-semibold flex items-center justify-between">
            <span>Active Sessions</span>
            <Button variant="ghost" size="sm" className="text-red-600">
              Revoke All
            </Button>
          </div>
          <div className="divide-y">
            {SESSIONS.map((session) => (
              <div
                key={session.device}
                className="flex items-center gap-4 px-5 py-4"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                  <DeviceIcon type={session.icon} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium flex items-center gap-2">
                    {session.device}
                    {session.current && (
                      <span className="border-0 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {session.location}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {session.current ? null : session.time}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
