import { Plane, MapPin, Lightbulb, CheckCircle2 } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { GenericAddLauncher } from "../../_components/GenericEditLauncher"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
import { TripsClient, type TripRow } from "./trips-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Trips — Life | Suprans" }

async function fetchTrips() {
  const { data, error } = await supabaseLife
    .from("trips")
    .select("id, destination, type, status, departure_date, return_date, budget, spent")
    .order("departure_date", { ascending: false, nullsFirst: false })
    .limit(200)
  if (error) console.error("life.trips:", error.message)
  return (data ?? []) as TripRow[]
}

export default async function LifeTripsPage() {
  const rows = await fetchTrips()
  const idea = rows.filter((r) => r.status === "idea").length
  const planning = rows.filter((r) => r.status === "planning").length
  const booked = rows.filter((r) => r.status === "booked").length
  const completed = rows.filter((r) => r.status === "completed").length

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Trips"
        subtitle={`${rows.length.toLocaleString("en-IN")} trip${rows.length === 1 ? "" : "s"}`}
        actions={
          <GenericAddLauncher
            table="trips"
            listHref="/life/plans/trips"
            title="New trip"
          />
        }
      />

      <KPIGrid>
        <MetricCard label="Ideas" value={idea} icon={Lightbulb} iconTone="amber" />
        <MetricCard label="Planning" value={planning} icon={MapPin} iconTone="blue" />
        <MetricCard label="Booked" value={booked} icon={Plane} iconTone="violet" />
        <MetricCard label="Completed" value={completed} icon={CheckCircle2} iconTone="emerald" />
      </KPIGrid>

      {rows.length === 0 ? (
        <EmptyState
          icon={Plane}
          title="No trips yet"
          description="Capture every place that catches your eye — from idea to itinerary. Future-you will thank past-you."
        />
      ) : (
        <TripsClient rows={rows} />
      )}
    </div>
  )
}
