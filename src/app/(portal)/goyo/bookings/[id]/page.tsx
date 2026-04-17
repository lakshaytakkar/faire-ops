import Link from "next/link"
import { notFound } from "next/navigation"
import { Wallet, CreditCard, Scale, Users } from "lucide-react"
import { supabaseGoyo } from "@/lib/supabase"
import { BackLink } from "@/components/shared/back-link"
import { HeroCard } from "@/components/shared/hero-card"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { StatusBadge } from "@/components/shared/status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate } from "@/lib/format"
import { GenericEditLauncher } from "../../_components/GenericEditLauncher"
import {
  formatMoney,
  bookingStatusTone,
  flightStatusTone,
  hotelStatusTone,
  visaStatusTone,
  itineraryStatusTone,
} from "../../_lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Booking — Goyo | Suprans" }

interface BookingRow {
  id: string
  booking_code: string | null
  client_id: string | null
  tour_id: string | null
  departure_date: string | null
  return_date: string | null
  adult_count: number | null
  child_count: number | null
  status: string | null
  total_amount: number | null
  paid_amount: number | null
  currency: string | null
  notes: string | null
  created_at: string | null
}

interface ClientRow {
  id: string
  name: string | null
}

interface TourRow {
  id: string
  name: string | null
}

interface FlightRow {
  id: string
  sector_from: string | null
  sector_to: string | null
  depart_at: string | null
  airline: string | null
  flight_no: string | null
  pnr: string | null
  status: string | null
  cost: number | null
  currency: string | null
}

interface HotelRow {
  id: string
  hotel_name: string | null
  city: string | null
  check_in: string | null
  check_out: string | null
  room_type: string | null
  rooms: number | null
  pax: number | null
  status: string | null
  cost: number | null
  currency: string | null
}

interface VisaRow {
  id: string
  traveller_name: string | null
  country: string | null
  visa_type: string | null
  expected_date: string | null
  status: string | null
}

interface PaymentRow {
  id: string
  amount: number | null
  currency: string | null
  received_at: string | null
  reference: string | null
  method: string | null
}

interface ItineraryRow {
  id: string
  title: string | null
  day_count: number | null
  status: string | null
  start_date: string | null
  end_date: string | null
  pdf_url: string | null
}

