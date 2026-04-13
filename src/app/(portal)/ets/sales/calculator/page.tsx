"use client"
import { Calculator } from "lucide-react"
import { EtsSectionStub } from "../../_components/section-stub"

export default function EtsSalesCalculatorPage() {
  return (
    <EtsSectionStub
      icon={Calculator}
      title="Price calculator"
      description="Price engine: EXW → CIF → BCD → SW Surcharge → IGST → INR landed → Partner Price → Suggested MRP."
      tableHint="ets.price_settings"
    />
  )
}
