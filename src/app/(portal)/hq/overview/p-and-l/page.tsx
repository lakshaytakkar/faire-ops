import { BackLink } from "@/components/shared/back-link"
import { PageHeader } from "@/components/shared/page-header"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import {
  supabaseHq,
  supabaseB2B,
  supabaseGoyo,
  supabaseEts,
  supabaseLegal,
} from "@/lib/supabase"
import { getSupabaseJSBlueridgeAdmin } from "@/lib/supabase"
import { formatCurrency } from "@/lib/format"
import { Wallet, TrendingUp, TrendingDown, DollarSign } from "lucide-react"
import { Suspense } from "react"
import { PnlDatePicker } from "./pnl-date-picker"
import { resolveDateRange } from "./pnl-utils"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Suprans HQ — P&L Summary",
  description:
    "Per-vertical revenue, expenses, and margin across the ecosystem — powered by real data from all schemas.",
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const USD_TO_INR = 85

const VERTICAL_LABEL: Record<string, string> = {
  "b2b-ecommerce": "Faire Wholesale",
  ets: "EazyToSell",
  legal: "LegalNations",
  goyo: "GoyoTours",
  usdrop: "USDrop AI",
  toysinbulk: "Toys in Bulk",
  jsblueridge: "JSBlueridge",
  "b2b-ecosystem": "B2B Ecosystem",
  hq: "HQ / Corporate",
}

function labelFor(slug: string): string {
  return VERTICAL_LABEL[slug] ?? slug
}

/* ------------------------------------------------------------------ */
/*  Data loading — real data from all schemas, date-filtered            */
/* ------------------------------------------------------------------ */

interface PnlRow {
  vertical: string
  revenue: number // INR
  expenses: number // INR
  cogs: number // INR
  orders: number
  nativeCurrency: string
  nativeRevenue: number
}

