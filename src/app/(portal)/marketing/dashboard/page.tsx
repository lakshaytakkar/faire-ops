"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Zap,
  BarChart3,
  LineChart,
  Wallet,
  ArrowRight,
  LayoutDashboard,
} from "lucide-react"
import {
  useCampaigns,
  useAdReports,
  useMarketingBudgets,
  formatCents,
  formatCompact,
  statusColor,
  OBJECTIVE_LABELS,
  type MetaCampaign,
  type MetaAdReport,
  type MarketingBudget,
} from "@/lib/use-marketing-data"

/* ------------------------------------------------------------------ */
/*  Skeleton helpers                                                    */
/* ------------------------------------------------------------------ */

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />
}

function StatCardSkeleton() {
  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5 space-y-3">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-7 w-28" />
      <Skeleton className="h-3 w-16" />
    </div>
  )
}

function TableRowSkeleton() {
  return (
    <tr className="border-b border-border/50">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  )
}

/* ------------------------------------------------------------------ */
/*  Stat card                                                           */
/* ------------------------------------------------------------------ */

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub: string
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm p-5">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center justify-center size-8 rounded-md bg-primary/10 text-primary">
          <Icon className="size-4" />
        </div>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  SVG Daily Spend Chart                                               */
/* ------------------------------------------------------------------ */

