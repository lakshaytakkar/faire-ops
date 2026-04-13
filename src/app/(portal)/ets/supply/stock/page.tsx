"use client"
import { PackageSearch } from "lucide-react"
import { EtsSectionStub } from "../../_components/section-stub"

export default function EtsSupplyStockPage() {
  return (
    <EtsSectionStub
      icon={PackageSearch}
      title="Stock overview"
      description="Live stock position across warehouse + every partner store."
      tableHint="ets.pos_inventory"
    />
  )
}
