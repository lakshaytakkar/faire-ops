"use client"
import { Banknote } from "lucide-react"
import { EtsSectionStub } from "../../_components/section-stub"

export default function EtsVendorsPayoutsPage() {
  return (
    <EtsSectionStub
      icon={Banknote}
      title="Vendor payouts"
      description="Commission settlement runs — amount, method, reference, paid date."
      tableHint="ets.vendor_payouts"
    />
  )
}
