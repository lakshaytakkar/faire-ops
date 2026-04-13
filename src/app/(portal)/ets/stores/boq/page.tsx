"use client"
import { ClipboardList } from "lucide-react"
import { EtsSectionStub } from "../../_components/section-stub"

export default function EtsStoresBoqPage() {
  return (
    <EtsSectionStub
      icon={ClipboardList}
      title="BOQ"
      description="Bill of quantities per store — setup-kit items + qty + unit price + total."
      tableHint="ets.store_boq"
    />
  )
}
