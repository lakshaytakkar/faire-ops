import Link from "next/link"
import { Users, Briefcase, Wallet, FileCheck2 } from "lucide-react"
import { supabaseGoyo } from "@/lib/supabase"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
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
import {
  formatINR,
  formatMoney,
  bookingStatusTone,
  visaStatusTone,
} from "../_lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Dashboard — Goyo | Suprans" }

interface ClientLite {
  id: string
  name: string | null
  status: string | null
}

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

interface TourLite {
  id: string
  name: string | null
}

interface PaymentRow {
  id: string
  booking_id: string | null
  client_id: string | null
  amount: number | null
  currency: string | null
  received_at: string | null
  reference: string | null
}

interface VisaRow {
  id: string
  traveller_name: string | null
  country: string | null
  status: string | null
  expected_date: string | null
}

export default async function GoyoDashboardPage() {
  const today = new Date().toISOString().slice(0, 10)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000)
    .toISOString()
    .slice(0, 10)

  const [clientsRes, bookingsRes, paymentsRes, visasRes, toursRes] =
    await Promise.all([
      supabaseGoyo
        .from("clients")
        .select("id, name, status")
        .limit(2000),
      supabaseGoyo
        .from("bookings")
        .select(
          "id, booking_code, client_id, tour_id, departure_date, return_date, status, total_amount, paid_amount, currency",
        )
        .limit(2000),
      supabaseGoyo
        .from("payments")
        .select("id, booking_id, client_id, amount, currency, received_at, reference")
        .gte("received_at", thirtyDaysAgo)
        .order("received_at", { ascending: false })
        .limit(500),
      supabaseGoyo
        .from("visas")
        .select("id, traveller_name, country, status, expected_date")
        .in("status", ["pending", "submitted"])
        .order("expected_date", { ascending: true, nullsFirst: false })
        .limit(500),
      supabaseGoyo.from("tours").select("id, name").limit(2000),
    ])

  if (clientsRes.error) console.error("goyo.clients:", clientsRes.error.message)
  if (bookingsRes.error) console.error("goyo.bookings:", bookingsRes.error.message)
  if (paymentsRes.error) console.error("goyo.payments:", paymentsRes.error.message)
  if (visasRes.error) console.error("goyo.visas:", visasRes.error.message)
  if (toursRes.error) console.error("goyo.tours:", toursRes.error.message)

  const clients = (clientsRes.data ?? []) as ClientLite[]
  const bookings = (bookingsRes.data ?? []) as BookingRow[]
  const payments = (paymentsRes.data ?? []) as PaymentRow[]
  const visas = (visasRes.data ?? []) as VisaRow[]
  const tours = (toursRes.data ?? []) as TourLite[]

  const clientName = new Map(clients.map((c) => [c.id, c.name ?? "—"]))
  const tourName = new Map(tours.map((t) => [t.id, t.name ?? "—"]))

  const activeClients = clients.filter((c) => c.status === "active").length
  const openBookings = bookings.filter(
    (b) => b.status === "confirmed" || b.status === "in_progress",
  ).length

  const totalPaid = bookings.reduce((s, b) => s + (Number(b.paid_amount) || 0), 0)
  const totalOutstanding = bookings
    .filter((b) => b.status === "confirmed" || b.status === "draft")
    .reduce((s, b) => s + ((Number(b.total_amount) || 0) - (Number(b.paid_amount) || 0)), 0)

  const visasInProgress = visas.length

  const upcomingDepartures = [...bookings]
    .filter((b) => b.departure_date && b.departure_date >= today)
    .sort((a, b) => (a.departure_date ?? "").localeCompare(b.departure_date ?? ""))
    .slice(0, 5)

  const visasInProgressList = visas.slice(0, 5)

  const recentPayments = [...payments]
    .sort((a, b) => (b.received_at ?? "").localeCompare(a.received_at ?? ""))
    .slice(0, 8)

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Hero gradient banner */}
      <div className="relative isolate overflow-hidden rounded-2xl"
           style={{ background: "linear-gradient(135deg, hsl(35,50%,12%) 0%, hsl(30,60%,35%) 100%)" }}>
        <div className="px-6 py-8 sm:px-8 sm:py-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-300/80">GoyoTours</p>
          <h1 className="mt-1 text-2xl font-bold font-heading text-white">Tour Operations Center</h1>
          <p className="mt-1 text-sm text-white/70">Bookings, clients, visas &amp; payments</p>
          <div className="mt-6 grid grid-cols-3 gap-6">
            <div>
              <p className="text-2xl font-bold tabular-nums text-white">{clients.length.toLocaleString("en-IN")}</p>
              <p className="text-sm text-white/60">Total clients</p>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-white">{bookings.length.toLocaleString("en-IN")}</p>
              <p className="text-sm text-white/60">Total bookings</p>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-white">{formatINR(totalPaid)}</p>
              <p className="text-sm text-white/60">Collected</p>
            </div>
          </div>
        </div>
      </div>

      <KPIGrid>
        <MetricCard
          label="Active clients"
          value={activeClients}
          icon={Users}
          iconTone="emerald"
          href="/goyo/clients/active"
        />
        <MetricCard
          label="Open bookings"
          value={openBookings}
          icon={Briefcase}
          iconTone="amber"
          href="/goyo/bookings/in-progress"
        />
        <MetricCard
          label="Total collected (₹)"
          value={formatINR(totalPaid)}
          icon={Wallet}
          iconTone="blue"
          delta={totalOutstanding > 0 ? `₹${(totalOutstanding / 100000).toFixed(1)}L outstanding` : undefined}
        />
        <MetricCard
          label="Visas in progress"
          value={visasInProgress}
          icon={FileCheck2}
          iconTone="violet"
        />
      </KPIGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <DetailCard
          title="Upcoming departures"
          className="lg:col-span-2"
          actions={
            <Link
              href="/goyo/bookings/upcoming"
              className="text-sm font-medium text-primary hover:underline"
            >
              View all
            </Link>
          }
        >
          {upcomingDepartures.length === 0 ? (
            <p className="text-sm text-muted-foreground">None scheduled.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Code</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Tour</TableHead>
                  <TableHead className="w-[120px]">Departure</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingDepartures.map((b) => (
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DetailCard>

        <DetailCard title="Visas in progress">
          {visasInProgressList.length === 0 ? (
            <p className="text-sm text-muted-foreground">None pending.</p>
          ) : (
            <ul className="divide-y divide-border">
              {visasInProgressList.map((v) => (
                <li key={v.id} className="py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold truncate">
                      {v.traveller_name ?? "—"}
                    </span>
                    <StatusBadge tone={visaStatusTone(v.status)}>
                      {v.status ?? "—"}
                    </StatusBadge>
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {v.country ?? "—"}
                  </div>
                  <div className="text-sm text-muted-foreground tabular-nums">
                    {formatDate(v.expected_date)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DetailCard>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/goyo/bookings" className="group rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all">
          <Briefcase className="size-5 text-amber-500 mb-2" />
          <p className="text-sm font-semibold text-foreground group-hover:text-primary">Bookings</p>
          <p className="text-sm text-muted-foreground">Manage all tour bookings</p>
        </Link>
        <Link href="/goyo/clients" className="group rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all">
          <Users className="size-5 text-emerald-500 mb-2" />
          <p className="text-sm font-semibold text-foreground group-hover:text-primary">Clients</p>
          <p className="text-sm text-muted-foreground">View client directory</p>
        </Link>
        <Link href="/goyo/visas" className="group rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all">
          <FileCheck2 className="size-5 text-violet-500 mb-2" />
          <p className="text-sm font-semibold text-foreground group-hover:text-primary">Visas</p>
          <p className="text-sm text-muted-foreground">Track visa applications</p>
        </Link>
      </div>

      <DetailCard title="Recent payments">
        {recentPayments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments in last 30 days.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="w-[160px] text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentPayments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm text-muted-foreground tabular-nums">
                    {formatDate(p.received_at)}
                  </TableCell>
                  <TableCell className="text-sm font-medium text-foreground">
                    {clientName.get(p.client_id ?? "") ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.reference ?? "—"}
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
  )
}
