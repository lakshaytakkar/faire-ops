import Link from "next/link"
import { ArrowLeft, Users } from "lucide-react"
import { ComingSoon } from "@/components/shared/coming-soon"

export const metadata = {
  title: "People — Suprans HQ",
}

export default function HqPeoplePage() {
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
        icon={Users}
        title="People"
        breadcrumb="Suprans HQ"
        description="Company-wide team directory, org chart, HR records, onboarding, leaves, payroll. Distinct from venture-scoped teams — this is everyone across Suprans, not just a single venture."
        tint="#3b82f6"
        sections={[
          { label: "Directory", desc: "Everyone, searchable, with role and venture." },
          { label: "Org Chart", desc: "Auto-generated from reporting lines." },
          { label: "Onboarding", desc: "Structured checklists for new hires." },
          { label: "Leaves & Holidays", desc: "Requests, balances, approvals." },
          { label: "Payroll", desc: "Cross-venture salary processing." },
          { label: "Performance", desc: "Reviews, OKRs, calibration." },
        ]}
      />
    </div>
  )
}