export default async function GoyoBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const bookingRes = await supabaseGoyo
    .from("bookings")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (bookingRes.error)
    console.error("goyo.bookings:", bookingRes.error.message)
  if (!bookingRes.data) notFound()
  const booking = bookingRes.data as BookingRow

  const [clientRes, tourRes, flightsRes, hotelsRes, visasRes, paymentsRes, itinerariesRes] =
    await Promise.all([
      booking.client_id
        ? supabaseGoyo
            .from("clients")
            .select("id, name")
            .eq("id", booking.client_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      booking.tour_id
        ? supabaseGoyo
            .from("tours")
            .select("id, name")
            .eq("id", booking.tour_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabaseGoyo
        .from("travel_flights")
        .select(
          "id, sector_from, sector_to, depart_at, airline, flight_no, pnr, status, cost, currency",
        )
        .eq("booking_id", id)
        .order("depart_at", { ascending: true, nullsFirst: false }),
      supabaseGoyo
        .from("travel_hotels")
        .select(
          "id, hotel_name, city, check_in, check_out, room_type, rooms, pax, status, cost, currency",
        )
        .eq("booking_id", id)
        .order("check_in", { ascending: true, nullsFirst: false }),
      supabaseGoyo
        .from("visas")
        .select(
          "id, traveller_name, country, visa_type, expected_date, status",
        )
        .eq("booking_id", id)
        .order("expected_date", { ascending: true, nullsFirst: false }),
      supabaseGoyo
        .from("payments")
        .select("id, amount, currency, received_at, reference, method")
        .eq("booking_id", id)
        .order("received_at", { ascending: false, nullsFirst: false }),
      supabaseGoyo
        .from("itineraries")
        .select("id, title, day_count, status, start_date, end_date, pdf_url")
        .eq("booking_id", id)
        .order("start_date", { ascending: true, nullsFirst: false }),
    ])

  const client = (clientRes.data ?? null) as ClientRow | null
  const tour = (tourRes.data ?? null) as TourRow | null
  const flights = (flightsRes.data ?? []) as FlightRow[]
  const hotels = (hotelsRes.data ?? []) as HotelRow[]
  const visas = (visasRes.data ?? []) as VisaRow[]
  const payments = (paymentsRes.data ?? []) as PaymentRow[]
  const itineraries = (itinerariesRes.data ?? []) as ItineraryRow[]

  const balance =
    (Number(booking.total_amount) || 0) - (Number(booking.paid_amount) || 0)
  const pax =
    (Number(booking.adult_count) || 0) + (Number(booking.child_count) || 0)

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <BackLink href="/goyo/bookings" label="All bookings" />

      <HeroCard
        title={booking.booking_code ?? "Untitled booking"}
        subtitle={`${client?.name ?? "—"} · ${tour?.name ?? "—"}`}
        meta={
          <StatusBadge tone={bookingStatusTone(booking.status)}>
            {booking.status ?? "—"}
          </StatusBadge>
        }
        actions={
          <GenericEditLauncher
            table="bookings"
            row={booking as unknown as Record<string, unknown> & { id: string }}
            listHref="/goyo/bookings"
            title="Edit booking"
          />
        }
      />

      <KPIGrid>
        <MetricCard
          label="Total amount"
          value={formatMoney(booking.total_amount, booking.currency)}
          icon={Wallet}
          iconTone="slate"
        />
        <MetricCard
          label="Paid"
          value={formatMoney(booking.paid_amount, booking.currency)}
          icon={CreditCard}
          iconTone="emerald"
        />
        <MetricCard
          label="Balance"
          value={formatMoney(balance, booking.currency)}
          icon={Scale}
          iconTone={balance > 0 ? "red" : "slate"}
        />
        <MetricCard
          label="Travellers"
          value={pax}
          icon={Users}
          iconTone="blue"
          hint={`${booking.adult_count ?? 0} adult${(booking.adult_count ?? 0) === 1 ? "" : "s"} · ${booking.child_count ?? 0} child${(booking.child_count ?? 0) === 1 ? "" : "ren"}`}
        />
      </KPIGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <DetailCard title={`Flights (${flights.length})`}>
            {flights.length === 0 ? (
              <p className="text-sm text-muted-foreground">None yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[110px]">Sector</TableHead>
                    <TableHead>Airline / No</TableHead>
                    <TableHead className="w-[140px]">Departs</TableHead>
                    <TableHead className="w-[110px]">PNR</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead className="w-[120px] text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flights.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="text-sm font-medium tabular-nums">
                        {f.sector_from ?? "—"} → {f.sector_to ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {[f.airline, f.flight_no].filter(Boolean).join(" ") || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground tabular-nums">
                        {formatDate(f.depart_at)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {f.pnr ?? "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={flightStatusTone(f.status)}>
                          {f.status ?? "—"}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {formatMoney(f.cost, f.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DetailCard>

          <DetailCard title={`Hotels (${hotels.length})`}>
            {hotels.length === 0 ? (
              <p className="text-sm text-muted-foreground">None yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hotel</TableHead>
                    <TableHead className="w-[120px]">City</TableHead>
                    <TableHead className="w-[120px]">Check-in</TableHead>
                    <TableHead className="w-[120px]">Check-out</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead className="w-[120px] text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hotels.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="text-sm font-medium">
                        {h.hotel_name ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {h.city ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground tabular-nums">
                        {formatDate(h.check_in)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground tabular-nums">
                        {formatDate(h.check_out)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={hotelStatusTone(h.status)}>
                          {h.status ?? "—"}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {formatMoney(h.cost, h.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DetailCard>

          <DetailCard title={`Visas (${visas.length})`}>
            {visas.length === 0 ? (
              <p className="text-sm text-muted-foreground">None yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Traveller</TableHead>
                    <TableHead className="w-[120px]">Country</TableHead>
                    <TableHead className="w-[140px]">Type</TableHead>
                    <TableHead className="w-[130px]">Expected</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visas.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="text-sm font-medium">
                        {v.traveller_name ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {v.country ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {v.visa_type ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground tabular-nums">
                        {formatDate(v.expected_date)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={visaStatusTone(v.status)}>
                          {v.status ?? "—"}
                        </StatusBadge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DetailCard>
        </div>

        <div className="space-y-5">
          <DetailCard title="Overview">
            <div className="divide-y divide-border">
              <InfoRow
                label="Client"
                value={
                  client ? (
                    <Link
                      href={`/goyo/clients/${client.id}`}
                      className="hover:text-primary"
                    >
                      {client.name ?? "—"}
                    </Link>
                  ) : (
                    "—"
                  )
                }
              />
              <InfoRow label="Tour" value={tour?.name ?? "—"} />
              <InfoRow label="Departure" value={formatDate(booking.departure_date)} />
              <InfoRow label="Return" value={formatDate(booking.return_date)} />
              <InfoRow label="Adults" value={booking.adult_count ?? 0} />
              <InfoRow label="Children" value={booking.child_count ?? 0} />
              <InfoRow
                label="Currency"
                value={(booking.currency ?? "INR").toUpperCase()}
              />
              <InfoRow
                label="Notes"
                value={
                  booking.notes ? (
                    <span className="text-sm font-normal text-muted-foreground whitespace-pre-wrap">
                      {booking.notes}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
            </div>
          </DetailCard>

          <DetailCard title={`Itinerary (${itineraries.length})`}>
            {itineraries.length === 0 ? (
              <p className="text-sm text-muted-foreground">None yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {itineraries.map((it) => (
                  <li key={it.id} className="py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold truncate">
                        {it.pdf_url ? (
                          <a
                            href={it.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary"
                          >
                            {it.title ?? "—"}
                          </a>
                        ) : (
                          (it.title ?? "—")
                        )}
                      </span>
                      <StatusBadge tone={itineraryStatusTone(it.status)}>
                        {it.status ?? "—"}
                      </StatusBadge>
                    </div>
                    <div className="text-sm text-muted-foreground tabular-nums">
                      {it.day_count ? `${it.day_count} day${it.day_count === 1 ? "" : "s"} · ` : ""}
                      {formatDate(it.start_date)} → {formatDate(it.end_date)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </DetailCard>

          <DetailCard title={`Payments (${payments.length})`}>
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">None yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[110px]">Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm text-muted-foreground tabular-nums">
                        {formatDate(p.received_at)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.reference ?? p.method ?? "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold tabular-nums">
                        {formatMoney(p.amount, p.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DetailCard>
        </div>
      </div>
    </div>
  )
}
