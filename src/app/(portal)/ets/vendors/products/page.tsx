"use client"
import { PackageOpen } from "lucide-react"
import { EtsSectionStub } from "../../_components/section-stub"

export default function EtsVendorsProductsPage() {
  return (
    <EtsSectionStub
      icon={PackageOpen}
      title="Vendor products"
      description="Products listed by Indian vendors — SKU, price, MOQ, stock, KYC status."
      tableHint="ets.vendor_products"
    />
  )
}
