import Link from "next/link"
import { UserCircle, CheckCircle2, Package, Globe } from "lucide-react"
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
import { GenericAddLauncher } from "../../_components/GenericEditLauncher"
import { llcStatusTone, planTone, formatINR } from "../../_lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Healthy Clients — Legal | Suprans" }

interface ClientRow {
  id: string
  client_code: string | null
  client_name: string | null
  plan: string | null
  llc_status: string | null
  country: string | null
  amount_received: number | null
}

export default async function LegalHealthyClientsPage() {
  const { data, error } = await supabaseLegal
    .from("clients")
    .select(
      "id, client_code, client_name, plan, llc_status, country, amount_received",
    )
    .eq("client_health", "Healthy")
    .order("created_at", { ascending: false })
  if (error) console.error("legal.clients healthy:", error.message)
  const rows = (data ?? []) as ClientRow[]

  const deliveredCount = rows.filter(
    (r) => r.llc_status === "Delivered",
  ).length
  const uniqueCountries = new Set(rows.map((r) => r.country).filter(Boolean))
    .size
  const totalReceived = rows.reduce(
    (s, r) => s + (Number(r.amount_received) || 0),
    0,
  )

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Healthy Clients"
        subtitle={`${rows.length.toLocaleString("en-IN")} healthy client${rows.length === 1 ? "" : "s"}`}
        actions={
          <GenericAddLauncher
            table="clients"
            listHref="/legal/clients/active"
            title="New client"
            size="lg"
            defaults={{ client_health: "Healthy" }}
          />
        }
      />

      <KPIGrid>
        <MetricCard
          label="Healthy"
          value={rows.length}
          icon={CheckCircle2}
          iconTone="emerald"
        />
        <MetricCard
          label="LLC Delivered"
          value={deliveredCount}
          icon={Package}
          iconTone="blue"
        />
        <MetricCard
          label="Countries"
          value={uniqueCountries}
          icon={Globe}
          iconTone="violet"
        />
        <MetricCard
          label="Total received"
          value={formatINR(totalReceived)}
          icon={UserCircle}
          iconTone="amber"
        />
      </KPIGrid>

      <DetailCard title="Healthy clients">
        {rows.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="No healthy clients"
            description="Clients with Healthy status will appear here."
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
