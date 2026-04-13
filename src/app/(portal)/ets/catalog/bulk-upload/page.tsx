"use client"
import { UploadCloud } from "lucide-react"
import { EtsSectionStub } from "../../_components/section-stub"

export default function EtsCatalogBulkUploadPage() {
  return (
    <EtsSectionStub
      icon={UploadCloud}
      title="Bulk upload"
      description="CSV/XLSX import of Haoduobao product sheets — review, publish, price."
      tableHint="ets.products (bulk insert)"
    />
  )
}
