"use client"
import { Box } from "lucide-react"
import { EtsSectionStub } from "../../_components/section-stub"

export default function EtsCatalogSetupKitPage() {
  return (
    <EtsSectionStub
      icon={Box}
      title="Setup kit"
      description="Fixtures, shelving, counter, scanner, printer, signage, CCTV — priced per item."
      tableHint="ets.setup_kit_items"
    />
  )
}
