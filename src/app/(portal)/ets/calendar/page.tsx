"use client"
import { Calendar } from "lucide-react"
import { EtsModuleStub } from "../_components/module-stub"

export default function EtsCalendarPage() {
  return (
    <EtsModuleStub
      icon={Calendar}
      title="Calendar"
      description="Events, launches, milestones scoped to the EazyToSell venture."
      legacyHref="/workspace/calendar"
    />
  )
}
