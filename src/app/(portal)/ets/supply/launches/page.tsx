"use client"
import { Rocket } from "lucide-react"
import { EtsSectionStub } from "../../_components/section-stub"

export default function EtsSupplyLaunchesPage() {
  return (
    <EtsSectionStub
      icon={Rocket}
      title="Launches"
      description="Batched store launches — group stores, target date, progress."
      tableHint="ets.launch_batches + launch_batch_stores"
    />
  )
}
