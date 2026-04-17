import { ShieldCheck, CheckCircle2, Hourglass, XCircle } from "lucide-react"
import { supabaseGoyo } from "@/lib/supabase"
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
import { formatDate } from "@/lib/format"
import { visaStatusTone } from "../../_lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Visas — in progress | Goyo | Suprans" }

interface VisaRow {
  id: string
  booking_id: string | null
  traveller_name: string | null
  country: string | null
  visa_type: string | null
  submission_date: string | null
  expected_date: string | null
  handler: string | null
  status: string | null
}

export default async function GoyoVisasInProgressPage() {
  const allRes = await supabaseGoyo
    .from("visas")
    .select(
      "id, booking_id, traveller_name, country, visa_type, submission_date, expected_date, handler, status",
    )

  const all = (allRes.data ?? []) as VisaRow[]
  const visas = all
    .filter((v) => v.status === "pending" || v.status === "submitted")
    .sort((a, b) => {
      const ta = a.expected_date
        ? new Date(a.expected_date).getTime()
        : Infinity
      const tb = b.expected_date
        ? new Date(b.expected_date).getTime()
        : Infinity
      return ta - tb
    })

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const isThisMonth = (iso: string | null) => {
    if (!iso) return false
    const d = new Date(iso)
    return d.getFullYear() === year && d.getMonth() === month
  }

  const approvedThisMonth = all.filter(
    (v) => v.status === "approved" && isThisMonth(v.expected_date),
  ).length
  const rejected = all.filter((v) => v.status === "rejected").length

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Visas — in progress"
        subtitle={`${visas.length.toLocaleString("en-IN")} pending or submitted`}
      />

      <KPIGrid>
        <MetricCard
          label="Total"
          value={all.length.toLocaleString("en-IN")}
          icon={ShieldCheck}
          iconTone="blue"
        />
        <MetricCard
          label="Approved this month"
          value={approvedThisMonth.toLocaleString("en-IN")}
          icon={CheckCircle2}
          iconTone="emerald"
        />
        <MetricCard
          label="Pending + submitted"
          value={visas.length.toLocaleString("en-IN")}
          icon={Hourglass}
          iconTone="amber"
        />
        <MetricCard
          label="Rejected"
          value={rejected.toLocaleString("en-IN")}
          icon={XCircle}
          iconTone="red"
        />
      </KPIGrid>

      <DetailCard title="In-progress visas">
        {visas.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Nothing in progress"
            description="All visas are either approved, rejected, or on arrival."
          />
        ) : (
          <Card className="p-0" size="sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Traveller</TableHead>
                  <TableHead className="w-[140px]">Country</TableHead>
                  <TableHead className="w-[160px]">Type</TableHead>
                  <TableHead className="w-[140px]">Submitted</TableHead>
                  <TableHead className="w-[140px]">Expected</TableHead>
                  <TableHead className="w-[140px]">Handler</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visas.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="text-sm font-medium">
                      {v.traveller_name ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {v.country ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {v.visa_type ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">
                      {formatDate(v.submission_date)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">
                      {formatDate(v.expected_date)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {v.handler ?? "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={visaStatusTone(v.status)}>
                        {v.status ?? "—"}
                      </StatusBadge>
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
