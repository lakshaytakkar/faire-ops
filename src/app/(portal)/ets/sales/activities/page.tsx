"use client"
import { MessageSquare } from "lucide-react"
import { EtsSectionStub } from "../../_components/section-stub"

export default function EtsSalesActivitiesPage() {
  return (
    <EtsSectionStub
      icon={MessageSquare}
      title="Activities"
      description="Log of calls, emails, meetings, notes on each lead."
      tableHint="ets.lead_activities"
    />
  )
}
