"use client"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

const PERSONAL_FIELDS = [
  { label: "Full Name", value: "Lakshay" },
  { label: "Role", value: "Founder & Admin" },
  { label: "Email", value: "lakshay@suprans.com" },
  { label: "Phone", value: "+1 (555) 123-4567" },
  { label: "Timezone", value: "America/Los_Angeles (PST)" },
  { label: "Joined", value: "January 2021" },
] as const

const BUSINESS_FIELDS = [
  { label: "Business Name", value: "Suprans Wholesale" },
  { label: "Business Type", value: "Wholesale Distributor" },
  { label: "Tax ID", value: "XX-XXXXXXX" },
  { label: "Address", value: "123 Commerce St, Los Angeles, CA 90001" },
  { label: "Founded", value: "2021" },
  { label: "Employees", value: "6" },
] as const

const QUICK_STATS = [
  { label: "Brands", value: "6" },
  { label: "Orders", value: "249" },
  { label: "Retailers", value: "156" },
] as const

export default function AccountProfilePage() {
  return (
    <div className="max-w-[1440px] mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-heading text-foreground">
          Account Profile
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Manage your personal and business information
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column — Profile Card */}
        <div className="lg:col-span-1">
          <div className="rounded-md border bg-card p-6 text-center">
            <div className="h-20 w-20 rounded-full bg-primary text-white text-2xl font-bold flex items-center justify-center mx-auto">
              LK
            </div>
            <h2 className="text-lg font-semibold mt-4">Lakshay</h2>
            <p className="text-sm text-muted-foreground">Founder &middot; Admin</p>
            <p className="text-xs text-muted-foreground mt-1">
              lakshay@suprans.com
            </p>

            <Separator className="my-4" />

            <div className="grid grid-cols-3 gap-3 text-center">
              {QUICK_STATS.map((stat) => (
                <div key={stat.label}>
                  <div className="text-lg font-bold">{stat.value}</div>
                  <div className="text-xs text-muted-foreground uppercase">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            <Button variant="outline" className="w-full mt-4">
              Edit Profile
            </Button>
          </div>
        </div>

        {/* Right Column — Info Cards */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <div className="rounded-md border bg-card overflow-hidden">
            <div className="px-5 py-3.5 border-b text-sm font-semibold flex items-center justify-between">
              <span>Personal Information</span>
              <Button variant="ghost" size="sm">
                Edit
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 p-5">
              {PERSONAL_FIELDS.map((field) => (
                <div key={field.label}>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {field.label}
                  </div>
                  <div className="text-sm font-medium mt-1">{field.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Business Information */}
          <div className="rounded-md border bg-card overflow-hidden">
            <div className="px-5 py-3.5 border-b text-sm font-semibold flex items-center justify-between">
              <span>Business Information</span>
              <Button variant="ghost" size="sm">
                Edit
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 p-5">
              {BUSINESS_FIELDS.map((field) => (
                <div key={field.label}>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {field.label}
                  </div>
                  <div className="text-sm font-medium mt-1">{field.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
