import Link from "next/link"
import { Hourglass, Clock, CalendarDays, UserCircle } from "lucide-react"
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
import { formatDate } from "@/lib/format"
import { GenericAddLauncher } from "../../_components/GenericEditLauncher"
import { llcStatusTone, planTone } from "../../_lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Clients in Onboarding — Legal | Suprans" }

interface ClientRow {
  id: string
  client_code: string | null
  client_name: string | null
  plan: string | null
  llc_status: string | null
  date_of_payment: string | null
}

export default async function LegalOnboardingClientsPage() {
  const { data, error } = await supabaseLegal
    .from("clients")
    .select(
      "id, client_code, client_name, plan, llc_status, date_of_payment",
    )
    .in("llc_status", ["Pending", "Processing"])
    .order("created_at", { ascending: false })
  if (error) console.error("legal.clients onboarding:", error.message)
  const rows = (data ?? []) as ClientRow[]

  const pendingCount = rows.filter(
    (r) => r.llc_status === "Pending",
  ).length
  const processingCount = rows.filter(
    (r) => r.llc_status === "Processing",
  ).length

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Clients in Onboarding"
        subtitle={`${rows.length.toLocaleString("en-IN")} client${rows.length === 1 ? "" : "s"} with LLC pending or processing`}
        actions={
          <GenericAddLauncher
            table="clients"
            listHref="/legal/clients/onboarding"
            title="New client"
            size="lg"
            defaults={{ llc_status: "Pending" }}
          />
        }
      />

      <KPIGrid>
        <MetricCard
          label="Total onboarding"
          value={rows.length}
          icon={Hourglass}
          iconTone="amber"
        />
        <MetricCard
          label="Pending"
          value={pendingCount}
          icon={Clock}
          iconTone="slate"
        />
        <MetricCard
          label="Processing"
          value={processingCount}
          icon={CalendarDays}
          iconTone="blue"
        />
        <MetricCard
          label="Total clients"
          value={rows.length}
          icon={UserCircle}
          iconTone="violet"
        />
      </KPIGrid>

      <DetailCard title="Onboarding clients">
        {rows.length === 0 ? (
          <EmptyState
            icon={Hourglass}
            title="No onboarding clients"
            description="Clients with Pending or Processing LLC status will appear here."
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
                  <TableHead className="w-[140px]">Date of Payment</TableHead>
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
                    <TableCell className="text-sm text-muted-foreground tabular-nums">
                      {formatDate(r.date_of_payment)}
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
