import Link from "next/link"
import { FileText, CheckCircle2, Loader2, Clock } from "lucide-react"
import { supabaseLegal } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
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
import { GenericAddLauncher } from "../_components/GenericEditLauncher"
import { filingStatusTone, filingStageTone, formatINR } from "../_lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Tax Filings — Legal | Suprans" }

interface FilingRow {
  id: string
  llc_name: string | null
  main_entity_name: string | null
  status: string | null
  filing_stage: string | null
  filing_done: boolean | null
  filled_1120: boolean | null
  filled_5472: boolean | null
  amount_received: number | null
  created_at: string | null
}

export default async function LegalTaxFilingsPage() {
  const { data, error } = await supabaseLegal
    .from("tax_filings")
    .select(
      "id, llc_name, main_entity_name, status, filing_stage, filing_done, filled_1120, filled_5472, amount_received, created_at",
    )
    .order("created_at", { ascending: false })

  if (error) console.error("legal.tax_filings:", error.message)
  const rows = (data ?? []) as FilingRow[]

  const completedCount = rows.filter((r) => r.filing_done === true).length
  const inProgressCount = rows.filter(
    (r) => !r.filing_done && r.status === "In progress",
  ).length
  const pendingCount = rows.length - completedCount - inProgressCount

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Tax Filings"
        subtitle={`${rows.length.toLocaleString("en-IN")} filing${rows.length === 1 ? "" : "s"}`}
        actions={
          <GenericAddLauncher
            table="tax_filings"
            listHref="/legal/tax-filings"
            title="New filing"
            size="lg"
          />
        }
      />

      <KPIGrid>
        <MetricCard
          label="Total Filings"
          value={rows.length}
          icon={FileText}
          iconTone="slate"
        />
        <MetricCard
          label="Completed"
          value={completedCount}
          icon={CheckCircle2}
          iconTone="emerald"
        />
        <MetricCard
          label="In Progress"
          value={inProgressCount}
          icon={Loader2}
          iconTone="blue"
        />
        <MetricCard
          label="Pending"
          value={pendingCount}
          icon={Clock}
          iconTone="amber"
        />
      </KPIGrid>

      <DetailCard title="All tax filings">
        {rows.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No tax filings yet"
            description="Add a filing to start tracking LLC tax submissions."
          />
        ) : (
          <Card className="overflow-hidden p-0 gap-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>LLC Name</TableHead>
                  <TableHead>Main Entity</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[140px]">Filing Stage</TableHead>
                  <TableHead className="w-[100px]">1120 Filed</TableHead>
                  <TableHead className="w-[100px]">5472 Filed</TableHead>
                  <TableHead className="text-right w-[140px]">
                    Amount Received
                  </TableHead>
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
                    <TableCell className="text-sm text-muted-foreground">
                      {r.main_entity_name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={filingStatusTone(r.status)}>
                        {r.status ?? "—"}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={filingStageTone(r.filing_stage)}>
                        {r.filing_stage ?? "—"}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.filled_1120 ? "Yes" : "No"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.filled_5472 ? "Yes" : "No"}
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums">
                      {formatINR(r.amount_received)}
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
