import Link from "next/link"
import { Car, Wrench, ShieldAlert, Hash } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { GenericAddLauncher } from "../../_components/GenericEditLauncher"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Vehicles — Life | Suprans" }

interface VehicleRow {
  id: string
  make: string | null
  model: string | null
  year: number | null
  reg_number: string | null
  fuel_type: string | null
  insurance_expiry: string | null
  puc_expiry: string | null
  service_due: string | null
}

async function fetchVehicles() {
  const { data, error } = await supabaseLife
    .from("vehicles")
    .select("id, make, model, year, reg_number, fuel_type, insurance_expiry, puc_expiry, service_due")
    .order("make", { ascending: true })
    .limit(200)
  if (error) console.error("life.vehicles:", error.message)
  return (data ?? []) as VehicleRow[]
}

export default async function LifeVehiclesPage() {
  const rows = await fetchVehicles()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const in60 = new Date(today.getTime() + 60 * 86400000)
  const insuranceExpiring = rows.filter((r) => {
    if (!r.insurance_expiry) return false
    const d = new Date(r.insurance_expiry)
    return d <= in60
  }).length
  const serviceDue = rows.filter((r) => {
    if (!r.service_due) return false
    const d = new Date(r.service_due)
    return d <= in60
  }).length
  const pucExpiring = rows.filter((r) => {
    if (!r.puc_expiry) return false
    const d = new Date(r.puc_expiry)
    return d <= in60
  }).length

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Vehicles"
        subtitle={`${rows.length.toLocaleString("en-IN")} vehicle${rows.length === 1 ? "" : "s"}`}
        actions={
          <GenericAddLauncher
            table="vehicles"
            listHref="/life/plans/vehicles"
            title="New vehicle"
          />
        }
      />

      <KPIGrid>
        <MetricCard label="Total" value={rows.length} icon={Car} iconTone="blue" />
        <MetricCard label="Insurance expiring (60d)" value={insuranceExpiring} icon={ShieldAlert} iconTone="red" />
        <MetricCard label="Service due (60d)" value={serviceDue} icon={Wrench} iconTone="amber" />
        <MetricCard label="PUC expiring (60d)" value={pucExpiring} icon={Hash} iconTone="violet" />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={Car}
          title="No vehicles yet"
          description="Cars, bikes — log each one with insurance and service dates so renewals never surprise you."
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Make / model</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Reg #</TableHead>
                <TableHead>Fuel</TableHead>
                <TableHead>Insurance</TableHead>
                <TableHead>Service due</TableHead>
                <TableHead>PUC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-sm">
                    <Link
                      href={`/life/plans/vehicles/${r.id}`}
                      className="hover:text-primary"
                    >
                      {[r.make, r.model].filter(Boolean).join(" ") || "—"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground tabular-nums">
                    {r.year ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.reg_number ?? "—"}</TableCell>
                  <TableCell>
                    {r.fuel_type ? <StatusBadge tone="slate">{r.fuel_type}</StatusBadge> : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.insurance_expiry)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.service_due)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.puc_expiry)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
