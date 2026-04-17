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
import { filingStatusTone, formatINR } from "../../_lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "By Stage — Tax Filings | Suprans" }

interface FilingRow {
  id: string
  llc_name: string | null
  main_entity_name: string | null
  status: string | null
  filing_stage: string | null
  filing_done: boolean | null
  amount_received: number | null
}

export default async function LegalTaxFilingsByStagePage() {
  const { data, error } = await supabaseLegal
    .from("tax_filings")
    .select(
      "id, llc_name, main_entity_name, status, filing_stage, filing_done, amount_received",
    )
    .order("created_at", { ascending: false })

  if (error) console.error("legal.tax_filings:", error.message)
  const rows = (data ?? []) as FilingRow[]

  /* Group by filing_stage */
  const groups = new Map<string, FilingRow[]>()
  for (const r of rows) {
    const key =
      r.filing_stage && r.filing_stage.trim() ? r.filing_stage : "Uncategorised"
    const list = groups.get(key) ?? []
    list.push(r)
    groups.set(key, list)
  }

  const sortedGroups = [...groups.entries()].sort(
    (a, b) => b[1].length - a[1].length,
  )

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Tax Filings — by stage"
        subtitle={`${rows.length.toLocaleString("en-IN")} filing${rows.length === 1 ? "" : "s"} across ${sortedGroups.length} stage${sortedGroups.length === 1 ? "" : "s"}`}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No tax filings yet"
          description="Add a filing to start tracking LLC tax submissions."
        />
      ) : (
        <div className="space-y-4">
          {sortedGroups.map(([stage, items]) => (
            <DetailCard key={stage} title={`${stage} (${items.length})`}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>LLC Name</TableHead>
                    <TableHead>Main Entity</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead className="w-[100px]">Filing Done</TableHead>
                    <TableHead className="text-right w-[140px]">
                      Amount Received
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((r) => (
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
                      <TableCell className="text-sm text-muted-foreground">
                        {r.filing_done ? "Yes" : "No"}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold tabular-nums">
                        {formatINR(r.amount_received)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DetailCard>
          ))}
        </div>
      )}
    </div>
  )
}
