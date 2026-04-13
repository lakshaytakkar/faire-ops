"use client"
import { CreditCard } from "lucide-react"
import { EtsSectionStub } from "../../_components/section-stub"

export default function EtsFinancePaymentsPage() {
  return (
    <EtsSectionStub
      icon={CreditCard}
      title="Payments"
      description="All payment events — Razorpay + manual. Amount, method, ref, status."
      tableHint="ets.payments"
    />
  )
}
