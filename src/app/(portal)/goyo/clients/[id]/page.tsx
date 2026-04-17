import Link from "next/link"
import { notFound } from "next/navigation"
import { ShoppingCart, Wallet, Scale, CalendarClock } from "lucide-react"
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
  clientStatusTone,
  bookingStatusTone,
  visaStatusTone,
  formatMoney,
  formatINR,
} from "../../_lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Client — Goyo | Suprans" }

interface ClientRow {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  passport_no: string | null
  passport_expiry: string | null
  nationality: string | null
  source: string | null
  status: string | null
  total_bookings: number | null
  total_spent: number | null
  last_booking_at: string | null
  notes: string | null
}

interface BookingRow {
  id: string
  booking_code: string | null
  tour_id: string | null
  departure_date: string | null
  return_date: string | null
  status: string | null
  total_amount: number | null
  paid_amount: number | null
  currency: string | null
}

interface PaymentRow {
  id: string
  booking_id: string | null
  amount: number | null
  currency: string | null
  received_at: string | null
  reference: string | null
  method: string | null
}

interface VisaRow {
  id: string
  booking_id: string | null
  traveller_name: string | null
  country: string | null
  visa_type: string | null
  expected_date: string | null
  status: string | null
}

export default async function GoyoClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [clientRes, bookingsRes, paymentsRes] = await Promise.all([
    supabaseGoyo.from("clients").select("*").eq("id", id).maybeSingle(),
    supabaseGoyo
      .from("bookings")
      .select(
        "id, booking_code, tour_id, departure_date, return_date, status, total_amount, paid_amount, currency",
      )
      .eq("client_id", id)
      .order("departure_date", { ascending: false, nullsFirst: false }),
    supabaseGoyo
      .from("payments")
      .select("id, booking_id, amount, currency, received_at, reference, method")
      .eq("client_id", id)
      .order("received_at", { ascending: false, nullsFirst: false }),
  ])

  if (clientRes.error) console.error("goyo.clients:", clientRes.error.message)
  if (!clientRes.data) notFound()
  const client = clientRes.data as ClientRow

  if (bookingsRes.error)
    console.error("goyo.bookings:", bookingsRes.error.message)
  if (paymentsRes.error)
    console.error("goyo.payments:", paymentsRes.error.message)

  const bookings = (bookingsRes.data ?? []) as BookingRow[]
  const payments = (paymentsRes.data ?? []) as PaymentRow[]

  const bookingIds = bookings.map((b) => b.id)
  const visasRes = bookingIds.length
    ? await supabaseGoyo
        .from("visas")
        .select(
          "id, booking_id, traveller_name, country, visa_type, expected_date, status",
        )
        .in("booking_id", bookingIds)
        .order("expected_date", { ascending: true, nullsFirst: false })
    : { data: [], error: null }

  if (visasRes.error) console.error("goyo.visas:", visasRes.error.message)
  const visas = (visasRes.data ?? []) as VisaRow[]

  const tourIds = Array.from(
    new Set(bookings.map((b) => b.tour_id).filter((x): x is string => !!x)),
  )
  const toursRes = tourIds.length
    ? await supabaseGoyo.from("tours").select("id, name").in("id", tourIds)
    : { data: [], error: null }
  const tourName = new Map(
    ((toursRes.data ?? []) as Array<{ id: string; name: string | null }>).map(
      (t) => [t.id, t.name ?? "—"],
    ),
  )

  const totalBookings = bookings.length
  const totalSpentInr = bookings
    .filter((b) => (b.currency ?? "INR").toUpperCase() === "INR")
    .reduce((s, b) => s + (Number(b.paid_amount) || 0), 0)
  const outstanding = bookings.reduce(
    (s, b) => s + ((Number(b.total_amount) || 0) - (Number(b.paid_amount) || 0)),
    0,
  )
  const lastBooking =
    bookings
      .map((b) => b.departure_date)
      .filter((d): d is string => !!d)
      .sort()
      .reverse()[0] ??
    client.last_booking_at ??
    null

  const recentPayments = payments.slice(0, 10)

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <BackLink href="/goyo/clients" label="All clients" />

      <HeroCard
        title={client.name ?? "Untitled client"}
        subtitle={`${client.nationality ?? "—"} · ${client.total_bookings ?? 0} booking${(client.total_bookings ?? 0) === 1 ? "" : "s"}`}
        meta={
          <StatusBadge tone={clientStatusTone(client.status)}>
            {client.status ?? "—"}
          </StatusBadge>
        }
        actions={
          <GenericEditLauncher
            table="clients"
            row={client as unknown as Record<string, unknown> & { id: string }}
            listHref="/goyo/clients"
            title="Edit client"
          />
        }
      />

      <KPIGrid>
        <MetricCard
          label="Total bookings"
          value={totalBookings}
          icon={ShoppingCart}
          iconTone="slate"
        />
        <MetricCard
          label="Total spent (₹)"
          value={formatINR(totalSpentInr)}
          icon={Wallet}
          iconTone="emerald"
        />
        <MetricCard
          label="Outstanding"
          value={formatMoney(outstanding, "INR")}
          icon={Scale}
          iconTone={outstanding > 0 ? "red" : "slate"}
        />
        <MetricCard
          label="Last booking"
          value={formatDate(lastBooking)}
          icon={CalendarClock}
          iconTone="blue"
        />
      </KPIGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <DetailCard title={`Bookings (${bookings.length})`}>
            {bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">None yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Code</TableHead>
                    <TableHead>Tour</TableHead>
                    <TableHead className="w-[120px]">Departure</TableHead>
                    <TableHead className="w-[110px]">Status</TableHead>
                    <TableHead className="w-[140px] text-right">Total</TableHead>
                    <TableHead className="w-[140px] text-right">Paid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((b) => (
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
          <DetailCard title="Contact">
            <div className="divide-y divide-border">
              <InfoRow label="Phone" value={client.phone ?? "—"} />
              <InfoRow label="Email" value={client.email ?? "—"} />
              <InfoRow label="Nationality" value={client.nationality ?? "—"} />
              <InfoRow label="Source" value={client.source ?? "—"} />
              <InfoRow label="Passport" value={client.passport_no ?? "—"} />
              <InfoRow
                label="Passport expiry"
                value={formatDate(client.passport_expiry)}
              />
              <InfoRow
                label="Notes"
                value={
                  client.notes ? (
                    <span className="text-sm font-normal text-muted-foreground whitespace-pre-wrap">
                      {client.notes}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
            </div>
          </DetailCard>

          <DetailCard title={`Recent payments (${recentPayments.length})`}>
            {recentPayments.length === 0 ? (
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
                  {recentPayments.map((p) => (
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
