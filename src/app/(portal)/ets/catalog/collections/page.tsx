"use client"
import { Layers } from "lucide-react"
import { EtsSectionStub } from "../../_components/section-stub"

export default function EtsCatalogCollectionsPage() {
  return (
    <EtsSectionStub
      icon={Layers}
      title="Collections"
      description="Curated product groupings for store setup: toys, stationery, lifestyle, festival."
      tableHint="ets.collections + collection_items"
    />
  )
}
