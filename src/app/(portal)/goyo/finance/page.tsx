import Link from "next/link"
import { Wallet, TrendingUp, AlertCircle, Hash } from "lucide-react"
import { supabaseGoyo } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
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
import { formatINR, formatMoney } from "../_lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Finance — Goyo | Suprans" }

interface PaymentRow {
  id: string
  booking_id: string | null
  client_id: string | null
  amount: number | string | null
  currency: string | null
  received_at: string | null
  method: string | null
  reference: string | null
}

interface BookingRow {
  id: string
  booking_code: string | null
  client_id: string | null
  status: string | null
  total_amount: number | string | null
  paid_amount: number | string | null
  currency: string | null
}

interface ClientLite {
  id: string
  name: string | null
}

export default async function GoyoFinancePage() {
  const [paymentsRes, bookingsRes] = await Promise.all([
    supabaseGoyo
      .from("payments")
      .select(
        "id, booking_id, client_id, amount, currency, received_at, method, reference",
      )
      .order("received_at", { ascending: false, nullsFirst: false }),
    supabaseGoyo
      .from("bookings")
      .select(
        "id, booking_code, client_id, status, total_amount, paid_amount, currency",
      ),
  ])

  if (paymentsRes.error)
    console.error("goyo.payments:", paymentsRes.error.message)
  if (bookingsRes.error)
    console.error("goyo.bookings:", bookingsRes.error.message)

  const payments = (paymentsRes.data ?? []) as PaymentRow[]
  const bookings = (bookingsRes.data ?? []) as BookingRow[]

  const clientIds = Array.from(
    new Set(
      [
        ...payments.map((p) => p.client_id),
        ...bookings.map((b) => b.client_id),
      ].filter(Boolean) as string[],
    ),
  )
  const clientsRes = clientIds.length
    ? await supabaseGoyo.from("clients").select("id, name").in("id", clientIds)
    : { data: [] as ClientLite[] }
  const clientName = new Map(
    ((clientsRes.data ?? []) as ClientLite[]).map((c) => [c.id, c.name]),
  )
  const bookingCode = new Map(bookings.map((b) => [b.id, b.booking_code]))

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const isThisMonth = (iso: string | null) => {
    if (!iso) return false
    const d = new Date(iso)
    return d.getFullYear() === year && d.getMonth() === month
  }
  const isThisYear = (iso: string | null) => {
    if (!iso) return false
    const d = new Date(iso)
    return d.getFullYear() === year
  }

  const inrPayments = payments.filter((p) => (p.currency ?? "INR") === "INR")
  const monthInr = inrPayments
    .filter((p) => isThisMonth(p.received_at))
    .reduce((s, p) => s + Number(p.amount ?? 0), 0)
  const yearInr = inrPayments
    .filter((p) => isThisYear(p.received_at))
    .reduce((s, p) => s + Number(p.amount ?? 0), 0)

  const outstanding = bookings
    .filter(
      (b) => b.status !== "cancelled" && b.status !== "completed",
    )
    .map((b) => ({
      booking: b,
      balance:
        Number(b.total_amount ?? 0) - Number(b.paid_amount ?? 0),
    }))
    .filter((x) => x.balance > 0)
    .sort((a, b) => b.balance - a.balance)

  const totalOutstanding = outstanding.reduce((s, x) => s + x.balance, 0)

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Finance"
        subtitle={`${payments.length.toLocaleString("en-IN")} payment${payments.length === 1 ? "" : "s"} · ${bookings.length.toLocaleString("en-IN")} booking${bookings.length === 1 ? "" : "s"}`}
      />

      <KPIGrid>
        <MetricCard
          label="This-month INR revenue"
          value={formatINR(monthInr)}
          icon={Wallet}
          iconTone="emerald"
        />
        <MetricCard
          label="This-year INR revenue"
          value={formatINR(yearInr)}
          icon={TrendingUp}
          iconTone="blue"
        />
        <MetricCard
          label="Outstanding balance"
          value={formatINR(totalOutstanding)}
          icon={AlertCircle}
          iconTone="amber"
          hint={`${outstanding.length} booking${outstanding.length === 1 ? "" : "s"}`}
        />
        <MetricCard
          label="Total bookings"
          value={bookings.length.toLocaleString("en-IN")}
          icon={Hash}
          iconTone="violet"
        />
      </KPIGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <DetailCard title="Recent payments">
            {payments.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="No payments yet"
                description="Recorded payments will appear here."
              />
            ) : (
              <Card className="p-0" size="sm">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">Date</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead className="w-[140px]">Booking</TableHead>
                      <TableHead className="w-[120px]">Method</TableHead>
                      <TableHead className="w-[160px] text-right">
                        Amount
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.slice(0, 25).map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm text-muted-foreground tabular-nums">
                          {formatDate(p.received_at)}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {clientName.get(p.client_id ?? "") ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {p.booking_id ? (
                            <Link
                              href={`/goyo/bookings/${p.booking_id}`}
                              className="font-medium hover:underline"
                            >
                              {bookingCode.get(p.booking_id) ??
                                p.booking_id.slice(0, 8)}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {p.method ?? "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold text-emerald-600 tabular-nums">
                          {(p.currency ?? "INR") === "INR"
                            ? formatINR(Number(p.amount ?? 0))
                            : formatMoney(Number(p.amount ?? 0), p.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </DetailCard>
        </div>
        <div>
          <DetailCard title="Outstanding balances">
            {outstanding.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Everything is paid up.
              </p>
            ) : (
              <Card className="p-0" size="sm">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Booking</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outstanding.slice(0, 15).map(({ booking, balance }) => (
                      <TableRow key={booking.id}>
                        <TableCell className="text-sm">
                          <Link
                            href={`/goyo/bookings/${booking.id}`}
                            className="font-medium hover:underline"
                          >
                            {booking.booking_code ?? booking.id.slice(0, 8)}
                          </Link>
                          <div className="text-muted-foreground">
                            {clientName.get(booking.client_id ?? "") ?? "—"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold text-amber-600 tabular-nums">
                          {(booking.currency ?? "INR") === "INR"
                            ? formatINR(balance)
                            : formatMoney(balance, booking.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </DetailCard>
        </div>
      </div>
    </div>
  )
}
