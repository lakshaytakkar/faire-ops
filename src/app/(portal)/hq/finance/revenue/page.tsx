import { DollarSign, Layers, Plus, TrendingUp } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { FilterBar } from "@/components/shared/filter-bar"
import { DetailCard } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/format"
import { supabaseHq } from "@/lib/supabase"

export const dynamic = "force-dynamic"

/**
 * Revenue (`/hq/finance/revenue`) — spec §3.2.
 * Server component; read-only list with per-vertical MTD breakdown.
 */

interface RevenueRow {
  id: string
  entity_id: string | null
  vertical: string | null
  source: string | null
  category: string | null
  amount: number | string | null
  currency: string | null
  booked_at: string | null
  notes: string | null
}

function currencySymbol(c: string | null | undefined): string {
  if (!c) return "₹"
  const m: Record<string, string> = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
    AED: "د.إ ",
  }
  return m[c.toUpperCase()] ?? `${c} `
}

function toNumber(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0
  const n = typeof v === "string" ? parseFloat(v) : v
  return Number.isFinite(n) ? n : 0
}

function startOfMonthIso(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

export default async function HqRevenuePage() {
  const { data, error } = await supabaseHq
    .from("revenue")
    .select(
      "id, entity_id, vertical, source, category, amount, currency, booked_at, notes",
    )
    .order("booked_at", { ascending: false })

  const rows = (error ? [] : ((data ?? []) as RevenueRow[]))

  const monthStart = startOfMonthIso()
  let mtd = 0
  let ltd = 0
  const byVerticalMtd = new Map<string, number>()
  const byVerticalLtd = new Map<string, number>()

  for (const r of rows) {
    const amt = toNumber(r.amount)
    ltd += amt
    const v = r.vertical ?? "unknown"
    byVerticalLtd.set(v, (byVerticalLtd.get(v) ?? 0) + amt)
    if (r.booked_at && r.booked_at >= monthStart) {
      mtd += amt
      byVerticalMtd.set(v, (byVerticalMtd.get(v) ?? 0) + amt)
    }
  }

  const topVertical = Array.from(byVerticalLtd.entries()).sort(
    (a, b) => b[1] - a[1],
  )[0]

  const byVerticalMtdList = Array.from(byVerticalMtd.entries()).sort(
    (a, b) => b[1] - a[1],
  )

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Revenue"
        subtitle="Revenue entries across every Suprans vertical."
        actions={
          <Button>
            <Plus className="size-3.5" /> Add Revenue
          </Button>
        }
      />

      <KPIGrid>
        <MetricCard
          label="MTD"
          value={formatCurrency(mtd)}
          icon={TrendingUp}
          iconTone="emerald"
        />
        <MetricCard
          label="LTD"
          value={formatCurrency(ltd)}
          icon={DollarSign}
          iconTone="blue"
        />
        <MetricCard
          label="Top vertical"
          value={topVertical ? topVertical[0] : "—"}
          hint={topVertical ? formatCurrency(topVertical[1]) : undefined}
          icon={Layers}
          iconTone="violet"
        />
        <MetricCard
          label="YoY delta"
          value="—"
          hint="No prior-year data"
          icon={TrendingUp}
          iconTone="slate"
        />
      </KPIGrid>

      <FilterBar
        right={
          <>
            <div className="relative">
              <input
                type="search"
                placeholder="Search source / category / notes..."
                disabled
                className="h-8 w-64 rounded-md border border-input bg-transparent px-2.5 text-sm text-muted-foreground"
              />
            </div>
            <select
              disabled
              className="h-8 rounded-md border border-input bg-transparent px-2.5 text-sm text-muted-foreground"
            >
              <option>All verticals</option>
            </select>
            <span className="inline-flex h-8 items-center rounded-md border border-input bg-transparent px-2.5 text-xs text-muted-foreground">
              Last 6 months
            </span>
          </>
        }
      />

      <DetailCard title="Entries">
        {rows.length === 0 ? (
          <EmptyState
            icon={DollarSign}
            title="No revenue entries"
            description={
              error
                ? `Could not load revenue: ${error.message}`
                : "No revenue has been recorded yet."
            }
          />
        ) : (
          <div className="overflow-x-auto -mx-5 -my-5">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border/80">
                <tr className="text-left">
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Date
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Vertical
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Source
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Category
                  </th>
                  <th className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Amount
                  </th>
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-muted/20 transition-colors align-top"
                  >
                    <td className="px-5 py-3 whitespace-nowrap text-foreground">
                      {formatDate(r.booked_at)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant="outline">{r.vertical ?? "—"}</Badge>
                    </td>
                    <td className="px-5 py-3 font-medium text-foreground">
                      {r.source ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {r.category ?? "—"}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-right font-semibold text-foreground">
                      {formatCurrency(
                        toNumber(r.amount),
                        currencySymbol(r.currency),
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground max-w-[24rem]">
                      {r.notes ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DetailCard>

      <DetailCard title="By vertical (MTD)">
        {byVerticalMtdList.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No revenue booked this month yet.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5 -my-5">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border/80">
                <tr className="text-left">
                  <th className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Vertical
                  </th>
                  <th className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Revenue (MTD)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {byVerticalMtdList.map(([vertical, total]) => (
                  <tr key={vertical}>
                    <td className="px-5 py-3">
                      <Badge variant="outline">{vertical}</Badge>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-foreground">
                      {formatCurrency(total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DetailCard>
    </div>
  )
}
