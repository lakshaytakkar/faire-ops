"use client"
import { FileText } from "lucide-react"
import { EtsSectionStub } from "../../_components/section-stub"

export default function EtsSalesProposalsPage() {
  return (
    <EtsSectionStub
      icon={FileText}
      title="Proposals"
      description="Track package proposals sent to leads (Launch Lite / Pro / Elite)."
      tableHint="ets.clients + package_tier"
    />
  )
}
