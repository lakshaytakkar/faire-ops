import Link from "next/link"
import { ScrollText, CheckCircle2, AlertTriangle, Clock, Files } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { supabaseHq } from "@/lib/supabase"
import { formatCurrency, formatDate } from "@/lib/format"

// HQ → Assets → Vendor Contracts (list). Spec §5.3. Server-rendered.
// Table is empty today so the page shows EmptyState but the full skeleton
// is in place.

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Vendor Contracts — Assets | HQ | Suprans",
}

const CONTRACT_STATUS_TONE: Record<string, StatusTone> = {
  active: "emerald",
  expiring: "amber",
  expired: "red",
  cancelled: "slate",
  pending: "amber",
  draft: "slate",
}

interface ContractRow {
  id: string
  vendor: string | null
  service: string | null
  contract_type: string | null
  start_date: string | null
  end_date: string | null
  value: number | null
  currency: string | null
  status: string | null
  owner: string | null
  document_url: string | null
}

function currencySymbol(code: string | null | undefined): string {
  if (!code) return "₹"
  const c = code.toUpperCase()
  if (c === "INR") return "₹"
  if (c === "USD") return "$"
  if (c === "EUR") return "€"
  if (c === "GBP") return "£"
  return `${c} `
}

function daysUntil(d: string | null): number | null {
  if (!d) return null
  const target = new Date(d)
  if (Number.isNaN(target.getTime())) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
}

async function fetchContracts(): Promise<ContractRow[]> {
  const { data } = await supabaseHq
    .from("vendor_contracts")
    .select(
      "id, vendor, service, contract_type, start_date, end_date, value, currency, status, owner, document_url",
    )
    .order("end_date", { ascending: true, nullsFirst: false })
  return (data ?? []) as ContractRow[]
}

export default async function HqVendorContractsPage() {
  const contracts = await fetchContracts()

  const total = contracts.length
  const active = contracts.filter((c) => c.status === "active").length
  const expiringSoon = contracts.filter((c) => {
    const days = daysUntil(c.end_date)
    return days !== null && days >= 0 && days <= 30
  }).length
  const expired = contracts.filter((c) => {
    const days = daysUntil(c.end_date)
    return days !== null && days < 0
  }).length

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Vendor Contracts"
        subtitle="All vendor agreements, renewals, and contract owners."
        actions={
          <Button size="sm" disabled>
            + Add Contract
          </Button>
        }
      />

      <KPIGrid>
        <MetricCard
          label="Active"
          value={active}
          icon={CheckCircle2}
          iconTone="emerald"
        />
        <MetricCard
          label="Expiring ≤ 30d"
          value={expiringSoon}
          icon={AlertTriangle}
          iconTone="amber"
        />
        <MetricCard
          label="Expired"
          value={expired}
          icon={Clock}
          iconTone="red"
        />
        <MetricCard label="Total" value={total} icon={Files} iconTone="blue" />
      </KPIGrid>

      <DetailCard title="All contracts">
        {contracts.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="No vendor contracts yet"
            description="Add your first vendor agreement to track renewals, owners, and expiry dates."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Service</TableHead>
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
                <TableRow key={c.id} className="cursor-pointer">
                  <TableCell className="font-medium">
                    <Link
                      href={`/hq/assets/contracts/${c.id}`}
                      className="text-foreground hover:underline"
                    >
                      {c.vendor ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{c.service ?? "—"}</TableCell>
                  <TableCell className="text-sm capitalize">
                    {c.contract_type ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(c.start_date)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(c.end_date)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatCurrency(c.value, currencySymbol(c.currency))}
                  </TableCell>
                  <TableCell>
                    {c.status ? (
                      <StatusBadge
                        tone={CONTRACT_STATUS_TONE[c.status] ?? "slate"}
                      >
                        {c.status}
                      </StatusBadge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{c.owner ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DetailCard>
    </div>
  )
}
