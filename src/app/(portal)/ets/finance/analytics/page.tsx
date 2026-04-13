"use client"
import { TrendingUp } from "lucide-react"
import { EtsSectionStub } from "../../_components/section-stub"

export default function EtsFinanceAnalyticsPage() {
  return (
    <EtsSectionStub
      icon={TrendingUp}
      title="Analytics"
      description="Revenue per store / product / period. Margin trend. Pipeline forecast."
      tableHint="ets.pos_sales + orders + payments"
    />
  )
}
