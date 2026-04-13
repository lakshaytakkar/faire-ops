"use client"
import { FileSignature } from "lucide-react"
import { EtsSectionStub } from "../../_components/section-stub"

export default function EtsStoresDocumentsPage() {
  return (
    <EtsSectionStub
      icon={FileSignature}
      title="Documents"
      description="Signed MOU / NDA / onboarding docs per store. Templates + instances."
      tableHint="ets.document_templates + document_instances"
    />
  )
}
