import { notFound } from "next/navigation"
import Link from "next/link"
import { Inbox, Link as LinkIcon, Target, Tag } from "lucide-react"
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

export default async function LifeCaptureDetailPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params
  const { data } = await supabaseLife
    .from("captures")
    .select(
      "id, content, source, category, status, action_item, linked_goal_id, created_at",
    )
    .eq("id", id)
    .maybeSingle()
  if (!data) notFound()
  const c = data as {
    id: string
    content: string | null
    source: string | null
    category: string | null
    status: string | null
    action_item: string | null
    linked_goal_id: string | null
    created_at: string | null
  }

  type LinkedGoal = { id: string; title: string | null } | null
  let goal: LinkedGoal = null
  if (c.linked_goal_id) {
    const { data } = await supabaseLife
      .from("life_goals")
      .select("id, title")
      .eq("id", c.linked_goal_id)
      .maybeSingle()
    goal = data as unknown as LinkedGoal
  }

  const preview = (c.content ?? "").slice(0, 80)

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <PageHeader
        title={preview || "Capture"}
        subtitle={c.source ?? undefined}
        breadcrumbs={[
          { label: "Life", href: "/life" },
          { label: "Captures", href: "/life/growth/captures" },
          { label: preview || "Capture" },
        ]}
        actions={
          <GenericEditLauncher
            table="captures"
            row={c}
            title="Edit capture"
            listHref="/life/growth/captures"
          />
        }
      />

      <KPIGrid>
        <MetricCard
          label="Status"
          value={c.status ?? "—"}
          icon={Inbox}
          iconTone="blue"
        />
        <MetricCard
          label="Source"
          value={c.source ?? "—"}
          icon={LinkIcon}
          iconTone="violet"
        />
        <MetricCard
          label="Category"
          value={c.category ?? "—"}
          icon={Tag}
          iconTone="amber"
        />
        <MetricCard
          label="Linked goal"
          value={goal?.title ?? "—"}
          icon={Target}
          iconTone="emerald"
          href={goal ? `/life/goals/${goal.id}` : undefined}
        />
      </KPIGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <DetailCard title="Content" className="lg:col-span-2">
          {c.content ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{c.content}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No content captured.</p>
          )}
        </DetailCard>

        <DetailCard title="Details">
          <div className="divide-y divide-border">
            <InfoRow
              label="Status"
              value={
                <StatusBadge tone={toneForStatus(c.status)}>
                  {c.status ?? "—"}
                </StatusBadge>
              }
            />
            <InfoRow label="Source" value={c.source ?? "—"} />
            <InfoRow label="Category" value={c.category ?? "—"} />
            <InfoRow label="Action item" value={c.action_item ?? "—"} />
            <InfoRow
              label="Linked goal"
              value={
                goal ? (
                  <Link
                    href={`/life/goals/${goal.id}`}
                    className="text-primary hover:underline"
                  >
                    {goal.title ?? "Goal"}
                  </Link>
                ) : (
                  "—"
                )
              }
            />
            <InfoRow label="Captured" value={formatDate(c.created_at)} />
          </div>
        </DetailCard>
      </div>
    </div>
  )
}
