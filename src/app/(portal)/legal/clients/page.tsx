import Link from "next/link"
import { UserCircle, CheckCircle2, Package, AlertTriangle } from "lucide-react"
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
import {
  clientHealthTone,
  llcStatusTone,
  planTone,
  formatINR,
} from "../_lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Clients — Legal | Suprans" }

interface ClientRow {
  id: string
  client_code: string | null
  client_name: string | null
  plan: string | null
  llc_status: string | null
  client_health: string | null
  country: string | null
  amount_received: number | null
}

export default async function LegalClientsPage() {
  const { data, error } = await supabaseLegal
    .from("clients")
    .select(
      "id, client_code, client_name, plan, llc_status, client_health, country, amount_received",
    )
    .order("created_at", { ascending: false })
  if (error) console.error("legal.clients:", error.message)
  const rows = (data ?? []) as ClientRow[]

  const healthyCount = rows.filter(
    (r) => r.client_health === "Healthy",
  ).length
  const deliveredCount = rows.filter(
    (r) => r.llc_status === "Delivered",
  ).length
  const atRiskCount = rows.filter(
    (r) => r.client_health === "At Risk",
  ).length

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Clients"
        subtitle={`${rows.length.toLocaleString("en-IN")} client${rows.length === 1 ? "" : "s"}`}
        actions={
          <GenericAddLauncher
            table="clients"
            listHref="/legal/clients"
            title="New client"
            size="lg"
          />
        }
      />

      <KPIGrid>
        <MetricCard
          label="Total"
          value={rows.length}
          icon={UserCircle}
          iconTone="slate"
        />
        <MetricCard
          label="Healthy"
          value={healthyCount}
          icon={CheckCircle2}
          iconTone="emerald"
          href="/legal/clients/active"
        />
        <MetricCard
          label="Delivered"
          value={deliveredCount}
          icon={Package}
          iconTone="blue"
        />
        <MetricCard
          label="At Risk"
          value={atRiskCount}
          icon={AlertTriangle}
          iconTone="amber"
        />
      </KPIGrid>

      <DetailCard title="All clients">
        {rows.length === 0 ? (
          <EmptyState
            icon={UserCircle}
            title="No clients yet"
            description="Add your first client to start tracking LLC filings, payments, and onboarding."
          />
        ) : (
          <Card className="overflow-hidden p-0 gap-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[100px]">Plan</TableHead>
                  <TableHead className="w-[120px]">LLC Status</TableHead>
                  <TableHead className="w-[110px]">Health</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead className="text-right w-[140px]">
                    Amount Received
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">
                      {r.client_code ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/legal/clients/${r.id}`}
                        className="hover:text-primary font-medium"
                      >
                        {r.client_name ?? "—"}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={planTone(r.plan)}>
                        {r.plan ?? "—"}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={llcStatusTone(r.llc_status)}>
                        {r.llc_status ?? "—"}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={clientHealthTone(r.client_health)}>
                        {r.client_health ?? "—"}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.country ?? "—"}
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
