"use client"
import { ShieldCheck } from "lucide-react"
import { EtsSectionStub } from "../../_components/section-stub"

export default function EtsVendorsKycPage() {
  return (
    <EtsSectionStub
      icon={ShieldCheck}
      title="KYC"
      description="Vendor KYC — GST, PAN, bank details, status (verified / pending / rejected)."
      tableHint="ets.vendors (kyc_status, kyc_data)"
    />
  )
}
