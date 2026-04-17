import Link from "next/link"
import { Compass, CheckCircle2, Clock, Wallet } from "lucide-react"
import { supabaseGoyo } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import { GenericAddLauncher } from "../_components/GenericEditLauncher"
import { formatINR, formatMoney, tourStatusTone } from "../_lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Tours — Goyo | Suprans" }

interface TourRow {
  id: string
  name: string | null
  type: string | null
  destination: string | null
  duration_days: number | null
  base_price: number | string | null
  currency: string | null
  status: string | null
  highlights: string | null
  inclusions: string | null
  exclusions: string | null
}

export default async function GoyoToursPage() {
  const toursRes = await supabaseGoyo
    .from("tours")
    .select(
      "id, name, type, destination, duration_days, base_price, currency, status, highlights, inclusions, exclusions",
    )
    .order("name", { ascending: true })

  if (toursRes.error) console.error("goyo.tours:", toursRes.error.message)

  const tours = (toursRes.data ?? []) as TourRow[]
  const activeCount = tours.filter((t) => t.status === "active").length

  const durationVals = tours
    .map((t) => Number(t.duration_days))
    .filter((n) => Number.isFinite(n) && n > 0)
  const avgDuration =
    durationVals.length > 0
      ? durationVals.reduce((s, n) => s + n, 0) / durationVals.length
      : 0

  const inrTours = tours.filter(
    (t) => (t.currency ?? "INR") === "INR" && t.base_price !== null,
  )
  const avgInrPrice =
    inrTours.length > 0
      ? inrTours.reduce((s, t) => s + Number(t.base_price ?? 0), 0) /
        inrTours.length
      : 0

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title="Tours"
        subtitle={`${tours.length.toLocaleString("en-IN")} tour${tours.length === 1 ? "" : "s"} · ${activeCount.toLocaleString("en-IN")} active`}
        actions={
          <GenericAddLauncher
            table="tours"
            listHref="/goyo/tours"
            title="New tour"
            size="lg"
          />
        }
      />

      <KPIGrid>
        <MetricCard
          label="Total"
          value={tours.length.toLocaleString("en-IN")}
          icon={Compass}
          iconTone="blue"
        />
        <MetricCard
          label="Active"
          value={activeCount.toLocaleString("en-IN")}
          icon={CheckCircle2}
          iconTone="emerald"
        />
        <MetricCard
          label="Avg duration"
          value={
            <span className="tabular-nums">
              {avgDuration ? avgDuration.toFixed(1) : "—"}
            </span>
          }
          hint="days"
          icon={Clock}
          iconTone="violet"
        />
        <MetricCard
          label="Avg base price (INR)"
          value={avgInrPrice ? formatINR(avgInrPrice) : "—"}
          icon={Wallet}
          iconTone="amber"
        />
      </KPIGrid>

      {tours.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="No tours yet"
          description="Add your first tour to start building bookings against it."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tours.map((t) => (
            <Link key={t.id} href={`/goyo/tours/${t.id}`}>
              <div className="rounded-lg border bg-card p-5 hover:border-foreground/20 hover:shadow-sm transition space-y-3 h-full">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-base font-semibold leading-snug">
                    {t.name ?? "Untitled tour"}
                  </p>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {t.type && <StatusBadge tone="slate">{t.type}</StatusBadge>}
                    {t.status && (
                      <StatusBadge tone={tourStatusTone(t.status)}>
                        {t.status}
                      </StatusBadge>
                    )}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground tabular-nums">
                  {t.destination ?? "—"}
                  {t.duration_days
                    ? ` · ${t.duration_days} day${t.duration_days === 1 ? "" : "s"}`
                    : ""}
                </div>
                <div className="text-sm font-semibold text-foreground tabular-nums">
                  {t.base_price !== null
                    ? formatMoney(Number(t.base_price), t.currency)
                    : "—"}
                </div>
                {t.highlights && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {t.highlights}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