async function loadPnl(
  from: string | null,
  to: string | null,
): Promise<PnlRow[]> {
  const rowMap = new Map<string, PnlRow>()
  const get = (v: string, cur = "INR") => {
    let r = rowMap.get(v)
    if (!r) {
      r = {
        vertical: v,
        revenue: 0,
        expenses: 0,
        cogs: 0,
        orders: 0,
        nativeCurrency: cur,
        nativeRevenue: 0,
      }
      rowMap.set(v, r)
    }
    return r
  }

  const toEnd = to ? `${to}T23:59:59.999Z` : null

  // ─── 1. Faire Wholesale (b2b.faire_orders) — USD cents ───
  {
    let q = supabaseB2B
      .from("faire_orders")
      .select("total_cents, faire_created_at")
      .not("state", "in", '("CANCELED","CANCELLED")')
    if (from) q = q.gte("faire_created_at", from)
    if (toEnd) q = q.lte("faire_created_at", toEnd)
    const { data, error } = await q
    if (error) console.error("b2b orders:", error)
    const entry = get("b2b-ecommerce", "USD")
    for (const row of data ?? []) {
      const usd = Number(row.total_cents ?? 0) / 100
      entry.nativeRevenue += usd
      entry.revenue += usd * USD_TO_INR
      entry.orders += 1
    }
  }

  // ─── 2. JSBlueridge (jsblueridge.faire_orders) — USD cents ───
  {
    const sbJB = getSupabaseJSBlueridgeAdmin()
    let q = sbJB
      .from("faire_orders")
      .select("total_cents, faire_created_at")
      .not("state", "in", '("CANCELED","CANCELLED")')
    if (from) q = q.gte("faire_created_at", from)
    if (toEnd) q = q.lte("faire_created_at", toEnd)
    const { data, error } = await q
    if (error) console.error("jsblueridge orders:", error)
    const entry = get("jsblueridge", "USD")
    for (const row of data ?? []) {
      const usd = Number(row.total_cents ?? 0) / 100
      entry.nativeRevenue += usd
      entry.revenue += usd * USD_TO_INR
      entry.orders += 1
    }
  }

  // ─── 3. GoyoTours (goyo.bookings) — INR ───
  {
    let q = supabaseGoyo
      .from("bookings")
      .select("total_amount, paid_amount, departure_date, status")
      .not("status", "eq", "cancelled")
    if (from) q = q.gte("departure_date", from)
    if (to) q = q.lte("departure_date", to)
    const { data, error } = await q
    if (error) console.error("goyo bookings:", error)
    const entry = get("goyo", "INR")
    for (const row of data ?? []) {
      const amt = Number(row.total_amount ?? 0)
      entry.nativeRevenue += amt
      entry.revenue += amt
      entry.orders += 1
    }
  }

  // ─── 4. EazyToSell (ets.payments) — INR ───
  {
    let q = supabaseEts
      .from("payments")
      .select("amount, date, type")
    if (from) q = q.gte("date", from)
    if (to) q = q.lte("date", to)
    const { data, error } = await q
    if (error) console.error("ets payments:", error)
    const entry = get("ets", "INR")
    for (const row of data ?? []) {
      const amt = Number(row.amount ?? 0)
      entry.nativeRevenue += amt
      entry.revenue += amt
      entry.orders += 1
    }
  }

  // ─── 5. LegalNations (legal.tax_filings — amount_received) — USD ───
  {
    let q = supabaseLegal
      .from("tax_filings")
      .select("amount_received, created_at")
      .gt("amount_received", 0)
    if (from) q = q.gte("created_at", from)
    if (toEnd) q = q.lte("created_at", toEnd)
    const { data, error } = await q
    if (error) console.error("legal filings:", error)
    const entry = get("legal", "USD")
    for (const row of data ?? []) {
      const usd = Number(row.amount_received ?? 0)
      entry.nativeRevenue += usd
      entry.revenue += usd * USD_TO_INR
      entry.orders += 1
    }
  }

  // ─── 6. Expenses from hq.expenses — mixed currencies ───
  {
    let q = supabaseHq
      .from("expenses")
      .select("vertical, amount, currency, status, paid_at")
      .in("status", ["approved", "paid"])
    if (from) q = q.gte("paid_at", from)
    if (to) q = q.lte("paid_at", to)
    const { data, error } = await q
    if (error) console.error("hq expenses:", error)
    for (const row of data ?? []) {
      const amt = Number(row.amount ?? 0)
      const cur = (row.currency as string) || "INR"
      const inr = cur === "USD" ? amt * USD_TO_INR : amt
      const entry = get(row.vertical as string)
      entry.expenses += inr
    }
  }

  // Ensure all known verticals appear even with 0
  for (const slug of Object.keys(VERTICAL_LABEL)) {
    get(slug)
  }

  return Array.from(rowMap.values())
    .filter((r) => r.revenue > 0 || r.expenses > 0)
    .sort((a, b) => b.revenue - a.revenue)
}

