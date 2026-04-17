import { notFound } from "next/navigation"
import { ListChecks } from "lucide-react"
import { BackLink } from "@/components/shared/back-link"
import { HeroCard } from "@/components/shared/hero-card"
import { DetailCard, InfoRow } from "@/components/shared/detail-views"
import { KPIGrid } from "@/components/shared/kpi-grid"
import { MetricCard } from "@/components/shared/metric-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { supabase } from "@/lib/supabase"
import { formatDate } from "@/lib/format"

export const dynamic = "force-dynamic"

interface TemplateItem {
  key: string
  label: string
  required?: boolean
  description?: string | null
}

interface ProjectTypeRef {
  label: string | null
  key: string | null
}

interface TemplateRow {
  id: string
  version: number | null
  items: TemplateItem[] | null
  created_at: string | null
  project_type_id: string | null
  project_types: ProjectTypeRef | ProjectTypeRef[] | null
}

function firstType(t: ProjectTypeRef | ProjectTypeRef[] | null): ProjectTypeRef | null {
  if (!t) return null
  if (Array.isArray(t)) return t[0] ?? null
  return t
}

export default async function ChecklistTemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data, error } = await supabase
    .from("checklist_templates")
    .select("id, version, items, created_at, project_type_id, project_types(label, key)")
    .eq("id", id)
    .maybeSingle()

  if (error || !data) notFound()
  const template = data as TemplateRow
  const items = template.items ?? []
  const type = firstType(template.project_types)
  const required = items.filter((i) => i.required).length

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-5">
      <BackLink href="/development/checklists" label="All templates" />

      <HeroCard
        title={type?.label ?? "Checklist template"}
        subtitle={`Version ${template.version ?? 1} · ${items.length} items`}
        icon={ListChecks}
        tone="blue"
        meta={
          <>
            <StatusBadge tone="slate">v{template.version ?? 1}</StatusBadge>
            {type?.key && <StatusBadge tone="blue">{type.key}</StatusBadge>}
          </>
        }
      />

      <KPIGrid>
        <MetricCard label="Items" value={items.length} icon={ListChecks} iconTone="blue" />
        <MetricCard label="Required" value={required} icon={ListChecks} iconTone="emerald" />
        <MetricCard
          label="Optional"
          value={items.length - required}
          icon={ListChecks}
          iconTone="amber"
        />
        <MetricCard
          label="Version"
          value={`v${template.version ?? 1}`}
          icon={ListChecks}
          iconTone="violet"
        />
      </KPIGrid>

      <DetailCard title={`Items (${items.length})`}>
        {items.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="Empty template"
            description="This template has no items yet."
          />
        ) : (
          <div className="divide-y divide-border">
            {items.map((it) => (
              <InfoRow
                key={it.key}
                label={it.label}
                value={
                  <div className="flex items-center gap-2">
                    {it.required ? (
                      <StatusBadge tone="blue">required</StatusBadge>
                    ) : (
                      <StatusBadge tone="slate">optional</StatusBadge>
                    )}
                    {it.description && (
                      <span className="text-sm text-muted-foreground">
                        {it.description}
                      </span>
                    )}
                  </div>
                }
              />
            ))}
          </div>
        )}
      </DetailCard>

      <DetailCard title="Meta">
        <InfoRow label="Template ID" value={template.id} />
        <InfoRow label="Project type" value={type?.label ?? "—"} />
        <InfoRow label="Created" value={formatDate(template.created_at)} />
      </DetailCard>
    </div>
  )
}
