"use client"
import { UserCog } from "lucide-react"
import { EtsSectionStub } from "../../_components/section-stub"

export default function EtsStoresStaffPage() {
  return (
    <EtsSectionStub
      icon={UserCog}
      title="Store staff"
      description="Partner store staff — designation, PIN codes for POS, active/inactive."
      tableHint="ets.store_staff"
    />
  )
}
