"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const BUSINESS_FIELDS = [
  { label: "Business Name", value: "Suprans Wholesale" },
  { label: "Type", value: "Wholesale Distributor" },
  { label: "Phone", value: "+1 (555) 123-4567" },
  { label: "Address", value: "123 Commerce St, Los Angeles, CA 90001" },
  { label: "Tax ID", value: "XX-XXXXXXX" },
  { label: "Founded", value: "2021" },
] as const

const PREFERENCES = [
  { label: "Currency", value: "USD", badge: false },
  { label: "Commission", value: "15%", badge: false },
  { label: "Auto-accept", value: "Enabled", badge: true },
  { label: "Email notifications", value: "Enabled", badge: true },
  { label: "Late ship threshold", value: "48h", badge: false },
  { label: "Low stock alert", value: "10 units", badge: false },
] as const

const QUICK_STATS = [
  { label: "Brands", value: "6" },
  { label: "Active Orders", value: "12" },
  { label: "Retailers", value: "156" },
] as const

export default function SettingsPage() {
  return (
    <div className="max-w-[1440px] mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-heading text-foreground">Account Settings</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Card */}
        <div className="lg:col-span-1">
          <div className="rounded-md border bg-card p-6 text-center">
            <div className="h-16 w-16 rounded-full bg-primary text-white text-xl font-bold flex items-center justify-center mx-auto">
              LK
            </div>
            <h2 className="text-lg font-semibold mt-3">Lakshay</h2>
            <p className="text-sm text-muted-foreground">Founder &middot; Admin</p>
            <p className="text-xs text-muted-foreground mt-1">lakshay@suprans.com</p>

            <div className="my-4 border-t" />

            <div className="grid grid-cols-3 gap-4">
              {QUICK_STATS.map((stat) => (
                <div key={stat.label}>
                  <div className="text-sm font-semibold">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Business Info + Preferences */}
        <div className="lg:col-span-2 space-y-6">
          {/* Business Information */}
          <div className="rounded-md border bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b px-5 py-3.5">
              <h3 className="text-sm font-semibold">Business Information</h3>
              <Button variant="outline" size="sm">Edit</Button>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 p-5">
              {BUSINESS_FIELDS.map((field) => (
                <div key={field.label}>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {field.label}
                  </div>
                  <div className="text-sm font-medium mt-0.5">{field.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Preferences */}
          <div className="rounded-md border bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b px-5 py-3.5">
              <h3 className="text-sm font-semibold">Preferences</h3>
            </div>
            <div className="divide-y">
              {PREFERENCES.map((pref) => (
                <div
                  key={pref.label}
                  className="flex items-center justify-between px-5 py-3.5"
                >
                  <span className="text-sm">{pref.label}</span>
                  {pref.badge ? (
                    <Badge className="border-0 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                      {pref.value}
                    </Badge>
                  ) : (
                    <span className="text-sm font-medium">{pref.value}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
