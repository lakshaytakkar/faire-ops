"use client"
import { ScrollText } from "lucide-react"
import { EtsSectionStub } from "../../_components/section-stub"

export default function EtsVendorsOrdersPage() {
  return (
    <EtsSectionStub
      icon={ScrollText}
      title="Vendor orders"
      description="Purchase orders issued to Indian vendors (Deodap, Basketo, WholesaleDock)."
      tableHint="ets.vendor_orders + vendor_order_items"
    />
  )
}
