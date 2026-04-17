import { notFound } from "next/navigation"
import { List, CheckCircle2, Tag, Flag } from "lucide-react"
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

export default async function LifeBucketListDetailPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params
  const { data } = await supabaseLife
    .from("bucket_list")
    .select("id, title, category, priority, status, notes, completed_at, created_at")
    .eq("id", id)
    .maybeSingle()
  if (!data) notFound()
  const item = data as {
    id: string
    title: string | null
    category: string | null
    priority: string | null
    status: string | null
    notes: string | null
    completed_at: string | null
    created_at: string | null
  }

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title={item.title ?? "Untitled"}
        subtitle={item.category ?? undefined}
        breadcrumbs={[
          { label: "Life", href: "/life" },
          { label: "Bucket list", href: "/life/plans/bucket-list" },
          { label: item.title ?? "Item" },
        ]}
        actions={
          <GenericEditLauncher
            table="bucket_list"
            row={item}
            title="Edit bucket-list item"
            listHref="/life/plans/bucket-list"
          />
        }
      />

      <KPIGrid>
        <MetricCard
          label="Status"
          value={item.status ?? "—"}
          icon={List}
          iconTone="blue"
        />
        <MetricCard
          label="Priority"
          value={item.priority ?? "—"}
          icon={Flag}
          iconTone="amber"
        />
        <MetricCard
          label="Category"
          value={item.category ?? "—"}
          icon={Tag}
          iconTone="violet"
        />
        <MetricCard
          label="Completed"
          value={item.completed_at ? formatDate(item.completed_at) : "—"}
          icon={CheckCircle2}
          iconTone="emerald"
        />
      </KPIGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <DetailCard title="Overview" className="lg:col-span-2">
          <div className="divide-y divide-border">
            <InfoRow
              label="Status"
              value={
                <StatusBadge tone={toneForStatus(item.status)}>
                  {item.status ?? "—"}
                </StatusBadge>
              }
            />
            <InfoRow
              label="Priority"
              value={
                <StatusBadge tone={toneForStatus(item.priority)}>
                  {item.priority ?? "—"}
                </StatusBadge>
              }
            />
            <InfoRow label="Category" value={item.category ?? "—"} />
            <InfoRow label="Completed" value={formatDate(item.completed_at)} />
            <InfoRow label="Added" value={formatDate(item.created_at)} />
          </div>
        </DetailCard>

        <DetailCard title="Notes">
          {item.notes ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {item.notes}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
        </DetailCard>
      </div>
    </div>
  )
}
