import { notFound } from "next/navigation"
import { Car, Shield, Wrench, Wallet } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { formatDate, formatCurrency, formatNumber } from "@/lib/format"
import { GenericEditLauncher } from "../../../_components/GenericEditLauncher"
import { VehicleServiceLauncher } from "./VehicleServiceLauncher"

export const dynamic = "force-dynamic"

type Params = { id: string }

export default async function LifeVehicleDetailPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params
  const [vehicleRes, logsRes] = await Promise.all([
    supabaseLife
      .from("vehicles")
      .select(
        "id, make, model, year, reg_number, fuel_type, insurance_expiry, puc_expiry, service_due, loan_status, notes, created_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabaseLife
      .from("vehicle_service_logs")
      .select("id, date, odometer, service_type, cost, workshop, notes")
      .eq("vehicle_id", id)
      .order("date", { ascending: false }),
  ])

  if (!vehicleRes.data) notFound()
  const v = vehicleRes.data as {
    id: string
    make: string | null
    model: string | null
    year: number | null
    reg_number: string | null
    fuel_type: string | null
    insurance_expiry: string | null
    puc_expiry: string | null
    service_due: string | null
    loan_status: string | null
    notes: string | null
    created_at: string | null
  }
  const logs = (logsRes.data ?? []) as Array<{
    id: string
    date: string | null
    odometer: number | null
    service_type: string | null
    cost: number | null
    workshop: string | null
    notes: string | null
  }>

  const totalSpent = logs.reduce((sum, l) => sum + (Number(l.cost) || 0), 0)

  const title = [v.make, v.model].filter(Boolean).join(" ") || "Vehicle"

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title={title}
        subtitle={v.reg_number ?? undefined}
        breadcrumbs={[
          { label: "Life", href: "/life" },
          { label: "Vehicles", href: "/life/plans/vehicles" },
          { label: title },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <VehicleServiceLauncher vehicleId={v.id} />
            <GenericEditLauncher
              table="vehicles"
              row={v}
              title="Edit vehicle"
              listHref="/life/plans/vehicles"
            />
          </div>
        }
      />

      <KPIGrid>
        <MetricCard
          label="Registration"
          value={v.reg_number ?? "—"}
          icon={Car}
          iconTone="blue"
        />
        <MetricCard
          label="Insurance expiry"
          value={formatDate(v.insurance_expiry)}
          icon={Shield}
          iconTone="amber"
        />
        <MetricCard
          label="Service due"
          value={formatDate(v.service_due)}
          icon={Wrench}
          iconTone="violet"
        />
        <MetricCard
          label="Total on service"
          value={formatCurrency(totalSpent)}
          icon={Wallet}
          iconTone="emerald"
        />
      </KPIGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <DetailCard title="Vehicle info" className="lg:col-span-2">
          <div className="divide-y divide-border">
            <InfoRow label="Make" value={v.make ?? "—"} />
            <InfoRow label="Model" value={v.model ?? "—"} />
            <InfoRow label="Year" value={v.year ?? "—"} />
            <InfoRow label="Fuel" value={v.fuel_type ?? "—"} />
            <InfoRow label="PUC expiry" value={formatDate(v.puc_expiry)} />
            <InfoRow label="Loan status" value={v.loan_status ?? "—"} />
            <InfoRow label="Added" value={formatDate(v.created_at)} />
          </div>
        </DetailCard>

        <DetailCard title="Notes">
          {v.notes ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{v.notes}</p>
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
        </DetailCard>
      </div>

      <DetailCard title={`Service log (${logs.length})`}>
        {logs.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title="No service logs"
            description="Log the first service to start tracking cost per km."
          />
        ) : (
          <ul className="divide-y divide-border">
            {logs.map((l) => (
              <li key={l.id} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">
                      {l.service_type ?? "Service"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(l.date)}
                      {l.workshop ? ` • ${l.workshop}` : ""}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold tabular-nums">
                      {formatCurrency(l.cost)}
                    </div>
                    {l.odometer !== null && (
                      <div className="text-sm text-muted-foreground tabular-nums">
                        {formatNumber(l.odometer)} km
                      </div>
                    )}
                  </div>
                </div>
                {l.notes && (
                  <p className="mt-1.5 text-sm text-muted-foreground">{l.notes}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </DetailCard>
    </div>
  )
}
