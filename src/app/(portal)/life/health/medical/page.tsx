import { HeartPulse, Activity, Droplet, Scale } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { GenericAddLauncher } from "../../_components/GenericEditLauncher"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
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
export const metadata = { title: "Medical — Life | Suprans" }

interface VitalRow {
  id: string
  date: string | null
  weight_kg: number | null
  bp_systolic: number | null
  bp_diastolic: number | null
  heart_rate: number | null
  blood_glucose: number | null
  notes: string | null
}

async function fetchVitals() {
  const { data, error } = await supabaseLife
    .from("vital_logs")
    .select("id, date, weight_kg, bp_systolic, bp_diastolic, heart_rate, blood_glucose, notes")
    .order("date", { ascending: false })
    .limit(200)
  if (error) console.error("life.vital_logs:", error.message)
  return (data ?? []) as VitalRow[]
}

function findFirstWith<T extends keyof VitalRow>(rows: VitalRow[], key: T): VitalRow | undefined {
  return rows.find((r) => r[key] !== null && r[key] !== undefined)
}

export default async function LifeMedicalPage() {
  const rows = await fetchVitals()
  const latestWeight = findFirstWith(rows, "weight_kg")
  const latestBp = rows.find(
    (r) => r.bp_systolic !== null && r.bp_diastolic !== null,
  )
  const latestGlucose = findFirstWith(rows, "blood_glucose")

  const weightText = latestWeight?.weight_kg !== null && latestWeight?.weight_kg !== undefined
    ? `${latestWeight.weight_kg} kg`
    : "—"
  const bpText = latestBp ? `${latestBp.bp_systolic}/${latestBp.bp_diastolic}` : "—"
  const glucoseText = latestGlucose?.blood_glucose !== null && latestGlucose?.blood_glucose !== undefined
    ? `${latestGlucose.blood_glucose}`
    : "—"

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Medical"
        subtitle={`${rows.length.toLocaleString("en-IN")} vital reading${rows.length === 1 ? "" : "s"}`}
        actions={
          <GenericAddLauncher
            table="vital_logs"
            listHref="/life/health/medical"
            title="Log vitals"
          />
        }
      />

      <KPIGrid>
        <MetricCard label="Latest weight" value={weightText} icon={Scale} iconTone="blue" />
        <MetricCard label="Latest BP" value={bpText} icon={HeartPulse} iconTone="red" />
        <MetricCard label="Latest glucose" value={glucoseText} icon={Droplet} iconTone="amber" />
        <MetricCard label="All readings" value={rows.length} icon={Activity} iconTone="violet" />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={HeartPulse}
          title="No vitals recorded"
          description="Weight, BP, glucose, lipid panel — log readings whenever you take them. Trends matter more than spot values."
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Weight (kg)</TableHead>
                <TableHead className="text-right">BP</TableHead>
                <TableHead className="text-right">Heart rate</TableHead>
                <TableHead className="text-right">Glucose</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm tabular-nums">{formatDate(r.date)}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {r.weight_kg ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {r.bp_systolic !== null && r.bp_diastolic !== null
                      ? `${r.bp_systolic}/${r.bp_diastolic}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {r.heart_rate ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {r.blood_glucose ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {r.notes ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