function DailySpendChart({ reports }: { reports: MetaAdReport[] }) {
  const days = useMemo(() => {
    const map = new Map<string, number>()
    const now = new Date()
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      map.set(d.toISOString().split("T")[0], 0)
    }
    for (const r of reports) {
      const key = r.report_date
      if (map.has(key)) map.set(key, (map.get(key) ?? 0) + r.spend_cents)
    }
    return Array.from(map.entries()).map(([date, cents]) => ({ date, cents }))
  }, [reports])

  const maxVal = Math.max(...days.map((d) => d.cents), 1)
  const w = 600
  const h = 200
  const padX = 40
  const padY = 20
  const plotW = w - padX * 2
  const plotH = h - padY * 2

  const points = days.map((d, i) => ({
    x: padX + (i / (days.length - 1)) * plotW,
    y: padY + plotH - (d.cents / maxVal) * plotH,
    ...d,
  }))

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ")
  const areaPath = `M${points[0].x},${padY + plotH} ${points
    .map((p) => `L${p.x},${p.y}`)
    .join(" ")} L${points[points.length - 1].x},${padY + plotH} Z`

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
    y: padY + plotH - pct * plotH,
    label: `$${formatCompact(Math.round((pct * maxVal) / 100))}`,
  }))

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      {/* Grid lines */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line
            x1={padX}
            y1={t.y}
            x2={w - padX}
            y2={t.y}
            stroke="currentColor"
            className="text-border"
            strokeWidth={0.5}
          />
          <text
            x={padX - 4}
            y={t.y + 3}
            textAnchor="end"
            className="fill-muted-foreground"
            fontSize={9}
          >
            {t.label}
          </text>
        </g>
      ))}
      {/* Area fill */}
      <path d={areaPath} className="fill-primary/10" />
      {/* Line */}
      <polyline
        points={polyline}
        fill="none"
        stroke="currentColor"
        className="text-primary"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* Dots */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={2.5}
          className="fill-primary"
        />
      ))}
      {/* X-axis labels (every 7 days) */}
      {points
        .filter((_, i) => i % 7 === 0)
        .map((p, i) => (
          <text
            key={i}
            x={p.x}
            y={h - 2}
            textAnchor="middle"
            className="fill-muted-foreground"
            fontSize={8}
          >
            {new Date(p.date).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </text>
        ))}
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  SVG Campaign Performance Bar Chart                                  */
/* ------------------------------------------------------------------ */

function CampaignBarChart({ campaigns }: { campaigns: MetaCampaign[] }) {
  const top5 = useMemo(
    () =>
      [...campaigns]
        .sort((a, b) => b.spend_cents - a.spend_cents)
        .slice(0, 5),
    [campaigns]
  )

  if (top5.length === 0) return null

  const maxVal = Math.max(...top5.map((c) => c.spend_cents), 1)
  const w = 600
  const h = 200
  const padL = 120
  const padR = 50
  const padY = 10
  const barH = 28
  const gap = 8

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      {top5.map((c, i) => {
        const y = padY + i * (barH + gap)
        const barW = ((c.spend_cents / maxVal) * (w - padL - padR))
        const name =
          c.name.length > 16 ? c.name.slice(0, 16) + "..." : c.name
        return (
          <g key={c.id}>
            <text
              x={padL - 8}
              y={y + barH / 2 + 4}
              textAnchor="end"
              className="fill-foreground"
              fontSize={10}
            >
              {name}
            </text>
            <rect
              x={padL}
              y={y}
              width={Math.max(barW, 2)}
              height={barH}
              rx={4}
              className="fill-primary/80"
            />
            <text
              x={padL + barW + 6}
              y={y + barH / 2 + 4}
              className="fill-muted-foreground"
              fontSize={10}
            >
              ${formatCents(c.spend_cents)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                         */
/* ------------------------------------------------------------------ */

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex items-center justify-center size-12 rounded-full bg-muted mb-4">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-xs">{description}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main page                                                           */
/* ------------------------------------------------------------------ */

export default function MarketingDashboardPage() {
  const { campaigns, loading: campaignsLoading } = useCampaigns()
  const { reports, loading: reportsLoading } = useAdReports()
  const { budgets, loading: budgetsLoading } = useMarketingBudgets()

  const loading = campaignsLoading || reportsLoading || budgetsLoading

  /* Compute stats */
  const now = new Date()
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

  const thisMonthReports = useMemo(
    () => reports.filter((r) => r.report_date.startsWith(monthStr)),
    [reports, monthStr]
  )

  const totalSpendCents = useMemo(
    () => thisMonthReports.reduce((s, r) => s + r.spend_cents, 0),
    [thisMonthReports]
  )
  const totalRevenueCents = useMemo(
    () => thisMonthReports.reduce((s, r) => s + r.revenue_cents, 0),
    [thisMonthReports]
  )
  const totalConversions = useMemo(
    () => thisMonthReports.reduce((s, r) => s + r.conversions, 0),
    [thisMonthReports]
  )
  const roas = totalSpendCents > 0 ? totalRevenueCents / totalSpendCents : 0
  const activeCampaigns = campaigns.filter((c) => c.status === "ACTIVE").length

  /* Budget */
  const currentBudget = useMemo(
    () => budgets.find((b) => b.month.startsWith(monthStr)),
    [budgets, monthStr]
  )
  const budgetPlanned = currentBudget?.planned_cents ?? 0
  const budgetSpent = currentBudget?.spent_cents ?? totalSpendCents
  const budgetPct = budgetPlanned > 0 ? Math.min((budgetSpent / budgetPlanned) * 100, 100) : 0

  /* Top campaigns */
  const topCampaigns = useMemo(
    () =>
      [...campaigns]
        .sort((a, b) => b.spend_cents - a.spend_cents)
        .slice(0, 10),
    [campaigns]
  )

  /* ---- Render ---- */

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden p-5">
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden p-5">
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b">
            <Skeleton className="h-5 w-40" />
          </div>
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRowSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Marketing Dashboard</h1>
        <Link
          href="/marketing/campaigns"
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          View all campaigns <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={DollarSign}
          label="Total Spend"
          value={`$${formatCents(totalSpendCents)}`}
          sub="This month"
        />
        <StatCard
          icon={TrendingUp}
          label="ROAS"
          value={roas.toFixed(2) + "x"}
          sub="Return on ad spend"
        />
        <StatCard
          icon={ShoppingCart}
          label="Conversions"
          value={formatCompact(totalConversions)}
          sub="This month"
        />
        <StatCard
          icon={Zap}
          label="Active Campaigns"
          value={String(activeCampaigns)}
          sub={`of ${campaigns.length} total`}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Daily Spend Chart */}
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b flex items-center gap-2">
            <LineChart className="size-4 text-muted-foreground" />
            <span className="text-[0.9375rem] font-semibold tracking-tight">
              Daily Spend (30 days)
            </span>
          </div>
          <div className="p-5">
            {reports.length === 0 ? (
              <EmptyState
                icon={LineChart}
                title="No spend data"
                description="Ad report data will appear here once campaigns start running."
              />
            ) : (
              <DailySpendChart reports={reports} />
            )}
          </div>
        </div>

        {/* Campaign Performance Bar Chart */}
        <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b flex items-center gap-2">
            <BarChart3 className="size-4 text-muted-foreground" />
            <span className="text-[0.9375rem] font-semibold tracking-tight">
              Top 5 Campaigns by Spend
            </span>
          </div>
          <div className="p-5">
            {campaigns.length === 0 ? (
              <EmptyState
                icon={BarChart3}
                title="No campaigns yet"
                description="Create your first campaign to see performance data."
              />
            ) : (
              <CampaignBarChart campaigns={campaigns} />
            )}
          </div>
        </div>
      </div>

      {/* Top Campaigns Table */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b flex items-center gap-2">
          <LayoutDashboard className="size-4 text-muted-foreground" />
          <span className="text-[0.9375rem] font-semibold tracking-tight">
            Top Campaigns
          </span>
        </div>
        {topCampaigns.length === 0 ? (
          <EmptyState
            icon={Zap}
            title="No campaigns"
            description="Create campaigns to track their performance here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Budget
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Spend
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Conversions
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    ROAS
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide" />
                </tr>
              </thead>
              <tbody>
                {topCampaigns.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-border/40 hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate">
                      {c.name}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(c.status)}`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                      ${formatCents(c.budget_cents)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                      ${formatCents(c.spend_cents)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                      {formatCompact(c.conversions)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                      {c.roas.toFixed(2)}x
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/marketing/campaigns/${c.id}`}
                        className="text-xs text-primary hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Monthly Budget */}
      <div className="rounded-lg border border-border/80 bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b flex items-center gap-2">
          <Wallet className="size-4 text-muted-foreground" />
          <span className="text-[0.9375rem] font-semibold tracking-tight">
            Monthly Budget
          </span>
        </div>
        <div className="p-5 space-y-3">
          {budgetPlanned === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No budget set"
              description="Set a monthly marketing budget to track spending against your plan."
            />
          ) : (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  ${formatCents(budgetSpent)} spent of ${formatCents(budgetPlanned)}
                </span>
                <span className="font-semibold text-foreground">
                  {budgetPct.toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    budgetPct > 90
                      ? "bg-red-500"
                      : budgetPct > 70
                        ? "bg-amber-500"
                        : "bg-primary"
                  }`}
                  style={{ width: `${budgetPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Remaining: ${formatCents(Math.max(budgetPlanned - budgetSpent, 0))}
                </span>
                <span>
                  {now.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
