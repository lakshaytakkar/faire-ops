import Link from "next/link"
import { Plane, Ticket, Clock, Wallet } from "lucide-react"
import { supabaseGoyo } from "@/lib/supabase"
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
import { formatDateTime } from "@/lib/format"
import { GenericAddLauncher } from "../../_components/GenericEditLauncher"
import { flightStatusTone, formatINR, formatMoney } from "../../_lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Flights — Goyo | Suprans" }

interface FlightRow {
  id: string
  booking_id: string | null
  sector_from: string | null
  sector_to: string | null
  depart_at: string | null
  airline: string | null
  flight_no: string | null
  pnr: string | null
  status: string | null
  cost: number | string | null
  currency: string | null
}

interface BookingLite {
  id: string
  booking_code: string | null
}

export default async function GoyoFlightsPage() {
  const flightsRes = await supabaseGoyo
    .from("travel_flights")
    .select(
      "id, booking_id, sector_from, sector_to, depart_at, airline, flight_no, pnr, status, cost, currency",
    )
    .order("depart_at", { ascending: false, nullsFirst: false })

  if (flightsRes.error)
    console.error("goyo.travel_flights:", flightsRes.error.message)

  const flights = (flightsRes.data ?? []) as FlightRow[]

  const bookingIds = Array.from(
    new Set(flights.map((f) => f.booking_id).filter(Boolean) as string[]),
  )
  const bookingsRes = bookingIds.length
    ? await supabaseGoyo
        .from("bookings")
        .select("id, booking_code")
        .in("id", bookingIds)
    : { data: [] as BookingLite[] }
  const bookingCode = new Map(
    ((bookingsRes.data ?? []) as BookingLite[]).map((b) => [
      b.id,
      b.booking_code,
    ]),
  )

  const ticketed = flights.filter((f) => f.status === "ticketed").length

  const now = Date.now()
  const SEVEN_D = 7 * 24 * 60 * 60 * 1000
  const upcoming7 = flights.filter((f) => {
    if (!f.depart_at) return false
    const t = new Date(f.depart_at).getTime()
    return !Number.isNaN(t) && t >= now && t - now <= SEVEN_D
  }).length

  const inrSpend = flights
    .filter((f) => (f.currency ?? "INR") === "INR")
    .reduce((s, f) => s + Number(f.cost ?? 0), 0)

  const otherCcyTotals = new Map<string, number>()
  for (const f of flights) {
    const ccy = f.currency
    if (!ccy || ccy === "INR") continue
    otherCcyTotals.set(
      ccy,
      (otherCcyTotals.get(ccy) ?? 0) + Number(f.cost ?? 0),
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Flights"
        subtitle={`${flights.length.toLocaleString("en-IN")} flight${flights.length === 1 ? "" : "s"}`}
        actions={
          <GenericAddLauncher
            table="travel_flights"
            listHref="/goyo/travel/flights"
            title="New flight"
            size="lg"
          />
        }
      />

      <KPIGrid>
        <MetricCard
          label="Total"
          value={flights.length.toLocaleString("en-IN")}
          icon={Plane}
          iconTone="blue"
        />
        <MetricCard
          label="Ticketed"
          value={ticketed.toLocaleString("en-IN")}
          icon={Ticket}
          iconTone="emerald"
        />
        <MetricCard
          label="Upcoming next 7d"
          value={upcoming7.toLocaleString("en-IN")}
          icon={Clock}
          iconTone="amber"
        />
        <MetricCard
          label="Total INR spend"
          value={formatINR(inrSpend)}
          icon={Wallet}
          iconTone="violet"
        />
      </KPIGrid>

      {otherCcyTotals.size > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...otherCcyTotals.entries()].map(([ccy, total]) => (
            <MetricCard
              key={ccy}
              label={`Spend (${ccy})`}
              value={formatMoney(total, ccy)}
              icon={Wallet}
              iconTone="slate"
            />
          ))}
        </div>
      )}

      <DetailCard title="All flights">
        {flights.length === 0 ? (
          <EmptyState
            icon={Plane}
            title="No flights yet"
            description="Add a flight to start tracking sectors, PNRs, and costs."
          />
        ) : (
          <Card className="p-0" size="sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Sector</TableHead>
                  <TableHead>Airline · Flight</TableHead>
                  <TableHead className="w-[120px]">PNR</TableHead>
                  <TableHead className="w-[180px]">Departure</TableHead>
                  <TableHead className="w-[140px]">Booking</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[160px] text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flights.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="text-sm font-medium tabular-nums">
                      {(f.sector_from ?? "—") + " → " + (f.sector_to ?? "—")}
                    </TableCell>
                    <TableCell className="text-sm">
                      {[f.airline, f.flight_no].filter(Boolean).join(" · ") ||
                        "—"}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {f.pnr ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">
                      {formatDateTime(f.depart_at)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {f.booking_id ? (
                        <Link
                          href={`/goyo/bookings/${f.booking_id}`}
                          className="font-medium hover:underline"
                        >
                          {bookingCode.get(f.booking_id) ??
                            f.booking_id.slice(0, 8)}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={flightStatusTone(f.status)}>
                        {f.status ?? "—"}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums">
                      {f.cost !== null
                        ? formatMoney(Number(f.cost), f.currency)
                        : "—"}
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