/* ------------------------------------------------------------------ */
/*  KPI cards                                                           */
/* ------------------------------------------------------------------ */

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  negative,
}: {
  label: string
  value: string
  sub?: string
  icon: typeof TrendingUp
  negative?: boolean
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-card p-4 space-y-1">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p
        className={`text-xl font-bold tabular-nums ${negative ? "text-red-600" : "text-foreground"}`}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default async function HqPnlSummaryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const { from, to, label: rangeLabel } = resolveDateRange(sp)
  const rows = await loadPnl(from, to)

  const totals = rows.reduce(
    (acc, r) => {
      acc.revenue += r.revenue
      acc.expenses += r.expenses
      acc.cogs += r.cogs
      acc.orders += r.orders
      return acc
    },
    { revenue: 0, expenses: 0, cogs: 0, orders: 0 },
  )
  const totalGross = totals.revenue - totals.cogs
  const totalNet = totalGross - totals.expenses
  const totalMargin =
    totals.revenue > 0 ? (totalNet / totals.revenue) * 100 : 0

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <BackLink href="/hq/overview" label="Overview" />

      <PageHeader
        title="P&L Summary"
        subtitle={`Real revenue from all business schemas, converted to INR (₹1 USD = ₹${USD_TO_INR}). Period: ${rangeLabel}.`}
      />

      {/* Date picker */}
      <Suspense>
        <PnlDatePicker />
      </Suspense>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          icon={DollarSign}
          label="Total Revenue"
          value={formatCurrency(Math.round(totals.revenue))}
          sub={`${totals.orders} transactions`}
        />
        <KpiCard
          icon={TrendingDown}
          label="Total Expenses"
          value={formatCurrency(Math.round(totals.expenses))}
        />
        <KpiCard
          icon={TrendingUp}
          label="Net Profit"
          value={formatCurrency(Math.round(totalNet))}
          negative={totalNet < 0}
        />
        <KpiCard
          icon={TrendingUp}
          label="Margin"
          value={totals.revenue > 0 ? `${totalMargin.toFixed(1)}%` : "—"}
          sub={totalNet >= 0 ? "Profitable" : "Loss-making"}
          negative={totalNet < 0}
        />
      </div>

      {/* Table */}
      <DetailCard title="By Vertical">
        {rows.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No revenue or expenses in this period"
            description="Adjust the date range or book revenue against a vertical."
          />
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/80 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 px-5 text-left">Vertical</th>
                  <th className="py-2 px-3 text-right">Native Revenue</th>
                  <th className="py-2 px-3 text-right">Revenue (₹)</th>
                  <th className="py-2 px-3 text-right">COGS (₹)</th>
                  <th className="py-2 px-3 text-right">Gross Profit (₹)</th>
                  <th className="py-2 px-3 text-right">Expenses (₹)</th>
                  <th className="py-2 px-3 text-right">Net Profit (₹)</th>
                  <th className="py-2 px-3 text-right">Margin %</th>
                  <th className="py-2 px-5 text-right">Txns</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.map((row) => {
                  const gross = row.revenue - row.cogs
                  const net = gross - row.expenses
                  const margin =
                    row.revenue > 0 ? (net / row.revenue) * 100 : 0
                  const negative = net < 0
                  const nativeSymbol =
                    row.nativeCurrency === "USD" ? "$" : "₹"
                  return (
                    <tr
                      key={row.vertical}
                      className={
                        negative ? "text-red-700" : "text-foreground"
                      }
                    >
                      <td className="py-2.5 px-5 font-medium">
                        {labelFor(row.vertical)}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                        {formatCurrency(
                          Math.round(row.nativeRevenue),
                          nativeSymbol,
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        {formatCurrency(Math.round(row.revenue))}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                        {formatCurrency(Math.round(row.cogs))}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        {formatCurrency(Math.round(gross))}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        {formatCurrency(Math.round(row.expenses))}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold">
                        {formatCurrency(Math.round(net))}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold">
                        {row.revenue > 0 ? `${margin.toFixed(1)}%` : "—"}
                      </td>
                      <td className="py-2.5 px-5 text-right tabular-nums text-muted-foreground">
                        {row.orders.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  )
                })}

                {/* Totals row */}
                <tr className="bg-muted/30 font-semibold text-foreground border-t-2 border-border">
                  <td className="py-2.5 px-5">
                    Combined (₹ INR)
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                    —
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums">
                    {formatCurrency(Math.round(totals.revenue))}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                    {formatCurrency(Math.round(totals.cogs))}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums">
                    {formatCurrency(Math.round(totalGross))}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums">
                    {formatCurrency(Math.round(totals.expenses))}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right tabular-nums ${
                      totalNet < 0 ? "text-red-700" : ""
                    }`}
                  >
                    {formatCurrency(Math.round(totalNet))}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums">
                    {totals.revenue > 0
                      ? `${totalMargin.toFixed(1)}%`
                      : "—"}
                  </td>
                  <td className="py-2.5 px-5 text-right tabular-nums">
                    {totals.orders.toLocaleString("en-IN")}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          Revenue is pulled live from each vertical&apos;s schema:{" "}
          <strong>b2b.faire_orders</strong> (Faire Wholesale),{" "}
          <strong>jsblueridge.faire_orders</strong> (JSBlueridge),{" "}
          <strong>goyo.bookings</strong> (GoyoTours),{" "}
          <strong>ets.payments</strong> (EazyToSell),{" "}
          <strong>legal.tax_filings</strong> (LegalNations).
          USD values converted at ₹{USD_TO_INR}/USD. COGS not yet tracked per
          vertical. Expenses from <strong>hq.expenses</strong> (approved + paid).
        </p>
      </DetailCard>
    </div>
  )
}
