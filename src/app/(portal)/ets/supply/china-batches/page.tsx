"use client"
import { Ship } from "lucide-react"
import { EtsSectionStub } from "../../_components/section-stub"

export default function EtsSupplyChinaBatchesPage() {
  return (
    <EtsSectionStub
      icon={Ship}
      title="China batches"
      description="Shipment manifests — CBM, freight USD, BCD, IGST, total landed INR cost."
      tableHint="ets.china_batches + china_batch_items"
    />
  )
}
