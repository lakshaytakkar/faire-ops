"use client"
import { Receipt } from "lucide-react"
import { EtsSectionStub } from "../../_components/section-stub"

export default function EtsFinanceInvoicesPage() {
  return (
    <EtsSectionStub
      icon={Receipt}
      title="Invoices"
      description="GST invoices per order — template-generated, downloadable PDFs."
      tableHint="ets.orders + GST logic"
    />
  )
}
