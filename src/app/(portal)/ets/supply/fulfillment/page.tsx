"use client"
import { ListChecks } from "lucide-react"
import { EtsSectionStub } from "../../_components/section-stub"

export default function EtsSupplyFulfillmentPage() {
  return (
    <EtsSectionStub
      icon={ListChecks}
      title="Fulfillment"
      description="Order queue, priority, assignee, status transitions."
      tableHint="ets.fulfillment_queue + orders"
    />
  )
}
