"use client"
import { Scan } from "lucide-react"
import { EtsSectionStub } from "../../_components/section-stub"

export default function EtsFinancePosAuditPage() {
  return (
    <EtsSectionStub
      icon={Scan}
      title="POS Audit"
      description="Store POS session reconciliation — opening cash, closing cash, variance."
      tableHint="ets.pos_register_sessions + pos_sales"
    />
  )
}
