import Link from "next/link"
import { FileText } from "lucide-react"
import { supabaseLegal } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { filingStageTone, filingStatusTone } from "../../_lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Compliance List — Legal | Suprans" }

interface FilingRow {
  id: string
  llc_name: string | null
  state_annual_report_due: string | null
  filing_stage: string | null
  status: string | null
  annual_report_filed: boolean | null
}

export default async function ComplianceListPage() {
  const { data, error } = await supabaseLegal
    .from("tax_filings")
    .select(
      "id, llc_name, state_annual_report_due, filing_stage, status, annual_report_filed",
    )
    .order("state_annual_report_due", { ascending: true })

  if (error) console.error("legal.tax_filings compliance list:", error.message)
  const rows = (data ?? []) as FilingRow[]

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Compliance List"
        subtitle={`${rows.length.toLocaleString("en-IN")} filing${rows.length === 1 ? "" : "s"}`}
      />

      <DetailCard title="All filings by due date">
        {rows.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No filings tracked"
            description="Tax filings with annual report due dates will appear here."
          />
        ) : (
          <Card className="overflow-hidden p-0 gap-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>LLC Name</TableHead>
                  <TableHead className="w-[140px]">Due Date</TableHead>
                  <TableHead className="w-[140px]">Filing Stage</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[140px]">Annual Report Filed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link
                        href={`/legal/tax-filings/${r.id}`}
                        className="hover:text-primary font-medium"
                      >
                        {r.llc_name ?? "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">
                      {r.state_annual_report_due ?? "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={filingStageTone(r.filing_stage)}>
                        {r.filing_stage ?? "—"}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={filingStatusTone(r.status)}>
                        {r.status ?? "—"}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.annual_report_filed ? "Yes" : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </DetailCard>
    </div>
  )
}
