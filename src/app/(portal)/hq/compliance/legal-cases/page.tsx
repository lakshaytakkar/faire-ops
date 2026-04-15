import Link from "next/link"
import { Gavel, AlertTriangle, AlertOctagon, Flame, CircleDot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, toneForStatus, type StatusTone } from "@/components/shared/status-badge"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { supabaseHq } from "@/lib/supabase"
import { formatDate } from "@/lib/format"

// HQ → Compliance → Legal Cases (list). See suprans-hq-full-spec.md §8.5.

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Legal Cases — HQ | Suprans",
}

interface LegalCaseRow {
  id: string
  case_code: string | null
  description: string | null
  court: string | null
  status: string | null
  opposing_party: string | null
  lawyer: string | null
  urgency: string | null
  next_hearing_at: string | null
}

const URGENCY_TONE: Record<string, StatusTone> = {
  low: "slate",
  medium: "blue",
  high: "amber",
  critical: "red",
}

async function fetchCases(): Promise<LegalCaseRow[]> {
  const { data } = await supabaseHq
    .from("legal_cases")
    .select(
      "id, case_code, description, court, status, opposing_party, lawyer, urgency, next_hearing_at",
    )
    .order("next_hearing_at", { ascending: true })
  return (data ?? []) as LegalCaseRow[]
}

export default async function HqLegalCasesPage() {
  const cases = await fetchCases()

  const counts = {
    low: cases.filter((c) => c.urgency === "low").length,
    medium: cases.filter((c) => c.urgency === "medium").length,
    high: cases.filter((c) => c.urgency === "high").length,
    critical: cases.filter((c) => c.urgency === "critical").length,
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Legal Cases"
        subtitle="Active legal matters across the group."
        actions={
          <Button variant="outline" size="sm" disabled>
            + Add Case
          </Button>
        }
      />

      <KPIGrid>
        <MetricCard label="Low" value={counts.low} icon={CircleDot} iconTone="slate" />
        <MetricCard label="Medium" value={counts.medium} icon={AlertTriangle} iconTone="blue" />
        <MetricCard label="High" value={counts.high} icon={Flame} iconTone="amber" />
        <MetricCard label="Critical" value={counts.critical} icon={AlertOctagon} iconTone="red" />
      </KPIGrid>

      <DetailCard title="All cases">
        {cases.length === 0 ? (
          <EmptyState
            icon={Gavel}
            title="No legal cases on record"
            description="Active and historical cases will appear here once added."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Court</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Opposing Party</TableHead>
                <TableHead>Our Lawyer</TableHead>
                <TableHead>Next Hearing</TableHead>
                <TableHead>Urgency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link
                      href={`/hq/compliance/legal-cases/${c.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {c.case_code ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm max-w-sm truncate">
                    {c.description ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">{c.court ?? "—"}</TableCell>
                  <TableCell>
                    {c.status ? (
                      <StatusBadge tone={toneForStatus(c.status)}>{c.status}</StatusBadge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{c.opposing_party ?? "—"}</TableCell>
                  <TableCell className="text-sm">{c.lawyer ?? "—"}</TableCell>
                  <TableCell className="text-sm">
                    {formatDate(c.next_hearing_at)}
                  </TableCell>
                  <TableCell>
                    {c.urgency ? (
                      <StatusBadge tone={URGENCY_TONE[c.urgency] ?? "slate"}>
                        {c.urgency}
                      </StatusBadge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DetailCard>
    </div>
  )
}
