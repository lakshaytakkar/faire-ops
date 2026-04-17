import { notFound } from "next/navigation"
import { TrendingUp, TrendingDown, Wallet, PieChart } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { formatDate, formatCurrency } from "@/lib/format"
import { GenericEditLauncher } from "../../../_components/GenericEditLauncher"

export const dynamic = "force-dynamic"

type Params = { id: string }

export default async function LifeInvestmentDetailPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params
  const { data } = await supabaseLife
    .from("investments")
    .select(
      "id, name, type, platform, units, buy_price, current_value, invested_amount, pnl, pnl_percent, last_updated, notes, created_at",
    )
    .eq("id", id)
    .maybeSingle()
  if (!data) notFound()
  const inv = data as {
    id: string
    name: string | null
    type: string | null
    platform: string | null
    units: number | null
    buy_price: number | null
    current_value: number | null
    invested_amount: number | null
    pnl: number | null
    pnl_percent: number | null
    last_updated: string | null
    notes: string | null
    created_at: string | null
  }

  const pnl = inv.pnl ?? (
    inv.current_value !== null && inv.invested_amount !== null
      ? Number(inv.current_value) - Number(inv.invested_amount)
      : null
  )
  const pnlPercent = inv.pnl_percent ?? (
    inv.invested_amount && Number(inv.invested_amount) > 0 && pnl !== null
      ? (pnl / Number(inv.invested_amount)) * 100
      : null
  )
  const profit = pnl !== null && pnl >= 0

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title={inv.name ?? "Untitled investment"}
        subtitle={[inv.type, inv.platform].filter(Boolean).join(" • ") || undefined}
        breadcrumbs={[
          { label: "Life", href: "/life" },
          { label: "Investments", href: "/life/finance/investments" },
          { label: inv.name ?? "Investment" },
        ]}
        actions={
          <GenericEditLauncher
            table="investments"
            row={inv}
            title="Edit investment"
            listHref="/life/finance/investments"
          />
        }
      />

      <KPIGrid>
        <MetricCard
          label="Invested"
          value={formatCurrency(inv.invested_amount)}
          icon={Wallet}
          iconTone="blue"
        />
        <MetricCard
          label="Current value"
          value={formatCurrency(inv.current_value)}
          icon={PieChart}
          iconTone="violet"
        />
        <MetricCard
          label="P&L"
          value={formatCurrency(pnl)}
          icon={profit ? TrendingUp : TrendingDown}
          iconTone={profit ? "emerald" : "red"}
        />
        <MetricCard
          label="P&L %"
          value={pnlPercent !== null ? `${pnlPercent.toFixed(2)}%` : "—"}
          icon={profit ? TrendingUp : TrendingDown}
          iconTone={profit ? "emerald" : "red"}
        />
      </KPIGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <DetailCard title="Overview" className="lg:col-span-2">
          <div className="divide-y divide-border">
            <InfoRow label="Type" value={inv.type ?? "—"} />
            <InfoRow label="Platform" value={inv.platform ?? "—"} />
            <InfoRow
              label="Units"
              value={
                inv.units !== null ? (
                  <span className="tabular-nums">{inv.units}</span>
                ) : (
                  "—"
                )
              }
            />
            <InfoRow label="Buy price" value={formatCurrency(inv.buy_price)} />
            <InfoRow label="Last updated" value={formatDate(inv.last_updated)} />
            <InfoRow label="Added" value={formatDate(inv.created_at)} />
          </div>
        </DetailCard>

        <DetailCard title="Notes">
          {inv.notes ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{inv.notes}</p>
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
        </DetailCard>
      </div>
    </div>
  )
}
