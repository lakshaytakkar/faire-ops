import { notFound } from "next/navigation"
import { BookOpen, Star, CheckCircle2, CalendarDays } from "lucide-react"
import { supabaseLife } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { StatusBadge, toneForStatus } from "@/components/shared/status-badge"
import { formatDate } from "@/lib/format"
import { GenericEditLauncher } from "../../../_components/GenericEditLauncher"

export const dynamic = "force-dynamic"

type Params = { id: string }

/**
 * Note: life.books has no `pages_read` column, so the "pages read" KPI from
 * the source spec is degraded to a "reading window" KPI using started_at and
 * finished_at — which the schema does have.
 */
export default async function LifeBookDetailPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params
  const { data } = await supabaseLife
    .from("books")
    .select(
      "id, title, author, category, status, rating, started_at, finished_at, key_takeaway, notes, created_at",
    )
    .eq("id", id)
    .maybeSingle()
  if (!data) notFound()
  const b = data as {
    id: string
    title: string | null
    author: string | null
    category: string | null
    status: string | null
    rating: number | null
    started_at: string | null
    finished_at: string | null
    key_takeaway: string | null
    notes: string | null
    created_at: string | null
  }

  const windowText =
    b.started_at && b.finished_at
      ? `${formatDate(b.started_at)} – ${formatDate(b.finished_at)}`
      : b.started_at
        ? `Since ${formatDate(b.started_at)}`
        : "—"

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title={b.title ?? "Untitled book"}
        subtitle={b.author ?? undefined}
        breadcrumbs={[
          { label: "Life", href: "/life" },
          { label: "Books", href: "/life/growth/books" },
          { label: b.title ?? "Book" },
        ]}
        actions={
          <GenericEditLauncher
            table="books"
            row={b}
            title="Edit book"
            listHref="/life/growth/books"
          />
        }
      />

      <KPIGrid>
        <MetricCard
          label="Status"
          value={b.status ?? "—"}
          icon={BookOpen}
          iconTone="blue"
        />
        <MetricCard
          label="Rating"
          value={b.rating !== null ? `${b.rating} / 5` : "—"}
          icon={Star}
          iconTone="amber"
        />
        <MetricCard
          label="Reading window"
          value={windowText}
          icon={CalendarDays}
          iconTone="violet"
        />
        <MetricCard
          label="Finished"
          value={b.finished_at ? formatDate(b.finished_at) : "—"}
          icon={CheckCircle2}
          iconTone="emerald"
        />
      </KPIGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <DetailCard title="Overview" className="lg:col-span-2">
          <div className="divide-y divide-border">
            <InfoRow label="Author" value={b.author ?? "—"} />
            <InfoRow label="Category" value={b.category ?? "—"} />
            <InfoRow
              label="Status"
              value={
                <StatusBadge tone={toneForStatus(b.status)}>
                  {b.status ?? "—"}
                </StatusBadge>
              }
            />
            <InfoRow
              label="Rating"
              value={
                b.rating !== null ? (
                  <span className="tabular-nums">{b.rating} / 5</span>
                ) : (
                  "—"
                )
              }
            />
            <InfoRow label="Started" value={formatDate(b.started_at)} />
            <InfoRow label="Finished" value={formatDate(b.finished_at)} />
            <InfoRow label="Added" value={formatDate(b.created_at)} />
          </div>
        </DetailCard>

        <DetailCard title="Key takeaway">
          {b.key_takeaway ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {b.key_takeaway}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
        </DetailCard>
      </div>

      {b.notes && (
        <DetailCard title="Notes">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{b.notes}</p>
        </DetailCard>
      )}
    </div>
  )
}
