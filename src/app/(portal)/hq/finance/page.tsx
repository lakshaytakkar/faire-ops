import Link from "next/link"
import { ArrowLeft, LineChart } from "lucide-react"
import { ComingSoon } from "@/components/shared/coming-soon"

export const metadata = {
  title: "Finance — Suprans HQ",
}

export default function HqFinancePage() {
  return (
    <div className="space-y-6 max-w-[1200px] mx-auto w-full">
      <Link
        href="/hq/overview"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to HQ overview
      </Link>

      <ComingSoon
        icon={LineChart}
        title="Finance"
        breadcrumb="Suprans HQ"
        description="Cross-venture P&L, cashflow, consolidated banking. Each venture has its own finance page scoped to its own data — this is the rolled-up, company-tier view."
        tint="#f59e0b"
        sections={[
          { label: "Consolidated P&L", desc: "Revenue, costs, margin by venture." },
          { label: "Cashflow", desc: "Company-wide cash position across banks." },
          { label: "Banking", desc: "Linked accounts + transaction reconciliation." },
          { label: "Invoices", desc: "Sent, paid, overdue — across all ventures." },
          { label: "Valuation", desc: "Cap table + valuation modelling." },
          { label: "Board reports", desc: "Monthly + quarterly exports." },
        ]}
      />
    </div>
  )
}
