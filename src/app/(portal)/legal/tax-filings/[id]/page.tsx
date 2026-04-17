import { notFound } from "next/navigation"
import { Wallet, Landmark, BarChart3 } from "lucide-react"
import { supabaseLegal } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { BackLink } from "@/components/shared/back-link"
import { StatusBadge } from "@/components/shared/status-badge"
import { GenericEditLauncher } from "../../_components/GenericEditLauncher"
import {
  filingStatusTone,
  filingStageTone,
  formatINR,
} from "../../_lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Filing — Legal | Suprans" }

type Params = { id: string }

interface FilingFull {
  id: string
  llc_name: string | null
  main_entity_name: string | null
  status: string | null
  filing_stage: string | null
  filing_done: boolean | null
  filled_1120: boolean | null
  filled_5472: boolean | null
  verified_ein_in_form: boolean | null
  annual_report_filed: boolean | null
  amount_received: number | null
  bank_transactions_count: number | null
  bank_statements_status: string | null
  date_of_formation: string | null
  ein_number: string | null
  naics: string | null
  principal_activity: string | null
  email_address: string | null
  contact_details: string | null
  address: string | null
  address_2: string | null
  country: string | null
  personal_address: string | null
  send_mail_status: string | null
  mail_tracking_number: string | null
  fax: string | null
  fax_confirmation: string | null
  reference_number: string | null
  notes: string | null
  additional_notes: string | null
  [key: string]: unknown
}

export default async function LegalTaxFilingDetailPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params

  const { data, error } = await supabaseLegal
    .from("tax_filings")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) console.error("legal.tax_filings:", error.message)
  if (!data) notFound()
  const f = data as FilingFull

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <BackLink href="/legal/tax-filings" label="All tax filings" />

      <PageHeader
        title={f.llc_name ?? "Filing"}
        subtitle={f.main_entity_name ?? undefined}
        actions={
          <GenericEditLauncher
            table="tax_filings"
            row={f as Record<string, unknown> & { id: string }}
            listHref="/legal/tax-filings"
          />
        }
      />

      <KPIGrid>
        <MetricCard
          label="Amount Received"
          value={formatINR(f.amount_received)}
          icon={Wallet}
          iconTone="emerald"
        />
        <MetricCard
          label="Bank Transactions"
          value={f.bank_transactions_count ?? 0}
          icon={Landmark}
          iconTone="blue"
        />
        <MetricCard
          label="Filing Stage"
          value={
            <StatusBadge tone={filingStageTone(f.filing_stage)}>
              {f.filing_stage ?? "—"}
            </StatusBadge>
          }
          icon={BarChart3}
          iconTone="violet"
        />
      </KPIGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">
          <DetailCard title="Filing Details">
            <div className="divide-y divide-border">
              <InfoRow
                label="Status"
                value={
                  <StatusBadge tone={filingStatusTone(f.status)}>
                    {f.status ?? "—"}
                  </StatusBadge>
                }
              />
              <InfoRow
                label="Filing Stage"
                value={
                  <StatusBadge tone={filingStageTone(f.filing_stage)}>
                    {f.filing_stage ?? "—"}
                  </StatusBadge>
                }
              />
              <InfoRow
                label="Date of Formation"
                value={f.date_of_formation ?? "—"}
              />
              <InfoRow label="EIN Number" value={f.ein_number ?? "—"} />
              <InfoRow label="NAICS" value={f.naics ?? "—"} />
              <InfoRow
                label="Principal Activity"
                value={f.principal_activity ?? "—"}
              />
            </div>
          </DetailCard>

          <DetailCard title="Form Status">
            <div className="divide-y divide-border">
              <InfoRow
                label="Filing Done"
                value={f.filing_done ? "\u2705 Yes" : "No"}
              />
              <InfoRow
                label="1120 Filed"
                value={f.filled_1120 ? "\u2705 Yes" : "No"}
              />
              <InfoRow
                label="5472 Filed"
                value={f.filled_5472 ? "\u2705 Yes" : "No"}
              />
              <InfoRow
                label="Verified EIN in Form"
                value={f.verified_ein_in_form ? "\u2705 Yes" : "No"}
              />
              <InfoRow
                label="Annual Report Filed"
                value={f.annual_report_filed ? "\u2705 Yes" : "No"}
              />
            </div>
          </DetailCard>

          <DetailCard title="Mail / Fax">
            <div className="divide-y divide-border">
              <InfoRow
                label="Send Mail Status"
                value={f.send_mail_status ?? "—"}
              />
              <InfoRow
                label="Mail Tracking Number"
                value={f.mail_tracking_number ?? "—"}
              />
              <InfoRow label="Fax" value={f.fax ?? "—"} />
              <InfoRow
                label="Fax Confirmation"
                value={f.fax_confirmation ?? "—"}
              />
              <InfoRow
                label="Reference Number"
                value={f.reference_number ?? "—"}
              />
            </div>
          </DetailCard>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <DetailCard title="Contact">
            <div className="divide-y divide-border">
              <InfoRow
                label="Email"
                value={f.email_address ?? "—"}
              />
              <InfoRow
                label="Contact Details"
                value={f.contact_details ?? "—"}
              />
              <InfoRow label="Address" value={f.address ?? "—"} />
              <InfoRow label="Address 2" value={f.address_2 ?? "—"} />
              <InfoRow label="Country" value={f.country ?? "—"} />
              <InfoRow
                label="Personal Address"
                value={f.personal_address ?? "—"}
              />
            </div>
          </DetailCard>

          <DetailCard title="Bank">
            <div className="divide-y divide-border">
              <InfoRow
                label="Bank Statements Status"
                value={f.bank_statements_status ?? "—"}
              />
              <InfoRow
                label="Bank Transactions Count"
                value={
                  <span className="tabular-nums">
                    {f.bank_transactions_count ?? "—"}
                  </span>
                }
              />
            </div>
          </DetailCard>

          <DetailCard title="Notes">
            <div className="divide-y divide-border">
              <InfoRow label="Notes" value={f.notes ?? "—"} />
              <InfoRow
                label="Additional Notes"
                value={f.additional_notes ?? "—"}
              />
            </div>
          </DetailCard>
        </div>
      </div>
    </div>
  )
}
