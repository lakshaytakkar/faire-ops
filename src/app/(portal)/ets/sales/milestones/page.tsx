"use client"
import { Flag } from "lucide-react"
import { EtsSectionStub } from "../../_components/section-stub"

export default function EtsSalesMilestonesPage() {
  return (
    <EtsSectionStub
      icon={Flag}
      title="Milestones"
      description="Payment schedule per client — what's due, what's paid, what's overdue."
      tableHint="ets.milestone_payments"
    />
  )
}
