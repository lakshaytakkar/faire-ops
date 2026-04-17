"use client"

// TrendChartGrid — compact grid of sparkline cards, one per trend series.
// Typical uses: KPI dashboards, finance/ops pulse boards, sub-hero callouts.
// NOTE: `recharts` is not a dependency of this repo, so this component uses a
// lightweight inline SVG area-sparkline instead. The public API is stable, so
// swapping to recharts later is a drop-in change behind the scenes.

import { useId } from "react"
import { cn } from "@/lib/utils"

export interface TrendSeries {
  key: string
  label: string
  data: { x: string | Date; y: number }[]
  color?: string
  unit?: string
}

const COLUMN_CLASS: Record<1 | 2 | 3 | 4, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
}

export function TrendChartGrid({
  series,
  columns = 2,
  height = 180,
}: {
  series: TrendSeries[]
  columns?: 1 | 2 | 3 | 4
  height?: number
}) {
  return (
    <div className={cn("grid gap-4", COLUMN_CLASS[columns])}>
      {series.map((s) => (
        <TrendChartCard key={s.key} series={s} height={height} />
      ))}
    </div>
  )
}

function TrendChartCard({ series, height }: { series: TrendSeries; height: number }) {
  const last = series.data[series.data.length - 1]
  const lastValue = last ? formatNumeric(last.y) : "—"
  const color = series.color ?? "hsl(var(--primary, 221 83% 53%))"

  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold tracking-tight text-foreground">
          {series.label}
        </div>
        <div className="text-sm text-muted-foreground tabular-nums">
          last: <span className="font-semibold text-foreground">{lastValue}</span>
          {series.unit && <span className="ml-1 text-muted-foreground">{series.unit}</span>}
        </div>
      </div>
      <Sparkline data={series.data} color={color} height={height} />
    </div>
  )
}

function formatNumeric(n: number): string {
  if (!Number.isFinite(n)) return "—"
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 })
}

function Sparkline({
  data,
  color,
  height,
}: {
  data: TrendSeries["data"]
  color: string
  height: number
}) {
  const gradientId = useId()

  if (data.length === 0) {
    return (
      <div
        className="rounded-md border border-dashed bg-muted/20 flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        No data
      </div>
    )
  }

  const width = 600 // viewBox width, renders responsive via preserveAspectRatio
  const padding = 4
  const ys = data.map((p) => p.y)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const range = maxY - minY || 1

  const points = data.map((p, i) => {
    const x = data.length === 1 ? width / 2 : padding + (i / (data.length - 1)) * (width - padding * 2)
    const y = padding + (1 - (p.y - minY) / range) * (height - padding * 2)
    return { x, y }
  })

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ")

  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${height - padding} L ${points[0].x.toFixed(2)} ${height - padding} Z`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
      role="img"
      aria-label="trend sparkline"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {points.length > 0 && (
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r={3}
          fill={color}
        />
      )}
    </svg>
  )
}

