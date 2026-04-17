import Link from "next/link"
import { Wallet } from "lucide-react"
import { supabaseGoyo } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
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
import { formatINR, formatMoney } from "../../_lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Payments — by booking | Goyo | Suprans" }

interface PaymentRow {
  id: string
  booking_id: string | null
  amount: number | string | null
  currency: string | null
  received_at: string | null
  method: string | null
  reference: string | null
}

interface BookingLite {
  id: string
  booking_code: string | null
}

export default async function GoyoFinanceByBookingPage() {
  const [paymentsRes, bookingsRes] = await Promise.all([
    supabaseGoyo
      .from("payments")
      .select(
        "id, booking_id, amount, currency, received_at, method, reference",
      )
      .order("received_at", { ascending: false, nullsFirst: false }),
    supabaseGoyo.from("bookings").select("id, booking_code"),
  ])

  const payments = (paymentsRes.data ?? []) as PaymentRow[]
  const bookingCode = new Map(
    ((bookingsRes.data ?? []) as BookingLite[]).map((b) => [
      b.id,
      b.booking_code,
    ]),
  )

  const byBooking = new Map<string, PaymentRow[]>()
  for (const p of payments) {
    const bid = p.booking_id ?? "__unassigned__"
    const list = byBooking.get(bid) ?? []
    list.push(p)
    byBooking.set(bid, list)
  }

  const groups = [...byBooking.entries()]
    .map(([bid, rows]) => {
      const inrTotal = rows
        .filter((r) => (r.currency ?? "INR") === "INR")
        .reduce((s, r) => s + Number(r.amount ?? 0), 0)
      return { bid, rows, inrTotal }
    })
    .sort((a, b) => b.inrTotal - a.inrTotal)

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Payments — by booking"
        subtitle={`${groups.length.toLocaleString("en-IN")} booking${groups.length === 1 ? "" : "s"} · ${payments.length.toLocaleString("en-IN")} payment${payments.length === 1 ? "" : "s"}`}
      />

      {payments.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No payments yet"
          description="Recorded payments grouped by booking will appear here."
        />
      ) : (
        <div className="space-y-4">
          {groups.map(({ bid, rows, inrTotal }) => {
            const code =
              bid === "__unassigned__"
                ? "Unassigned"
                : bookingCode.get(bid) ?? bid.slice(0, 8)
            return (
              <DetailCard
                key={bid}
                title={`${code} — ${formatINR(inrTotal)}`}
                actions={
                  bid !== "__unassigned__" && (
                    <Link
                      href={`/goyo/bookings/${bid}`}
                      className="text-sm font-medium hover:underline"
                    >
                      Open booking
                    </Link>
                  )
                }
              >
                <Card className="p-0" size="sm">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[140px]">Date</TableHead>
                        <TableHead className="w-[120px]">Method</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead className="w-[180px] text-right">
                          Amount
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-sm text-muted-foreground tabular-nums">
                            {formatDate(p.received_at)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {p.method ?? "—"}
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {p.reference ?? "—"}
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold text-emerald-600 tabular-nums">
                            {(p.currency ?? "INR") === "INR"
                              ? formatINR(Number(p.amount ?? 0))
                              : formatMoney(
                                  Number(p.amount ?? 0),
                                  p.currency,
                                )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </DetailCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
