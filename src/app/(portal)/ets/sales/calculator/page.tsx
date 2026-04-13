"use client"

import { useEffect, useMemo, useState } from "react"
import { supabaseEts } from "@/lib/supabase"
import { EtsListShell, formatCurrency } from "@/app/(portal)/ets/_components/ets-ui"

const TIER_BASE: Record<string, number> = {
  "Launch Lite": 350000,
  "Launch Pro": 650000,
  "Launch Elite": 1100000,
}

interface PriceSetting {
  key: string
  value: number
}

export default function EtsSalesCalculatorPage() {
  const [area, setArea] = useState(1000)
  const [tier, setTier] = useState<keyof typeof TIER_BASE>("Launch Pro")
  const [usdCny, setUsdCny] = useState(7.2)
  const [inrUsd, setInrUsd] = useState(84)
  const [freightCbm, setFreightCbm] = useState(120)
  const [markup, setMarkup] = useState(20)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data } = await supabaseEts
        .from("price_settings")
        .select("key, value")
      if (cancelled) return
      const map = new Map<string, number>(
        ((data ?? []) as PriceSetting[]).map((r) => [r.key, Number(r.value)]),
      )
      if (map.has("USD_CNY_RATE")) setUsdCny(map.get("USD_CNY_RATE")!)
      if (map.has("INR_USD_RATE")) setInrUsd(map.get("INR_USD_RATE")!)
      if (map.has("FREIGHT_PER_CBM_USD"))
        setFreightCbm(map.get("FREIGHT_PER_CBM_USD")!)
      if (map.has("MARKUP_OPENING_PCT"))
        setMarkup(map.get("MARKUP_OPENING_PCT")!)
      setLoaded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const computed = useMemo(() => {
    const baseTier = TIER_BASE[tier] ?? 0
    const setupKitCost = area * 450
    const openingInventoryCost = area * 1200
    const totalInvestment = baseTier + setupKitCost + openingInventoryCost
    const monthlyRevenue = area * 350
    const monthlyMargin = monthlyRevenue * 0.32
    const breakevenMonths =
      monthlyMargin > 0 ? totalInvestment / monthlyMargin : 0
    const mrpMultiplier = 1 + markup / 100
    return {
      baseTier,
      setupKitCost,
      openingInventoryCost,
      totalInvestment,
      monthlyRevenue,
      breakevenMonths,
      mrpMultiplier,
    }
  }, [area, tier, markup])

  return (
    <EtsListShell
      title="Price calculator"
      subtitle={
        loaded
          ? "Live partner store investment & breakeven model"
          : "Loading defaults from price_settings…"
      }
    >
      <section className="rounded-lg border border-border/80 bg-card shadow-sm p-5">
        <h2 className="text-sm font-semibold mb-4">Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Store area (sqft)">
            <input
              type="number"
              value={area}
              onChange={(e) => setArea(Number(e.target.value) || 0)}
              className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
            />
          </Field>
          <Field label="Package tier">
            <select
              value={tier}
              onChange={(e) =>
                setTier(e.target.value as keyof typeof TIER_BASE)
              }
              className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
            >
              {Object.keys(TIER_BASE).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="USD/CNY rate">
            <input
              type="number"
              step="0.01"
              value={usdCny}
              onChange={(e) => setUsdCny(Number(e.target.value) || 0)}
              className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
            />
          </Field>
          <Field label="INR/USD rate">
            <input
              type="number"
              step="0.01"
              value={inrUsd}
              onChange={(e) => setInrUsd(Number(e.target.value) || 0)}
              className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
            />
          </Field>
          <Field label="Freight per CBM (USD)">
            <input
              type="number"
              value={freightCbm}
              onChange={(e) => setFreightCbm(Number(e.target.value) || 0)}
              className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
            />
          </Field>
          <Field label="Markup % (opening)">
            <input
              type="number"
              value={markup}
              onChange={(e) => setMarkup(Number(e.target.value) || 0)}
              className="w-full h-9 rounded-md border border-border/80 bg-background px-3 text-sm"
            />
          </Field>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <OutputCard
          label="Setup kit cost"
          value={formatCurrency(computed.setupKitCost)}
          hint={`${area} sqft × ₹450`}
        />
        <OutputCard
          label="Opening inventory"
          value={formatCurrency(computed.openingInventoryCost)}
          hint={`${area} sqft × ₹1,200`}
        />
        <OutputCard
          label="Tier base"
          value={formatCurrency(computed.baseTier)}
          hint={tier}
        />
        <OutputCard
          label="Total investment"
          value={formatCurrency(computed.totalInvestment)}
          hint="Tier + setup + inventory"
          accent
        />
        <OutputCard
          label="Expected monthly revenue"
          value={formatCurrency(computed.monthlyRevenue)}
          hint={`${area} sqft × ₹350`}
        />
        <OutputCard
          label="Breakeven"
          value={`${computed.breakevenMonths.toFixed(1)} months`}
          hint="At 32% gross margin"
        />
        <OutputCard
          label="Suggested MRP multiplier"
          value={`${computed.mrpMultiplier.toFixed(2)}×`}
          hint={`${markup}% markup`}
        />
        <OutputCard
          label="USD landed (₹/USD)"
          value={`₹${inrUsd.toFixed(2)}`}
          hint={`USD/CNY ${usdCny.toFixed(2)} · Freight $${freightCbm}/CBM`}
        />
      </section>
    </EtsListShell>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">
        {label}
      </label>
      {children}
    </div>
  )
}

function OutputCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: string
  hint?: string
  accent?: boolean
}) {
  return (
    <div
      className={
        "rounded-lg border bg-card shadow-sm p-4 " +
        (accent
          ? "border-emerald-500/40 ring-1 ring-emerald-500/10"
          : "border-border/80")
      }
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={
          "mt-1.5 font-bold " +
          (accent ? "text-xl text-emerald-700" : "text-lg")
        }
      >
        {value}
      </div>
      {hint && (
        <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>
      )}
    </div>
  )
}
