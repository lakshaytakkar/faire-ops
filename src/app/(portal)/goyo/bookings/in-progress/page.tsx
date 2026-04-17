import Link from "next/link"
import {
  ShoppingCart,
  CalendarClock,
  PlaneTakeoff,
  Wallet,
} from "lucide-react"
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
import { GenericAddLauncher } from "../../_components/GenericEditLauncher"
import {
  formatMoney,
  formatINR,
  bookingStatusTone,
} from "../../_lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "In-progress bookings — Goyo | Suprans" }

interface BookingRow {
  id: string
  booking_code: string | null
  client_id: string | null
  tour_id: string | null
  departure_date: string | null
  return_date: string | null
  status: string | null
  total_amount: number | null
  paid_amount: number | null
  currency: string | null
}

interface ClientLite {
  id: string
  name: string | null
}

interface TourLite {
  id: string
  name: string | null
}

export default async function GoyoInProgressBookingsPage() {
  const today = new Date().toISOString().slice(0, 10)

  // status=in_progress OR (departure_date <= today AND return_date >= today)
  const filter = `status.eq.in_progress,and(departure_date.lte.${today},return_date.gte.${today})`

  const [bookingsRes, clientsRes, toursRes] = await Promise.all([
    supabaseGoyo
      .from("bookings")
      .select(
        "id, booking_code, client_id, tour_id, departure_date, return_date, status, total_amount, paid_amount, currency",
      )
      .or(filter)
      .order("departure_date", { ascending: true, nullsFirst: false })
      .limit(2000),
    supabaseGoyo.from("clients").select("id, name").limit(5000),
    supabaseGoyo.from("tours").select("id, name").limit(2000),
  ])

  if (bookingsRes.error)
    console.error("goyo.bookings:", bookingsRes.error.message)
  if (clientsRes.error) console.error("goyo.clients:", clientsRes.error.message)
  if (toursRes.error) console.error("goyo.tours:", toursRes.error.message)

  const bookings = (bookingsRes.data ?? []) as BookingRow[]
  const clients = (clientsRes.data ?? []) as ClientLite[]
  const tours = (toursRes.data ?? []) as TourLite[]

  const clientName = new Map(clients.map((c) => [c.id, c.name ?? "—"]))
  const tourName = new Map(tours.map((t) => [t.id, t.name ?? "—"]))

  const now = new Date()
  const total = bookings.length
  const openCount = bookings.filter(
    (b) => b.status === "confirmed" || b.status === "in_progress",
  ).length
  const monthDepartures = bookings.filter((b) => {
    if (!b.departure_date) return false
    const d = new Date(b.departure_date)
    return (
      d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    )
  }).length
  const outstanding = bookings.reduce(
    (s, b) => s + ((Number(b.total_amount) || 0) - (Number(b.paid_amount) || 0)),
    0,
  )

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="In progress"
        subtitle={`${total.toLocaleString("en-IN")} active trip${total === 1 ? "" : "s"}`}
        actions={
          <GenericAddLauncher
            table="bookings"
            listHref="/goyo/bookings"
            title="New booking"
            size="lg"
          />
        }
      />

      <KPIGrid>
        <MetricCard
          label="Total"
          value={total}
          icon={ShoppingCart}
          iconTone="slate"
        />
        <MetricCard
          label="Open"
          value={openCount}
          icon={CalendarClock}
          iconTone="amber"
        />
        <MetricCard
          label="This-month departures"
          value={monthDepartures}
          icon={PlaneTakeoff}
          iconTone="blue"
        />
        <MetricCard
          label="Outstanding (₹)"
          value={formatINR(outstanding)}
          icon={Wallet}
          iconTone="red"
        />
      </KPIGrid>

      <DetailCard title="In progress">
        {bookings.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="Nothing in progress"
            description="Bookings are shown here while travellers are mid-trip."
          />
        ) : (
          <Card className="overflow-hidden p-0 gap-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Code</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Tour</TableHead>
                  <TableHead className="w-[120px]">Departure</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[140px] text-right">Total</TableHead>
                  <TableHead className="w-[140px] text-right">Paid</TableHead>
                  <TableHead className="w-[140px] text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((b) => {
                  const balance =
                    (Number(b.total_amount) || 0) -
                    (Number(b.paid_amount) || 0)
                  return (
                    <TableRow key={b.id}>
                      <TableCell>
                        <Link
                          href={`/goyo/bookings/${b.id}`}
                          className="hover:text-primary font-medium"
                        >
                          {b.booking_code ?? "—"}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {clientName.get(b.client_id ?? "") ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {tourName.get(b.tour_id ?? "") ?? "—"}
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
                        {formatMoney(b.total_amount, b.currency)}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {formatMoney(b.paid_amount, b.currency)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold tabular-nums">
                        {formatMoney(balance, b.currency)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </DetailCard>
    </div>
  )
}
