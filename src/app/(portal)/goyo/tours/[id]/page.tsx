import { Compass } from "lucide-react"
import { supabaseGoyo } from "@/lib/supabase"
import { BackLink } from "@/components/shared/back-link"
import { HeroCard } from "@/components/shared/hero-card"
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
import { GenericEditLauncher } from "../../_components/GenericEditLauncher"
import {
  bookingStatusTone,
  formatMoney,
  tourStatusTone,
} from "../../_lib/format"
import Link from "next/link"

export const dynamic = "force-dynamic"
export const metadata = { title: "Tour — Goyo | Suprans" }

interface TourRow {
  id: string
  name: string | null
  type: string | null
  destination: string | null
  duration_days: number | null
  base_price: number | string | null
  currency: string | null
  status: string | null
  highlights: string | null
  inclusions: string | null
  exclusions: string | null
}

interface BookingRow {
  id: string
  booking_code: string | null
  client_id: string | null
  departure_date: string | null
  status: string | null
  total_amount: number | string | null
  currency: string | null
}

interface ClientLite {
  id: string
  name: string | null
}

export default async function GoyoTourDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [tourRes, bookingsRes] = await Promise.all([
    supabaseGoyo
      .from("tours")
      .select(
        "id, name, type, destination, duration_days, base_price, currency, status, highlights, inclusions, exclusions",
      )
      .eq("id", id)
      .maybeSingle(),
    supabaseGoyo
      .from("bookings")
      .select(
        "id, booking_code, client_id, departure_date, status, total_amount, currency",
      )
      .eq("tour_id", id)
      .order("departure_date", { ascending: false, nullsFirst: false })
      .limit(20),
  ])

  const tour = (tourRes.data ?? null) as TourRow | null
  const bookings = (bookingsRes.data ?? []) as BookingRow[]

  const clientIds = Array.from(
    new Set(bookings.map((b) => b.client_id).filter(Boolean) as string[]),
  )
  const clientsRes = clientIds.length
    ? await supabaseGoyo
        .from("clients")
        .select("id, name")
        .in("id", clientIds)
    : { data: [] as ClientLite[] }
  const clientName = new Map(
    ((clientsRes.data ?? []) as ClientLite[]).map((c) => [c.id, c.name]),
  )

  if (!tour) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <BackLink href="/goyo/tours" label="All tours" />
        <EmptyState
          icon={Compass}
          title="Tour not found"
          description="It may have been removed or the link is incorrect."
        />
      </div>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <BackLink href="/goyo/tours" label="All tours" />

      <HeroCard
        title={tour.name ?? "Untitled tour"}
        subtitle={tour.destination ?? undefined}
        icon={Compass}
        tone="blue"
        meta={
          <>
            {tour.type && <StatusBadge tone="slate">{tour.type}</StatusBadge>}
            {tour.status && (
              <StatusBadge tone={tourStatusTone(tour.status)}>
                {tour.status}
              </StatusBadge>
            )}
          </>
        }
        actions={
          <GenericEditLauncher
            table="tours"
            row={tour as unknown as Record<string, unknown> & { id: string }}
            listHref="/goyo/tours"
            title="Edit tour"
          />
        }
      />

      <KPIGrid>
        <MetricCard
          label="Duration"
          value={
            <span className="tabular-nums">
              {tour.duration_days ?? "—"}
            </span>
          }
          hint="days"
        />
        <MetricCard
          label="Base price"
          value={
            tour.base_price !== null
              ? formatMoney(Number(tour.base_price), tour.currency)
              : "—"
          }
        />
        <MetricCard
          label="Total bookings"
          value={bookings.length.toLocaleString("en-IN")}
        />
        <MetricCard label="Currency" value={tour.currency ?? "INR"} />
      </KPIGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <DetailCard title="Recent bookings">
            {bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No bookings against this tour yet.
              </p>
            ) : (
              <Card className="p-0" size="sm">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">Code</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead className="w-[140px]">Departure</TableHead>
                      <TableHead className="w-[120px]">Status</TableHead>
                      <TableHead className="w-[160px] text-right">
                        Total
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="text-sm font-medium">
                          <Link
                            href={`/goyo/bookings/${b.id}`}
                            className="hover:underline"
                          >
                            {b.booking_code ?? b.id.slice(0, 8)}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm">
                          {clientName.get(b.client_id ?? "") ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground tabular-nums">
                          {formatDate(b.departure_date)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge tone={bookingStatusTone(b.status)}>
                            {b.status ?? "—"}
                          </StatusBadge>
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold tabular-nums">
                          {b.total_amount !== null
                            ? formatMoney(
                                Number(b.total_amount),
                                b.currency,
                              )
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
        <div className="space-y-5">
          <DetailCard title="Highlights">
            <p className="text-sm whitespace-pre-line">
              {tour.highlights ?? "—"}
            </p>
          </DetailCard>
          <DetailCard title="Inclusions">
            <p className="text-sm whitespace-pre-line">
              {tour.inclusions ?? "—"}
            </p>
          </DetailCard>
          <DetailCard title="Exclusions">
            <p className="text-sm whitespace-pre-line">
              {tour.exclusions ?? "—"}
            </p>
          </DetailCard>
        </div>
      </div>
    </div>
  )
}
