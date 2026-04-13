"use client"
import { Kanban } from "lucide-react"
import { EtsSectionStub } from "../../_components/section-stub"

export default function EtsSalesPipelinePage() {
  return (
    <EtsSectionStub
      icon={Kanban}
      title="Pipeline"
      description="Kanban view of clients by stage: new-lead → qualified → proposal → negotiation → won/lost."
      tableHint="ets.clients (stage column)"
    />
  )
}
