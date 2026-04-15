import Link from "next/link"
import { ScrollText, CheckCircle2, Clock, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { supabaseHq } from "@/lib/supabase"
import { formatCurrency, formatDate } from "@/lib/format"

// HQ → Compliance → Contracts (list). See suprans-hq-full-spec.md §8.4.

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Contracts — HQ | Suprans",
}

interface ContractRow {
  id: string
  name: string | null
  parties: string | null
  contract_type: string | null
  start_date: string | null
  end_date: string | null
  value: number | null
  currency: string | null
  status: string | null
  owner: string | null
  tags: string[] | null
}

async function fetchContracts(): Promise<ContractRow[]> {
  const { data } = await supabaseHq
    .from("contracts")
    .select(
      "id, name, parties, contract_type, start_date, end_date, value, currency, status, owner, tags",
    )
    .order("end_date", { ascending: true })
  return (data ?? []) as ContractRow[]
}

export default async function HqContractsPage() {
  const contracts = await fetchContracts()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayMs = today.getTime()

  const total = contracts.length
  const active = contracts.filter((c) => c.status === "active").length
  const pendingSig = contracts.filter((c) => c.status === "pending_signature").length
  const expiring30 = contracts.filter((c) => {
    if (!c.end_date) return false
    const ms = new Date(c.end_date).getTime() - todayMs
    return ms >= 0 && ms <= 30 * 24 * 60 * 60 * 1000
  }).length

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Contracts"
        subtitle="Client, vendor and internal agreements."
        actions={
          <Button variant="outline" size="sm" disabled>
            + New Contract
          </Button>
        }
      />

      <KPIGrid>
        <MetricCard label="Total" value={total} icon={ScrollText} iconTone="blue" />
        <MetricCard label="Active" value={active} icon={CheckCircle2} iconTone="emerald" />
        <MetricCard
          label="Pending Signature"
          value={pendingSig}
          icon={Clock}
          iconTone="amber"
        />
        <MetricCard
          label="Expiring ≤30d"
          value={expiring30}
          icon={AlertTriangle}
          iconTone="red"
        />
      </KPIGrid>

      <DetailCard title="All contracts">
        {contracts.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="No contracts yet"
            description="Create your first contract to track signatures, renewals and expiries here."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contract Name</TableHead>
                <TableHead>Parties</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Owner</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link
                      href={`/hq/compliance/contracts/${c.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {c.name ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{c.parties ?? "—"}</TableCell>
                  <TableCell className="text-sm">{c.contract_type ?? "—"}</TableCell>
                  <TableCell className="text-sm">{formatDate(c.start_date)}</TableCell>
                  <TableCell className="text-sm">{formatDate(c.end_date)}</TableCell>
                  <TableCell className="text-sm">
                    {c.value !== null
                      ? formatCurrency(
                          c.value,
                          c.currency === "INR" || !c.currency ? "₹" : `${c.currency} `,
                        )
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {c.status ? (
                      <StatusBadge tone={toneForStatus(c.status)}>{c.status}</StatusBadge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.owner ?? "—"}
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
