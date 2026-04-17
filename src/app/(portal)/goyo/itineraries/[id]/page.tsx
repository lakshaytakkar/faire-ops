import Link from "next/link"
import { Map as MapIcon } from "lucide-react"
import { supabaseGoyo } from "@/lib/supabase"
import { BackLink } from "@/components/shared/back-link"
import { HeroCard } from "@/components/shared/hero-card"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import { formatDate } from "@/lib/format"
import { GenericEditLauncher } from "../../_components/GenericEditLauncher"
import { itineraryStatusTone } from "../../_lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Itinerary — Goyo | Suprans" }

interface ItineraryRow {
  id: string
  booking_id: string | null
  tour_id: string | null
  title: string | null
  day_count: number | null
  status: string | null
  start_date: string | null
  end_date: string | null
  pdf_url: string | null
  notes: string | null
}

interface BookingLite {
  id: string
  booking_code: string | null
  client_id: string | null
}

interface TourLite {
  id: string
  name: string | null
}

interface ClientLite {
  id: string
  name: string | null
}

export default async function GoyoItineraryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const itinRes = await supabaseGoyo
    .from("itineraries")
    .select(
      "id, booking_id, tour_id, title, day_count, status, start_date, end_date, pdf_url, notes",
    )
    .eq("id", id)
    .maybeSingle()

  const itin = (itinRes.data ?? null) as ItineraryRow | null

  if (!itin) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <BackLink href="/goyo/itineraries" label="All itineraries" />
        <EmptyState
          icon={MapIcon}
          title="Itinerary not found"
          description="It may have been removed or the link is incorrect."
        />
      </div>
    )
  }

  const [bookingRes, tourRes] = await Promise.all([
    itin.booking_id
      ? supabaseGoyo
          .from("bookings")
          .select("id, booking_code, client_id")
          .eq("id", itin.booking_id)
          .maybeSingle()
      : Promise.resolve({ data: null as BookingLite | null }),
    itin.tour_id
      ? supabaseGoyo
          .from("tours")
          .select("id, name")
          .eq("id", itin.tour_id)
          .maybeSingle()
      : Promise.resolve({ data: null as TourLite | null }),
  ])

  const booking = (bookingRes.data ?? null) as BookingLite | null
  const tour = (tourRes.data ?? null) as TourLite | null

  const clientRes = booking?.client_id
    ? await supabaseGoyo
        .from("clients")
        .select("id, name")
        .eq("id", booking.client_id)
        .maybeSingle()
    : { data: null as ClientLite | null }
  const client = (clientRes.data ?? null) as ClientLite | null

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <BackLink href="/goyo/itineraries" label="All itineraries" />

      <HeroCard
        title={itin.title ?? "Untitled itinerary"}
        subtitle={`${tour?.name ?? "—"} · ${itin.day_count ?? "—"} days`}
        icon={MapIcon}
        tone="blue"
        meta={
          itin.status ? (
            <StatusBadge tone={itineraryStatusTone(itin.status)}>
              {itin.status}
            </StatusBadge>
          ) : undefined
        }
        actions={
          <GenericEditLauncher
            table="itineraries"
            row={itin as unknown as Record<string, unknown> & { id: string }}
            listHref="/goyo/itineraries"
            title="Edit itinerary"
          />
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <DetailCard title="Day-by-day">
            <p className="text-sm whitespace-pre-line">
              {itin.notes ?? "Add a day-by-day breakdown via Edit."}
            </p>
          </DetailCard>
        </div>
        <div className="space-y-5">
          <DetailCard title="Overview">
            <InfoRow
              label="Booking"
              value={
                booking ? (
                  <Link
                    href={`/goyo/bookings/${booking.id}`}
                    className="hover:underline"
                  >
                    {booking.booking_code ?? booking.id.slice(0, 8)}
                  </Link>
                ) : (
                  "—"
                )
              }
            />
            <InfoRow
              label="Tour"
              value={
                tour ? (
                  <Link
                    href={`/goyo/tours/${tour.id}`}
                    className="hover:underline"
                  >
                    {tour.name ?? "—"}
                  </Link>
                ) : (
                  "—"
                )
              }
            />
            <InfoRow label="Client" value={client?.name ?? "—"} />
            <InfoRow
              label="Start"
              value={
                <span className="tabular-nums">
                  {formatDate(itin.start_date)}
                </span>
              }
            />
            <InfoRow
              label="End"
              value={
                <span className="tabular-nums">
                  {formatDate(itin.end_date)}
                </span>
              }
            />
            <InfoRow
              label="Days"
              value={
                <span className="tabular-nums">{itin.day_count ?? "—"}</span>
              }
            />
            <InfoRow
              label="Status"
              value={
                itin.status ? (
                  <StatusBadge tone={itineraryStatusTone(itin.status)}>
                    {itin.status}
                  </StatusBadge>
                ) : (
                  "—"
                )
              }
            />
            <InfoRow
              label="PDF"
              value={
                itin.pdf_url ? (
                  <a
                    href={itin.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    View
                  </a>
                ) : (
                  "—"
                )
              }
            />
          </DetailCard>
        </div>
      </div>
    </div>
  )
}
