import { BackLink } from "@/components/shared/back-link"
import { PageHeader } from "@/components/shared/page-header"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { supabaseHq } from "@/lib/supabase"
import { formatCurrency } from "@/lib/format"
import { Wallet } from "lucide-react"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Suprans HQ — P&L Summary",
  description: "Per-vertical revenue, expenses, and margin across the ecosystem.",
}

/* ------------------------------------------------------------------ */
/*  Vertical → display label (mirrors overview page)                    */
/* ------------------------------------------------------------------ */

const VERTICAL_LABEL: Record<string, string> = {
  "b2b-ecommerce": "B2B Ecommerce",
  "ets": "EazyToSell",
  "legal": "LegalNations",
  "goyo": "GoyoTours",
  "usdrop": "USDrop AI",
  "toysinbulk": "Toys in Bulk",
  "hq": "HQ / Corporate",
}

function labelForVertical(slug: string): string {
  return VERTICAL_LABEL[slug] ?? slug
}

function currencyFor(vertical: string): string {
  return vertical === "legal" ? "$" : "₹"
}

/* ------------------------------------------------------------------ */
/*  Data loading                                                        */
/* ------------------------------------------------------------------ */

interface PnlRow {
  vertical: string
  revenueMtd: number
  revenueLtd: number
  cogs: number
  expensesMtd: number
}

async function loadPnl(): Promise<PnlRow[]> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10)

  const [revenueRes, expensesRes] = await Promise.all([
    supabaseHq.from("revenue").select("vertical, amount, booked_at"),
    supabaseHq
      .from("expenses")
      .select("vertical, amount, status, paid_at")
      .in("status", ["approved", "paid"]),
  ])

  if (revenueRes.error) console.error("loadPnl revenue error:", revenueRes.error)
  if (expensesRes.error) console.error("loadPnl expenses error:", expensesRes.error)

  const rowMap = new Map<string, PnlRow>()
  const get = (v: string) => {
    let r = rowMap.get(v)
    if (!r) {
      r = {
        vertical: v,
        revenueMtd: 0,
        revenueLtd: 0,
        cogs: 0,
        expensesMtd: 0,
      }
      rowMap.set(v, r)
    }
    return r
  }

  for (const raw of revenueRes.data ?? []) {
    const row = raw as { vertical: string; amount: number | string; booked_at: string | null }
    const amt = Number(row.amount ?? 0)
    const entry = get(row.vertical)
    entry.revenueLtd += amt
    if (row.booked_at && row.booked_at >= startOfMonth) {
      entry.revenueMtd += amt
    }
  }

  for (const raw of expensesRes.data ?? []) {
    const row = raw as {
      vertical: string
      amount: number | string
      status: string
      paid_at: string | null
    }
    const amt = Number(row.amount ?? 0)
    const entry = get(row.vertical)
    if (row.paid_at && row.paid_at >= startOfMonth) {
      entry.expensesMtd += amt
    }
  }

  return Array.from(rowMap.values()).sort((a, b) => b.revenueLtd - a.revenueLtd)
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default async function HqPnlSummaryPage() {
  const rows = await loadPnl()

  // Totals across verticals — naive sum; LegalNations is USD-denominated so the
  // combined total is conceptually mixed. We show per-vertical currency in the
  // table and surface an INR-flagged total row as a reference only.
  const totals = rows.reduce(
    (acc, r) => {
      acc.revenueMtd += r.revenueMtd
      acc.revenueLtd += r.revenueLtd
      acc.cogs += r.cogs
      acc.expensesMtd += r.expensesMtd
      return acc
    },
    { revenueMtd: 0, revenueLtd: 0, cogs: 0, expensesMtd: 0 },
  )
  const totalGross = totals.revenueMtd - totals.cogs
  const totalNet = totalGross - totals.expensesMtd
  const totalMargin =
    totals.revenueMtd > 0 ? (totalNet / totals.revenueMtd) * 100 : 0

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <BackLink href="/hq/overview" label="Overview" />

      <PageHeader
        title="P&L Summary"
        subtitle="Revenue, expenses, and margin per vertical. LegalNations reports in USD; every other vertical in INR."
      />

      <DetailCard title="By vertical">
        {rows.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No revenue or expenses yet"
            description="Once revenue and expenses are booked against a vertical they roll up here."
          />
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/80 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 px-5 text-left">Vertical</th>
                  <th className="py-2 px-3 text-right">Revenue MTD</th>
                  <th className="py-2 px-3 text-right">Revenue LTD</th>
                  <th className="py-2 px-3 text-right">COGS</th>
                  <th className="py-2 px-3 text-right">Gross Profit</th>
                  <th className="py-2 px-3 text-right">Expenses</th>
                  <th className="py-2 px-3 text-right">Net Profit</th>
                  <th className="py-2 px-5 text-right">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.map((row) => {
                  const symbol = currencyFor(row.vertical)
                  const gross = row.revenueMtd - row.cogs
                  const net = gross - row.expensesMtd
                  const margin =
                    row.revenueMtd > 0 ? (net / row.revenueMtd) * 100 : 0
                  const negative = net < 0
                  return (
                    <tr
                      key={row.vertical}
                      className={negative ? "text-red-700" : "text-foreground"}
                    >
                      <td className="py-2.5 px-5 font-medium">
                        {labelForVertical(row.vertical)}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        {formatCurrency(row.revenueMtd, symbol)}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        {formatCurrency(row.revenueLtd, symbol)}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                        {formatCurrency(row.cogs, symbol)}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        {formatCurrency(gross, symbol)}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        {formatCurrency(row.expensesMtd, symbol)}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold">
                        {formatCurrency(net, symbol)}
                      </td>
                      <td className="py-2.5 px-5 text-right tabular-nums font-semibold">
                        {row.revenueMtd > 0 ? `${margin.toFixed(1)}%` : "—"}
                      </td>
                    </tr>
                  )
                })}
                <tr className="bg-muted/30 font-semibold text-foreground">
                  <td className="py-2.5 px-5">Combined (mixed FX)</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">
                    {formatCurrency(totals.revenueMtd, "")}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums">
                    {formatCurrency(totals.revenueLtd, "")}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                    {formatCurrency(totals.cogs, "")}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums">
                    {formatCurrency(totalGross, "")}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums">
                    {formatCurrency(totals.expensesMtd, "")}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right tabular-nums ${
                      totalNet < 0 ? "text-red-700" : ""
                    }`}
                  >
                    {formatCurrency(totalNet, "")}
                  </td>
                  <td className="py-2.5 px-5 text-right tabular-nums">
                    {totals.revenueMtd > 0 ? `${totalMargin.toFixed(1)}%` : "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          COGS is not yet tracked per vertical — shown as 0 for now. Expenses are
          the sum of <code className="font-mono">approved</code> and{" "}
          <code className="font-mono">paid</code> entries with{" "}
          <code className="font-mono">paid_at</code> in the current month. Combined
          totals add INR and USD line items without FX conversion; use the
          per-vertical rows for decisions.
        </p>
      </DetailCard>
    </div>
  )
}
