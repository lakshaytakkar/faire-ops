import { supabaseGoyo } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import {
  TimelineList,
  type TimelineItem,
} from "@/components/shared/timeline-list"
import { formatMoney, visaStatusTone } from "../../_lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Activity — Goyo | Suprans" }

interface BookingRow {
  id: string
  booking_code: string | null
  client_id: string | null
  status: string | null
  departure_date: string | null
  total_amount: number | null
  currency: string | null
  created_at: string | null
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
  updated_at: string | null
}

interface ClientLite {
  id: string
  name: string | null
}

export default async function GoyoActivityPage() {
  const cutoff = new Date(Date.now() - 30 * 86_400_000)
  const cutoffDate = cutoff.toISOString().slice(0, 10)
  const cutoffIso = cutoff.toISOString()

  const [bookingsRes, paymentsRes, visasRes, clientsRes] = await Promise.all([
    supabaseGoyo
      .from("bookings")
      .select(
        "id, booking_code, client_id, status, departure_date, total_amount, currency, created_at",
      )
      .gte("created_at", cutoffIso)
      .order("created_at", { ascending: false })
      .limit(100),
    supabaseGoyo
      .from("payments")
      .select("id, booking_id, client_id, amount, currency, received_at, reference")
      .gte("received_at", cutoffDate)
      .order("received_at", { ascending: false })
      .limit(100),
    supabaseGoyo
      .from("visas")
      .select("id, traveller_name, country, status, updated_at")
      .gte("updated_at", cutoffIso)
      .order("updated_at", { ascending: false })
      .limit(100),
    supabaseGoyo.from("clients").select("id, name"),
  ])

  if (bookingsRes.error)
    console.error("goyo.bookings:", bookingsRes.error.message)
  if (paymentsRes.error)
    console.error("goyo.payments:", paymentsRes.error.message)
  if (visasRes.error) console.error("goyo.visas:", visasRes.error.message)
  if (clientsRes.error) console.error("goyo.clients:", clientsRes.error.message)

  const bookings = (bookingsRes.data ?? []) as BookingRow[]
  const payments = (paymentsRes.data ?? []) as PaymentRow[]
  const visas = (visasRes.data ?? []) as VisaRow[]
  const clients = (clientsRes.data ?? []) as ClientLite[]

  const clientName = new Map(clients.map((c) => [c.id, c.name ?? "—"]))

  const items: TimelineItem[] = []

  for (const b of bookings) {
    if (!b.created_at) continue
    const clientLabel = clientName.get(b.client_id ?? "") ?? "—"
    items.push({
      id: `book-${b.id}`,
      date: b.created_at,
      title: `New booking — ${b.booking_code ?? "—"}`,
      body: `${clientLabel} · ${formatMoney(b.total_amount, b.currency)}`,
      badge: { label: "booking", tone: "blue" },
      href: `/goyo/bookings/${b.id}`,
    })
  }

  for (const p of payments) {
    if (!p.received_at) continue
    const clientLabel = clientName.get(p.client_id ?? "") ?? "—"
    const bodyParts = [clientLabel]
    if (p.reference) bodyParts.push(p.reference)
    items.push({
      id: `pay-${p.id}`,
      date: p.received_at,
      title: `Payment received — ${formatMoney(p.amount, p.currency)}`,
      body: bodyParts.join(" · "),
      badge: { label: "payment", tone: "emerald" },
    })
  }

  for (const v of visas) {
    if (!v.updated_at) continue
    const tone =
      v.status === "approved" ? "emerald" : visaStatusTone(v.status)
    items.push({
      id: `visa-${v.id}`,
      date: v.updated_at,
      title: `Visa ${v.status ?? "updated"} — ${v.traveller_name ?? "—"}`,
      body: v.country ?? undefined,
      badge: { label: "visa", tone },
    })
  }

  items.sort((a, b) => {
    const da = typeof a.date === "string" ? a.date : a.date.toISOString()
    const db = typeof b.date === "string" ? b.date : b.date.toISOString()
    return db.localeCompare(da)
  })

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader title="Activity" subtitle="Last 30 days" />
      <TimelineList
        items={items}
        emptyMessage="No activity in the last 30 days."
      />
    </div>
  )
}
