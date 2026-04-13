"use client"
import { IndianRupee } from "lucide-react"
import { EtsSectionStub } from "../../_components/section-stub"

export default function EtsCatalogPricingPage() {
  return (
    <EtsSectionStub
      icon={IndianRupee}
      title="Pricing rules"
      description="Global price-engine inputs: USD/CNY rate, INR/USD rate, freight per CBM, markup %."
      tableHint="ets.price_settings"
    />
  )
}
