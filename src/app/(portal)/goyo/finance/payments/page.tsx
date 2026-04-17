import { Wallet, TrendingUp, Calendar, Hash } from "lucide-react"
import { supabaseGoyo } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard } from "@/components/shared/detail-views"
import { LedgerTable, type LedgerRow } from "@/components/shared/ledger-table"
import { GenericAddLauncher } from "../../_components/GenericEditLauncher"
import { formatINR, formatMoney } from "../../_lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Payments — Goyo | Suprans" }

interface PaymentRow {
  id: string
  booking_id: string | null
  client_id: string | null
  amount: number | string | null
  currency: string | null
  received_at: string | null
  method: string | null
  reference: string | null
  notes: string | null
}

interface BookingLite {
  id: string
  booking_code: string | null
}

interface ClientLite {
  id: string
  name: string | null
}

export default async function GoyoPaymentsPage() {
  const [paymentsRes, bookingsRes, clientsRes] = await Promise.all([
    supabaseGoyo
      .from("payments")
      .select(
        "id, booking_id, client_id, amount, currency, received_at, method, reference, notes",
      )
      .order("received_at", { ascending: true, nullsFirst: false }),
    supabaseGoyo.from("bookings").select("id, booking_code"),
    supabaseGoyo.from("clients").select("id, name"),
  ])

  const payments = (paymentsRes.data ?? []) as PaymentRow[]
  const bookingCode = new Map(
    ((bookingsRes.data ?? []) as BookingLite[]).map((b) => [
      b.id,
      b.booking_code,
    ]),
  )
  const clientName = new Map(
    ((clientsRes.data ?? []) as ClientLite[]).map((c) => [c.id, c.name]),
  )

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
  const usdPayments = payments.filter((p) => p.currency === "USD")

  const monthInr = inrPayments
    .filter((p) => isThisMonth(p.received_at))
    .reduce((s, p) => s + Number(p.amount ?? 0), 0)
  const monthUsd = usdPayments
    .filter((p) => isThisMonth(p.received_at))
    .reduce((s, p) => s + Number(p.amount ?? 0), 0)
  const ytdInr = inrPayments
    .filter((p) => isThisYear(p.received_at))
    .reduce((s, p) => s + Number(p.amount ?? 0), 0)

  const buildRows = (list: PaymentRow[]): LedgerRow[] =>
    list.map((p) => {
      const cName = clientName.get(p.client_id ?? "") ?? "—"
      const code = bookingCode.get(p.booking_id ?? "") ?? "—"
      const ref = p.reference ? ` · ${p.reference}` : ""
      return {
        id: p.id,
        date: p.received_at ?? new Date().toISOString().slice(0, 10),
        description: `${cName} · ${code}${ref}`,
        credit: Number(p.amount ?? 0),
        debit: null,
      }
    })

  const inrRows = buildRows(inrPayments)

  // Group non-INR by currency
  const nonInr = payments.filter((p) => (p.currency ?? "INR") !== "INR")
  const byCcy = new Map<string, PaymentRow[]>()
  for (const p of nonInr) {
    const ccy = p.currency ?? "USD"
    const list = byCcy.get(ccy) ?? []
    list.push(p)
    byCcy.set(ccy, list)
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Payments"
        subtitle={`${payments.length.toLocaleString("en-IN")} payment${payments.length === 1 ? "" : "s"}`}
        actions={
          <GenericAddLauncher
            table="payments"
            listHref="/goyo/finance/payments"
            title="New payment"
            size="lg"
          />
        }
      />

      <KPIGrid>
        <MetricCard
          label="This-month INR"
          value={formatINR(monthInr)}
          icon={Wallet}
          iconTone="emerald"
        />
        <MetricCard
          label="This-month USD"
          value={formatMoney(monthUsd, "USD")}
          icon={TrendingUp}
          iconTone="blue"
        />
        <MetricCard
          label="YTD INR"
          value={formatINR(ytdInr)}
          icon={Calendar}
          iconTone="violet"
        />
        <MetricCard
          label="Total payments"
          value={payments.length.toLocaleString("en-IN")}
          icon={Hash}
          iconTone="slate"
        />
      </KPIGrid>

      <LedgerTable
        rows={inrRows}
        currency="INR"
        locale="en-IN"
        emptyMessage="No INR payments yet."
      />

      {[...byCcy.entries()].map(([ccy, list]) => (
        <DetailCard key={ccy} title={`${ccy} payments`}>
          <LedgerTable
            rows={buildRows(list)}
            currency={ccy}
            locale="en-US"
            emptyMessage={`No ${ccy} payments yet.`}
          />
        </DetailCard>
      ))}
    </div>
  )
}
