"use client"
import { Warehouse } from "lucide-react"
import { EtsSectionStub } from "../../_components/section-stub"

export default function EtsSupplyWarehousePage() {
  return (
    <EtsSectionStub
      icon={Warehouse}
      title="Warehouse"
      description="Delhi NCR warehouse — inbound/outbound, bin locations, holding inventory."
      tableHint="ets.pos_stock_movements"
    />
  )
}
