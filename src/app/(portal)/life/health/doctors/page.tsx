import { Stethoscope, Calendar, CalendarClock, Phone } from "lucide-react"
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
export const metadata = { title: "Doctors — Life | Suprans" }

interface DoctorRow {
  id: string
  name: string | null
  speciality: string | null
  hospital: string | null
  next_appointment: string | null
  phone: string | null
  last_visit: string | null
}

async function fetchDoctors() {
  const { data, error } = await supabaseLife
    .from("doctors")
    .select("id, name, speciality, hospital, next_appointment, phone, last_visit")
    .order("last_visit", { ascending: false })
    .limit(200)
  if (error) console.error("life.doctors:", error.message)
  return (data ?? []) as DoctorRow[]
}

export default async function LifeDoctorsPage() {
  const rows = await fetchDoctors()
  const cutoff = new Date(Date.now() - 90 * 86400000)
  const recent = rows.filter((r) => {
    if (!r.last_visit) return false
    return new Date(r.last_visit) >= cutoff
  }).length
  const specialties = new Set(rows.map((r) => r.speciality).filter(Boolean)).size
  const upcoming = rows.filter((r) => {
    if (!r.next_appointment) return false
    return new Date(r.next_appointment) >= new Date()
  }).length

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Doctors"
        subtitle={`${rows.length.toLocaleString("en-IN")} doctor${rows.length === 1 ? "" : "s"}`}
        actions={
          <GenericAddLauncher
            table="doctors"
            listHref="/life/health/doctors"
            title="New doctor"
          />
        }
      />

      <KPIGrid>
        <MetricCard label="Total" value={rows.length} icon={Stethoscope} iconTone="blue" />
        <MetricCard label="Visited (3 months)" value={recent} icon={Calendar} iconTone="emerald" />
        <MetricCard label="Specialties" value={specialties} icon={Stethoscope} iconTone="violet" />
        <MetricCard label="Upcoming appointments" value={upcoming} icon={CalendarClock} iconTone="amber" />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="No doctors saved"
          description="Build your medical bench — GP, specialists, dentist. When you need them, the search shouldn't start from zero."
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Speciality</TableHead>
                <TableHead>Hospital</TableHead>
                <TableHead>Next appointment</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Last visit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-sm">{r.name ?? "—"}</TableCell>
                  <TableCell>
                    {r.speciality ? <StatusBadge tone="blue">{r.speciality}</StatusBadge> : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.hospital ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.next_appointment)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground inline-flex items-center gap-1">
                    {r.phone ? (
                      <>
                        <Phone className="size-3.5" /> {r.phone}
                      </>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.last_visit)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
