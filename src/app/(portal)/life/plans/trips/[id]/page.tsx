import { notFound } from "next/navigation"
import { Plane, CalendarDays, Wallet, Activity } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { formatDate, formatCurrency } from "@/lib/format"
import { GenericEditLauncher } from "../../../_components/GenericEditLauncher"

export const dynamic = "force-dynamic"

type Params = { id: string }

function diffDays(a: string | null, b: string | null): number | null {
  if (!a || !b) return null
  const da = new Date(a).getTime()
  const db = new Date(b).getTime()
  if (isNaN(da) || isNaN(db)) return null
  return Math.max(0, Math.round((db - da) / 86_400_000))
}

export default async function LifeTripDetailPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params
  const { data } = await supabaseLife
    .from("trips")
    .select(
      "id, destination, type, departure_date, return_date, status, budget, spent, notes, created_at",
    )
    .eq("id", id)
    .maybeSingle()
  if (!data) notFound()
  const trip = data as {
    id: string
    destination: string | null
    type: string | null
    departure_date: string | null
    return_date: string | null
    status: string | null
    budget: number | null
    spent: number | null
    notes: string | null
    created_at: string | null
  }

  const days = diffDays(trip.departure_date, trip.return_date)

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title={trip.destination ?? "Untitled trip"}
        subtitle={trip.type ?? undefined}
        breadcrumbs={[
          { label: "Life", href: "/life" },
          { label: "Trips", href: "/life/plans/trips" },
          { label: trip.destination ?? "Trip" },
        ]}
        actions={
          <GenericEditLauncher
            table="trips"
            row={trip}
            title="Edit trip"
            listHref="/life/plans/trips"
          />
        }
      />

      <KPIGrid>
        <MetricCard
          label="Status"
          value={trip.status ?? "—"}
          icon={Plane}
          iconTone="blue"
        />
        <MetricCard
          label="Days"
          value={days !== null ? `${days} day${days === 1 ? "" : "s"}` : "—"}
          icon={CalendarDays}
          iconTone="amber"
        />
        <MetricCard
          label="Budget vs spent"
          value={`${formatCurrency(trip.spent)} / ${formatCurrency(trip.budget)}`}
          icon={Wallet}
          iconTone="emerald"
        />
        <MetricCard
          label="Type"
          value={trip.type ?? "—"}
          icon={Activity}
          iconTone="violet"
        />
      </KPIGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <DetailCard title="Overview" className="lg:col-span-2">
          <div className="divide-y divide-border">
            <InfoRow
              label="Status"
              value={
                <StatusBadge tone={toneForStatus(trip.status)}>
                  {trip.status ?? "—"}
                </StatusBadge>
              }
            />
            <InfoRow label="Type" value={trip.type ?? "—"} />
            <InfoRow label="Departure" value={formatDate(trip.departure_date)} />
            <InfoRow label="Return" value={formatDate(trip.return_date)} />
            <InfoRow label="Budget" value={formatCurrency(trip.budget)} />
            <InfoRow label="Spent" value={formatCurrency(trip.spent)} />
            <InfoRow label="Added" value={formatDate(trip.created_at)} />
          </div>
        </DetailCard>

        <DetailCard title="Notes">
          {trip.notes ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{trip.notes}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No notes yet.</p>
          )}
        </DetailCard>
      </div>
    </div>
  )
}
