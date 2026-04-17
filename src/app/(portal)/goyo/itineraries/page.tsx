import Link from "next/link"
import { Map as MapIcon, CheckCircle2, Lock, FileEdit } from "lucide-react"
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
import { formatDate } from "@/lib/format"
import { GenericAddLauncher } from "../_components/GenericEditLauncher"
import { itineraryStatusTone } from "../_lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Itineraries — Goyo | Suprans" }

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
}

interface BookingLite {
  id: string
  booking_code: string | null
}

interface TourLite {
  id: string
  name: string | null
}

export default async function GoyoItinerariesPage() {
  const itinRes = await supabaseGoyo
    .from("itineraries")
    .select(
      "id, booking_id, tour_id, title, day_count, status, start_date, end_date, pdf_url",
    )
    .order("start_date", { ascending: false, nullsFirst: false })

  if (itinRes.error)
    console.error("goyo.itineraries:", itinRes.error.message)

  const itineraries = (itinRes.data ?? []) as ItineraryRow[]

  const bookingIds = Array.from(
    new Set(
      itineraries.map((i) => i.booking_id).filter(Boolean) as string[],
    ),
  )
  const tourIds = Array.from(
    new Set(itineraries.map((i) => i.tour_id).filter(Boolean) as string[]),
  )

  const [bookingsRes, toursRes] = await Promise.all([
    bookingIds.length
      ? supabaseGoyo
          .from("bookings")
          .select("id, booking_code")
          .in("id", bookingIds)
      : Promise.resolve({ data: [] as BookingLite[] }),
    tourIds.length
      ? supabaseGoyo.from("tours").select("id, name").in("id", tourIds)
      : Promise.resolve({ data: [] as TourLite[] }),
  ])

  const bookingCode = new Map(
    ((bookingsRes.data ?? []) as BookingLite[]).map((b) => [
      b.id,
      b.booking_code,
    ]),
  )
  const tourName = new Map(
    ((toursRes.data ?? []) as TourLite[]).map((t) => [t.id, t.name]),
  )

  const approved = itineraries.filter((i) => i.status === "approved").length
  const locked = itineraries.filter((i) => i.status === "locked").length
  const drafts = itineraries.filter((i) => i.status === "draft").length

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Itineraries"
        subtitle={`${itineraries.length.toLocaleString("en-IN")} itinerar${itineraries.length === 1 ? "y" : "ies"}`}
        actions={
          <GenericAddLauncher
            table="itineraries"
            listHref="/goyo/itineraries"
            title="New itinerary"
            size="lg"
          />
        }
      />

      <KPIGrid>
        <MetricCard
          label="Total"
          value={itineraries.length.toLocaleString("en-IN")}
          icon={MapIcon}
          iconTone="blue"
        />
        <MetricCard
          label="Approved"
          value={approved.toLocaleString("en-IN")}
          icon={CheckCircle2}
          iconTone="emerald"
        />
        <MetricCard
          label="Locked"
          value={locked.toLocaleString("en-IN")}
          icon={Lock}
          iconTone="violet"
        />
        <MetricCard
          label="Drafts"
          value={drafts.toLocaleString("en-IN")}
          icon={FileEdit}
          iconTone="amber"
        />
      </KPIGrid>

      <DetailCard title="All itineraries">
        {itineraries.length === 0 ? (
          <EmptyState
            icon={MapIcon}
            title="No itineraries yet"
            description="Add an itinerary to start building day-by-day plans."
          />
        ) : (
          <Card className="p-0" size="sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Tour</TableHead>
                  <TableHead className="w-[140px]">Booking</TableHead>
                  <TableHead className="w-[80px] text-right">Days</TableHead>
                  <TableHead className="w-[220px]">Dates</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[80px]">PDF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itineraries.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="text-sm font-medium">
                      <Link
                        href={`/goyo/itineraries/${i.id}`}
                        className="hover:underline"
                      >
                        {i.title ?? "Untitled"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      {tourName.get(i.tour_id ?? "") ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {i.booking_id ? (
                        <Link
                          href={`/goyo/bookings/${i.booking_id}`}
                          className="font-medium hover:underline"
                        >
                          {bookingCode.get(i.booking_id) ??
                            i.booking_id.slice(0, 8)}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {i.day_count ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">
                      {formatDate(i.start_date)} → {formatDate(i.end_date)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={itineraryStatusTone(i.status)}>
                        {i.status ?? "—"}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {i.pdf_url ? (
                        <a
                          href={i.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium hover:underline"
                        >
                          View
                        </a>
                      ) : (
                        "—"
                      )}
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
