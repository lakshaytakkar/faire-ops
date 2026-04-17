import Link from "next/link"
import { Hotel, CheckCircle2, BedDouble, Wallet } from "lucide-react"
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
import { hotelStatusTone, formatINR, formatMoney } from "../../_lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Hotels — Goyo | Suprans" }

interface HotelRow {
  id: string
  booking_id: string | null
  hotel_name: string | null
  city: string | null
  check_in: string | null
  check_out: string | null
  room_type: string | null
  rooms: number | null
  pax: number | null
  status: string | null
  cost: number | string | null
  currency: string | null
}

interface BookingLite {
  id: string
  booking_code: string | null
}

export default async function GoyoHotelsPage() {
  const hotelsRes = await supabaseGoyo
    .from("travel_hotels")
    .select(
      "id, booking_id, hotel_name, city, check_in, check_out, room_type, rooms, pax, status, cost, currency",
    )
    .order("check_in", { ascending: false, nullsFirst: false })

  if (hotelsRes.error)
    console.error("goyo.travel_hotels:", hotelsRes.error.message)

  const hotels = (hotelsRes.data ?? []) as HotelRow[]

  const bookingIds = Array.from(
    new Set(hotels.map((h) => h.booking_id).filter(Boolean) as string[]),
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

  const confirmedOrBooked = hotels.filter(
    (h) => h.status === "confirmed" || h.status === "booked",
  ).length

  const today = new Date()
  const todayMs = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime()
  const inHouseNow = hotels.filter((h) => {
    if (!h.check_in || !h.check_out) return false
    const ci = new Date(h.check_in).getTime()
    const co = new Date(h.check_out).getTime()
    return ci <= todayMs && todayMs < co
  }).length

  const inrSpend = hotels
    .filter((h) => (h.currency ?? "INR") === "INR")
    .reduce((s, h) => s + Number(h.cost ?? 0), 0)

  const otherCcyTotals = new Map<string, number>()
  for (const h of hotels) {
    const ccy = h.currency
    if (!ccy || ccy === "INR") continue
    otherCcyTotals.set(
      ccy,
      (otherCcyTotals.get(ccy) ?? 0) + Number(h.cost ?? 0),
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Hotels"
        subtitle={`${hotels.length.toLocaleString("en-IN")} hotel${hotels.length === 1 ? "" : "s"}`}
        actions={
          <GenericAddLauncher
            table="travel_hotels"
            listHref="/goyo/travel/hotels"
            title="New hotel"
            size="lg"
          />
        }
      />

      <KPIGrid>
        <MetricCard
          label="Total"
          value={hotels.length.toLocaleString("en-IN")}
          icon={Hotel}
          iconTone="blue"
        />
        <MetricCard
          label="Confirmed / booked"
          value={confirmedOrBooked.toLocaleString("en-IN")}
          icon={CheckCircle2}
          iconTone="emerald"
        />
        <MetricCard
          label="In-house now"
          value={inHouseNow.toLocaleString("en-IN")}
          icon={BedDouble}
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

      <DetailCard title="All hotels">
        {hotels.length === 0 ? (
          <EmptyState
            icon={Hotel}
            title="No hotels yet"
            description="Add a hotel to start tracking stays and costs."
          />
        ) : (
          <Card className="p-0" size="sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hotel · City</TableHead>
                  <TableHead className="w-[220px]">Stay</TableHead>
                  <TableHead className="w-[160px]">Room</TableHead>
                  <TableHead className="w-[80px] text-right">Pax</TableHead>
                  <TableHead className="w-[140px]">Booking</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[160px] text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hotels.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="text-sm">
                      <div className="font-medium">{h.hotel_name ?? "—"}</div>
                      <div className="text-muted-foreground">
                        {h.city ?? "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">
                      {formatDate(h.check_in)} → {formatDate(h.check_out)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {h.room_type ?? "—"}
                      {h.rooms ? ` × ${h.rooms}` : ""}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {h.pax ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {h.booking_id ? (
                        <Link
                          href={`/goyo/bookings/${h.booking_id}`}
                          className="font-medium hover:underline"
                        >
                          {bookingCode.get(h.booking_id) ??
                            h.booking_id.slice(0, 8)}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={hotelStatusTone(h.status)}>
                        {h.status ?? "—"}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums">
                      {h.cost !== null
                        ? formatMoney(Number(h.cost), h.currency)
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
