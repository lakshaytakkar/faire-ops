import { Users } from "lucide-react"
import { supabaseGoyo } from "@/lib/supabase"
import { BackLink } from "@/components/shared/back-link"
import { HeroCard } from "@/components/shared/hero-card"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import { GenericEditLauncher } from "../../_components/GenericEditLauncher"
import { formatMoney, guideStatusTone } from "../../_lib/format"

export const dynamic = "force-dynamic"
export const metadata = { title: "Guide — Goyo | Suprans" }

interface GuideRow {
  id: string
  name: string | null
  languages: string[] | null
  cities: string[] | null
  phone: string | null
  email: string | null
  daily_rate: number | string | null
  currency: string | null
  status: string | null
  rating: number | string | null
  total_tours: number | null
  notes: string | null
}

export default async function GoyoGuideDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const guideRes = await supabaseGoyo
    .from("guides")
    .select(
      "id, name, languages, cities, phone, email, daily_rate, currency, status, rating, total_tours, notes",
    )
    .eq("id", id)
    .maybeSingle()

  const guide = (guideRes.data ?? null) as GuideRow | null

  if (!guide) {
    return (
      <div className="max-w-[1440px] mx-auto w-full space-y-5">
        <BackLink href="/goyo/guides" label="All guides" />
        <EmptyState
          icon={Users}
          title="Guide not found"
          description="It may have been removed or the link is incorrect."
        />
      </div>
    )
  }

  const languages = (guide.languages ?? []).join(", ") || "—"
  const cities = (guide.cities ?? []).join(", ") || "—"

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <BackLink href="/goyo/guides" label="All guides" />

      <HeroCard
        title={guide.name ?? "Untitled guide"}
        subtitle={`Languages: ${languages} · Cities: ${cities}`}
        icon={Users}
        tone="blue"
        meta={
          guide.status ? (
            <StatusBadge tone={guideStatusTone(guide.status)}>
              {guide.status}
            </StatusBadge>
          ) : undefined
        }
        actions={
          <GenericEditLauncher
            table="guides"
            row={guide as unknown as Record<string, unknown> & { id: string }}
            listHref="/goyo/guides"
            title="Edit guide"
          />
        }
      />

      <KPIGrid>
        <MetricCard
          label="Daily rate"
          value={
            guide.daily_rate !== null
              ? formatMoney(Number(guide.daily_rate), guide.currency)
              : "—"
          }
        />
        <MetricCard
          label="Rating"
          value={
            <span className="tabular-nums">
              {guide.rating !== null && guide.rating !== undefined
                ? `${Number(guide.rating).toFixed(1)} / 5`
                : "—"}
            </span>
          }
        />
        <MetricCard
          label="Total tours"
          value={
            <span className="tabular-nums">
              {guide.total_tours?.toLocaleString("en-IN") ?? "—"}
            </span>
          }
        />
        <MetricCard label="Status" value={guide.status ?? "—"} />
      </KPIGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <DetailCard title="Profile">
            <InfoRow label="Phone" value={guide.phone ?? "—"} />
            <InfoRow label="Email" value={guide.email ?? "—"} />
            <InfoRow
              label="Daily rate"
              value={
                guide.daily_rate !== null
                  ? formatMoney(Number(guide.daily_rate), guide.currency)
                  : "—"
              }
            />
            <InfoRow label="Currency" value={guide.currency ?? "—"} />
            <InfoRow
              label="Status"
              value={
                guide.status ? (
                  <StatusBadge tone={guideStatusTone(guide.status)}>
                    {guide.status}
                  </StatusBadge>
                ) : (
                  "—"
                )
              }
            />
            <InfoRow
              label="Rating"
              value={
                <span className="tabular-nums">
                  {guide.rating !== null && guide.rating !== undefined
                    ? `${Number(guide.rating).toFixed(1)} / 5`
                    : "—"}
                </span>
              }
            />
            <InfoRow
              label="Total tours"
              value={
                <span className="tabular-nums">
                  {guide.total_tours?.toLocaleString("en-IN") ?? "—"}
                </span>
              }
            />
            <InfoRow label="Notes" value={guide.notes ?? "—"} />
          </DetailCard>
        </div>
        <div className="space-y-5">
          <DetailCard title="Assignments">
            <p className="text-sm text-muted-foreground">
              Assignment tracking coming soon.
            </p>
          </DetailCard>
        </div>
      </div>
    </div>
  )
}
