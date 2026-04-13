"use client"
import { BarChart3 } from "lucide-react"
import { EtsModuleStub } from "../_components/module-stub"

export default function EtsAnalyticsPage() {
  return (
    <EtsModuleStub
      icon={BarChart3}
      title="Analytics"
      description="ETS venture KPIs — store revenue, launch velocity, vendor performance."
      legacyHref="/analytics/revenue"
    />
  )
}
