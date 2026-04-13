"use client"
import { Send } from "lucide-react"
import { EtsSectionStub } from "../../_components/section-stub"

export default function EtsSupplyDispatchPage() {
  return (
    <EtsSectionStub
      icon={Send}
      title="Dispatch"
      description="Freight dispatch + delivery tracking for opening inventory and replenishment."
      tableHint="ets.fulfillment_queue"
    />
  )
}
