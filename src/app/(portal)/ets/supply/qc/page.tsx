"use client"
import { CheckCircle2 } from "lucide-react"
import { EtsSectionStub } from "../../_components/section-stub"

export default function EtsSupplyQcPage() {
  return (
    <EtsSectionStub
      icon={CheckCircle2}
      title="Quality control"
      description="Inspection records on received shipments — pass/fail, photos, resolution."
      tableHint="ets.qc_records"
    />
  )
}
