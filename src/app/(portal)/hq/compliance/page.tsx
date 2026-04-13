import Link from "next/link"
import { ArrowLeft, ShieldCheck } from "lucide-react"
import { ComingSoon } from "@/components/shared/coming-soon"

export const metadata = {
  title: "Compliance — Suprans HQ",
}

export default function HqCompliancePage() {
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
        icon={ShieldCheck}
        title="Compliance"
        breadcrumb="Suprans HQ"
        description="Company-wide policies, legal agreements, audit trails, data-privacy posture. Per-venture compliance (e.g. LegalNations bar admissions, Faire marketplace agreements) rolls up here."
        tint="#ef4444"
        sections={[
          { label: "Policies", desc: "Handbook, acceptable-use, data-retention." },
          { label: "Legal agreements", desc: "Contracts, NDAs, vendor MSAs." },
          { label: "Audit log", desc: "System-wide activity trail." },
          { label: "Data privacy", desc: "DPA, subject access, deletion requests." },
          { label: "Regulatory filings", desc: "Filings per jurisdiction." },
          { label: "Incident log", desc: "Security + ops incidents with postmortems." },
        ]}
      />
    </div>
  )
}
