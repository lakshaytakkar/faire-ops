"use client"

/**
 * Profitability signal for a single order. Locked until the assigned
 * vendor has submitted a quote (vendor_quotes.total_cost_cents is set).
 * Once quoted, renders:
 *
 *   Net revenue  =  order.total_cents            MINUS
 *                   Faire commission             MINUS
 *                   our shipping charge (payout_costs.shipping_cents)
 *
 *   COGS         =  best available vendor quote (approved > quoted)
 *                   total_cost_cents (includes vendor shipping)
 *
 *   Margin       =  Net revenue - COGS
 *   Margin %     =  Margin / Net revenue   (when Net > 0)
 *
 * Signal:
 *   - Margin % >= 25  → GREEN "Go"
 *   - 10 ≤ Margin % < 25 → AMBER "Proceed with caution"
 *   - Margin % < 10 (including negative) → RED "Raise concerns"
 *
 * Locked state appears with a subtle dashed border + "Awaiting quote"
 * pill and zero numbers, so the card is always present on the page
 * (no layout jumps when quote arrives).
 */

import { CheckCircle2, AlertTriangle, XCircle, Lock } from "lucide-react"

interface Quote {
  status: string
  total_cost_cents: number | null
  shipping_cost_cents: number | null
}

interface ProfitabilityCardProps {
  totalCents: number
  payoutCosts: Record<string, unknown> | null
  quotes: Quote[]
}

function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : ""
  const abs = Math.abs(cents)
  return `${sign}$${(abs / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function pickQuote(quotes: Quote[]): Quote | null {
  // Prefer approved > quoted > anything else with a cost set
  const byPriority = ["approved", "quoted"]
  for (const status of byPriority) {
    const match = quotes.find(
      (q) => q.status === status && q.total_cost_cents != null,
    )
    if (match) return match
  }
  return quotes.find((q) => q.total_cost_cents != null) ?? null
}

export function ProfitabilityCard({
  totalCents,
  payoutCosts,
  quotes,
}: ProfitabilityCardProps) {
  const quote = pickQuote(quotes)

  // Net revenue from payout_costs (same extraction pattern as the page)
  const commissionCents =
    (payoutCosts?.commission_cents as number) ||
    (payoutCosts?.commission_amount_cents as number) ||
    0
  const ourShippingCents =
    (payoutCosts?.shipping_cents as number) ||
    (payoutCosts?.shipping_cost_cents as number) ||
    0
  const netRevenueCents =
    (payoutCosts?.payout_total_cents as number) ||
    (payoutCosts?.net_payout_cents as number) ||
    totalCents - commissionCents

  const locked = !quote || quote.total_cost_cents == null

  if (locked) {
    return (
      <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 p-5">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Profitability</h3>
          <span className="ml-auto inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-muted/60 text-muted-foreground ring-1 ring-inset ring-border/60">
            Awaiting quote
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-snug">
          Margin numbers unlock the moment the vendor submits a quote. Until then
          we can&apos;t price the order against our cost — request a quote via the
          Vendor Quotes card below to get going.
        </p>
        <dl className="mt-4 grid grid-cols-3 gap-3 text-xs text-muted-foreground">
          <SummaryRow label="Net revenue" value="—" />
          <SummaryRow label="Vendor cost" value="—" />
          <SummaryRow label="Margin" value="—" />
        </dl>
      </div>
    )
  }

  const cogsCents = quote!.total_cost_cents ?? 0
  const marginCents = netRevenueCents - cogsCents
  const marginPct = netRevenueCents > 0 ? (marginCents / netRevenueCents) * 100 : 0

  let tone: "green" | "amber" | "red"
  let toneLabel: string
  let toneCopy: string
  if (marginPct >= 25) {
    tone = "green"
    toneLabel = "Go"
    toneCopy = "Margin looks healthy — safe to proceed and pay the vendor."
  } else if (marginPct >= 10) {
    tone = "amber"
    toneLabel = "Proceed with caution"
    toneCopy = "Margin is thin. Worth double-checking shipping + any promo discounts before committing."
  } else {
    tone = "red"
    toneLabel = "Raise concerns"
    toneCopy =
      marginCents < 0
        ? "This order is currently in the red. Don't dispatch until the cost or price gets renegotiated."
        : "Margin is below 10%. Consider pushing back on the quote or declining if costs can't move."
  }

  const toneClasses: Record<typeof tone, { ring: string; text: string; bg: string; icon: React.ElementType }> = {
    green: {
      ring: "ring-emerald-500/40",
      text: "text-emerald-700",
      bg: "bg-emerald-50",
      icon: CheckCircle2,
    },
    amber: {
      ring: "ring-amber-500/40",
      text: "text-amber-700",
      bg: "bg-amber-50",
      icon: AlertTriangle,
    },
    red: {
      ring: "ring-red-500/40",
      text: "text-red-700",
      bg: "bg-red-50",
      icon: XCircle,
    },
  }
  const t = toneClasses[tone]
  const ToneIcon = t.icon

  return (
    <div className={`rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden`}>
      <div className="px-5 py-3.5 border-b flex items-center gap-2">
        <span className="text-[0.9375rem] font-semibold tracking-tight">Profitability</span>
        <span
          className={`ml-auto inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${t.bg} ${t.text} ${t.ring}`}
        >
          <ToneIcon className="size-3" />
          {toneLabel}
        </span>
      </div>

      <div className="p-5 flex flex-col md:flex-row gap-5 items-center md:items-start">
        {/* Big margin ring */}
        <div className={`shrink-0 relative w-24 h-24 rounded-full flex items-center justify-center ${t.bg} ring-4 ${t.ring}`}>
          <div className="text-center">
            <p className={`text-2xl font-bold font-heading leading-none ${t.text}`}>
              {marginPct.toFixed(0)}%
            </p>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              margin
            </p>
          </div>
        </div>

        {/* Numbers */}
        <div className="flex-1 min-w-0 space-y-3">
          <p className={`text-xs font-medium ${t.text}`}>{toneCopy}</p>
          <dl className="grid grid-cols-3 gap-3 text-xs">
            <SummaryRow label="Net revenue" value={formatCents(netRevenueCents)} />
            <SummaryRow label="Vendor cost" value={formatCents(cogsCents)} />
            <SummaryRow
              label={marginCents >= 0 ? "Margin" : "Loss"}
              value={formatCents(marginCents)}
              emphasis={t.text}
            />
          </dl>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>
              Retail {formatCents(totalCents)} · Faire commission{" "}
              {formatCents(commissionCents)}
              {ourShippingCents > 0 ? ` · shipping ${formatCents(ourShippingCents)}` : ""}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryRow({
  label,
  value,
  emphasis,
}: {
  label: string
  value: string
  emphasis?: string
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={`mt-0.5 text-sm font-semibold tabular-nums ${emphasis ?? "text-foreground"}`}>
        {value}
      </p>
    </div>
  )
}
